import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { Mail, ChevronLeft } from 'lucide-react-native';
import { useAuthStore } from '../../stores/authStore';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isEmailSent, setIsEmailSent] = useState(false);
  
  const { resetPassword, isLoading, error } = useAuthStore();

  const handleResetPassword = async () => {
    try {
      await resetPassword(email);
      if (!error) {
        setIsEmailSent(true);
      } else {
        Alert.alert('Error', error);
      }
    } catch (err) {
      console.error('Password reset error:', err);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Forgot Password</Text>
        <View style={{ width: 24 }} />
      </View>

      {!isEmailSent ? (
        <>
          <Text style={styles.subtitle}>
            Enter your email address and we'll send you a link to reset your password.
          </Text>

          <View style={styles.inputContainer}>
            <Mail size={20} color="#8E8E93" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={isLoading || !email}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.successContainer}>
          <Mail size={64} color="#63C7B8" style={styles.successIcon} />
          <Text style={styles.successTitle}>Check your email</Text>
          <Text style={styles.successMessage}>
            We've sent a password reset link to {email}
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.replace('/login')}
          >
            <Text style={styles.buttonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1A1A1A',
  },
  subtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 32,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#1A1A1A',
  },
  button: {
    backgroundColor: '#63C7B8',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#A78BFA',
  },
  buttonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#1A1A1A',
    marginBottom: 12,
  },
  successMessage: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 32,
  },
});