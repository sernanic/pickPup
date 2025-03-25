import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Controller, Control, FieldValues, Path, FieldError } from 'react-hook-form';

interface FormInputProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  error?: FieldError;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad' | 'numeric' | 'email-address' | 'phone-pad';
}

export function FormInput<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  secureTextEntry,
  multiline,
  numberOfLines,
  error,
  keyboardType = 'default',
}: FormInputProps<T>) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={[
              styles.input,
              multiline && { height: numberOfLines ? numberOfLines * 24 : 100, textAlignVertical: 'top' },
              error && styles.errorInput,
            ]}
            onBlur={onBlur}
            onChangeText={onChange}
            value={value?.toString()}
            placeholder={placeholder}
            secureTextEntry={secureTextEntry}
            multiline={multiline}
            numberOfLines={numberOfLines}
            keyboardType={keyboardType}
          />
        )}
      />
      {error && <Text style={styles.errorText}>{error.message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#1A1A1A',
    marginBottom: 6,
  },
  input: {
    fontFamily: 'Poppins-Regular',
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#1A1A1A',
    backgroundColor: '#FFFFFF',
  },
  errorInput: {
    borderColor: '#FF3B30',
  },
  errorText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
}); 