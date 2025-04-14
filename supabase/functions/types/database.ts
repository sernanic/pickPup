export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          expo_push_token: string | null
          notifications_enabled: boolean
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          expo_push_token?: string | null
          notifications_enabled?: boolean
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          expo_push_token?: string | null
          notifications_enabled?: boolean
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          thread_id: string
          sender_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          thread_id: string
          sender_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          thread_id?: string
          sender_id?: string
          content?: string
          created_at?: string
        }
      }
      message_threads: {
        Row: {
          id: string
          owner_id: string
          sitter_id: string
          booking_id: string
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          sitter_id: string
          booking_id: string
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          sitter_id?: string
          booking_id?: string
          created_at?: string
        }
      }
    }
  }
}
