import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export type UserRole = 'owner' | 'sitter';

interface UserSession {
  id: string;
  email: string;
  role: UserRole;
  name: string | null;
}

interface AuthState {
  user: UserSession | null;
  isLoading: boolean;
  error: string | null;
  initialized: boolean;
  
  // Auth actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: UserRole) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  
  // Session management
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  error: null,
  initialized: false,
  
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role, name')
        .eq('id', data.user?.id)
        .single();
      
      set({ 
        user: {
          id: data.user?.id || '',
          email: data.user?.email || '',
          role: profileData?.role as UserRole,
          name: profileData?.name || null,
        },
        isLoading: false 
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  register: async (email, password, name, role) => {
    set({ isLoading: true, error: null });
    try {
      // Step 1: Sign up the user with authentication service
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role,
          },
        },
      });
      
      if (authError) throw authError;
      if (!authData.user) throw new Error('User creation failed');

      // Step 2: Directly insert the profile without checking if it exists first
      // This is more reliable as RLS will prevent duplicate entries
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: authData.user.id,
            email: authData.user.email || '',
            name,
            role,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        ])
        .select();
      
      // If there's a profile error, it might be because the profile already exists
      // (due to database triggers or previous attempts)
      if (profileError) {
        console.log('Profile creation error, attempting to get existing profile:', profileError);
        
        // Try to get the existing profile
        const { data: existingProfile, error: fetchError } = await supabase
          .from('profiles')
          .select()
          .eq('id', authData.user.id)
          .maybeSingle(); // Use maybeSingle instead of single to avoid errors if no rows found
        
        if (fetchError || !existingProfile) {
          console.error('Failed to get or create profile:', fetchError || 'No profile created');
          // Sign out user if we can't create or find their profile
          await supabase.auth.signOut();
          throw new Error('Failed to create user profile');
        }
      }
      
      // Step 3: Set the user state
      set({ 
        user: {
          id: authData.user.id,
          email: authData.user.email || '',
          role,
          name,
        },
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      set({ 
        error: error.message, 
        isLoading: false,
        user: null 
      });
    }
  },
  
  resetPassword: async (email) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'io.pawsitter://reset-password',
      });
      
      if (error) throw error;
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  logout: async () => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ user: null, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  loadUser: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role, name')
          .eq('id', session.user.id)
          .single();
        
        set({
          user: {
            id: session.user.id,
            email: session.user.email || '',
            role: profileData?.role as UserRole,
            name: profileData?.name || null,
          },
          isLoading: false,
          initialized: true,
        });
      } else {
        set({ user: null, isLoading: false, initialized: true });
      }
    } catch (error: any) {
      console.error('Error loading user:', error.message);
      set({ 
        user: null, 
        isLoading: false, 
        error: error.message,
        initialized: true 
      });
    }
  },
})); 