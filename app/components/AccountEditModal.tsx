import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { X, Camera, Mail, User, Info } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { decode } from 'base64-arraybuffer';

interface AccountEditModalProps {
  visible: boolean;
  onClose: () => void;
  onProfileUpdated?: () => void;
}

export  function AccountEditModal({ visible, onClose, onProfileUpdated }: AccountEditModalProps) {
  const { user, loadUser } = useAuthStore();
  
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    if (visible && user) {
      fetchProfile();
    }
  }, [visible, user]);
  
  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, bio, avatar_url')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      setName(data.name || '');
      setBio(data.bio || '');
      setAvatarUrl(data.avatar_url || null);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };
  
  const pickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need permission to access your photos to set a profile picture.');
        return;
      }

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

      setUploading(true);

      // Upload to Supabase
      if (!user) {
        setUploading(false);
        return;
      }
      
      // Structure the path according to RLS policies
      const fileName = `${Date.now()}`;
      const filePath = `${user.id}/${fileName}.jpg`;
      const contentType = 'image/jpeg';
      
      // Upload the image to the avatars bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, decode(asset.base64), {
          contentType,
          upsert: true,
        });

      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        Alert.alert('Upload Error', 'There was a problem uploading your profile picture.');
        setUploading(false);
        return;
      }

      // Get the public URL for the uploaded image
      const { data: urlData } = await supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(urlData.publicUrl);
      setUploading(false);
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
      setUploading(false);
    }
  };
  
  const handleSave = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      
      const updates = {
        id: user.id,
        name,
        bio,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
      
      if (error) throw error;
      
      // Reload user data in the auth store to reflect changes
      await loadUser();
      
      // Notify parent component that profile was updated
      if (onProfileUpdated) {
        onProfileUpdated();
      }
      
      Alert.alert('Success', 'Your profile has been updated successfully!');
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={onClose}
              >
                <X size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.scrollView}>
              <View style={styles.profileImageSection}>
                <TouchableOpacity 
                  style={styles.profileImageContainer}
                  onPress={pickImage}
                  disabled={uploading}
                >
                  {uploading ? (
                    <View style={styles.profileImage}>
                      <ActivityIndicator size="large" color="#63C7B8" />
                    </View>
                  ) : avatarUrl ? (
                    <View style={styles.profileImage}>
                      <Image 
                        source={{ uri: avatarUrl }} 
                        style={styles.profileImageContent} 
                      />
                    </View>
                  ) : (
                    <View style={styles.profileImage}>
                      <User size={36} color="#63C7B8" />
                    </View>
                  )}
                  <View style={styles.cameraButton}>
                    <Camera size={14} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
                <Text style={styles.changePhotoText}>Tap to change photo</Text>
              </View>
              
              <View style={styles.formSection}>
                <View style={styles.inputContainer}>
                  <View style={styles.inputIconContainer}>
                    <User size={18} color="#63C7B8" />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Your Name"
                    value={name}
                    onChangeText={setName}
                    placeholderTextColor="#A0A0A0"
                  />
                </View>
                
                <View style={styles.inputContainer}>
                  <View style={styles.inputIconContainer}>
                    <Mail size={18} color="#63C7B8" />
                  </View>
                  <TextInput
                    style={[styles.input, styles.disabledInput]}
                    value={user?.email || 'Email not available'}
                    editable={false}
                    placeholderTextColor="#A0A0A0"
                  />
                </View>
                
                <View style={styles.textAreaContainer}>
                  <View style={styles.inputIconContainer}>
                    <Info size={18} color="#63C7B8" />
                  </View>
                  <TextInput
                    style={styles.textArea}
                    placeholder="Tell us about yourself..."
                    value={bio}
                    onChangeText={setBio}
                    multiline={true}
                    numberOfLines={4}
                    placeholderTextColor="#A0A0A0"
                    textAlignVertical="top"
                  />
                </View>
              </View>
            </ScrollView>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.saveButton, saving && styles.disabledButton]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    maxHeight: '100%',
  },
  profileImageSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  profileImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    position: 'relative',
    marginBottom: 8,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profileImageContent: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#63C7B8',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  changePhotoText: {
    fontSize: 14,
    color: '#63C7B8',
    marginTop: 8,
  },
  formSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  inputIconContainer: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
    paddingRight: 12,
  },
  disabledInput: {
    color: '#8E8E93',
    backgroundColor: '#F0F0F0',
  },
  textAreaContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'flex-start',
  },
  textArea: {
    flex: 1,
    minHeight: 120,
    fontSize: 16,
    color: '#333',
    paddingTop: 12,
    paddingRight: 12,
    paddingBottom: 12,
  },
  buttonContainer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  saveButton: {
    backgroundColor: '#63C7B8',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
}); 