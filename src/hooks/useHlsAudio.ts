import { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { getOrCreateHls } from '../audio/hlsPool';

// preload يبقى كما هو (لكن مع force-cache)
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
    await Promise.all(toFetch.map(u => fetch(u, { cache: 'force-cache' }).catch(() => {})));
  } catch {}
}

export async function preloadAllSongs(urls: string[], targetSeconds = 4, batchSize = 2, batchDelay = 600) {
  const hlsUrls = urls.filter(u => u.includes('.m3u8'));
  for (let i = 0; i < hlsUrls.length; i += batchSize) {
    const batch = hlsUrls.slice(i, i + batchSize);
    await Promise.all(batch.map(url => preloadFirstSegments(url, targetSeconds)));
    if (i + batchSize < hlsUrls.length) {
      await new Promise(r => setTimeout(r, batchDelay));
    }
  }
}

/**
 * Pre-warms a single song manifest + segments on hover.
 */
export function preloadSong(url: string) {
  if (!url || !url.includes('.m3u8') || !Hls.isSupported()) return;
  getOrCreateHls(url);
}

export function useHlsAudio(
  audioRef: React.RefObject<HTMLAudioElement | null>,
  url: string | null | undefined,
  onReady?: () => void
) {
  const currentHlsRef = useRef<Hls | null>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !url) return;

    // فصل HLS السابق دون تدميره (يبقى في pool)
    if (currentHlsRef.current) {
      currentHlsRef.current.detachMedia();
      currentHlsRef.current = null;
    }

    const isHls = url.endsWith('.m3u8') || url.includes('/index.m3u8');

    // unified onReady handler via canplay event
    const handleCanPlay = () => {
      onReadyRef.current?.();
    };

    if (isHls) {
      // Safari/iOS — native HLS
      if (audio.canPlayType('application/vnd.apple.mpegurl')) {
        audio.src = url;
        audio.load();
        if (audio.readyState >= 2) {
          handleCanPlay();
        } else {
          audio.addEventListener('canplay', handleCanPlay, { once: true });
        }
        return () => audio.removeEventListener('canplay', handleCanPlay);
      }

      if (Hls.isSupported()) {
        const hls = getOrCreateHls(url);
        
        let readyFired = false;
        const fireReady = () => {
          if (readyFired) return;
          readyFired = true;
          handleCanPlay();
        };

        const onManifestParsed = () => fireReady();

        if (hls.levels && hls.levels.length > 0) {
          setTimeout(fireReady, 0);
        } else {
          hls.on(Hls.Events.MANIFEST_PARSED, onManifestParsed);
        }

        const errHandler = (_: any, data: any) => {
          if (!data.fatal) return;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            console.warn("[HLS] Network error, retrying...", data);
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            console.warn("[HLS] Media error, recovering...", data);
            hls.recoverMediaError();
          }
        };

        hls.on(Hls.Events.ERROR, errHandler);
        
        hls.attachMedia(audio);
        currentHlsRef.current = hls;

        return () => {
          hls.off(Hls.Events.MANIFEST_PARSED, onManifestParsed);
          hls.off(Hls.Events.ERROR, errHandler);
          hls.detachMedia();
        };
      }
    }

    // MP3 fallback
    audio.src = url;
    audio.load();
    if (audio.readyState >= 2) {
      handleCanPlay();
    } else {
      audio.addEventListener('canplay', handleCanPlay, { once: true });
    }
    return () => audio.removeEventListener('canplay', handleCanPlay);
  }, [url]);
}
