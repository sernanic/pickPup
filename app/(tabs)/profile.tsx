import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { UserProfile } from '../features/profile/types';
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

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#007AFF" />
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
          <ProfileCard profile={profile} user={user} />
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