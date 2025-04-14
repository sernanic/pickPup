import { create } from 'zustand';
import { supabase } from '../../app/lib/supabase';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync } from '../../utils/notifications';
import { useAuthStore } from './authStore';

export interface Notification {
  id: string;
  recipient_id: string;
  type: 'message' | 'booking_request' | 'booking_status' | 'review';
  title: string;
  body: string;
  data?: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  setupNotifications: () => Promise<void>;
  subscribeToNotifications: () => void;
  unsubscribeFromNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  fetchNotifications: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    set({ isLoading: true, error: null });
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const unreadCount = data?.filter(n => !n.is_read).length || 0;
      
      set({
        notifications: data || [],
        unreadCount,
        isLoading: false
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      set({ 
        error: 'Failed to fetch notifications',
        isLoading: false
      });
    }
  },

  markAsRead: async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      // Update local state
      set(state => {
        const updatedNotifications = state.notifications.map(n =>
          n.id === notificationId ? { ...n, is_read: true } : n
        );
        
        return {
          notifications: updatedNotifications,
          unreadCount: state.unreadCount > 0 ? state.unreadCount - 1 : 0
        };
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  },

  markAllAsRead: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      // Update local state
      set(state => ({
        notifications: state.notifications.map(n => ({ ...n, is_read: true })),
        unreadCount: 0
      }));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  },

  setupNotifications: async () => {
    try {
      // Request notification permissions and register for push notifications
      const token = await registerForPushNotificationsAsync();
      
      if (token) {
        const user = useAuthStore.getState().user;
        if (user) {
          // Save token to user profile
          const { error } = await supabase
            .from('profiles')
            .update({ expo_push_token: token })
            .eq('id', user.id);

          if (error) throw error;
        }
      }

      // Set up notification handler
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      // Initialize subscription to notifications channel
      get().subscribeToNotifications();
      
      // Fetch initial notifications
      await get().fetchNotifications();
    } catch (error) {
      console.error('Error setting up notifications:', error);
    }
  },

  subscribeToNotifications: () => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    // Subscribe to real-time notifications
    const subscription = supabase
      .channel('public:notifications')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${user.id}` },
        async (payload) => {
          console.log('New notification received:', payload);
          // Refresh the notifications list
          await get().fetchNotifications();
        }
      )
      .subscribe();
  },

  unsubscribeFromNotifications: () => {
    supabase.removeAllChannels();
  }
}));
