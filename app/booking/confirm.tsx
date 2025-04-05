import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
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
  
  // Initialize Stripe hooks
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  
  // Parse the data from the previous screen
  const mode = params.mode as 'walking' | 'boarding';
  const sitterId = params.sitterId as string;
  const selectedPetsJson = params.selectedPets as string;
  const selectedPets = selectedPetsJson ? JSON.parse(selectedPetsJson) : [];
  
  // Walking mode params
  const slotId = params.slotId as string;
  const date = params.date as string;
  const startTime = params.startTime as string;
  const endTime = params.endTime as string;
  
  // Boarding mode params
  const startDate = params.startDate as string;
  const endDate = params.endDate as string;
  
  // Calculate duration based on booking mode
  const calculateDuration = () => {
    if (mode === 'walking') {
      try {
        const convertTo24HourFormat = (time: string) => {
          const [timePart, modifier] = time.split(' ');
          let [hours, minutes] = timePart.split(':').map(Number);
          
          if (hours === 12) {
            hours = modifier === 'PM' ? 12 : 0;
          } else if (modifier === 'PM') {
            hours += 12;
          }
          
          return hours + minutes / 60;
        };
        
        const startHours = convertTo24HourFormat(startTime);
        const endHours = convertTo24HourFormat(endTime);
        
        // Calculate duration, handling if end time is on the next day
        const duration = endHours >= startHours ? endHours - startHours : 24 - startHours + endHours;
        
        return Math.max(1, Math.round(duration)); // Ensure at least 1 hour and round to nearest hour
      } catch (error) {
        console.error('Error calculating duration:', error);
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
        console.error('Error calculating boarding duration:', error);
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
        const baseRate = 20.00;
        const additionalPetRate = 10.00;
        const baseFee = baseRate; // Per walk, not per hour
        const additionalPetFee = Math.max(0, selectedPets.length - 1) * additionalPetRate;
        const subtotal = baseFee + additionalPetFee;
        const platformFee = subtotal * 0.10; // 10% platform fee
        return {
          baseRate,
          baseFee,
          additionalPetRate,
          additionalPetFee,
          platformFee,
          totalPrice: subtotal + platformFee,
          priceLabel: 'per walk'
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
      const baseRate = sitterRates.walking_rate_per_hour; // Despite name, this is per walk
      const additionalPetRate = sitterRates.walking_rate_for_additional_dog;
      const baseFee = baseRate; // Per walk, not per hour
      const additionalPetFee = Math.max(0, selectedPets.length - 1) * additionalPetRate;
      const subtotal = baseFee + additionalPetFee;
      const platformFee = subtotal * 0.10; // 10% platform fee
      
      return {
        baseRate,
        baseFee,
        additionalPetRate,
        additionalPetFee,
        platformFee,
        totalPrice: subtotal + platformFee,
        priceLabel: 'per walk'
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
          console.error('Error fetching sitter rates:', error);
          return;
        }
        
        setSitterRates(data);
      } catch (error) {
        console.error('Error in fetching sitter rates:', error);
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
        console.error('Supabase function error:', error);
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
      console.error('Error checking saved card:', error);
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
        mode: mode // Add the booking mode
      };
      
      // Mode-specific payload fields
      let requestPayload: any;
      
      if (mode === 'walking') {
        // Debugging slot ID parsing
        const availabilitySlotId = slotId.includes('_') ? slotId.split('_')[1] : slotId;
        
        requestPayload = {
          ...commonPayload,
          availability_slot_id: availabilitySlotId,
          booking_date: formattedDate,
          start_time: startTime,
          end_time: endTime
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
        console.error('Payment initialization error details:', paymentError);
        throw new Error(`Failed to initialize payment: ${paymentError.message}`);
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
      
      // Open the payment sheet
      const { error: presentError } = await presentPaymentSheet();
      
      if (presentError) {
        if (presentError.code === 'Canceled') {
          throw new Error('Payment canceled');
        }
        throw new Error(presentError.message);
      }
      
      // If we get here, card was successfully set up
      // Now charge the payment
      return await chargePayment(customerId, bookingId);
    } catch (error: any) {
      console.error('Error in payment initialization:', error);
      throw error;
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
        console.error('Charge payment error details:', chargeError);
        throw new Error(`Failed to charge payment: ${chargeError.message}`);
      }
      
      
      if (!chargeData) {
        throw new Error('No data returned from payment charging');
      }
      
      const { paymentIntentId } = chargeData;
      
      if (!paymentIntentId) throw new Error('Payment intent ID missing from response');
      
      return { bookingId, paymentIntentId };
    } catch (error: any) {
      console.error('Error charging payment:', error);
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

    try {
      setIsSubmitting(true);
      
      let formattedDate;
      
      // Process dates based on booking mode
      if (mode === 'walking') {
        // For walking mode, format the single date
        try {
          // Parse the date string which might be in format like "Mar 15, 2025"
          const dateParts = date.split(' ');
          // Handle month abbreviation
          const months: Record<string, number> = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
          };
          
          // Parse month, day, and year
          const month = months[dateParts[0]] as number;
          // Remove comma from day
          const day = parseInt(dateParts[1].replace(',', ''));
          const year = parseInt(dateParts[2]);
          
          // Create date object
          const bookingDate = new Date(year, month, day);
          
          // Format date for database as YYYY-MM-DD
          formattedDate = bookingDate.toISOString().split('T')[0];
        } catch (dateError) {
          console.error('Error parsing walking date:', dateError);
          throw new Error('Invalid date format for walking booking. Please try again.');
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
                      createMessageThread(result.bookingId);
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
                      requestBody = {
                        owner_id: user.id,
                        sitter_id: sitterId,
                        availability_slot_id: slotId.split('_')[1],
                        booking_date: formattedDate,
                        start_time: startTime,
                        end_time: endTime,
                        selected_pets: JSON.stringify(selectedPets), // Convert to JSON string
                        total_price: pricing.totalPrice,
                        booking_type: 'walking'
                      };
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
                    }
                    
                    
                    const { data: initData, error: initError } = await supabase.functions.invoke('init-payment', {
                      body: requestBody
                    });
                    
                    if (initError) throw initError;
                    
                    const { bookingId, customerId } = initData;
                    
                    const result = await chargePayment(customerId, bookingId);
                    if (result) {
                      createMessageThread(result.bookingId);
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
        const result = await initializePayment(formattedDate);
        if (result) {
          createMessageThread(result.bookingId);
        }
      }
    } catch (error: any) {
      console.error('Error in booking process:', error);
      // Provide more detailed error message for debugging
      const errorMessage = error.message || 'There was a problem creating your booking. Please try again.';
      Alert.alert('Booking Failed', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Create a message thread for the booking
  const createMessageThread = async (bookingId: string) => {
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    try {
      // Create message thread data based on booking type
      type ThreadData = {
        owner_id: string;
        sitter_id: string;
        last_message: string;
        last_message_time: string;
        booking_type: 'walking' | 'boarding';
        walking_booking_id?: string;
        boarding_booking_id?: string;
      };
      
      const threadData: ThreadData = {
        owner_id: user.id,
        sitter_id: sitterId,
        last_message: "Booking created",
        last_message_time: new Date().toISOString(),
        booking_type: mode
      };
      
      // Add the appropriate booking ID field based on booking type
      if (mode === 'walking') {
        threadData.walking_booking_id = bookingId;
      } else {
        threadData.boarding_booking_id = bookingId;
      }
      
      
      const { error: threadError } = await supabase
        .from('message_threads')
        .insert([threadData]);
        
      if (threadError) {
        console.error('Error creating message thread:', threadError);
        // We don't throw here, as the booking itself was successful
      }
      
      // Show success message and navigate to messages
      const bookingType = mode === 'walking' ? 'walking' : 'boarding';
      const serviceName = mode === 'walking' ? 'walk' : 'stay';
      
      Alert.alert(
        'Booking Confirmed',
        `Your dog ${serviceName} booking has been confirmed! The dog sitter will be notified.`,
        [
          { 
            text: 'OK', 
            onPress: () => router.push({
              pathname: '/(tabs)/messages',
              params: {
                showWelcomeMessage: "true"
              }
            }) 
          }
        ]
      );
    } catch (error) {
      console.error('Error creating message thread:', error);
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
              <Text style={styles.summaryText}>Date: {date}</Text>
              <Text style={styles.summaryText}>Time: {startTime} - {endTime}</Text>
              <Text style={styles.summaryText}>Duration: {duration} hour{duration !== 1 ? 's' : ''}</Text>
            </>
          ) : (
            <>
              <Text style={styles.summaryText}>Start Date: {startDate ? new Date(startDate).toLocaleDateString() : 'Not selected'}</Text>
              <Text style={styles.summaryText}>End Date: {endDate ? new Date(endDate).toLocaleDateString() : 'Not selected'}</Text>
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
