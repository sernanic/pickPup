import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList, Dimensions } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Star } from 'lucide-react-native';
import { FeaturedSitter } from '../types';

const { width } = Dimensions.get('window');

interface FeaturedSittersProps {
  featuredSitters: FeaturedSitter[];
  onSitterPress?: (sitter: FeaturedSitter) => void;
  animationDelay?: number;
}

export function FeaturedSitters({ 
  featuredSitters, 
  onSitterPress = () => {}, 
  animationDelay = 300 
}: FeaturedSittersProps) {
  return (
    <Animated.View entering={FadeInDown.delay(animationDelay).duration(600)}>
      <View style={styles.featuredContainer}>
        <Text style={styles.sectionTitle}>Featured Sitters</Text>
        <FlatList
          data={featuredSitters}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.featuredList}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.featuredCard}
              onPress={() => onSitterPress(item)}
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
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
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
}); 