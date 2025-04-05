import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';
import { Calendar, DateData } from 'react-native-calendars';
import { format, parseISO } from 'date-fns';
import { isValidDateRange } from '../utils/dateTimeUtils';

interface BoardingSectionProps {
  sitterId: string;
  selectedStartDate: string | null;
  selectedEndDate: string | null;
  markedDates: {[date: string]: any};
  unavailableDates: Set<string>;
  onDayPress: (day: DateData) => void;
}

const BoardingSection: React.FC<BoardingSectionProps> = ({
  sitterId,
  selectedStartDate,
  selectedEndDate,
  markedDates,
  unavailableDates,
  onDayPress,
}) => {
  const handleBookBoarding = () => {
    if (!selectedStartDate || !selectedEndDate || !sitterId) {
      Toast.show({ type: 'error', text1: 'Booking Error', text2: 'Please select a valid date range.' });
      return;
    }

    if (!isValidDateRange(selectedStartDate, selectedEndDate, unavailableDates)) {
      Toast.show({ type: 'error', text1: 'Invalid Range', text2: 'Selected range includes unavailable dates.' });
      return;
    }

    router.push({
      pathname: '/booking/select-pets', 
      params: {
        sitterId,
        mode: 'boarding',
        startDate: selectedStartDate, 
        endDate: selectedEndDate,   
      },
    });
  };

  return (
    <ScrollView style={styles.boardingContainer}>
      <Text style={styles.calendarInstruction}>
        Select start and end dates for boarding. Unavailable days are marked in red.
      </Text>
      
      <Calendar
        minDate={format(new Date(), 'yyyy-MM-dd')} 
        onDayPress={onDayPress}
        markedDates={markedDates}
        markingType={'period'} 
        theme={{
          todayTextColor: '#63C7B8',
          arrowColor: '#63C7B8',
          selectedDayBackgroundColor: '#ADD8E6', 
          selectedDayTextColor: '#000000',
        }}
        style={styles.calendar}
      />
      
      {selectedStartDate && selectedEndDate && (
        <View style={styles.selectedDatesInfo}>
          <Text>
            Selected: {format(parseISO(selectedStartDate), 'MMM d, yyyy')} - {format(parseISO(selectedEndDate), 'MMM d, yyyy')}
          </Text>
        </View>
      )}

      {selectedStartDate && selectedEndDate && (
        <TouchableOpacity
          style={styles.bookButton}
          onPress={handleBookBoarding}
        >
          <Text style={styles.bookButtonText}>Book Boarding</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  boardingContainer: {
    flex: 1,
    padding: 10, 
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
  selectedDatesInfo: {
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 80, 
  },
  bookButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#63C7B8',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default BoardingSection;
