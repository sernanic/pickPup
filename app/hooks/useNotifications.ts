import { useState, useEffect, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

type PermissionStatus = 'granted' | 'denied' | 'undetermined' | 'error';

export default function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('undetermined');
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const { user } = useAuthStore();

  // Configure notifications for iOS
  useEffect(() => {
    if (Platform.OS === 'ios') {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
    }
  }, []);

  // Check current permission status and token
  const checkNotificationStatus = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setNotificationsEnabled(status === 'granted');
      
      if (status === 'granted') {
        const token = await getExpoPushToken();
        if (token) {
          setExpoPushToken(token);
          await storeTokenInSupabase(token);
        }
      }
      
      return status;
    } catch (error) {
      console.error('Error checking notification status:', error);
      return 'error';
    }
  };

  // Request permissions and get token
  const requestPermissions = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
    
        },
      });

      setNotificationsEnabled(status === 'granted');

      if (status === 'granted') {
        const token = await getExpoPushToken();
        if (token) {
          setExpoPushToken(token);
          await storeTokenInSupabase(token);
        }
      }

      return status;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return 'error';
    }
  };

  // Get Expo push token
  const getExpoPushToken = async () => {
    try {
      const { data: token } = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PROJECT_ID, // Make sure this is set in your env
      });
      return token;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  };

  // Store token in Supabase
  const storeTokenInSupabase = async (token: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          expo_push_token: token,
          notifications_enabled: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      setNotificationsEnabled(true);
    } catch (error) {
      console.error('Error storing push token:', error);
      Alert.alert(
        'Error',
        'Failed to save notification preferences. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  // Clear token in Supabase
  const clearTokenInSupabase = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          expo_push_token: null,
          notifications_enabled: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      setNotificationsEnabled(false);
      setExpoPushToken(null);
    } catch (error) {
      console.error('Error clearing push token:', error);
      Alert.alert(
        'Error',
        'Failed to save notification preferences. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  // Handle permission modal response
  const handlePermissionRequest = useCallback(async () => {
    setShowPermissionModal(false);
    const status = await requestPermissions();
    if (status === 'denied') {
      Alert.alert(
        'Notifications Disabled',
        'To enable notifications, please go to your device settings and allow notifications for PickPup.',
        [{ text: 'OK' }]
      );
    }
  }, []);

  // Toggle notifications
  const toggleNotifications = async () => {
    if (notificationsEnabled) {
      // If turning off, clear the token
      await clearTokenInSupabase();
      setExpoPushToken(null);
      setNotificationsEnabled(false);
      setPermissionStatus('denied');
    } else {
      // If turning on, show permission modal first
      setShowPermissionModal(true);
    }
  };

  // Cancel permission request
  const cancelPermissionRequest = () => {
    setShowPermissionModal(false);
  };

  // Initial permission and token check
  useEffect(() => {
    if (user) {
      // Check current notification status
      checkNotificationStatus();
      
      // Get current profile data
      const fetchProfile = async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('notifications_enabled, expo_push_token')
            .eq('id', user.id)
            .single();

          if (error) throw error;

          if (data) {
            setNotificationsEnabled(data.notifications_enabled ?? false);
            setExpoPushToken(data.expo_push_token);
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
        }
      };

      fetchProfile();
    }
  }, [user]);

  return {
    notificationsEnabled,
    expoPushToken,
    permissionStatus,
    showPermissionModal,
    toggleNotifications,
    handlePermissionRequest,
    cancelPermissionRequest,
    checkNotificationStatus,
  };
}
