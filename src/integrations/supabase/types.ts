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
      events: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          end_at: string
          id: string
          source: string
          start_at: string
          task_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          end_at: string
          id?: string
          source?: string
          start_at: string
          task_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          end_at?: string
          id?: string
          source?: string
          start_at?: string
          task_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          current_value: number
          description: string | null
          end_date: string | null
          id: string
          linked_category: string | null
          linked_habit_id: string | null
          period: string
          start_date: string | null
          target_value: number
          title: string
          unit: string | null
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          current_value?: number
          description?: string | null
          end_date?: string | null
          id?: string
          linked_category?: string | null
          linked_habit_id?: string | null
          period?: string
          start_date?: string | null
          target_value?: number
          title: string
          unit?: string | null
          updated_at?: string
          user_id: string
          week_start?: string
        }
        Update: {
          created_at?: string
          current_value?: number
          description?: string | null
          end_date?: string | null
          id?: string
          linked_category?: string | null
          linked_habit_id?: string | null
          period?: string
          start_date?: string | null
          target_value?: number
          title?: string
          unit?: string | null
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_linked_habit_id_fkey"
            columns: ["linked_habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_logs: {
        Row: {
          created_at: string
          habit_id: string
          id: string
          log_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          habit_id: string
          id?: string
          log_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          habit_id?: string
          id?: string
          log_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          best_streak: number
          color: string | null
          created_at: string
          frequency: number[] | null
          icon: string | null
          id: string
          name: string
          streak: number
          target_per_week: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          best_streak?: number
          color?: string | null
          created_at?: string
          frequency?: number[] | null
          icon?: string | null
          id?: string
          name: string
          streak?: number
          target_per_week?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          best_streak?: number
          color?: string | null
          created_at?: string
          frequency?: number[] | null
          icon?: string | null
          id?: string
          name?: string
          streak?: number
          target_per_week?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read_at: string | null
          scheduled_for: string
          task_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          scheduled_for: string
          task_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          scheduled_for?: string
          task_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          available_days: number[] | null
          avatar_url: string | null
          created_at: string
          daily_available_minutes: number | null
          fixed_commitments: string | null
          full_name: string | null
          gym_days: number[] | null
          gym_time: string | null
          habits_text: string | null
          id: string
          is_premium: boolean
          language: string
          notifications_enabled: boolean
          objectives: string | null
          onboarding_completed: boolean
          premium_until: string | null
          sleep_time: string | null
          theme: string
          trial_ends_at: string
          trial_started_at: string
          updated_at: string
          wake_time: string | null
          work_days: number[] | null
          work_end: string | null
          work_start: string | null
        }
        Insert: {
          available_days?: number[] | null
          avatar_url?: string | null
          created_at?: string
          daily_available_minutes?: number | null
          fixed_commitments?: string | null
          full_name?: string | null
          gym_days?: number[] | null
          gym_time?: string | null
          habits_text?: string | null
          id: string
          is_premium?: boolean
          language?: string
          notifications_enabled?: boolean
          objectives?: string | null
          onboarding_completed?: boolean
          premium_until?: string | null
          sleep_time?: string | null
          theme?: string
          trial_ends_at?: string
          trial_started_at?: string
          updated_at?: string
          wake_time?: string | null
          work_days?: number[] | null
          work_end?: string | null
          work_start?: string | null
        }
        Update: {
          available_days?: number[] | null
          avatar_url?: string | null
          created_at?: string
          daily_available_minutes?: number | null
          fixed_commitments?: string | null
          full_name?: string | null
          gym_days?: number[] | null
          gym_time?: string | null
          habits_text?: string | null
          id?: string
          is_premium?: boolean
          language?: string
          notifications_enabled?: boolean
          objectives?: string | null
          onboarding_completed?: boolean
          premium_until?: string | null
          sleep_time?: string | null
          theme?: string
          trial_ends_at?: string
          trial_started_at?: string
          updated_at?: string
          wake_time?: string | null
          work_days?: number[] | null
          work_end?: string | null
          work_start?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          category: string | null
          completed_at: string | null
          created_at: string
          deadline: string | null
          description: string | null
          estimated_minutes: number
          id: string
          is_fixed: boolean
          position: number
          priority: number
          scheduled_end: string | null
          scheduled_start: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          estimated_minutes?: number
          id?: string
          is_fixed?: boolean
          position?: number
          priority?: number
          scheduled_end?: string | null
          scheduled_start?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          estimated_minutes?: number
          id?: string
          is_fixed?: boolean
          position?: number
          priority?: number
          scheduled_end?: string | null
          scheduled_start?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
