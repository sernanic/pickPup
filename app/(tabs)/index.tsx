import { useState, useRef, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { 
  Header, 
  SearchBar, 
  ServicesList 
} from '../features/home/components';
import { FeaturedSitters } from '../features/home/components/FeaturedSitters';
import { NearbySitters } from '../features/home/components/NearbySitters';
import { services } from '../features/home/data';
import { Service, Sitter } from '../features/home/types';
import { useAuthStore } from '../../stores/authStore';
import { useSitterStore } from '../../stores/sitterStore';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  const { fetchSitters } = useSitterStore();
  const scrollRef = useRef<ScrollView>(null);
  const router = useRouter();
  const { user } = useAuthStore();
  
  // Fetch sitters data once when component mounts
  useEffect(() => {
    fetchSitters();
  }, []);



  const handleSearchPress = () => {
    // Implement search functionality
  };

  const handleServicePress = (service: Service) => {
    // Navigate to search screen with service filter
    router.push({
      pathname: "/(tabs)/search",
      params: { serviceType: service.title }
    });
  };

  const handleFeaturedSitterPress = (sitter: any) => {
    router.push(`/sitter/${sitter.id}`);
  };

  const handleNearbySitterPress = (sitter: Sitter) => {
    router.push(`/sitter/${sitter.id}`);
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingTop: insets.top + 16 }
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Header 
        userName={user?.name || 'Pet Owner'} 
        hasNotifications={false}
      />

      <SearchBar 
        onPress={handleSearchPress} 
        placeholder="Find a trusted dog sitter" 
        animationDelay={100}
      />

      <ServicesList 
        services={services} 
        onServicePress={handleServicePress} 
        animationDelay={200}
      />

     <FeaturedSitters 
        onSitterPress={handleFeaturedSitterPress} 
        animationDelay={300}
      />

      <NearbySitters 
        onSitterPress={handleNearbySitterPress} 
        animationDelay={400}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
});