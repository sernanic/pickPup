import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Service } from '../types';

interface ServicesListProps {
  services: Service[];
  onServicePress?: (service: Service) => void;
  animationDelay?: number;
}

export function ServicesList({ 
  services, 
  onServicePress = () => {}, 
  animationDelay = 200 
}: ServicesListProps) {
  return (
    <Animated.View entering={FadeInDown.delay(animationDelay).duration(600)}>
      <View style={styles.servicesContainer}>
        <Text style={styles.sectionTitle}>Our Services</Text>
        <FlatList
          data={services}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.servicesList}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.serviceCard}
              onPress={() => onServicePress(item)}
            >
              <Image source={{ uri: item.icon }} style={styles.serviceIcon} />
              <Text style={styles.serviceTitle}>{item.title}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  servicesContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1A1A1A',
    marginBottom: 16,
  },
  servicesList: {
    paddingRight: 16,
  },
  serviceCard: {
    width: 100,
    marginRight: 12,
    alignItems: 'center',
  },
  serviceIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
  },
  serviceTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#1A1A1A',
    textAlign: 'center',
  },
}); 