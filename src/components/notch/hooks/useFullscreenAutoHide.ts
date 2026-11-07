import { useSyncExternalStore } from 'react';

function checkFullscreenActive(): boolean {
  if (typeof document === 'undefined') return false;

  const doc = document as Document & {
    webkitFullscreenElement?: Element | null;
  };
  if (doc.fullscreenElement || doc.webkitFullscreenElement) {
    return true;
  }

  if (
    document.body?.classList.contains('drawings-fullscreen-active') ||
    document.body?.classList.contains('nlav-open')
  ) {
    return true;
  }

  if (
    document.querySelector(
      '.lg-reader-workspace--fullscreen, .lg-cinema-gallery-stage--css-fullscreen, [data-fullscreen="true"]',
    )
  ) {
    return true;
  }

  const videos = document.getElementsByTagName('video');
  for (let i = 0; i < videos.length; i++) {
    const v = videos[i] as HTMLVideoElement & {
      webkitDisplayingFullscreen?: boolean;
    };
    if (v.webkitDisplayingFullscreen === true) {
      return true;
    }
  }

  return false;
}

let cachedSnapshot = false;
const subscribers = new Set<() => void>();
let listening = false;
let observer: MutationObserver | null = null;

function notifyIfChanged() {
  const next = checkFullscreenActive();
  if (next !== cachedSnapshot) {
    cachedSnapshot = next;
    subscribers.forEach((cb) => cb());
  }
}

function startListening() {
  if (listening || typeof document === 'undefined') return;
  listening = true;
  cachedSnapshot = checkFullscreenActive();

  document.addEventListener('fullscreenchange', notifyIfChanged);
  document.addEventListener('webkitfullscreenchange', notifyIfChanged);
  document.addEventListener('webkitbeginfullscreen', notifyIfChanged, true);
  document.addEventListener('webkitendfullscreen', notifyIfChanged, true);

  if (typeof MutationObserver !== 'undefined' && document.documentElement) {
    observer = new MutationObserver(notifyIfChanged);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-fullscreen'],
      subtree: true,
      childList: true,
    });
  }
}

function stopListening() {
  if (!listening || typeof document === 'undefined') return;
  listening = false;
  document.removeEventListener('fullscreenchange', notifyIfChanged);
  document.removeEventListener('webkitfullscreenchange', notifyIfChanged);
  document.removeEventListener('webkitbeginfullscreen', notifyIfChanged, true);
  document.removeEventListener('webkitendfullscreen', notifyIfChanged, true);
  observer?.disconnect();
  observer = null;
}

function subscribe(cb: () => void): () => void {
  if (subscribers.size === 0) {
    startListening();
  }
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
    if (subscribers.size === 0) {
      stopListening();
    }
  };
}

function getSnapshot(): boolean {
  if (!listening) {
    cachedSnapshot = checkFullscreenActive();
  }
  return cachedSnapshot;
}

function getServerSnapshot(): boolean {
  return false;
}

export function useFullscreenAutoHide(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
