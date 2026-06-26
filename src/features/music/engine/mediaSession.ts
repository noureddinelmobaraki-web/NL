import { Track } from './types';

let activeArtworkUrl: string | null = null;

function generateArtwork(_title: string, _artist: string, color: string): Promise<string> {
  if (typeof document === 'undefined') return Promise.resolve('');
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return Promise.resolve('');

    // Draw background color
    ctx.fillStyle = color || '#8b94ff';
    ctx.fillRect(0, 0, 512, 512);

    // Draw some modern aesthetic overlays
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.arc(256, 256, 180, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.beginPath();
    ctx.arc(256, 256, 80, 0, Math.PI * 2);
    ctx.fill();

    // Draw text "NL"
    ctx.font = 'black 110px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('NL', 256, 256);

    // Clean up old object URL if any
    if (activeArtworkUrl) {
      URL.revokeObjectURL(activeArtworkUrl);
    }

    // Convert to Blob URL
    return new Promise<string>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          activeArtworkUrl = url;
          resolve(url);
        } else {
          resolve('');
        }
      }, 'image/jpeg');
    });
  } catch (error) {
    console.error('[MediaSession] artwork generation failed', error);
    return Promise.resolve('');
  }
}

export async function setMediaSessionMetadata(track: Track) {
  if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

  try {
    const artworkUrl = await generateArtwork(track.title, track.artist, track.coverColor || '#8b94ff');

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: track.album || 'NL Music',
      artwork: artworkUrl ? [{ src: artworkUrl, sizes: '512x512', type: 'image/jpeg' }] : []
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
  onSeek: (offsetSec: number) => void;
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
        actions.onSeek(details.seekTime);
      }
    });
  } catch (error) {
    console.warn('[MediaSession] Failed to register some action handlers', error);
  }
}
