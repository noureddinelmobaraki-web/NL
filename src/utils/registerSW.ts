const STREAM_SW_FILES = ['torrent-stream-sw.js', 'sw.js'];

function saveCurrentPlaybackState() {
  try {
    const state: Record<string, any> = { timestamp: Date.now(), audios: [] };
    document.querySelectorAll('audio, video').forEach((el) => {
      const m = el as HTMLMediaElement;
      if (m.src) {
        state.audios.push({
          id: m.id || null,
          src: m.src,
          currentTime: m.currentTime,
          paused: m.paused,
          volume: m.volume,
        });
      }
    });
    const prefsRaw = localStorage.getItem('nl-prefs-v1');
    if (prefsRaw) state.prefs = JSON.parse(prefsRaw);
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
  const msg = document.createElement('div');
  msg.textContent = 'New version available — refresh when ready';
  msg.className = 'sw-toast-message';
  const btns = document.createElement('div');
  btns.className = 'sw-toast-btn-container';
  const dismiss = document.createElement('button');
  dismiss.textContent = 'Dismiss';
  dismiss.className = 'sw-toast-btn-dismiss';
  dismiss.onclick = () => toast.remove();
  const refresh = document.createElement('button');
  refresh.textContent = 'Refresh Now';
  refresh.className = 'sw-toast-btn-refresh';
  refresh.onclick = () => {
    saveCurrentPlaybackState();
    window.location.reload();
  };
  btns.append(dismiss, refresh);
  toast.append(msg, btns);
  document.body.appendChild(toast);
}

/** True while any cinema download / torrent stream is running (set by downloadManager). */
function isBusy(): boolean {
  const mediaPlaying = Array.from(document.querySelectorAll('audio, video')).some(
    (el) => !(el as HTMLMediaElement).paused && (el as HTMLMediaElement).currentTime > 0,
  );
  return mediaPlaying || Boolean((window as any).__NL_CINEMA_BUSY__);
}

function scriptName(reg: ServiceWorkerRegistration): string {
  const w = reg.active || reg.waiting || reg.installing;
  try {
    return w ? new URL(w.scriptURL).pathname.split('/').pop() || '' : '';
  } catch {
    return '';
  }
}

let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

/**
 * Single source of truth for SW registration. downloadManager must call this
 * instead of navigator.serviceWorker.register() directly.
 */
export function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return Promise.resolve(null);
  if (registrationPromise) return registrationPromise;
  const base = import.meta.env.BASE_URL || '/';
  const scope = base.endsWith('/') ? base : `${base}/`;
  const file = import.meta.env.PROD ? 'sw.js' : 'torrent-stream-sw.js';
  registrationPromise = navigator.serviceWorker
    .register(`${scope}${file}`, { scope, updateViaCache: 'none' })
    .catch(() => null);
  return registrationPromise;
}

/** Resolves once the current page is controlled (needed for /__tp_stream__/). */
export async function waitForController(timeoutMs = 8000): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;
  if (navigator.serviceWorker.controller) return true;
  await ensureServiceWorker();
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(Boolean(navigator.serviceWorker.controller)), timeoutMs);
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => {
        clearTimeout(t);
        resolve(true);
      },
      { once: true },
    );
  });
}

function attachProdUpdateListeners(
  reg: ServiceWorkerRegistration,
  cleanupFns: Array<() => void>,
): void {
  let lastUpdate = Date.now();
  const onVisibility = () => {
    if (document.visibilityState === 'visible' && Date.now() - lastUpdate >= 30 * 60 * 1000) {
      reg.update().catch(() => {});
      lastUpdate = Date.now();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);
  cleanupFns.push(() => document.removeEventListener('visibilitychange', onVisibility));

  const onUpdateFound = () => {
    const nw = reg.installing;
    if (!nw) return;
    const onState = () => {
      if (nw.state === 'installed' && navigator.serviceWorker.controller && !isBusy()) {
        nw.postMessage({ type: 'SKIP_WAITING' });
      } else if (nw.state === 'installed' && navigator.serviceWorker.controller) {
        showUpdateToast();
      }
    };
    nw.addEventListener('statechange', onState);
    cleanupFns.push(() => nw.removeEventListener('statechange', onState));
  };
  reg.addEventListener('updatefound', onUpdateFound);
  cleanupFns.push(() => reg.removeEventListener('updatefound', onUpdateFound));
}

export function registerServiceWorker(): () => void {
  if (!('serviceWorker' in navigator)) return () => {};
  const cleanupFns: Array<() => void> = [];

  if (!import.meta.env.PROD) {
    navigator.serviceWorker
      .getRegistrations()
      .then(async (regs) => {
        for (const reg of regs) {
          if (scriptName(reg) !== 'torrent-stream-sw.js') await reg.unregister();
        }
        await ensureServiceWorker();
      })
      .catch(() => {});
    return () => {};
  }

  const start = async () => {
    try {
      for (const reg of await navigator.serviceWorker.getRegistrations()) {
        const n = scriptName(reg);
        if (n && !STREAM_SW_FILES.includes(n)) continue;
        if (n === 'torrent-stream-sw.js') await reg.unregister();
      }
    } catch {}
    const reg = await ensureServiceWorker();
    if (!reg) return;
    reg.update().catch(() => {});
    attachProdUpdateListeners(reg, cleanupFns);
  };

  if (document.readyState === 'complete') void start();
  else {
    const onLoad = () => void start();
    window.addEventListener('load', onLoad, { once: true });
    cleanupFns.push(() => window.removeEventListener('load', onLoad));
  }

  let hadController = Boolean(navigator.serviceWorker.controller);
  let refreshing = false;
  const onControllerChange = () => {
    if (!hadController) {
      hadController = true;
      return;
    }
    if (refreshing) return;
    saveCurrentPlaybackState();
    if (isBusy()) {
      showUpdateToast();
      return;
    }
    refreshing = true;
    window.location.reload();
  };
  navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
  cleanupFns.push(() => navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange));

  return () => cleanupFns.forEach((fn) => fn());
}
