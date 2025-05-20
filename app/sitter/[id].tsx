import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, FlatList, Dimensions, ActivityIndicator, TextInput, Modal } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../lib/supabase';
// Import types from the app's type definitions
import type { Sitter } from '../features/home/types';
import { Star, MapPin, Calendar, Shield, ChevronLeft, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import TabBar from '../components/TabBar';
import { useAuthStore } from '../stores/authStore';

const { width } = Dimensions.get('window');

// Review type definition
type Review = {
  id: string;
  reviewer_id: string;
  sitter_id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer_name?: string;
  reviewer_avatar?: string;
};

// Gallery images type definition
type PortfolioImage = {
  id: string;
  sitter_id: string;
  image_url: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export default function SitterProfileScreen() {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('photos');
  // Use any type for now to resolve TypeScript errors
  const [sitter, setSitter] = useState<any>(null);
  const [sitterAddress, setSitterAddress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [portfolioImages, setPortfolioImages] = useState<PortfolioImage[]>([]);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [selectedRating, setSelectedRating] = useState(0);
  const [submittingReview, setSubmittingReview] = useState(false);
  const { user } = useAuthStore();

  // Helper function to truncate name
  const truncateName = (name: string, maxLength: number, ellipsis: string) => {
    if (name.length > maxLength) {
      return name.substring(0, maxLength) + ellipsis;
    }
    return name;
  };
  
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
        
        // Fetch reviews
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('reviews')
          .select('*')
          .eq('sitter_id', params.id)
          .order('created_at', { ascending: false });
          
        // Fetch portfolio images
        const { data: imageData, error: imageError } = await supabase
          .from('portfolio_images')
          .select('*')
          .eq('sitter_id', params.id);
          
        if (imageError) {
          console.log('Portfolio images error:', imageError);
        } else if (imageData) {
          setPortfolioImages(imageData);
        }
          
        if (reviewsError) {
          console.log('Reviews error:', reviewsError);
        } else if (reviewsData) {
          // Fetch reviewer profiles for each review
          const reviewsWithProfiles = await Promise.all(
            reviewsData.map(async (review) => {
              const { data: reviewerData } = await supabase
                .from('profiles')
                .select('name, avatar_url')
                .eq('id', review.reviewer_id)
                .single();
                
              return {
                ...review,
                reviewer_name: reviewerData?.name || 'Anonymous',
                reviewer_avatar: reviewerData?.avatar_url || 'https://via.placeholder.com/100'
              };
            })
          );
          
          setReviews(reviewsWithProfiles);
          
          // Calculate average rating
          if (reviewsWithProfiles.length > 0) {
            const total = reviewsWithProfiles.reduce((sum, review) => sum + review.rating, 0);
            setAverageRating(parseFloat((total / reviewsWithProfiles.length).toFixed(1)));
          }
        }
        
        setSitter(sitterData);
        setSitterAddress(addressData || null);
      } catch (err: any) {
        console.log('Error fetching sitter data:', err);
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
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ChevronLeft size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Image 
            source={{ uri: sitter?.background_url || 'https://via.placeholder.com/500' }}
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
              <Text style={styles.name}>
                {sitter?.name ? truncateName(sitter.name, 17, "...") : 'Loading...'}
              </Text>
              <View style={styles.verifiedBadge}>
                <Shield size={14} color="#0288D1" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.availabilityButton}
              onPress={() => router.push(`/availability/${params.id}`)}
            >
              <Calendar size={16} color="#FFFFFF" />
              <Text style={styles.availabilityButtonText}>Check Availability</Text>
            </TouchableOpacity>
            
            <View style={styles.ratingContainer}>
              <Star size={16} color="#FFD700" fill="#FFD700" />
              <Text style={styles.ratingText}>{averageRating > 0 ? averageRating.toFixed(1) : 'N/A'}</Text>
              <Text style={styles.reviewsText}>({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})</Text>
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

        {/* Content section - directly integrated into ScrollView */}
        <View style={styles.contentSection}>
          {activeTab === 'photos' ? (
            portfolioImages.length > 0 ? (
              <View style={styles.photosGrid}>
                {portfolioImages.map(item => (
                  <TouchableOpacity key={item.id} style={styles.galleryItem}>
                    <Image source={{ uri: item.image_url }} style={styles.galleryImage} />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateText}>No photos available</Text>
              </View>
            )
          ) : (
            <View>
              {user && user.id !== params.id && (
                <TouchableOpacity 
                  style={styles.addReviewButton}
                  onPress={() => setReviewModalVisible(true)}
                >
                  <Text style={styles.addReviewButtonText}>Write a Review</Text>
                </TouchableOpacity>
              )}
              
              {reviews.length > 0 ? (
                <View>
                  {reviews.map(review => (
                    <View key={review.id} style={styles.reviewCard}>
                      <View style={styles.reviewHeader}>
                        <Image source={{ uri: review.reviewer_avatar }} style={styles.reviewerImage} />
                        <View style={styles.reviewInfo}>
                          <Text style={styles.reviewerName}>{review.reviewer_name}</Text>
                          <View style={styles.reviewRating}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star 
                                key={star} 
                                size={14} 
                                color="#FFD700" 
                                fill={star <= review.rating ? "#FFD700" : "transparent"} 
                              />
                            ))}
                          </View>
                        </View>
                        <Text style={styles.reviewDate}>
                          {new Date(review.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                      <Text style={styles.reviewComment}>{review.comment}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyStateContainer}>
                  <Text style={styles.emptyStateText}>No ratings or reviews</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
      
      {/* Removed fixed button since we moved it under the verified badge */}

      {/* Add our custom TabBar component */}
      <View style={{ height: 60, backgroundColor: 'white', zIndex: 8 }}>
        <TabBar />
      </View>
      
      {/* Review Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={reviewModalVisible}
        onRequestClose={() => setReviewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Write a Review</Text>
              <TouchableOpacity onPress={() => setReviewModalVisible(false)}>
                <X size={24} color="#1A1A1A" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.ratingSelector}>
              <Text style={styles.ratingLabel}>Rating:</Text>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity 
                    key={star}
                    onPress={() => setSelectedRating(star)}
                  >
                    <Star 
                      size={30} 
                      color="#FFD700" 
                      fill={star <= selectedRating ? "#FFD700" : "transparent"} 
                      style={{ marginHorizontal: 5 }}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <TextInput
              style={styles.reviewInput}
              placeholder="Share your experience with this sitter..."
              multiline
              numberOfLines={4}
              value={reviewText}
              onChangeText={setReviewText}
            />
            
            <TouchableOpacity 
              style={[styles.submitButton, (!selectedRating || submittingReview) && styles.disabledButton]}
              disabled={!selectedRating || submittingReview}
              onPress={async () => {
                if (!user?.id || !selectedRating) return;
                
                try {
                  setSubmittingReview(true);
                  
                  const { data, error } = await supabase
                    .from('reviews')
                    .insert([
                      {
                        sitter_id: params.id,
                        reviewer_id: user.id,
                        rating: selectedRating,
                        comment: reviewText.trim()
                      }
                    ])
                    .select()
                    .single();
                    
                  if (error) throw error;
                  
                  // Get reviewer profile
                  const { data: reviewerData } = await supabase
                    .from('profiles')
                    .select('name, avatar_url')
                    .eq('id', user.id)
                    .single();
                  
                  // Add the new review to the list
                  const newReview = {
                    ...data,
                    reviewer_name: reviewerData?.name || 'Anonymous',
                    reviewer_avatar: reviewerData?.avatar_url || 'https://via.placeholder.com/100'
                  };
                  
                  setReviews([newReview, ...reviews]);
                  
                  // Update average rating
                  const newTotal = reviews.reduce((sum, review) => sum + review.rating, 0) + selectedRating;
                  const newAverage = parseFloat((newTotal / (reviews.length + 1)).toFixed(1));
                  setAverageRating(newAverage);
                  
                  // Reset form
                  setReviewText('');
                  setSelectedRating(0);
                  setReviewModalVisible(false);
                } catch (err: any) {
                  console.log('Error submitting review:', err);
                  // Use console.error instead of alert for error handling
                  console.log('Failed to submit review. Please try again.');
                } finally {
                  setSubmittingReview(false);
                }
              }}
            >
              <Text style={styles.submitButtonText}>
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  ratingSelector: {
    marginBottom: 20,
  },
  ratingLabel: {
    fontSize: 16,
    marginBottom: 10,
    color: '#1A1A1A',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    height: 120,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#63C7B8',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
    opacity: 0.5,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  addReviewButton: {
    backgroundColor: '#63C7B8',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  addReviewButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
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
  contentSection: {
    paddingHorizontal: 16,
    marginTop: 20,
    paddingBottom: 80, // Add padding to ensure content is visible above tab bar
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  galleryItem: {
    width: (width - 48) / 2, // Two columns with 16px padding on each side and 16px between items
    height: 160,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5', // Add background color to show while loading
  },
  galleryImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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
  availabilityButton: {
    backgroundColor: '#63C7B8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  availabilityButtonText: {
    marginLeft: 6,
    color: 'white',
    fontSize: 14,
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