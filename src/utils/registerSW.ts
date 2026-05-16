export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/NL/sw.js', { 
        scope: '/NL/',
        updateViaCache: 'none'  // always check for SW updates
      });
      
      // Check for updates every 30 minutes (for long sessions)
      setInterval(() => reg.update(), 30 * 60 * 1000);
      
      // When a new SW is waiting, activate it immediately
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available — skip waiting immediately
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    } catch (e) {
      // SW failed — site still works, just without caching
    }
  });
  
  // Reload when new SW takes control
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}
