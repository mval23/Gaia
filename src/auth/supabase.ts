import { createClient } from '@supabase/supabase-js';

/**
 * Gaia accounts and cloud saving, through Supabase. Both values are public by
 * design (row-level security in supabase/schema.sql is what keeps each
 * person's planner private). Without them Gaia runs as before: no sign-in,
 * everything saved in this browser.
 */
const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
// Supabase now calls it the publishable key; either name works.
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)?.trim() ?? '';

export const cloudConfigured = url.length > 0 && anonKey.length > 0;

export const supabase = createClient(cloudConfigured ? url : 'http://localhost', cloudConfigured ? anonKey : 'unset', {
  auth: { persistSession: true, autoRefreshToken: cloudConfigured, detectSessionInUrl: cloudConfigured },
});
