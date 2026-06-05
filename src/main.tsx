import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './utils/registerSW';

const params = new URLSearchParams(window.location.search);
const userLang = params.get('lang') || (navigator.language.startsWith('ar') ? 'ar' : 'en');
document.documentElement.setAttribute('lang', userLang);
document.documentElement.setAttribute('dir', userLang === 'ar' ? 'rtl' : 'ltr');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

const isAutomatedMain = typeof navigator !== 'undefined' && (navigator as any).webdriver === true;
if (!isAutomatedMain) {
  registerServiceWorker();
}

if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (document.getElementById('sw-update-toast') || document.getElementById('sw-update-toast-simple')) return;
    const toast = document.createElement('div');
    toast.id = 'sw-update-toast-simple';
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '24px',
      left: '24px',
      zIndex: '100000',
      backgroundColor: 'rgba(10, 10, 15, 0.95)',
      border: '1px solid rgba(184, 255, 63, 0.5)',
      borderRadius: '4px',
      padding: '12px 18px',
      color: '#ffffff',
      fontSize: '13px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.8)',
    });
    
    const isAr = document.documentElement.getAttribute('lang') === 'ar';
    const message = isAr ? 'نسخة جديدة متاحة، اضغط لإعادة التحميل' : 'New version available, click to refresh';
    const btnLabel = isAr ? 'إعادة تحميل' : 'Refresh';

    toast.innerHTML = `
      <span>${message}</span>
      <button id="sw-reload-btn-simple" style="background:#B8FF3F; border:none; color:#000; padding:4px 8px; border-radius:3px; cursor:pointer; font-weight:bold; font-size:11px; transition: opacity 0.2s;">${btnLabel}</button>
    `;
    document.body.appendChild(toast);
    
    const reloadBtn = toast.querySelector('#sw-reload-btn-simple');
    if (reloadBtn) {
      (reloadBtn as HTMLButtonElement).addEventListener('mouseover', () => {
        (reloadBtn as HTMLButtonElement).style.opacity = '0.8';
      });
      (reloadBtn as HTMLButtonElement).addEventListener('mouseout', () => {
        (reloadBtn as HTMLButtonElement).style.opacity = '1';
      });
      reloadBtn.addEventListener('click', () => {
        window.location.reload();
      });
    }
  });
}

