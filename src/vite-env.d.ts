/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEN_IMG_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
