/**
 * src/features/liquid-glass/stages/audiobooks/hooks/useMediaSession.ts
 *
 * Syncs browser MediaSession API for lock-screen & headphone controls on mobile/desktop.
 */

import { useEffect } from 'react';
import type { AudiobookChapter, AudiobookItem } from '../../../services/types';

interface UseMediaSessionParams {
  book: AudiobookItem | null;
  chapter: AudiobookChapter | undefined;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  onPrev: () => void;
  onNext: () => void;
}

export function useMediaSession({
  book,
  chapter,
  audioRef,
  onPrev,
  onNext,
}: UseMediaSessionParams) {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || !book || !chapter) {
      return;
    }

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: chapter.title,
        artist: book.author,
        album: book.title,
        artwork: book.coverUrl ? [{ src: book.coverUrl, sizes: '512x512' }] : [],
      });

      const audio = audioRef.current;
      navigator.mediaSession.setActionHandler('play', () => {
        void audio?.play().catch(() => {});
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        audio?.pause();
      });
      navigator.mediaSession.setActionHandler('seekbackward', () => {
        if (audio) audio.currentTime = Math.max(0, audio.currentTime - 15);
      });
      navigator.mediaSession.setActionHandler('seekforward', () => {
        if (audio) audio.currentTime = Math.min(audio.duration || Infinity, audio.currentTime + 15);
      });
      navigator.mediaSession.setActionHandler('previoustrack', onPrev);
      navigator.mediaSession.setActionHandler('nexttrack', onNext);
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (audio && details.seekTime != null) {
          audio.currentTime = details.seekTime;
        }
      });
    } catch {
      /* ignore unsupported mediaSession actions */
    }
  }, [book, chapter, audioRef, onPrev, onNext]);
}
