import { useCallback, useEffect, useState } from 'react';
import type { SharatTrack } from '../types/sharat.types';
import { resolveAnimeThemeFallback } from '../services/sharatArchiveResolver';
import { nowPlayingBus } from '../../../audio/nowPlayingBus';

export type SharatPlayMode = 'archive' | 'youtube' | 'animethemes' | 'poster-fallback';

const AUDIO_EXT_RE = /\.(mp3|ogg|m4a|wav|aac)(\?|$)/i;

export function isAudioOnlyUrl(url?: string | null): boolean {
  return Boolean(url && AUDIO_EXT_RE.test(url));
}

export function useSharatPlayerEngine(track: SharatTrack) {
  const [mode, setMode] = useState<SharatPlayMode>(
    track.hasExactArchiveStream && track.archiveUrl ? 'archive' : 'youtube',
  );
  const [directMediaUrl, setDirectMediaUrl] = useState<string | null>(
    track.hasExactArchiveStream && track.archiveUrl ? track.archiveUrl : null,
  );
  const [isVideoReady, setIsVideoReady] = useState(false);

  const switchToAnimeThemes = useCallback(async () => {
    const resolved = await resolveAnimeThemeFallback(track);
    const nextUrl = resolved.rawWebmUrl || resolved.rawAudioOggUrl;
    if (nextUrl) {
      setDirectMediaUrl(nextUrl);
      setIsVideoReady(false);
      setMode('animethemes');
    } else {
      setDirectMediaUrl(null);
      setMode('poster-fallback');
    }
  }, [track]);

  const advanceSilently = useCallback(() => {
    setMode((prev) => {
      if (prev === 'archive') {
        setDirectMediaUrl(null);
        setIsVideoReady(false);
        return 'youtube';
      }
      if (prev === 'youtube') {
        void switchToAnimeThemes();
        return prev;
      }
      setDirectMediaUrl(null);
      return 'poster-fallback';
    });
  }, [switchToAnimeThemes]);

  useEffect(() => {
    const hasArchive = Boolean(track.hasExactArchiveStream && track.archiveUrl);
    setMode(hasArchive ? 'archive' : 'youtube');
    setDirectMediaUrl(hasArchive ? track.archiveUrl || null : null);
    setIsVideoReady(false);

    nowPlayingBus.publish({
      source: 'song',
      title: track.seriesAr,
      subtitle: `${track.titleAr} · ${track.artistAr}`,
      artworkUrl: track.posterUrl,
      isPlaying: true,
    });
  }, [track]);

  // Silent watchdog if archive stream fails to become playable within 6.5s
  useEffect(() => {
    if (mode !== 'archive' || isVideoReady) return undefined;
    const timer = window.setTimeout(() => {
      advanceSilently();
    }, 6500);
    return () => window.clearTimeout(timer);
  }, [mode, isVideoReady, advanceSilently]);

  // Listen for YouTube player error events (e.g., 100/101/150) and fail over silently
  useEffect(() => {
    if (mode !== 'youtube') return undefined;
    const onMessage = (event: MessageEvent) => {
      if (typeof event.data !== 'string') return;
      try {
        const parsed = JSON.parse(event.data);
        if (parsed?.event === 'onError') {
          void switchToAnimeThemes();
        }
      } catch {
        // ignore non-JSON messages
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [mode, switchToAnimeThemes]);

  return {
    mode,
    directMediaUrl,
    isAudioOnly: isAudioOnlyUrl(directMediaUrl),
    isVideoReady,
    setIsVideoReady,
    advanceSilently,
  };
}
