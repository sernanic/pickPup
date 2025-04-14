import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Star, MapPin, Heart } from 'lucide-react-native';
import { router } from 'expo-router';
import { useFavoriteStore, Favorite } from '../../stores/favoriteStore';
import { useSitterStore, Sitter } from '../../stores/sitterStore';
import Animated, { FadeInDown } from 'react-native-reanimated';

// Create a simpler type for displaying sitters
interface DisplaySitter {
  id: string;
  name: string;
  image: string;
  rating?: number;
  reviews?: number;
  distance?: number;
  price?: number;
  priceLabel?: string;
}

// Type to represent an enriched favorite with display information
interface EnrichedFavorite {
  id: string;
  ownerId: string;
  sitterId: string;
  createdAt: string;
  sitter: DisplaySitter;
}

export default function FavoritesScreen() {
  const { favorites, fetchFavorites, isLoading, toggleFavorite } = useFavoriteStore();
  const { getSitterById } = useSitterStore();
  const [favoriteSitters, setFavoriteSitters] = useState<EnrichedFavorite[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadFavorites();
  }, []);

  // Update sitter details when favorites change
  useEffect(() => {
    enrichSitterData();
  }, [favorites]);

  const loadFavorites = async () => {
    setRefreshing(true);
    await fetchFavorites();
    setRefreshing(false);
  };

  const enrichSitterData = async () => {
    // Enrich the favorites with full sitter details from the sitter store
    const enrichedFavorites = await Promise.all(
      favorites.map(async (favorite) => {
        // Try to get sitter from the store first
        const sitter = getSitterById(favorite.sitter_id);
        
        // Get profile info from the joined data - use first profile if available
        const profile = favorite.profiles && favorite.profiles.length > 0 ? favorite.profiles[0] : null;
        const profileName = profile?.name;
        const profileImage = profile?.avatar_url;
        
        // Create a display sitter with the available information
        const displaySitter: DisplaySitter = {
          id: favorite.sitter_id,
          name: sitter?.name || profileName || 'Unknown Sitter',
          image: sitter?.image || profileImage || 'https://via.placeholder.com/60',
          rating: sitter?.rating,
          reviews: sitter?.reviews,
          distance: sitter?.distance,
          price: sitter?.price,
          priceLabel: sitter?.priceLabel
        };
        
        // Return the enriched favorite
        return {
          id: favorite.id,
          ownerId: favorite.owner_id,
          sitterId: favorite.sitter_id,
          createdAt: favorite.created_at,
          sitter: displaySitter
        };
      })
    );
    
    setFavoriteSitters(enrichedFavorites);
  };

  const handleToggleFavorite = async (sitterId: string) => {
    await toggleFavorite(sitterId);
  };

  const navigateToSitterProfile = (sitterId: string) => {
    router.push(`/sitter/${sitterId}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Favorite Sitters</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading || refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#63C7B8" />
          <Text style={styles.loadingText}>Loading your favorites...</Text>
        </View>
      ) : (
        <FlatList
          data={favoriteSitters}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.favoritesList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Heart size={48} color="#E0E0E0" />
              <Text style={styles.emptyTitle}>No favorites yet</Text>
              <Text style={styles.emptyText}>
                Add sitters to your favorites by tapping the heart icon on any sitter's profile.
              </Text>
              <TouchableOpacity 
                style={styles.exploreButton}
                onPress={() => router.push('/search')}
              >
                <Text style={styles.exploreButtonText}>Find Sitters</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeInDown.delay(index * 100).duration(400)}
            >
              <TouchableOpacity 
                style={styles.favoriteCard}
                onPress={() => navigateToSitterProfile(item.sitterId)}
              >
                {item.sitter.image && (
                  <Image 
                    source={{ uri: item.sitter.image }} 
                    style={styles.sitterImage} 
                  />
                )}
                <View style={styles.sitterInfo}>
                  <Text style={styles.sitterName}>{item.sitter.name}</Text>
                  
                  {item.sitter.rating && (
                    <View style={styles.ratingContainer}>
                      <Star size={16} color="#FFD700" fill="#FFD700" />
                      <Text style={styles.ratingText}>{item.sitter.rating}</Text>
                      {item.sitter.reviews && (
                        <Text style={styles.reviewsText}>({item.sitter.reviews} reviews)</Text>
                      )}
                    </View>
                  )}
                  
                  {item.sitter.distance && (
                    <View style={styles.locationContainer}>
                      <MapPin size={14} color="#8E8E93" />
                      <Text style={styles.locationText}>
                        {item.sitter.distance} miles away
                      </Text>
                    </View>
                  )}
                  
                  {item.sitter.price && (
                    <View style={styles.priceContainer}>
                      <Text style={styles.priceText}>
                        ${item.sitter.price}
                        <Text style={styles.priceUnit}>{item.sitter.priceLabel || '/night'}</Text>
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity 
                  style={styles.favoriteButton}
                  onPress={() => handleToggleFavorite(item.sitterId)}
                >
                  <Heart size={24} color="#FF3B30" fill="#FF3B30" />
                </TouchableOpacity>
              </TouchableOpacity>
            </Animated.View>
          )}
          onRefresh={loadFavorites}
          refreshing={refreshing}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
    fontFamily: 'Poppins-Regular',
  },
  favoritesList: {
    padding: 16,
    paddingBottom: 100,
  },
  favoriteCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sitterImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  sitterInfo: {
    flex: 1,
  },
  sitterName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1A1A1A',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#1A1A1A',
    marginLeft: 4,
    marginRight: 4,
  },
  reviewsText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#8E8E93',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 4,
  },
  priceContainer: {
    marginTop: 2,
  },
  priceText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#63C7B8',
  },
  priceUnit: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#8E8E93',
  },
  favoriteButton: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: '#63C7B8',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  exploreButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
}); 