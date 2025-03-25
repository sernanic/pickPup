export interface Service {
  id: string;
  title: string;
  icon: string;
}

export interface Sitter {
  id: string;
  name: string;
  rating: number;
  reviews: number;
  distance: number;
  price: number;
  image: string;
  verified: boolean;
}

export interface FeaturedSitter {
  id: string;
  name: string;
  rating: number;
  reviews: number;
  image: string;
  coverImage: string;
  verified: boolean;
} 