/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_CURRENCY_CODE?: string;
  readonly VITE_CURRENCY_LABEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
