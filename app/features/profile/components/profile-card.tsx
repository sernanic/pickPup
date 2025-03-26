import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Camera, CreditCard as Edit } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { UserProfile } from '../types';

interface ProfileCardProps {
  profile: UserProfile | null;
  user: any; // Auth user
  onEditProfile?: () => void;
  onChangePhoto?: () => void;
}

export function ProfileCard({ profile, user, onEditProfile, onChangePhoto }: ProfileCardProps) {
  const joinDate = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  }) : 'Unknown';

  return (
    <Animated.View 
      style={styles.profileCard}
      entering={FadeInDown.delay(100).duration(500)}
    >
      <View style={styles.profileImageContainer}>
        <Image 
          source={{ 
            uri: profile?.avatar_url || 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop'
          }} 
          style={styles.profileImage} 
        />
        <TouchableOpacity style={styles.cameraButton} onPress={onChangePhoto}>
          <Text>
            <Camera size={20} color="#FFFFFF" />
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.profileInfo}>
        <Text style={styles.profileName}>{profile?.name || user?.email?.split('@')[0] || 'Anonymous'}</Text>
        <Text style={styles.profileEmail}>{user?.email || ''}</Text>
        <Text style={styles.memberSince}>{`Member since ${joinDate}`}</Text>
        <TouchableOpacity style={styles.editProfileButton} onPress={onEditProfile}>
          <Text>
            <Edit size={16} color="#63C7B8" />
          </Text>
          <Text style={styles.editProfileText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#63C7B8',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  profileName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1A1A1A',
    marginBottom: 2,
  },
  profileEmail: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 2,
  },
  memberSince: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 8,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editProfileText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#63C7B8',
    marginLeft: 4,
  },
}); 