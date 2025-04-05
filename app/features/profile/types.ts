export interface Dog {
  id: string;
  name: string;
  breed: string;
  age: number;
  image: string;
}

export interface Pet {
  id: string;
  owner_id: string;
  name: string;
  breed: string | null;
  age: number | null;
  gender: 'male' | 'female' | 'unknown';
  is_neutered: boolean;
  weight: number | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Address {
  id: string;
  profile_id: string;
  formatted_address: string;
  street_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  location?: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: 'owner' | 'sitter';
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  maxdistance?: string;
  phoneNumber?: string;
  stripe_account_id?: string;
  stripe_customer_id?: string;
  pets?: Pet[];
  addresses?: Address[];
}

export interface MenuItemProps {
  icon: React.ReactNode;
  text: string;
  rightElement?: React.ReactNode;
  onPress?: () => void;
} 