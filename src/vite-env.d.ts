/// <reference types="vite/client" />

interface ImportMetaEnv {
  // No VITE_ keys needed for generation APIs as they are proxied
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
