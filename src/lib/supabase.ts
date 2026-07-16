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

export const supabase = createClient(url, anonKey);
