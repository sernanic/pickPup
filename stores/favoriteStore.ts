import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import { Sitter } from './sitterStore';

export interface Favorite {
  id: string;
  owner_id: string;
  sitter_id: string;
  created_at: string;
  profiles: {
    id?: string;
    name?: string;
    avatar_url?: string;
    background_url?: string;
    role?: string;
  }[];
  sitter?: Sitter; // Optional sitter details when joined
}

interface FavoriteState {
  favorites: Favorite[];
  favoriteIds: string[]; // Just the IDs for easy checking
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchFavorites: () => Promise<void>;
  addFavorite: (sitterId: string) => Promise<boolean>;
  removeFavorite: (sitterId: string) => Promise<boolean>;
  isFavorite: (sitterId: string) => boolean;
  toggleFavorite: (sitterId: string) => Promise<boolean>;
}

export const useFavoriteStore = create<FavoriteState>((set, get) => ({
  favorites: [],
  favoriteIds: [],
  isLoading: false,
  error: null,
  
  fetchFavorites: async () => {
    const { user } = useAuthStore.getState();
    
    if (!user) {
      set({ 
        error: "User not authenticated", 
        isLoading: false,
        favorites: [],
        favoriteIds: [] 
      });
      return;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      // Fetch the user's favorites with sitter details
      const { data, error } = await supabase
        .from('favorites')
        .select(`
          id,
          owner_id,
          sitter_id,
          created_at,
          profiles:sitter_id (
            id,
            name,
            avatar_url,
            background_url,
            role
          )
        `)
        .eq('owner_id', user.id);
      
      if (error) throw error;
      
      // Map the returned data to include just the sitter IDs for easy checking
      const favoriteIds = data.map(fav => fav.sitter_id);
      
      set({ 
        favorites: data,
        favoriteIds,
        isLoading: false
      });
    } catch (err: any) {
      console.error('Error fetching favorites:', err);
      set({ 
        error: err.message, 
        isLoading: false 
      });
    }
  },
  
  addFavorite: async (sitterId: string) => {
    const { user } = useAuthStore.getState();
    
    if (!user) {
      set({ error: "User not authenticated" });
      return false;
    }
    
    try {
      // Insert the new favorite
      const { data, error } = await supabase
        .from('favorites')
        .insert({
          owner_id: user.id,
          sitter_id: sitterId
        })
        .select();
      
      if (error) throw error;
      
      // Update local state
      const { favorites, favoriteIds } = get();
      set({ 
        favorites: [...favorites, data[0]],
        favoriteIds: [...favoriteIds, sitterId]
      });
      
      return true;
    } catch (err: any) {
      console.error('Error adding favorite:', err);
      set({ error: err.message });
      return false;
    }
  },
  
  removeFavorite: async (sitterId: string) => {
    const { user } = useAuthStore.getState();
    
    if (!user) {
      set({ error: "User not authenticated" });
      return false;
    }
    
    try {
      // Delete the favorite
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('owner_id', user.id)
        .eq('sitter_id', sitterId);
      
      if (error) throw error;
      
      // Update local state
      const { favorites, favoriteIds } = get();
      set({ 
        favorites: favorites.filter(fav => fav.sitter_id !== sitterId),
        favoriteIds: favoriteIds.filter(id => id !== sitterId)
      });
      
      return true;
    } catch (err: any) {
      console.error('Error removing favorite:', err);
      set({ error: err.message });
      return false;
    }
  },
  
  isFavorite: (sitterId: string) => {
    return get().favoriteIds.includes(sitterId);
  },
  
  toggleFavorite: async (sitterId: string) => {
    const isFavorite = get().isFavorite(sitterId);
    
    if (isFavorite) {
      return await get().removeFavorite(sitterId);
    } else {
      return await get().addFavorite(sitterId);
    }
  }
})); 