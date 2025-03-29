import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView, Image, ActivityIndicator, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { DogsList } from '../features/profile/components';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, X, Plus, Camera } from 'lucide-react-native';
import { UserProfile, Pet } from '../features/profile/types';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';

export default function PetsScreen() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Form state for editing pet
  const [petName, setPetName] = useState('');
  const [petBreed, setPetBreed] = useState('');
  const [petAge, setPetAge] = useState('');
  const [petWeight, setPetWeight] = useState('');
  const [petGender, setPetGender] = useState<'male' | 'female' | 'unknown'>('unknown');
  const [isNeutered, setIsNeutered] = useState(false);
  const [petImage, setPetImage] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, [user]);
  
  // Function to load profile data
  async function loadProfile() {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*, pets(*)')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  }
  
  // Open edit modal with selected pet data
  const handlePetEdit = (pet: Pet) => {
    setSelectedPet(pet);
    setPetName(pet.name);
    setPetBreed(pet.breed || '');
    setPetAge(pet.age ? pet.age.toString() : '');
    setPetWeight(pet.weight ? pet.weight.toString() : '');
    setPetGender(pet.gender || 'unknown');
    setIsNeutered(pet.is_neutered || false);
    setPetImage(pet.image_url || null);
    setEditModalVisible(true);
  };
  
  // Save pet changes
  const savePetChanges = async () => {
    if (!selectedPet || !user) return;
    
    try {
      setIsSaving(true);
      
      const updates: any = {
        name: petName.trim(),
        breed: petBreed.trim() || null,
        age: petAge ? parseInt(petAge) : null,
        weight: petWeight ? parseFloat(petWeight) : null,
        gender: petGender,
        is_neutered: isNeutered,
        updated_at: new Date().toISOString()
      };
      
      // If we have a new pet image that's different from the original image
      if (petImage && petImage !== selectedPet.image_url) {
        setIsUploading(true);
        
        try {
          // Convert URI to base64 first by fetching the image
          const response = await fetch(petImage);
          const blob = await response.blob();
          const reader = new FileReader();
          
          // Create a promise to handle the FileReader
          const base64Data = await new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              if (typeof reader.result === 'string') {
                // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
                const base64 = reader.result.split(',')[1];
                resolve(base64);
              } else {
                reject(new Error('Failed to convert image to base64'));
              }
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          
          // Upload to Supabase storage
          const fileName = `${Date.now()}`;
          const filePath = `${user.id}/${fileName}.jpg`;
          const contentType = 'image/jpeg';
          
          // Upload the image to the 'pets' bucket (created by migration)
          console.log('Uploading image to path:', filePath);
          
          // Upload the image with error handling
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('pets')
            .upload(filePath, decode(base64Data), {
              contentType,
              upsert: true,
            });
            
          if (uploadError) {
            console.log('Upload error:', uploadError);
            
            // If bucket doesn't exist, provide a helpful message
            if (uploadError.message?.includes('Bucket not found')) {
              throw new Error('The pets storage bucket has not been set up. Please contact support.');
            }
            
            throw uploadError;
          }
          
          console.log('Upload successful:', uploadData);
          
          // Get public URL
          const { data: urlData } = await supabase.storage
            .from('pets')
            .getPublicUrl(filePath);
          
          // Add image URL to pet data
          updates.image_url = urlData.publicUrl;
          
        } catch (uploadError: any) {
          console.error('Error uploading image:', uploadError);
          Alert.alert('Upload Error', 'There was a problem uploading your pet image, but we will still update the other information.');
        } finally {
          setIsUploading(false);
        }
      }
      
      const { error } = await supabase
        .from('pets')
        .update(updates)
        .eq('id', selectedPet.id)
        .eq('owner_id', user.id); // Security check to ensure user can only update their own pets
      
      if (error) throw error;
      
      // Refresh profile data
      await loadProfile();
      
      // Close modal
      setEditModalVisible(false);
      Alert.alert('Success', 'Pet information updated successfully!');
      
    } catch (error: any) {
      console.error('Error updating pet:', error);
      Alert.alert('Error', error.message || 'Failed to update pet information. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Pick image from gallery
  const pickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need permission to access your photos to set a pet image.');
        return;
      }
      
      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });
      
      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }
      
      const asset = result.assets[0];
      
      if (!asset.base64) {
        Alert.alert('Error', 'Could not process image data.');
        return;
      }
      
      // Set the image to display in the form
      setPetImage(asset.uri);
      
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };
  
  // Upload image to Supabase and add new pet
  const addNewPet = async () => {
    if (!user) return;
    
    // Validate inputs
    if (!petName.trim()) {
      Alert.alert('Error', 'Pet name is required');
      return;
    }
    
    try {
      setIsSaving(true);
      
      // Prepare pet data
      const newPet: any = {
        name: petName.trim(),
        breed: petBreed.trim() || null,
        age: petAge ? parseInt(petAge) : null,
        weight: petWeight ? parseFloat(petWeight) : null,
        gender: petGender,
        is_neutered: isNeutered,
        owner_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // If we have an image, upload it first
      if (petImage) {
        setIsUploading(true);
        
        try {
          // Convert URI to base64 first by fetching the image
          const response = await fetch(petImage);
          const blob = await response.blob();
          const reader = new FileReader();
          
          // Create a promise to handle the FileReader
          const base64Data = await new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              if (typeof reader.result === 'string') {
                // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
                const base64 = reader.result.split(',')[1];
                resolve(base64);
              } else {
                reject(new Error('Failed to convert image to base64'));
              }
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          
          // Upload to Supabase storage
          const fileName = `${Date.now()}`;
          const filePath = `${user.id}/${fileName}.jpg`;
          const contentType = 'image/jpeg';
          
          // Upload the image to the 'pets' bucket (created by migration)
          console.log('Uploading image to path:', filePath);
          
          // Upload the image with error handling
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('pets')
            .upload(filePath, decode(base64Data), {
              contentType,
              upsert: true,
            });
            
          if (uploadError) {
            console.log('Upload error:', uploadError);
            
            // If bucket doesn't exist, provide a helpful message
            if (uploadError.message?.includes('Bucket not found')) {
              throw new Error('The pets storage bucket has not been set up. Please contact support.');
            }
            
            throw uploadError;
          }
          
          console.log('Upload successful:', uploadData);
          
          // Get public URL
          const { data: urlData } = await supabase.storage
            .from('pets')
            .getPublicUrl(filePath);
          
          // Add image URL to pet data
          newPet.image_url = urlData.publicUrl;
          
        } catch (uploadError: any) {
          console.error('Error uploading image:', uploadError);
          Alert.alert('Upload Error', 'There was a problem uploading your pet image, but we will still add the pet without an image.');
        } finally {
          setIsUploading(false);
        }
      }
      
      // Add the pet to the database
      const { data: petData, error } = await supabase
        .from('pets')
        .insert([newPet])
        .select()
        .single();
      
      if (error) throw error;
      
      // Refresh profile data and close modal
      await loadProfile();
      setAddModalVisible(false);
      Alert.alert('Success', 'Your pet has been added successfully!');
      
    } catch (error: any) {
      console.error('Error adding pet:', error);
      Alert.alert('Error', error.message || 'Failed to add pet. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Pets</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => {
            // Reset form state
            setPetName('');
            setPetBreed('');
            setPetAge('');
            setPetWeight('');
            setPetGender('unknown');
            setIsNeutered(false);
            setPetImage(null);
            // Show add modal
            setAddModalVisible(true);
          }}
        >
          <Plus size={24} color="#333" />
        </TouchableOpacity>
      </View>
      
      <View style={[styles.content, styles.container]}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#63C7B8" />
            <Text style={styles.loadingText}>Loading your pets...</Text>
          </View>
        ) : (
          <DogsList 
            pets={profile?.pets || []} 
            onDogPress={(pet) => handlePetEdit(pet)}
            onAddDogPress={() => {
              // Reset form state
              setPetName('');
              setPetBreed('');
              setPetAge('');
              setPetWeight('');
              setPetGender('unknown');
              setIsNeutered(false);
              setPetImage(null);
              // Show add modal
              setAddModalVisible(true);
            }}
          />
        )}
      </View>
      
      {/* Edit Pet Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Pet Information</Text>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={() => setEditModalVisible(false)}
              >
                <X size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.formContainer}>
              {/* Image Picker */}
              <TouchableOpacity 
                style={styles.imagePicker} 
                onPress={pickImage}
              >
                {petImage ? (
                  <Image 
                    source={{ uri: petImage }} 
                    style={styles.petImagePreview} 
                  />
                ) : (
                  <View style={styles.placeholderContainer}>
                    <Camera size={28} color="#999" />
                    <Text style={styles.placeholderText}>Tap to change photo</Text>
                  </View>
                )}
              </TouchableOpacity>
              
              <Text style={styles.inputLabel}>Name*</Text>
              <TextInput
                style={styles.input}
                value={petName}
                onChangeText={setPetName}
                placeholder="Pet's name"
                maxLength={50}
              />
              
              <Text style={styles.inputLabel}>Breed</Text>
              <TextInput
                style={styles.input}
                value={petBreed}
                onChangeText={setPetBreed}
                placeholder="Breed (optional)"
                maxLength={50}
              />
              
              <Text style={styles.inputLabel}>Age (years)</Text>
              <TextInput
                style={styles.input}
                value={petAge}
                onChangeText={setPetAge}
                placeholder="Age in years (optional)"
                keyboardType="numeric"
                maxLength={2}
              />
              
              <Text style={styles.inputLabel}>Weight (lbs)</Text>
              <TextInput
                style={styles.input}
                value={petWeight}
                onChangeText={setPetWeight}
                placeholder="Weight in pounds (optional)"
                keyboardType="numeric"
                maxLength={5}
              />
              
              <Text style={styles.inputLabel}>Gender</Text>
              <View style={styles.genderContainer}>
                <TouchableOpacity 
                  style={[styles.genderButton, petGender === 'male' && styles.genderButtonActive]}
                  onPress={() => setPetGender('male')}
                >
                  <Text style={[styles.genderButtonText, petGender === 'male' && styles.genderButtonTextActive]}>Male</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.genderButton, petGender === 'female' && styles.genderButtonActive]}
                  onPress={() => setPetGender('female')}
                >
                  <Text style={[styles.genderButtonText, petGender === 'female' && styles.genderButtonTextActive]}>Female</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.genderButton, petGender === 'unknown' && styles.genderButtonActive]}
                  onPress={() => setPetGender('unknown')}
                >
                  <Text style={[styles.genderButtonText, petGender === 'unknown' && styles.genderButtonTextActive]}>Unknown</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.switchRow}>
                <Text style={styles.inputLabel}>Neutered/Spayed</Text>
                <Switch
                  value={isNeutered}
                  onValueChange={setIsNeutered}
                  trackColor={{ false: '#D1D1D6', true: '#A4E5D9' }}
                  thumbColor={isNeutered ? '#63C7B8' : '#F4F4F5'}
                />
              </View>
              
              <TouchableOpacity 
                style={[styles.saveButton, (isSaving || isUploading) && styles.saveButtonDisabled]}
                onPress={savePetChanges}
                disabled={isSaving || isUploading || !petName.trim()}
              >
                {isSaving || isUploading ? (
                  <View style={styles.loadingButtonContent}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={[styles.saveButtonText, {marginLeft: 8}]}>
                      {isUploading ? 'Uploading...' : 'Saving...'}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      {/* Add Pet Modal */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Pet</Text>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={() => setAddModalVisible(false)}
              >
                <X size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.formContainer}>
              {/* Image Picker */}
              <TouchableOpacity 
                style={styles.imagePicker} 
                onPress={pickImage}
              >
                {petImage ? (
                  <Image 
                    source={{ uri: petImage }} 
                    style={styles.petImagePreview} 
                  />
                ) : (
                  <View style={styles.placeholderContainer}>
                    <Camera size={28} color="#999" />
                    <Text style={styles.placeholderText}>Tap to add photo</Text>
                  </View>
                )}
              </TouchableOpacity>
              
              <Text style={styles.inputLabel}>Name*</Text>
              <TextInput
                style={styles.input}
                value={petName}
                onChangeText={setPetName}
                placeholder="Pet's name"
                maxLength={50}
              />
              
              <Text style={styles.inputLabel}>Breed</Text>
              <TextInput
                style={styles.input}
                value={petBreed}
                onChangeText={setPetBreed}
                placeholder="Breed (optional)"
                maxLength={50}
              />
              
              <Text style={styles.inputLabel}>Age (years)</Text>
              <TextInput
                style={styles.input}
                value={petAge}
                onChangeText={setPetAge}
                placeholder="Age in years (optional)"
                keyboardType="numeric"
                maxLength={2}
              />
              
              <Text style={styles.inputLabel}>Weight (lbs)</Text>
              <TextInput
                style={styles.input}
                value={petWeight}
                onChangeText={setPetWeight}
                placeholder="Weight in pounds (optional)"
                keyboardType="numeric"
                maxLength={5}
              />
              
              <Text style={styles.inputLabel}>Gender</Text>
              <View style={styles.genderContainer}>
                <TouchableOpacity 
                  style={[styles.genderButton, petGender === 'male' && styles.genderButtonActive]}
                  onPress={() => setPetGender('male')}
                >
                  <Text style={[styles.genderButtonText, petGender === 'male' && styles.genderButtonTextActive]}>Male</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.genderButton, petGender === 'female' && styles.genderButtonActive]}
                  onPress={() => setPetGender('female')}
                >
                  <Text style={[styles.genderButtonText, petGender === 'female' && styles.genderButtonTextActive]}>Female</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.genderButton, petGender === 'unknown' && styles.genderButtonActive]}
                  onPress={() => setPetGender('unknown')}
                >
                  <Text style={[styles.genderButtonText, petGender === 'unknown' && styles.genderButtonTextActive]}>Unknown</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.switchRow}>
                <Text style={styles.inputLabel}>Neutered/Spayed</Text>
                <Switch
                  value={isNeutered}
                  onValueChange={setIsNeutered}
                  trackColor={{ false: '#D1D1D6', true: '#A4E5D9' }}
                  thumbColor={isNeutered ? '#63C7B8' : '#F4F4F5'}
                />
              </View>
              
              <TouchableOpacity 
                style={[styles.saveButton, (isSaving || isUploading) && styles.saveButtonDisabled]}
                onPress={addNewPet}
                disabled={isSaving || isUploading || !petName.trim()}
              >
                {isSaving || isUploading ? (
                  <View style={styles.loadingButtonContent}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={[styles.saveButtonText, {marginLeft: 8}]}>
                      {isUploading ? 'Uploading...' : 'Saving...'}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.saveButtonText}>Add Pet</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#FFF',
  },
  backButton: {
    padding: 4,
  },
  addButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  formContainer: {
    padding: 20,
  },
  petImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  genderButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  genderButtonActive: {
    backgroundColor: '#63C7B8',
    borderColor: '#63C7B8',
  },
  genderButtonText: {
    color: '#333',
    fontWeight: '500',
  },
  genderButtonTextActive: {
    color: 'white',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  saveButton: {
    backgroundColor: '#63C7B8',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  saveButtonDisabled: {
    backgroundColor: '#A0CCC6',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  imagePicker: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#F5F5F5',
    alignSelf: 'center',
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderStyle: 'dashed',
  },
  petImagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 70,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  loadingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  }
});
