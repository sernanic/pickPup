import { ImageSourcePropType } from 'react-native';

export interface Service {
  id: string;
  title: string;
  icon: ImageSourcePropType;
}

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
  services?: string[];
  boardingRate?: number;
  walkingRate?: number;
  sittingRate?: number;
  daycareRate?: number;
  bio?: string;
  averageRating?: number;
  totalReviews?: number;
}

export interface FeaturedSitter extends Sitter {
  coverImage: string;
} 