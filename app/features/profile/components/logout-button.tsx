import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface LogoutButtonProps {
  onLogout: () => void;
}

export function LogoutButton({ onLogout }: LogoutButtonProps) {
  return (
    <Animated.View entering={FadeInDown.delay(500).duration(500)}>
      <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
        <Text style={styles.logoutButtonText}>Log Out</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  logoutButton: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  logoutButtonText: {
    color: 'white',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
  },
}); 