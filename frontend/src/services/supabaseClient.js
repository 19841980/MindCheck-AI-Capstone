/**
 * MindCheck Frontend — Supabase Client Wrapper.
 *
 * Single point of access to Supabase Auth from the frontend.
 * Per architecture rules (§1.2), all external dependencies are
 * wrapped so that changing the provider requires editing only
 * this module.
 *
 * Uses the ANON key (public) — never the service_role key.
 * The service_role key is backend-only (§5.2).
 *
 * Environment variables:
 *   VITE_SUPABASE_URL — Supabase project URL
 *   VITE_SUPABASE_ANON_KEY — Supabase public anon key
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    '[MindCheck] VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY son obligatorios. ' +
    'Crea un archivo .env en frontend/ con estos valores.'
  );
}

/**
 * Singleton Supabase client for the frontend.
 *
 * Auth persistence is set to 'localStorage' by default, which means
 * the session survives page reloads. Supabase JS v2 handles token
 * refresh automatically in the background.
 */
export const supabase = createClient(
  SUPABASE_URL || '',
  SUPABASE_ANON_KEY || '',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

export default supabase;
