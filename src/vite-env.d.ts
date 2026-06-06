/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly BASE_URL: string;
  readonly MODE: 'development' | 'production' | 'analyze';
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly SSR: boolean;
  readonly VITE_BASE_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// PWA / Service Worker types
declare interface ServiceWorkerRegistration {
  readonly waiting: ServiceWorker | null;
  readonly active: ServiceWorker | null;
  readonly installing: ServiceWorker | null;
}