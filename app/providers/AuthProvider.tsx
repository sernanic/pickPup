import React, { useEffect } from 'react';
import { router, useSegments } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { View, ActivityIndicator, Text } from 'react-native';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading, error, initialized } = useAuthStore();
  const segments = useSegments();

  useEffect(() => {
    // Only run navigation logic after auth initialization is complete
    if (!initialized) return;
    
    const inAuthGroup = segments[0] === '(auth)';
    
    if (!user && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/login');
    } else if (user && inAuthGroup) {
      // Redirect to home if authenticated
      router.replace('/(tabs)');
    }
  }, [user, segments, initialized]);

  if (isLoading && !initialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#63C7B8" />
      </View>
    );
  }

  return <>{children}</>;
} 