import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, FlatList, Dimensions, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
// Import types from the app's type definitions
import type { Sitter } from '../features/home/types';
import { Star, MapPin, Calendar, Shield, ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import TabBar from '../components/TabBar';

const { width } = Dimensions.get('window');

// Sample review data - in real app, fetch this from API
const reviews = [
  {
    id: '1',
    user: 'John D.',
    rating: 5,
    date: '2024-02-15',
    comment: 'Amazing experience! My dog loved staying here.',
    userImage: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100',
  },
  // ... more reviews
];

// Sample gallery images - in real app, fetch from API
const galleryImages: { id: string; type: string; url: string }[] = [
  {
    id: '1',
    type: 'home',
    url: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=500',
  },
  {
    id: '2',
    type: 'dogs',
    url: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=500',
  },
  {
    id: '3',
    type: 'home',
    url: 'https://images.unsplash.com/photo-1593696140826-c58b021acf8b?w=500',
  },
  {
    id: '4',
    type: 'dogs',
    url: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=500',
  },
];

export default function SitterProfileScreen() {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('photos');
  // Use any type for now to resolve TypeScript errors
  const [sitter, setSitter] = useState<any>(null);
  const [sitterAddress, setSitterAddress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchSitterData = async () => {
      if (!params.id) return;
      
      try {
        setLoading(true);
        
        // Fetch sitter profile data
        const { data: sitterData, error: sitterError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', params.id)
          .single();
          
        if (sitterError) throw sitterError;
        
        // Fetch sitter address
        const { data: addressData, error: addressError } = await supabase
          .from('addresses')
          .select('*')
          .eq('profile_id', params.id)
          .eq('is_primary', true)
          .single();
          
        if (addressError && addressError.code !== 'PGRST116') { // Not found is ok
          console.log('Address error:', addressError);
        }
        
        setSitter(sitterData);
        setSitterAddress(addressData || null);
      } catch (err: any) {
        console.error('Error fetching sitter data:', err);
        setError(err.message || 'Failed to load sitter data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSitterData();
  }, [params.id]);

  // Display loading indicator while fetching data
  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#63C7B8" />
        <Text style={styles.loadingText}>Loading sitter profile...</Text>
      </View>
    );
  }
  
  // Display error message if something went wrong
  if (error) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 500 }}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ChevronLeft size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Image 
            source={{ uri: sitter?.avatar_url || 'https://via.placeholder.com/500' }}
            style={styles.coverImage}
          />
        </View>

        <Animated.View 
          entering={FadeInDown.duration(600)}
          style={styles.profileSection}
        >
          <Image 
            source={{ uri: sitter?.avatar_url || 'https://via.placeholder.com/200' }}
            style={styles.profileImage}
          />
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{sitter?.name || 'Loading...'}</Text>
              <View style={styles.verifiedBadge}>
                <Shield size={14} color="#0288D1" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            </View>
            
            <View style={styles.ratingContainer}>
              <Star size={16} color="#FFD700" fill="#FFD700" />
              <Text style={styles.ratingText}>4.9</Text>
              <Text style={styles.reviewsText}>(124 reviews)</Text>
            </View>

            <View style={styles.locationContainer}>
              <MapPin size={14} color="#8E8E93" />
              <Text style={styles.locationText}>
                {sitterAddress ? `${sitterAddress.city}, ${sitterAddress.state}` : 'Location unavailable'}
              </Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'photos' && styles.activeTab]}
            onPress={() => setActiveTab('photos')}
          >
            <Text style={[styles.tabText, activeTab === 'photos' && styles.activeTabText]}>
              Photos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'reviews' && styles.activeTab]}
            onPress={() => setActiveTab('reviews')}
          >
            <Text style={[styles.tabText, activeTab === 'reviews' && styles.activeTabText]}>
              Reviews
            </Text>
          </TouchableOpacity>
        </View>

        {/* Placeholder for content - actual content is rendered outside ScrollView */}
        <View style={styles.contentPlaceholder} />
        
        {/* Increase space between tabs and content */}
        <View style={{ height: 30 }} />
        
        {/* Space for the content area */}
        <View style={styles.contentPlaceholder} />
      </ScrollView>
      
      {/* Content is rendered separately to avoid VirtualizedList nesting issues */}
      <View style={styles.contentOverlay}>
        {activeTab === 'photos' ? (
          galleryImages.length > 0 ? (
            <FlatList
              key="photos-grid" /* Unique key for photos list */
              data={galleryImages}
              numColumns={2}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.galleryItem}>
                  <Image source={{ uri: item.url }} style={styles.galleryImage} />
                </TouchableOpacity>
              )}
            />
          ) : (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>No photos available</Text>
            </View>
          )
        ) : (
          <FlatList
            key="reviews-list" /* Unique key for reviews list */
            data={reviews}
            numColumns={1} /* Explicitly set to 1 */
            keyExtractor={(item) => item.id}
            renderItem={({ item: review }) => (
              <View style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Image source={{ uri: review.userImage }} style={styles.reviewerImage} />
                  <View style={styles.reviewInfo}>
                    <Text style={styles.reviewerName}>{review.user}</Text>
                    <View style={styles.reviewRating}>
                      <Star size={14} color="#FFD700" fill="#FFD700" />
                      <Text style={styles.reviewRatingText}>{review.rating}</Text>
                    </View>
                  </View>
                  <Text style={styles.reviewDate}>{review.date}</Text>
                </View>
                <Text style={styles.reviewComment}>{review.comment}</Text>
              </View>
            )}
          />
        )}
      </View>
      
      {/* Fixed button at the bottom */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.scheduleButton}
          onPress={() => router.push(`/availability/${params.id}`)}
        >
          <Calendar size={20} color="#FFFFFF" />
          <Text style={styles.scheduleButtonText}>Check Availability</Text>
        </TouchableOpacity>
      </View>

      {/* Add our custom TabBar component */}
      <View style={{ height: 60, backgroundColor: 'white', zIndex: 8 }}>
        <TabBar />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  contentPlaceholder: {
    height: 350, // Increased height to add more space
  },
  contentOverlay: {
    position: 'absolute',
    top: 500, // Space after the info card
    left: 0,
    right: 0,
    bottom: 70, // Reduced to ensure tab bar is visible
    backgroundColor: '#FFFFFF',
    zIndex: 1,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 70, // Just above the tab bar
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    zIndex: 10, // Highest z-index
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    marginBottom: 20,
    textAlign: 'center',
  },
  backButtonText: {
    color: '#63C7B8',
    fontSize: 16,
    fontWeight: '600',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    height: 350, // Increased height
    position: 'relative',
    backgroundColor: '#E5E5E5',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 10, // Increased z-index
    backgroundColor: 'rgba(255, 255, 255, 0.8)', // Semi-transparent
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  coverImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  profileSection: {
    marginTop: -50,
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 20,
    color: '#1A1A1A',
    marginRight: 8,
    fontWeight: '600',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderWidth: 1,
    borderColor: '#0288D1',
    borderRadius: 4,
  },
  verifiedText: {
    fontSize: 12,
    color: '#0288D1',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 16,
    color: '#1A1A1A',
    marginLeft: 4,
    fontWeight: '600',
  },
  reviewsText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  activeTab: {
    backgroundColor: '#F8FFFE',
  },
  tabText: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#63C7B8',
  },
  galleryContainer: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 16,
  },
  galleryItem: {
    flex: 1,
    margin: 4,
    height: 150,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  reviewsContainer: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  reviewInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  reviewRatingText: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 4,
  },
  reviewDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  reviewComment: {
    fontSize: 14,
    color: '#1A1A1A',
    lineHeight: 20,
  },
  scheduleButton: {
    backgroundColor: '#63C7B8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    margin: 16,
  },
  scheduleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 8,
    fontWeight: '600',
  },
}); 