import { useState, useRef, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { 
  Header, 
  SearchBar, 
  ServicesList, 
  FeaturedSitters, 
  NearbySitters 
} from '../features/home/components';
import { services, featuredSitters } from '../features/home/data';
import { Service, Sitter, FeaturedSitter } from '../features/home/types';
import { useAuthStore } from '../../stores/authStore';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<ScrollView>(null);
  const router = useRouter();
  const { user } = useAuthStore();
  
  // Simulate a loading state to ensure auth data is ready
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  const toggleFavorite = (id: string) => {
    if (favorites.includes(id)) {
      setFavorites(favorites.filter(item => item !== id));
    } else {
      setFavorites([...favorites, id]);
    }
  };

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

  const handleFeaturedSitterPress = (sitter: FeaturedSitter) => {
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
        featuredSitters={featuredSitters} 
        onSitterPress={handleFeaturedSitterPress} 
        animationDelay={300}
      />

      <NearbySitters 
        favorites={favorites} 
        onSitterPress={handleNearbySitterPress} 
        onToggleFavorite={toggleFavorite} 
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