import '@fontsource-variable/readex-pro/index.css';
import '@fontsource/cairo/arabic-400.css';
import '@fontsource/cairo/arabic-700.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App.tsx';
import { LazyMotion, domMax } from 'framer-motion';
import { SectionErrorBoundary } from './components/SectionErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import './index.css';
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
        {/* domMax مطلوب وليس اختيارياً: domAnimation لا يحمل محرك التخطيط،
        والمشروع يستعمل layoutId في 7 مواضع (SongCard، Lens، MeBit، Movies، AeroGallery).
        قبل أي رجوع إلى domAnimation: grep -rn 'layoutId' src وتأكد أن الناتج صفر. */}
        <LazyMotion features={domMax} strict>
          <App />
        </LazyMotion>
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

