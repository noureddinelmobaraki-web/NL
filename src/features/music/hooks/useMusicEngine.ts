import { useEffect } from 'react';
import { useMusicStore } from '../store/musicStore';
import { audioEngine } from '../engine/audioEngine';
import { loadFvTracks } from '../data/loadSongs';

export function useMusicEngine() {
  const status = useMusicStore((s) => s.status);
  const actions = useMusicStore((s) => s.actions);

  // 1. Initial songs fetch from nl-music-fv.json
  useEffect(() => {
    if (status === 'idle') {
      actions.setStatus('loading');
      loadFvTracks()
        .then((loadedTracks) => {
          actions.setTracks(loadedTracks);
          actions.setStatus('ready');
        })
        .catch((err) => {
          actions.setStatus('error', err instanceof Error ? err.message : String(err));
        });
    }
  }, [status, actions]);

  // 2. Synchronize store preferences down to the engine on initial load
  useEffect(() => {
    // Only configure engine parameters once state gets loaded or changed
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

  // 3. Setup core callbacks from audioEngine back into Zustand store
  useEffect(() => {
    audioEngine.onTimeUpdate = (currentTime, duration, buffered) => {
      actions.updatePlaybackProgress(currentTime, duration, buffered);
    };

    audioEngine.onPlayState = (isPlaying) => {
      actions.setPlaying(isPlaying);
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
}
