import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { UserProfile } from '../features/profile/types';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import {
  ProfileHeader,
  ProfileCard,
  DogsList,
  AccountSettings,
  SupportSection,
  LogoutButton,
  AddressManager
} from '../features/profile/components';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const { user, logout } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'account' | 'addresses' | 'pets'>('account');

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;

      try {
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

  if (isLoading || uploading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#007AFF" />
        {uploading && <Text style={styles.loadingText}>Uploading your picture...</Text>}
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingTop: insets.top }
      ]}
    >
      <ProfileHeader 
        name={profile?.name || user?.email || 'User'} 
        email={user?.email || ''} 
        avatarUrl={profile?.avatar_url}
      />

      <View style={styles.tabContainer}>
        <Text 
          style={[styles.tabText, activeTab === 'account' && styles.activeTabText]}
          onPress={() => setActiveTab('account')}
        >
          Account
        </Text>
        <Text 
          style={[styles.tabText, activeTab === 'addresses' && styles.activeTabText]}
          onPress={() => setActiveTab('addresses')}
        >
          Addresses
        </Text>
        <Text 
          style={[styles.tabText, activeTab === 'pets' && styles.activeTabText]}
          onPress={() => setActiveTab('pets')}
        >
          Pets
        </Text>
      </View>

      {activeTab === 'account' && (
        <>
          <ProfileCard 
            profile={profile} 
            user={user} 
            onChangePhoto={handleChangeProfilePicture} 
          />
          <AccountSettings 
            notificationsEnabled={notificationsEnabled}
            locationEnabled={locationEnabled}
            onToggleNotifications={() => setNotificationsEnabled(!notificationsEnabled)}
            onToggleLocation={() => setLocationEnabled(!locationEnabled)}
          />
          <SupportSection />
          <LogoutButton onLogout={logout} />
        </>
      )}

      {activeTab === 'addresses' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Addresses</Text>
          <Text style={styles.sectionDescription}>
            Manage your addresses for service bookings and pet care.
          </Text>
          <AddressManager />
        </View>
      )}

      {activeTab === 'pets' && (
        <DogsList pets={profile?.pets || []} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
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
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginVertical: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '500',
    color: '#63C7B8',
  },
  activeTabText: {
    color: '#63C7B8',
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
});