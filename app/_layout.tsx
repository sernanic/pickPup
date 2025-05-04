import { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './providers/AuthProvider';
import { useAuthStore } from './stores/authStore';
import { View, Text } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { StripeProvider } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync, updatePushTokenInSupabase } from '../services/notificationService';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// --- Notification Handlers (Outside Component) ---

// Handle notifications that arrive while the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, // Show alert even if app is open
    shouldPlaySound: true, // Play sound for foreground notifications
    shouldSetBadge: true, // Update badge count
  }),
});

// --- End Notification Handlers ---

// Hook to handle notification interactions (taps)
function useNotificationObserver() {
  const router = useRouter(); // Use router from expo-router

  useEffect(() => {
    let isMounted = true;

    function redirect(notification: Notifications.Notification) {
      const data = notification.request.content.data;
      console.log('Notification data received:', data);

      // Check if threadId exists in the data payload
      if (data && typeof data === 'object' && 'threadId' in data && data.threadId) {
        const threadId = data.threadId as string;
        console.log(`Redirecting to conversation: /conversation/${threadId}`);
        // Use router.push for navigation
        router.push(`/conversation/${threadId}`);
      } else {
        console.log('Notification tapped, but no threadId found in data.');
        // Optionally navigate to a default screen like messages list
        // router.push('/(tabs)/messages'); 
      }
    }

    // Listener for when a user taps on a notification (app foregrounded, backgrounded, or killed)
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      if (isMounted) {
        redirect(response.notification);
      }
    });

    // Listener for notifications received while the app is foregrounded (optional, handled by setNotificationHandler)
    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Foreground notification received:', notification);
      // You could potentially update UI here if needed, but the handler above controls the alert/badge
    });

    return () => {
      isMounted = false;
      subscription.remove();
      foregroundSubscription.remove();
    };
  }, [router]); // Add router dependency
}

export default function RootLayout() {
  const { user, loadUser, isLoading, initialized, error } = useAuthStore();
  const [splashHidden, setSplashHidden] = useState(false);
  const router = useRouter();

  // Call the notification observer hook
  useNotificationObserver();

  useEffect(() => {
    async function init() {
      try {
        // Load user data from persistent storage
        await loadUser();
        
        // Initialize notification system
      } catch (e) {
        console.error('Error loading user:', e);
      } finally {
        try {
          // Hide splash screen after auth is initialized
          await SplashScreen.hideAsync();
          setSplashHidden(true);
        } catch (e) {
          // Sometimes hideAsync can fail if splash was already hidden
          console.warn('Error hiding splash screen:', e);
          setSplashHidden(true);
        }
      }
    }

    init();
  }, []);

  useEffect(() => {
    if (initialized && user) {
      console.log('RootLayout: User authenticated (user exists), initializing notifications...');

      // User is authenticated and user data is available
      console.log('RootLayout: Authenticated, registering for push notifications...');
      registerForPushNotificationsAsync()
        .then(token => {
          if (token) {
            // Update Supabase with the token and enable notifications
            console.log('RootLayout: Got push token, updating Supabase.');
            updatePushTokenInSupabase(token, user.id, true); 
          } else {
            // Failed to get token (permissions denied or other error)
            // updatePushTokenInSupabase was likely called with false inside register function
            console.log('RootLayout: Failed to get push token.');
          }
        })
        .catch(error => {
          console.error('RootLayout: Error during push notification registration:', error);
          // Optionally update Supabase to disable notifications on error
          // updatePushTokenInSupabase(null, user.id, false); 
        });
    }
  }, [initialized, user]);

  useEffect(() => {
    if (initialized && user) {
      console.log('RootLayout: User authenticated (user exists), initializing notifications...');

      const subscription = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('Notification response received:', response);
        const data = response.notification.request.content.data;
        const threadId = data?.thread_id ?? data?.threadId;
        if (threadId) {
          console.log(`Notification tap: Navigating to /conversation/${threadId}`);
          router.push(`/conversation/${threadId}`);
        } else {
          console.log('Notification tap: No threadId found in data.', data);
        }
      });

      return () => {
        console.log('RootLayout: Removing notification listener.');
        subscription.remove();
      };
    }
  }, [initialized, user, router]);

  if (!splashHidden) {
    return null;
  }

  return (
    <AuthProvider>
      <StripeProvider 
        publishableKey={Constants.expoConfig?.extra?.stripePublishableKey || ''}
        merchantIdentifier="merchant.com.dogsitter">
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" options={{ title: 'Oops!' }} />
        </Stack>
        <StatusBar style="auto" />
      </StripeProvider>
    </AuthProvider>
  );
}