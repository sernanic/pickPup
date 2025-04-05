import { supabase } from '../../../lib/supabase';
import { AvailabilitySlot, UnavailableDate, WalkingBooking, BoardingBooking, SitterInfo } from '../types';
import { generateWalkingSlots } from '../utils/slotGenerationUtils';

export const fetchSitterInfo = async (sitterId: string): Promise<SitterInfo | null> => {
  try {
    const { data, error } = await supabase
      .from('sitter_info')
      .select('max_dogs_boarding')
      .eq('sitter_id', sitterId)
      .single();
      
    if (error) throw error;
    
    if (data) {
      return { sitter_id: sitterId, max_dogs_boarding: data.max_dogs_boarding };
    }
    
    return null;
  } catch (err) {
    console.error('Error fetching sitter info:', err);
    throw err;
  }
};

export const fetchAvailabilityData = async (sitterId: string, maxBoardingCapacity: number = 2): Promise<{
  walkingSlots: AvailabilitySlot[];
  unavailableDates: Set<string>;
}> => {
  try {
    // Fetch weekly availability
    const { data: weeklyAvailability, error: weeklyError } = await supabase
      .from('sitter_weekly_availability')
      .select('*')
      .eq('sitter_id', sitterId);

    if (weeklyError) throw weeklyError;

    // Fetch unavailability dates
    const { data: unavailabilityData, error: unavailError } = await supabase
      .from('sitter_unavailability')
      .select('*') 
      .eq('sitter_id', sitterId);

    if (unavailError) throw unavailError;

    // Fetch existing walking bookings
    const { data: existingWalkingBookings, error: walkingBookingsError } = await supabase
      .from('walking_bookings')
      .select('*')
      .eq('sitter_id', sitterId)
      .in('status', ['pending', 'confirmed']);
    

    if (walkingBookingsError) throw walkingBookingsError;

    // Fetch existing boarding bookings
    const { data: existingBoardingBookings, error: boardingBookingsError } = await supabase
      .from('boarding_bookings')
      .select('*')
      .eq('sitter_id', sitterId)
      .in('status', ['pending', 'confirmed']);

    if (boardingBookingsError) throw boardingBookingsError;

    // Combine all unavailable dates
    const combinedUnavailable = new Set<string>();
    (unavailabilityData || []).forEach((d: UnavailableDate) => {
      if (d.unavailable_date) {
        combinedUnavailable.add(d.unavailable_date); 
      }
    });

    // Add dates where boarding capacity is full
    const bookedDatesCount: { [date: string]: number } = {};
    (existingBoardingBookings || []).forEach((booking: BoardingBooking) => {
      if (booking.booking_date) {
        bookedDatesCount[booking.booking_date] = (bookedDatesCount[booking.booking_date] || 0) + 1;
      }
    });

    Object.entries(bookedDatesCount).forEach(([date, count]) => {
      if (count >= maxBoardingCapacity) {
        combinedUnavailable.add(date);
      }
    });

    // Format walking bookings to ensure consistent date formats
    const formattedWalkingBookings: WalkingBooking[] = (existingWalkingBookings || []).map((booking: any) => {
      // Ensure booking has all required fields
      if (!booking.booking_date || !booking.start_time || !booking.end_time) {
        console.warn('Incomplete booking data found:', booking);
        // Using default empty values instead of returning null
        return {
          booking_date: '',
          start_time: '',
          end_time: ''
        };
      }
      
      // Return the booking with all necessary fields
      return {
        booking_date: booking.booking_date,
        start_time: booking.start_time,
        end_time: booking.end_time
      };
    }).filter(booking => booking.booking_date && booking.start_time && booking.end_time);

    // Generate available walking slots
    const walkingAvailableSlots = generateWalkingSlots(
      weeklyAvailability,
      unavailabilityData,
      formattedWalkingBookings
    );

    return {
      walkingSlots: walkingAvailableSlots,
      unavailableDates: combinedUnavailable
    };
  } catch (err) {
    console.error('Error fetching availability data:', err);
    throw err;
  }
};
