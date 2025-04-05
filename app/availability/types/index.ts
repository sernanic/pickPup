export interface AvailabilitySlot {
  id: string;
  day: string;
  date: string;
  startTime: string;
  endTime: string;
  formattedTime: string;
}

export interface UnavailableDate {
  id: string;
  sitter_id: string;
  unavailable_date: string; 
}

export interface WalkingBooking {
  booking_date: string;
  start_time: string;
  end_time: string;
}

export interface BoardingBooking {
  booking_date: string;
  start_date?: string;
  end_date?: string;
  status: string;
}

export interface SitterInfo {
  sitter_id: string;
  max_dogs_boarding: number;
}

export interface SitterWeeklyAvailability {
  id: string;
  sitter_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
}
