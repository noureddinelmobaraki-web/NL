import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App.tsx';
import { SectionErrorBoundary } from './components/SectionErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import './index.css';
import './styles/aero-theme.css';
import './transitions/genie.css';
import './styles/page-mode-layer.css';
import './styles/components/mobile-modals.css';
import './styles/components/profile-mobile-fit.css';
import './styles/components/perf-lite.css';
import './styles/mobile-no-backdrop-filter.css';
import { registerServiceWorker } from './utils/registerSW';
import { reportWebVitals } from './utils/vitals';
import { isAutomatedEnv } from './utils/env';
import { initSentry } from './utils/sentry';
import './i18n';
import i18n, { applyDirection } from './i18n';

// Dynamic preconnect to Supabase endpoint
try {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (supabaseUrl) {
    const origin = new URL(supabaseUrl).origin;
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
    
    const dnsLink = document.createElement('link');
    dnsLink.rel = 'dns-prefetch';
    dnsLink.href = origin;
    document.head.appendChild(dnsLink);
  }
} catch (e) {}

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

