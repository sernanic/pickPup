import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../stores/authStore'; 
import { supabase } from '../lib/supabase'; 
import AddressAutocomplete from '../features/profile/components/AddressAutocomplete';
import { Address } from '../features/profile/types';
import { upsertAddress, setPrimaryAddress } from '../lib/addressUtils';

const LocationOnboardingScreen = () => {
  console.log('Location Onboarding Screen loaded');
  const router = useRouter();
  const { user } = useAuthStore();
  const [selectedAddress, setSelectedAddress] = useState<Partial<Address> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [addLocationModalVisible, setAddLocationModalVisible] = useState(false);

  const handleAddressSelected = (address: Partial<Address>) => {
    console.log('Address selected:', address);
    setSelectedAddress(address);
    setAddLocationModalVisible(false);
    // Automatically save the address and redirect when selected
    handleSaveLocation(address);
  };

  const handleSaveLocation = async (address: Partial<Address>) => {
    if (!user) {
      Alert.alert('Error', 'User not found. Please log in again.');
      return;
    }
    if (!address) {
      Alert.alert('Error', 'Please select an address.');
      return;
    }

    // Ensure essential fields for DB update are present
    if (!address.formatted_address || address.latitude === undefined || address.longitude === undefined) {
      Alert.alert('Error', 'Selected address is incomplete. Please try searching again or contact support.');
      return;
    }

    setIsLoading(true);
    try {
      // Prepare the address data with the profile ID
      const addressToSave: Partial<Address> = {
        ...address,
        profile_id: user.id,
        is_primary: true // Make this the primary address
      };
      
      // Save to useraddress table using the utility function
      const savedAddress = await upsertAddress(addressToSave);
      
      // Set this as the primary address
      await setPrimaryAddress(savedAddress.id, user.id);
      
      // Immediately redirect to home page on successful save
      router.replace('/(tabs)');

    } catch (error: any) {
      console.error('Error saving location:', error);
      Alert.alert('Error', error.message || 'Failed to save location.');
    } finally {
      setIsLoading(false);
    }
  };

  const openAddLocationModal = () => {
    setAddLocationModalVisible(true);
  };

  return (
    <View style={styles.redContainer}>
      <ImageBackground
        source={require('../../assets/images/locationOnboarding1.png')}
        style={styles.background}
      >
        <View style={styles.container}>

          
          {selectedAddress && (
            <View style={styles.selectedAddressContainer}>
              <Text style={styles.selectedAddressText}>
                Selected: {selectedAddress.formatted_address || 'Address details pending...'}
              </Text>
            </View>
          )}
          
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={openAddLocationModal}
          >
            <Text style={styles.buttonText}>Add Your Primary Location</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={styles.secondaryButtonText}>Set up later</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
      
      <Modal visible={addLocationModalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setAddLocationModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>X</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Set Your Location</Text>
            
            <KeyboardAvoidingView 
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ flex: 1 }}
            >
              <View style={styles.modalForm}>
                <View style={styles.autocompleteWrapper}>
                  <AddressAutocomplete onAddressSelected={handleAddressSelected} required />
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  redContainer: {
    flex: 1,
    backgroundColor: '#FEFEF5',
    width: '100%',
  },
  background: {
    flex: 1,
    width: '100%',
    height: '50%',
    marginTop: 100,
    resizeMode: 'contain', // Ensure image fits properly
  },
  container: {
    marginTop: '65%', // Reduced to match smaller background image
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  selectedAddressContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
  },
  selectedAddressText: {
    fontStyle: 'italic',
    color: '#333',
    textAlign: 'center',
  },
  autocompleteWrapper: {
    width: '100%',
    marginBottom: 20,
    minHeight: 100,
  },
  primaryButton: {
    backgroundColor: '#22ADA9',
    paddingVertical: 15,
    paddingHorizontal: 32,
    borderRadius: 50,
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 15,
    paddingHorizontal: 32,
    borderRadius: 50,
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1A3869',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#1A3869',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%', 
    padding: 20,
    alignSelf: 'stretch',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalForm: {
    paddingBottom: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    padding: 5,
    zIndex: 1, 
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#888', 
  },
});

// Create named export for direct reference
export { LocationOnboardingScreen };
export default LocationOnboardingScreen;
