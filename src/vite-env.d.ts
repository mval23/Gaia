/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Application (client) ID of the Gaia app registration in Microsoft Entra. */
  readonly VITE_MS_CLIENT_ID?: string;
  /** Directory (tenant) ID; defaults to any work or school account. */
  readonly VITE_MS_TENANT_ID?: string;
  /** Project URL of the Supabase project that holds Gaia accounts and planners. */
  readonly VITE_SUPABASE_URL?: string;
  /** That project's public (anon / publishable) key. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** The same key under Supabase's newer name; used when VITE_SUPABASE_ANON_KEY is unset. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
