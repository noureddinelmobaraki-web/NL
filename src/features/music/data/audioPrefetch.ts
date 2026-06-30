const warmed = new Set<string>();
export function prefetchAudio(url?: string | null): void {
  if (!url || typeof window === 'undefined' || warmed.has(url)) return;
  warmed.add(url);
  try {
    const a = new Audio();
    a.preload = 'auto';
    a.muted = true;
    a.src = url;        // بلا crossOrigin
    a.load();
    setTimeout(() => { try { a.src = ''; a.load(); } catch { /* noop */ } }, 20000);
  } catch { /* noop */ }
}
export function prefetchTracks(tracks: Array<{ src?: string }>, n = 6): void {
  for (const t of tracks.slice(0, n)) prefetchAudio(t?.src);
}
