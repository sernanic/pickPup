import { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { format, parseISO, eachDayOfInterval } from 'date-fns';
import { DateData } from 'react-native-calendars';

// Import components
import AvailabilityHeader from './components/AvailabilityHeader';
import TabNavigator from './components/TabNavigator';
import WalkingSection from './components/WalkingSection';
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
        <WalkingSection
          walkingSlots={walkingSlots}
          filteredWalkingSlots={filteredWalkingSlots}
          sitterId={params.id as string}
          onFilterChange={handleFilterChange}
        />
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
});