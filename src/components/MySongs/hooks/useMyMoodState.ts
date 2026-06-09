import React, { useState, useRef, useEffect, useCallback } from 'react';
import { audioManager } from '../../../audio/audioManager';

export interface UseMyMoodStateProps {
  /** هل يلعب المشغّل الرئيسي حالياً؟ */
  isSongPlaying: boolean;
  /** ref لـ audio element المشغّل الرئيسي */
  audioRef: React.RefObject<HTMLAudioElement | null>;
  onSongStop?: () => void;
}

export function useMyMoodState({ isSongPlaying, audioRef, onSongStop }: UseMyMoodStateProps) {
  const [isMoodTransitioning, setIsMoodTransitioning] = useState(false);
  const [isMoodActive, setIsMoodActive] = useState(false);
  const isMoodActiveRef = useRef(false);
  const moodAudioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    isMoodActiveRef.current = isMoodActive;
  }, [isMoodActive]);

  const triggerMood = useCallback(() => {
    setIsMoodTransitioning((prev) => {
      if (prev) return prev;
      if (isMoodActiveRef.current) return prev;
      return true;
    });

    if (!moodAudioCtxRef.current || moodAudioCtxRef.current.state === 'closed') {
      try { moodAudioCtxRef.current = new AudioContext(); }
      catch (err) { console.warn('[useMyMoodState] AudioContext failed:', err); }
    }
    if (moodAudioCtxRef.current?.state === 'suspended') {
      moodAudioCtxRef.current.resume().catch(() => {});
    }

    try {
      if (isSongPlaying) {
        audioRef.current?.pause();
        onSongStop?.();
      }
    } catch {}
    try { audioManager.pause?.('bg'); } catch {}
  }, [isSongPlaying, audioRef, onSongStop]);

  const onTransitionComplete = useCallback(() => {
    setIsMoodTransitioning(false);
    setIsMoodActive(true);
  }, []);

  const onMoodExit = useCallback(() => {
    setIsMoodActive(false);
    onSongStop?.();
    audioManager.unpauseBg();
  }, [onSongStop]);

  return {
    isMoodTransitioning,
    isMoodActive,
    moodAudioCtx: moodAudioCtxRef.current,
    triggerMood,
    onTransitionComplete,
    onMoodExit,
  };
}
