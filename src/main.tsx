// Fix read-only window.fetch in sandboxed iframe environments (e.g. AI Studio preview)
try {
  if (typeof window !== 'undefined' && 'fetch' in window) {
    let currentFetch = window.fetch;
    const patchDescriptor = {
      configurable: true,
      enumerable: true,
      get() {
        return currentFetch;
      },
      set(v: any) {
        currentFetch = v;
      }
    };
    let patched = false;
    if (typeof Window !== 'undefined' && Window.prototype) {
      try {
        Object.defineProperty(Window.prototype, 'fetch', patchDescriptor);
        patched = true;
      } catch (e) {}
    }
    if (!patched) {
      let target = window as any;
      while (target) {
        try {
          const desc = Object.getOwnPropertyDescriptor(target, 'fetch');
          if (desc && desc.configurable) {
            Object.defineProperty(target, 'fetch', patchDescriptor);
            patched = true;
            break;
          }
        } catch (e) {}
        target = Object.getPrototypeOf(target);
      }
    }
    if (!patched) {
      try {
        Object.defineProperty(window, 'fetch', patchDescriptor);
      } catch (e) {}
    }
  }
} catch (err) {
  console.warn('Failed to patch window.fetch accessor:', err);
}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App.tsx';
import { SectionErrorBoundary } from './components/SectionErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import './index.css';
import './transitions/genie.css';
import './styles/page-mode-layer.css';
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
      <AuthProvider>
        <App />
      </AuthProvider>
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

