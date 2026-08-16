import { useState, useEffect, useRef, useCallback } from 'react';
import { useHlsAudio } from '../../hooks/useHlsAudio';
import { audioManager } from '../../audio/audioManager';
import { Song, AudioStatus } from '../../types';

export interface UseSongPlayerProps {
  currentSong: Song | null;
  onSongEnd: () => void;
  onTimeUpdate: (time: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}

export function useSongPlayer({
  currentSong,
  onSongEnd,
  onTimeUpdate,
  onPlay,
  onPause,
  onNext,
  onPrev,
}: UseSongPlayerProps) {
  const audioTagRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLInputElement | null>(null);
  const pendingPlayRef = useRef(false);

  const songTokenRef = useRef(0);
  const currentSongIdRef = useRef<number | string | null>(null);
  if (currentSong && currentSong.id !== currentSongIdRef.current) {
    songTokenRef.current += 1;
    currentSongIdRef.current = currentSong.id;
  }
  if (!currentSong) currentSongIdRef.current = null;

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioStatus, setAudioStatus] = useState<AudioStatus>('idle');

  // Refs for Media Session callbacks — updated each render, registered once
  const onPlayRef = useRef(onPlay);
  const onPauseRef = useRef(onPause);
  const onNextRef = useRef(onNext);
  const onPrevRef = useRef(onPrev);
  useEffect(() => { onPlayRef.current = onPlay; }, [onPlay]);
  useEffect(() => { onPauseRef.current = onPause; }, [onPause]);
  useEffect(() => { onNextRef.current = onNext; }, [onNext]);
  useEffect(() => { onPrevRef.current = onPrev; }, [onPrev]);

  const onSongEndRef = useRef(onSongEnd);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  useEffect(() => { onSongEndRef.current = onSongEnd; }, [onSongEnd]);
  useEffect(() => { onTimeUpdateRef.current = onTimeUpdate; }, [onTimeUpdate]);

  const isPlaying = audioStatus === 'playing';

  // HLS audio effect
  useHlsAudio(audioTagRef, currentSong?.url, () => {
    const tokenAtFire = songTokenRef.current;
    if (pendingPlayRef.current) {
      pendingPlayRef.current = false;
      if (tokenAtFire !== songTokenRef.current) return;
      const el = audioTagRef.current;
      if (!el) return;
      audioManager.register('song', el, 0.7);
      if (tokenAtFire !== songTokenRef.current) return;
      audioManager.play('song').catch(err => {
        console.warn('[SongPlayer] play() rejected:', err);
      });
      onPlay();
    }
  });

  // ─── Effect 1: Audio element events (deps minimal) ──────────────────────
  useEffect(() => {
    const audio = audioTagRef.current;
    if (!audio) return;

    const handlers = {
      loadstart: () => setAudioStatus('loading'),
      waiting: () => setAudioStatus('loading'),
      playing: () => {
        setAudioStatus('playing');
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
        onPlayRef.current();
      },
      pause: () => {
        setAudioStatus('paused');
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
        onPauseRef.current();
      },
      ended: () => {
        setAudioStatus('ended');
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'none';
        audioManager.onSongEnd();
        onSongEndRef.current();
      },
      loadedmetadata: () => setDuration(audio.duration),
      timeupdate: () => {
        setCurrentTime(audio.currentTime);
        setDuration(audio.duration || 0);
        onTimeUpdateRef.current(audio.currentTime);
      },
      error: (e: any) => {
        console.error('Audio Load Error:', e);
        setAudioStatus('idle');
      },
    };

    audio.addEventListener('loadstart', handlers.loadstart);
    audio.addEventListener('waiting', handlers.waiting);
    audio.addEventListener('playing', handlers.playing);
    audio.addEventListener('pause', handlers.pause);
    audio.addEventListener('ended', handlers.ended);
    audio.addEventListener('loadedmetadata', handlers.loadedmetadata);
    audio.addEventListener('timeupdate', handlers.timeupdate);
    audio.addEventListener('error', handlers.error);

    return () => {
      audio.removeEventListener('loadstart', handlers.loadstart);
      audio.removeEventListener('waiting', handlers.waiting);
      audio.removeEventListener('playing', handlers.playing);
      audio.removeEventListener('pause', handlers.pause);
      audio.removeEventListener('ended', handlers.ended);
      audio.removeEventListener('loadedmetadata', handlers.loadedmetadata);
      audio.removeEventListener('timeupdate', handlers.timeupdate);
      audio.removeEventListener('error', handlers.error);
    };
    // deps تشتمل على currentSong لضمان ربط الأحداث عند التحميل أو تبديل الأغنية
  }, [currentSong]);

