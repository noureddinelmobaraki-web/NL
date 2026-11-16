const warmed = new Set<string>();

function isSaveDataEnabled(): boolean {
  if (typeof navigator === 'undefined') return false;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return Boolean(conn?.saveData);
}

export function prefetchAudio(url?: string | null): void {
  if (!url || typeof window === 'undefined' || isSaveDataEnabled() || warmed.has(url)) return;
  warmed.add(url);
  try {
    const a = new Audio();
    a.preload = 'metadata';
    a.muted = true;
    a.src = url;        // بلا crossOrigin
    a.load();
    setTimeout(() => { try { a.src = ''; a.load(); } catch { /* noop */ } }, 20000);
  } catch { /* noop */ }
}

export function prefetchTracks(tracks: Array<{ src?: string }>, n = 1): void {
  if (isSaveDataEnabled()) return;
  for (const t of tracks.slice(0, n)) prefetchAudio(t?.src);
}
