import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator, Alert, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../features/profile/types';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { 
  AddressManager,
  DogsList 
} from '../features/profile/components';
import { ChevronRight, Bell, Shield, CreditCard, CircleHelp as HelpCircle, LogOut, MapPin, DogIcon, User, Settings, Camera, X, Ruler, Heart } from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import { AccountEditModal } from '../components/AccountEditModal';
import { registerForPushNotificationsAsync, updatePushTokenInSupabase } from '../../services/notificationService';

export default function ProfileScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [updatingNotifications, setUpdatingNotifications] = useState(false);
  const { user, logout } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showMaxDistanceModal, setShowMaxDistanceModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [maxDistance, setMaxDistance] = useState(25);
  const [updatingDistance, setUpdatingDistance] = useState(false);
  
  // Navigation functions
  const navigateToAddressManager = () => {
    router.push('/(profile)/addresses');
  };
  
  const navigateToPetsManager = () => {
    router.push('/(profile)/pets');
  };
  
  const navigateToFavorites = () => {
    router.push('/profile/favorites');
  };

  useEffect(() => {
    async function loadProfile() {
      
      if (!user) return;

      try {
        // Log user auth ID for verification
        const { data: { session } } = await supabase.auth.getSession();

        const { data, error } = await supabase
          .from('profiles')
          .select('*, pets(*)')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setProfile(data);
        // Set initial max distance from profile
        setMaxDistance(parseInt(data.maxdistance || '25', 10));
        // Set initial notifications preference from profile
        setNotificationsEnabled(data.notifications_enabled || false);
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [user]);

  const handleChangeProfilePicture = async () => {
    if (!user) return;
    
    try {
      // Request permission to access the photo library
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need permission to access your photos to set a profile picture.');
        return;
      }

      // Let user pick an image
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
      // Structure the path according to RLS policies - put user ID in the path
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

      // Update the avatar_url in the profiles table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        Alert.alert('Update Error', 'There was a problem updating your profile.');
        setUploading(false);
        return;
      }

      // Update local state
      setProfile(prev => prev ? { ...prev, avatar_url: urlData.publicUrl } : null);
      Alert.alert('Success', 'Your profile picture has been updated!');
    } catch (error) {
      console.error('Error in profile picture change:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateMaxDistance = async () => {
    if (!user) {
      console.error('No user found, cannot update max distance');
      Alert.alert('Error', 'You must be logged in to update preferences.');
      return;
    }
    
    
    try {
      setUpdatingDistance(true);
      
      // Update the maxdistance value in the profile
      const { error } = await supabase
        .from('profiles')
        .update({ maxdistance: maxDistance.toString() })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      // Update local profile state
      setProfile(prev => {
        if (!prev) return null;
        return { ...prev, maxdistance: maxDistance.toString() };
      });
      
      setShowMaxDistanceModal(false);
      Alert.alert('Success', 'Your search radius has been updated.');
    } catch (error) {
      console.error('Error updating max distance:', error);
      Alert.alert('Error', 'Failed to update your search radius. Please try again.');
    } finally {
      setUpdatingDistance(false);
    }
  };

  // Handle toggling notifications preference
  const toggleNotifications = async () => {
    if (!user) return;
    
    try {
      setUpdatingNotifications(true);
      const newValue = !notificationsEnabled;
      
      // If enabling notifications, request permission and get token
      let token = null;
      if (newValue) {
        // Register for push notifications and get token
        token = await registerForPushNotificationsAsync();
        
        // If token couldn't be obtained, show an alert but continue
        if (!token) {
          console.log('No push token obtained');
          Alert.alert(
            'Notification Permission',
            'We weren\'t able to get permission for notifications. You can enable them in your device settings.',
            [{ text: 'OK' }]
          );
          // We'll still update the preference in case permissions are granted later
        }
      }
      
      // Update the notifications_enabled value in Supabase
      await updatePushTokenInSupabase(token, user.id, newValue);
      
      // Update local state
      setNotificationsEnabled(newValue);
      setProfile(prev => {
        if (!prev) return null;
        return { ...prev, notifications_enabled: newValue };
      });
      
      // Show feedback to user
      Alert.alert(
        'Notifications ' + (newValue ? 'Enabled' : 'Disabled'),
        newValue ? 
          'You will now receive notifications for new messages and booking updates.' : 
          'You will no longer receive notifications from this app.'
      );
    } catch (error) {
      console.error('Error updating notification settings:', error);
      Alert.alert('Error', 'Failed to update notification settings. Please try again.');
    } finally {
      setUpdatingNotifications(false);
    }
  };

  const handleProfileUpdated = () => {
    // Reload the profile data when it's updated
    if (!user) return;
    
    setIsLoading(true);
    async function loadProfile() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*, pets(*)')
          .eq('id', user?.id)
          .single();

        if (error) throw error;
        setProfile(data);
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadProfile();
  };

  if (isLoading || uploading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#63C7B8" />
        {uploading && <Text style={styles.loadingText}>Uploading your picture...</Text>}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <ScrollView style={[styles.scrollView, styles.container]}>
        {/* Profile Overview Section */}
        <View style={styles.profileOverview}>
          <TouchableOpacity 
            style={styles.profileImageContainer}
            onPress={handleChangeProfilePicture}
          >
            {profile?.avatar_url ? (
              <React.Fragment>
                <View style={styles.profileImage}>
                  <Image 
                    source={{ uri: profile.avatar_url }} 
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: 40
                    }} 
                  />
                </View>
                <View style={styles.cameraButton}>
                  <Camera size={14} color="#FFFFFF" />
                </View>
              </React.Fragment>
            ) : (
              <React.Fragment>
                <View style={styles.profileImage}>
                  <User size={36} color="#63C7B8" />
                </View>
                <View style={styles.cameraButton}>
                  <Camera size={14} color="#FFFFFF" />
                </View>
              </React.Fragment>
            )}
          </TouchableOpacity>
          <Text style={styles.profileName}>{profile?.name || user?.email || 'User'}</Text>
          <Text style={styles.profileEmail}>{user?.email || ''}</Text>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => setShowEditProfileModal(true)}
          >
            <View style={styles.settingIconContainer}>
              <User size={20} color="#63C7B8" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>My Profile</Text>
              <Text style={styles.settingDescription}>Edit your personal details</Text>
            </View>
            <ChevronRight size={20} color="#8E8E93" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={navigateToAddressManager}
          >
            <View style={styles.settingIconContainer}>
              <MapPin size={20} color="#63C7B8" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Address</Text>
              <Text style={styles.settingDescription}>
                {/* Check for primary address in the future */}
                Add your address
              </Text>
            </View>
            <ChevronRight size={20} color="#8E8E93" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={navigateToPetsManager}
          >
            <View style={styles.settingIconContainer}>
              <DogIcon size={20} color="#63C7B8" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>My Pets</Text>
              <Text style={styles.settingDescription}>Manage your registered pets</Text>
            </View>
            <ChevronRight size={20} color="#8E8E93" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={navigateToFavorites}
          >
            <View style={styles.settingIconContainer}>
              <Heart size={20} color="#63C7B8" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Favorite Sitters</Text>
              <Text style={styles.settingDescription}>View and manage your saved sitters</Text>
            </View>
            <ChevronRight size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>
        
        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <View style={styles.settingItemWithSwitch}>
            <View style={styles.settingIconContainer}>
              <Bell size={20} color="#63C7B8" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Notifications</Text>
              <Text style={styles.settingDescription}>Receive app notifications</Text>
            </View>
            {updatingNotifications ? (
              <ActivityIndicator size="small" color="#63C7B8" />
            ) : (
              <Switch
                value={notificationsEnabled}
                onValueChange={toggleNotifications}
                trackColor={{ false: '#D1D1D6', true: '#A8DEDA' }}
                thumbColor={notificationsEnabled ? '#62C6B9' : '#F4F3F4'}
                disabled={updatingNotifications}
              />
            )}
          </View>

          <View style={styles.settingItemWithSwitch}>
            <View style={styles.settingIconContainer}>
              <MapPin size={20} color="#63C7B8" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Location Services</Text>
              <Text style={styles.settingDescription}>Enable location for better matches</Text>
            </View>
            <Switch
              value={locationEnabled}
              onValueChange={() => setLocationEnabled(!locationEnabled)}
              trackColor={{ false: '#D1D1D6', true: '#A8DEDA' }}
              thumbColor={locationEnabled ? '#62C6B9' : '#F4F3F4'}
            />
          </View>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => setShowMaxDistanceModal(true)}
          >
            <View style={styles.settingIconContainer}>
              <Ruler size={20} color="#63C7B8" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Maximum Distance</Text>
              <Text style={styles.settingDescription}>
                {profile?.maxdistance ? `${profile.maxdistance} miles` : 'Set your preferred search radius'}
              </Text>
            </View>
            <ChevronRight size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>
        
        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingIconContainer}>
              <HelpCircle size={20} color="#63C7B8" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Help Center</Text>
              <Text style={styles.settingDescription}>Get help with the app</Text>
            </View>
            <ChevronRight size={20} color="#8E8E93" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingIconContainer}>
              <Shield size={20} color="#63C7B8" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Privacy Policy</Text>
              <Text style={styles.settingDescription}>Read our privacy policy</Text>
            </View>
            <ChevronRight size={20} color="#8E8E93" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingIconContainer}>
              <Settings size={20} color="#63C7B8" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Terms of Service</Text>
              <Text style={styles.settingDescription}>Read our terms of service</Text>
            </View>
            <ChevronRight size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={() => {
            Alert.alert(
              'Logout',
              'Are you sure you want to log out?',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
                {
                  text: 'Logout',
                  onPress: logout,
                  style: 'destructive',
                },
              ]
            );
          }}
        >
          <LogOut size={18} color="#D32F2F" style={{ marginRight: 10 }} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
        
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </ScrollView>

      {/* Max Distance Modal */}
      <Modal
        visible={showMaxDistanceModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Maximum Distance</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowMaxDistanceModal(false)}
              >
                <X size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.sliderValue}>{maxDistance} miles</Text>
            
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={50}
              step={1}
              value={maxDistance}
              onValueChange={setMaxDistance}
              minimumTrackTintColor="#63C7B8"
              maximumTrackTintColor="#D1D1D6"
              thumbTintColor="#63C7B8"
            />
            
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>1</Text>
              <Text style={styles.sliderLabel}>25</Text>
              <Text style={styles.sliderLabel}>50</Text>
            </View>
            
            <Text style={styles.modalDescription}>
              Set the maximum distance (in miles) that you're willing to travel or search for pet sitters.
            </Text>
            
            <TouchableOpacity 
              style={[
                styles.updateButton,
                updatingDistance && styles.disabledButton
              ]}
              onPress={handleUpdateMaxDistance}
              disabled={updatingDistance}
            >
              {updatingDistance ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.updateButtonText}>Update Preference</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Account Edit Modal */}
      <AccountEditModal
        visible={showEditProfileModal}
        onClose={() => setShowEditProfileModal(false)}
        onProfileUpdated={handleProfileUpdated}
      />
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#63C7B8',
  },
  profileOverview: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  profileImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
    position: 'relative',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#63C7B8',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(99, 199, 184, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingItemWithSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#8E8E93',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#D32F2F',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  versionText: {
    fontSize: 14,
    color: '#8E8E93',
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
    padding: 24,
    width: '100%',
    maxWidth: 400,
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
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  sliderValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#63C7B8',
    textAlign: 'center',
    marginBottom: 20,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  sliderLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  modalDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  updateButton: {
    backgroundColor: '#63C7B8',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});