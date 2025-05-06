import 'react-native-get-random-values';
import { supabase } from './supabase';
import { Address } from '../features/profile/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Fetch all useraddress for a user profile
 */
export async function getAddressesByProfileId(profileId: string): Promise<Address[]> {
  try {
    const { data, error } = await supabase
      .from('useraddress')
      .select('*')
      .eq('profile_id', profileId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.log('Error fetching useraddress:', error);
    throw error;
  }
}

/**
 * Create or update an address
 */
export async function upsertAddress(address: Partial<Address>): Promise<Address> {
  try {
    // If no ID provided, create a new one
    const addressToSave = {
      ...address,
      id: address.id || uuidv4(),
      updated_at: new Date().toISOString()
    };

    // Add location point if latitude and longitude are provided
    if (addressToSave.longitude !== undefined && addressToSave.latitude !== undefined) {
      // For PostgreSQL point type, we need to format it as (x,y) where x is longitude and y is latitude
      addressToSave.location = `(${addressToSave.longitude},${addressToSave.latitude})`;
    }

    // Create or update the address
    const { data, error } = await supabase
      .from('useraddress')
      .upsert(addressToSave)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.log('Error saving address:', error);
    throw error;
  }
}

/**
 * Set an address as primary for a user
 */
export async function setPrimaryAddress(addressId: string, profileId: string): Promise<void> {
  try {
    // First, set all useraddress for this profile to non-primary
    const { error: updateError } = await supabase
      .from('useraddress')
      .update({ is_primary: false })
      .eq('profile_id', profileId);

    if (updateError) throw updateError;

    // Then set the selected address to primary
    const { error } = await supabase
      .from('useraddress')
      .update({ is_primary: true })
      .eq('id', addressId)
      .eq('profile_id', profileId);

    if (error) throw error;
  } catch (error) {
    console.log('Error setting primary address:', error);
    throw error;
  }
}

/**
 * Delete an address
 */
export async function deleteAddress(addressId: string, profileId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('useraddress')
      .delete()
      .eq('id', addressId)
      .eq('profile_id', profileId);

    if (error) throw error;
  } catch (error) {
    console.log('Error deleting address:', error);
    throw error;
  }
} 