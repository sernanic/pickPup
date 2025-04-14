import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList, Dimensions, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Star } from 'lucide-react-native';
import { useSitterStore } from '../../../../stores/sitterStore';
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
                <Image source={{ uri: item.coverImage }} style={styles.featuredCoverImage} />
                <View style={styles.featuredContent}>
                  <Image source={{ uri: item.image }} style={styles.featuredSitterImage} />
                  <View style={styles.featuredInfo}>
                    <View style={styles.featuredNameRow}>
                      <Text style={styles.featuredSitterName}>{item.name}</Text>
                      {item.verified && (
                        <View style={styles.verifiedBadge}>
                          <Text style={styles.verifiedText}>Verified</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.ratingContainer}>
                      <Star size={16} color="#FFD700" fill="#FFD700" />
                      <Text style={styles.ratingText}>{item.rating}</Text>
                      <Text style={styles.reviewsText}>({item.reviews} reviews)</Text>
                    </View>
                    
                    <View style={styles.priceContainer}>
                      <Text style={styles.priceText}>${item.price}<Text style={styles.priceUnit}>{item.priceLabel}</Text></Text>
                    </View>
                    
                    <View style={styles.servicesContainer}>
                      {item.services && item.services.length > 0 ? (
                        <>
                          {item.services.slice(0, 2).map((service, index) => (
                            <View key={index} style={styles.serviceTag}>
                              <Text style={styles.serviceTagText}>{service}</Text>
                            </View>
                          ))}
                          {item.services.length > 2 && (
                            <Text style={styles.moreServicesText}>+{item.services.length - 2} more</Text>
                          )}
                        </>
                      ) : (
                        <View style={styles.serviceTag}>
                          <Text style={styles.serviceTagText}>No services</Text>
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
    width: width * 0.7,
    marginRight: 16,
    marginBottom: 8, // Added bottom margin to make shadow visible on Android
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  featuredCoverImage: {
    width: '100%',
    height: 150,
  },
  featuredContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  featuredSitterImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    marginTop: -40,
  },
  featuredInfo: {
    flex: 1,
  },
  featuredNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  featuredSitterName: {
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
  priceContainer: {
    marginBottom: 4,
  },
  priceText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#63C7B8',
  },
  priceUnit: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#8E8E93',
  },
}); 