import { useEffect } from 'react';
import { useMusicStore } from '../store/musicStore';
import { audioEngine } from '../engine/audioEngine';
import { fetchLyrics, prefetchLyrics } from '../data/lyrics';
import { audioManager } from '../../../audio/audioManager';
import { prefetchAudio } from '../data/audioPrefetch';

export function useMusicEngine() {
  const actions = useMusicStore((s) => s.actions);

  // Synchronize store preferences down to the engine on initial load
  useEffect(() => {
    const store = useMusicStore.getState();
    audioEngine.setVolume(store.volume);
    audioEngine.setMuted(store.muted);
    audioEngine.setRate(store.rate);
    audioEngine.setPan(store.pan);
    audioEngine.setCrossfadeSec(store.crossfadeSec);
    audioEngine.setEqBypass(store.eqBypass);
    audioEngine.setEqPreset(store.eqPreset);
    audioEngine.setLoop(store.loopStart, store.loopEnd);
  }, []);

  // Setup core callbacks from audioEngine back into Zustand store
  useEffect(() => {
    audioEngine.onTimeUpdate = (currentTime, duration, buffered) => {
      actions.updatePlaybackProgress(currentTime, duration, buffered);
    };

    audioEngine.onPlayState = (isPlaying) => {
      actions.setPlaying(isPlaying);
      if (isPlaying) {
        audioManager.requestExclusive('song', 'nl_music');
      } else {
        audioManager.releaseExclusive('nl_music');
      }
    };

    audioEngine.onEnded = () => {
      actions.handlePlaybackEnded();
    };

    audioEngine.onTrackError = (msg) => {
      console.error('[MusicEngine] Playback error:', msg);
      // Fallback or skip to next
      actions.next();
    };

    audioEngine.onRequestNext = () => {
      actions.next();
    };

    audioEngine.onRequestPrev = () => {
      actions.prev();
    };

    audioEngine.onTrackChange = (track) => {
      actions.setCurrentTrackId(track.id);
      // Layer 1: fetch THIS track's lyrics immediately (high priority) so they're
      // ready the moment the user opens the Lyrics panel.
      fetchLyrics(track);
      // Warm up the next track in the queue for an instant skip.
      try {
        const s = useMusicStore.getState();
        const activeQueue = s.shuffle ? s.shuffleQueue : s.queue;
        const i = activeQueue.indexOf(track.id);
        const nextId = i >= 0 ? activeQueue[i + 1] : undefined;
        const nextTrack = nextId ? s.tracks.find((t) => t.id === nextId) : undefined;
        if (nextTrack) {
          prefetchLyrics(nextTrack);
          prefetchAudio(nextTrack.src);
        }
      } catch { /* noop */ }
    };

    return () => {
      // Clean up callbacks if hook unmounts (highly unlikely since it runs on MusicPage/App level)
      audioEngine.onTimeUpdate = undefined;
      audioEngine.onPlayState = undefined;
      audioEngine.onEnded = undefined;
      audioEngine.onTrackError = undefined;
      audioEngine.onRequestNext = undefined;
      audioEngine.onRequestPrev = undefined;
      audioEngine.onTrackChange = undefined;
    };
  }, [actions]);

  // Suppress site background music while the Music page is mounted, and stop
  // playback when leaving.
  useEffect(() => {
    return () => {
      try { audioEngine.pause(); } catch {}
    };
  }, []);

  // Register audioEngine as an external 'song' source under audioManager priority control
  useEffect(() => {
    const off = audioManager.registerExternal('song', {
      pause: () => { try { audioEngine.pause(); } catch {} },
      isPlaying: () => useMusicStore.getState().isPlaying,
    });
    return off;
  }, []);
}
