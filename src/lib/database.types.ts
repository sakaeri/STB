// Hand-written to match supabase/migrations/0001_init.sql.
// If the schema changes, update this alongside the migration
// (or regenerate with `supabase gen types typescript` once the Supabase CLI is set up).

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; email: string; name: string; is_admin: boolean; created_at: string };
        Insert: { id: string; email?: string; name?: string; is_admin?: boolean };
        Update: { name?: string; is_admin?: boolean };
      };
      orgs: {
        Row: {
          id: string; name: string; address: string; rep: string; closing_day: string; fiscal_start_month: number;
          unit_label: string | null; unit_label_plural: string | null; logo_url: string | null;
          default_use_royalty: boolean; default_royalty_mode: string; default_royalty_rate: number; default_royalty_amount: number;
          default_use_savings: boolean; default_savings_mode: string; default_savings: number; default_savings_rate: number;
          created_by: string | null; created_at: string; status: 'active' | 'frozen'; reading: string;
          stripe_customer_id: string | null; stripe_subscription_id: string | null;
          daily_closing_enabled: boolean;
          billed_step: number;
        };
        Insert: Partial<Database['public']['Tables']['orgs']['Row']> & { name: string };
        Update: Partial<Database['public']['Tables']['orgs']['Row']>;
      };
      org_members: {
        Row: { id: string; org_id: string; user_id: string; role: string; created_at: string };
        Insert: { id?: string; org_id: string; user_id: string; role: string };
        Update: { role?: string };
      };
      teams: {
        Row: {
          id: string; org_id: string; name: string; owner_name: string; bg_color: string; logo_url: string | null;
          use_royalty: boolean; royalty_mode: string; royalty_rate: number; royalty_amount: number;
          use_savings: boolean; savings_mode: string; savings: number; savings_rate: number;
          created_period: string; created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['teams']['Row']> & { org_id: string; name: string };
        Update: Partial<Database['public']['Tables']['teams']['Row']>;
      };
      team_members: {
        Row: { id: string; team_id: string; user_id: string; role: string; created_at: string };
        Insert: { id?: string; team_id: string; user_id: string; role: string };
        Update: { role?: string };
      };
      transactions: {
        Row: {
          id: string; team_id: string; type: 'sales' | 'expense'; title: string; amount: number; date: string;
          photo_url: string | null; created_by: string | null; created_at: string;
        };
        Insert: {
          id?: string; team_id: string; type: 'sales' | 'expense'; title?: string; amount: number; date: string;
          photo_url?: string | null; created_by?: string | null;
        };
        Update: Partial<Database['public']['Tables']['transactions']['Row']>;
      };
      memo_topics: {
        Row: { id: string; org_id: string; team_id: string | null; name: string; created_by: string | null; created_at: string };
        Insert: { id?: string; org_id: string; team_id?: string | null; name: string; created_by?: string | null };
        Update: { name?: string; team_id?: string | null };
      };
      memo_entries: {
        Row: { id: string; topic_id: string; name: string; created_at: string };
        Insert: { id?: string; topic_id: string; name: string };
        Update: { name?: string };
      };
      memo_records: {
        Row: { id: string; entry_id: string; label: string; text: string; date: string; created_at: string };
        Insert: { id?: string; entry_id: string; label: string; text: string; date: string };
        Update: { label?: string; text?: string; date?: string };
      };
      trash_items: {
        Row: {
          id: string; org_id: string; team_id: string | null; type: string; label: string; data: unknown;
          deleted_by: string | null; deleted_at: string;
        };
        Insert: { id?: string; org_id: string; team_id?: string | null; type: string; label: string; data: unknown; deleted_by?: string | null };
        Update: { team_id?: string | null; data?: unknown };
      };
      confirmed_periods: {
        Row: { team_id: string; period: string; confirmed_by: string | null; confirmed_at: string };
        Insert: { team_id: string; period: string; confirmed_by?: string | null };
        Update: never;
      };
      invites: {
        Row: {
          id: string; org_id: string; team_id: string; role: string; created_by: string | null;
          used_by: string | null; used_at: string | null; created_at: string; expires_at: string;
        };
        Insert: never; // created only via the create_invite() RPC
        Update: never;
      };
      admin_audit_log: {
        Row: { id: string; ts: string; text: string; created_by: string | null };
        Insert: { text: string; created_by?: string | null };
        Update: never;
      };
      app_settings: {
        Row: {
          id: 1; logo_url: string | null; billing_provider: 'stripe' | 'square';
          billing_api_key_stripe: string; billing_api_key_square: string; payment_grace_days: number;
          terms: string; plan_prices: unknown; updated_at: string;
        };
        Insert: never;
        Update: Partial<Omit<Database['public']['Tables']['app_settings']['Row'], 'id'>>;
      };
    };
    Functions: {
      create_invite: { Args: { p_team_id: string; p_role: string }; Returns: string };
      create_org_invite: { Args: { p_org_id: string; p_role: string }; Returns: string };
      get_invite_info: { Args: { p_id: string }; Returns: unknown };
      redeem_invite: { Args: { p_id: string }; Returns: unknown };
      get_public_terms: { Args: Record<string, never>; Returns: string };
      get_public_app_logo: { Args: Record<string, never>; Returns: string };
      get_public_pricing: { Args: Record<string, never>; Returns: unknown };
    };
  };
}
