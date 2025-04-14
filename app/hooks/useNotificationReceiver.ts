import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';

// Set up notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationData {
  threadId?: string;
  messageId?: string;
  bookingId?: string;
  type?: string;
  status?: string;
  reviewId?: string;
}

export default function useNotificationReceiver() {
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  const { user } = useAuthStore();
  const router = useRouter();
  
  // Subscribe to notifications from the database
  const subscribeToRealTimeNotifications = () => {
    if (!user) return;
    
    const channel = supabase
      .channel('public:notifications')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${user.id}` },
        (payload) => {
          console.log('New notification received:', payload);
          
          // We don't need to do anything here since the Edge Function
          // will send a push notification if the user has a token
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  };
  
  // Handle notification response (when user taps a notification)
  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data as NotificationData;
    console.log('Notification response:', data);
    
    // Navigate based on notification type
    if (data.threadId) {
      // Message notification
      router.push(`/conversation/${data.threadId}`);
    } else if (data.bookingId && data.type) {
      // Booking notification
      router.push(`/bookings/${data.bookingId}?type=${data.type}`);
    } else if (data.reviewId) {
      // Review notification
      router.push(`/reviews/${data.reviewId}`);
    }
  };
  
  useEffect(() => {
    // Set up notification listeners
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    );
    
    // Subscribe to real-time notifications
    const unsubscribe = subscribeToRealTimeNotifications();
    
    // Update push token in database if needed
    const updatePushToken = async () => {
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
        });
        console.log('Successfully retrieved push token:', tokenData);
        if (tokenData && user) {
          const token = tokenData.data;
          console.log('Updating push token in Supabase for user:', user.id);
          const { error } = await supabase
            .from('profiles')
            .update({ expo_push_token: token })
            .eq('id', user.id);
            
          if (error) {
            console.error('Error updating push token in Supabase:', error.message, error.details, error.hint);
          } else {
            console.log('Successfully updated push token in Supabase');
          }
        }
      } catch (error: any) {
        console.error('Error getting push token:', error.message, error.stack);
      }
    };
    
    // Only update token if we have permission
    Notifications.getPermissionsAsync().then(({ status }) => {
      if (status === 'granted') updatePushToken();
    });
    
    // Clean up listeners on unmount
    return () => {
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (unsubscribe) unsubscribe();
    };
  }, [user]);
  
  return null; // This hook doesn't expose any values
}
