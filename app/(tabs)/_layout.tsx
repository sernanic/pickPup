import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { Home, Search, Calendar, MessageSquare, User } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          ...styles.tabBar,
          height: Platform.OS === 'ios' ? 80 : 60,
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          paddingTop: 10,
        },
        tabBarBackground: () => (
          <BlurView 
            tint="light" 
            intensity={80} 
            style={StyleSheet.absoluteFill} 
          />
        ),
        tabBarActiveTintColor: '#63C7B8',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => <Search size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => <MessageSquare size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    borderTopWidth: 0,
    elevation: 0,
    backgroundColor: 'transparent',
  },
  tabBarLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
  },
});