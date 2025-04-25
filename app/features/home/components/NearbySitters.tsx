import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { Star, MapPin, Heart } from 'lucide-react-native';
import { Sitter } from '../types';
import { useSitterStore } from '../../../stores/sitterStore';
import { useAuthStore } from '../../../stores/authStore';
import { useFavoriteStore } from '../../../stores/favoriteStore';

interface NearbySittersProps {
  onSitterPress?: (sitter: Sitter) => void;
  animationDelay?: number;
  maxDistance?: number; // Optional override for the user's maxDistance
}

export function NearbySitters({ 
  onSitterPress = () => {}, 
  animationDelay = 400,
  maxDistance
}: NearbySittersProps) {
  const { sitters, fetchSitters, isLoading, error, filterSitters } = useSitterStore();
  const { user } = useAuthStore();
  const { 
    favoriteIds, 
    fetchFavorites, 
    toggleFavorite, 
    isLoading: favoritesLoading 
  } = useFavoriteStore();
  
  // The effective max distance is either the prop value (if provided) or the user's preference
  const effectiveMaxDistance = maxDistance || (user ? user.maxDistance : 25);
  
  useEffect(() => {
    // Only fetch favorites when component mounts
    fetchFavorites();
    // No need to include fetchFavorites in the dependency array
    // as it should be a stable reference from the store
  }, []);
  
  // Apply distance filter only when distance preference changes
  useEffect(() => {
    // Only filter if we already have sitters loaded to avoid unnecessary calls
    if (sitters.length > 0 && !isLoading) {
      filterSitters({ 
        serviceTypes: [], 
        priceRanges: [], 
        maxDistance: effectiveMaxDistance 
      });
    }
  }, [effectiveMaxDistance]);
  
  // Use useMemo to sort sitters by distance instead of doing it in the render method
  const sortedSitters = useMemo(() => {
    return [...sitters].sort((a, b) => a.distance - b.distance);
  }, [sitters]);

  const handleToggleFavorite = async (sitterId: string) => {
    await toggleFavorite(sitterId);
  };

  return (
    <Animated.View entering={FadeInDown.delay(animationDelay).duration(600)}>
      <View style={styles.nearbyContainer}>
        <Text style={styles.sectionTitle}>Nearby Sitters{effectiveMaxDistance} mile radius </Text><Text></Text>
        {isLoading || favoritesLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#63C7B8" />
          </View>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : sitters.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyText}>
              No sitters found within {effectiveMaxDistance} miles of your location.
            </Text>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={() => fetchSitters()}
            >
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Use memoized sorted sitters array
          sortedSitters.map((sitter, index) => (
              <Animated.View 
                key={sitter.id}
                entering={FadeInRight.delay(index * 100).duration(500)}
              >
                <TouchableOpacity 
                  style={styles.sitterCard}
                  onPress={() => onSitterPress(sitter)}
                >
                  <Image source={{ uri: sitter.image }} style={styles.sitterImage} />
                  <View style={styles.sitterInfo}>
                    <View style={styles.sitterNameRow}>
                      <Text style={styles.sitterName}>{sitter.name}</Text>
                      {sitter.verified && (
                        <View style={styles.verifiedBadge}>
                          <Text style={styles.verifiedText}>Verified</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.ratingContainer}>
                      <Star size={16} color="#FFD700" fill="#FFD700" />
                      <Text style={styles.ratingText}>{sitter.rating}</Text>
                      <Text style={styles.reviewsText}>({sitter.reviews} reviews)</Text>
                    </View>
                    <View style={styles.locationContainer}>
                      <MapPin size={14} color="#8E8E93" />
                      <Text style={styles.locationText}>
                        <Text>{sitter.distance}</Text>
                        <Text> miles away</Text>
                      </Text>
                    </View>
                    
                    <View style={styles.priceContainer}>
                      <Text style={styles.priceText}>${sitter.price}<Text style={styles.priceUnit}>{sitter.priceLabel}</Text></Text>
                    </View>
                    
                    <View style={styles.servicesContainer}>
                      {sitter.services && sitter.services.length > 0 ? (
                        <>
                          {sitter.services.slice(0, 2).map((service, index) => (
                            <View key={index} style={styles.serviceTag}>
                              <Text style={styles.serviceTagText}>{service}</Text>
                            </View>
                          ))}
                          {sitter.services.length > 2 && (
                            <Text style={styles.moreServicesText}>+{sitter.services.length - 2} more</Text>
                          )}
                        </>
                      ) : (
                        <View style={styles.serviceTag}>
                          <Text style={styles.serviceTagText}>No services</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.favoriteButton}
                    onPress={() => handleToggleFavorite(sitter.id)}
                  >
                    <Heart 
                      size={20} 
                      color={favoriteIds.includes(sitter.id) ? "#FF3B30" : "#8E8E93"} 
                      fill={favoriteIds.includes(sitter.id) ? "#FF3B30" : "transparent"} 
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              </Animated.View>
            ))
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  nearbyContainer: {
    marginBottom: 24,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#FF3B30',
    textAlign: 'center',
    padding: 16,
  },
  emptyText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    padding: 16,
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1A1A1A',
    marginBottom: 16,
  },
  sitterCard: {
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
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  sitterInfo: {
    flex: 1,
  },
  sitterNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sitterName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1A1A1A',
    marginRight: 8,
  },
  verifiedBadge: {
    backgroundColor: '#E1F5FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 10,
    color: '#0288D1',
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
    marginBottom: 4,
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
    position: 'absolute',
    top: 8,
    right: 8,
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  serviceTag: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
    marginBottom: 4,
  },
  serviceTagText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 10,
    color: '#8E8E93',
  },
  moreServicesText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 10,
    color: '#63C7B8',
    marginLeft: 4,
  },
  emptyStateContainer: {
    padding: 24,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#63C7B8',
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
  },
}); 