import React from 'react';
import { ImageBackground, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function PupOnboardingScreen() {
  const router = useRouter();

  return (
    <View style={styles.redContainer}>
      <ImageBackground
        source={require('../../assets/images/pupOnboardingBackground.png')}
        style={styles.background}
      >
        <View style={styles.container}>
          <Text style={styles.title}>Let's onboard your pup!</Text>
          <Text style={styles.subtitle}>Add your pup's details to get started.</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/(profile)/pets?onboarding=true')}
          >
            <Text style={styles.buttonText}>Add Pup</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  redContainer: {
    flex: 1,
    backgroundColor: '#FEFEF5',
    width: '100%',
  },
  background: {
    flex: 1,
    width: '100%',
    height: '89%',
    marginTop:150
  },
  container: {
    marginTop: '75%',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#63C7B8',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
