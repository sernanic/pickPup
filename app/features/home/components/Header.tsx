import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Bell } from 'lucide-react-native';

interface HeaderProps {
  userName: string;
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
      <View>
        <Text style={styles.greeting}>Good morning,</Text>
        <Text style={styles.userName}>{userName}</Text>
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
  greeting: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#8E8E93',
  },
  userName: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#1A1A1A',
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