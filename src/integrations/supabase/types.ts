export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          drive_folder_id: string | null
          drive_folder_url: string | null
          id: number
          last_synced_at: string | null
          updated_at: string
        }
        Insert: {
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          id?: number
          last_synced_at?: string | null
          updated_at?: string
        }
        Update: {
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          id?: number
          last_synced_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      app_users: {
        Row: {
          blocked: boolean
          created_at: string
          display_name: string | null
          id: string
          last_login_at: string | null
          last_seen_at: string | null
          password_hash: string
          username: string
        }
        Insert: {
          blocked?: boolean
          created_at?: string
          display_name?: string | null
          id?: string
          last_login_at?: string | null
          last_seen_at?: string | null
          password_hash: string
          username: string
        }
        Update: {
          blocked?: boolean
          created_at?: string
          display_name?: string | null
          id?: string
          last_login_at?: string | null
          last_seen_at?: string | null
          password_hash?: string
          username?: string
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          anon_id: string
          blocked_at: string
        }
        Insert: {
          anon_id: string
          blocked_at?: string
        }
        Update: {
          anon_id?: string
          blocked_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          anon_id: string
          content: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          anon_id: string
          content: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          anon_id?: string
          content?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
      clips: {
        Row: {
          created_at: string
          description: string | null
          end_sec: number | null
          id: string
          order_index: number
          start_sec: number
          tags: string[] | null
          title: string
          video_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_sec?: number | null
          id?: string
          order_index?: number
          start_sec?: number
          tags?: string[] | null
          title: string
          video_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_sec?: number | null
          id?: string
          order_index?: number
          start_sec?: number
          tags?: string[] | null
          title?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clips_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          anon_id: string
          body: string
          created_at: string
          display_name: string | null
          id: string
          rating: number | null
          video_id: string
        }
        Insert: {
          anon_id: string
          body: string
          created_at?: string
          display_name?: string | null
          id?: string
          rating?: number | null
          video_id: string
        }
        Update: {
          anon_id?: string
          body?: string
          created_at?: string
          display_name?: string | null
          id?: string
          rating?: number | null
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      reactions: {
        Row: {
          anon_id: string
          created_at: string
          id: string
          kind: string
          target_id: string
          target_type: string
        }
        Insert: {
          anon_id: string
          created_at?: string
          id?: string
          kind: string
          target_id: string
          target_type: string
        }
        Update: {
          anon_id?: string
          created_at?: string
          id?: string
          kind?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      user_interests: {
        Row: {
          anon_id: string
          category_id: string
          created_at: string
        }
        Insert: {
          anon_id: string
          category_id: string
          created_at?: string
        }
        Update: {
          anon_id?: string
          category_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_interests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      video_categories: {
        Row: {
          category_id: string
          video_id: string
        }
        Insert: {
          category_id: string
          video_id: string
        }
        Update: {
          category_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_categories_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          ai_processed: boolean
          cast_members: Json
          content_rating: string | null
          content_warnings: string[]
          created_at: string
          description: string | null
          drive_file_id: string
          duration_sec: number | null
          id: string
          mime_type: string | null
          size_bytes: number | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          ai_processed?: boolean
          cast_members?: Json
          content_rating?: string | null
          content_warnings?: string[]
          created_at?: string
          description?: string | null
          drive_file_id: string
          duration_sec?: number | null
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          ai_processed?: boolean
          cast_members?: Json
          content_rating?: string | null
          content_warnings?: string[]
          created_at?: string
          description?: string | null
          drive_file_id?: string
          duration_sec?: number | null
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      view_sessions: {
        Row: {
          anon_id: string
          completed: boolean
          device: string | null
          id: string
          seconds_watched: number
          started_at: string
          updated_at: string
          video_id: string
        }
        Insert: {
          anon_id: string
          completed?: boolean
          device?: string | null
          id?: string
          seconds_watched?: number
          started_at?: string
          updated_at?: string
          video_id: string
        }
        Update: {
          anon_id?: string
          completed?: boolean
          device?: string | null
          id?: string
          seconds_watched?: number
          started_at?: string
          updated_at?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "view_sessions_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
