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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      business_members: {
        Row: {
          business_id: string
          created_at: string
          customer_id: string
          id: string
          role: string
        }
        Insert: {
          business_id: string
          created_at?: string
          customer_id: string
          id?: string
          role?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          active: boolean
          created_at: string
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          primary_color: string
          theme: Database["public"]["Enums"]["profile_theme"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          primary_color?: string
          theme?: Database["public"]["Enums"]["profile_theme"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          primary_color?: string
          theme?: Database["public"]["Enums"]["profile_theme"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "businesses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          active: boolean
          avatar_url: string | null
          background_color: string | null
          bio: string | null
          business_id: string | null
          button_shadow: boolean
          button_style: string
          created_at: string
          email: string | null
          font_style: string
          full_name: string
          id: string
          job_title: string | null
          location: string | null
          muted_text_color: string | null
          phone: string | null
          primary_color: string
          show_contact_button: boolean
          text_color: string
          theme: Database["public"]["Enums"]["profile_theme"]
          updated_at: string
          user_id: string | null
          username: string
          verified: boolean
          website: string | null
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          background_color?: string | null
          bio?: string | null
          business_id?: string | null
          button_shadow?: boolean
          button_style?: string
          created_at?: string
          email?: string | null
          font_style?: string
          full_name: string
          id?: string
          job_title?: string | null
          location?: string | null
          muted_text_color?: string | null
          phone?: string | null
          primary_color?: string
          show_contact_button?: boolean
          text_color?: string
          theme?: Database["public"]["Enums"]["profile_theme"]
          updated_at?: string
          user_id?: string | null
          username: string
          verified?: boolean
          website?: string | null
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          background_color?: string | null
          bio?: string | null
          business_id?: string | null
          button_shadow?: boolean
          button_style?: string
          created_at?: string
          email?: string | null
          font_style?: string
          full_name?: string
          id?: string
          job_title?: string | null
          location?: string | null
          muted_text_color?: string | null
          phone?: string | null
          primary_color?: string
          show_contact_button?: boolean
          text_color?: string
          theme?: Database["public"]["Enums"]["profile_theme"]
          updated_at?: string
          user_id?: string | null
          username?: string
          verified?: boolean
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      link_clicks: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          link_id: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          link_id?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          link_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "link_clicks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "link_clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "links"
            referencedColumns: ["id"]
          },
        ]
      }
      links: {
        Row: {
          created_at: string
          customer_id: string
          enabled: boolean
          icon: string | null
          id: string
          sort_order: number
          title: string
          type: Database["public"]["Enums"]["link_type"]
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          enabled?: boolean
          icon?: string | null
          id?: string
          sort_order?: number
          title: string
          type: Database["public"]["Enums"]["link_type"]
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          enabled?: boolean
          icon?: string | null
          id?: string
          sort_order?: number
          title?: string
          type?: Database["public"]["Enums"]["link_type"]
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "links_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_views: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          visitor_id: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          visitor_id?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_views_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          auth_user_id: string
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          auth_user_id: string
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          auth_user_id?: string
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      get_leaderboard: {
        Args: { _limit?: number; _since?: string }
        Returns: {
          avatar_url: string
          full_name: string
          rank: number
          username: string
          views: number
        }[]
      }
      get_public_profile: {
        Args: { _username: string }
        Returns: {
          active: boolean
          avatar_url: string
          background_color: string
          bio: string
          button_shadow: boolean
          button_style: string
          email: string
          font_style: string
          full_name: string
          id: string
          job_title: string
          location: string
          muted_text_color: string
          phone: string
          primary_color: string
          show_contact_button: boolean
          text_color: string
          theme: Database["public"]["Enums"]["profile_theme"]
          username: string
          verified: boolean
          website: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_customer: { Args: { _customer_id: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      owns_business: { Args: { _business_id: string }; Returns: boolean }
      owns_customer: { Args: { _customer_id: string }; Returns: boolean }
      owns_customer_row: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      record_profile_view: {
        Args: { _customer_id: string; _visitor_id: string }
        Returns: undefined
      }
    }
    Enums: {
      account_type: "personal" | "business"
      app_role: "admin"
      link_type:
        | "whatsapp"
        | "phone"
        | "email"
        | "instagram"
        | "facebook"
        | "tiktok"
        | "youtube"
        | "linkedin"
        | "twitter"
        | "snapchat"
        | "telegram"
        | "website"
        | "maps"
        | "reviews"
        | "instapay"
        | "vodafone_cash"
        | "custom"
      profile_theme:
        | "oshegah_dark"
        | "oshegah_light"
        | "midnight"
        | "minimal"
        | "glass"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      account_type: ["personal", "business"],
      app_role: ["admin"],
      link_type: [
        "whatsapp",
        "phone",
        "email",
        "instagram",
        "facebook",
        "tiktok",
        "youtube",
        "linkedin",
        "twitter",
        "snapchat",
        "telegram",
        "website",
        "maps",
        "reviews",
        "instapay",
        "vodafone_cash",
        "custom",
      ],
      profile_theme: [
        "oshegah_dark",
        "oshegah_light",
        "midnight",
        "minimal",
        "glass",
      ],
    },
  },
} as const
