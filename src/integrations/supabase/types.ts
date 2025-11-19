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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      invoice_attachments: {
        Row: {
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_type: string
          id: string
          invoice_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_type: string
          id?: string
          invoice_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_type?: string
          id?: string
          invoice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_attachments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          amount: number
          created_at: string
          description: string
          hours: number
          id: string
          invoice_id: string
          item_order: number
          price: number
        }
        Insert: {
          amount?: number
          created_at?: string
          description: string
          hours?: number
          id?: string
          invoice_id: string
          item_order: number
          price?: number
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          hours?: number
          id?: string
          invoice_id?: string
          item_order?: number
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_address: string | null
          client_contact: string | null
          client_email: string | null
          client_name: string
          client_phone: string | null
          comments: string | null
          company_address: string | null
          company_email: string | null
          company_hst: string | null
          company_name: string
          company_phone: string | null
          company_website: string | null
          created_at: string
          fuel_charge: number | null
          id: string
          invoice_date: string
          invoice_number: string
          net_amount: number | null
          project_id: string | null
          status: string
          subtotal_hours: number | null
          tax_due: number | null
          tax_rate: number | null
          total_km: number | null
          total_payable: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_address?: string | null
          client_contact?: string | null
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          comments?: string | null
          company_address?: string | null
          company_email?: string | null
          company_hst?: string | null
          company_name?: string
          company_phone?: string | null
          company_website?: string | null
          created_at?: string
          fuel_charge?: number | null
          id?: string
          invoice_date?: string
          invoice_number: string
          net_amount?: number | null
          project_id?: string | null
          status?: string
          subtotal_hours?: number | null
          tax_due?: number | null
          tax_rate?: number | null
          total_km?: number | null
          total_payable?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client_address?: string | null
          client_contact?: string | null
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          comments?: string | null
          company_address?: string | null
          company_email?: string | null
          company_hst?: string | null
          company_name?: string
          company_phone?: string | null
          company_website?: string | null
          created_at?: string
          fuel_charge?: number | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          net_amount?: number | null
          project_id?: string | null
          status?: string
          subtotal_hours?: number | null
          tax_due?: number | null
          tax_rate?: number | null
          total_km?: number | null
          total_payable?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          hourly_salary: number
          id: string
          name: string
          target_budget: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hourly_salary?: number
          id?: string
          name: string
          target_budget?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hourly_salary?: number
          id?: string
          name?: string
          target_budget?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      work_periods: {
        Row: {
          created_at: string
          date: string
          days_worked: number
          hours_per_day: number
          id: string
          images: string[] | null
          location: string
          period_cost: number
          project_id: string
          team_size: number
          total_hours: number
          work_type: string
        }
        Insert: {
          created_at?: string
          date: string
          days_worked: number
          hours_per_day: number
          id?: string
          images?: string[] | null
          location: string
          period_cost: number
          project_id: string
          team_size: number
          total_hours: number
          work_type: string
        }
        Update: {
          created_at?: string
          date?: string
          days_worked?: number
          hours_per_day?: number
          id?: string
          images?: string[] | null
          location?: string
          period_cost?: number
          project_id?: string
          team_size?: number
          total_hours?: number
          work_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_periods_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
