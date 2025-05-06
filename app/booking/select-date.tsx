import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { supabase } from '@/app/lib/supabase';
import { useAuthStore } from '@/app/stores/authStore';
import { Calendar, DateData } from 'react-native-calendars';
import { format } from 'date-fns';

export default function SelectDateScreen() {
  const insets = useSafeAreaInsets();
  const { sitterId, serviceId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [markedDates, setMarkedDates] = useState<{[date: string]: any}>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { user } = useAuthStore();

  // Days of the week for reference
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Month names for the header
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Format date for consistent display
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

  // Function to get available dates based on sitter's weekly availability
  const fetchAvailableDates = async () => {
    try {
      setLoading(true);
      
      if (!sitterId) {
        throw new Error('Sitter ID is required');
      }
      
      // Fetch the sitter's weekly availability
      const { data: availabilityData, error: availabilityError } = await supabase
        .from('sitter_weekly_availability')
        .select('weekday, start_time, end_time')
        .eq('sitter_id', sitterId);
      
      if (availabilityError) throw availabilityError;
      
      if (!availabilityData || availabilityData.length === 0) {
        setAvailableDates([]);
        updateMarkedDates([]);
        setLoading(false);
        return;
      }

      // Create a map of weekday to availability for easier lookup
      const weekdayAvailability = availabilityData.reduce((acc, curr) => {
        // The database uses 0-6 for Sunday-Saturday
        acc[curr.weekday] = true;
        return acc;
      }, {} as Record<number, boolean>);
      
      // Get current date
      const today = new Date();
      
      // Generate all dates in the range (2 months)
      const allDates: string[] = [];
      
      // Loop through the next 60 days (roughly 2 months)
      for (let i = 0; i < 60; i++) {
        // Create a temporary date for each day
        const tempDate = new Date(today);
        tempDate.setDate(today.getDate() + i);
        
        const weekday = tempDate.getDay(); // Get day of week
        
        // Check if this weekday has availability
        if (weekdayAvailability[weekday]) {
          // Create date string in YYYY-MM-DD format
          const dateString = format(tempDate, 'yyyy-MM-dd');
          allDates.push(dateString);
        }
      }
      
      setAvailableDates(allDates);
      updateMarkedDates(allDates);
    } catch (error) {
      console.log('Error fetching available dates:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update marked dates for calendar
  const updateMarkedDates = (availableDates: string[]) => {
    const newMarkedDates: {[date: string]: any} = {};
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // Mark today's date
    newMarkedDates[today] = { 
      selected: selectedDate === today, 
      marked: true, 
      dotColor: '#63C7B8' 
    };
    
    // Mark available dates
    availableDates.forEach(date => {
      newMarkedDates[date] = { 
        ...newMarkedDates[date],
        marked: true, 
        dotColor: '#63C7B8'
      };
    });
    
    // Mark selected date
    if (selectedDate) {
      newMarkedDates[selectedDate] = { 
        ...newMarkedDates[selectedDate],
        selected: true, 
        selectedColor: '#63C7B8'
      };
    }
    
    setMarkedDates(newMarkedDates);
  };

  useEffect(() => {
    fetchAvailableDates();
  }, [sitterId]);
  
  useEffect(() => {
    updateMarkedDates(availableDates);
  }, [selectedDate, availableDates]);

  // Handle day press on calendar
  const handleDayPress = (day: DateData) => {
    const dateString = day.dateString;
    
    // Check if this date is available
    if (!availableDates.includes(dateString)) {
      console.log("Date not available:", dateString);
      return;
    }
    
    setSelectedDate(dateString);
    console.log("Selected date:", dateString);
    
    // Get the weekday number
    const date = new Date(dateString);
    const weekdayNum = date.getDay();
    console.log("Weekday:", weekdayNum, daysOfWeek[weekdayNum]);
  };
  
  // Handle continue button press
  const handleContinue = () => {
    if (!selectedDate) return;
    
    router.push({
      pathname: `/booking/select-time`,
      params: { 
        sitterId: sitterId as string,
        serviceId: serviceId as string,
        date: selectedDate,
        weekday: new Date(selectedDate).getDay().toString()
      }
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Choose a Date for Dog Walking</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#63C7B8" />
          <Text style={styles.loadingText}>Loading available dates...</Text>
        </View>
      ) : (
        <View style={styles.calendarContainer}>
          <Text style={styles.calendarInstruction}>
            Available days are marked with dots. Select a date to continue.
          </Text>
          
          <Calendar
            minDate={format(new Date(), 'yyyy-MM-dd')}
            onDayPress={handleDayPress}
            markedDates={markedDates}
            theme={{
              todayTextColor: '#63C7B8',
              arrowColor: '#63C7B8',
              selectedDayBackgroundColor: '#63C7B8',
              selectedDayTextColor: '#FFFFFF',
            }}
            style={styles.calendar}
          />
          
          {selectedDate && (
            <View style={styles.selectedDateInfo}>
              <Text style={styles.selectedDateText}>
                Selected: {formatDateDisplay(selectedDate)}
              </Text>
            </View>
          )}
          
          {selectedDate && (
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinue}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          )}
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#63C7B8',
    flex: 1,
    textAlign: 'center',
    marginRight: 40, // To offset the back button and center the title
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
    color: '#8E8E93',
  },
  calendarContainer: {
    flex: 1,
    padding: 16,
  },
  calendarInstruction: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginVertical: 10,
    paddingHorizontal: 15,
    fontFamily: 'Poppins-Regular',
  },
  calendar: {
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 8,
    marginBottom: 15,
  },
  selectedDateInfo: {
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 10,
  },
  selectedDateText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: '#333',
  },
  continueButton: {
    backgroundColor: '#63C7B8',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 20,
  },
  continueButtonText: {
    fontFamily: 'Poppins-SemiBold',
    color: '#fff',
    fontSize: 16,
  },
}); 