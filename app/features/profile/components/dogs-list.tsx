import React from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Pet } from '../types';
import { router } from 'expo-router';

interface DogsListProps {
  pets: Pet[];
  onDogPress?: (pet: Pet) => void;
}

export function DogsList({ pets, onDogPress }: DogsListProps) {
  const handleAddDog = () => {
    router.push("/add-dog");
  };

  return (
    <Animated.View 
      style={styles.section}
      entering={FadeInDown.delay(200).duration(500)}
    >
      <Text style={styles.sectionTitle}>My Pets</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dogsContainer}
      >
        {pets.length > 0 ? (
          <>
            {pets.map(pet => (
              <TouchableOpacity 
                key={pet.id} 
                style={styles.dogCard}
                onPress={() => onDogPress?.(pet)}
              >
                <Image 
                  source={{ 
                    uri: pet.image_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=200&auto=format&fit=crop' 
                  }} 
                  style={styles.dogImage} 
                />
                <Text style={styles.dogName}>{pet.name}</Text>
                <Text style={styles.dogDetails}>
                  {pet.breed || 'Mixed'}, {pet.age || '?'} years
                </Text>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <Text style={styles.noPetsText}>No pets added yet</Text>
        )}
        <TouchableOpacity style={styles.addDogCard} onPress={handleAddDog}>
          <View style={styles.addDogIcon}>
            <Text style={styles.plusIcon}>+</Text>
          </View>
          <Text style={styles.addDogText}>Add Pet</Text>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1A1A1A',
    marginBottom: 16,
  },
  dogsContainer: {
    paddingRight: 16,
  },
  dogCard: {
    width: 120,
    marginRight: 12,
    alignItems: 'center',
  },
  dogImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 8,
  },
  dogName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1A1A1A',
    marginBottom: 2,
  },
  dogDetails: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
  noPetsText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#8E8E93',
    marginVertical: 20,
    marginRight: 20,
  },
  addDogCard: {
    width: 120,
    alignItems: 'center',
  },
  addDogIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  plusIcon: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 40,
    color: '#8E8E93',
  },
  addDogText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: '#63C7B8',
  },
}); 