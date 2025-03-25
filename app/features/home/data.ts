import { Service, Sitter, FeaturedSitter } from './types';

export const services: Service[] = [
  { id: '1', title: 'Dog Boarding', icon: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?q=80&w=200&auto=format&fit=crop' },
  { id: '2', title: 'Dog Walking', icon: 'https://images.unsplash.com/photo-1601758174114-e711c0cbaa69?q=80&w=200&auto=format&fit=crop' },
  { id: '3', title: 'In-Home Sitting', icon: 'https://images.unsplash.com/photo-1541364983171-a8ba01e95cfc?q=80&w=200&auto=format&fit=crop' },
  { id: '4', title: 'Dog Training', icon: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?q=80&w=200&auto=format&fit=crop' },
];

export const sitters: Sitter[] = [
  {
    id: '1',
    name: 'Emma Wilson',
    rating: 4.9,
    reviews: 124,
    distance: 1.2,
    price: 35,
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop',
    verified: true,
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
  },
];

export const featuredSitters: FeaturedSitter[] = [
  {
    id: '1',
    name: 'Sarah Parker',
    rating: 4.9,
    reviews: 215,
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
    coverImage: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?q=80&w=600&auto=format&fit=crop',
    verified: true,
  },
  {
    id: '2',
    name: 'David Miller',
    rating: 4.8,
    reviews: 178,
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop',
    coverImage: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?q=80&w=600&auto=format&fit=crop',
    verified: true,
  },
]; 