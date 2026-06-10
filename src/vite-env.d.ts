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

declare global {
  interface Window {
    __nl_bot_detected?: boolean;
    /** Safari iOS standalone PWA flag */
    navigator: Navigator & { standalone?: boolean };
  }
}

declare module "react" {
  export function useEffectEvent<T extends Function>(fn: T): T;
  
  export interface ActivityProps {
    mode: "visible" | "hidden";
    children: React.ReactNode;
  }
  export const Activity: React.ComponentType<ActivityProps>;
}

export {};