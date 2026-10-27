/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Режим API: 'mock' (localStorage, по умолчанию) или 'rest' (реальный бэкенд). */
  readonly VITE_API_MODE?: string;
  /** Базовый URL REST API, напр. http://localhost:8080/api. По умолчанию '/api'. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
