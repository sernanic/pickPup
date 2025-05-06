import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Image, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { ChevronLeft, Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../stores/authStore';

interface Pet {
  id: string;
  name: string;
  breed: string;
  age: number;
  gender: string;
  is_neutered: boolean;
  weight: number;
  image_url: string;
}

export default function SelectPetsScreen() {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPets, setSelectedPets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get booking details from params
  const sitterId = params.sitterId as string;
  const serviceId = params.serviceId as string;
  
  // Common params for both modes
  const mode = params.mode as string || 'walking'; // Default to walking
  
  // Walking mode params from new flow
  const date = params.date as string;
  const startTime = params.startTime as string;
  const endTime = params.endTime as string;
  
  // Boarding mode params - kept for backward compatibility
  const startDate = params.startDate as string;
  const endDate = params.endDate as string;

  // Format date for display
  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Format time for display (convert 24h to 12h if needed)
  const formatTimeDisplay = (timeString: string) => {
    if (!timeString) return '';
    
    // If time is already in 12-hour format with AM/PM, return as is
    if (timeString.includes('AM') || timeString.includes('PM')) {
      return timeString;
    }
    
    // Otherwise, convert from 24h format
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    
    return `${formattedHour}:${minutes} ${period}`;
  };

  useEffect(() => {
    if (user) {
      fetchPets();
    }
  }, [user]);

  const fetchPets = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('owner_id', user.id);
        
      if (error) throw error;
      
      setPets(data || []);
    } catch (err: any) {
      console.log('Error fetching pets:', err);
      setError(err.message || 'Failed to load pets');
    } finally {
      setLoading(false);
    }
  };

  const togglePetSelection = (petId: string) => {
    setSelectedPets(prev => {
      if (prev.includes(petId)) {
        return prev.filter(id => id !== petId);
      } else {
        return [...prev, petId];
      }
    });
  };

  const handleContinue = () => {
    if (selectedPets.length === 0) {
      Alert.alert('Error', 'Please select at least one pet for this booking.');
      return;
    }

    // Set up common parameters and print to console for debugging
    const commonParams = {
      sitterId: sitterId as string,
      serviceId: serviceId as string,
      selectedPets: JSON.stringify(selectedPets)
    };
    
    console.log('Selected pets:', selectedPets);
    
    // Navigate to the next screen (confirmation/payment) with the selected pets
    if (mode === 'walking' || !mode) {
      const walkingParams = { 
        ...commonParams,
        mode: 'walking',
        date: date as string, 
        startTime: startTime as string, 
        endTime: endTime as string
      };
      
      console.log('Navigating to confirm with params:', walkingParams);
      
      router.push({
        pathname: `/booking/confirm`, 
        params: walkingParams
      });
    } else {
      // Boarding mode
      const boardingParams = { 
        ...commonParams,
        mode: 'boarding',
        startDate: startDate as string,
        endDate: endDate as string
      };
      
      console.log('Navigating to confirm with params:', boardingParams);
      
      router.push({
        pathname: `/booking/confirm`, 
        params: boardingParams
      });
    }
  };

  // Display loading indicator while fetching data
  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#63C7B8" />
        <Text style={styles.loadingText}>Loading your pets...</Text>
      </View>
    );
  }
  
  // Display error message if something went wrong
  if (error) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Display message if user has no pets
  if (pets.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ChevronLeft size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Pets</Text>
          <View style={{ width: 40 }} /> {/* Placeholder for alignment */}
        </View>
        
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>
            You don't have any pets registered yet. Please add a pet first.
          </Text>
          <TouchableOpacity
            style={styles.addPetButton}
            onPress={() => router.push('/')}
          >
            <Text style={styles.addPetButtonText}>Add a Pet</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Pets</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.contentContainer}>
        <View style={styles.bookingSummary}>
          <Text style={styles.summaryTitle}>Booking Details</Text>
          {(mode === 'walking' || !mode) ? (
            <>
              <Text style={styles.summaryText}>Date: {formatDisplayDate(date)}</Text>
              <Text style={styles.summaryText}>Time: {formatTimeDisplay(startTime)} - {formatTimeDisplay(endTime)}</Text>
              <Text style={styles.summaryText}>Service: Dog Walking</Text>
            </>
          ) : (
            <>
              <Text style={styles.summaryText}>Start Date: {startDate ? formatDisplayDate(startDate) : 'Not selected'}</Text>
              <Text style={styles.summaryText}>End Date: {endDate ? formatDisplayDate(endDate) : 'Not selected'}</Text>
              <Text style={styles.summaryText}>Service: Dog Boarding</Text>
            </>
          )}
        </View>

        <Text style={styles.sectionTitle}>Select pets for this booking:</Text>
        <Text style={styles.sectionSubtitle}>You can select multiple pets</Text>
        
        <View style={styles.petsContainer}>
          {pets.map(pet => (
            <TouchableOpacity
              key={pet.id}
              style={[
                styles.petCard,
                selectedPets.includes(pet.id) && styles.selectedPet
              ]}
              onPress={() => togglePetSelection(pet.id)}
            >
              <View style={styles.petImageContainer}>
                <Image 
                  source={{ uri: pet.image_url || 'https://via.placeholder.com/100' }}
                  style={styles.petImage}
                />
                {selectedPets.includes(pet.id) && (
                  <View style={styles.checkmarkOverlay}>
                    <Check size={20} color="#FFFFFF" />
                  </View>
                )}
              </View>
              <View style={styles.petInfo}>
                <Text style={styles.petName}>{pet.name}</Text>
                <Text style={styles.petBreed}>{pet.breed}</Text>
                <Text style={styles.petDetails}>
                  {pet.age} yr • {pet.gender} • {pet.weight} lbs
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={[
            styles.continueButton,
            selectedPets.length === 0 && styles.disabledButton
          ]}
          onPress={handleContinue}
          disabled={selectedPets.length === 0}
        >
          <Text style={styles.continueButtonText}>
            Continue with {selectedPets.length} {selectedPets.length === 1 ? 'pet' : 'pets'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#63C7B8',
    fontSize: 16,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
  },
  bookingSummary: {
    margin: 16,
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#4A4A4A',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginHorizontal: 16,
    marginTop: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  petsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100, // Extra padding at bottom for scrolling
  },
  petCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedPet: {
    backgroundColor: '#E6F7F5',
    borderWidth: 1,
    borderColor: '#63C7B8',
  },
  petImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  petImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  checkmarkOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#63C7B8',
    borderRadius: 12,
    padding: 4,
  },
  petInfo: {
    flex: 1,
  },
  petName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  petBreed: {
    fontSize: 14,
    color: '#4A4A4A',
    marginTop: 4,
  },
  petDetails: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  continueButton: {
    backgroundColor: '#63C7B8',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 20,
  },
  addPetButton: {
    backgroundColor: '#63C7B8',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  addPetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    marginBottom: 20,
    textAlign: 'center',
  },
});
