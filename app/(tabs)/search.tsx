import { useState, useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, FlatList, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search as SearchIcon, Filter, MapPin, Star, Heart } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

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

// Sample data for sitters
const sitters = [
  {
    id: '1',
    name: 'Emma Wilson',
    rating: 4.9,
    reviews: 124,
    distance: 1.2,
    price: 35,
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop',
    verified: true,
    services: ['Boarding', 'Walking'],
  },
  {
    id: '2',
    name: 'Michael Brown',
    rating: 4.7,
    reviews: 98,
    distance: 2.5,
    price: 30,
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
    verified: true,
    services: ['Sitting', 'Walking'],
  },
  {
    id: '3',
    name: 'Sophia Garcia',
    rating: 4.8,
    reviews: 156,
    distance: 3.1,
    price: 40,
    image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=200&auto=format&fit=crop',
    verified: false,
    services: ['Training', 'Boarding'],
  },
  {
    id: '4',
    name: 'James Johnson',
    rating: 4.6,
    reviews: 87,
    distance: 4.2,
    price: 28,
    image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format&fit=crop',
    verified: true,
    services: ['Daycare', 'Walking'],
  },
  {
    id: '5',
    name: 'Olivia Martinez',
    rating: 4.9,
    reviews: 142,
    distance: 2.8,
    price: 45,
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
    verified: true,
    services: ['Boarding', 'Training'],
  },
  {
    id: '6',
    name: 'William Davis',
    rating: 4.5,
    reviews: 76,
    distance: 5.3,
    price: 32,
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop',
    verified: false,
    services: ['Sitting', 'Daycare'],
  },
];

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedServiceTypes, setSelectedServiceTypes] = useState<string[]>([]);
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
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

  const toggleFavorite = (id: string) => {
    if (favorites.includes(id)) {
      setFavorites(favorites.filter(item => item !== id));
    } else {
      setFavorites([...favorites, id]);
    }
  };

  // Filter sitters based on search query and selected filters
  const filteredSitters = sitters.filter(sitter => {
    // Filter by search query
    if (searchQuery && !sitter.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Filter by service types
    if (selectedServiceTypes.length > 0) {
      const hasSelectedService = sitter.services.some(service => 
        selectedServiceTypes.includes(service)
      );
      if (!hasSelectedService) return false;
    }

    // Filter by price range (simplified for demo)
    if (selectedPriceRanges.length > 0) {
      // This is a simplified implementation
      // In a real app, you would parse the price ranges and check if the sitter's price falls within any selected range
      const priceRangeMatch = selectedPriceRanges.some(range => {
        if (range === '$0-$25' && sitter.price <= 25) return true;
        if (range === '$25-$50' && sitter.price > 25 && sitter.price <= 50) return true;
        if (range === '$50-$75' && sitter.price > 50 && sitter.price <= 75) return true;
        if (range === '$75+' && sitter.price > 75) return true;
        return false;
      });
      if (!priceRangeMatch) return false;
    }

    return true;
  });

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
        </Animated.View>
      )}

      <FlatList
        data={filteredSitters}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.sittersList}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Animated.View entering={FadeInDown.duration(400)}>
            <TouchableOpacity style={styles.sitterCard}>
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
                  <Text style={styles.ratingText}>{item.rating}</Text>
                  <Text style={styles.reviewsText}>({item.reviews} reviews)</Text>
                </View>
                <View style={styles.locationContainer}>
                  <MapPin size={14} color="#8E8E93" />
                  <Text style={styles.locationText}>{item.distance} miles away</Text>
                </View>
                <View style={styles.servicesContainer}>
                  {item.services.map((service, index) => (
                    <View key={index} style={styles.serviceTag}>
                      <Text style={styles.serviceTagText}>{service}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.priceText}>${item.price}/night</Text>
              </View>
              <TouchableOpacity 
                style={styles.favoriteButton}
                onPress={() => toggleFavorite(item.id)}
              >
                <Heart 
                  size={20} 
                  color={favorites.includes(item.id) ? "#FF3B30" : "#8E8E93"} 
                  fill={favorites.includes(item.id) ? "#FF3B30" : "transparent"} 
                />
              </TouchableOpacity>
            </TouchableOpacity>
          </Animated.View>
        )}
      />
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