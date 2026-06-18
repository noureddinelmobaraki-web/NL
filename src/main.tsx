// Fix read-only window.fetch in sandboxed iframe environments (e.g. AI Studio preview)
try {
  if (typeof window !== 'undefined' && 'fetch' in window) {
    let target = window as any;
    let descriptor;
    while (target && !descriptor) {
      descriptor = Object.getOwnPropertyDescriptor(target, 'fetch');
      target = Object.getPrototypeOf(target);
    }
    const isReadOnly = descriptor && (
      (descriptor.writable === false) ||
      (descriptor.set === undefined && descriptor.get !== undefined)
    );
    if (isReadOnly || !descriptor) {
      let currentFetch = window.fetch;
      Object.defineProperty(window, 'fetch', {
        configurable: true,
        enumerable: true,
        get() {
          return currentFetch;
        },
        set(v) {
          currentFetch = v;
        },
      });
    }
  }
} catch (err) {
  console.warn('Failed to patch window.fetch accessor:', err);
}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App.tsx';
import { SectionErrorBoundary } from './components/SectionErrorBoundary';
import './index.css';
import './transitions/genie.css';
import { registerServiceWorker } from './utils/registerSW';
import { reportWebVitals } from './utils/vitals';
import { isAutomatedEnv } from './utils/env';
import { initSentry } from './utils/sentry';
import './i18n';
import i18n, { applyDirection } from './i18n';

initSentry();
applyDirection(i18n.resolvedLanguage || 'ar');

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Fatal: #root element not found in index.html');
}
createRoot(rootElement).render(
  <StrictMode>
    <SectionErrorBoundary sectionName="App">
      <App />
    </SectionErrorBoundary>
  </StrictMode>,
);

const isAutomatedMain = isAutomatedEnv();
if (!isAutomatedMain) {
  const swCleanup = registerServiceWorker();
  if (import.meta.hot) {
    import.meta.hot.dispose(swCleanup);
  }
  reportWebVitals();
}

// (ahdafa al-kutlah bil-kamil — registerServiceWorker() is handling the update toast)

