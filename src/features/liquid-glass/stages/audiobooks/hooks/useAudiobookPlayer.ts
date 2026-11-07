/**
 * src/features/liquid-glass/stages/audiobooks/hooks/useAudiobookPlayer.ts
 *
 * Manages <audio> playback, chapters, playback rate, scrubbing, and visibility/pause persistence.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { nowPlayingBus } from '../../../../../audio/nowPlayingBus';
import type { AudiobookChapter, AudiobookItem } from '../../../services/types';
import { useMediaSession } from './useMediaSession';

const SPEED_RATES = [0.75, 1, 1.25, 1.5, 2] as const;

interface UseAudiobookPlayerParams {
  selectedBook: AudiobookItem | null;
  chapters: AudiobookChapter[];
  externalMuted: boolean;
  onAudioActiveChange?: (active: boolean) => void;
  onAudioElementMount?: (el: HTMLMediaElement | null) => void;
  saveProgress: (
    book: AudiobookItem | null,
    chIdx: number,
    timeSec: number,
    durSec: number,
    forceImmediate?: boolean,
  ) => void;
}

export function useAudiobookPlayer({
  selectedBook,
  chapters,
  externalMuted,
  onAudioActiveChange,
  onAudioElementMount,
  saveProgress,
}: UseAudiobookPlayerParams) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const seekBarRef = useRef<HTMLDivElement | null>(null);
  const isScrubbingRef = useRef(false);

  const [activeChapterIdx, setActiveChapterIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isPlayerExpanded, setIsPlayerExpanded] = useState<boolean>(true);

  useEffect(() => {
    const el = audioRef.current;
    onAudioElementMount?.(el);
    return () => {
      onAudioElementMount?.(null);
      onAudioActiveChange?.(false);
    };
  }, [onAudioElementMount, onAudioActiveChange]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = externalMuted;
    }
  }, [externalMuted]);

  const startChapterPlayback = useCallback(
    (chapterList: AudiobookChapter[], index: number, seekSec = 0) => {
      const ch = chapterList[index];
      const audio = audioRef.current;
      if (!ch || !audio) return;

      setActiveChapterIdx(index);
      setIsPlayerExpanded(true);
      setIsBuffering(true);
      audio.src = ch.url;
      audio.playbackRate = playbackRate;
      audio.muted = externalMuted;

      const onLoaded = () => {
        if (seekSec > 0 && seekSec < (audio.duration || Infinity) - 3) {
          audio.currentTime = seekSec;
        }
        setDuration(audio.duration || ch.duration || 0);
        setIsBuffering(false);
        void audio.play().catch(() => {
          setIsPlaying(false);
        });
      };

      audio.addEventListener('loadedmetadata', onLoaded, { once: true });
      audio.load();
    },
    [playbackRate, externalMuted],
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const onPlay = () => {
      setIsPlaying(true);
      setIsBuffering(false);
      onAudioActiveChange?.(true);
    };
    const onPause = () => {
      setIsPlaying(false);
      onAudioActiveChange?.(false);
      if (selectedBook) {
        saveProgress(
          selectedBook,
          activeChapterIdx,
          audio.currentTime,
          audio.duration || duration,
          true,
        );
      }
    };
    const onWaiting = () => setIsBuffering(true);
    const onCanPlay = () => setIsBuffering(false);
    const onTimeUpdate = () => {
      if (!isScrubbingRef.current) {
        setCurrentTime(audio.currentTime || 0);
      }
      if (audio.duration && Number.isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
      if (selectedBook) {
        saveProgress(
          selectedBook,
          activeChapterIdx,
          audio.currentTime,
          audio.duration || duration,
          false,
        );
      }
    };
    const onEnded = () => {
      if (activeChapterIdx + 1 < chapters.length) {
        startChapterPlayback(chapters, activeChapterIdx + 1, 0);
      } else {
        setIsPlaying(false);
        onAudioActiveChange?.(false);
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && selectedBook && audio.currentTime > 0) {
        saveProgress(
          selectedBook,
          activeChapterIdx,
          audio.currentTime,
          audio.duration || duration,
          true,
        );
      }
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('playing', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('playing', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [
    selectedBook,
    activeChapterIdx,
    chapters,
    duration,
    onAudioActiveChange,
    saveProgress,
    startChapterPlayback,
  ]);

  const togglePlayPause = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    if (audio.paused) {
      void audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, []);

  const skipSeconds = useCallback((delta: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    const target = Math.max(0, Math.min((audio.duration || 0) - 1, audio.currentTime + delta));
    audio.currentTime = target;
    setCurrentTime(target);
  }, []);

  const handleRestartChapter = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    audio.currentTime = 0;
    setCurrentTime(0);
    if (audio.paused) {
      void audio.play().catch(() => {});
    }
  }, []);

  const cycleSpeed = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPlaybackRate((prev) => {
      const idx = SPEED_RATES.indexOf(prev as (typeof SPEED_RATES)[number]);
      const next = SPEED_RATES[(idx + 1) % SPEED_RATES.length];
      if (audioRef.current) {
        audioRef.current.playbackRate = next;
      }
      return next;
    });
  }, []);

  const seekAudioClientX = useCallback(
    (clientX: number) => {
      const bar = seekBarRef.current;
      const audio = audioRef.current;
      if (!bar || !audio || !Number.isFinite(duration) || duration <= 0) return;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.min(Math.max((clientX - rect.left) / Math.max(rect.width, 1), 0), 1);
      const target = ratio * duration;
      audio.currentTime = target;
      setCurrentTime(target);
    },
    [duration],
  );

  const handleSeekPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      isScrubbingRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      seekAudioClientX(e.clientX);
    },
    [seekAudioClientX],
  );

  const handleSeekPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isScrubbingRef.current) return;
      e.stopPropagation();
      seekAudioClientX(e.clientX);
    },
    [seekAudioClientX],
  );

  const handleSeekPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbingRef.current) return;
    e.stopPropagation();
    isScrubbingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch {
        /* ignore */
      }
    }
    onAudioActiveChange?.(false);
    setIsPlaying(false);
    nowPlayingBus.clear('audiobook');
  }, [onAudioActiveChange]);

  useEffect(() => {
    if (!selectedBook) {
      nowPlayingBus.clear('audiobook');
      return undefined;
    }
    const audio = audioRef.current;
    if (!isPlaying && (!audio || !audio.src)) {
      return undefined;
    }
    nowPlayingBus.publish({
      source: 'audiobook',
      title: chapters[activeChapterIdx]?.title || selectedBook.title,
      subtitle: selectedBook.author,
      artworkUrl: selectedBook.coverUrl,
      accent: '#BF5AF2',
      isPlaying,
      canPrev: activeChapterIdx > 0,
      canNext: activeChapterIdx + 1 < chapters.length,
      controls: {
        toggle: () => togglePlayPause(),
        prev: () => {
          if (activeChapterIdx > 0) {
            startChapterPlayback(chapters, activeChapterIdx - 1, 0);
          }
        },
        next: () => {
          if (activeChapterIdx + 1 < chapters.length) {
            startChapterPlayback(chapters, activeChapterIdx + 1, 0);
          }
        },
        stop: () => {
          stopAudio();
          nowPlayingBus.clear('audiobook');
        },
      },
    });
  }, [
    selectedBook,
    chapters,
    activeChapterIdx,
    isPlaying,
    togglePlayPause,
    startChapterPlayback,
    stopAudio,
  ]);

  useEffect(() => {
    return () => {
      nowPlayingBus.clear('audiobook');
    };
  }, []);

  useMediaSession({
    book: selectedBook,
    chapter: chapters[activeChapterIdx],
    audioRef,
    onPrev: () => {
      if (activeChapterIdx > 0) startChapterPlayback(chapters, activeChapterIdx - 1, 0);
    },
    onNext: () => {
      if (activeChapterIdx + 1 < chapters.length) {
        startChapterPlayback(chapters, activeChapterIdx + 1, 0);
      }
    },
  });

  return {
    audioRef,
    seekBarRef,
    activeChapterIdx,
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    playbackRate,
    isPlayerExpanded,
    setIsPlayerExpanded,
    startChapterPlayback,
    togglePlayPause,
    skipSeconds,
    handleRestartChapter,
    cycleSpeed,
    handleSeekPointerDown,
    handleSeekPointerMove,
    handleSeekPointerUp,
    stopAudio,
  };
}
