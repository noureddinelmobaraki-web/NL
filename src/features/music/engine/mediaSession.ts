import { Track } from './types';

export async function setMediaSessionMetadata(track: Track) {
  if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

  try {
    let artwork = [];
    if (track.coverUrl) {
      artwork = [
        { src: track.coverUrl, sizes: '96x96', type: 'image/webp' },
        { src: track.coverUrl, sizes: '192x192', type: 'image/webp' },
        { src: track.coverUrl, sizes: '256x256', type: 'image/webp' },
        { src: track.coverUrl, sizes: '384x384', type: 'image/webp' },
        { src: track.coverUrl, sizes: '512x512', type: 'image/webp' },
      ];
    } else {
      const defaultCoverUrl = `${import.meta.env.BASE_URL}nl-default-cover.png`;
      artwork = [
        { src: defaultCoverUrl, sizes: '96x96', type: 'image/png' },
        { src: defaultCoverUrl, sizes: '192x192', type: 'image/png' },
        { src: defaultCoverUrl, sizes: '256x256', type: 'image/png' },
        { src: defaultCoverUrl, sizes: '384x384', type: 'image/png' },
        { src: defaultCoverUrl, sizes: '512x512', type: 'image/png' },
      ];
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: track.album || 'NL Music',
      artwork: artwork
    });
  } catch (error) {
    console.error('[MediaSession] metadata setup failed', error);
  }
}

export function setMediaSessionPlaybackState(state: 'playing' | 'paused' | 'none') {
  if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
  navigator.mediaSession.playbackState = state;
}

export function setMediaSessionPlaybackPosition(currentTime: number, duration: number, playbackRate = 1.0) {
  if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
  try {
    if (typeof navigator.mediaSession.setPositionState === 'function') {
      // Validate numbers to avoid crashes
      if (Number.isFinite(currentTime) && Number.isFinite(duration) && duration > 0) {
        navigator.mediaSession.setPositionState({
          duration: duration,
          playbackRate: playbackRate,
          position: Math.min(currentTime, duration)
        });
      }
    }
  } catch (e) {
    // Some browsers have partial support
  }
}

export interface MediaSessionActions {
  onPlay: () => void;
  onPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeekTo: (time: number) => void;
  onSeekRelative: (offset: number) => void;
}

export function registerMediaSessionActions(actions: MediaSessionActions) {
  if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

  const ms = navigator.mediaSession;
  try {
    ms.setActionHandler('play', actions.onPlay);
    ms.setActionHandler('pause', actions.onPause);
    ms.setActionHandler('previoustrack', actions.onPrev);
    ms.setActionHandler('nexttrack', actions.onNext);
    ms.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) {
        actions.onSeekTo(details.seekTime);
      }
    });
    ms.setActionHandler('seekforward', (details) => {
      const offset = details.seekOffset || 10;
      actions.onSeekRelative(offset);
    });
    ms.setActionHandler('seekbackward', (details) => {
      const offset = details.seekOffset || 10;
      actions.onSeekRelative(-offset);
    });
  } catch (error) {
    console.warn('[MediaSession] Failed to register some action handlers', error);
  }
}
