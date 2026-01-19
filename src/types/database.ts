export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          owner_id: string
          logo_url: string | null
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          owner_id: string
          logo_url?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          owner_id?: string
          logo_url?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      organization_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member'
          invited_at: string
          joined_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member'
          invited_at?: string
          joined_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'member'
          invited_at?: string
          joined_at?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          phone: string | null
          timezone: string
          role: 'admin' | 'user'
          current_organization_id: string | null
          notification_settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          timezone?: string
          role?: 'admin' | 'user'
          current_organization_id?: string | null
          notification_settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          timezone?: string
          role?: 'admin' | 'user'
          current_organization_id?: string | null
          notification_settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      subscription_plans: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          price_monthly: number
          price_yearly: number | null
          dialog_limit: number | null
          features: Json
          is_active: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          price_monthly: number
          price_yearly?: number | null
          dialog_limit?: number | null
          features?: Json
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          price_monthly?: number
          price_yearly?: number | null
          dialog_limit?: number | null
          features?: Json
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          organization_id: string
          plan_id: string
          status: 'active' | 'cancelled' | 'past_due' | 'trialing' | 'paused'
          billing_period: 'monthly' | 'yearly'
          current_period_start: string
          current_period_end: string
          cancel_at_period_end: boolean
          yookassa_subscription_id: string | null
          trial_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          plan_id: string
          status?: 'active' | 'cancelled' | 'past_due' | 'trialing' | 'paused'
          billing_period?: 'monthly' | 'yearly'
          current_period_start?: string
          current_period_end: string
          cancel_at_period_end?: boolean
          yookassa_subscription_id?: string | null
          trial_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          plan_id?: string
          status?: 'active' | 'cancelled' | 'past_due' | 'trialing' | 'paused'
          billing_period?: 'monthly' | 'yearly'
          current_period_start?: string
          current_period_end?: string
          cancel_at_period_end?: boolean
          yookassa_subscription_id?: string | null
          trial_end?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          organization_id: string
          subscription_id: string | null
          yookassa_payment_id: string | null
          amount: number
          currency: string
          status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled' | 'refunded'
          payment_method: Json | null
          description: string | null
          metadata: Json
          created_at: string
          paid_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          subscription_id?: string | null
          yookassa_payment_id?: string | null
          amount: number
          currency?: string
          status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled' | 'refunded'
          payment_method?: Json | null
          description?: string | null
          metadata?: Json
          created_at?: string
          paid_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          subscription_id?: string | null
          yookassa_payment_id?: string | null
          amount?: number
          currency?: string
          status?: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled' | 'refunded'
          payment_method?: Json | null
          description?: string | null
          metadata?: Json
          created_at?: string
          paid_at?: string | null
        }
      }
      messenger_connections: {
        Row: {
          id: string
          organization_id: string
          messenger_type: 'telegram' | 'whatsapp' | 'viber' | 'vk' | 'instagram'
          connection_name: string | null
          is_active: boolean
          credentials: Json
          webhook_url: string | null
          webhook_secret: string | null
          settings: Json
          last_sync_at: string | null
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          messenger_type: 'telegram' | 'whatsapp' | 'viber' | 'vk' | 'instagram'
          connection_name?: string | null
          is_active?: boolean
          credentials: Json
          webhook_url?: string | null
          webhook_secret?: string | null
          settings?: Json
          last_sync_at?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          messenger_type?: 'telegram' | 'whatsapp' | 'viber' | 'vk' | 'instagram'
          connection_name?: string | null
          is_active?: boolean
          credentials?: Json
          webhook_url?: string | null
          webhook_secret?: string | null
          settings?: Json
          last_sync_at?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      leads: {
        Row: {
          id: string
          organization_id: string
          external_id: string
          external_id_type: string
          username: string | null
          name: string | null
          phone: string | null
          niche: string | null
          budget: string | null
          has_website: boolean | null
          uses_ads: boolean | null
          ad_types: string | null
          city: string | null
          source: string
          status: 'new' | 'contacted' | 'qualified' | 'negotiation' | 'won' | 'lost'
          assigned_to: string | null
          tags: string[]
          notes: string | null
          custom_fields: Json
          last_contact_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          external_id: string
          external_id_type?: string
          username?: string | null
          name?: string | null
          phone?: string | null
          niche?: string | null
          budget?: string | null
          has_website?: boolean | null
          uses_ads?: boolean | null
          ad_types?: string | null
          city?: string | null
          source?: string
          status?: 'new' | 'contacted' | 'qualified' | 'negotiation' | 'won' | 'lost'
          assigned_to?: string | null
          tags?: string[]
          notes?: string | null
          custom_fields?: Json
          last_contact_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          external_id?: string
          external_id_type?: string
          username?: string | null
          name?: string | null
          phone?: string | null
          niche?: string | null
          budget?: string | null
          has_website?: boolean | null
          uses_ads?: boolean | null
          ad_types?: string | null
          city?: string | null
          source?: string
          status?: 'new' | 'contacted' | 'qualified' | 'negotiation' | 'won' | 'lost'
          assigned_to?: string | null
          tags?: string[]
          notes?: string | null
          custom_fields?: Json
          last_contact_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          organization_id: string
          lead_id: string | null
          messenger_connection_id: string
          external_chat_id: string
          messenger_type: string
          status: 'open' | 'closed' | 'archived' | 'spam'
          assigned_to: string | null
          last_message_at: string | null
          last_message_preview: string | null
          unread_count: number
          tags: string[]
          metadata: Json
          ai_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          lead_id?: string | null
          messenger_connection_id: string
          external_chat_id: string
          messenger_type: string
          status?: 'open' | 'closed' | 'archived' | 'spam'
          assigned_to?: string | null
          last_message_at?: string | null
          last_message_preview?: string | null
          unread_count?: number
          tags?: string[]
          metadata?: Json
          ai_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          lead_id?: string | null
          messenger_connection_id?: string
          external_chat_id?: string
          messenger_type?: string
          status?: 'open' | 'closed' | 'archived' | 'spam'
          assigned_to?: string | null
          last_message_at?: string | null
          last_message_preview?: string | null
          unread_count?: number
          tags?: string[]
          metadata?: Json
          ai_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          organization_id: string
          conversation_id: string
          content: string
          sender_type: 'user' | 'lead' | 'system' | 'ai'
          sender_id: string | null
          message_type: 'text' | 'image' | 'file' | 'audio' | 'video' | 'location' | 'contact'
          attachments: Json
          external_message_id: string | null
          status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
          is_ai_generated: boolean
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          conversation_id: string
          content: string
          sender_type: 'user' | 'lead' | 'system' | 'ai'
          sender_id?: string | null
          message_type?: 'text' | 'image' | 'file' | 'audio' | 'video' | 'location' | 'contact'
          attachments?: Json
          external_message_id?: string | null
          status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
          is_ai_generated?: boolean
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          conversation_id?: string
          content?: string
          sender_type?: 'user' | 'lead' | 'system' | 'ai'
          sender_id?: string | null
          message_type?: 'text' | 'image' | 'file' | 'audio' | 'video' | 'location' | 'contact'
          attachments?: Json
          external_message_id?: string | null
          status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
          is_ai_generated?: boolean
          metadata?: Json
          created_at?: string
        }
      }
      usage_stats: {
        Row: {
          id: string
          organization_id: string
          period_start: string
          period_end: string
          dialogs_count: number
          messages_sent: number
          messages_received: number
          leads_created: number
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          period_start: string
          period_end: string
          dialogs_count?: number
          messages_sent?: number
          messages_received?: number
          leads_created?: number
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          period_start?: string
          period_end?: string
          dialogs_count?: number
          messages_sent?: number
          messages_received?: number
          leads_created?: number
          created_at?: string
        }
      }
      ai_settings: {
        Row: {
          id: string
          organization_id: string
          is_enabled: boolean
          provider: 'openai'
          api_key: string | null
          model: 'gpt-4o' | 'gpt-4o-mini' | 'gpt-4-turbo' | 'gpt-3.5-turbo'
          temperature: number
          max_tokens: number
          system_prompt: string
          auto_reply_delay_seconds: number
          context_messages_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          is_enabled?: boolean
          provider?: 'openai'
          api_key?: string | null
          model?: 'gpt-4o' | 'gpt-4o-mini' | 'gpt-4-turbo' | 'gpt-3.5-turbo'
          temperature?: number
          max_tokens?: number
          system_prompt?: string
          auto_reply_delay_seconds?: number
          context_messages_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          is_enabled?: boolean
          provider?: 'openai'
          api_key?: string | null
          model?: 'gpt-4o' | 'gpt-4o-mini' | 'gpt-4-turbo' | 'gpt-3.5-turbo'
          temperature?: number
          max_tokens?: number
          system_prompt?: string
          auto_reply_delay_seconds?: number
          context_messages_count?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_organization_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_member_of_organization: {
        Args: {
          org_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
