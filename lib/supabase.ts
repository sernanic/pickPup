import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';

// Create a single supabase client for interacting with your database
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
    debug: false, // Disable debug logs
  },
});

// Add error handler for auth errors
supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
  // Only log critical auth events in development
  if (__DEV__ && ['SIGNED_OUT', 'SIGNED_IN', 'USER_DELETED'].includes(event)) {
    console.log(`Auth event: ${event}`);
  }
});