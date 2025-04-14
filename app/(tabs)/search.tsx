import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, FlatList, Image, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search as SearchIcon, Filter, MapPin, Star, Heart } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuthStore } from '../stores/authStore';
import { useSitterStore, SitterFilters } from '../stores/sitterStore';
import { useFavoriteStore } from '../stores/favoriteStore';

// Type definition for sitters
type Sitter = {
  id: string;
  name: string;
  rating: number;
  reviews: number;
  distance: number;
  price: number;
  priceLabel: string;
  image: string;
  verified: boolean;
  services: string[];
  boardingRate?: number;
  walkingRate?: number;
  sittingRate?: number;
  daycareRate?: number;
};

// Sample data for filters
const serviceTypes = [
  { id: '1', name: 'Boarding' },
  { id: '2', name: 'Walking' },
  { id: '3', name: 'Sitting' },
  { id: '4', name: 'Training' },
  { id: '5', name: 'Daycare' },
];

const priceRanges = [
  { id: '1', name: '$0-$25' },
  { id: '2', name: '$25-$50' },
  { id: '3', name: '$50-$75' },
  { id: '4', name: '$75+' },
];

// Distance options are now used to display the current maxDistance setting
const distanceOptions = [
  { id: '1', name: '2 miles', value: 2 },
  { id: '2', name: '5 miles', value: 5 },
  { id: '3', name: '10 miles', value: 10 },
  { id: '4', name: '20 miles', value: 20 },
  { id: '5', name: '50 miles', value: 50 },
  { id: '6', name: 'Any distance', value: 100 },
];


