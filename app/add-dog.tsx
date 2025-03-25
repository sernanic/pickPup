import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FormInput } from './components/form-input';
import { FormSwitch } from './components/form-switch';
import { FormSelect } from './components/form-select';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

const schema = yup.object({
  name: yup.string().required('Pet name is required'),
  breed: yup.string(),
  age: yup.number().positive('Age must be positive').nullable(),
  gender: yup.string().oneOf(['male', 'female', 'unknown'], 'Invalid gender').required('Gender is required'),
  is_neutered: yup.boolean().required(),
  weight: yup.number().positive('Weight must be positive').nullable(),
  image_url: yup.string().url('Must be a valid URL').nullable(),
}).required();

type FormData = yup.InferType<typeof schema>;

const genderOptions = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Unknown', value: 'unknown' }
];

export default function AddDogScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      name: '',
      breed: '',
      age: null,
      gender: 'unknown',
      is_neutered: false,
      weight: null,
      image_url: '',
    }
  });

  const onSubmit = async (data: FormData) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to add a pet');
      return;
    }

    try {
      setIsSubmitting(true);

      const { data: petData, error } = await supabase
        .from('pets')
        .insert([
          {
            ...data,
            owner_id: user.id,
          }
        ])
        .select()
        .single();

      if (error) throw error;

      Alert.alert(
        'Success',
        'Your pet has been added successfully',
        [{ text: 'OK', onPress: () => router.replace('/profile') }]
      );

    } catch (error: any) {
      console.error('Error adding pet:', error);
      Alert.alert('Error', error.message || 'Failed to add pet. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top }]}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.replace('/profile')}
          >
            <ArrowLeft size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.title}>Add Pet</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.formContainer}>
          <FormInput
            control={control}
            name="name"
            label="Pet Name"
            placeholder="Enter your pet's name"
            error={errors.name}
          />

          <FormInput
            control={control}
            name="breed"
            label="Breed"
            placeholder="Enter your pet's breed"
            error={errors.breed}
          />

          <FormInput
            control={control}
            name="age"
            label="Age (years)"
            placeholder="Enter your pet's age"
            keyboardType="decimal-pad"
            error={errors.age}
          />

          <FormSelect
            control={control}
            name="gender"
            label="Gender"
            options={genderOptions}
            error={errors.gender}
          />

          <FormSwitch
            control={control}
            name="is_neutered"
            label="Spayed/Neutered"
            error={errors.is_neutered}
          />

          <FormInput
            control={control}
            name="weight"
            label="Weight (kg)"
            placeholder="Enter your pet's weight"
            keyboardType="decimal-pad"
            error={errors.weight}
          />

          <FormInput
            control={control}
            name="image_url"
            label="Image URL"
            placeholder="https://example.com/pet-image.jpg"
            error={errors.image_url}
          />

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Add Pet</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    color: '#1A1A1A',
  },
  formContainer: {
    marginBottom: 24,
  },
  submitButton: {
    backgroundColor: '#63C7B8',
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    backgroundColor: '#A0CCC5',
  },
  submitButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
}); 