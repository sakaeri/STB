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
          created_by: string | null; created_at: string;
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
        Update: never;
      };
      confirmed_periods: {
        Row: { team_id: string; period: string; confirmed_by: string | null; confirmed_at: string };
        Insert: { team_id: string; period: string; confirmed_by?: string | null };
        Update: never;
      };
    };
    Functions: {
      invite_org_member: { Args: { p_org_id: string; p_email: string; p_role: string }; Returns: void };
      invite_team_member: { Args: { p_team_id: string; p_email: string; p_role: string }; Returns: void };
    };
  };
}
