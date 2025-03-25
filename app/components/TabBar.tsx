import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Home, Search, Calendar, MessageSquare, User } from 'lucide-react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabBar() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  
  const tabs = [
    { name: 'Home', icon: Home, path: '/' },
    { name: 'Search', icon: Search, path: '/search' },
    { name: 'Bookings', icon: Calendar, path: '/bookings' },
    { name: 'Messages', icon: MessageSquare, path: '/messages' },
    { name: 'Profile', icon: User, path: '/profile' },
  ];
  
  // Determine active tab
  const getTabColor = (path: string) => {
    // Check if the current path starts with this tab's path
    // For example, '/profile/settings' should highlight the profile tab
    return pathname === path ? '#63C7B8' : '#8E8E93';
  };
  
  return (
    <View style={[
      styles.container, 
      { height: Platform.OS === 'ios' ? 80 : 60, paddingBottom: insets.bottom || 10 }
    ]}>
      <BlurView tint="light" intensity={80} style={StyleSheet.absoluteFill} />
      
      <View style={styles.content}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => router.push(tab.path)}
          >
            <tab.icon size={24} color={getTabColor(tab.path)} />
            <Text style={[styles.tabText, { color: getTabColor(tab.path) }]}>
              {tab.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 0,
    elevation: 0,
    backgroundColor: 'transparent',
  },
  content: {
    flexDirection: 'row',
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
}); 