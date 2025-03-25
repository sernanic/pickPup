import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, Clock, MapPin, ChevronRight, Dog, RefreshCw } from 'lucide-react-native';
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
  service_type: 'Dog Walking';
  booking_date: string; 
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  selected_pets: BookingPet[];
  total_price: number;
  created_at: string;
};

// Empty array for now, we'll load from database
const initialBookings: Booking[] = [

];

export default function BookingsScreen() {
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
      
      // Query walking_bookings table
      let query = supabase
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
        .in('status', statuses);
      
      // For upcoming, only show future bookings
      if (activeTab === 'upcoming') {
        query = query.gte('booking_date', today);
      } else {
        // For completed, show past bookings and cancelled ones
        query = query.or(`booking_date.lt.${today},status.eq.cancelled`);
      }
      
      // Order by date
      query = query.order('booking_date', { ascending: activeTab === 'upcoming' });
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Get all the pet IDs first to fetch them in a single query
      const allPetIds: string[] = [];
      data.forEach((booking: any) => {
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
      
      console.log('All pet IDs:', allPetIds);
      
      // If we have pet IDs, fetch their details from the pets table
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
      
      // Transform data to match our Booking type with enhanced pet information
      const formattedBookings: Booking[] = data.map((booking: any) => {
        // Parse the selected pets data to handle both formats: 
        // 1. Array of IDs as strings: ["id1", "id2"] 
        // 2. Array of objects: [{id: "id1"}, {id: "id2"}]
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
        
        return {
          id: booking.id,
          sitter_id: booking.sitter_id,
          sitter_name: booking.profiles?.name || 'Unknown Sitter',
          sitter_image: booking.profiles?.avatar_url || undefined,
          service_type: 'Dog Walking',
          booking_date: booking.booking_date,
          start_time: booking.start_time,
          end_time: booking.end_time,
          status: booking.status,
          selected_pets: enhancedPets,
          total_price: booking.total_price,
          created_at: booking.created_at
        };
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
  const formatDate = (dateString: string) => {
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
              <TouchableOpacity style={styles.bookingCard}>
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
                      {formatDate(item.booking_date)}
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Clock size={16} color="#8E8E93" />
                    <Text style={styles.detailText}>
                      {item.start_time.slice(0, 5)} - {item.end_time.slice(0, 5)}
                    </Text>
                  </View>
                  
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