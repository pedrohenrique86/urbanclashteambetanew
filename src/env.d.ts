/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  // Variáveis do Supabase removidas
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}