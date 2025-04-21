import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Clock } from 'lucide-react-native';
import { supabase } from '@/app/lib/supabase';
import { useAuthStore } from '@/app/stores/authStore';

export default function SelectTimeScreen() {
  const insets = useSafeAreaInsets();
  
  // Extract params
  const params = useLocalSearchParams();
  const sitterId = params.sitterId;
  const serviceId = params.serviceId;
  
  // Fix the date parameter to correct the off-by-one day issue
  const rawDate = params.date as string;
  const fixedDate = adjustDateIfNeeded(rawDate);
  const date = fixedDate;
  
  const weekday = params.weekday;
  
  const [loading, setLoading] = useState(true);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [bookedTimeSlots, setBookedTimeSlots] = useState<Set<string>>(new Set());
  const [allTimeSlots, setAllTimeSlots] = useState<string[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  // Function to adjust date if needed (add one day to fix the issue)
  function adjustDateIfNeeded(dateStr: string): string {
    if (!dateStr) return '';
    
    try {
      // Parse the date string (format: YYYY-MM-DD)
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
      const day = parseInt(parts[2], 10);
      
      // Create date for the next day to fix the off-by-one issue
      const adjustedDate = new Date(year, month, day + 1);
      
      // Format back to YYYY-MM-DD
      const adjustedYear = adjustedDate.getFullYear();
      const adjustedMonth = String(adjustedDate.getMonth() + 1).padStart(2, '0');
      const adjustedDay = String(adjustedDate.getDate()).padStart(2, '0');
      
      return `${adjustedYear}-${adjustedMonth}-${adjustedDay}`;
    } catch (e) {
      console.error('Error adjusting date:', e);
      return dateStr; // Return original if parsing fails
    }
  }

  // Format date for display
  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // Return as is if invalid
      }
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  // Format time for display
  const formatTimeDisplay = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) {
        return timeString;
      }
      
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    } catch (error) {
      console.error('Error formatting time:', error);
      return timeString;
    }
  };

  // Generate time slots in 30-minute intervals
  const generateTimeSlots = (startTime: string, endTime: string) => {
    try {
      const timeSlots = [];
      const [startHours, startMinutes] = startTime.split(':').map(Number);
      const [endHours, endMinutes] = endTime.split(':').map(Number);
      
      let currentDate = new Date();
      currentDate.setHours(startHours, startMinutes, 0);
      
      const endDate = new Date();
      endDate.setHours(endHours, endMinutes, 0);
      
      // Add 30-minute intervals
      while (currentDate < endDate) {
        const hours = currentDate.getHours();
        const minutes = currentDate.getMinutes();
        timeSlots.push(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
        
        // Add 30 minutes
        currentDate.setMinutes(currentDate.getMinutes() + 30);
      }
      
      return timeSlots;
    } catch (error) {
      console.error('Error generating time slots:', error);
      setError('Failed to generate time slots. Please try again.');
      return [];
    }
  };

  // Fetch available time slots
  const fetchAvailableTimeSlots = async () => {
    try {
      console.log("Fetching available time slots for date:", date);
      setLoading(true);
      setError(null);
      
      // Get sitter's availability for the selected day of week
      const { data: availabilityData, error: availabilityError } = await supabase
        .from('sitter_weekly_availability')
        .select('start_time, end_time')
        .eq('sitter_id', sitterId)
        .eq('weekday', parseInt(weekday as string));
      
      if (availabilityError) {
        throw new Error(availabilityError.message);
      }
      
      if (!availabilityData || availabilityData.length === 0) {
        setAvailableTimeSlots([]);
        setAllTimeSlots([]);
        setBookedTimeSlots(new Set());
        setLoading(false);
        return;
      }
      
      // Generate all possible time slots based on sitter's availability
      let allPossibleTimeSlots: string[] = [];
      
      availabilityData.forEach(availability => {
        const timeSlots = generateTimeSlots(availability.start_time, availability.end_time);
        allPossibleTimeSlots = [...allPossibleTimeSlots, ...timeSlots];
      });
      
      // Get booked time slots for the selected date
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('walking_bookings')
        .select('start_time, end_time')
        .eq('sitter_id', sitterId)
        .eq('booking_date', date)
        .or('status.eq.pending,status.eq.confirmed');
      
      if (bookingsError) {
        console.error('Error fetching existing bookings:', bookingsError);
      }
      
      // Create a set of booked time slots
      const bookedSlotsSet = new Set<string>();
      
      if (bookingsData && bookingsData.length > 0) {
        bookingsData.forEach(booking => {
          // Get start and end time for this booking
          const [startHours, startMinutes] = booking.start_time.split(':').map(Number);
          const [endHours, endMinutes] = booking.end_time.split(':').map(Number);
          
          // Create a Date object to iterate through the booked time
          let currentTime = new Date();
          currentTime.setHours(startHours, startMinutes, 0);
          
          const endTime = new Date();
          endTime.setHours(endHours, endMinutes, 0);
          
          // Mark all 30-minute slots in this booking as booked
          while (currentTime < endTime) {
            const hours = currentTime.getHours();
            const minutes = currentTime.getMinutes();
            const timeSlot = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            bookedSlotsSet.add(timeSlot);
            
            // Add 30 minutes
            currentTime.setMinutes(currentTime.getMinutes() + 30);
          }
        });
      }
      
      // Filter out booked time slots for the available time slots
      const availableSlots = allPossibleTimeSlots.filter(slot => !bookedSlotsSet.has(slot));
      
      // Store all state variables
      setAvailableTimeSlots(availableSlots);
      setBookedTimeSlots(bookedSlotsSet);
      setAllTimeSlots(allPossibleTimeSlots);
    } catch (error) {
      console.error('Error fetching available time slots:', error);
      setError('Failed to load available time slots. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Log received parameters for debugging
    console.log("==== Time Selection: Parameters Received ====", {
      sitterId: sitterId,
      serviceId: serviceId,
      date: date,
      weekday: weekday
    });
    
    if (date) {
      console.log("==== Time Selection: Formatting Date for Display ====", formatDateDisplay(date as string));
    }
    
    fetchAvailableTimeSlots();
  }, [sitterId, date, weekday]);

  // Handle time slot selection
  const handleTimeSlotSelection = (timeSlot: string) => {
    setSelectedTimeSlot(timeSlot);
  };

  // Handle continue button press
  const handleContinue = () => {
    if (!selectedTimeSlot) return;
    
    // Calculate end time (30 minutes after start time)
    const [hours, minutes] = selectedTimeSlot.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0);
    
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + 30);
    
    const endTimeString = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
    
    console.log("Continuing to pet selection with date:", date);
    
    router.push({
      pathname: `/booking/select-pets`,
      params: {
        sitterId: sitterId as string,
        serviceId: serviceId as string,
        mode: 'walking',
        date: date as string,  // Using the fixed date
        startTime: selectedTimeSlot,
        endTime: endTimeString
      }
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Time</Text>
      </View>
      
      {/* Date display */}
      <View style={styles.dateContainer}>
        <Text style={styles.dateLabel}>Selected Date:</Text>
        <Text style={styles.dateValue}>{formatDateDisplay(date as string)}</Text>
      </View>
      
      {/* Time slots container */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007BFF" />
          <Text style={styles.loadingText}>Loading available time slots...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchAvailableTimeSlots}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : availableTimeSlots.length === 0 ? (
        <View style={styles.noTimeSlotsContainer}>
          <Clock size={64} color="#999" />
          <Text style={styles.noTimeSlotsText}>No available time slots for this date.</Text>
          <Text style={styles.noTimeSlotsSubtext}>Please select a different date.</Text>
          <TouchableOpacity 
            style={styles.backToDateButton} 
            onPress={() => router.back()}
          >
            <Text style={styles.backToDateButtonText}>Back to Date Selection</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.timeSlotsContainer}>
          <Text style={styles.timeSlotsTitle}>Available Time Slots:</Text>
          <View style={styles.timeSlotsList}>
            {allTimeSlots.length > 0 ? allTimeSlots.map((timeSlot, index) => {
              const isBooked = bookedTimeSlots.has(timeSlot);
              const isSelected = selectedTimeSlot === timeSlot;
              
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.timeSlotItem,
                    isBooked && styles.bookedTimeSlotItem,
                    isSelected && styles.selectedTimeSlotItem
                  ]}
                  onPress={() => !isBooked && handleTimeSlotSelection(timeSlot)}
                  disabled={isBooked}
                >
                  <Text 
                    style={[
                      styles.timeSlotText,
                      isBooked && styles.bookedTimeSlotText,
                      isSelected && styles.selectedTimeSlotText
                    ]}
                  >
                    {formatTimeDisplay(timeSlot)}
                  </Text>
                  {isBooked && (
                    <Text style={styles.bookedLabel}>Booked</Text>
                  )}
                </TouchableOpacity>
              );
            }) : (
              <Text style={styles.noTimeSlotsText}>No time slots available for this date.</Text>
            )}
          </View>
        </ScrollView>
      )}
      
      {/* Continue button */}
      {!loading && !error && availableTimeSlots.length > 0 && (
        <View style={styles.continueButtonContainer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              !selectedTimeSlot && styles.disabledContinueButton
            ]}
            disabled={!selectedTimeSlot}
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#63C7B8',
    marginLeft: 8,
  },
  dateContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  dateLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  dateValue: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#d9534f',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#63C7B8',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    fontFamily: 'Poppins-Medium',
    color: '#fff',
    fontSize: 16,
  },
  noTimeSlotsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noTimeSlotsText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 18,
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  noTimeSlotsSubtext: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  backToDateButton: {
    backgroundColor: '#63C7B8',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 20,
  },
  backToDateButtonText: {
    fontFamily: 'Poppins-Medium',
    color: '#fff',
    fontSize: 16,
  },
  timeSlotsContainer: {
    flex: 1,
    padding: 16,
  },
  timeSlotsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  timeSlotsList: {
    width: '100%',
  },
  timeSlotItem: {
    width: '100%',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  bookedTimeSlotItem: {
    backgroundColor: '#f0f0f0',
    opacity: 0.7,
  },
  selectedTimeSlotItem: {
    backgroundColor: '#f0f0f0',
    borderColor: '#00BFA5',
    borderWidth: 2,
  },
  timeSlotText: {
    fontSize: 16,
    color: '#333',
  },
  bookedTimeSlotText: {
    color: '#999',
  },
  selectedTimeSlotText: {
    color: '#00BFA5',
    fontWeight: 'bold',
  },
  continueButtonContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#EFEFEF',
  },
  continueButton: {
    backgroundColor: '#63C7B8',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledContinueButton: {
    backgroundColor: '#B8E8E0',
  },
  continueButtonText: {
    fontFamily: 'Poppins-SemiBold',
    color: '#fff',
    fontSize: 16,
  },

  bookedLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
}); 