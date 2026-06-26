import { useMusicStore } from '../store/musicStore';
import { selectCurrentTrack } from '../store/selectors';

export function formatTime(seconds?: number): string {
  if (seconds == null || isNaN(seconds) || !isFinite(seconds)) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function useNowPlaying() {
  const currentTrack = useMusicStore(selectCurrentTrack);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const currentTime = useMusicStore((s) => s.currentTime);
  const storeDuration = useMusicStore((s) => s.duration);
  const duration = storeDuration || currentTrack?.durationSec || 0;
  const buffered = useMusicStore((s) => s.buffered);

  const { togglePlay, next, prev, seek } = useMusicStore((s) => s.actions);

  return {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    buffered,
    formattedCurrentTime: formatTime(currentTime),
    formattedDuration: formatTime(duration),
    togglePlay,
    next,
    prev,
    seek
  };
}
