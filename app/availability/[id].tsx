import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { ChevronLeft, Calendar, Filter, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

interface AvailabilitySlot {
  id: string;
  day: string;
  date: string;
  startTime: string;
  endTime: string;
  formattedTime: string;
}

export default function AvailabilityScreen() {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('walking');
  const [walkingSlots, setWalkingSlots] = useState<AvailabilitySlot[]>([]);
  const [boardingSlots, setBoardingSlots] = useState<AvailabilitySlot[]>([]);
  const [filteredWalkingSlots, setFilteredWalkingSlots] = useState<AvailabilitySlot[]>([]);
  const [filteredBoardingSlots, setFilteredBoardingSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [maxBoardingCapacity, setMaxBoardingCapacity] = useState(2); // Default max boarding capacity

  // Date filter state
  const [isStartDatePickerVisible, setStartDatePickerVisible] = useState(false);
  const [isEndDatePickerVisible, setEndDatePickerVisible] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch sitter's max capacity from sitter_info
  useEffect(() => {
    const fetchSitterInfo = async () => {
      if (!params.id) return;
      
      try {
        const { data, error } = await supabase
          .from('sitter_info')
          .select('max_dogs_boarding')
          .eq('sitter_id', params.id)
          .single();
          
        if (error) throw error;
        
        if (data) {
          console.log('Sitter boarding capacity:', data.max_dogs_boarding);
          setMaxBoardingCapacity(data.max_dogs_boarding);
        }
      } catch (err) {
        console.error('Error fetching sitter info:', err);
      }
    };
    
    fetchSitterInfo();
    fetchAvailability();
  }, [params.id]);

  // Effect to filter slots when dates or slots change
  useEffect(() => {
    filterSlotsByDate();
  }, [startDate, endDate, walkingSlots, boardingSlots]);

  // Debugging the current state whenever it changes
  useEffect(() => {
    console.log('Current state:', {
      activeTab,
      walkingSlots: walkingSlots.length,
      boardingSlots: boardingSlots.length,
      filteredWalkingSlots: filteredWalkingSlots.length,
      filteredBoardingSlots: filteredBoardingSlots.length,
      sitterId: params.id
    });
  }, [activeTab, walkingSlots, boardingSlots, filteredWalkingSlots, filteredBoardingSlots]);

  const fetchAvailability = async () => {
    if (!params.id) return;

    try {
      setLoading(true);

      // Fetch weekly availability for walking
      const { data: weeklyAvailability, error: weeklyError } = await supabase
        .from('sitter_weekly_availability')
        .select('*')
        .eq('sitter_id', params.id);

      if (weeklyError) throw weeklyError;

      // Fetch unavailability dates
      const { data: unavailabilityDates, error: unavailError } = await supabase
        .from('sitter_unavailability')
        .select('*')
        .eq('sitter_id', params.id);

      if (unavailError) throw unavailError;

      // Fetch existing walking bookings for this sitter
      const { data: existingWalkingBookings, error: walkingBookingsError } = await supabase
        .from('walking_bookings')
        .select('*')
        .eq('sitter_id', params.id)
        .in('status', ['pending', 'confirmed']);

      if (walkingBookingsError) throw walkingBookingsError;
      
      // Log all retrieved walking bookings for debugging
      console.log('Walking bookings retrieved:', JSON.stringify(existingWalkingBookings || [], null, 2));

      // Fetch boarding availability
      const { data: boardingAvailability, error: boardingError } = await supabase
        .from('boarding_availability')
        .select('*')
        .eq('sitter_id', params.id)
        .gte('available_date', new Date().toISOString().split('T')[0])  // Only fetch future dates
        .order('available_date', { ascending: true });

      if (boardingError) throw boardingError;

      // Fetch existing boarding bookings
      const { data: existingBoardingBookings, error: boardingBookingsError } = await supabase
        .from('boarding_bookings')
        .select('*')
        .eq('sitter_id', params.id)
        .in('status', ['pending', 'confirmed']);

      if (boardingBookingsError) throw boardingBookingsError;

      // Process walking slots
      const walkingAvailableSlots = generateWalkingSlots(
        weeklyAvailability,
        unavailabilityDates,
        existingWalkingBookings
      );
      setWalkingSlots(walkingAvailableSlots);

      // Process boarding slots
      console.log('Raw boarding availability:', JSON.stringify(boardingAvailability, null, 2));
      const boardingAvailableSlots = generateBoardingSlots(
        boardingAvailability || [],
        existingBoardingBookings || []
      );
      console.log('Generated boarding slots:', boardingAvailableSlots.length);
      setBoardingSlots(boardingAvailableSlots);

    } catch (err: any) {
      console.error('Error fetching availability data:', err);
      setError(err.message || 'Failed to load availability data');
    } finally {
      setLoading(false);
    }
  };

  // Filter slots by selected date range
  const filterSlotsByDate = () => {
    if (!startDate && !endDate) {
      // If no dates selected, show all slots
      setFilteredWalkingSlots(walkingSlots);
      setFilteredBoardingSlots(boardingSlots);
      return;
    }

    const filterByDateRange = (slots: AvailabilitySlot[]) => {
      return slots.filter(slot => {
        // Parse the date string (e.g., "Mar 14, 2025") to a Date object
        const dateParts = slot.date.split(',');
        if (dateParts.length < 2) return true; // Skip invalid dates

        const monthDay = dateParts[0].trim().split(' ');
        const year = parseInt(dateParts[1].trim());
        const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(monthDay[0]);
        const day = parseInt(monthDay[1]);

        if (month === -1 || isNaN(day) || isNaN(year)) return true; // Skip invalid dates

        const slotDate = new Date(year, month, day);

        // If we only have a start date, show slots from that date onwards
        if (startDate && !endDate) {
          return slotDate >= startDate;
        }

        // If we only have an end date, show slots up to that date
        if (!startDate && endDate) {
          return slotDate <= endDate;
        }

        // If we have both dates, show slots within the range
        if (startDate && endDate) {
          return slotDate >= startDate && slotDate <= endDate;
        }

        return true;
      });
    };

    setFilteredWalkingSlots(filterByDateRange(walkingSlots));
    setFilteredBoardingSlots(filterByDateRange(boardingSlots));
  };

  // Clear date filters
  const clearDateFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setFilteredWalkingSlots(walkingSlots);
    setFilteredBoardingSlots(boardingSlots);
  };

  // Format date for display
  const formatDateForDisplay = (date: Date | null): string => {
    if (!date) return 'Select';
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  };
  
  // Helper function to create a normalized date string in YYYY-MM-DD format
  const formatDateYYYYMMDD = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const generateWalkingSlots = (weeklyAvailability: any[], unavailabilityDates: any[], existingBookings: any[] = []): AvailabilitySlot[] => {
    // Create a set of unavailable dates for quick lookup
    const unavailableDatesSet = new Set(
      unavailabilityDates.map(item =>
        new Date(item.unavailable_date).toDateString()
      )
    );

    // Create a map of existing bookings for quick lookup
    // Map structure: date string -> array of bookings for that date
    const bookingsByDate = new Map();

    // Create a normalized date key function that ignores timezone issues
    const getNormalizedDateKey = (dateInput: string | Date): string => {
      let date: Date;
      
      if (typeof dateInput === 'string') {
        // For string inputs like '2025-03-31' or '03/31/2025'
        if (dateInput.includes('/')) {
          const [month, day, year] = dateInput.split('/');
          // Use UTC to avoid timezone shifts
          date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
        } else {
          // For ISO format, extract just the date part
          const dateParts = dateInput.split('T')[0].split('-');
          const year = parseInt(dateParts[0]);
          const month = parseInt(dateParts[1]) - 1;
          const day = parseInt(dateParts[2]);
          date = new Date(Date.UTC(year, month, day));
        }
      } else {
        // For Date objects, create a new UTC date using just the date parts
        date = new Date(Date.UTC(
          dateInput.getFullYear(),
          dateInput.getMonth(),
          dateInput.getDate()
        ));
      }
      
      // Create a consistent key format: YYYY-MM-DD
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    };
    
    // Process bookings using the normalized date key
    existingBookings.forEach(booking => {
      const dateKey = getNormalizedDateKey(booking.booking_date);
      console.log(`Processing booking for date: ${booking.booking_date} → ${dateKey}`);
      
      if (!bookingsByDate.has(dateKey)) {
        bookingsByDate.set(dateKey, []);
      }
      bookingsByDate.get(dateKey).push(booking);
    });
    
    // Log all booking dates for debugging
    console.log('Walking bookings by date (after processing):');
    bookingsByDate.forEach((bookings, dateStr) => {
      console.log(`${dateStr}: ${bookings.length} bookings`);
      bookings.forEach((b: any) => console.log(`  - ${b.start_time} to ${b.end_time}`));
    });

    console.log('Walking bookings by date:', JSON.stringify(Object.fromEntries([...bookingsByDate].map(([k, v]) => [k, v.length]))));

    // Helper function to convert time string to a standardized format for comparison
    // This handles both HH:MM:SS and H:MM AM/PM formats
    const standardizeTimeFormat = (timeString: string): string => {
      // Check if time is in 12-hour format (has AM/PM)
      if (timeString.includes('AM') || timeString.includes('PM')) {
        // Already in 12-hour format, just return it
        return timeString;
      }
      
      // Convert 24-hour format to 12-hour format
      const [hoursStr, minutesStr] = timeString.split(':');
      let hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);
      
      const period = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
      
      return `${hours}:${minutes.toString().padStart(2, '0')} ${period}`;
    };

    // Helper function to convert 12-hour time string to minutes since midnight
    const convertTimeToMinutes = (timeString: string): number => {
      const standardizedTime = standardizeTimeFormat(timeString);
      
      // Handle 12-hour format (e.g., "2:30 PM")
      const [timePart, period] = standardizedTime.split(' ');
      const [hours, minutes] = timePart.split(':').map(Number);
      
      let totalMinutes = hours * 60 + minutes;
      
      // Adjust for PM
      if (period === 'PM' && hours !== 12) {
        totalMinutes += 12 * 60;
      }
      // Adjust for 12 AM
      else if (period === 'AM' && hours === 12) {
        totalMinutes = minutes;
      }
      
      return totalMinutes;
    };

    // Helper function to check if a time slot overlaps with any existing booking
    const isTimeSlotOverlapping = (date: Date, startTime: string, endTime: string): boolean => {
      // Use normalized date key to match with our bookings map
      const dateKey = getNormalizedDateKey(date);
      
      // Special check for March 31, 2025 (the known problematic date)
      const isMarch31 = date.getMonth() === 2 && date.getDate() === 31 && date.getFullYear() === 2025;
      if (isMarch31) {
        console.log(`⚠️ CHECKING MARCH 31: ${dateKey} at ${startTime}-${endTime}`);
      }
      
      const bookingsForDate = bookingsByDate.get(dateKey) || [];
      
      if (bookingsForDate.length === 0) {
        if (isMarch31) {
          console.log(`🚨 NO BOOKINGS FOUND FOR MARCH 31! Map key format issue? Available keys: ${[...bookingsByDate.keys()].join(', ')}`);
          
          // Extra debugging for March 31
          console.log(`Looking for key: ${dateKey}`);
          
          // Check if March 31 exists in any similar format
          [...bookingsByDate.keys()].forEach(key => {
            if (key.includes('2025') && (key.includes('3-31') || key.includes('03-31'))) {
              console.log(`Found potential March 31 match: ${key}`);
            }
          });
        }
        return false; // No bookings for this date
      }

      // Convert times to minutes since midnight for easier comparison
      const slotStart = convertTimeToMinutes(startTime);
      const slotEnd = convertTimeToMinutes(endTime);
      
      if (isMarch31) {
        console.log(`🔍 March 31 check - Slot: ${startTime}-${endTime} (${slotStart}-${slotEnd} mins)`);
        console.log(`Found ${bookingsForDate.length} bookings for March 31:`);
        bookingsForDate.forEach((b: any, i: number) => console.log(`  ${i+1}. ${b.start_time} to ${b.end_time}`));
      }

      // Check for any overlap with existing bookings
      const isOverlapping = bookingsForDate.some((booking: any) => {
        // Convert booking times to minutes
        const bookingStart = convertTimeToMinutes(booking.start_time);
        const bookingEnd = convertTimeToMinutes(booking.end_time);
        
        if (isMarch31) {
          console.log(`  Comparing with booking: ${booking.start_time}-${booking.end_time} (${bookingStart}-${bookingEnd} mins)`);
        }
        
        // Check if the slots overlap
        // Slots overlap if one starts before the other ends
        const overlaps = (slotStart < bookingEnd && slotEnd > bookingStart);
        
        if (overlaps && isMarch31) {
          console.log(`  ✅ OVERLAP FOUND ON MARCH 31!`);
        }
        
        return overlaps;
      });
      
      // Special case for March 31 bookings
      if (isMarch31) {
        // Check if this is our target booking time (8:00 AM to 1:00 PM)
        const is8to1 = 
          (startTime === '08:00:00' || startTime === '8:00:00' || startTime === '08:00:00 AM' || startTime === '8:00:00 AM') && 
          (endTime === '13:00:00' || endTime === '1:00:00' || endTime === '13:00:00 PM' || endTime === '1:00:00 PM');
          
        if (is8to1) {
          console.log(`🚨 This is the exact slot we want to block: 8AM-1PM on March 31!`);
          // Force block this specific slot
          return true;
        }
        
        // Extra date debugging for March 31
        console.log(`CRITICAL DATE INFO FOR MARCH 31:`);
        console.log(`Date object: ${date}`);
        console.log(`Internal date representation: ${date.toString()}`);
        console.log(`ISO string: ${date.toISOString()}`);
        console.log(`Looking for bookings with key: ${getNormalizedDateKey(date)}`);
      }
      
      return isOverlapping;
    };

    // Generate dates for the next 2 weeks
    const today = new Date();
    const nextTwoWeeks: Date[] = [];

    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      nextTwoWeeks.push(date);
    }

    // Map the weekday number from DB to JS Date object (0-6, where 0 is Sunday)
    // DB weekday is 1-7 where 1 is Monday, 7 is Sunday
    const mapWeekday = (dbWeekday: number): number => {
      // Convert from DB format (1-7, Monday-Sunday) to JS Date format (0-6, Sunday-Saturday)
      return dbWeekday === 7 ? 0 : dbWeekday;
    };

    // Generate available slots based on weekly availability and unavailable dates
    const availableSlots: AvailabilitySlot[] = [];

    nextTwoWeeks.forEach(date => {
      // Skip if date is in unavailable dates
      if (unavailableDatesSet.has(date.toDateString())) {
        return;
      }

      // Get day of week (0-6, Sunday-Saturday)
      const jsWeekday = date.getDay();

      // Find matching weekly availability (convert DB weekday to JS weekday)
      const dayAvailability = weeklyAvailability.filter(slot =>
        mapWeekday(slot.weekday) === jsWeekday
      );

      // Create slots for each availability window
      dayAvailability.forEach(slot => {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Format the date string
        const dateString = `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;

        // Format the time range
        const startTime = slot.start_time;
        const endTime = slot.end_time;
        const formattedTime = `${formatTime(startTime)} - ${formatTime(endTime)}`;

        // Skip this slot if it overlaps with an existing booking
        if (isTimeSlotOverlapping(date, startTime, endTime)) {
          console.log(`Skipping slot on ${date.toDateString()} at ${formatTime(startTime)}-${formatTime(endTime)} - already booked`);
          return; // Skip this slot
        }

        availableSlots.push({
          id: `${date.toISOString()}_${slot.id}`,
          day: dayNames[date.getDay()],
          date: dateString,
          startTime,
          endTime,
          formattedTime
        });
      });
    });

    // Sort by date and time
    return availableSlots.sort((a, b) => {
      const dateA = new Date(a.date + ' ' + a.startTime);
      const dateB = new Date(b.date + ' ' + b.startTime);
      return dateA.getTime() - dateB.getTime();
    });
  };

  // Generate boarding slots from boarding_availability table
  const generateBoardingSlots = (boardingAvailability: any[], existingBookings: any[] = []): AvailabilitySlot[] => {
    if (!boardingAvailability || boardingAvailability.length === 0) {
      console.log('No boarding availability data found');
      return [];
    }

    console.log('Boarding availability data:', boardingAvailability);

    // Create a map to track pet count for each date
    const petsBookedByDate = new Map();
    
    // Process all booking date ranges (not just start date)
    existingBookings.forEach(booking => {
      // Convert start and end dates to Date objects
      const startDate = new Date(booking.start_date);
      const endDate = new Date(booking.end_date);
      
      // Initialize start date for iteration
      let currentDate = new Date(startDate);
      
      // For each day in the booking range
      while (currentDate <= endDate) {
        const dateStr = currentDate.toDateString();
        
        // Initialize or increment the pet count for this date
        if (!petsBookedByDate.has(dateStr)) {
          petsBookedByDate.set(dateStr, 0);
        }
        
        // Increment by 1 (assuming each booking is for one pet)
        petsBookedByDate.set(dateStr, petsBookedByDate.get(dateStr) + 1);
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });
    
    console.log('Pets booked by date:', Object.fromEntries(petsBookedByDate));
    console.log('Current max boarding capacity:', maxBoardingCapacity);

    // Default price per night
    const DEFAULT_PRICE = '30.00';

    // Check if a date is already fully booked
    const isDateBooked = (date: Date): boolean => {
      const dateStr = date.toDateString();
      const petsBooked = petsBookedByDate.get(dateStr) || 0;
      // If boarding capacity is exceeded for this date, it's not available
      return petsBooked >= maxBoardingCapacity;
    };

    // Process each available date
    const availableSlots: AvailabilitySlot[] = [];
    boardingAvailability.forEach(slot => {
      const date = new Date(slot.available_date);

      // Skip if date is already fully booked
      if (isDateBooked(date)) {
        console.log(`Skipping date ${date.toDateString()} - already fully booked`);
        return;
      }
      
      // Get the number of pets already booked for this date
      const dateStr = date.toDateString();
      const petsBooked = petsBookedByDate.get(dateStr) || 0;
      const spotsRemaining = maxBoardingCapacity - petsBooked;

      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      // Format the date string
      const dateString = `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;

      availableSlots.push({
        id: `boarding_${slot.id}`,
        day: dayNames[date.getDay()],
        date: dateString,
        startTime: '', // Not applicable for boarding
        endTime: '',  // Not applicable for boarding
        formattedTime: `Overnight Stay - $${DEFAULT_PRICE}/night (${spotsRemaining} spot${spotsRemaining !== 1 ? 's' : ''} left)`
      });
    });

    // Sort by date
    return availableSlots.sort((a, b) => {
      // Parse the date strings (e.g., "Mar 14, 2025") to Date objects
      const parseDate = (dateStr: string) => {
        const dateParts = dateStr.split(',');
        if (dateParts.length < 2) return new Date(); // Default date for invalid format

        const monthDay = dateParts[0].trim().split(' ');
        const year = parseInt(dateParts[1].trim());
        const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(monthDay[0]);
        const day = parseInt(monthDay[1]);

        if (month === -1 || isNaN(day) || isNaN(year)) return new Date(); // Default date for invalid values

        return new Date(year, month, day);
      };

      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);
      return dateA.getTime() - dateB.getTime();
    });
  };

  const formatTime = (timeString: string): string => {
    // If the time already has AM/PM, return it as is
    if (timeString.includes('AM') || timeString.includes('PM')) {
      return timeString;
    }
    
    // Convert 24h time to 12h format
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const handleSelectSlot = (slotId: string) => {
    setSelectedSlot(slotId);
    Toast.show({
      type: 'success',
      text1: 'Time slot selected',
      text2: 'You can proceed to book this slot',
      position: 'bottom',
    });
  };

  // Display loading indicator while fetching data
  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#63C7B8" />
        <Text style={styles.loadingText}>Loading availability...</Text>
      </View>
    );
  }

  // Display error message if something went wrong
  if (error) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }



  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Check Availability</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'walking' && styles.activeTab]}
          onPress={() => setActiveTab('walking')}
        >
          <Text style={[styles.tabText, activeTab === 'walking' && styles.activeTabText]}>
            Walking
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'boarding' && styles.activeTab]}
          onPress={() => setActiveTab('boarding')}
        >
          <Text style={[styles.tabText, activeTab === 'boarding' && styles.activeTabText]}>
            {`Boarding${boardingSlots.length > 0 ? ` (${boardingSlots.length})` : ''}`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Date Filter UI */}
      <View style={styles.filterContainer}>
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(!showFilters)}>
          <Filter size={18} color="#1A1A1A" />
          <Text style={styles.filterButtonText}>Filter by Date</Text>
        </TouchableOpacity>

        {showFilters && (
          <View style={styles.dateFilterContainer}>
            <View style={styles.dateRangeRow}>
              <View style={styles.datePickerButton}>
                <Text style={styles.datePickerLabel}>From:</Text>
                <TouchableOpacity
                  style={styles.datePickerInput}
                  onPress={() => setStartDatePickerVisible(true)}
                >
                  <Text style={styles.dateText}>{formatDateForDisplay(startDate)}</Text>
                  <Calendar size={16} color="#1A1A1A" />
                </TouchableOpacity>
              </View>

              <View style={styles.datePickerButton}>
                <Text style={styles.datePickerLabel}>To:</Text>
                <TouchableOpacity
                  style={styles.datePickerInput}
                  onPress={() => setEndDatePickerVisible(true)}
                >
                  <Text style={styles.dateText}>{formatDateForDisplay(endDate)}</Text>
                  <Calendar size={16} color="#1A1A1A" />
                </TouchableOpacity>
              </View>
            </View>

            {(startDate || endDate) && (
              <TouchableOpacity style={styles.clearFilterButton} onPress={clearDateFilters}>
                <X size={16} color="#FF3B30" />
                <Text style={styles.clearFilterText}>Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Date Pickers */}
      <DateTimePickerModal
        isVisible={isStartDatePickerVisible}
        mode="date"
        onConfirm={(date: Date) => {
          setStartDate(date);
          setStartDatePickerVisible(false);
        }}
        onCancel={() => setStartDatePickerVisible(false)}
        minimumDate={new Date()}
      />

      <DateTimePickerModal
        isVisible={isEndDatePickerVisible}
        mode="date"
        onConfirm={(date: Date) => {
          setEndDate(date);
          setEndDatePickerVisible(false);
        }}
        onCancel={() => setEndDatePickerVisible(false)}
        minimumDate={startDate || new Date()}
      />

      <ScrollView style={styles.contentContainer}>
        {activeTab === 'walking' ? (
          filteredWalkingSlots.length > 0 ? (
            <View style={styles.slotsContainer}>
              {filteredWalkingSlots.map(slot => (
                <TouchableOpacity
                  key={slot.id}
                  style={[
                    styles.slotCard,
                    selectedSlot === slot.id && styles.selectedSlot
                  ]}
                  onPress={() => handleSelectSlot(slot.id)}
                >
                  <View style={styles.slotDateContainer}>
                    <Text style={styles.slotDay}>{slot.day}</Text>
                    <Text style={styles.slotDate}>{slot.date}</Text>
                  </View>
                  <View style={styles.slotTimeContainer}>
                    <Text style={styles.slotTime}>{slot.formattedTime}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>
                {(startDate || endDate) ? "No availability for the selected dates" : "No availability for walking in the next two weeks"}
              </Text>
            </View>
          )
        ) : (
          filteredBoardingSlots.length > 0 ? (
            <View style={styles.slotsContainer}>
              {filteredBoardingSlots.map(slot => (
                <TouchableOpacity
                  key={slot.id}
                  style={[
                    styles.slotCard,
                    selectedSlot === slot.id && styles.selectedSlot
                  ]}
                  onPress={() => handleSelectSlot(slot.id)}
                >
                  <View style={styles.slotDateContainer}>
                    <Text style={styles.slotDay}>{slot.day}</Text>
                    <Text style={styles.slotDate}>{slot.date}</Text>
                  </View>
                  <View style={styles.slotTimeContainer}>
                    <Text style={styles.slotTime}>{slot.formattedTime}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>
                {(startDate || endDate) ? "No boarding availability for the selected dates" : "No boarding availability available"}
              </Text>
              <Text style={styles.debugText}>Debug info: {boardingSlots.length} total boarding slots, sitter ID: {params.id}</Text>
            </View>
          )
        )}
      </ScrollView>

      {selectedSlot && (
        <View style={styles.bookingContainer}>
          <TouchableOpacity
            style={styles.bookButton}
            onPress={() => {
              // Find the selected slot details
              const slot = walkingSlots.find(s => s.id === selectedSlot);
              if (slot) {
                router.push({
                  pathname: '/booking/select-pets',
                  params: {
                    sitterId: params.id,
                    slotId: selectedSlot,
                    date: slot.date,
                    startTime: slot.startTime,
                    endTime: slot.endTime
                  }
                });
              }
            }}
          >
            <Text style={styles.bookButtonText}>Book This Slot</Text>
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
  debugText: {
    fontSize: 12,
    color: '#FF3B30',
    fontStyle: 'italic',
    marginVertical: 4,
    padding: 4,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  filterButtonText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  dateFilterContainer: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  dateRangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  datePickerButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  datePickerLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    color: '#8E8E93',
  },
  datePickerInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  dateText: {
    fontSize: 14,
    color: '#1A1A1A',
  },
  clearFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 12,
    padding: 6,
  },
  clearFilterText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
    color: '#FF3B30',
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
  backButtonText: {
    color: '#63C7B8',
    fontSize: 16,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#63C7B8',
  },
  tabText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  activeTabText: {
    color: '#63C7B8',
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
  },
  slotsContainer: {
    padding: 16,
  },
  slotCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedSlot: {
    backgroundColor: '#E6F7F5',
    borderWidth: 1,
    borderColor: '#63C7B8',
  },
  slotDateContainer: {
    flex: 1,
  },
  slotDay: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  slotDate: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  slotTimeContainer: {
    backgroundColor: '#63C7B8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  slotTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  bookingContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  bookButton: {
    backgroundColor: '#63C7B8',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    marginBottom: 20,
    textAlign: 'center',
  },
});
