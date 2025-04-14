import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Send } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { Image } from 'expo-image';
import Animated, { FadeInUp } from 'react-native-reanimated';

// Define types for our data
interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_read: boolean;
}

interface Thread {
  id: string;
  booking_id: string;
  owner_id: string;
  sitter_id: string;
  otherUserProfile: {
    id: string;
    name: string;
    avatar_url: string | null;
  } | null;
}

export default function ConversationScreen() {
  const params = useLocalSearchParams();
  const { id } = params;
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Fetch thread details and messages
  useEffect(() => {
    if (!user || !id) return;

    // Function to fetch thread details
    const fetchThreadDetails = async () => {
      try {
        setLoading(true);
        
        // Get thread details
        const { data: threadData, error: threadError } = await supabase
          .from('message_threads')
          .select('*')
          .eq('id', id)
          .single();

        if (threadError) throw threadError;
        
        // Determine the other user (owner or sitter)
        const otherUserId = threadData.owner_id === user.id ? threadData.sitter_id : threadData.owner_id;
        
        // Get the other user's profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .eq('id', otherUserId)
          .single();
            
        if (profileError) throw profileError;
        
        // Set thread with other user profile
        setThread({
          ...threadData,
          otherUserProfile: profileData
        });
        
        // Fetch messages
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('thread_id', id)
          .order('created_at', { ascending: true });
        
        if (messagesError) throw messagesError;
        
        setMessages(messagesData);
        
        // Mark messages as read
        if (messagesData && messagesData.length > 0) {
          const unreadMessages = messagesData.filter(
            msg => !msg.is_read && msg.sender_id !== user.id
          );
          
          if (unreadMessages.length > 0) {
            await supabase
              .from('messages')
              .update({ is_read: true })
              .in('id', unreadMessages.map(msg => msg.id));
          }
        }
      } catch (error) {
        console.error('Error fetching conversation:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchThreadDetails();

    // Set up real-time subscription
    const subscription = supabase
      .channel(`thread:${id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `thread_id=eq.${id}`
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages(current => [...current, newMsg]);
        
        // Mark the message as read if it's not from current user
        if (newMsg.sender_id !== user.id) {
          supabase
            .from('messages')
            .update({ is_read: true })
            .eq('id', newMsg.id)
            .then(() => console.log('Message marked as read'));
        }
      })
      .subscribe();
    
    
    // Clean up subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [user, id]);

  // Auto-scroll to bottom when new messages come in
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [messages]);

  // Send a new message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !thread) return;
    
    try {
      setSending(true);
      const messageContent = newMessage.trim();
      
      // Clear input immediately for better UX
      setNewMessage('');
      
      // Create a temporary message object to show immediately
      const tempMessage = {
        id: `temp-${Date.now()}`,
        thread_id: thread.id,
        sender_id: user.id,
        content: messageContent,
        is_read: false,
        created_at: new Date().toISOString(),
      };
      
      // Optimistically update the UI
      setMessages(current => [...current, tempMessage]);
      
      // Then send to the server
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            thread_id: thread.id,
            sender_id: user.id,
            content: messageContent,
            is_read: false
          }
        ])
        .select();
      
      if (error) throw error;
      
      // If we got data back, replace the temp message with the real one
      if (data && data[0]) {
        setMessages(current => 
          current.filter(msg => msg.id !== tempMessage.id).concat(data[0])
        );
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      // On error, show an error toast or notification
    } finally {
      setSending(false);
    }
  };

  // Format timestamp
  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#63C7B8" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color="#1A1A1A" />
        </TouchableOpacity>
        
        <View style={styles.profileContainer}>
          <Image
            source={thread?.otherUserProfile?.avatar_url 
              ? { uri: thread.otherUserProfile.avatar_url }
              : require('../../assets/images/default-avatar.png')
            }
            style={styles.avatar}
            contentFit="cover"
          />
          <Text style={styles.name}>{thread?.otherUserProfile?.name || 'User'}</Text>
        </View>
        
        <View style={{ width: 40 }} />
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        renderItem={({ item, index }) => {
          const isMine = item.sender_id === user?.id;
          return (
            <Animated.View
              entering={FadeInUp.delay(index * 50).duration(300)}
              style={[
                styles.messageContainer,
                isMine ? styles.mineContainer : styles.theirsContainer
              ]}
            >
              <View
                style={[
                  styles.messageBubble,
                  isMine ? styles.mineBubble : styles.theirsBubble
                ]}
              >
                <Text style={[
                  styles.messageText,
                  isMine ? styles.mineText : styles.theirsText
                ]}>
                  {item.content}
                </Text>
                <Text style={[
                  styles.timeText,
                  isMine ? styles.mineTimeText : styles.theirsTimeText
                ]}>
                  {formatMessageTime(item.created_at)}
                </Text>
              </View>
            </Animated.View>
          );
        }}
      />

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!newMessage.trim() || sending) && styles.disabledButton
          ]}
          onPress={handleSendMessage}
          disabled={!newMessage.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Send size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '80%',
  },
  mineContainer: {
    alignSelf: 'flex-end',
  },
  theirsContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 18,
    padding: 12,
    paddingBottom: 8,
  },
  mineBubble: {
    backgroundColor: '#63C7B8',
  },
  theirsBubble: {
    backgroundColor: '#E8E8E8',
  },
  messageText: {
    fontSize: 16,
    marginBottom: 4,
  },
  mineText: {
    color: '#FFFFFF',
  },
  theirsText: {
    color: '#1A1A1A',
  },
  timeText: {
    fontSize: 12,
    alignSelf: 'flex-end',
  },
  mineTimeText: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  theirsTimeText: {
    color: '#8E8E93',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  input: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#63C7B8',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#B5E8E2',
  },
});
