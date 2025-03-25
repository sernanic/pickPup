import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Filter } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface SearchBarProps {
  onPress?: () => void;
  placeholder?: string;
  animationDelay?: number;
}

export function SearchBar({ 
  onPress = () => {}, 
  placeholder = 'Find a trusted dog sitter',
  animationDelay = 100
}: SearchBarProps) {
  return (
    <Animated.View entering={FadeInDown.delay(animationDelay).duration(600)}>
      <View style={styles.searchContainer}>
        <TouchableOpacity style={styles.searchButton} onPress={onPress}>
          <Text style={styles.searchButtonText}>{placeholder}</Text>
          <Filter size={20} color="#8E8E93" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    marginBottom: 24,
  },
  searchButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  searchButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: '#8E8E93',
  },
}); 