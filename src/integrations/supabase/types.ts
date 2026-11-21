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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          actor: string
          created_at: string
          details: Json
          id: string
          target: string | null
        }
        Insert: {
          action: string
          actor: string
          created_at?: string
          details?: Json
          id?: string
          target?: string | null
        }
        Update: {
          action?: string
          actor?: string
          created_at?: string
          details?: Json
          id?: string
          target?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          content: Json
          created_at: string
          created_by: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          created_by: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          created_by?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      wiki_articles: {
        Row: { id: string; title: string; content: Json; created_by: string; created_at: string; updated_at: string }
        Insert: { id?: string; title: string; content?: Json; created_by: string; created_at?: string; updated_at?: string }
        Update: { id?: string; title?: string; content?: Json; created_by?: string; created_at?: string; updated_at?: string }
        Relationships: []
      }
      artist_claims: {
        Row: {
          artist_name: string
          artist_slug: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          email: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          artist_name: string
          artist_slug: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          email: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          artist_name?: string
          artist_slug?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          email?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      artist_profiles: {
        Row: {
          banner_path: string | null
          description: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          banner_path?: string | null
          description?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          banner_path?: string | null
          description?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          parts: Json
          role: string
          thread_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parts?: Json
          role: string
          thread_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parts?: Json
          role?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      competitions: {
        Row: {
          created_at: string
          id: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          year?: number
        }
        Relationships: []
      }
      email_blocks: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          reason: string | null
          scope: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          reason?: string | null
          scope: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          reason?: string | null
          scope?: string
        }
        Relationships: []
      }
      entries: {
        Row: {
          artist: string
          audience_points: number
          created_at: string
          id: string
          position: number
          section_id: string
          song: string | null
          status: string | null
          video_url: string | null
        }
        Insert: {
          artist: string
          audience_points?: number
          created_at?: string
          id?: string
          position?: number
          section_id: string
          song?: string | null
          status?: string | null
          video_url?: string | null
        }
        Update: {
          artist?: string
          audience_points?: number
          created_at?: string
          id?: string
          position?: number
          section_id?: string
          song?: string | null
          status?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entries_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      juries: {
        Row: {
          created_at: string
          id: string
          name: string
          position: number
          section_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          position?: number
          section_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          position?: number
          section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "juries_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      jury_votes: {
        Row: {
          entry_id: string
          id: string
          jury_id: string
          points: number
          rank: number
        }
        Insert: {
          entry_id: string
          id?: string
          jury_id: string
          points?: number
          rank: number
        }
        Update: {
          entry_id?: string
          id?: string
          jury_id?: string
          points?: number
          rank?: number
        }
        Relationships: [
          {
            foreignKeyName: "jury_votes_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jury_votes_jury_id_fkey"
            columns: ["jury_id"]
            isOneToOne: false
            referencedRelation: "juries"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          competition_id: string
          created_at: string
          id: string
          type: Database["public"]["Enums"]["section_type"]
          video_url: string | null
        }
        Insert: {
          competition_id: string
          created_at?: string
          id?: string
          type: Database["public"]["Enums"]["section_type"]
          video_url?: string | null
        }
        Update: {
          competition_id?: string
          created_at?: string
          id?: string
          type?: Database["public"]["Enums"]["section_type"]
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sections_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_set_claim_status: {
        Args: {
          _actor: string
          _claim_id: string
          _from: string[]
          _to: string
        }
        Returns: {
          artist_name: string
          artist_slug: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          email: string
          id: string
          status: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "artist_claims"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      agent_schema_catalog: {
        Args: never
        Returns: {
          columns: Json
          table_name: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_verified_artist: {
        Args: { _slug: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      section_type: "artistijulkistus" | "esittely" | "karsinta" | "finaali"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
      section_type: ["artistijulkistus", "esittely", "karsinta", "finaali"],
    },
  },
} as const
