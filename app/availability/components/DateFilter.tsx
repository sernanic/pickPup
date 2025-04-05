import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal } from 'react-native';
import { X } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

interface DateFilterProps {
  onFilterChange: (startDate: Date | null, endDate: Date | null) => void;
}

const DateFilter: React.FC<DateFilterProps> = ({ onFilterChange }) => {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date()); // For Android

  // Platform specific date picker handling
  const handleOpenStartDatePicker = () => {
    if (Platform.OS === 'ios') {
      setShowStartPicker(true);
    } else {
      // For Android, set the temp date to current selection or now
      setTempDate(startDate || new Date());
      setShowStartPicker(true);
    }
  };

  const handleOpenEndDatePicker = () => {
    if (Platform.OS === 'ios') {
      setShowEndPicker(true);
    } else {
      // For Android, set the temp date to current selection or start date or now
      setTempDate(endDate || startDate || new Date());
      setShowEndPicker(true);
    }
  };

  // Handle start date change
  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || startDate || new Date();
    
    if (Platform.OS === 'android') {
      setShowStartPicker(false);
    }
    
    if (selectedDate) {
      setStartDate(currentDate);
      onFilterChange(currentDate, endDate);
      
      // Reset end date if it's before the new start date
      if (endDate && currentDate > endDate) {
        setEndDate(null);
        onFilterChange(currentDate, null);
      }
    }
  };

  // Handle end date change
  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || endDate || new Date();
    
    if (Platform.OS === 'android') {
      setShowEndPicker(false);
    }
    
    if (selectedDate) {
      setEndDate(currentDate);
      onFilterChange(startDate, currentDate);
    }
  };

  // Clear all selected dates
  const clearDates = () => {
    setStartDate(null);
    setEndDate(null);
    onFilterChange(null, null);
  };

  return (
    <View style={styles.filterSection}>
      <Text style={styles.filterTitle}>Filter by Date</Text>
      <View style={styles.dateInputRow}>
        <TouchableOpacity onPress={handleOpenStartDatePicker} style={styles.dateInput}>
          <Text>{startDate ? format(startDate, 'MMM d, yyyy') : 'Start Date'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleOpenEndDatePicker} style={styles.dateInput}>
          <Text>{endDate ? format(endDate, 'MMM d, yyyy') : 'End Date'}</Text>
        </TouchableOpacity>
      </View>
      {(startDate || endDate) && (
        <TouchableOpacity onPress={clearDates} style={styles.clearButton}>
          <X size={16} color="#FF6347" />
          <Text style={styles.clearButtonText}>Clear Dates</Text>
        </TouchableOpacity>
      )}

      {/* iOS date pickers */}
      {Platform.OS === 'ios' && showStartPicker && (
        <Modal transparent={true} animationType="slide" visible={showStartPicker}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowStartPicker(false)} style={styles.modalButton}>
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Select Start Date</Text>
                <TouchableOpacity onPress={() => setShowStartPicker(false)} style={styles.modalButton}>
                  <Text style={styles.modalButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={startDate || new Date()}
                mode="date"
                display="spinner"
                onChange={handleStartDateChange}
                minimumDate={new Date()}
              />
            </View>
          </View>
        </Modal>
      )}

      {Platform.OS === 'ios' && showEndPicker && (
        <Modal transparent={true} animationType="slide" visible={showEndPicker}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowEndPicker(false)} style={styles.modalButton}>
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Select End Date</Text>
                <TouchableOpacity onPress={() => setShowEndPicker(false)} style={styles.modalButton}>
                  <Text style={styles.modalButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={endDate || startDate || new Date()}
                mode="date"
                display="spinner"
                onChange={handleEndDateChange}
                minimumDate={startDate || new Date()}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Android date pickers */}
      {Platform.OS === 'android' && showStartPicker && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={handleStartDateChange}
          minimumDate={new Date()}
        />
      )}

      {Platform.OS === 'android' && showEndPicker && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={handleEndDateChange}
          minimumDate={startDate || new Date()}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  filterSection: {
    padding: 15,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  dateInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 5,
    padding: 10,
    marginHorizontal: 5,
    backgroundColor: '#FFF',
    alignItems: 'center', 
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
  },
  clearButtonText: {
    marginLeft: 5,
    color: '#FF6347',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalButton: {
    padding: 5,
  },
  modalButtonText: {
    color: '#63C7B8',
    fontSize: 16,
  },
});

export default DateFilter;
