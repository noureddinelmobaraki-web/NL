import { useEffect, useRef } from 'react';
import type Hls from 'hls.js';
import type { ErrorData, Events } from 'hls.js';
import { getOrCreateHls, getHlsClass } from '../audio/hlsPool';

// ─── Preload exports (unchanged behavior) ─────────────────────────────────
const preloadedUrls = new Set<string>();

async function preloadFirstSegments(m3u8Url: string, targetSeconds = 4): Promise<void> {
  if (preloadedUrls.has(m3u8Url)) return;
  preloadedUrls.add(m3u8Url);
  try {
    const res = await fetch(m3u8Url, { cache: 'force-cache' });
    if (!res.ok) return;
    const text = await res.text();
    const baseUrl = m3u8Url.substring(0, m3u8Url.lastIndexOf('/') + 1);
    const lines = text.split('\n');
    let accumulated = 0, nextDuration = 0;
    const toFetch: string[] = [];
    for (const raw of lines) {
      const line = raw.trim();
      if (line.startsWith('#EXTINF:')) nextDuration = parseFloat(line.slice(8)) || 4;
      else if (line && !line.startsWith('#')) {
        toFetch.push(line.startsWith('http') ? line : baseUrl + line);
        accumulated += nextDuration;
        if (accumulated >= targetSeconds) break;
      }
    }
    await Promise.all(
      toFetch.map((u) => fetch(u, { cache: 'force-cache' }).catch(() => {}))
    );
  } catch {/* swallow */}
}

export async function preloadAllSongs(urls: string[], targetSeconds = 4, batchSize = 2, batchDelay = 600) {
  const hlsUrls = urls.filter(u => u.includes('.m3u8'));
  for (let i = 0; i < hlsUrls.length; i += batchSize) {
    const batch = hlsUrls.slice(i, i + batchSize);
    await Promise.all(batch.map(url => preloadFirstSegments(url, targetSeconds)));
    if (i + batchSize < hlsUrls.length) await new Promise(r => setTimeout(r, batchDelay));
  }
}

export function preloadSong(url: string) {
  if (!url || !url.includes('.m3u8')) return;
  getOrCreateHls(url).catch(() => {});
}

// ─── Hook ────────────────────────────────────────────────────────────────
export function useHlsAudio(
  audioRef: React.RefObject<HTMLAudioElement | null>,
  url: string | null | undefined,
  onReady?: () => void
) {
  // Generation counter — increments on every URL change
  const generationRef = useRef(0);
  const currentHlsRef = useRef<Hls | null>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !url) return;

    // 1) Bump generation FIRST — any pending event from previous URL becomes stale
    generationRef.current += 1;
    const myGen = generationRef.current;
    const isStale = () => myGen !== generationRef.current;

    // 2) Atomic detach of previous HLS BEFORE doing anything else
    try { if (!audio.paused) audio.pause(); } catch {}
    if (currentHlsRef.current) {
      try { currentHlsRef.current.detachMedia(); } catch {}
      currentHlsRef.current = null;
    }
    if (audio.src && audio.src !== url) {
      try {
        audio.removeAttribute('src');
        audio.load();
      } catch {}
    }

    const isHls = url.endsWith('.m3u8') || url.includes('/index.m3u8');

    // Wrap onReady — drop if generation mismatched
    const safeFireReady = () => {
      if (isStale()) {
        if (import.meta.env.DEV) {
          console.debug('[useHlsAudio] dropped stale onReady for gen', myGen);
        }
        return;
      }
      onReadyRef.current?.();
    };

    let cleanupFn: (() => void) | null = null;

    const init = async () => {
      // Branch A: native MP3 / Safari HLS
      if (!isHls || audio.canPlayType('application/vnd.apple.mpegurl')) {
        audio.src = url;
        audio.load();
        const handler = () => safeFireReady();
        audio.addEventListener('canplay', handler, { once: true });
        cleanupFn = () => audio.removeEventListener('canplay', handler);
        return;
      }

      // Branch B: hls.js
      const HlsClass = await getHlsClass();
      if (isStale()) return;
      if (!HlsClass.isSupported()) return;

      const hls = await getOrCreateHls(url);
      if (isStale()) {
        // bail BEFORE attaching anything
        return;
      }

      let readyFired = false;
      const fireReady = () => {
        if (readyFired || isStale()) return;
        readyFired = true;
        safeFireReady();
      };

      const onManifestParsed = () => fireReady();
      const errHandler = (_e: Events.ERROR, data: ErrorData) => {
        if (isStale() || !data.fatal) return;
        if (data.type === HlsClass.ErrorTypes.NETWORK_ERROR) {
          console.warn('[HLS] Network error, retrying...', data);
          hls.startLoad();
        } else if (data.type === HlsClass.ErrorTypes.MEDIA_ERROR) {
          console.warn('[HLS] Media error, recovering...', data);
          hls.recoverMediaError();
        }
      };

      if (hls.levels && hls.levels.length > 0) {
        // already parsed — defer to next microtask so cleanup wiring is set
        queueMicrotask(fireReady);
      } else {
        hls.on(HlsClass.Events.MANIFEST_PARSED, onManifestParsed);
      }
      hls.on(HlsClass.Events.ERROR, errHandler);

      hls.attachMedia(audio);
      currentHlsRef.current = hls;

      cleanupFn = () => {
        hls.off(HlsClass.Events.MANIFEST_PARSED, onManifestParsed);
        hls.off(HlsClass.Events.ERROR, errHandler);
        try { hls.detachMedia(); } catch {}
      };
    };

    init().catch((err) => {
      if (!isStale()) console.warn('[useHlsAudio] init failed:', err);
    });

    return () => {
      // bump again so any straggler treats itself as stale
      generationRef.current += 1;
      cleanupFn?.();
    };
  }, [url, audioRef]);
}
