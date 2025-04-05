import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert, Platform } from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { Star, MapPin, Heart } from 'lucide-react-native';
import { Sitter } from '../types';
import { supabase } from '../../../../lib/supabase';
import { useAuthStore } from '../../../../stores/authStore';
import * as Location from 'expo-location';

interface NearbySittersProps {
  favorites: string[];
  onSitterPress?: (sitter: Sitter) => void;
  onToggleFavorite?: (id: string) => void;
  animationDelay?: number;
  maxDistance?: number;
}

// Function to calculate distance between two points using Haversine formula
const calculateDistance = (
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number => {
  const R = 3958.8; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return parseFloat(distance.toFixed(1)); // Return distance with 1 decimal place
};

export function NearbySitters({ 
  favorites, 
  onSitterPress = () => {}, 
  onToggleFavorite = () => {},
  animationDelay = 400,
  maxDistance
}: NearbySittersProps) {
  const [sitters, setSitters] = useState<Sitter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  // Use the user's maxDistance preference if no explicit maxDistance prop is provided
  const effectiveMaxDistance = maxDistance || (user ? user.maxDistance : 50);

  useEffect(() => {
    const fetchNearbySitters = async () => {
      
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Variables to store location info (either from database or device)
        let userLat: number = 0;
        let userLon: number = 0;
        let locationSource: string = 'unknown';
        
        // Step 1: Try to get user's primary address from the database
        const { data: userAddress, error: userAddressError } = await supabase
          .from('addresses')
          .select('*')
          .eq('profile_id', user.id)
          .eq('is_primary', true);
        
        
        // If no address found in addresses table, try useraddress table
        let primaryAddress = null;
        if (!userAddressError && userAddress && userAddress.length > 0) {
          primaryAddress = userAddress[0];
        } else {
          const { data: userAddressAlt, error: userAddressAltError } = await supabase
            .from('useraddress')
            .select('*')
            .eq('profile_id', user.id)
            .eq('is_primary', true);
            
          
          if (!userAddressAltError && userAddressAlt && userAddressAlt.length > 0) {
            primaryAddress = userAddressAlt[0];
          }
        }
        
        // Now use primaryAddress if found in either table
        if (primaryAddress) {
          userLat = parseFloat(primaryAddress.latitude.toString());
          userLon = parseFloat(primaryAddress.longitude.toString());
          locationSource = 'database';
          

        } else {
          // No address in either table, fall back to device location
          
          // Request location permissions
          const { status } = await Location.requestForegroundPermissionsAsync();
          
          if (status !== 'granted') {
            setSitters([]);
            setError('Location permission is required to see nearby sitters');
            setLoading(false);
            return;
          }
          
          // Get current location
          try {
            const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            
            // Check if the location is reasonable - avoid using test/simulator coordinates
            // These coordinates are around Silicon Valley/Mountain View
            const isCalifornia = 
              location.coords.latitude > 36 && location.coords.latitude < 38 && 
              location.coords.longitude < -121 && location.coords.longitude > -123;
              
            if (isCalifornia) {

              userLat = 26.4563242; // Delray Beach coordinates
              userLon = -80.0955221;
              locationSource = 'default';
            } else {
              userLat = location.coords.latitude;
              userLon = location.coords.longitude;
              locationSource = 'device';
            }
            
          } catch (locationError) {
            // Add default location in Florida as fallback instead of showing error
            userLat = 26.4563242; // Delray Beach coordinates
            userLon = -80.0955221;
            locationSource = 'default';
            setSitters([]);
            setError('Unable to determine your location. Using default location.');
          }
        }
        
        // SIMPLIFIED APPROACH: Get sitters and addresses in two separate queries
        // and manually join them
        
        // Step 2: Get all sitters
        const { data: allSitters, error: allSittersError } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'sitter');
          
        
        if (allSittersError) {
          console.error('Error fetching sitters:', allSittersError);
          throw allSittersError;
        }
        
        // If no sitters in database, use mock data
        if (!allSitters || allSitters.length === 0) {
          const { sitters } = require('../data');
          setSitters(sitters);
          setLoading(false);
          return;
        }
        
          
        if (allSittersError) {
          console.error('Error fetching sitters:', allSittersError);
          throw allSittersError;
        }
        
        
        // Step 4: Manually join sitters with their addresses
        const sittersWithAddresses = [];
        
        for (const sitter of allSitters || []) {
          // Skip if sitter is the current user
          if (sitter.id === user.id) {
            continue;
          }
          
          // Query specifically for this sitter's address
          const { data: sitterAddresses, error: addressError } = await supabase
              .from('addresses')
              .select('*')
              .eq('profile_id', sitter.id)
              .eq('is_primary', true);
              

          if (addressError) {
            continue;
          }
            
          
          // Process if we found an address
          const sitterAddress = sitterAddresses && sitterAddresses.length > 0 ? sitterAddresses[0] : null;
          
          if (sitterAddress) {
            
            const distance = calculateDistance(
              userLat,
              userLon,
              parseFloat(sitterAddress.latitude),
              parseFloat(sitterAddress.longitude)
            );
            
            
            // Add to our results if within distance
            if (distance <= effectiveMaxDistance) {
              sittersWithAddresses.push({
                id: sitter.id,
                name: sitter.name || 'Unknown Sitter',
                rating: 4.8, // Default or fetch from reviews table
                reviews: 24, // Default or fetch from reviews table
                distance,
                price: 35, // Default or fetch from pricing table
                image: sitter.avatar_url || 'https://via.placeholder.com/150',
                verified: true // Default or fetch from verification table
              });
            } else {
            }
          } 
        }
        
        // Sort by distance
        const nearbySitters = sittersWithAddresses.sort((a, b) => a.distance - b.distance);
        

        
        setSitters(nearbySitters);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchNearbySitters();
  }, [user, effectiveMaxDistance]);
  return (
    <Animated.View entering={FadeInDown.delay(animationDelay).duration(600)}>
      <View style={styles.nearbyContainer}>
        <Text style={styles.sectionTitle}>Nearby Sitters</Text>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#63C7B8" />
          </View>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : sitters.length === 0 ? (
          <Text style={styles.emptyText}>
            {error || `No sitters found within ${effectiveMaxDistance} miles of your location.`}
          </Text>
        ) : sitters.map((sitter, index) => (
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
                  <Text style={styles.locationText}>{sitter.distance} miles away</Text>
                </View>
                <Text style={styles.priceText}>${sitter.price}/night</Text>
              </View>
              <TouchableOpacity 
                style={styles.favoriteButton}
                onPress={() => onToggleFavorite(sitter.id)}
              >
                <Heart 
                  size={20} 
                  color={favorites.includes(sitter.id) ? "#FF3B30" : "#8E8E93"} 
                  fill={favorites.includes(sitter.id) ? "#FF3B30" : "transparent"} 
                />
              </TouchableOpacity>
            </TouchableOpacity>
          </Animated.View>
        ))}
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
  priceText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#63C7B8',
  },
  favoriteButton: {
    padding: 8,
    position: 'absolute',
    top: 8,
    right: 8,
  },
}); 