export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();
  
  // Use the sitter store for sitter data
  const { 
    sitters, 
    filteredSitters, 
    fetchSitters, 
    filterSitters, 
    isLoading, 
    error
  } = useSitterStore();
  
  // Use the favorites store for favorites
  const {
    favoriteIds,
    fetchFavorites,
    toggleFavorite
  } = useFavoriteStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedServiceTypes, setSelectedServiceTypes] = useState<string[]>([]);
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Use maxDistance from user profile in auth store
  const maxDistance = user?.maxDistance || 25; // Default to 25 miles if not set
  
  // Fetch data on component mount
  useEffect(() => {
    fetchSitters();
    fetchFavorites();
    
  }, []);
  
  // Handle service type parameter from navigation
  useEffect(() => {
    if (params.serviceType && typeof params.serviceType === 'string') {
      // Map service type from parameter (e.g., "Dog Boarding") to service name in filter (e.g., "Boarding")
      const incomingServiceType = params.serviceType;
      
      // Find matching service in our serviceTypes array
      const matchedService = serviceTypes.find(service => {
        // Check if the incoming service type contains this service name
        return incomingServiceType.includes(service.name);
      });
      
      if (matchedService && !selectedServiceTypes.includes(matchedService.name)) {
        setSelectedServiceTypes([matchedService.name]);
        // Automatically show filters when navigated with a serviceType
        setShowFilters(true);
      }
    }
  }, [params.serviceType]);

  // Apply filters whenever filter criteria change
  useEffect(() => {
    const filters: SitterFilters = {
      serviceTypes: selectedServiceTypes,
      priceRanges: selectedPriceRanges,
      searchQuery,
      maxDistance
    };
    
    filterSitters(filters);
  }, [selectedServiceTypes, selectedPriceRanges, searchQuery, maxDistance, filterSitters]);

  const toggleServiceType = (name: string) => {
    if (selectedServiceTypes.includes(name)) {
      setSelectedServiceTypes(selectedServiceTypes.filter(item => item !== name));
    } else {
      setSelectedServiceTypes([...selectedServiceTypes, name]);
    }
  };

  const togglePriceRange = (name: string) => {
    if (selectedPriceRanges.includes(name)) {
      setSelectedPriceRanges(selectedPriceRanges.filter(item => item !== name));
    } else {
      setSelectedPriceRanges([...selectedPriceRanges, name]);
    }
  };

  const handleToggleFavorite = async (sitterId: string) => {
    await toggleFavorite(sitterId);
  };

  // Get current distance display option
  const getCurrentDistanceDisplay = () => {
    const option = distanceOptions.find(opt => opt.value === maxDistance);
    return option ? option.name : `${maxDistance} miles`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Find a Sitter</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <SearchIcon size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or location"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {showFilters && (
        <Animated.View 
          style={styles.filtersContainer}
          entering={FadeInDown.duration(300)}
        >
          <Text style={styles.filterTitle}>Service Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
            {serviceTypes.map(service => (
              <TouchableOpacity
                key={service.id}
                style={[
                  styles.filterChip,
                  selectedServiceTypes.includes(service.name) && styles.filterChipSelected,
                ]}
                onPress={() => toggleServiceType(service.name)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedServiceTypes.includes(service.name) && styles.filterChipTextSelected,
                  ]}
                >
                  {service.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.filterTitle}>Price Range</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
            {priceRanges.map(range => (
              <TouchableOpacity
                key={range.id}
                style={[
                  styles.filterChip,
                  selectedPriceRanges.includes(range.name) && styles.filterChipSelected,
                ]}
                onPress={() => togglePriceRange(range.name)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedPriceRanges.includes(range.name) && styles.filterChipTextSelected,
                  ]}
                >
                  {range.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.filterTitle}>Distance (Current: {getCurrentDistanceDisplay()})</Text>
          <Text style={styles.filterDescription}>
            You can change your maximum distance in profile settings
          </Text>
        </Animated.View>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#63C7B8" />
          <Text style={styles.loadingText}>Finding sitters near you...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredSitters}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.sittersList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No sitters found</Text>
              <Text style={styles.emptyText}>
                {(filteredSitters.length === 0 && sitters.length > 0) 
                  ? "Try adjusting your filters or search criteria" 
                  : `No sitters found within ${maxDistance} miles of your location`}
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <Animated.View 
              entering={FadeInDown.delay(index * 100).duration(400)}
            >
              <TouchableOpacity 
                style={styles.sitterCard}
                onPress={() => {
                  if (item.id) {
                    router.push(`/sitter/${item.id}`);
                  }
                }}
              >
                <Image source={{ uri: item.image }} style={styles.sitterImage} />
                <View style={styles.sitterInfo}>
                  <View style={styles.sitterNameRow}>
                    <Text style={styles.sitterName}>{item.name}</Text>
                    {item.verified && (
                      <View style={styles.verifiedBadge}>
                        <Text style={styles.verifiedText}>Verified</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.ratingContainer}>
                    <Star size={16} color="#FFD700" fill="#FFD700" />
                   
                    <Text style={styles.ratingText}> 
                      {item.rating} 
                      <Text style={styles.reviewsText}> ({item.reviews} reviews)</Text>
                    </Text>
                  </View>
                  <View style={styles.locationContainer}>
                    <MapPin size={14} color="#8E8E93" />
                    <Text style={styles.locationText}>
                      {`${item.distance} miles away`} 
                    </Text>
                  </View>
                  <View style={styles.servicesContainer}>
                    {item.services && item.services.map((service, index) => (
                      <View key={index} style={styles.serviceTag}>
                        <Text style={styles.serviceTagText}>{service}</Text>
                      </View>
                    ))}
                  </View>
                  
                <View style={styles.priceContainer}>
                  {item.boardingRate && item.boardingRate > 0 ? (
                    <View style={styles.priceTag}>
                      <Text style={styles.priceLabel}>Boarding</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                        <Text style={styles.priceValue}>${Number(item.boardingRate).toFixed(0)}</Text>
                        <Text style={styles.priceUnit}>/night</Text>
                      </View>
                    </View>
                  ) : null }

                  {item.walkingRate && item.walkingRate > 0 ? (
                    <View style={styles.priceTag}>
                      <Text style={styles.priceLabel}>Walking</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                        <Text style={styles.priceValue}>${Number(item.walkingRate).toFixed(0)}</Text>
                        <Text style={styles.priceUnit}>/hour</Text>
                      </View>
                    </View>
                  ) : null}

                  {item.sittingRate && item.sittingRate > 0 ? (
                    <View style={styles.priceTag}>
                      <Text style={styles.priceLabel}>Sitting</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                        <Text style={styles.priceValue}>${Number(item.sittingRate).toFixed(0)}</Text>
                        <Text style={styles.priceUnit}>/visit</Text>
                      </View>
                    </View>
                  ) : null}

                  {item.daycareRate && item.daycareRate > 0 ? (
                    <View style={styles.priceTag}>
                      <Text style={styles.priceLabel}>Daycare</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                        <Text style={styles.priceValue}>${Number(item.daycareRate).toFixed(0)}</Text>
                        <Text style={styles.priceUnit}>/day</Text>
                      </View>
                    </View>
                  ) : null}
                </View>
                </View>
                <TouchableOpacity 
                  style={styles.favoriteButton}
                  onPress={() => handleToggleFavorite(item.id)}
                >
                  <Heart 
                    size={20} 
                    color={favoriteIds.includes(item.id) ? "#FF3B30" : "#8E8E93"} 
                    fill={favoriteIds.includes(item.id) ? "#FF3B30" : "transparent"} 
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            </Animated.View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    marginRight: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#1A1A1A',
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#63C7B8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1A1A1A',
    marginBottom: 8,
  },
  filterDescription: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 16,
  },
  filterScrollView: {
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    marginRight: 8,
  },
  filterChipSelected: {
    backgroundColor: '#63C7B8',
  },
  filterChipText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#8E8E93',
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
  sittersList: {
    padding: 16,
    paddingBottom: 100,
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
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
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
  priceContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 6,
  },
  priceTag: {
    backgroundColor: '#F2F9F8',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E0F2F1',
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: '#63C7B8',
    marginRight: 4,
  },
  priceValue: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#63C7B8',
  },
  priceUnit: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#63C7B8',
  },
  favoriteButton: {
    padding: 8,
    position: 'absolute',
    top: 8,
    right: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1A1A1A',
    marginBottom: 8,
  },
  emptyText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
});