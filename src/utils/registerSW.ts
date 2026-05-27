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
  
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '24px',
    left: '24px',
    zIndex: '100000',
    backgroundColor: 'rgba(10, 10, 15, 0.95)',
    border: '1px solid rgba(184, 255, 63, 0.4)',
    boxShadow: '0 0 20px rgba(184, 255, 63, 0.15), 0 10px 30px rgba(0, 0, 0, 0.9)',
    borderRadius: '4px',
    padding: '16px 20px',
    maxWidth: '380px',
    backdropFilter: 'blur(8px)',
    color: '#ffffff',
    fontFamily: '"Inter", sans-serif',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    animation: 'sw-toast-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
  });

  if (!document.getElementById('sw-toast-styles')) {
    const styleTag = document.createElement('style');
    styleTag.id = 'sw-toast-styles';
    styleTag.textContent = `
      @keyframes sw-toast-in {
        from { transform: translateY(40px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(styleTag);
  }

  const messageText = document.createElement('div');
  messageText.textContent = 'New version available — refresh when ready';
  Object.assign(messageText.style, {
    fontSize: '13px',
    lineHeight: '1.5',
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  });

  const btnContainer = document.createElement('div');
  Object.assign(btnContainer.style, {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    justifyContent: 'flex-end',
  });

  const dismissBtn = document.createElement('button');
  dismissBtn.textContent = 'Dismiss';
  Object.assign(dismissBtn.style, {
    background: 'transparent',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: '11px',
    cursor: 'pointer',
    padding: '6px 12px',
    borderRadius: '4px',
    fontFamily: '"Inter", sans-serif',
    transition: 'all 0.2s',
  });
  dismissBtn.onmouseover = () => { dismissBtn.style.color = '#ffffff'; };
  dismissBtn.onmouseout = () => { dismissBtn.style.color = 'rgba(255, 255, 255, 0.45)'; };
  dismissBtn.onclick = () => {
    toast.remove();
  };

  const refreshBtn = document.createElement('button');
  refreshBtn.textContent = 'Refresh Now';
  Object.assign(refreshBtn.style, {
    backgroundColor: '#B8FF3F',
    border: 'none',
    color: '#000000',
    fontSize: '11px',
    fontWeight: 'bold',
    cursor: 'pointer',
    padding: '6px 14px',
    borderRadius: '4px',
    fontFamily: '"Inter", sans-serif',
    boxShadow: '0 2px 4px rgba(184, 255, 63, 0.2)',
    transition: 'all 0.2s',
  });
  refreshBtn.onmouseover = () => { refreshBtn.style.backgroundColor = '#a3e635'; };
  refreshBtn.onmouseout = () => { refreshBtn.style.backgroundColor = '#B8FF3F'; };
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

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/NL/sw.js', { 
        scope: '/NL/',
        updateViaCache: 'none'  // always check for SW updates
      });
      
      // Listen to visibilitychange and only check for service worker updates
      // when document is visible and at least 30 minutes have elapsed since last check
      let lastUpdate = Date.now();
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          const now = Date.now();
          if (now - lastUpdate >= 30 * 60 * 1000) {
            reg.update();
            lastUpdate = now;
          }
        }
      });
      
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
      
      // Check if any audio is currently playing
      const isAudioPlaying = Array.from(document.querySelectorAll('audio, video')).some(
        (el) => !(el as HTMLMediaElement).paused && (el as HTMLMediaElement).currentTime > 0
      );

      saveCurrentPlaybackState();

      if (!isAudioPlaying) {
        window.location.reload();
      } else {
        refreshing = false; // Reset to allow manual reload via the toast button
        showUpdateToast();
      }
    }
  });
}
