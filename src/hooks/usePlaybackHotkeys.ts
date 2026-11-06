import { useCallback, useEffect, useRef } from 'react';
import type { ActiveSong } from '../types';

export function usePlaybackHotkeys(
  toggleAudio: () => void,
  activeSong: ActiveSong | null,
): void {
  const toggleAudioRef = useRef(toggleAudio);
  const activeSongRef = useRef(activeSong);

  useEffect(() => {
    toggleAudioRef.current = toggleAudio;
    activeSongRef.current = activeSong;
  }, [toggleAudio, activeSong]);

  const onKeyboardShortcut = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }
    switch (e.code) {
      case 'Space':
        e.preventDefault();
        toggleAudioRef.current();
        break;
      case 'ArrowRight':
        e.preventDefault();
        activeSongRef.current?.onNext?.();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        activeSongRef.current?.onPrev?.();
        break;
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKeyboardShortcut(e);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onKeyboardShortcut]);
}
