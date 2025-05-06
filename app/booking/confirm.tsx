import { useState, useEffect } from 'react';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useLocalSearchParams, router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStripe } from '@stripe/stripe-react-native';

// Define a type for sitter rates
type SitterRates = {
  id: string;
  sitter_id: string;
  walking_rate_per_hour: number;
  walking_rate_for_additional_dog: number;
  boarding_rate_per_day: number;
  boarding_rate_for_additional_dog: number;
  max_dogs_walking: number;
  max_dogs_boarding: number;
  created_at: string;
  updated_at: string;
};

// Add this type definition after the SitterRates type
type PaymentIntentResult = {
  paymentIntentId: string;
  amount: number;
  bookingId: string;
};

export default function ConfirmBookingScreen() {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSavedCard, setHasSavedCard] = useState(false);
  const [cardLast4, setCardLast4] = useState<string | null>(null);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false);
  const [sitterRates, setSitterRates] = useState<SitterRates | null>(null);
  const [isLoadingRates, setIsLoadingRates] = useState(true);
  const [showingAlert, setShowingAlert] = useState(false); // Track if we're showing an alert
  
  // Initialize Stripe hooks
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  
  // Parse the data from the previous screen
  const mode = params.mode as 'walking' | 'boarding';
  const sitterId = params.sitterId as string;
  const serviceId = params.serviceId as string;
  const selectedPetsJson = params.selectedPets as string;
  const selectedPets = selectedPetsJson ? JSON.parse(selectedPetsJson) : [];
  
  // Walking mode params - updated for new flow
  const date = params.date as string;
  const startTime = params.startTime as string;
  const endTime = params.endTime as string;
  
  // Boarding mode params
  const startDate = params.startDate as string;
  const endDate = params.endDate as string;
  
  // Format time for display (convert 24h to 12h if needed)
  const formatTimeDisplay = (timeString: string) => {
    if (!timeString) return '';
    
    // If time is already in 12-hour format with AM/PM, return as is
    if (timeString.includes('AM') || timeString.includes('PM')) {
      return timeString;
    }
    
    // Otherwise, convert from 24h format
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    
    return `${formattedHour}:${minutes} ${period}`;
  };
  
  // Helper function to convert time from 24-hour to decimal
  const timeToDecimal = (timeString: string) => {
    if (!timeString) return 0;
    
    // If time is already in 12-hour format with AM/PM, convert first
    if (timeString.includes('AM') || timeString.includes('PM')) {
      const [timePart, modifier] = timeString.split(' ');
      let [hours, minutes] = timePart.split(':').map(Number);
      
      if (hours === 12) {
        hours = modifier === 'PM' ? 12 : 0;
      } else if (modifier === 'PM') {
        hours += 12;
      }
      
      return hours + minutes / 60;
    }
    
    // Already in 24-hour format
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours + minutes / 60;
  };
  
  // Calculate duration based on booking mode
  const calculateDuration = () => {
    if (mode === 'walking') {
      try {
        const startHours = timeToDecimal(startTime);
        const endHours = timeToDecimal(endTime);
        
        // Calculate duration in hours
        let duration = endHours - startHours;
        
        // If end time is less than start time (e.g., next day), add 24 hours
        if (duration < 0) {
          duration += 24;
        }
        
        return Math.max(1, duration); // Return at least 30 minutes (0.5 hours)
      } catch (error) {
        console.log('Error calculating duration:', error);
        return 1; // Default to 1 hour if calculation fails
      }
    } else {
      // For boarding, calculate the number of nights
      try {
        if (!startDate || !endDate) return 1;
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Calculate the difference in days
        const differenceMs = end.getTime() - start.getTime();
        const differenceDays = Math.ceil(differenceMs / (1000 * 3600 * 24));
        
        return Math.max(1, differenceDays); // Ensure at least 1 night
      } catch (error) {
        console.log('Error calculating boarding duration:', error);
        return 1; // Default to 1 night if calculation fails
      }
    }
  };
  
  const duration = calculateDuration();
  const durationUnit = mode === 'walking' ? 'hour' : 'night';
  
  // Dynamic price calculation based on sitter rates and booking mode
  const calculatePrice = () => {
    if (!sitterRates) {
      // Default fallback rates if sitter rates aren't loaded yet
      if (mode === 'walking') {
        const baseRate = 20.00; // Per hour 
        const additionalPetRate = 10.00; // Per additional pet per hour
        const baseFee = baseRate * duration; // Multiplied by duration in hours
        const additionalPetFee = Math.max(0, selectedPets.length - 1) * additionalPetRate * duration;
        const subtotal = baseFee + additionalPetFee;
        const platformFee = subtotal * 0.10; // 10% platform fee
        return {
          baseRate,
          baseFee,
          additionalPetRate,
          additionalPetFee,
          platformFee,
          totalPrice: subtotal + platformFee,
          priceLabel: 'per hour'
        };
      } else {
        // Boarding rates
        const baseRate = 35.00; // Per night
        const additionalPetRate = 15.00;
        const baseFee = baseRate * duration;
        const additionalPetFee = Math.max(0, selectedPets.length - 1) * additionalPetRate * duration;
        const subtotal = baseFee + additionalPetFee;
        const platformFee = subtotal * 0.10; // 10% platform fee
        return {
          baseRate,
          baseFee,
          additionalPetRate,
          additionalPetFee,
          platformFee,
          totalPrice: subtotal + platformFee,
          priceLabel: 'per night'
        };
      }
    }
    
    // Calculate using actual sitter rates
    if (mode === 'walking') {
      const baseRate = sitterRates.walking_rate_per_hour; // Now properly per hour
      const additionalPetRate = sitterRates.walking_rate_for_additional_dog;
      const baseFee = baseRate * duration; // Multiplied by duration in hours
      const additionalPetFee = Math.max(0, selectedPets.length - 1) * additionalPetRate * duration;
      const subtotal = baseFee + additionalPetFee;
      const platformFee = subtotal * 0.10; // 10% platform fee
      
      return {
        baseRate,
        baseFee,
        additionalPetRate,
        additionalPetFee,
        platformFee,
        totalPrice: subtotal + platformFee,
        priceLabel: 'per hour'
      };
    } else {
      // Boarding rates
      const baseRate = sitterRates.boarding_rate_per_day;
      const additionalPetRate = sitterRates.boarding_rate_for_additional_dog;
      const baseFee = baseRate * duration;
      const additionalPetFee = Math.max(0, selectedPets.length - 1) * additionalPetRate * duration;
      const subtotal = baseFee + additionalPetFee;
      const platformFee = subtotal * 0.10; // 10% platform fee
      
      return {
        baseRate,
        baseFee,
        additionalPetRate,
        additionalPetFee,
        platformFee,
        totalPrice: subtotal + platformFee,
        priceLabel: 'per night'
      };
    }
  };
  
  const pricing = calculatePrice();

  // Fetch sitter rates
  useEffect(() => {
    const fetchSitterRates = async () => {
      if (!sitterId) return;
      
      try {
        setIsLoadingRates(true);
        
        const { data, error } = await supabase
          .from('sitter_info')
          .select('*')
          .eq('sitter_id', sitterId)
          .single();
          
        if (error) {
          console.log('Error fetching sitter rates:', error);
          return;
        }
        
        setSitterRates(data);
      } catch (error) {
        console.log('Error in fetching sitter rates:', error);
      } finally {
        setIsLoadingRates(false);
      }
    };
    
    fetchSitterRates();
  }, [sitterId]);
  
  // Check if user has a saved payment method
  const checkSavedCard = async () => {
    if (!user) return;
    
    try {
      setIsLoadingPaymentMethods(true);
      
      // Call the get-payment-methods Edge Function using Supabase client
      const { data, error } = await supabase.functions.invoke('get-payment-methods', {
        body: { owner_id: user.id }
      });
      
      if (error) {
        console.log('Supabase function error:', error);
        throw error;
      }
      
      // Set state based on whether payment methods exist
      if (data?.paymentMethods && data.paymentMethods.length > 0) {
        setHasSavedCard(true);
        setCardLast4(data.paymentMethods[0].last4);
      } else {
        // If no payment methods or empty array
        setHasSavedCard(false);
        setCardLast4(null);
      }
    } catch (error) {
      // Show alert for development purposes - you can remove this in production
      Alert.alert('Payment Method Error', 'Could not retrieve saved payment methods. New users will need to add a card.');
      // In case of error, assume no saved card
      setHasSavedCard(false);
    } finally {
      setIsLoadingPaymentMethods(false);
    }
  };
  
  // Check for saved cards when component mounts
  useEffect(() => {
    if (user) {
      checkSavedCard();
    }
  }, [user]);
  // Function to initialize the Stripe payment sheet
  const initializePayment = async (formattedDate: string) => {
    console.log('initializePayment called with formattedDate:', formattedDate);
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    try {
      // Common fields for all booking types
      const commonPayload = {
        owner_id: user.id,
        sitter_id: sitterId,
        selected_pets: JSON.stringify(selectedPets), // Convert to JSON string to match Edge Function expectation
        total_price: pricing.totalPrice,
        booking_type: mode // Changed from 'mode' to 'booking_type' to match Edge Function expectation
      };
      
      // Mode-specific payload fields
      let requestPayload: any;
      
      if (mode === 'walking') {
        // For walking mode, add weekday parameter
        const walkingDate = new Date(formattedDate);
        const weekday = walkingDate.getDay(); // Get day of week (0-6, Sunday-Saturday)
        
        requestPayload = {
          ...commonPayload,
          booking_date: formattedDate,
          start_time: startTime,
          end_time: endTime,
          weekday: weekday // Add weekday to help find availability slot
        };
        
      } else {
        // Boarding mode
        requestPayload = {
          ...commonPayload,
          start_date: startDate,
          end_date: endDate
        };
        
        
      }
            
      // Call init-payment Edge Function using Supabase client
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('init-payment', {
        body: requestPayload
      });
      
      if (paymentError) {
        console.log('Payment initialization error details:', paymentError);
        
        // Extract more helpful error message if available
        let errorMessage = 'Failed to initialize payment';
        if (paymentError.message) {
          if (paymentError.message.includes('Failed to create booking')) {
            errorMessage = 'There was an issue creating your booking. Please check your information and try again.';
          } else {
            errorMessage = paymentError.message;
          }
        }
        
        throw new Error(errorMessage);
      }
      
      
      if (!paymentData) {
        throw new Error('No data returned from payment initialization');
      }
      
      const { clientSecret, bookingId, customerId } = paymentData;
      
      if (!clientSecret) throw new Error('Client secret missing from payment initialization');
      
      // Initialize the payment sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'DogSitter App',
        customerId: customerId,
        customerEphemeralKeySecret: undefined, // Not needed as we're using setup intent directly
        setupIntentClientSecret: clientSecret,
        allowsDelayedPaymentMethods: false,
        style: 'automatic'
      });
      
      if (initError) throw new Error(initError.message);
      
      // Present the payment sheet
      const { error: paymentConfirmError } = await presentPaymentSheet();

      if (paymentConfirmError) {
        if (paymentConfirmError.code === 'Canceled') {
          // User cancelled
          Alert.alert('Payment Canceled', 'You have canceled the payment process.');
        } else {
          // Other error
          console.log('Payment confirm error:', paymentConfirmError);
          Alert.alert('Payment Error', paymentConfirmError.message);
        }
        setIsSubmitting(false);
        return null;
      } else {
        // Payment was successful
        const amount = Math.round(pricing.totalPrice * 100); // Amount in cents
        const paymentIntentId = clientSecret; // Use clientSecret as paymentIntentId for now
        
        // Return necessary info for further processing
        // Do NOT call handlePaymentSuccess here - it will be called by handleBookNow
        return { bookingId, paymentIntentId, amount }; 
      }
    } catch (error: any) {
      Alert.alert('Payment Error', error.message || 'There was an error initiating the payment process.');
      setIsSubmitting(false);
      return null;
    }
  };
  
  // Function to charge the payment using the saved card
  const chargePayment = async (customerId: string, bookingId: string) => {
    try {
      // Log request payload for debugging
      const requestPayload = {
        customer_id: customerId,
        total_price: pricing.totalPrice,
        sitter_id: sitterId,
        booking_id: bookingId,
        booking_type: mode // Add the booking type (walking or boarding)
      };
      
      const { data: chargeData, error: chargeError } = await supabase.functions.invoke('charge-payment', {
        body: requestPayload
      });
      
      if (chargeError) {
        console.log('Charge payment error details:', chargeError);
        throw new Error(`Failed to charge payment: ${chargeError.message}`);
      }
      
      
      if (!chargeData) {
        throw new Error('No data returned from payment charging');
      }
      
      const { paymentIntentId } = chargeData;
      
      if (!paymentIntentId) throw new Error('Payment intent ID missing from response');
      
      // Return all necessary data for handlePaymentSuccess
      return { bookingId, paymentIntentId, amount: chargeData.amount || Math.round(pricing.totalPrice * 100) };
    } catch (error: any) {
      throw error;
    }
  };
  
  // Handle the booking and payment process
  const handleBookNow = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to book this service.');
      return;
    }

    if (selectedPets.length === 0) {
      Alert.alert('Error', `Please select at least one pet for the ${mode} service.`);
      return;
    }

    // Validate all required fields are present
    if (mode === 'walking') {
      if (!date || !startTime || !endTime) {
        Alert.alert('Error', 'Missing required booking information. Please try again.');
        return;
      }
    } else {
      if (!startDate || !endDate) {
        Alert.alert('Error', 'Missing required booking information. Please try again.');
        console.log('Missing boarding parameters:', { startDate, endDate });
        return;
      }
    }

    try {
      setIsSubmitting(true);
      
      let formattedDate;
      
      // Process dates based on booking mode
      if (mode === 'walking') {
        // For walking mode, ensure we have a consistent YYYY-MM-DD format
        try {
          // Check if date is already in ISO format (YYYY-MM-DD)
          if (date && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            formattedDate = date;
          } else if (date && (date.includes('/') || date.includes(',') || /^[A-Za-z]{3}\s\d{1,2},\s\d{4}$/.test(date))) {
            // Handle various date formats (M/D/YYYY or "Mar 15, 2023")
            const parsedDate = new Date(date);
            if (!isNaN(parsedDate.getTime())) {
              formattedDate = parsedDate.toISOString().split('T')[0];
            } else {
              throw new Error('Unable to parse date format');
            }
          } else {
            throw new Error('Invalid date format');
          }
        } catch (dateError) {
          console.log('Error parsing walking date:', dateError, 'Original date:', date);
          Alert.alert('Date Error', 'There was an issue with the date format. Please try again.');
          setIsSubmitting(false);
          return;
        }
      } else {
        // For boarding mode, we already have the dates in YYYY-MM-DD format
        if (!startDate || !endDate) {
          throw new Error('Missing start or end date for boarding booking.');
        }
        
        // No need to parse these dates, they're already in the correct format
        formattedDate = startDate; // We'll use this for displaying purposes, but not actually needed for the booking
      }
      
      // If user has a saved card, ask if they want to use it
      if (hasSavedCard && cardLast4) {
          
        return new Promise((resolve) => {
          Alert.alert(
            'Payment Method',
            `Pay $${pricing.totalPrice.toFixed(2)} with card ending in ${cardLast4}?`,
            [
              { 
                text: 'Use New Card',
                style: 'default',
                onPress: async () => {
                  try {
                    const result = await initializePayment(formattedDate);
                    if (result) {
                      await handlePaymentSuccess({
                        paymentIntentId: result.paymentIntentId,
                        amount: result.amount, // amount should be in cents
                        bookingId: result.bookingId
                      });
                    }
                    resolve(null);
                  } catch (error: any) {
                    console.log('Error in Use New Card flow:', error);
                    Alert.alert('Payment Failed', error.message || 'Failed to process payment');
                    resolve(null);
                  } finally {
                    setIsSubmitting(false);
                  }
                },
              },
              { 
                text: 'Pay with Saved Card',
                style: 'default',
                onPress: async () => {
                  try {
                    if (!user) {
                      throw new Error('User not authenticated');
                    }
                    
                    // Call init-payment Edge Function to create a booking record
                    let requestBody;
                    
                    if (mode === 'walking') {
                      // Walking booking request
                      const walkingDate = new Date(formattedDate);
                      const weekday = walkingDate.getDay(); // Get day of week (0-6, Sunday-Saturday)
                      
                      requestBody = {
                        owner_id: user.id,
                        sitter_id: sitterId,
                        booking_date: formattedDate,
                        start_time: startTime,
                        end_time: endTime,
                        weekday: weekday, // Add weekday to help find availability slot
                        selected_pets: JSON.stringify(selectedPets), // Convert to JSON string
                        total_price: pricing.totalPrice,
                        booking_type: 'walking'
                      };
                      
                      // Log for debugging
                      console.log('Save card walking payload:', JSON.stringify(requestBody, null, 2));
                    } else {
                      // Boarding booking request
                      requestBody = {
                        owner_id: user.id,
                        sitter_id: sitterId,
                        start_date: startDate,
                        end_date: endDate,
                        selected_pets: JSON.stringify(selectedPets), // Convert to JSON string
                        total_price: pricing.totalPrice,
                        booking_type: 'boarding'
                      };
                      
                      // Log for debugging
                      console.log('Save card boarding payload:', JSON.stringify(requestBody, null, 2));
                    }
                    
                    const { data: initData, error: initError } = await supabase.functions.invoke('init-payment', {
                      body: requestBody
                    });
                    
                    if (initError) throw initError;
                    
                    const { bookingId, customerId } = initData;
                    
                    const result = await chargePayment(customerId, bookingId);
                    if (result) {
                      await handlePaymentSuccess({
                        paymentIntentId: result.paymentIntentId,
                        amount: result.amount, // amount should be in cents
                        bookingId: result.bookingId
                      });
                    }
                    resolve(null);
                  } catch (error: any) {
                    Alert.alert('Payment Failed', error.message || 'Failed to process payment');
                    resolve(null);
                  } finally {
                    setIsSubmitting(false);
                  }
                },
              },
              { 
                text: 'Cancel',
                style: 'cancel',
                onPress: () => {
                  setIsSubmitting(false);
                  resolve(null);
                },
              },
            ]
          );
        });
      } else {
        // No saved card, go through the new card flow
        console.log('No saved card, proceeding with direct payment flow');
        const result = await initializePayment(formattedDate);
        console.log('initializePayment result in direct flow:', result ? `bookingId: ${result.bookingId}` : 'null');
        if (result) {
          console.log('Calling handlePaymentSuccess from direct flow');
          await handlePaymentSuccess({
            paymentIntentId: result.paymentIntentId,
            amount: result.amount, // amount should be in cents
            bookingId: result.bookingId
          });
        }
      }
    } catch (error: any) {
      console.log('Error in booking process:', error);
      // Provide more detailed error message for debugging
      const errorMessage = error.message || 'There was a problem creating your booking. Please try again.';
      Alert.alert('Booking Failed', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle successful payment
  const handlePaymentSuccess = async (paymentIntentData: PaymentIntentResult) => {
    try {
      // ---> Send Notification for New Booking <---
      // Determine which table the booking belongs to
      const bookingTable = mode === 'walking' ? 'walking_bookings' : 'boarding_bookings';

      // Create the notification payload
      const notificationPayload = {
        type: 'INSERT', // Using INSERT mimics DB trigger; backend needs to handle this type
        table: bookingTable,
        schema: 'public',
        record: {
          id: paymentIntentData.bookingId,
          sitter_id: sitterId,
          owner_id: user?.id,
          notification_type: 'NEW_BOOKING' // Custom field for backend logic
        },
        old_record: null // Indicates this is a new booking
      };

      console.log('Invoking send-notification for new booking:', notificationPayload);
      
      // Invoke the Supabase edge function to send the notification
      await supabase.functions.invoke('send-notification', { 
        body: notificationPayload 
      })
      .then(({ data, error }) => {
        if (error) {
          console.log('Error invoking send-notification for new booking:', error);
        } else {
          console.log('Successfully invoked send-notification for new booking. Response:', data);
        }
      })
      .catch(error => {
        console.log('Exception invoking send-notification for new booking:', error);
      });
      // ---> End Notification Send <---

      // Create a message thread with the booking ID from the payment result
      await createMessageThread(paymentIntentData.bookingId);
    } catch (error) {
      console.log('Error in handlePaymentSuccess:', error);
      // Continue with thread creation even if notification fails
      await createMessageThread(paymentIntentData.bookingId);
    }
  };

  const createMessageThread = async (bookingId: string) => {
    try {
      if (!user) {
        console.log('User not authenticated, cannot create message thread');
        if (!showingAlert) {
          setShowingAlert(true);
          Alert.alert(
            'Error',
            'There was a problem completing your booking. Please try again.',
            [{ text: 'OK', onPress: () => setShowingAlert(false) }]
          );
        }
        return;
      }

      if (!sitterId) {
        if (!showingAlert) {
          setShowingAlert(true);
          Alert.alert(
            'Error',
            'There was a problem completing your booking. Please try again.',
            [{ text: 'OK', onPress: () => setShowingAlert(false) }]
          );
        }
        return;
      }
      
      // Create a new message thread for this booking
      type ThreadData = {
        owner_id: string;
        sitter_id: string;
        last_message: string;
        last_message_time: string;
        booking_type: 'walking' | 'boarding';
        walking_booking_id?: string;
        boarding_booking_id?: string;
      };

      const threadPayload: ThreadData = {
        owner_id: user.id,
        sitter_id: sitterId,
        last_message: `Booking confirmed for ${mode === 'walking' ? 'a walk on ' + formatDateDisplay(date) : 'boarding from ' + formatDateDisplay(startDate) + ' to ' + formatDateDisplay(endDate)}`,
        last_message_time: new Date().toISOString(),
        booking_type: mode === 'walking' ? 'walking' : 'boarding',
      };
      
      // Add the appropriate booking ID field based on booking type
      if (mode === 'walking') {
        threadPayload.walking_booking_id = bookingId;
      } else {
        threadPayload.boarding_booking_id = bookingId;
      }
      
      console.log('About to create thread with payload:', JSON.stringify(threadPayload));
      const { data: createdThread, error: threadError } = await supabase
        .from('message_threads')
        .insert([threadPayload])
        .select()
        .single();
        
      if (threadError) {
        // Show an error alert but don't navigate
        if (!showingAlert) {
          setShowingAlert(true);
          Alert.alert(
            'Booking Confirmed',
            `Your dog ${mode === 'walking' ? 'walk' : 'stay'} booking has been confirmed, but we couldn't set up messaging with the sitter.`,
            [{ 
              text: 'OK', 
              onPress: () => {
                setShowingAlert(false);
                router.push('/(tabs)');
              }
            }]
          );
        }
        return;
      }
      
      // Show success message and navigate to messages with the thread ID
      if (!showingAlert) {
        setShowingAlert(true);
        const serviceName = mode === 'walking' ? 'walk' : 'stay';
        
        Alert.alert(
          'Booking Confirmed',
          `Your dog ${serviceName} booking has been confirmed! The dog sitter will be notified.`,
          [
            { 
              text: 'OK', 
              onPress: () => {
                setShowingAlert(false);
                console.log('Alert OK pressed, navigating to messages with threadId:', createdThread.id);
                router.push({
                  pathname: '/(tabs)/messages',
                  params: {
                    threadId: createdThread.id,
                    showWelcomeMessage: "true"
                  }
                });
              } 
            }
          ]
        );
      } else {
        console.log('Already showing an alert, not showing another one');
      }
    } catch (error) {
      // Show a generic error alert
      if (!showingAlert) {
        setShowingAlert(true);
        Alert.alert(
          'Booking Confirmed',
          `Your booking is confirmed, but there was an error setting up communication with the sitter.`,
          [{ 
            text: 'OK', 
            onPress: () => {
              setShowingAlert(false);
              router.push('/(tabs)');
            }
          }]
        );
      }
    }
  };

  const calculatePlatformFee = (amount: number) => {
    // Assuming a 20% platform fee
    return amount * 0.2;
  };

  const calculateSitterPayout = (amount: number) => {
    // Sitter gets 80% after platform fee
    return amount * 0.8;
  };

  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // Return as is if invalid
      }
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    } catch (error) {
      console.log('Error formatting date:', error);
      return dateString;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} >
          <ChevronLeft size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm Booking</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.contentContainer}>
        <View style={styles.bookingSummary}>
          <Text style={styles.summaryTitle}>Booking Details</Text>
          {mode === 'walking' ? (
            <>
              <Text style={styles.summaryText}>Date: {formatDateDisplay(date)}</Text>
              <Text style={styles.summaryText}>Time: {formatTimeDisplay(startTime)} - {formatTimeDisplay(endTime)}</Text>
              <Text style={styles.summaryText}>Duration: {duration} hour{duration !== 1 ? 's' : ''}</Text>
            </>
          ) : (
            <>
              <Text style={styles.summaryText}>Start Date: {formatDateDisplay(startDate)}</Text>
              <Text style={styles.summaryText}>End Date: {formatDateDisplay(endDate)}</Text>
              <Text style={styles.summaryText}>Duration: {duration} night{duration !== 1 ? 's' : ''}</Text>
            </>
          )}
          <Text style={styles.summaryText}>Number of Pets: {selectedPets.length}</Text>
        </View>

        {isLoadingRates ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#63C7B8" />
            <Text style={styles.loadingText}>Loading pricing information...</Text>
          </View>
        ) : (
          <View style={styles.priceContainer}>
            <Text style={styles.priceTitle}>Price Summary</Text>
            <View style={styles.priceRow}>
              {mode === 'walking' ? (
                <Text style={styles.priceItem}>Base Rate (1 walk)</Text>
              ) : (
                <Text style={styles.priceItem}>Base Rate ({duration} night{duration !== 1 ? 's' : ''})</Text>
              )}
              <Text style={styles.priceValue}>${pricing.baseFee.toFixed(2)}</Text>
            </View>
            {selectedPets.length > 1 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceItem}>Additional Pet Fee ({selectedPets.length - 1} pet{selectedPets.length - 1 !== 1 ? 's' : ''})</Text>
                <Text style={styles.priceValue}>${pricing.additionalPetFee.toFixed(2)}</Text>
              </View>
            )}
            <View style={styles.priceRow}>
              <Text style={styles.priceItem}>Platform Fee (10%)</Text>
              <Text style={styles.priceValue}>${pricing.platformFee.toFixed(2)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.priceRow}>
              <Text style={styles.totalText}>Total</Text>
              <Text style={styles.totalValue}>${pricing.totalPrice.toFixed(2)}</Text>
            </View>
            {mode === 'walking' ? (
              <Text style={styles.rateNoteText}>Sitter's Rate: ${sitterRates?.walking_rate_per_hour.toFixed(2) || '20.00'}/walk</Text>
            ) : (
              <Text style={styles.rateNoteText}>Sitter's Rate: ${sitterRates?.boarding_rate_per_day.toFixed(2) || '35.00'}/night</Text>
            )}
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={[styles.bookButton, isSubmitting && styles.disabledButton]}
          onPress={handleBookNow}
          disabled={isSubmitting || isLoadingPaymentMethods}
        >
          {isSubmitting || isLoadingPaymentMethods ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.bookButtonText}>
              {hasSavedCard ? 'Continue to Payment' : 'Book Now'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    height: 150,
  },
  loadingText: {
    marginTop: 12,
    color: '#666666',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  backButton: {
    padding: 8,
  },
  contentContainer: {
    flex: 1,
  },
  bookingSummary: {
    margin: 16,
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#4A4A4A',
    marginBottom: 4,
  },
  priceContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  priceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  priceItem: {
    fontSize: 14,
    color: '#4A4A4A',
  },
  priceValue: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  totalText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#63C7B8',
  },
  rateNoteText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#666666',
    marginTop: 8,
    textAlign: 'right',
  },
  bottomContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  bookButton: {
    backgroundColor: '#63C7B8',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#A0CCC6',
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
