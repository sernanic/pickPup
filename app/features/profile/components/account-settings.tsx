import { View, Text, Switch, StyleSheet } from 'react-native';
import { User, CreditCard, Bell, MapPin, ChevronRight } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MenuItem } from './menu-item';

interface AccountSettingsProps {
  notificationsEnabled: boolean;
  locationEnabled: boolean;
  onNotificationsChange: (value: boolean) => void;
  onLocationChange: (value: boolean) => void;
  onPersonalInfoPress?: () => void;
  onPaymentMethodsPress?: () => void;
}

export function AccountSettings({
  notificationsEnabled,
  locationEnabled,
  onNotificationsChange,
  onLocationChange,
  onPersonalInfoPress,
  onPaymentMethodsPress,
}: AccountSettingsProps) {
  return (
    <Animated.View 
      style={styles.section}
      entering={FadeInDown.delay(300).duration(500)}
    >
      <Text style={styles.sectionTitle}>Account Settings</Text>
      
      <MenuItem
        icon={<User size={20} color="#63C7B8" />}
        text="Personal Information"
        rightElement={<ChevronRight size={20} color="#8E8E93" />}
        onPress={onPersonalInfoPress}
      />
      
      <MenuItem
        icon={<CreditCard size={20} color="#63C7B8" />}
        text="Payment Methods"
        rightElement={<ChevronRight size={20} color="#8E8E93" />}
        onPress={onPaymentMethodsPress}
      />
      
      <MenuItem
        icon={<Bell size={20} color="#63C7B8" />}
        text="Notifications"
        rightElement={
          <Switch
            value={notificationsEnabled}
            onValueChange={onNotificationsChange}
            trackColor={{ false: '#E5E5EA', true: '#A78BFA' }}
            thumbColor={notificationsEnabled ? '#63C7B8' : '#FFFFFF'}
          />
        }
      />
      
      <MenuItem
        icon={<MapPin size={20} color="#63C7B8" />}
        text="Location Services"
        rightElement={
          <Switch
            value={locationEnabled}
            onValueChange={onLocationChange}
            trackColor={{ false: '#E5E5EA', true: '#A78BFA' }}
            thumbColor={locationEnabled ? '#63C7B8' : '#FFFFFF'}
          />
        }
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1A1A1A',
    marginBottom: 16,
  },
}); 