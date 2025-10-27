/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENVIRONMENT?: string
  readonly VITE_AUTH_API_URL?: string
  readonly VITE_AUTH_API_PORT?: string
  readonly VITE_AUTH_SERVICE_PORT?: string
  readonly VITE_LEGO_API_URL?: string
  readonly VITE_LEGO_API_PORT?: string
  readonly VITE_FRONTEND_URL?: string
  readonly VITE_FRONTEND_PORT?: string
  readonly DEV: boolean
  readonly PROD: boolean
  readonly MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
