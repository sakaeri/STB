import { createClient } from '@supabase/supabase-js';

// Note: not using the generated Database generic here — supabase-js's
// strict table-typing needs a `Relationships`/`Views`/`Enums` shape we
// don't hand-maintain (see database.types.ts for the informal row shapes
// instead). Call sites cast query results to the shapes in types.ts.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill in your Supabase project credentials.',
  );
}

// Captured synchronously, before createClient() below has any chance to
// run — Supabase's own init strips the recovery token from the URL (via
// history.replaceState) before any onAuthStateChange callback fires, even
// the very first INITIAL_SESSION one, so re-checking the URL from inside
// a callback always finds it already gone. This is the only reliable way
// to know a page load came from a password-reset email link, and it has
// to survive across the whole "PASSWORD_RECOVERY fires late" race: that
// event still carries a real signed-in session, and INITIAL_SESSION (which
// always fires first) would otherwise treat it as a normal login.
let recoveryLinkOpened = typeof window !== 'undefined' && /type=recovery/.test(window.location.hash);
export function isPasswordRecoveryLink(): boolean {
  return recoveryLinkOpened;
}
export function clearPasswordRecoveryLink(): void {
  recoveryLinkOpened = false;
}

export const supabase = createClient(url, anonKey);
