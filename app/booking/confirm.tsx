import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useLocalSearchParams, router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStripe } from '@stripe/stripe-react-native';

export default function ConfirmBookingScreen() {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSavedCard, setHasSavedCard] = useState(false);
  const [cardLast4, setCardLast4] = useState<string | null>(null);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false);
  
  // Initialize Stripe hooks
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  
  // Parse the data from the previous screen
  const sitterId = params.sitterId as string;
  const slotId = params.slotId as string;
  const date = params.date as string;
  const startTime = params.startTime as string;
  const endTime = params.endTime as string;
  const selectedPetsJson = params.selectedPets as string;
  const selectedPets = selectedPetsJson ? JSON.parse(selectedPetsJson) : [];

  // Calculate price
  const basePrice = 20.00;
  const additionalPetFee = Math.max(0, selectedPets.length - 1) * 10.00;
  const serviceFee = 2.50;
  const totalPrice = basePrice + additionalPetFee + serviceFee;

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
      // Debugging slot ID parsing
      const availabilitySlotId = slotId.includes('_') ? slotId.split('_')[1] : slotId;
      console.log('Availability slot ID:', availabilitySlotId);
      console.log('Owner ID:', user.id);
      console.log('Sitter ID:', sitterId);
      
      // Log the request payload for debugging
      const requestPayload = {
        owner_id: user.id,
        sitter_id: sitterId,
        availability_slot_id: availabilitySlotId,
        booking_date: formattedDate,
        start_time: startTime,
        end_time: endTime,
        selected_pets: JSON.stringify(selectedPets), // Convert to JSON string to match Edge Function expectation
        total_price: totalPrice
      };
      console.log('Init payment request payload:', JSON.stringify(requestPayload));
      
      // Call init-payment Edge Function using Supabase client
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('init-payment', {
        body: requestPayload
      });
      
      if (paymentError) {
        console.error('Payment initialization error details:', paymentError);
        throw new Error(`Failed to initialize payment: ${paymentError.message}`);
      }
      
      console.log('Payment data response:', paymentData);
      
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
        total_price: totalPrice,
        sitter_id: sitterId,
        booking_id: bookingId
      };
      console.log('Charge payment request payload:', JSON.stringify(requestPayload));
      
      const { data: chargeData, error: chargeError } = await supabase.functions.invoke('charge-payment', {
        body: requestPayload
      });
      
      if (chargeError) {
        console.error('Charge payment error details:', chargeError);
        throw new Error(`Failed to charge payment: ${chargeError.message}`);
      }
      
      console.log('Charge payment response:', chargeData);
      
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
      Alert.alert('Error', 'You must be logged in to book a walking service.');
      return;
    }

    if (selectedPets.length === 0) {
      Alert.alert('Error', 'Please select at least one pet for the walking service.');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Process the date string to handle format issues
      let bookingDate;
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
        bookingDate = new Date(year, month, day);
      } catch (dateError) {
        console.error('Error parsing date:', dateError);
        throw new Error('Invalid date format. Please try again.');
      }
      
      // Format date for database as YYYY-MM-DD
      const formattedDate = bookingDate.toISOString().split('T')[0];
      
      // If user has a saved card, ask if they want to use it
      if (hasSavedCard && cardLast4) {
        return new Promise((resolve) => {
          Alert.alert(
            'Payment Method',
            `Pay $${totalPrice.toFixed(2)} with card ending in ${cardLast4}?`,
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
                    const { data: initData, error: initError } = await supabase.functions.invoke('init-payment', {
                      body: {
                        owner_id: user.id,
                        sitter_id: sitterId,
                        availability_slot_id: slotId.split('_')[1],
                        booking_date: formattedDate,
                        start_time: startTime,
                        end_time: endTime,
                        selected_pets: JSON.stringify(selectedPets), // Convert to JSON string
                        total_price: totalPrice
                      }
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
      console.log('Error full details:', error);
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
      const { error: threadError } = await supabase
        .from('message_threads')
        .insert([
          {
            booking_id: bookingId,
            owner_id: user.id,
            sitter_id: sitterId,
            last_message: "Booking created",
            last_message_time: new Date().toISOString()
          }
        ]);
        
      if (threadError) {
        console.error('Error creating message thread:', threadError);
        // We don't throw here, as the booking itself was successful
      }
      
      // Show success message and navigate to messages
      Alert.alert(
        'Booking Confirmed',
        'Your dog walking booking has been confirmed! The dog sitter will be notified.',
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
          <Text style={styles.summaryText}>Date: {date}</Text>
          <Text style={styles.summaryText}>Time: {startTime} - {endTime}</Text>
          <Text style={styles.summaryText}>Number of Pets: {selectedPets.length}</Text>
        </View>

        <View style={styles.priceContainer}>
          <Text style={styles.priceTitle}>Price Summary</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceItem}>Walking Fee</Text>
            <Text style={styles.priceValue}>$20.00</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceItem}>Additional Pet Fee</Text>
            <Text style={styles.priceValue}>${Math.max(0, selectedPets.length - 1) * 10}.00</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceItem}>Service Fee</Text>
            <Text style={styles.priceValue}>$2.50</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.priceRow}>
            <Text style={styles.totalText}>Total</Text>
            <Text style={styles.totalValue}>${20 + Math.max(0, selectedPets.length - 1) * 10 + 2.50}</Text>
          </View>
        </View>
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
