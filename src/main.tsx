import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './utils/registerSW';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

const isAutomatedMain = typeof navigator !== 'undefined' && (navigator as any).webdriver === true;
if (!isAutomatedMain) {
  registerServiceWorker();
}
