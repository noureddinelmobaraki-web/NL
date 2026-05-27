// src/utils/win12Bridge.ts
//
// Thin parent-side helper that talks to the Win12 sandbox tab.
// The Win12 desktop.js installs a postMessage listener for
// { source:'NL_WIN12_BRIDGE', action, url, name }.
//
// Usage:
//   const win = Win12Bridge.launch();
//   Win12Bridge.openImage(win, 'https://…/photo.jpg', 'Photo.jpg');
//   Win12Bridge.openAudio(win, 'https://…/stream.mp3', 'Radio Mars');
//   Win12Bridge.openVideo(win, 'https://…/stream.m3u8', 'Al Aoula HD');

type BridgeAction = 'openImage' | 'openAudio' | 'openVideo';

interface BridgePayload {
  source: 'NL_WIN12_BRIDGE';
  action: BridgeAction;
  url:    string;
  name?:  string;
}

const READY_FLAG = Symbol.for('NL_WIN12_BRIDGE_READY');

function markReady(win: Window) {
  (win as any)[READY_FLAG] = true;
}
function isReady(win: Window): boolean {
  return Boolean((win as any)[READY_FLAG]);
}

let listenerAttached = false;
function attachReadyListener() {
  if (listenerAttached || typeof window === 'undefined') return;
  listenerAttached = true;
  window.addEventListener('message', (ev) => {
    const d = ev.data as { source?: string; ready?: boolean } | null;
    if (d && d.source === 'NL_WIN12_BRIDGE' && d.ready && ev.source) {
      try { markReady(ev.source as Window); } catch { /* noop */ }
    }
  });
}

export const Win12Bridge = {
  /** Opens the Win12 tab; returns the Window handle (or null if blocked). */
  launch(path = 'win12/desktop.html'): Window | null {
    attachReadyListener();
    const base = (import.meta as any).env?.BASE_URL ?? '/';
    return window.open(`${base}${path}`, '_blank', 'noopener=no');
  },

  /** Sends a media-open request; waits for readiness if needed. */
  send(target: Window | null, payload: Omit<BridgePayload, 'source'>) {
    if (!target || target.closed) return;
    attachReadyListener();
    const msg: BridgePayload = { source: 'NL_WIN12_BRIDGE', ...payload };
    const post = () => { try { target.postMessage(msg, '*'); } catch { /* noop */ } };

    if (isReady(target)) { post(); return; }

    // Wait up to 5 seconds for the win12 tab to signal readiness
    let attempts = 0;
    const poll = setInterval(() => {
      attempts++;
      if (isReady(target)) { clearInterval(poll); post(); return; }
      if (attempts > 50)   { clearInterval(poll); return; } // give up after 5s
    }, 100);
  },

  openImage(win: Window | null, url: string, name?: string) {
    this.send(win, { action: 'openImage', url, name });
  },
  openAudio(win: Window | null, url: string, name?: string) {
    this.send(win, { action: 'openAudio', url, name });
  },
  openVideo(win: Window | null, url: string, name?: string) {
    this.send(win, { action: 'openVideo', url, name });
  },
};

export default Win12Bridge;
