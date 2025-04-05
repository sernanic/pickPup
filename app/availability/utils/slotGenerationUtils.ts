import { AvailabilitySlot, UnavailableDate, WalkingBooking } from '../types';
import { formatTime, convertTimeToMinutes, getNormalizedDateKey, mapWeekday } from './dateTimeUtils';

export const generateWalkingSlots = (
  weeklyAvailability: any[],
  unavailabilityData: UnavailableDate[],
  existingBookings: WalkingBooking[] = []
): AvailabilitySlot[] => {
  // Log existing bookings for debugging
  const unavailableDatesSet = new Set(
    (unavailabilityData || []).map(item => {
      const [year, month, day] = (item.unavailable_date || '').split('-').map(Number);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(Date.UTC(year, month - 1, day)).toDateString();
      }
      return null;
    }).filter(d => d !== null)
  );

  const bookingsByDate = new Map<string, any[]>();

  (existingBookings || []).forEach(booking => {
    // Handle both MM/DD/YYYY and YYYY-MM-DD formats
    let dateKey;
    
    if (booking.booking_date.includes('/')) {
      // Handle MM/DD/YYYY format
      const [month, day, year] = booking.booking_date.split('/').map(Number);
      if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
        dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      } else {
        console.warn(`Invalid date format (MM/DD/YYYY): ${booking.booking_date}`);
        return;
      }
    } else {
      // Handle YYYY-MM-DD format
      dateKey = getNormalizedDateKey(booking.booking_date);
    }
    
    if (dateKey !== 'Invalid Date') {
      if (!bookingsByDate.has(dateKey)) {
        bookingsByDate.set(dateKey, []);
      }
      bookingsByDate.get(dateKey)!.push(booking);
    } else {
      console.warn(`Invalid booking date format: ${booking.booking_date}`);
    }
  });

  const isTimeSlotOverlapping = (date: Date, startTime: string, endTime: string): boolean => {
    // Convert date to YYYY-MM-DD format for comparison with bookings
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    if (dateKey === 'Invalid Date') return true;

    const bookingsForDate = bookingsByDate.get(dateKey) || [];
    
    if (bookingsForDate.length === 0) return false;

    // Standardize the time formats for consistent comparison
    const slotStart = convertTimeToMinutes(startTime);
    const slotEnd = convertTimeToMinutes(endTime);

    if (isNaN(slotStart) || isNaN(slotEnd)) {
      console.warn(`Invalid time format for slot: ${startTime} - ${endTime}`);
      return true;
    }

   

    // Check if this slot overlaps with any existing bookings
    const hasOverlap = bookingsForDate.some((booking: any) => {
      // Convert booking times to standard format considering both 12h and 24h formats
      const bookingStart = convertTimeToMinutes(booking.start_time);
      const bookingEnd = convertTimeToMinutes(booking.end_time);
      
      
      if (isNaN(bookingStart) || isNaN(bookingEnd)) {
        console.warn(`Invalid time format for booking: ${booking.start_time} - ${booking.end_time}`);
        return false;
      }
      
      // Overlap logic: if slot starts before booking ends AND slot ends after booking starts
      const overlap = slotStart < bookingEnd && slotEnd > bookingStart;
      return overlap;
    });
    
    return hasOverlap;
  };

  const today = new Date();
  const nextTwoWeeks: Date[] = [];
  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    nextTwoWeeks.push(date);
  }

  const availableSlots: AvailabilitySlot[] = [];

  nextTwoWeeks.forEach(date => {
    // Important: We need to create the date in local time zone, not UTC
    // This fixes the date offset issue with UTC conversion
    const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
    const dateKey = getNormalizedDateKey(localDate);
    
    if (unavailableDatesSet.has(localDate.toDateString())) {
      return;
    }

    const jsWeekday = localDate.getDay(); // Use local day of week, not UTC
    const dayAvailability = (weeklyAvailability || []).filter(slot => mapWeekday(slot.weekday) === jsWeekday);

    dayAvailability.forEach(slot => {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dateString = `${monthNames[localDate.getMonth()]} ${localDate.getDate()}, ${localDate.getFullYear()}`;

      const startTime = slot.start_time;
      const endTime = slot.end_time;
      const formattedTime = `${formatTime(startTime)} - ${formatTime(endTime)}`;

      // Check if this time slot is already booked
      
      if (isTimeSlotOverlapping(localDate, startTime, endTime)) {
        return;
      }

      availableSlots.push({
        id: `${dateKey}_${slot.id}`,
        day: dayNames[jsWeekday],
        date: dateString,
        startTime,
        endTime,
        formattedTime
      });
    });
  });

  return availableSlots.sort((a, b) => {
    const dateA = new Date(a.date);
    const timeA = convertTimeToMinutes(a.startTime);
    const dateB = new Date(b.date);
    const timeB = convertTimeToMinutes(b.startTime);

    const dateTimeA = dateA.getTime() + timeA * 60000;
    const dateTimeB = dateB.getTime() + timeB * 60000;

    return dateTimeA - dateTimeB;
  });
};
