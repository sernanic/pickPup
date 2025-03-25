import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MenuItemProps } from '../types';

export function MenuItem({ icon, text, rightElement, onPress }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuIconContainer}>
        <Text>{icon}</Text>
      </View>
      <Text style={styles.menuItemText}>{text}</Text>
      <Text>{rightElement}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemText: {
    flex: 1,
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: '#1A1A1A',
  },
}); 