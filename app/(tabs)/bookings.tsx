import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Modal, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, Clock, MapPin, ChevronRight, Dog, RefreshCw, X, Phone, Mail, DollarSign, Star } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Link } from 'expo-router';
import { ActivityIndicator } from 'react-native';

// Type definitions for our bookings
type BookingPet = {
  id: string;
  name: string;
  breed?: string;
  image_url?: string;
  weight?: string;
  age?: number;
};

type Booking = {
  id: string;
  sitter_id: string;
  sitter_name?: string;
  sitter_image?: string;
  service_type: 'Dog Walking' | 'Dog Boarding';
  booking_date?: string; // Optional for walking bookings
  start_time?: string; // Optional for walking bookings
  end_time?: string; // Optional for walking bookings
  start_date?: string; // Optional for boarding bookings
  end_date?: string; // Optional for boarding bookings
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  selected_pets: BookingPet[];
  total_price: number;
  created_at: string;
  booking_type: 'walking' | 'boarding';
};

// Empty array for now, we'll load from database
const initialBookings: Booking[] = [

];

export default function BookingsScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed'>('upcoming');
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuthStore();

  // Fetch bookings from database
  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user, activeTab]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      
      // Define statuses based on active tab
      const statuses = activeTab === 'upcoming' 
        ? ['pending', 'confirmed'] 
        : ['completed', 'cancelled'];
      
      // Get today's date for filtering
      const today = new Date().toISOString().split('T')[0];

      // STEP 1: Fetch all pet IDs first to handle them efficiently
      const allPetIds: string[] = [];
      let allBookings: any[] = [];

      // STEP 2: Query walking bookings
      const { data: walkingBookings, error: walkingError } = await supabase
        .from('walking_bookings')
        .select(`
          id,
          sitter_id,
          booking_date,
          start_time,
          end_time,
          selected_pets,
          status,
          total_price,
          created_at,
          profiles:sitter_id(id, name, avatar_url)
        `)
        .eq('owner_id', user?.id)
        .in('status', statuses)
        .order('booking_date', { ascending: activeTab === 'upcoming' });

      if (walkingError) throw walkingError;

      // Process walking bookings
      const processedWalkingBookings = walkingBookings.filter(booking => {
        // Filter based on date - only if activeTab is upcoming
        if (activeTab === 'upcoming') {
          return new Date(booking.booking_date) >= new Date(today);
        } else {
          // For completed, show past bookings and cancelled ones
          return new Date(booking.booking_date) < new Date(today) || booking.status === 'cancelled';
        }
      }).map(booking => ({
        ...booking, 
        booking_type: 'walking' as const
      }));

      allBookings = [...processedWalkingBookings];
      
      // STEP 3: Query boarding bookings
      const { data: boardingBookings, error: boardingError } = await supabase
        .from('boarding_bookings')
        .select(`
          id,
          sitter_id,
          start_date,
          end_date,
          selected_pets,
          status,
          total_price,
          created_at,
          profiles:sitter_id(id, name, avatar_url)
        `)
        .eq('owner_id', user?.id)
        .in('status', statuses)
        .order('start_date', { ascending: activeTab === 'upcoming' });

      if (boardingError) throw boardingError;

      // Process boarding bookings
      const processedBoardingBookings = boardingBookings.filter(booking => {
        // Filter based on date - only if activeTab is upcoming
        if (activeTab === 'upcoming') {
          return new Date(booking.start_date) >= new Date(today);
        } else {
          // For completed, show past bookings and cancelled ones
          return new Date(booking.end_date) < new Date(today) || booking.status === 'cancelled';
        }
      }).map(booking => ({
        ...booking, 
        booking_type: 'boarding' as const
      }));

      allBookings = [...allBookings, ...processedBoardingBookings];

      // Extract all pet IDs from both booking types
      allBookings.forEach(booking => {
        let petsData: string[] = [];
        
        if (typeof booking.selected_pets === 'string') {
          try {
            petsData = JSON.parse(booking.selected_pets);
          } catch (e) {
            console.error('Error parsing selected_pets JSON:', e);
          }
        } else if (Array.isArray(booking.selected_pets)) {
          petsData = booking.selected_pets;
        }
        
        // Extract all pet IDs - handle both string IDs and object formats
        petsData.forEach((petIdOrObj: any) => {
          // Handle case where it's just a string ID
          const petId = typeof petIdOrObj === 'string' 
            ? petIdOrObj 
            : petIdOrObj?.id;
            
          if (petId && !allPetIds.includes(petId)) {
            allPetIds.push(petId);
          }
        });
      });
      
      // STEP 4: Fetch all pet details in a single query
      let petDetailsMap: Record<string, any> = {};
      if (allPetIds.length > 0) {
        const { data: petsData, error: petsError } = await supabase
          .from('pets')
          .select('id, name, breed, image_url, weight, age')
          .in('id', allPetIds);
          
        if (petsError) throw petsError;
        
        // Create a map of pet id to full pet details for quick lookup
        petsData.forEach(pet => {
          petDetailsMap[pet.id] = pet;
        });
      }
      
      // STEP 5: Format all bookings to match our Booking type
      const formattedBookings: Booking[] = allBookings.map(booking => {
        // Parse the selected pets data
        let petsData: any[] = [];
        
        if (typeof booking.selected_pets === 'string') {
          try {
            petsData = JSON.parse(booking.selected_pets);
          } catch (e) {
            console.error('Error parsing pet data', e);
          }
        } else if (Array.isArray(booking.selected_pets)) {
          petsData = booking.selected_pets;
        }
        
        // Enhance each pet with full details from our pet lookup map
        const enhancedPets = petsData.map((petIdOrObj: any) => {
          // Handle case where it's just a string ID
          const petId = typeof petIdOrObj === 'string' 
            ? petIdOrObj 
            : petIdOrObj?.id;
          
          const petDetails = petDetailsMap[petId] || {};
          
          return {
            id: petId,
            name: petDetails.name || 'Unknown Pet',
            breed: petDetails.breed || '',
            image_url: petDetails.image_url || '',
            weight: petDetails.weight || '',
            age: petDetails.age || '',
          };
        });

        const baseBooking = {
          id: booking.id,
          sitter_id: booking.sitter_id,
          sitter_name: booking.profiles?.name || 'Unknown Sitter',
          sitter_image: booking.profiles?.avatar_url || undefined,
          status: booking.status,
          selected_pets: enhancedPets,
          total_price: booking.total_price,
          created_at: booking.created_at,
          booking_type: booking.booking_type
        };

        // Add type-specific fields based on booking_type
        if (booking.booking_type === 'walking') {
          return {
            ...baseBooking,
            service_type: 'Dog Walking',
            booking_date: booking.booking_date,
            start_time: booking.start_time,
            end_time: booking.end_time,
          };
        } else {
          return {
            ...baseBooking,
            service_type: 'Dog Boarding',
            start_date: booking.start_date,
            end_date: booking.end_date,
          };
        }
      });
      
      // STEP 6: Sort bookings by date (either booking_date or start_date)
      formattedBookings.sort((a, b) => {
        const dateA = a.booking_type === 'walking' ? new Date(a.booking_date || '') : new Date(a.start_date || '');
        const dateB = b.booking_type === 'walking' ? new Date(b.booking_date || '') : new Date(b.start_date || '');
        
        return activeTab === 'upcoming' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
      });
      
      setBookings(formattedBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };
  
  // Filter bookings is no longer needed since we're fetching filtered data from database

  // Format date for display
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Bookings</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'upcoming' && styles.activeTabText,
            ]}
          >
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
          onPress={() => setActiveTab('completed')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'completed' && styles.activeTabText,
            ]}
          >
            Completed
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#63C7B8" />
          <Text style={styles.loadingText}>Loading bookings...</Text>
        </View>
      ) : bookings.length > 0 ? (
        <FlatList
          data={bookings}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.bookingsList}
          renderItem={({ item, index }) => (
            <Animated.View 
              entering={FadeInDown.delay(index * 100).duration(400)}
            >
              <TouchableOpacity 
                style={styles.bookingCard}
                onPress={() => {
                  setSelectedBooking(item);
                  setModalVisible(true);
                }}
              >
                <View style={styles.bookingHeader}>
                  <View style={styles.sitterInfo}>
                    <Image 
                      source={{ 
                        uri: item.sitter_image || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(item.sitter_name || 'Dog Sitter')
                      }} 
                      style={styles.sitterImage} 
                    />
                    <View>
                      <Text style={styles.sitterName}>{item.sitter_name || 'Dog Sitter'}</Text>
                      <Text style={styles.serviceType}>{item.service_type}</Text>
                    </View>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    item.status === 'pending' ? styles.pendingBadge : 
                    item.status === 'confirmed' ? styles.upcomingBadge : 
                    item.status === 'completed' ? styles.completedBadge : 
                    styles.cancelledBadge
                  ]}>
                    <Text style={[
                      styles.statusText,
                      item.status === 'pending' ? styles.pendingText : 
                      item.status === 'confirmed' ? styles.upcomingText : 
                      item.status === 'completed' ? styles.completedText : 
                      styles.cancelledText
                    ]}>
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.divider} />
                
                <View style={styles.bookingDetails}>
                  <View style={styles.detailRow}>
                    <Calendar size={16} color="#8E8E93" />
                    <Text style={styles.detailText}>
                      {item.booking_type === 'walking' 
                        ? formatDate(item.booking_date)
                        : `${formatDate(item.start_date)} - ${formatDate(item.end_date)}`
                      }
                    </Text>
                  </View>
                  
                  {item.booking_type === 'walking' ? (
                    <View style={styles.detailRow}>
                      <Clock size={16} color="#8E8E93" />
                      <Text style={styles.detailText}>
                        {item.start_time?.slice(0, 5) || 'N/A'} - {item.end_time?.slice(0, 5) || 'N/A'}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.detailRow}>
                      <Clock size={16} color="#8E8E93" />
                      <Text style={styles.detailText}>
                        {item.start_date && item.end_date 
                          ? `${Math.ceil((new Date(item.end_date).getTime() - new Date(item.start_date).getTime()) / (1000 * 60 * 60 * 24))} nights`
                          : 'Duration unknown'
                        }
                      </Text>
                    </View>
                  )}
                  
                  <View style={styles.detailRow}>
                    <Dog size={16} color="#8E8E93" />
                    <Text style={styles.detailText}>
                      {item.selected_pets.length} {item.selected_pets.length === 1 ? 'pet' : 'pets'}
                      {item.selected_pets[0]?.weight ? ` (${item.selected_pets[0]?.weight} lbs)` : ''}
                      {item.selected_pets.length > 1 ? ` + ${item.selected_pets.length - 1} more` : ''}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.bookingFooter}>
                  <Text style={styles.dogInfo}>
                    For: <Text style={styles.dogName}>
                      {item.selected_pets.map(pet => pet.name).join(', ')}
                    </Text>
                  </Text>
                  
                  {(item.status === 'pending' || item.status === 'confirmed') ? (
                    <TouchableOpacity style={styles.actionButton}>
                      <Text style={styles.actionButtonText}>Manage</Text>
                      <ChevronRight size={16} color="#63C7B8" />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.actionButton}>
                      <Text style={styles.actionButtonText}>Book Again</Text>
                      <ChevronRight size={16} color="#63C7B8" />
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            </Animated.View>
          )}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Calendar size={64} color="#8E8E93" />
          <Text style={styles.emptyTitle}>No {activeTab} bookings</Text>
          <Text style={styles.emptyText}>
            {activeTab === 'upcoming' 
              ? "You don't have any upcoming bookings. Book a sitter to get started!"
              : "You don't have any completed bookings yet."
            }
          </Text>
          {activeTab === 'upcoming' && !loading && (
            <Link href="/" asChild>
              <TouchableOpacity style={styles.findSitterButton}>
                <Text style={styles.findSitterButtonText}>Find a Sitter</Text>
              </TouchableOpacity>
            </Link>
          )}
        </View>
      )}
      
      {/* Booking Details Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Booking Details</Text>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={() => setModalVisible(false)}
              >
                <X size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {selectedBooking && (
                <>
                  {/* Status Badge */}
                  <View style={[styles.modalStatusContainer, 
                    selectedBooking.status === 'pending' ? styles.pendingBackground : 
                    selectedBooking.status === 'confirmed' ? styles.upcomingBackground : 
                    selectedBooking.status === 'completed' ? styles.completedBackground : 
                    styles.cancelledBackground
                  ]}>
                    <Text style={styles.modalStatusText}>
                      {selectedBooking.status.charAt(0).toUpperCase() + selectedBooking.status.slice(1)}
                    </Text>
                  </View>
                  
                  {/* Sitter Information */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Sitter</Text>
                    <View style={styles.modalSitterInfo}>
                      <Image 
                        source={{ 
                          uri: selectedBooking.sitter_image || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(selectedBooking.sitter_name || 'Dog Sitter')
                        }} 
                        style={styles.modalSitterImage} 
                      />
                      <View style={styles.modalSitterDetails}>
                        <Text style={styles.modalSitterName}>{selectedBooking.sitter_name}</Text>
                        <Text style={styles.modalServiceType}>{selectedBooking.service_type}</Text>
                        <View style={styles.modalSitterActions}>
                          {/* <TouchableOpacity style={styles.modalContactButton}>
                            <Phone size={16} color="#63C7B8" />
                            <Text style={styles.modalContactText}>Call</Text>
                          </TouchableOpacity> */}
                          <TouchableOpacity 
                            style={styles.modalContactButton}
                            onPress={async () => {
                              try {
                                // Check if a message thread exists for this booking
                                let threadQuery = supabase
                                  .from('message_threads')
                                  .select('id');
                                
                                // Set the right query field based on booking type
                                if (selectedBooking.booking_type === 'walking') {
                                  threadQuery = threadQuery.eq('walking_booking_id', selectedBooking.id);
                                } else {
                                  threadQuery = threadQuery.eq('boarding_booking_id', selectedBooking.id);
                                }
                                
                                const { data: existingThreads, error: threadError } = await threadQuery.single();
                                
                                if (threadError && threadError.code !== 'PGRST116') {
                                  console.error('Error checking message thread:', threadError);
                                  return;
                                }
                                
                                // If thread exists, close modal and navigate to it
                                if (existingThreads) {
                                  setModalVisible(false);
                                  router.push(`/conversation/${existingThreads.id}`);
                                  return;
                                }
                                
                                // Create thread data object with proper type
                                type ThreadData = {
                                  booking_type: 'walking' | 'boarding';
                                  owner_id: string | undefined;
                                  sitter_id: string;
                                  last_message: string;
                                  last_message_time: string;
                                  walking_booking_id?: string;
                                  boarding_booking_id?: string;
                                };
                                
                                const threadData: ThreadData = {
                                  booking_type: selectedBooking.booking_type,
                                  owner_id: user?.id,
                                  sitter_id: selectedBooking.sitter_id,
                                  last_message: '',
                                  last_message_time: new Date().toISOString()
                                };
                                
                                // Set the appropriate booking ID field
                                if (selectedBooking.booking_type === 'walking') {
                                  threadData.walking_booking_id = selectedBooking.id;
                                } else {
                                  threadData.boarding_booking_id = selectedBooking.id;
                                }
                                
                                // Create a new message thread
                                const { data: newThread, error: createError } = await supabase
                                  .from('message_threads')
                                  .insert(threadData)
                                  .select('id')
                                  .single();
                                
                                if (createError) {
                                  console.error('Error creating message thread:', createError);
                                  return;
                                }
                                
                                // Close modal and navigate to the new thread
                                if (newThread) {
                                  setModalVisible(false);
                                  router.push(`/conversation/${newThread.id}`);
                                }
                              } catch (error) {
                                console.error('Error with messaging:', error);
                              }
                            }}
                          >
                            <Mail size={16} color="#63C7B8" />
                            <Text style={styles.modalContactText}>Message</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.modalDivider} />
                  
                  {/* Booking Information */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Booking Details</Text>
                    <View style={styles.modalDetailRow}>
                      <Calendar size={18} color="#8E8E93" />
                      <Text style={styles.modalDetailText}>
                        {selectedBooking.booking_type === 'walking' 
                          ? formatDate(selectedBooking.booking_date)
                          : `${formatDate(selectedBooking.start_date)} - ${formatDate(selectedBooking.end_date)}`
                        }
                      </Text>
                    </View>
                    {selectedBooking.booking_type === 'walking' ? (
                      <View style={styles.modalDetailRow}>
                        <Clock size={18} color="#8E8E93" />
                        <Text style={styles.modalDetailText}>
                          {selectedBooking.start_time?.slice(0, 5) || 'N/A'} - {selectedBooking.end_time?.slice(0, 5) || 'N/A'}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.modalDetailRow}>
                        <Clock size={18} color="#8E8E93" />
                        <Text style={styles.modalDetailText}>
                          {selectedBooking.start_date && selectedBooking.end_date 
                            ? `${Math.ceil((new Date(selectedBooking.end_date).getTime() - new Date(selectedBooking.start_date).getTime()) / (1000 * 60 * 60 * 24))} nights`
                            : 'Duration unknown'
                          }
                        </Text>
                      </View>
                    )}
                    <View style={styles.modalDetailRow}>
                      <DollarSign size={18} color="#8E8E93" />
                      <Text style={styles.modalDetailText}>
                        ${selectedBooking.total_price.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.modalDivider} />
                  
                  {/* Pets Information */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Pets</Text>
                    {selectedBooking.selected_pets.map((pet) => (
                      <View key={pet.id} style={styles.modalPetItem}>
                        <Image 
                          source={{ 
                            uri: pet.image_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(pet.name)
                          }} 
                          style={styles.modalPetImage} 
                        />
                        <View style={styles.modalPetDetails}>
                          <Text style={styles.modalPetName}>{pet.name}</Text>
                          <Text style={styles.modalPetInfo}>
                            {pet.breed || 'Mixed breed'}{pet.age ? `, ${pet.age} years` : ''}
                          </Text>
                          {pet.weight && (
                            <Text style={styles.modalPetInfo}>
                              {pet.weight} lbs
                            </Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                  
                  {/* Action Buttons */}
                  {/* {(selectedBooking.status === 'pending' || selectedBooking.status === 'confirmed') && (
                    <View style={styles.modalButtonContainer}>
                      <TouchableOpacity style={styles.modalCancelButton}>
                        <Text style={styles.modalCancelButtonText}>Cancel Booking</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.modalRescheduleButton}>
                        <Text style={styles.modalRescheduleButtonText}>Reschedule</Text>
                      </TouchableOpacity>
                    </View>
                  )} */}
                  
                  {selectedBooking.status === 'completed' && (
                    <View style={styles.modalRatingContainer}>
                      <Text style={styles.modalRatingTitle}>Rate your experience</Text>
                      <View style={styles.modalStarContainer}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <TouchableOpacity key={`star-${star}`}>
                            <Star size={30} color="#FFD700" fill="#FFD700" />
                          </TouchableOpacity>
                        ))}
                      </View>
                      <TouchableOpacity style={styles.modalSubmitButton}>
                        <Text style={styles.modalSubmitButtonText}>Submit Review</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
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
  },
  pendingBadge: {
    backgroundColor: '#FFE58F',
  },
  pendingText: {
    color: '#D48806',
  },
  cancelledBadge: {
    backgroundColor: '#FFCCC7',
  },
  cancelledText: {
    color: '#CF1322',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '90%',
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  modalTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    color: '#1A1A1A',
  },
  closeButton: {
    padding: 8,
  },
  modalBody: {
    flex: 1,
  },
  modalStatusContainer: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginVertical: 16,
  },
  pendingBackground: {
    backgroundColor: '#FFF7E6',
  },
  upcomingBackground: {
    backgroundColor: '#E6F7FF',
  },
  completedBackground: {
    backgroundColor: '#F6FFED',
  },
  cancelledBackground: {
    backgroundColor: '#FFF1F0',
  },
  modalStatusText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    marginBottom: 12,
    color: '#1A1A1A',
  },
  modalSitterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalSitterImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  modalSitterDetails: {
    flex: 1,
  },
  modalSitterName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1A1A1A',
    marginBottom: 4,
  },
  modalServiceType: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  modalSitterActions: {
    flexDirection: 'row',
    marginTop: 4,
  },
  modalContactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 12,
  },
  modalContactText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: '#63C7B8',
    marginLeft: 4,
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#F2F2F7',
    marginVertical: 16,
  },
  modalDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalDetailText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#1A1A1A',
    marginLeft: 12,
  },
  modalPetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  modalPetImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  modalPetDetails: {
    flex: 1,
  },
  modalPetName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1A1A1A',
  },
  modalPetInfo: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#8E8E93',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  modalCancelButton: {
    backgroundColor: '#FFF1F0',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    marginRight: 12,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: '#CF1322',
  },
  modalRescheduleButton: {
    backgroundColor: '#F0F7FF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    marginLeft: 12,
    alignItems: 'center',
  },
  modalRescheduleButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: '#1890FF',
  },
  modalRatingContainer: {
    alignItems: 'center',
    marginVertical: 16,
    padding: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
  },
  modalRatingTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 18,
    color: '#1A1A1A',
    marginBottom: 16,
  },
  modalStarContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  modalSubmitButton: {
    backgroundColor: '#63C7B8',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  modalSubmitButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#1A1A1A',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#8E8E93',
  },
  activeTabText: {
    color: '#63C7B8',
  },
  bookingsList: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  bookingCard: {
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
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sitterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sitterImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  sitterName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1A1A1A',
  },
  serviceType: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#8E8E93',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  upcomingBadge: {
    backgroundColor: '#E1F5FE',
  },
  completedBadge: {
    backgroundColor: '#F2F2F7',
  },
  statusText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
  },
  upcomingText: {
    color: '#0288D1',
  },
  completedText: {
    color: '#8E8E93',
  },
  divider: {
    height: 1,
    backgroundColor: '#F2F2F7',
    marginVertical: 12,
  },
  bookingDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#1A1A1A',
    marginLeft: 8,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dogInfo: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#8E8E93',
  },
  dogName: {
    fontFamily: 'Poppins-SemiBold',
    color: '#1A1A1A',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#63C7B8',
    marginRight: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
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
  findSitterButton: {
    backgroundColor: '#63C7B8',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  findSitterButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});