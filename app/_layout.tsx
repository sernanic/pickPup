import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../providers/AuthProvider';
import { useAuthStore } from '../stores/authStore';
import { View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { StripeProvider } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { loadUser, isLoading } = useAuthStore();

  useEffect(() => {
    async function init() {
      try {
        await loadUser();
      } catch (e) {
        console.error('Error loading user:', e);
      } finally {
        await SplashScreen.hideAsync();
      }
    }

    init();
  }, []);

  if (isLoading) {
    return null; // Or a loading component
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