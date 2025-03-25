import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { Star, MapPin, Heart } from 'lucide-react-native';
import { Sitter } from '../types';
import { supabase } from '../../../../lib/supabase';
import { useAuthStore } from '../../../../stores/authStore';

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
  maxDistance = 50 
}: NearbySittersProps) {
  const [sitters, setSitters] = useState<Sitter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    const fetchNearbySitters = async () => {
      if (!user) {
        console.log('No user found, aborting nearby sitters fetch');
        setLoading(false);
        return;
      }
      
      console.log('Starting nearby sitters fetch for user:', user.id);
      
      try {
        setLoading(true);
        
        // Step 1: Get current user's primary address
        console.log('Fetching user address...');
        const { data: userAddress, error: userAddressError } = await supabase
          .from('addresses')
          .select('*')
          .eq('profile_id', user.id)
          .eq('is_primary', true)
          .single();
          
        if (userAddressError) {
          console.error('Error fetching user address:', userAddressError);
          throw userAddressError;
        }
        if (!userAddress) {
          console.error('No primary address found for user');
          throw new Error('No primary address found for user');
        }
        
        console.log('User address found:', userAddress.formatted_address);
        console.log('User coordinates:', userAddress.latitude, userAddress.longitude);
        
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
        
        console.log('All sitters:', allSitters?.length || 0);
        console.log('Sitter details:', JSON.stringify(allSitters, null, 2));
        
        // Step 4: Manually join sitters with their addresses
        const sittersWithAddresses = [];
        
        for (const sitter of allSitters || []) {
          // Skip if sitter is the current user
          if (sitter.id === user.id) {
            console.log(`Skipping current user: ${sitter.id}`);
            continue;
          }
          
          // Query specifically for this sitter's address
          console.log(`Directly querying address for sitter ${sitter.id}`);
          const { data: sitterAddresses, error: addressError } = await supabase
              .from('addresses')
              .select('*')
              .eq('profile_id', sitter.id)
              .eq('is_primary', true);
              
          if (addressError) {
            console.error(`Error fetching address for sitter ${sitter.id}:`, addressError);
            continue;
          }
            
          console.log(`Addresses found for sitter ${sitter.id}:`, JSON.stringify(sitterAddresses, null, 2));
          
          // Process if we found an address
          const sitterAddress = sitterAddresses && sitterAddresses.length > 0 ? sitterAddresses[0] : null;
          
          if (sitterAddress) {
            console.log(`Found address for sitter ${sitter.id}: ${sitterAddress.formatted_address}`);
            
            // Calculate distance
            const distance = calculateDistance(
              parseFloat(userAddress.latitude),
              parseFloat(userAddress.longitude),
              parseFloat(sitterAddress.latitude),
              parseFloat(sitterAddress.longitude)
            );
            
            console.log(`Distance to ${sitter.name || 'Unknown'}:`, distance, 'miles');
            
            // Add to our results if within distance
            if (distance <= maxDistance) {
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
              console.log(`Added sitter ${sitter.name} with distance ${distance} miles`);
            } else {
              console.log(`Sitter ${sitter.name} excluded: distance ${distance} exceeds limit of ${maxDistance} miles`);
            }
          } else {
            console.log(`No address found for sitter ${sitter.id}`);
          }
        }
        
        // Sort by distance
        const nearbySitters = sittersWithAddresses.sort((a, b) => a.distance - b.distance);
        
        console.log('Final nearby sitters count:', nearbySitters.length);
        console.log('Nearby sitters:', nearbySitters);
        
        setSitters(nearbySitters);
      } catch (err: any) {
        console.error('Error fetching nearby sitters:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchNearbySitters();
  }, [user, maxDistance]);
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
          <Text style={styles.emptyText}>No sitters found within {maxDistance} miles of your location.</Text>
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