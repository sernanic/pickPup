export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          expo_push_token?: string;
        };
      };
      message_threads: {
        Row: {
          id: string;
          owner_id: string;
          sitter_id: string;
          walking_booking_id?: string;
          boarding_booking_id?: string;
          booking_type: 'walking' | 'boarding';
        };
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          type: string;
          title: string;
          body: string;
          data?: Record<string, any>;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          recipient_id: string;
          type: string;
          title: string;
          body: string;
          data?: Record<string, any>;
          is_read?: boolean;
        };
      };
    };
  };
}
