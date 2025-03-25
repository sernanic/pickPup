import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { Controller, Control, FieldValues, Path, FieldError } from 'react-hook-form';

interface FormSwitchProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  error?: FieldError;
}

export function FormSwitch<T extends FieldValues>({
  control,
  name,
  label,
  error,
}: FormSwitchProps<T>) {
  return (
    <View style={styles.container}>
      <View style={styles.switchRow}>
        <Text style={styles.label}>{label}</Text>
        <Controller
          control={control}
          name={name}
          render={({ field: { onChange, value } }) => (
            <Switch
              value={Boolean(value)}
              onValueChange={onChange}
              trackColor={{ false: '#E5E5EA', true: '#A78BFA' }}
              thumbColor={value ? '#63C7B8' : '#FFFFFF'}
            />
          )}
        />
      </View>
      {error && <Text style={styles.errorText}>{error.message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#1A1A1A',
  },
  errorText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
}); 