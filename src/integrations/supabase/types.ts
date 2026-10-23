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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      admin_credentials: {
        Row: {
          created_at: string
          failed_attempts: number
          locked_until: string | null
          password_hash: string
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          failed_attempts?: number
          locked_until?: string | null
          password_hash: string
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          failed_attempts?: number
          locked_until?: string | null
          password_hash?: string
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      admin_security_events: {
        Row: {
          actor_id: string | null
          created_at: string
          detail: Json
          event: string
          id: string
          user_id: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          detail?: Json
          event: string
          id?: string
          user_id?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          detail?: Json
          event?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      admin_sessions: {
        Row: {
          auth_session_id: string
          created_at: string
          expires_at: string
          id: string
          user_id: string
        }
        Insert: {
          auth_session_id: string
          created_at?: string
          expires_at: string
          id?: string
          user_id: string
        }
        Update: {
          auth_session_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
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
      card_request_history: {
        Row: {
          actor_label: string
          changed_by: string
          created_at: string
          id: string
          internal_note: string
          new_status: string
          previous_status: string | null
          reason: string
          request_id: string
        }
        Insert: {
          actor_label: string
          changed_by: string
          created_at?: string
          id?: string
          internal_note?: string
          new_status: string
          previous_status?: string | null
          reason?: string
          request_id: string
        }
        Update: {
          actor_label?: string
          changed_by?: string
          created_at?: string
          id?: string
          internal_note?: string
          new_status?: string
          previous_status?: string | null
          reason?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_request_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "card_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      card_requests: {
        Row: {
          contact: Json
          created_at: string
          currency: string
          customer_id: string | null
          customer_notes: string
          delivery: Json
          delivery_charge: number | null
          discount: number
          id: string
          idempotency_key: string
          product_name: string
          profile_snapshot: Json
          quantity: number
          request_number: number
          reviewed_at: string | null
          status: string
          subtotal: number
          total: number | null
          tracking_reference: string | null
          unit_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          contact: Json
          created_at?: string
          currency?: string
          customer_id?: string | null
          customer_notes?: string
          delivery: Json
          delivery_charge?: number | null
          discount?: number
          id?: string
          idempotency_key: string
          product_name?: string
          profile_snapshot: Json
          quantity: number
          request_number?: never
          reviewed_at?: string | null
          status?: string
          subtotal: number
          total?: number | null
          tracking_reference?: string | null
          unit_price: number
          updated_at?: string
          user_id: string
        }
        Update: {
          contact?: Json
          created_at?: string
          currency?: string
          customer_id?: string | null
          customer_notes?: string
          delivery?: Json
          delivery_charge?: number | null
          discount?: number
          id?: string
          idempotency_key?: string
          product_name?: string
          profile_snapshot?: Json
          quantity?: number
          request_number?: never
          reviewed_at?: string | null
          status?: string
          subtotal?: number
          total?: number | null
          tracking_reference?: string | null
          unit_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_entries: {
        Row: {
          customer_id: string
          saved_at: string | null
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          customer_id: string
          saved_at?: string | null
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          customer_id?: string
          saved_at?: string | null
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "circle_entries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          active: boolean
          avatar_url: string | null
          background_color: string | null
          background_image_url: string | null
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
          overlay_color: string | null
          phone: string | null
          primary_color: string
          show_contact_button: boolean
          show_save_contact: boolean
          surface_border_color: string | null
          surface_color: string | null
          text_color: string
          theme: Database["public"]["Enums"]["profile_theme"]
          updated_at: string
          user_id: string | null
          username: string
          verified: boolean
          visibility: string
          website: string | null
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          background_color?: string | null
          background_image_url?: string | null
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
          overlay_color?: string | null
          phone?: string | null
          primary_color?: string
          show_contact_button?: boolean
          show_save_contact?: boolean
          surface_border_color?: string | null
          surface_color?: string | null
          text_color?: string
          theme?: Database["public"]["Enums"]["profile_theme"]
          updated_at?: string
          user_id?: string | null
          username: string
          verified?: boolean
          visibility?: string
          website?: string | null
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          background_color?: string | null
          background_image_url?: string | null
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
          overlay_color?: string | null
          phone?: string | null
          primary_color?: string
          show_contact_button?: boolean
          show_save_contact?: boolean
          surface_border_color?: string | null
          surface_color?: string | null
          text_color?: string
          theme?: Database["public"]["Enums"]["profile_theme"]
          updated_at?: string
          user_id?: string | null
          username?: string
          verified?: boolean
          visibility?: string
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
          file_mime: string | null
          file_path: string | null
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
          file_mime?: string | null
          file_path?: string | null
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
          file_mime?: string | null
          file_path?: string | null
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
          last_profile_type_change_at: string | null
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
          last_profile_type_change_at?: string | null
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
          last_profile_type_change_at?: string | null
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
      username_history: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          username: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          username: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "username_history_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _admin_log: {
        Args: { _detail?: Json; _event: string; _user: string }
        Returns: undefined
      }
      _admin_open_session: { Args: never; Returns: string }
      admin_auth_status: {
        Args: never
        Returns: {
          configured: boolean
          eligible: boolean
          expires_at: string
          locked_until: string
          owner: boolean
          username: string
          verified: boolean
        }[]
      }
      admin_login: {
        Args: { _password: string; _username: string }
        Returns: {
          error: string
          expires_at: string
          ok: boolean
        }[]
      }
      admin_logout: { Args: never; Returns: undefined }
      admin_reset_own_credentials: {
        Args: never
        Returns: {
          error: string
          ok: boolean
        }[]
      }
      admin_setup_credentials: {
        Args: { _password: string; _username: string }
        Returns: {
          error: string
          expires_at: string
          ok: boolean
        }[]
      }
      card_request_config: { Args: never; Returns: Json }
      get_circle_entries: {
        Args: never
        Returns: {
          avatar_url: string
          customer_id: string
          full_name: string
          saved_at: string
          username: string
          viewed_at: string
        }[]
      }
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
      get_leaderboard_page: {
        Args: { _page?: number; _page_size?: number; _period?: string }
        Returns: {
          avatar_url: string
          full_name: string
          rank: number
          total_count: number
          username: string
          views: number
        }[]
      }
      get_leaderboard_period: {
        Args: { _limit?: number; _period?: string }
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
          background_image_url: string
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
          overlay_color: string
          phone: string
          primary_color: string
          show_contact_button: boolean
          show_save_contact: boolean
          surface_border_color: string
          surface_color: string
          text_color: string
          theme: Database["public"]["Enums"]["profile_theme"]
          username: string
          verified: boolean
          website: string
        }[]
      }
      get_username_by_card: { Args: { _customer_id: string }; Returns: string }
      has_admin_stepup: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_customer: { Args: { _customer_id: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_owner: { Args: never; Returns: boolean }
      owner_grant_admin: {
        Args: { _email: string }
        Returns: {
          error: string
          ok: boolean
        }[]
      }
      owner_list_admins: {
        Args: never
        Returns: {
          configured: boolean
          email: string
          full_name: string
          granted_at: string
          is_owner: boolean
          user_id: string
        }[]
      }
      owner_reset_admin_credentials: {
        Args: { _user_id: string }
        Returns: {
          error: string
          ok: boolean
        }[]
      }
      owner_revoke_admin: {
        Args: { _user_id: string }
        Returns: {
          error: string
          ok: boolean
        }[]
      }
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
      resolve_username: { Args: { _username: string }; Returns: string }
      submit_card_request: {
        Args: { _customer_id: string; _key: string; _payload: Json }
        Returns: string
      }
      switch_profile_type: {
        Args: { _next: Database["public"]["Enums"]["account_type"] }
        Returns: {
          account_type: Database["public"]["Enums"]["account_type"]
          last_profile_type_change_at: string
        }[]
      }
      update_circle: {
        Args: { _action: string; _customer_id: string }
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
        | "menu"
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
        "menu",
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
