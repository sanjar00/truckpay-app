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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      deductions: {
        Row: {
          amount: number
          created_at: string
          date_added: string
          id: string
          is_custom_type: boolean
          is_fixed: boolean
          load_report_id: string | null
          type: string
          updated_at: string
          user_id: string
          week_period: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          date_added?: string
          id?: string
          is_custom_type?: boolean
          is_fixed?: boolean
          load_report_id?: string | null
          type: string
          updated_at?: string
          user_id: string
          week_period?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          date_added?: string
          id?: string
          is_custom_type?: boolean
          is_fixed?: boolean
          load_report_id?: string | null
          type?: string
          updated_at?: string
          user_id?: string
          week_period?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deductions_load_report_id_fkey"
            columns: ["load_report_id"]
            isOneToOne: false
            referencedRelation: "load_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_types: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          created_at: string
          date: string
          expense_type_id: string
          id: string
          note: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          date: string
          expense_type_id: string
          id?: string
          note?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          expense_type_id?: string
          id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_expense_type_id_fkey"
            columns: ["expense_type_id"]
            isOneToOne: false
            referencedRelation: "expense_types"
            referencedColumns: ["id"]
          },
        ]
      }
      ifta_rates: {
        Row: {
          quarter: number
          rate: number
          state: string
          updated_at: string | null
          year: number
        }
        Insert: {
          quarter: number
          rate: number
          state: string
          updated_at?: string | null
          year: number
        }
        Update: {
          quarter?: number
          rate?: number
          state?: string
          updated_at?: string | null
          year?: number
        }
        Relationships: []
      }
      load_reports: {
        Row: {
          company_deduction: number | null
          created_at: string
          date_added: string
          deadhead_miles: number | null
          delivery_city_state: string | null
          delivery_date: string | null
          delivery_zip: string | null
          detention_amount: number | null
          driver_pay: number
          estimated_miles: number | null
          fuel_purchases: Json | null
          id: string
          location_from: string
          location_to: string
          notes: string | null
          pickup_city_state: string | null
          pickup_date: string | null
          pickup_zip: string | null
          rate: number
          states_miles: Json | null
          stop_count: number
          total_stop_off_fees: number
          updated_at: string
          user_id: string
          week_period: string
        }
        Insert: {
          company_deduction?: number | null
          created_at?: string
          date_added: string
          deadhead_miles?: number | null
          delivery_city_state?: string | null
          delivery_date?: string | null
          delivery_zip?: string | null
          detention_amount?: number | null
          driver_pay: number
          estimated_miles?: number | null
          fuel_purchases?: Json | null
          id?: string
          location_from: string
          location_to: string
          notes?: string | null
          pickup_city_state?: string | null
          pickup_date?: string | null
          pickup_zip?: string | null
          rate: number
          states_miles?: Json | null
          stop_count?: number
          total_stop_off_fees?: number
          updated_at?: string
          user_id: string
          week_period: string
        }
        Update: {
          company_deduction?: number | null
          created_at?: string
          date_added?: string
          deadhead_miles?: number | null
          delivery_city_state?: string | null
          delivery_date?: string | null
          delivery_zip?: string | null
          detention_amount?: number | null
          driver_pay?: number
          estimated_miles?: number | null
          fuel_purchases?: Json | null
          id?: string
          location_from?: string
          location_to?: string
          notes?: string | null
          pickup_city_state?: string | null
          pickup_date?: string | null
          pickup_zip?: string | null
          rate?: number
          states_miles?: Json | null
          stop_count?: number
          total_stop_off_fees?: number
          updated_at?: string
          user_id?: string
          week_period?: string
        }
        Relationships: []
      }
      load_stops: {
        Row: {
          city_state: string | null
          created_at: string
          detention_amount: number
          id: string
          leg_miles: number | null
          load_id: string
          notes: string | null
          scheduled_at: string | null
          sequence: number
          stop_off_fee: number
          stop_type: string
          updated_at: string
          user_id: string
          zip: string | null
        }
        Insert: {
          city_state?: string | null
          created_at?: string
          detention_amount?: number
          id?: string
          leg_miles?: number | null
          load_id: string
          notes?: string | null
          scheduled_at?: string | null
          sequence: number
          stop_off_fee?: number
          stop_type: string
          updated_at?: string
          user_id: string
          zip?: string | null
        }
        Update: {
          city_state?: string | null
          created_at?: string
          detention_amount?: number
          id?: string
          leg_miles?: number | null
          load_id?: string
          notes?: string | null
          scheduled_at?: string | null
          sequence?: number
          stop_off_fee?: number
          stop_type?: string
          updated_at?: string
          user_id?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "load_stops_load_id_fkey"
            columns: ["load_id"]
            isOneToOne: false
            referencedRelation: "load_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_deduction: number
          company_pay_rate: number | null
          company_pay_type: string | null
          created_at: string
          driver_type: string | null
          full_name: string | null
          id: string
          lease_rate_per_mile: number | null
          onboarded: boolean
          phone: string | null
          updated_at: string
          weekly_period: string | null
          weekly_period_updated_at: string | null
        }
        Insert: {
          company_deduction?: number
          company_pay_rate?: number | null
          company_pay_type?: string | null
          created_at?: string
          driver_type?: string | null
          full_name?: string | null
          id: string
          lease_rate_per_mile?: number | null
          onboarded?: boolean
          phone?: string | null
          updated_at?: string
          weekly_period?: string | null
          weekly_period_updated_at?: string | null
        }
        Update: {
          company_deduction?: number
          company_pay_rate?: number | null
          company_pay_type?: string | null
          created_at?: string
          driver_type?: string | null
          full_name?: string | null
          id?: string
          lease_rate_per_mile?: number | null
          onboarded?: boolean
          phone?: string | null
          updated_at?: string
          weekly_period?: string | null
          weekly_period_updated_at?: string | null
        }
        Relationships: []
      }
      subscription_reminders: {
        Row: {
          id: string
          shown_at: string
          threshold: number
          user_id: string
        }
        Insert: {
          id?: string
          shown_at?: string
          threshold: number
          user_id: string
        }
        Update: {
          id?: string
          shown_at?: string
          threshold?: number
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string | null
          early_adopter: boolean
          early_adopter_banner_dismissed: boolean
          end_date: string | null
          id: string
          start_date: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: string
          trial_used: boolean
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          early_adopter?: boolean
          early_adopter_banner_dismissed?: boolean
          end_date?: string | null
          id?: string
          start_date?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          trial_used?: boolean
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          early_adopter?: boolean
          early_adopter_banner_dismissed?: boolean
          end_date?: string | null
          id?: string
          start_date?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          trial_used?: boolean
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      usage_counters: {
        Row: {
          counter_date: string
          scan_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          counter_date?: string
          scan_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          counter_date?: string
          scan_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string | null
          id: string
          removed_predefined_types: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          removed_predefined_types?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          removed_predefined_types?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      weekly_deductions: {
        Row: {
          amount: number
          created_at: string | null
          deduction_date: string | null
          deduction_type: string
          id: string
          updated_at: string | null
          user_id: string | null
          week_start: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          deduction_date?: string | null
          deduction_type: string
          id?: string
          updated_at?: string | null
          user_id?: string | null
          week_start: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          deduction_date?: string | null
          deduction_type?: string
          id?: string
          updated_at?: string | null
          user_id?: string | null
          week_start?: string
        }
        Relationships: []
      }
      weekly_extra_deductions: {
        Row: {
          amount: number
          created_at: string | null
          date_added: string | null
          id: number
          name: string
          updated_at: string | null
          user_id: string
          week_start: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          date_added?: string | null
          id?: number
          name: string
          updated_at?: string | null
          user_id: string
          week_start: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          date_added?: string | null
          id?: number
          name?: string
          updated_at?: string | null
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      weekly_mileage: {
        Row: {
          created_at: string
          end_mileage: number | null
          id: string
          lease_miles_cost: number | null
          start_mileage: number | null
          total_miles: number | null
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          end_mileage?: number | null
          id?: string
          lease_miles_cost?: number | null
          start_mileage?: number | null
          total_miles?: number | null
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          end_mileage?: number | null
          id?: string
          lease_miles_cost?: number | null
          start_mileage?: number | null
          total_miles?: number | null
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      clear_user_data: { Args: never; Returns: undefined }
      delete_user: { Args: never; Returns: undefined }
      dismiss_early_adopter_banner: { Args: never; Returns: undefined }
      try_consume_scan: { Args: { p_max: number }; Returns: boolean }
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
