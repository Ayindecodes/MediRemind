export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      dose_logs: {
        Row: {
          created_at: string;
          id: string;
          medication_id: string;
          scheduled_for: string;
          skip_reason: string | null;
          source: string;
          status: string;
          taken_at: string | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          medication_id: string;
          scheduled_for: string;
          skip_reason?: string | null;
          source?: string;
          status: string;
          taken_at?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          medication_id?: string;
          scheduled_for?: string;
          skip_reason?: string | null;
          source?: string;
          status?: string;
          taken_at?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'dose_logs_medication_fkey';
            columns: ['medication_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'medications';
            referencedColumns: ['id', 'user_id'];
          },
        ];
      };
      medications: {
        Row: {
          appearance: Json | null;
          archived_at: string | null;
          created_at: string;
          dose_amount: number;
          dose_unit: string;
          end_date: string | null;
          form: string;
          id: string;
          instructions: string | null;
          nafdac_number: string | null;
          name: string;
          notes: string | null;
          paused_at: string | null;
          photo_path: string | null;
          quantity_remaining: number | null;
          refill_alert_days: number | null;
          reminder_channels: string[] | null;
          schedule: NonNullable<Json>;
          start_date: string;
          strength: string | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          appearance?: Json | null;
          archived_at?: string | null;
          created_at?: string;
          dose_amount?: number;
          dose_unit?: string;
          end_date?: string | null;
          form?: string;
          id?: string;
          instructions?: string | null;
          nafdac_number?: string | null;
          name: string;
          notes?: string | null;
          paused_at?: string | null;
          photo_path?: string | null;
          quantity_remaining?: number | null;
          refill_alert_days?: number | null;
          reminder_channels?: string[] | null;
          schedule: NonNullable<Json>;
          start_date: string;
          strength?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          appearance?: Json | null;
          archived_at?: string | null;
          created_at?: string;
          dose_amount?: number;
          dose_unit?: string;
          end_date?: string | null;
          form?: string;
          id?: string;
          instructions?: string | null;
          nafdac_number?: string | null;
          name?: string;
          notes?: string | null;
          paused_at?: string | null;
          photo_path?: string | null;
          quantity_remaining?: number | null;
          refill_alert_days?: number | null;
          reminder_channels?: string[] | null;
          schedule?: NonNullable<Json>;
          start_date?: string;
          strength?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'medications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      moods: {
        Row: {
          created_at: string;
          id: string;
          logged_on: string;
          mood: string;
          note: string | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          logged_on: string;
          mood: string;
          note?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          logged_on?: string;
          mood?: string;
          note?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'moods_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_prefs: {
        Row: {
          channels: string[];
          discreet: boolean;
          follow_up_channel: string | null;
          follow_up_minutes: number | null;
          grace_minutes: number;
          lead_minutes: number;
          quiet_hours_end: string | null;
          quiet_hours_start: string | null;
          updated_at: string;
          user_id: string;
          whatsapp_opted_in_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          channels?: string[];
          discreet?: boolean;
          follow_up_channel?: string | null;
          follow_up_minutes?: number | null;
          grace_minutes?: number;
          lead_minutes?: number;
          quiet_hours_end?: string | null;
          quiet_hours_start?: string | null;
          updated_at?: string;
          user_id: string;
          whatsapp_opted_in_at?: string | null;
        };
        Update: {
          channels?: string[];
          discreet?: boolean;
          follow_up_channel?: string | null;
          follow_up_minutes?: number | null;
          grace_minutes?: number;
          lead_minutes?: number;
          quiet_hours_end?: string | null;
          quiet_hours_start?: string | null;
          updated_at?: string;
          user_id?: string;
          whatsapp_opted_in_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_prefs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          action_url: string | null;
          created_at: string;
          id: string;
          message: string;
          read_at: string | null;
          type: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          action_url?: string | null;
          created_at?: string;
          id?: string;
          message: string;
          read_at?: string | null;
          type: string;
          user_id: string;
        };
        Update: {
          action_url?: string | null;
          created_at?: string;
          id?: string;
          message?: string;
          read_at?: string | null;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      payment_events: {
        Row: {
          amount_kobo: number | null;
          dedupe_key: string;
          event_type: string;
          id: string;
          payload: NonNullable<Json>;
          processed_at: string | null;
          provider: string;
          received_at: string;
          reference: string | null;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          amount_kobo?: number | null;
          dedupe_key: string;
          event_type: string;
          id?: string;
          payload: NonNullable<Json>;
          processed_at?: string | null;
          provider?: string;
          received_at?: string;
          reference?: string | null;
          user_id?: string | null;
        };
        Update: {
          amount_kobo?: number | null;
          dedupe_key?: string;
          event_type?: string;
          id?: string;
          payload?: NonNullable<Json>;
          processed_at?: string | null;
          provider?: string;
          received_at?: string;
          reference?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'payment_events_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string | null;
          full_name: string;
          id: string;
          language: string;
          phone: string | null;
          plan: string;
          plan_expires_at: string | null;
          timezone: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          email?: string | null;
          full_name: string;
          id: string;
          language?: string;
          phone?: string | null;
          plan?: string;
          plan_expires_at?: string | null;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          full_name?: string;
          id?: string;
          language?: string;
          phone?: string | null;
          plan?: string;
          plan_expires_at?: string | null;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          auth: string;
          created_at: string;
          endpoint: string;
          id: string;
          last_used_at: string | null;
          p256dh: string;
          user_agent: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          auth: string;
          created_at?: string;
          endpoint: string;
          id?: string;
          last_used_at?: string | null;
          p256dh: string;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          auth?: string;
          created_at?: string;
          endpoint?: string;
          id?: string;
          last_used_at?: string | null;
          p256dh?: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'push_subscriptions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      reminder_deliveries: {
        Row: {
          attempt: number;
          channel: string;
          cost_kobo: number | null;
          created_at: string;
          delivered_at: string | null;
          error: string | null;
          id: string;
          kind: string;
          medication_id: string;
          provider_message_id: string | null;
          scheduled_for: string;
          sent_at: string | null;
          status: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          attempt?: number;
          channel: string;
          cost_kobo?: number | null;
          created_at?: string;
          delivered_at?: string | null;
          error?: string | null;
          id?: string;
          kind?: string;
          medication_id: string;
          provider_message_id?: string | null;
          scheduled_for: string;
          sent_at?: string | null;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          attempt?: number;
          channel?: string;
          cost_kobo?: number | null;
          created_at?: string;
          delivered_at?: string | null;
          error?: string | null;
          id?: string;
          kind?: string;
          medication_id?: string;
          provider_message_id?: string | null;
          scheduled_for?: string;
          sent_at?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reminder_deliveries_medication_fkey';
            columns: ['medication_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'medications';
            referencedColumns: ['id', 'user_id'];
          },
        ];
      };
      subscriptions: {
        Row: {
          amount_kobo: number;
          billing: string;
          created_at: string;
          current_period_end: string;
          current_period_start: string;
          id: string;
          paystack_customer_code: string | null;
          paystack_email_token: string | null;
          paystack_subscription_code: string | null;
          plan: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          amount_kobo: number;
          billing: string;
          created_at?: string;
          current_period_end: string;
          current_period_start: string;
          id?: string;
          paystack_customer_code?: string | null;
          paystack_email_token?: string | null;
          paystack_subscription_code?: string | null;
          plan: string;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          amount_kobo?: number;
          billing?: string;
          created_at?: string;
          current_period_end?: string;
          current_period_start?: string;
          id?: string;
          paystack_customer_code?: string | null;
          paystack_email_token?: string | null;
          paystack_subscription_code?: string | null;
          plan?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'subscriptions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_valid_timezone: { Args: { name: string }; Returns: boolean };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
