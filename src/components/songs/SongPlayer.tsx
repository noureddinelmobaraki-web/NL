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

  // Timeupdate & progress tracking event listeners
  useEffect(() => {
    const audio = audioTagRef.current;
    if (!audio) return;

    const handlers = {
      loadstart: () => setAudioStatus('loading'),
      waiting: () => setAudioStatus('loading'),
      playing: () => {
        setAudioStatus('playing');
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
        onPlay();
      },
      pause: () => {
        setAudioStatus('paused');
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
        onPause();
      },
      ended: () => {
        setAudioStatus('ended');
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'none';
        onSongEnd();
      },
      loadedmetadata: () => setDuration(audio.duration),
      timeupdate: () => {
        setCurrentTime(audio.currentTime);
        setDuration(audio.duration || 0);
        onTimeUpdate(audio.currentTime);
      },
      error: (e: any) => {
        console.error("Audio Load Error:", e);
        setAudioStatus('idle');
      }
    };

    audio.addEventListener('loadstart', handlers.loadstart);
    audio.addEventListener('waiting', handlers.waiting);
    audio.addEventListener('playing', handlers.playing);
    audio.addEventListener('pause', handlers.pause);
    audio.addEventListener('ended', handlers.ended);
    audio.addEventListener('loadedmetadata', handlers.loadedmetadata);
    audio.addEventListener('timeupdate', handlers.timeupdate);
    audio.addEventListener('error', handlers.error);

    // Media Session Integration for Background Playback
    if ('mediaSession' in navigator && currentSong) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: 'NL — Noureddin El Mobaraki',
        album: (currentSong as any).album || 'NL Archive',
        artwork: [
          {
            src: (currentSong as any).coverUrl || currentSong.cover || 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/profile_img.webp',
            sizes: '512x512',
            type: 'image/webp'
          }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => {
        audioManager.play('song').catch(() => {});
        onPlay();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        audioManager.pause('song');
        onPause();
      });
      if (onNext) {
        navigator.mediaSession.setActionHandler('nexttrack', () => onNext());
      }
      if (onPrev) {
        navigator.mediaSession.setActionHandler('previoustrack', () => onPrev());
      }
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime != null) {
          audio.currentTime = details.seekTime;
        }
      });
    }

    return () => {
      audio.removeEventListener('loadstart', handlers.loadstart);
      audio.removeEventListener('waiting', handlers.waiting);
      audio.removeEventListener('playing', handlers.playing);
      audio.removeEventListener('pause', handlers.pause);
      audio.removeEventListener('ended', handlers.ended);
      audio.removeEventListener('loadedmetadata', handlers.loadedmetadata);
      audio.removeEventListener('timeupdate', handlers.timeupdate);
      audio.removeEventListener('error', handlers.error);

      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.setActionHandler('play', null);
          navigator.mediaSession.setActionHandler('pause', null);
          navigator.mediaSession.setActionHandler('nexttrack', null);
          navigator.mediaSession.setActionHandler('previoustrack', null);
          navigator.mediaSession.setActionHandler('seekto', null);
        } catch {}
      }
    };
  }, [currentSong, onPlay, onPause, onSongEnd, onTimeUpdate, onNext, onPrev]);

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
