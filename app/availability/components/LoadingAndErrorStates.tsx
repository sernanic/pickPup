import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

interface LoadingStateProps {
  message?: string;
}

interface ErrorStateProps {
  message: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Loading availability...' }) => {
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#63C7B8" />
      <Text>{message}</Text>
    </View>
  );
};

export const ErrorState: React.FC<ErrorStateProps> = ({ message }) => {
  return (
    <View style={styles.centered}>
      <Text style={styles.errorText}>Error: {message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    marginTop: 10,
    textAlign: 'center',
  },
});
