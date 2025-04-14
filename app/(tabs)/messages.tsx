import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Search, MessageSquare } from 'lucide-react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import {formatTimestamp} from './messages.tsx.helper';

// Type definitions
interface Thread {
  id: string;
  booking_id: string;
  owner_id: string;
  sitter_id: string;
  last_message: string;
  last_message_time: string;
  created_at: string;
  updated_at: string;
  profile: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  unread_count: number;
}

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { showWelcomeMessage } = params;
  const [searchQuery, setSearchQuery] = useState('');
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  // Fetch threads when the component mounts
  useEffect(() => {
    if (!user) return;
    
    const fetchThreads = async () => {
      try {
        setLoading(true);
        
        // Get threads where user is either the owner or sitter
        const { data, error } = await supabase
          .from('message_threads')
          .select(`
            *,
            profile:profiles!message_threads_owner_id_fkey(id, name, avatar_url)
          `)
          .or(`owner_id.eq.${user.id},sitter_id.eq.${user.id}`)
          .order('last_message_time', { ascending: false });
        
        if (error) throw error;
        
        // For threads where the user is the sitter, we need the owner's profile
        // For threads where the user is the owner, we need the sitter's profile
        const processedThreads = await Promise.all(data.map(async (thread) => {
          let profileId;
          
          if (thread.owner_id === user.id) {
            profileId = thread.sitter_id;
          } else {
            profileId = thread.owner_id;
          }
          
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id, name, avatar_url')
            .eq('id', profileId)
            .single();
          
          if (profileError) {
            console.error('Error fetching profile:', profileError);
            return {
              ...thread,
              profile: { id: profileId, name: 'Unknown', avatar_url: null }
            };
          }
          
          // Get unread message count
          const { count, error: countError } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('thread_id', thread.id)
            .eq('is_read', false)
            .neq('sender_id', user.id);
          
          if (countError) {
            console.error('Error fetching unread count:', countError);
          }
          
          return {
            ...thread,
            profile: profileData,
            unread_count: count || 0
          };
        }));
        
        setThreads(processedThreads);
      } catch (error) {
        console.error('Error fetching threads:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchThreads();
    
    // Set up real-time subscription for new messages
    const subscription = supabase
      .channel('public:messages')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages' 
      }, (payload) => {
        // Refresh the thread list
        fetchThreads();
      })
      .subscribe();
    
    // Clean up subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [user]);
  
  // Show welcome message if navigated from booking confirmation
  useEffect(() => {
    if (showWelcomeMessage === "true") {
      // Wait a moment for the threads to load
      setTimeout(() => {
        if (threads.length > 0) {
          // Redirect to the most recent conversation
          router.push(`/conversation/${threads[0].id}`);
        }
      }, 500);
    }
  }, [showWelcomeMessage, threads]);

  // Filter threads based on search query
  const filteredThreads = threads.filter(thread =>
    thread.profile.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate total unread messages
  const totalUnread = threads.reduce((sum, thread) => sum + thread.unread_count, 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        {totalUnread > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{totalUnread}</Text>
          </View>
        )}
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color="#8E8E93" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#63C7B8" />
        </View>
      ) : filteredThreads.length > 0 ? (
        <FlatList
          data={filteredThreads}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.conversationsList}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInRight.delay(index * 100).duration(400)}>
              <TouchableOpacity 
                style={styles.conversationItem}
                onPress={() => router.push(`/conversation/${item.id}`)}
              >
                <View style={styles.avatarContainer}>
                  <Image 
                    source={item.profile.avatar_url 
                      ? { uri: item.profile.avatar_url } 
                      : require('../../assets/images/default-avatar.png')
                    } 
                    style={styles.avatar} 
                    contentFit="cover"
                  />
                  {item.unread_count > 0 && (
                    <View style={styles.badgeContainer}>
                      <Text style={styles.badgeText}>{item.unread_count}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.contentContainer}>
                  <View style={styles.nameContainer}>
                    <Text style={styles.name}>{item.profile.name}</Text>
                    <Text style={styles.timestamp}>{formatTimestamp(item.last_message_time)}</Text>
                  </View>
                  <Text 
                    style={styles.lastMessage}
                    numberOfLines={1}
                  >
                    {item.last_message}
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          )}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <MessageSquare size={64} color="#8E8E93" />
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptyText}>
            When you book a sitter or receive a message, you'll see your conversations here.
          </Text>
          <TouchableOpacity style={styles.findSitterButton}>
            <Text style={styles.findSitterButtonText}>Find a Sitter</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  unreadBadge: {
    backgroundColor: '#FF3B30',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversationsList: {
    paddingHorizontal: 20,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  badgeContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF3B30',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  nameContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  timestamp: {
    fontSize: 14,
    color: '#8E8E93',
  },
  lastMessage: {
    fontSize: 14,
    color: '#8E8E93',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  findSitterButton: {
    backgroundColor: '#63C7B8',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  findSitterButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});