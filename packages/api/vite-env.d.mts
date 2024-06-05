// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NOTEBOOKS_DIR: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
