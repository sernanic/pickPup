import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface TabNavigatorProps {
  activeTab: string;
  onTabChange: (tabName: string) => void;
}

const TabNavigator: React.FC<TabNavigatorProps> = ({ activeTab, onTabChange }) => {
  return (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'walking' ? styles.activeTab : null]}
        onPress={() => onTabChange('walking')}
      >
        <Text style={[styles.tabText, activeTab === 'walking' ? styles.activeTabText : null]}>
          Walking
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'boarding' ? styles.activeTab : null]}
        onPress={() => onTabChange('boarding')}
      >
        <Text style={[styles.tabText, activeTab === 'boarding' ? styles.activeTabText : null]}>
          Boarding
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F8F8F8',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: '#63C7B8',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default TabNavigator;
