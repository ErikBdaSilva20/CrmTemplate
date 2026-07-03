/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Base URL of the tenant-gateway. When set, `db` (client.ts) talks to the real
  // backend. When empty, data calls surface a "backend não conectado" notice.
  readonly VITE_GATEWAY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
