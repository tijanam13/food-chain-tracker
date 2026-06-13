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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      donations: {
        Row: {
          donated_at: string
          id: string
          item_name: string
          quantity: number
          unit: string
          user_id: string
        }
        Insert: {
          donated_at?: string
          id?: string
          item_name: string
          quantity?: number
          unit?: string
          user_id: string
        }
        Update: {
          donated_at?: string
          id?: string
          item_name?: string
          quantity?: number
          unit?: string
          user_id?: string
        }
        Relationships: []
      }
      family_groups: {
        Row: {
          created_at: string
          id: string
          invite_code: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code?: string
          name?: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      family_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "family_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      fridge_items: {
        Row: {
          category: string
          created_at: string
          expiry_date: string | null
          gtin_code: string | null
          id: string
          name: string
          quantity: number
          remaining_fridge_days: number | null
          status: string
          unit: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          expiry_date?: string | null
          gtin_code?: string | null
          id?: string
          name: string
          quantity?: number
          remaining_fridge_days?: number | null
          status?: string
          unit?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          expiry_date?: string | null
          gtin_code?: string | null
          id?: string
          name?: string
          quantity?: number
          remaining_fridge_days?: number | null
          status?: string
          unit?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          is_admin: boolean | null
          is_premium: boolean
          phone: string | null
          updated_at: string
          user_id: string
          wallet_address: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_admin?: boolean | null
          is_premium?: boolean
          phone?: string | null
          updated_at?: string
          user_id: string
          wallet_address?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_admin?: boolean | null
          is_premium?: boolean
          phone?: string | null
          updated_at?: string
          user_id?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      purchased_coupons: {
        Row: {
          coupon_category: string
          coupon_cost: number
          coupon_description: string
          coupon_icon: string
          coupon_id: string
          coupon_name: string
          id: string
          purchased_at: string
          qr_code: string
          status: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          coupon_category?: string
          coupon_cost: number
          coupon_description: string
          coupon_icon?: string
          coupon_id: string
          coupon_name: string
          id?: string
          purchased_at?: string
          qr_code?: string
          status?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          coupon_category?: string
          coupon_cost?: number
          coupon_description?: string
          coupon_icon?: string
          coupon_id?: string
          coupon_name?: string
          id?: string
          purchased_at?: string
          qr_code?: string
          status?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      used_recipes: {
        Row: {
          id: string
          recipe_data: Json | null
          recipe_title: string
          tokens_earned: number
          used_at: string
          user_id: string
        }
        Insert: {
          id?: string
          recipe_data?: Json | null
          recipe_title: string
          tokens_earned?: number
          used_at?: string
          user_id: string
        }
        Update: {
          id?: string
          recipe_data?: Json | null
          recipe_title?: string
          tokens_earned?: number
          used_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_tokens: {
        Row: {
          created_at: string
          id: string
          total_points: number
          total_tokens: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          total_points?: number
          total_tokens?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          total_points?: number
          total_tokens?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      family_profiles: {
        Row: {
          display_name: string | null
          email: string | null
          user_id: string | null
        }
        Insert: {
          display_name?: string | null
          email?: string | null
          user_id?: string | null
        }
        Update: {
          display_name?: string | null
          email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      adjust_user_tokens: {
        Args: { _point_delta?: number; _token_delta?: number; _user_id: string }
        Returns: undefined
      }
      admin_confirm_donation: {
        Args: {
          _donated_qty: number
          _donor_wallet: string
          _is_critical: boolean
          _item_id: string
          _item_name: string
          _total_qty: number
          _unit: string
        }
        Returns: undefined
      }
      get_family_member_ids: { Args: { _user_id: string }; Returns: string[] }
      get_my_premium: { Args: never; Returns: boolean }
      get_user_group_ids: { Args: { _user_id: string }; Returns: string[] }
      join_family_by_code: { Args: { _invite_code: string }; Returns: Json }
      set_user_premium: {
        Args: { _is_premium: boolean; _user_id: string }
        Returns: undefined
      }
      update_own_profile: {
        Args: {
          _avatar_url?: string
          _display_name?: string
          _phone?: string
          _wallet_address?: string
        }
        Returns: undefined
      }
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
    Enums: {},
  },
} as const