  // ─── Effect 2: Media Session metadata ONLY (refreshes per song) ─────────
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentSong) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title,
      artist: 'NL — Noureddin El Mobaraki',
      album: (currentSong as any).album || 'NL Archive',
      artwork: [{
        src: (currentSong as any).coverUrl || currentSong.cover ||
             'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/nordine_portrait.webp',
        sizes: '512x512',
        type: 'image/webp',
      }],
    });
  }, [currentSong]);

  // ─── Effect 3: Media Session action handlers (REGISTERED ONCE) ──────────
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;

    const playHandler = () => {
      audioManager.play('song').catch(() => {});
      onPlayRef.current();
    };
    const pauseHandler = () => {
      audioManager.pause('song');
      onPauseRef.current();
    };
    const nextHandler = () => onNextRef.current?.();
    const prevHandler = () => onPrevRef.current?.();
    const seekHandler = (details: MediaSessionActionDetails) => {
      const audio = audioTagRef.current;
      if (audio && details.seekTime != null) {
        audio.currentTime = details.seekTime;
      }
    };

    ms.setActionHandler('play', playHandler);
    ms.setActionHandler('pause', pauseHandler);
    ms.setActionHandler('nexttrack', nextHandler);
    ms.setActionHandler('previoustrack', prevHandler);
    ms.setActionHandler('seekto', seekHandler);

    return () => {
      try {
        ms.setActionHandler('play', null);
        ms.setActionHandler('pause', null);
        ms.setActionHandler('nexttrack', null);
        ms.setActionHandler('previoustrack', null);
        ms.setActionHandler('seekto', null);
      } catch {}
    };
    // ❗ deps فارغة — لا re-register أبداً خلال life-cycle الكومبوننت
  }, []);

  // ─── Hard cleanup on unmount ────────────────────────────────────────────
  useEffect(() => {
    const audio = audioTagRef.current;
    return () => {
      // 1) إيقاف فوري لأي playback نشط
      if (audio) {
        try {
          audio.pause();
          // لا نمسح src هنا — useHlsAudio يتكفّل بذلك عبر detach
        } catch {}
      }
      // 2) تحرير bg-suppressor إن كان موجوداً (الإصلاح الحرج)
      try {
        audioManager.stop('song');           // يستدعي releaseBg('active_song') داخلياً
        audioManager.releaseBg('active_song'); // safety net — مزدوج متعمَّد
      } catch (err) {
        console.warn('[SongPlayer] cleanup error:', err);
      }
    };
    // run مرة واحدة فقط عند unmount
  }, []);

  const toggleLockRef = useRef(false);
  const handlePlayPause = useCallback(() => {
    const audio = audioTagRef.current;
    if (!audio || !currentSong) return;

    if (toggleLockRef.current) return;
    toggleLockRef.current = true;
    requestAnimationFrame(() => { toggleLockRef.current = false; });

    if (audioStatus === 'playing') {
      audioManager.pause('song');
    } else {
      audioManager.play('song').catch(err => {
        console.warn('[SongPlayer] play() rejected:', err);
      });
      onPlay();
    }
  }, [audioStatus, currentSong, onPlay]);

  const handleNext = useCallback(() => {
    onNext?.();
  }, [onNext]);

  const handlePrev = useCallback(() => {
    onPrev?.();
  }, [onPrev]);

  const handleSeek = useCallback((val: number) => {
    if (audioTagRef.current) {
      audioTagRef.current.currentTime = val;
      setCurrentTime(val);
      onTimeUpdate(val);
    }
  }, [onTimeUpdate]);

  // Keyboard shortcuts (Space, N, P, M, Left, Right)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (audioStatus === 'idle') return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'n':
          e.preventDefault();
          handleNext();
          break;
        case 'p':
          e.preventDefault();
          handlePrev();
          break;
        case 'arrowleft':
          e.preventDefault();
          if (audioTagRef.current) {
            audioTagRef.current.currentTime = Math.max(0, audioTagRef.current.currentTime - 5);
          }
          break;
        case 'arrowright':
          e.preventDefault();
          if (audioTagRef.current) {
            audioTagRef.current.currentTime = Math.min(duration, audioTagRef.current.currentTime + 5);
          }
          break;
        case 'm':
          e.preventDefault();
          if (audioTagRef.current) {
            audioTagRef.current.muted = !audioTagRef.current.muted;
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [audioStatus, handlePlayPause, handleNext, handlePrev, duration]);

  return {
    audioTagRef,
    progressRef,
    isPlaying,
    currentTime,
    duration,
    audioStatus,
    setAudioStatus,
    pendingPlayRef,
    handlePlayPause,
    handleSeek,
    handleNext,
    handlePrev,
  };
}

export default useSongPlayer;
