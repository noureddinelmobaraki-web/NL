import { useEffect, useRef, useState, useCallback } from 'react';
import { Volume2, VolumeX, X } from 'lucide-react';
import { getFvTracks } from '../../music/data/loadSongs';
import { getInitials } from '../../music/utils/cover';
import { audioManager } from '../../../audio/audioManager';
import { prefetchAudio } from '../../music/data/audioPrefetch';

const FULL_VOL = 0.85;
const LOW_VOL = 0.10;

export function ThemeSongBar({
  songId,
  start,
  end,
  canRemove = false,
  onRemove,
}: {
  songId: string | null | undefined;
  start?: number | null;
  end?: number | null;
  canRemove?: boolean;
  onRemove?: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [low, setLow] = useState(false);
  const [ready, setReady] = useState(false);

  const track = songId ? getFvTracks().find((t) => t.id === songId) : undefined;
  const clipStart = Math.max(0, start ?? 0);
  const clipEnd = end && end > clipStart ? end : null;

  // Build / tear down the isolated audio element. NO crossOrigin (CORS-safe like the engine).
  useEffect(() => {
    if (!track) return;
    const a = new Audio();
    a.preload = 'auto';
    a.src = track.src;
    a.volume = low ? LOW_VOL : FULL_VOL;
    audioRef.current = a;

    audioManager.register('profile', a, low ? LOW_VOL : FULL_VOL);
    audioManager.requestExclusive('profile', 'profile_song'); // يوقف NL music + يكبت bg

    prefetchAudio(track?.src);
    const tryPlay = () => { 
      setReady(true);
      try { a.currentTime = clipStart; } catch {}
      audioManager.play('profile').catch(() => {});
    };

    const onTime = () => {
      if (clipEnd != null && a.currentTime >= clipEnd) {
        try { a.currentTime = clipStart; } catch {}
        audioManager.play('profile').catch(() => {});
      }
    };
    
    a.addEventListener('loadedmetadata', tryPlay);
    a.addEventListener('loadeddata', tryPlay);
    a.addEventListener('canplay', tryPlay);
    a.addEventListener('timeupdate', onTime);
    a.load();

    return () => {
      a.removeEventListener('loadedmetadata', tryPlay);
      a.removeEventListener('loadeddata', tryPlay);
      a.removeEventListener('canplay', tryPlay);
      a.removeEventListener('timeupdate', onTime);
      audioManager.stop('profile');
      audioManager.unregister('profile');
      audioManager.releaseExclusive('profile_song');
      a.src = '';
      audioRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.id, clipStart, clipEnd]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = low ? LOW_VOL : FULL_VOL;
  }, [low]);

  // Retry autoplay on first user gesture if the browser blocked it.
  useEffect(() => {
    if (!track) return;
    const kick = () => {
      if (audioRef.current && audioRef.current.paused) {
        audioManager.play('profile').catch(() => {});
      }
    };
    window.addEventListener('pointerdown', kick, { once: true });
    window.addEventListener('keydown', kick, { once: true });
    window.addEventListener('touchend', kick, { once: true });
    return () => {
      window.removeEventListener('pointerdown', kick);
      window.removeEventListener('keydown', kick);
      window.removeEventListener('touchend', kick);
    };
  }, [track]);

  const toggleLow = useCallback(() => setLow((v) => !v), []);

  if (!track) return null;

  return (
    <div className="nl-theme-song" dir="rtl">
      <span className="nl-theme-song__cover" style={{ background: track.coverColor }}>
        {track.coverUrl ? <img src={track.coverUrl} alt="" /> : <span>{getInitials(track.title)}</span>}
      </span>
      <span className="nl-theme-song__tube">
        <span className="nl-theme-song__eq" data-on={ready ? 'true' : 'false'}><i /><i /><i /><i /></span>
        <span className="nl-theme-song__name">{track.title}</span>
        <span className="nl-theme-song__artist">{track.artist}</span>
      </span>
      <button className="nl-theme-song__vol" onClick={toggleLow} aria-label={low ? 'رفع الصوت' : 'خفض الصوت إلى 10%'} title={low ? 'رفع الصوت' : 'خفض الصوت إلى 10%'}>
        {low ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>
      {canRemove && (
        <button className="nl-theme-song__remove" onClick={onRemove} aria-label="إزالة الأغنية" title="إزالة"><X size={15} /></button>
      )}
    </div>
  );
}
