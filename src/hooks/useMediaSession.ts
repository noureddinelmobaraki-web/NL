import { useEffect } from 'react';

export interface MediaSessionTrack {
  title: string;
  artist?: string;
  album?: string;
  artwork?: string; // URL غلاف
}

export interface UseMediaSessionOpts {
  track: MediaSessionTrack | null;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}

/** يربط الـ playback مع Media Session API (شاشة القفل + مفاتيح الوسائط). */
export function useMediaSession({ track, isPlaying, onPlay, onPause, onNext, onPrev }: UseMediaSessionOpts): void {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    if (track) {
      ms.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist ?? 'NL',
        album: track.album ?? 'NL',
        artwork: track.artwork
          ? [{ src: track.artwork, sizes: '512x512', type: 'image/webp' }]
          : [],
      });
    }
    ms.playbackState = isPlaying ? 'playing' : 'paused';
  }, [track, isPlaying]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    const set = (action: MediaSessionAction, handler: (() => void) | null) => {
      try { ms.setActionHandler(action, handler as MediaSessionActionHandler | null); } catch {}
    };
    set('play', onPlay);
    set('pause', onPause);
    set('nexttrack', onNext ?? null);
    set('previoustrack', onPrev ?? null);
    return () => {
      set('play', null); set('pause', null);
      set('nexttrack', null); set('previoustrack', null);
    };
  }, [onPlay, onPause, onNext, onPrev]);
}
