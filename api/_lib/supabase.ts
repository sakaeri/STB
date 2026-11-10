// Server-side Supabase client helpers for Vercel Functions under /api.
// Two flavors: a client scoped to the calling user's own JWT (so normal RLS
// policies apply — used for anything the org owner/member could already do
// themselves), and a service-role client (bypasses RLS entirely — used only
// by the Stripe webhook, which has no Supabase user session at all).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function supabaseUrl(): string {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!url) throw new Error('Missing SUPABASE_URL');
  return url;
}

export function userClient(bearerToken: string): SupabaseClient {
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!anonKey) throw new Error('Missing VITE_SUPABASE_ANON_KEY');
  return createClient(supabaseUrl(), anonKey, {
    global: { headers: { Authorization: `Bearer ${bearerToken}` } },
    auth: { persistSession: false },
  });
}

export function serviceClient(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  return createClient(supabaseUrl(), key, { auth: { persistSession: false } });
}

export function bearerToken(authHeader: string | string[] | undefined): string | null {
  const header = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7);
}
