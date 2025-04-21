import { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { format, parseISO, eachDayOfInterval } from 'date-fns';
import { DateData, Calendar } from 'react-native-calendars';
import { supabase } from '@/app/lib/supabase';

// Import components
import AvailabilityHeader from './components/AvailabilityHeader';
import TabNavigator from './components/TabNavigator';
import BoardingSection from './components/BoardingSection';
import { LoadingState, ErrorState } from './components/LoadingAndErrorStates';

// Import services and utilities
import { fetchSitterInfo, fetchAvailabilityData } from './services/availabilityService';
import { AvailabilitySlot } from './types';

export default function AvailabilityScreen() {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('walking');
  const [walkingSlots, setWalkingSlots] = useState<AvailabilitySlot[]>([]);
  const [filteredWalkingSlots, setFilteredWalkingSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [maxBoardingCapacity, setMaxBoardingCapacity] = useState(2);
  
  const [selectedStartDate, setSelectedStartDate] = useState<string | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<string | null>(null);
  const [unavailableDates, setUnavailableDates] = useState<Set<string>>(new Set());
  const [markedDates, setMarkedDates] = useState<{[date: string]: any}>({});
  
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Walking calendar state
  const [walkingAvailableDates, setWalkingAvailableDates] = useState<string[]>([]);
  const [walkingMarkedDates, setWalkingMarkedDates] = useState<{[date: string]: any}>({});
  const [walkingSelectedDate, setWalkingSelectedDate] = useState<string | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  
  // Add the fetchData and other methods here
  useEffect(() => {
    const fetchData = async () => {
      if (!params.id) return;
      
      try {
        const sitterInfo = await fetchSitterInfo(params.id as string);
        if (sitterInfo) {
          setMaxBoardingCapacity(sitterInfo.max_dogs_boarding);
        }
        
        const data = await fetchAvailabilityData(params.id as string, maxBoardingCapacity);
        setWalkingSlots(data.walkingSlots);
        setFilteredWalkingSlots(data.walkingSlots);
        setUnavailableDates(data.unavailableDates);
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to load availability data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    fetchWalkingDates(); // Load calendar data for walking tab
  }, [params.id]);
  
  useEffect(() => {
    filterWalkingSlotsByDate();
  }, [startDate, endDate, walkingSlots]);
  
  useEffect(() => {
    updateMarkedDates();
  }, [selectedStartDate, selectedEndDate, unavailableDates]);

  const filterWalkingSlotsByDate = () => {
    if (!startDate && !endDate) {
      setFilteredWalkingSlots(walkingSlots);
      return;
    }
  
    const filterByDateRange = (slots: AvailabilitySlot[]) => {
      return slots.filter(slot => {
        const dateParts = slot.date.split(',');
        if (dateParts.length < 2) return true;
  
        const monthDay = dateParts[0].trim().split(' ');
        const year = parseInt(dateParts[1].trim());
        const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(monthDay[0]);
        const day = parseInt(monthDay[1]);
  
        if (month === -1 || isNaN(day) || isNaN(year)) return true;
  
        const slotDate = new Date(Date.UTC(year, month, day)); 
  
        if (startDate && !endDate) {
          const startOfDayStartDate = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
          return slotDate >= startOfDayStartDate;
        }
        if (!startDate && endDate) {
          const startOfDayEndDate = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()));
          return slotDate <= startOfDayEndDate;
        }
        if (startDate && endDate) {
          const startOfDayStartDate = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
          const startOfDayEndDate = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()));
          return slotDate >= startOfDayStartDate && slotDate <= startOfDayEndDate;
        }
        return true;
      });
    };
  
    setFilteredWalkingSlots(filterByDateRange(walkingSlots));
  };
  
  const isDateUnavailable = (dateString: string): boolean => {
    return unavailableDates.has(dateString);
  };
  
  const handleDayPress = (day: DateData) => {
    const dateString = day.dateString; 

    if (dateString < format(new Date(), 'yyyy-MM-dd') || isDateUnavailable(dateString)) {
      Toast.show({ type: 'error', text1: 'Invalid Date', text2: 'Cannot select past or unavailable dates.' });
      return;
    }

    if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
      setSelectedStartDate(dateString);
      setSelectedEndDate(null);
      Toast.show({ type: 'info', text1: 'Start Date Selected', text2: 'Now select an end date.' });
    } else if (selectedStartDate && !selectedEndDate) {
      const startDateObj = parseISO(selectedStartDate);
      const endDateObj = parseISO(dateString);

      if (dateString < selectedStartDate) {
        setSelectedStartDate(dateString);
        setSelectedEndDate(null);
        Toast.show({ type: 'info', text1: 'Start Date Selected', text2: 'Now select an end date.' });
        return;
      }

      const intervalDates = eachDayOfInterval({ start: startDateObj, end: endDateObj });
      let rangeBlocked = false;
      for (let i = 1; i < intervalDates.length; i++) { 
        const checkDateStr = format(intervalDates[i], 'yyyy-MM-dd');
        if (isDateUnavailable(checkDateStr)) {
          rangeBlocked = true;
          break;
        }
      }

      if (rangeBlocked) {
        Toast.show({ type: 'error', text1: 'Invalid Range', text2: 'Selected range includes unavailable dates.' });
      } else {
        setSelectedEndDate(dateString);
        Toast.show({ type: 'success', text1: 'End Date Selected', text2: 'Date range confirmed.' });
      }
    }
  };
  
  const updateMarkedDates = () => {
    const newMarkedDates: {[date: string]: any} = {};
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    // Mark unavailable dates
    unavailableDates.forEach(dateStr => {
      newMarkedDates[dateStr] = { disabled: true, disableTouchEvent: true, marked: true, dotColor: 'red' };
    });

    // Mark selected date range
    if (selectedStartDate && selectedEndDate) {
      const start = parseISO(selectedStartDate);
      const end = parseISO(selectedEndDate);
      const interval = eachDayOfInterval({ start, end });

      interval.forEach((date, index) => {
        const dateString = format(date, 'yyyy-MM-dd');
        if (unavailableDates.has(dateString)) return; 

        const isStart = index === 0;
        const isEnd = index === interval.length - 1;

        newMarkedDates[dateString] = {
          ...newMarkedDates[dateString], 
          selected: true,
          color: '#ADD8E6', 
          textColor: 'black',
          startingDay: isStart,
          endingDay: isEnd,
          disableTouchEvent: newMarkedDates[dateString]?.disableTouchEvent ?? false 
        };
      });
    } else if (selectedStartDate) {
      if (!unavailableDates.has(selectedStartDate)) {
        newMarkedDates[selectedStartDate] = {
          selected: true,
          color: '#ADD8E6', 
          textColor: 'black',
          startingDay: true,
          endingDay: true, 
        };
      }
    }

    setMarkedDates(newMarkedDates);
  };
  
  const handleFilterChange = (newStartDate: Date | null, newEndDate: Date | null) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };
  
  const handleTabChange = (tabName: string) => {
    setActiveTab(tabName);
    if (tabName === 'walking') {
      setSelectedSlot(null);
    } else {
      setSelectedStartDate(null);
      setSelectedEndDate(null);
    }
  };

  // Format date for display
  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // Return as is if invalid
      }
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  // Handle walking date selection
  const handleWalkingDayPress = (day: DateData) => {
    const dateString = day.dateString;
    
    // Check if this date is available
    if (!walkingAvailableDates.includes(dateString)) {
      Toast.show({ 
        type: 'info', 
        text1: 'Date Unavailable', 
        text2: 'The sitter is not available on this date.' 
      });
      return;
    }
    
    setWalkingSelectedDate(dateString);
    
    // Update the marked dates
    const updatedMarkedDates = {...walkingMarkedDates};
    
    // Remove previous selection styling
    Object.keys(updatedMarkedDates).forEach(date => {
      if (updatedMarkedDates[date].selected) {
        updatedMarkedDates[date] = {
          ...updatedMarkedDates[date],
          selected: false
        };
      }
    });
    
    // Add new selection
    updatedMarkedDates[dateString] = {
      ...updatedMarkedDates[dateString],
      selected: true,
      selectedColor: '#63C7B8'
    };
    
    setWalkingMarkedDates(updatedMarkedDates);
  };

  // Fetch available walking dates
  const fetchWalkingDates = async () => {
    if (!params.id) return;
    
    try {
      setCalendarLoading(true);
      
      // Fetch the sitter's weekly availability
      const { data: availabilityData, error: availabilityError } = await supabase
        .from('sitter_weekly_availability')
        .select('weekday, start_time, end_time')
        .eq('sitter_id', params.id as string);
      
      if (availabilityError) throw availabilityError;
      
      if (!availabilityData || availabilityData.length === 0) {
        setWalkingAvailableDates([]);
        setWalkingMarkedDates({});
        return;
      }

      // Create a map of weekday to availability
      const weekdayAvailability = availabilityData.reduce((acc, curr) => {
        acc[curr.weekday] = true;
        return acc;
      }, {} as Record<number, boolean>);
      
      // Get current date
      const today = new Date();
      
      // Generate dates for the next 60 days
      const allDates: string[] = [];
      
      for (let i = 0; i < 60; i++) {
        const tempDate = new Date(today);
        tempDate.setDate(today.getDate() + i);
        
        const weekday = tempDate.getDay(); 
        
        if (weekdayAvailability[weekday]) {
          const dateString = format(tempDate, 'yyyy-MM-dd');
          allDates.push(dateString);
        }
      }
      
      setWalkingAvailableDates(allDates);
      
      // Mark available dates on calendar
      const newMarkedDates: {[date: string]: any} = {};
      const today_str = format(new Date(), 'yyyy-MM-dd');
      
      // Mark today
      newMarkedDates[today_str] = { 
        marked: true, 
        dotColor: '#FF6B6B'
      };
      
      // Mark available dates
      allDates.forEach(date => {
        newMarkedDates[date] = {
          ...newMarkedDates[date],
          marked: true,
          dotColor: '#63C7B8'
        };
      });
      
      setWalkingMarkedDates(newMarkedDates);
    } catch (error) {
      console.error('Error fetching walking dates:', error);
      Toast.show({ 
        type: 'error', 
        text1: 'Error', 
        text2: 'Failed to load calendar data' 
      });
    } finally {
      setCalendarLoading(false);
    }
  };
  
  // Navigate directly to time selection
  const handleWalkingTimeSelection = () => {
    if (!params.id || !walkingSelectedDate) {
      Toast.show({ 
        type: 'error', 
        text1: 'Error', 
        text2: walkingSelectedDate ? 'Sitter information is missing.' : 'Please select a date first.' 
      });
      return;
    }
    
    router.push({
      pathname: '/booking/select-time',
      params: {
        sitterId: params.id as string,
        serviceId: 'walking',
        date: walkingSelectedDate,
        weekday: new Date(walkingSelectedDate).getDay().toString()
      },
    });
  };

  if (loading) {
    return <LoadingState />;
  }
  
  if (error) {
    return <ErrorState message={error} />;
  }
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <AvailabilityHeader 
        activeTab={activeTab}
        onToggleFilters={() => setShowFilters(!showFilters)} 
      />
      
      <TabNavigator 
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
      
      {activeTab === 'walking' && (
        <View style={styles.walkingContainer}>
          <Text style={styles.walkingTitle}>Dog Walking Service</Text>
          
          {calendarLoading ? (
            <View style={styles.calendarLoading}>
              <ActivityIndicator size="large" color="#63C7B8" />
              <Text style={styles.loadingText}>Loading available dates...</Text>
            </View>
          ) : (
            <View style={styles.calendarWrapper}>
              <Text style={styles.calendarInstruction}>
                Available days are marked with dots. Select a date to continue.
              </Text>
              
              <Calendar
                minDate={format(new Date(), 'yyyy-MM-dd')}
                onDayPress={handleWalkingDayPress}
                markedDates={walkingMarkedDates}
                theme={{
                  todayTextColor: '#63C7B8',
                  arrowColor: '#63C7B8',
                  selectedDayBackgroundColor: '#63C7B8',
                  selectedDayTextColor: '#FFFFFF',
                }}
                style={styles.calendar}
              />
              
              {walkingSelectedDate && (
                <View style={styles.selectedDateInfo}>
                  <Text style={styles.selectedDateText}>
                    Selected: {formatDateDisplay(walkingSelectedDate)}
                  </Text>
                </View>
              )}
            </View>
          )}
          
          <TouchableOpacity 
            style={[styles.bookButton, !walkingSelectedDate && styles.disabledButton]}
            onPress={handleWalkingTimeSelection}
            disabled={!walkingSelectedDate}
          >
            <Text style={styles.bookButtonText}>Select Time</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {activeTab === 'boarding' && (
        <BoardingSection
          sitterId={params.id as string}
          selectedStartDate={selectedStartDate}
          selectedEndDate={selectedEndDate}
          markedDates={markedDates}
          unavailableDates={unavailableDates}
          onDayPress={handleDayPress}
        />
      )}
      
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  walkingContainer: {
    flex: 1,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
  },
  walkingTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
    textAlign: 'center',
  },
  calendarWrapper: {
    flex: 1,
  },
  calendarInstruction: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginVertical: 10,
    paddingHorizontal: 15,
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
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  calendarLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  bookButton: {
    backgroundColor: '#63C7B8',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 'auto',
  },
  disabledButton: {
    backgroundColor: '#B0E0D9',
    opacity: 0.7,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});