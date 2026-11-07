import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(url && anonKey);
export const isAuthEnabled = import.meta.env.VITE_AUTH_ENABLED === 'true' && isSupabaseConfigured;

/**
 * Cliente público de Supabase. Solo usa la `anon key`; la seguridad real vive en RLS.
 * Devuelve `null` en modo local/demo para no romper los flujos existentes.
 */
export const supabase: SupabaseClient | null =
  isSupabaseConfigured && url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;
