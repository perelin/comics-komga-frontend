/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public Komga origin for user-facing deep-links (native reader + OPDS).
   *  Derived from KOMGA_BASE_URL at build time; see vite.config.ts. */
  readonly VITE_KOMGA_PUBLIC_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
