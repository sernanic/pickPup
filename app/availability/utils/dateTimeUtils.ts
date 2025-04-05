import { format, parseISO, isBefore, isEqual, eachDayOfInterval } from 'date-fns';

export const formatTime = (timeString: string): string => {
  if (!timeString) return 'Invalid Time';
  if (timeString.includes('AM') || timeString.includes('PM')) return timeString;

  const parts = timeString.split(':');
  if (parts.length < 2) return timeString; 

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  if (isNaN(hours) || isNaN(minutes)) return timeString; 

  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${ampm}`;
};

export const convertTimeToMinutes = (timeString: string): number => {
  if (!timeString) return NaN;
  let hours: number, minutes: number;
  let period: string | undefined;

  if (timeString.includes('AM') || timeString.includes('PM')) {
    const [timePart, detectedPeriod] = timeString.split(' ');
    period = detectedPeriod?.toUpperCase();
    [hours, minutes] = timePart.split(':').map(Number);
  } else {
    [hours, minutes] = timeString.split(':').slice(0, 2).map(Number);
  }

  if (isNaN(hours) || isNaN(minutes)) return NaN;

  let totalMinutes = hours * 60 + minutes;
  if (period === 'PM' && hours !== 12) {
    totalMinutes += 12 * 60;
  } else if (period === 'AM' && hours === 12) {
    totalMinutes = minutes; 
  }

  return totalMinutes;
};

export const getNormalizedDateKey = (dateInput: string | Date): string => {
  let date: Date;
  if (typeof dateInput === 'string') {
    if (dateInput.includes('T')) dateInput = dateInput.split('T')[0]; 
    const parts = dateInput.split(/[-/]/);
    let year, month, day;
    if (parts.length === 3) {
      if (parts[0].length === 4) { 
        year = parseInt(parts[0]); month = parseInt(parts[1]) - 1; day = parseInt(parts[2]);
      } else { 
        month = parseInt(parts[0]) - 1; day = parseInt(parts[1]); year = parseInt(parts[2]);
      }
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        date = new Date(Date.UTC(year, month, day)); 
      } else {
        date = new Date(NaN); 
      }
    } else {
      date = new Date(NaN); 
    }
  } else {
    date = new Date(Date.UTC(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate()));
  }

  if (isNaN(date.getTime())) return 'Invalid Date'; 

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
};

export const mapWeekday = (dbWeekday: number): number => {
  return dbWeekday === 7 ? 0 : dbWeekday;
};

export const isValidDateRange = (startDate: string, endDate: string, unavailableDates: Set<string>): boolean => {
  if (!startDate || !endDate) return false;
  
  const startDateObj = parseISO(startDate);
  const endDateObj = parseISO(endDate);

  if (isBefore(endDateObj, startDateObj) || isEqual(endDateObj, startDateObj)) {
    return false;
  }

  const intervalDates = eachDayOfInterval({ start: startDateObj, end: endDateObj });
  for (let i = 1; i < intervalDates.length; i++) { 
    const checkDateStr = format(intervalDates[i], 'yyyy-MM-dd');
    if (unavailableDates.has(checkDateStr)) {
      return false;
    }
  }

  return true;
};
