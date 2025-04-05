import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronLeft, Filter, CalendarIcon } from 'lucide-react-native';
import { router } from 'expo-router';

interface AvailabilityHeaderProps {
  activeTab: string;
  onToggleFilters: () => void;
}

const AvailabilityHeader: React.FC<AvailabilityHeaderProps> = ({
  activeTab,
  onToggleFilters,
}) => {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <ChevronLeft size={24} color="#333" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Availability</Text>
      <TouchableOpacity onPress={onToggleFilters} style={styles.filterButton}>
        {activeTab === 'walking' ? <Filter size={24} color="#333" /> : <CalendarIcon size={24} color="#333" />}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  filterButton: {
    padding: 5,
  },
});

export default AvailabilityHeader;
