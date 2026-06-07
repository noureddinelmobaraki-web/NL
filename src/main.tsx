import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { SectionErrorBoundary } from './components/SectionErrorBoundary';
import './index.css';
import { registerServiceWorker } from './utils/registerSW';
import { reportWebVitals } from './utils/vitals';
import { isAutomatedEnv } from './utils/env';

const params = new URLSearchParams(window.location.search);
const userLang = params.get('lang') || (navigator.language.startsWith('ar') ? 'ar' : 'en');
document.documentElement.setAttribute('lang', userLang);
document.documentElement.setAttribute('dir', userLang === 'ar' ? 'rtl' : 'ltr');

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

