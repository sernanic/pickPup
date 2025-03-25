import { View, Text, StyleSheet } from 'react-native';
import { Star, CircleHelp as HelpCircle, Shield, ChevronRight } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MenuItem } from './menu-item';

interface SupportSectionProps {
  onRateAppPress?: () => void;
  onHelpCenterPress?: () => void;
  onPrivacyPress?: () => void;
}

export function SupportSection({ 
  onRateAppPress, 
  onHelpCenterPress, 
  onPrivacyPress 
}: SupportSectionProps) {
  return (
    <Animated.View 
      style={styles.section}
      entering={FadeInDown.delay(400).duration(500)}
    >
      <Text style={styles.sectionTitle}>Support</Text>
      
      <MenuItem
        icon={<Star size={20} color="#63C7B8" />}
        text="Rate the App"
        rightElement={<ChevronRight size={20} color="#8E8E93" />}
        onPress={onRateAppPress}
      />
      
      <MenuItem
        icon={<HelpCircle size={20} color="#63C7B8" />}
        text="Help Center"
        rightElement={<ChevronRight size={20} color="#8E8E93" />}
        onPress={onHelpCenterPress}
      />
      
      <MenuItem
        icon={<Shield size={20} color="#63C7B8" />}
        text="Privacy & Security"
        rightElement={<ChevronRight size={20} color="#8E8E93" />}
        onPress={onPrivacyPress}
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