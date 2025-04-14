import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Bell } from 'lucide-react-native';

interface HeaderProps {
  userName: string; // Still keeping this for compatibility
  hasNotifications?: boolean;
  onPressNotification?: () => void;
}

export function Header({ 
  userName, 
  hasNotifications = true, 
  onPressNotification = () => {} 
}: HeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.logoContainer}>
        <Image 
          source={require('../../../../assets/images/PikpupLogo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      <TouchableOpacity 
        style={styles.notificationButton}
        onPress={onPressNotification}
      >
        <Bell size={24} color="#1A1A1A" />
        {hasNotifications && <View style={styles.notificationBadge} />}
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
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 30,
    width: 160,
    height: 60,
    padding: 10,
  },
  logo: {
    width: 140,
    height: 50,
  },
  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF3B30',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
}); 