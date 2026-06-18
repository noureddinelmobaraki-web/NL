function saveCurrentPlaybackState() {
  try {
    const state: Record<string, any> = {
      timestamp: Date.now(),
      audios: []
    };
    
    // Capture src, currentTime, volume, and other media states of any audio/video element
    const mediaElements = Array.from(document.querySelectorAll('audio, video'));
    mediaElements.forEach((el) => {
      const media = el as HTMLAudioElement | HTMLVideoElement;
      if (media.src) {
        state.audios.push({
          id: media.id || null,
          src: media.src,
          currentTime: media.currentTime,
          paused: media.paused,
          volume: media.volume,
        });
      }
    });

    // Also persist local storage preferences (Theme etc) in session state for fallback
    const prefsRaw = localStorage.getItem('nl-prefs-v1');
    if (prefsRaw) {
      state.prefs = JSON.parse(prefsRaw);
    }
    
    sessionStorage.setItem('nl_playback_state', JSON.stringify(state));
  } catch (err) {
    console.warn('[SW Tool] Failed to preserve playback state:', err);
  }
}

function showUpdateToast() {
  if (document.getElementById('sw-update-toast')) return;

  const toast = document.createElement('div');
  toast.id = 'sw-update-toast';
  toast.className = 'sw-toast';

  const messageText = document.createElement('div');
  messageText.textContent = 'New version available — refresh when ready';
  messageText.className = 'sw-toast-message';

  const btnContainer = document.createElement('div');
  btnContainer.className = 'sw-toast-btn-container';

  const dismissBtn = document.createElement('button');
  dismissBtn.textContent = 'Dismiss';
  dismissBtn.className = 'sw-toast-btn-dismiss';
  dismissBtn.onclick = () => {
    toast.remove();
  };

  const refreshBtn = document.createElement('button');
  refreshBtn.textContent = 'Refresh Now';
  refreshBtn.className = 'sw-toast-btn-refresh';
  refreshBtn.onclick = () => {
    saveCurrentPlaybackState();
    window.location.reload();
  };

  btnContainer.appendChild(dismissBtn);
  btnContainer.appendChild(refreshBtn);

  toast.appendChild(messageText);
  toast.appendChild(btnContainer);

  document.body.appendChild(toast);
}

export function registerServiceWorker(): () => void {
  if (!('serviceWorker' in navigator)) return () => {};

  if (!import.meta.env.PROD) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    }).catch(() => {});
    return () => {};
  }

  const cleanupFns: Array<() => void> = [];
  let lastUpdate = Date.now();

  const onLoad = async () => {
    try {
      const base = import.meta.env.BASE_URL || '/';
      const reg = await navigator.serviceWorker.register(`${base}sw.js`, {
        scope: base,
        updateViaCache: 'none',
      });

      // Force immediate update check on load to bypass old versions
      reg.update().catch(() => {});

      const onVisibility = () => {
        if (document.visibilityState === 'visible') {
          const now = Date.now();
          if (now - lastUpdate >= 30 * 60 * 1000) {
            reg.update();
            lastUpdate = now;
          }
        }
      };
      document.addEventListener('visibilitychange', onVisibility);
      cleanupFns.push(() => document.removeEventListener('visibilitychange', onVisibility));

      const onUpdateFound = () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        const onStateChange = () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        };
        newWorker.addEventListener('statechange', onStateChange);
        cleanupFns.push(() => newWorker.removeEventListener('statechange', onStateChange));
      };
      reg.addEventListener('updatefound', onUpdateFound);
      cleanupFns.push(() => reg.removeEventListener('updatefound', onUpdateFound));
    } catch {
      /* SW failed — site still works */
    }
  };
  window.addEventListener('load', onLoad);
  cleanupFns.push(() => window.removeEventListener('load', onLoad));

  let refreshing = false;
  const onControllerChange = () => {
    if (refreshing) return;
    refreshing = true;
    const isAudioPlaying = Array.from(document.querySelectorAll('audio, video')).some(
      (el) => !(el as HTMLMediaElement).paused && (el as HTMLMediaElement).currentTime > 0
    );
    saveCurrentPlaybackState();
    if (!isAudioPlaying) {
      window.location.reload();
    } else {
      refreshing = false;
      showUpdateToast();
    }
  };
  navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
  cleanupFns.push(() =>
    navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
  );

  return () => cleanupFns.forEach((fn) => fn());
}
