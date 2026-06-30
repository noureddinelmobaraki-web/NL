import { useCallback, useEffect, useState } from 'react';
import { audioManager } from '../../../audio/audioManager';
import { prefetchAudio } from '../data/audioPrefetch';
import type { Track } from '../engine/types';

let sharedAudio: HTMLAudioElement | null = null;
let currentPlayingTrack: Track | null = null;
const listeners = new Set<() => void>();
function notify() { listeners.forEach((l) => l()); }
function getSharedAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!sharedAudio) {
    sharedAudio = new Audio(); sharedAudio.preload = 'auto';
    sharedAudio.addEventListener('ended', () => { currentPlayingTrack = null; notify(); try { audioManager.releaseExclusive('song_preview'); } catch { /* noop */ } });
    sharedAudio.addEventListener('pause', () => notify());
  }
  return sharedAudio;
}
export function stopPreview() {
  const a = sharedAudio; currentPlayingTrack = null;
  if (a) { try { a.pause(); } catch { /* noop */ } }
  try { audioManager.releaseExclusive('song_preview'); } catch { /* noop */ } notify();
}
export function useSongPreview() {
  const [, force] = useState(0);
  useEffect(() => { const l = () => force((n) => n + 1); listeners.add(l); return () => { listeners.delete(l); }; }, []);
  const toggle = useCallback((track: Track) => {
    const audio = getSharedAudio(); if (!audio) return;
    if (currentPlayingTrack?.id === track.id && !audio.paused) { stopPreview(); return; }
    try { audioManager.register('preview', audio, 0.9); audioManager.requestExclusive('preview', 'song_preview'); } catch { /* noop */ }
    prefetchAudio(track.src);
    if (audio.src !== track.src) audio.src = track.src;
    try { audio.currentTime = 0; } catch { /* noop */ }
    currentPlayingTrack = track; notify(); audio.volume = 0.9;
    audio.play().then(() => notify()).catch((err) => { console.error('[useSongPreview] play failed', err); currentPlayingTrack = null; notify(); try { audioManager.releaseExclusive('song_preview'); } catch { /* noop */ } });
  }, []);
  const isPlaying = useCallback((trackId: string) => currentPlayingTrack?.id === trackId && !!sharedAudio && !sharedAudio.paused, []);
  return { toggle, isPlaying, stop: stopPreview, activeTrack: currentPlayingTrack };
}
