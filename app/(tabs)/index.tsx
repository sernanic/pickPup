import { useState, useRef } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { 
  Header, 
  SearchBar, 
  ServicesList, 
  FeaturedSitters, 
  NearbySitters 
} from '../features/home/components';
import { services, sitters, featuredSitters } from '../features/home/data';
import { Service, Sitter, FeaturedSitter } from '../features/home/types';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [favorites, setFavorites] = useState<string[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const router = useRouter();

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
        userName="Alex" 
        hasNotifications={true}
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
        sitters={sitters} 
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