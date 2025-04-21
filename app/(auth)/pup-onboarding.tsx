import React, { useState, useEffect } from 'react';
import { ImageBackground, View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView, Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { Pet } from '../features/profile/types';
import { router } from 'expo-router';
import { decode } from 'base64-arraybuffer';

export default function PupOnboardingScreen() {
  const { user } = useAuthStore();
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newPets, setNewPets] = useState<Pet[]>([]);
  const [petName, setPetName] = useState('');
  const [petBreed, setPetBreed] = useState('');
  const [petAge, setPetAge] = useState('');
  const [petImageUri, setPetImageUri] = useState<string | null>(null);
  const [petImageBase64, setPetImageBase64] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const resetModalFields = () => {
    setPetName('');
    setPetBreed('');
    setPetAge('');
    setPetImageUri(null);
    setPetImageBase64(null);
  };

  const openAddPupModal = () => {
    resetModalFields();
    setAddModalVisible(true);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied','We need permission to access your photos to set a pet image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1,1],
      quality: 0.8,
      base64: true,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    setPetImageUri(asset.uri);
    setPetImageBase64(asset.base64 || null);
  };

  const handleAddPet = async () => {
    if (!user) {
      Alert.alert('Error','User not signed in');
      return;
    }
    const userId = user.id;
    if (!petName.trim()) {
      Alert.alert('Error','Pet name is required');
      return;
    }
    setIsAdding(true);
    const newPet: any = {
      name: petName.trim(),
      breed: petBreed.trim() || null,
      age: petAge ? parseInt(petAge) : null,
      owner_id: userId,
      is_neutered: false,
      gender: 'unknown',
      weight: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (petImageUri) {
      setIsUploading(true);
      try {
        const response = await fetch(petImageUri);
        const blob = await response.blob();
        const reader = new FileReader();
        const base64Data = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            if (typeof reader.result === 'string') resolve(reader.result.split(',')[1]); else reject(new Error());
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        const fileName = `${Date.now()}.jpg`;
        const filePath = `user_${userId}/${fileName}`;
        const contentType = 'image/jpeg';
        const { error: uploadError } = await supabase.storage
          .from('pets')
          .upload(filePath, decode(base64Data), { contentType, upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('pets').getPublicUrl(filePath);
        newPet.image_url = urlData.publicUrl;
      } catch (err: any) {
        console.error('Error uploading image:', err);
        Alert.alert('Upload Error','There was a problem uploading your pet image, but we will still add without image.');
      } finally { setIsUploading(false); }
    }
    try {
      console.log('Attempting to save pet...'); 
      const { data: petData, error } = await supabase
        .from('pets')
        .insert([newPet])
        .select()
        .single();
      if (error) throw error;
      console.log('Pet saved successfully, navigating to location onboarding...'); 
      setNewPets(prev => [...prev, petData]);
      resetModalFields(); // Reset fields after successful save
      setAddModalVisible(false);
      // router.push('/(auth)/location-onboarding');
      Alert.alert('Success','Your pet has been added successfully!');
    } catch (err: any) {
      console.error('Error adding pet:', err);
      console.log('Pet save failed, navigation skipped.'); 
      Alert.alert('Error',err.message || 'Failed to add pet. Please try again.');
    } finally { setIsAdding(false); }
  };

  return (
    <View style={styles.redContainer}>
      <ImageBackground
        source={require('../../assets/images/pupOnboardingBackground.png')}
        style={styles.background}
      >
        <View style={styles.container}>
          {newPets.length > 0 && (
            <ScrollView horizontal contentContainerStyle={styles.pupScroll}>
              {newPets.map(pet => (
                pet.image_url ? (
                  <Image key={pet.id} source={{ uri: pet.image_url }} style={styles.pupAvatar} />
                ) : null
              ))}
            </ScrollView>
          )}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={openAddPupModal} // Call function to open modal and reset fields
          >
            <Text style={styles.buttonText}>Add Pup</Text>
          </TouchableOpacity>
          {newPets.length > 0 && (
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={() => {
                console.log('Navigating with direct replace');
                router.replace('/(auth)/location-onboarding');
              }}
            >
              <Text style={styles.secondaryButtonText}>Next</Text>
            </TouchableOpacity>
          )}
        </View>
      </ImageBackground>
      <Modal visible={addModalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => { resetModalFields(); setAddModalVisible(false); }} // Reset fields on close
            >
              <Text style={styles.closeButtonText}>X</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Your Pup</Text>
            <KeyboardAvoidingView 
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ flex: 1 }} // Ensure KAV takes available space
            >
              <ScrollView contentContainerStyle={styles.modalForm}>
                {/* Circular Image Picker at the top */}
                <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                  {petImageUri ? (
                    <Image source={{ uri: petImageUri as string }} style={styles.imagePreview} />
                  ) : (
                    <Text>Select Photo</Text> // TODO: Consider adding an icon here
                  )}
                </TouchableOpacity>
                <TextInput placeholder="Name" value={petName} onChangeText={setPetName} style={styles.input} />
                <TextInput placeholder="Breed" value={petBreed} onChangeText={setPetBreed} style={styles.input} />
                <TextInput placeholder="Age" keyboardType="numeric" value={petAge} onChangeText={setPetAge} style={styles.input} />
                {/* Centered Save Button */}
                <View style={styles.buttonContainer}>
                  <TouchableOpacity style={[styles.button, isAdding && styles.buttonDisabled]} onPress={handleAddPet} disabled={isAdding}>
                    {isAdding ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save Pup</Text>}
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => {
                  resetModalFields(); // Reset fields on cancel
                  setAddModalVisible(false);
                }}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  redContainer: {
    flex: 1,
    backgroundColor: '#FEFEF5',
    width: '100%',
  },
  background: {
    flex: 1,
    width: '100%',
    height: '89%',
    marginTop:150
  },
  container: {
    marginTop: '72%',
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
  button: {
    backgroundColor: '#63C7B8',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: 250, 
    alignItems: 'center',
    justifyContent: 'center',
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
    marginTop: 16,
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
  pupScroll: {
    marginBottom: 0,
    marginTop: 120,
  },
  pupAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 12,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
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
    height: '95%', 
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
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  imagePicker: {
    width: 100, 
    height: 100,
    backgroundColor: '#F2F2F7',
    borderRadius: 50, 
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center', 
    marginBottom: 20, 
  },
  imagePreview: {
    width: 100, 
    height: 100,
    borderRadius: 50, 
  },
  buttonContainer: { 
    alignItems: 'center',
    marginTop: 10, 
    marginBottom: 10, 
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  cancelText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
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
    color: '#888'
  }
});
