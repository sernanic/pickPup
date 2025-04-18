import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList, Dimensions, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Star } from 'lucide-react-native';
import { useSitterStore } from '../../../stores/sitterStore';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

interface FeaturedSittersProps {
  onSitterPress?: (sitter: any) => void;
  animationDelay?: number;
  limit?: number;
}

export function FeaturedSitters({ 
  onSitterPress,
  animationDelay = 300,
  limit = 5 
}: FeaturedSittersProps) {
  const router = useRouter();
  const { sitters, fetchSitters, isLoading, error } = useSitterStore();
  
  // Get the top-rated sitters (limited to specified count)
  const featuredSitters = sitters
    .slice(0, limit)
    .map(sitter => ({
      ...sitter,
      coverImage: sitter.background_url || 'https://images.unsplash.com/photo-1568640347023-a616a30bc3bd?q=80&w=400&auto=format&fit=crop'
    }));
  
  
  const handleSitterPress = (sitter: any) => {
    if (onSitterPress) {
      onSitterPress(sitter);
    } else {
      // Default behavior - navigate to sitter profile
      router.push(`/sitter/${sitter.id}`);
    }
  };

  // If there's an error, you might want to show an error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Unable to load featured sitters</Text>
      </View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.delay(animationDelay).duration(600)}>
      <View style={styles.featuredContainer}>
        <Text style={styles.sectionTitle}>Featured Sitters</Text>
        
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#63C7B8" />
          </View>
        ) : featuredSitters.length > 0 ? (
          <FlatList
            data={featuredSitters}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.featuredList}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.featuredCard}
                onPress={() => handleSitterPress(item)}
              >
                {item.verified && (
                  <View style={styles.trustedBadge}>
                    <Text style={styles.trustedText}>Trusted +</Text>
                  </View>
                )}
                
                <View style={styles.featuredContent}>
                  <Image 
                    source={{ uri: item.image || 'https://images.unsplash.com/photo-1568640347023-a616a30bc3bd?q=80&w=400&auto=format&fit=crop' }} 
                    style={styles.featuredSitterImage} 
                  />
                  
                  <View style={styles.featuredInfo}>
                    <Text style={styles.featuredSitterName}>{item.name} </Text>
                    
                    <View style={styles.ratingContainer}>
                      <View style={styles.starsContainer}>
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i}
                            size={16} 
                            color="#FFD700" 
                            fill={i < Math.floor(item.rating) ? "#FFD700" : "transparent"}
                          />
                        ))}
                      </View>
                      <Text style={styles.reviewsText}>({item.reviews} review{item.reviews !== 1 ? 's' : ''})</Text>
                    </View>
                    
                    <View style={styles.priceContainer}>
                      <Text style={styles.priceText}>${item.price}<Text style={styles.priceUnit}>/night</Text></Text>
                    </View>
                    
                    <View style={styles.servicesContainer}>
                      {item.services && item.services.includes('Boarding') && (
                        <View style={styles.serviceTag}>
                          <Text style={styles.serviceTagText}>Boarding</Text>
                        </View>
                      )}
                      {item.services && item.services.includes('Walking') && (
                        <View style={styles.serviceTag}>
                          <Text style={styles.serviceTagText}>Walking</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No featured sitters available in your area</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  featuredContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1A1A1A',
    marginBottom: 16,
  },
  featuredList: {
    paddingRight: 16,
  },
  featuredCard: {
    width: width * 0.85,
    marginRight: 16,
    marginBottom: 8,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 2.5,
    borderColor: '#63C7B8',
    padding: 16,
    position: 'relative',
  },
  trustedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#E1F5F3',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trustedText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: '#63C7B8',
  },
  featuredContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredSitterImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 16,
  },
  featuredInfo: {
    flex: 1,
  },
  featuredSitterName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 6,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewsText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#8E8E93',
  },
  loadingContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#FFF3F3',
    borderRadius: 8,
    marginBottom: 24,
  },
  errorText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#FF3B30',
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 24,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  serviceTag: {
    backgroundColor: '#E5F8F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  serviceTagText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: '#63C7B8',
  },
  priceContainer: {
    marginBottom: 10,
  },
  priceText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#63C7B8',
  },
  priceUnit: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#63C7B8',
  },
}); 