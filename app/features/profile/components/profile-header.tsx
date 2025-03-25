import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Settings } from 'lucide-react-native';

export function ProfileHeader() {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>Profile</Text>
      <TouchableOpacity style={styles.settingsButton}>
        <Text>
          <Settings size={24} color="#1A1A1A" />
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#1A1A1A',
  },
  settingsButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 