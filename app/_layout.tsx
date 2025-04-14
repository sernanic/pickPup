import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './providers/AuthProvider';
import { useAuthStore } from './stores/authStore';
import useNotificationReceiver from './hooks/useNotificationReceiver';
import { View, Text } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { StripeProvider } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { loadUser, isLoading, initialized, error } = useAuthStore();
  const [splashHidden, setSplashHidden] = useState(false);
  
  // Initialize notification receiver
  useNotificationReceiver();

  useEffect(() => {
    async function init() {
      try {
        // Load user data from persistent storage
        await loadUser();
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

  // Don't render anything until the splash screen is hidden
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