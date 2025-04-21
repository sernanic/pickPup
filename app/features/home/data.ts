import { Service } from './types';
import dogBoardingIcon from '@/assets/images/dogBoarding.png';
import dogWalkingIcon from '@/assets/images/walking.png';
import inHomeSittingIcon from '@/assets/images/inHomeSitting.png';
import dogTrainingIcon from '@/assets/images/training.png';

export const services: Service[] = [
  { id: '1', title: 'Dog Boarding', icon: dogBoardingIcon },
  { id: '2', title: 'Dog Walking', icon: dogWalkingIcon },
  { id: '3', title: 'In-Home Sitting', icon: inHomeSittingIcon },
  { id: '4', title: 'Dog Training', icon: dogTrainingIcon },
];
