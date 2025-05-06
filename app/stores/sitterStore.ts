import { create } from 'zustand';
import { supabase } from '../../app/lib/supabase';
import * as Location from 'expo-location';
import { useAuthStore } from './authStore';

// Type for sitter info
export interface Sitter {
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
  bio?: string;
  averageRating?: number;
  totalReviews?: number;
  background_url?: string;
}

// Type for filtered parameters
export interface SitterFilters {
  serviceTypes: string[];
  priceRanges: string[];
  maxDistance?: number;
  searchQuery?: string;
}

interface SitterState {
  sitters: Sitter[];
  filteredSitters: Sitter[];
  isLoading: boolean;
  error: string | null;
  lastFetchTime: number | null;
  
  // Actions
  fetchSitters: () => Promise<void>;
  filterSitters: (filters: SitterFilters) => void;
  getSitterById: (id: string) => Sitter | undefined;
  
  // Location-related state
  userLocation: { latitude: number; longitude: number } | null;
  locationSource: 'database' | 'device' | 'default' | 'unknown';
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

// How often to refresh sitter data (in milliseconds)
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useSitterStore = create<SitterState>((set, get) => ({
  sitters: [],
  filteredSitters: [],
  isLoading: false,
  error: null,
  userLocation: null,
  locationSource: 'unknown',
  lastFetchTime: null,
  
  fetchSitters: async () => {
    const { user } = useAuthStore.getState();
    const currentState = get();
    
    // Check if we have cached data that's still fresh
    const now = Date.now();
    if (
      currentState.lastFetchTime && 
      (now - currentState.lastFetchTime < CACHE_DURATION) && 
      currentState.sitters.length > 0
    ) {
      // If we have recent data, just use the existing data
      // This prevents unnecessary API calls
      console.log('Using cached sitter data');
      return;
    }
    
    if (!user) {
      set({ 
        error: "User not authenticated", 
        isLoading: false,
        sitters: [], 
        filteredSitters: [] 
      });
      return;
    }
    
    // Only set loading state if we don't have any sitters already
    if (currentState.sitters.length === 0) {
      set({ isLoading: true });
    }
    set({ error: null });
    
    try {
      // Variables to store location info (either from database or device)
      let userLat: number = 0;
      let userLon: number = 0;
      let locationSource: 'database' | 'device' | 'default' | 'unknown' = 'unknown';
      
      // Use existing location if available, otherwise fetch new location
      if (currentState.userLocation) {
        userLat = currentState.userLocation.latitude;
        userLon = currentState.userLocation.longitude;
        locationSource = currentState.locationSource;
      } else {
        // Step 1: Try to get user's primary address from the database
        const { data: userAddress, error: userAddressError } = await supabase
          .from('addresses')
          .select('*')
          .eq('profile_id', user.id)
          .eq('is_primary', true);
        
        // If no address found in addresses table, try useraddress table
        let primaryAddress = null;
        if (!userAddressError && userAddress && userAddress.length > 0) {
          primaryAddress = userAddress[0];
        } else {
          const { data: userAddressAlt, error: userAddressAltError } = await supabase
            .from('useraddress')
            .select('*')
            .eq('profile_id', user.id)
            .eq('is_primary', true);
            
          if (!userAddressAltError && userAddressAlt && userAddressAlt.length > 0) {
            primaryAddress = userAddressAlt[0];
          }
        }
        
        // Now use primaryAddress if found in either table
        if (primaryAddress) {
          userLat = parseFloat(primaryAddress.latitude.toString());
          userLon = parseFloat(primaryAddress.longitude.toString());
          locationSource = 'database';
        } else {
          // No address in either table, fall back to device location
          
          // Request location permissions
          const { status } = await Location.requestForegroundPermissionsAsync();
          
          if (status !== 'granted') {
            set({ 
              error: 'Location permission is required to see nearby sitters',
              isLoading: false,
              sitters: [],
              filteredSitters: [] 
            });
            return;
          }
          
          // Get current location
          try {
            const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            
            // Check if the location is reasonable - avoid using test/simulator coordinates
            // These coordinates are around Silicon Valley/Mountain View
            const isCalifornia = 
              location.coords.latitude > 36 && location.coords.latitude < 38 && 
              location.coords.longitude < -121 && location.coords.longitude > -123;
              
            if (isCalifornia) {
              userLat = 26.4563242; // Delray Beach coordinates
              userLon = -80.0955221;
              locationSource = 'default';
            } else {
              userLat = location.coords.latitude;
              userLon = location.coords.longitude;
              locationSource = 'device';
            }
            
          } catch (locationError) {
            // Add default location in Florida as fallback instead of showing error
            userLat = 26.4563242; // Delray Beach coordinates
            userLon = -80.0955221;
            locationSource = 'default';
            set({ error: 'Unable to determine your location. Using default location.' });
          }
        }
        
        // Save user location to state
        set({ 
          userLocation: { latitude: userLat, longitude: userLon },
          locationSource
        });
      }
      
      // Step 2: Get all sitters in a single batch
      const { data: allSitters, error: allSittersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'sitter');
        
      if (allSittersError) {
        throw allSittersError;
      }
      
      // Step 3: Make batch queries for sitter data instead of individual queries
      
      // Get all sitter IDs except the current user
      const sitterIds = allSitters
        ?.filter(sitter => sitter.id !== user.id)
        .map(sitter => sitter.id) || [];
      
      if (sitterIds.length === 0) {
        set({ 
          sitters: [],
          filteredSitters: [],
          isLoading: false,
          lastFetchTime: now
        });
        return;
      }
      
      // Fetch all primary addresses for all sitters in one query
      const { data: allAddresses, error: allAddressesError } = await supabase
        .from('addresses')
        .select('*')
        .in('profile_id', sitterIds)
        .eq('is_primary', true);
        
      if (allAddressesError) {
        throw allAddressesError;
      }
      
      // Create a map of sitter IDs to their addresses for quick lookup
      const sitterAddressMap = new Map();
      allAddresses?.forEach(address => {
        sitterAddressMap.set(address.profile_id, address);
      });
      
      // Fetch all reviews for all sitters in one query
      const { data: allReviews, error: allReviewsError } = await supabase
        .from('reviews')
        .select('sitter_id, rating')
        .in('sitter_id', sitterIds);
        
      if (allReviewsError) {
        throw allReviewsError;
      }
      
      // Process reviews into a map of sitter ID to review stats
      const reviewsMap = new Map();
      allReviews?.forEach(review => {
        if (!reviewsMap.has(review.sitter_id)) {
          reviewsMap.set(review.sitter_id, { sum: 0, count: 0 });
        }
        const stats = reviewsMap.get(review.sitter_id);
        stats.sum += review.rating;
        stats.count += 1;
      });
      
      // Fetch all sitter info in one query
      const { data: allSitterInfo, error: allSitterInfoError } = await supabase
        .from('sitter_info')
        .select('*')
        .in('sitter_id', sitterIds);
        
      if (allSitterInfoError) {
        throw allSitterInfoError;
      }
      
      // Create a map of sitter IDs to their info for quick lookup
      const sitterInfoMap = new Map();
      allSitterInfo?.forEach(info => {
        sitterInfoMap.set(info.sitter_id, info);
      });
      
      // Process all sitters with the batch data we collected
      const sittersWithDetails: Sitter[] = [];
      
      for (const sitter of allSitters || []) {
        // Skip if sitter is the current user (already filtered in sitterIds)
        if (sitter.id === user.id) {
          continue;
        }
        
        const sitterAddress = sitterAddressMap.get(sitter.id);
        
        if (sitterAddress) {
          const distance = calculateDistance(
            userLat,
            userLon,
            parseFloat(sitterAddress.latitude),
            parseFloat(sitterAddress.longitude)
          );
          
          // Get sitter's reviews from our preprocessed map
          const reviewStats = reviewsMap.get(sitter.id);
          let averageRating = 0;
          let totalReviews = 0;
          
          if (reviewStats) {
            totalReviews = reviewStats.count;
            averageRating = parseFloat((reviewStats.sum / reviewStats.count).toFixed(1));
          }
          
          // Get sitter info from our preprocessed map
          const sitterInfo = sitterInfoMap.get(sitter.id);
          
          // Services offered by this sitter with their actual rates
          let services: string[] = [];
          let boardingRate = 0;
          let walkingRate = 0;
          let sittingRate = 0;
          let daycareRate = 0;
          
          if (sitterInfo) {
            // Only add services with rates > 0
            if (sitterInfo.boarding_rate_per_day && sitterInfo.boarding_rate_per_day > 0) {
              services.push('Boarding');
              boardingRate = parseFloat(sitterInfo.boarding_rate_per_day);
            }
            
            if (sitterInfo.walking_rate_per_hour && sitterInfo.walking_rate_per_hour > 0) {
              services.push('Walking');
              walkingRate = parseFloat(sitterInfo.walking_rate_per_hour);
            }
            
            if (sitterInfo.sitting_rate_per_visit && sitterInfo.sitting_rate_per_visit > 0) {
              services.push('Sitting');
              sittingRate = parseFloat(sitterInfo.sitting_rate_per_visit);
            }
            
            if (sitterInfo.daycare_rate_per_day && sitterInfo.daycare_rate_per_day > 0) {
              services.push('Daycare');
              daycareRate = parseFloat(sitterInfo.daycare_rate_per_day);
            }
            
            if (sitterInfo.training_rate_per_hour && sitterInfo.training_rate_per_hour > 0) {
              services.push('Training');
            }
          }
          
          // Choose the appropriate price to display based on preference order
          let displayPrice = 35;
          let priceLabel = '/night';
          
          if (boardingRate > 0) {
            displayPrice = boardingRate;
            priceLabel = '/night';
          } else if (walkingRate > 0) {
            displayPrice = walkingRate;
            priceLabel = '/hour';
          } else if (sittingRate > 0) {
            displayPrice = sittingRate;
            priceLabel = '/visit';
          } else if (daycareRate > 0) {
            displayPrice = daycareRate;
            priceLabel = '/day';
          }
          
          // Add all sitters to our results list, regardless of distance
          sittersWithDetails.push({
            id: sitter.id,
            name: sitter.name || 'Unknown Sitter',
            rating: averageRating || 0,
            reviews: totalReviews || 0,
            distance,
            price: displayPrice,
            priceLabel,
            image: sitter.avatar_url || 'https://via.placeholder.com/150',
            verified: true,
            services,
            boardingRate,
            walkingRate,
            sittingRate,
            daycareRate,
            bio: sitter.bio || '',
            averageRating,
            totalReviews,
            background_url: sitter.background_url
          });
        }
      }
      
      // Sort sitters by rating and distance
      const sortedSitters = sittersWithDetails.sort((a, b) => {
        // First prioritize sitters with reviews
        const aHasReviews = a.totalReviews && a.totalReviews > 0;
        const bHasReviews = b.totalReviews && b.totalReviews > 0;
        
        if (aHasReviews && !bHasReviews) return -1;
        if (!aHasReviews && bHasReviews) return 1;
        
        // Then compare by rating for sitters who both have reviews
        if (aHasReviews && bHasReviews) {
          if (a.rating !== b.rating) {
            return b.rating - a.rating; // Higher rating first
          }
        }
        
        // Finally, sort by distance
        return a.distance - b.distance;
      });
      
      // `sitters` state will hold the master sorted list, NOT pre-filtered by user's profile maxDistance.
      // `filteredSitters` will be initialized here, filtered by user's profile maxDistance for the SearchScreen.
      const userProfileMaxDistance = user ? user.maxDistance : undefined;

      const initialFilteredSittersForSearch = userProfileMaxDistance
        ? sortedSitters.filter(sitter => sitter.distance <= userProfileMaxDistance)
        : sortedSitters;
      
      set({ 
        sitters: sortedSitters, // Master list, only sorted
        filteredSitters: initialFilteredSittersForSearch, // Initial list for search screen
        isLoading: false,
        lastFetchTime: now
      });
    } catch (err: any) {
      console.log('Error fetching sitters:', err);
      set({ 
        error: err.message, 
        isLoading: false 
      });
    }
  },
  
  filterSitters: (filters: SitterFilters) => {
    const { sitters } = get(); // Start with the master, sorted list
    const { user } = useAuthStore.getState();
    
    // Determine the max distance to use for filtering:
    // 1. If filters.maxDistance is provided (from Search UI), use that.
    // 2. Else, if user has a maxDistance preference in their profile, use that.
    // 3. Otherwise, no distance filtering.
    const distanceToApply = filters.maxDistance !== undefined 
                            ? filters.maxDistance 
                            : (user?.maxDistance);

    const newlyFiltered = sitters.filter(sitter => {
      // Apply distance filter first
      if (distanceToApply !== undefined && sitter.distance > distanceToApply) {
        return false;
      }

      // Filter by search query
      if (filters.searchQuery && !sitter.name.toLowerCase().includes(filters.searchQuery.toLowerCase())) {
        return false;
      }

      // Filter by service types using actual service rates
      if (filters.serviceTypes.length > 0) {
        const hasSelectedService = filters.serviceTypes.some(serviceType => {
          if (serviceType === 'Boarding') return sitter.boardingRate && sitter.boardingRate > 0;
          if (serviceType === 'Walking') return sitter.walkingRate && sitter.walkingRate > 0;
          if (serviceType === 'Sitting') return sitter.sittingRate && sitter.sittingRate > 0;
          if (serviceType === 'Daycare') return sitter.daycareRate && sitter.daycareRate > 0;
          if (serviceType === 'Training') return sitter.services?.includes('Training'); // Check if services array exists
          return false;
        });
        
        if (!hasSelectedService) return false;
      }

      // Filter by price range using display price
      if (filters.priceRanges.length > 0) {
        const priceRangeMatch = filters.priceRanges.some(range => {
          if (range === '$0-$25' && sitter.price <= 25) return true;
          if (range === '$25-$50' && sitter.price > 25 && sitter.price <= 50) return true;
          if (range === '$50-$75' && sitter.price > 50 && sitter.price <= 75) return true;
          if (range === '$75+' && sitter.price > 75) return true;
          return false;
        });
        if (!priceRangeMatch) return false;
      }

      // The filters.maxDistance is handled by distanceToApply at the beginning

      return true;
    });
    
    set({ filteredSitters: newlyFiltered });
    // No need to return the list, components will react to store changes
  },
  
  getSitterById: (id: string) => {
    const { sitters } = get();
    return sitters.find(sitter => sitter.id === id);
  }
})); 