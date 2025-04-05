import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';
import { AvailabilitySlot } from '../types';
import DateFilter from './DateFilter';

interface WalkingSectionProps {
  walkingSlots: AvailabilitySlot[];
  filteredWalkingSlots: AvailabilitySlot[];
  sitterId: string;
  onFilterChange: (startDate: Date | null, endDate: Date | null) => void;
}

const WalkingSection: React.FC<WalkingSectionProps> = ({
  walkingSlots,
  filteredWalkingSlots,
  sitterId,
  onFilterChange,
}) => {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const renderWalkingSlot = ({ item }: { item: AvailabilitySlot }) => (
    <TouchableOpacity
      style={[
        styles.slotItem,
        selectedSlot === item.id ? styles.selectedSlot : null,
      ]}
      onPress={() => setSelectedSlot(item.id)}
    >
      <Text style={styles.slotText}>{item.day} - {item.date}</Text>
      <Text style={styles.slotTime}>{item.formattedTime}</Text>
    </TouchableOpacity>
  );

  const handleBooking = () => {
    const slotDetails = walkingSlots.find(s => s.id === selectedSlot);
    if (!slotDetails || !sitterId) {
      Toast.show({ type: 'error', text1: 'Booking Error', text2: 'Selected slot details not found.' });
      return;
    }
    
    router.push({
      pathname: '/booking/select-pets', 
      params: {
        sitterId,
        mode: 'walking',
        slotId: selectedSlot, 
        date: slotDetails.date,
        startTime: slotDetails.startTime,
        endTime: slotDetails.endTime,
        formattedTime: slotDetails.formattedTime
      },
    });
  };

  return (
    <>
      <TouchableOpacity 
        onPress={() => setShowFilters(!showFilters)} 
        style={styles.filterToggle}
      >
        <Text style={styles.filterToggleText}>
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </Text>
      </TouchableOpacity>

      {showFilters && (
        <DateFilter onFilterChange={onFilterChange} />
      )}

      <FlatList
        data={filteredWalkingSlots}
        renderItem={renderWalkingSlot}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No walking slots available.
          </Text>
        }
        contentContainerStyle={styles.listContent}
      />

      {selectedSlot && (
        <TouchableOpacity style={styles.bookButton} onPress={handleBooking}>
          <Text style={styles.bookButtonText}>Book Walking Slot</Text>
        </TouchableOpacity>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  filterToggle: {
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  filterToggleText: {
    color: '#63C7B8',
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 80, 
  },
  slotItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    backgroundColor: '#FFF',
    marginVertical: 5,
    marginHorizontal: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedSlot: {
    backgroundColor: '#E0F2F1', 
    borderColor: '#63C7B8',
    borderWidth: 1,
  },
  slotText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  slotTime: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#999',
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

export default WalkingSection;
