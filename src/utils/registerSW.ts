export function registerServiceWorker() {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/NL/sw.js', { scope: '/NL/' })
        .catch(() => {}); // silent fail — SW is enhancement only
    });
  }
}
