/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_AUTH_ENABLED?: string;
  readonly VITE_CLOUD_AUTO_SYNC?: string;
  readonly VITE_DATA_MODE?: 'local' | 'cloud';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
