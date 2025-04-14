import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import type { Database } from './types.ts';

interface NotificationParams {
  recipient_id: string;
  type: 'message' | 'booking_request' | 'booking_status' | 'review';
  title: string;
  body: string;
  data?: Record<string, any>;
}

export class DatabaseService {
  constructor(private client: SupabaseClient<Database>) {}

  async getProfile(userId: string) {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data;
  }

  async getMessageThread(threadId: string) {
    const { data, error } = await this.client
      .from('message_threads')
      .select('*')
      .eq('id', threadId)
      .single();

    if (error) {
      console.error('Error fetching message thread:', error);
      return null;
    }

    return data;
  }

  async createNotification(params: NotificationParams) {
    // First, create the notification record
    const { error: dbError } = await this.client
      .from('notifications')
      .insert({
        recipient_id: params.recipient_id,
        type: params.type,
        title: params.title,
        body: params.body,
        data: params.data,
        is_read: false
      });

    if (dbError) {
      console.error('Error creating notification:', dbError);
      return;
    }

    // Then, try to send a push notification if the user has a token
    const { data: profile } = await this.client
      .from('profiles')
      .select('expo_push_token')
      .eq('id', params.recipient_id)
      .single();

    if (profile?.expo_push_token) {
      try {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: profile.expo_push_token,
            title: params.title,
            body: params.body,
            data: params.data,
            sound: 'default',
            priority: 'high',
          }),
        });
      } catch (error) {
        console.error('Error sending push notification:', error);
      }
    }
  }
}
