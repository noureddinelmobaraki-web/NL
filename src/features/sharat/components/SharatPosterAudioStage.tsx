import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
import type { SharatTrack } from '../types/sharat.types';
import { formatTrackTime } from '../../liquid-glass/stages/SunAlbumsStage/fisheyeMeshMath';

interface SharatPosterAudioStageProps {
  track: SharatTrack;
  audioUrl?: string | null;
  onEnded: () => void;
  onError: () => void;
}

export const SharatPosterAudioStage: React.FC<SharatPosterAudioStageProps> = ({
  track,
  audioUrl,
  onEnded,
  onError,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [posterSrc, setPosterSrc] = useState(track.posterUrl);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    setPosterSrc(track.posterUrl);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
  }, [track.id, track.posterUrl]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play().catch(() => {});
    } else {
      el.pause();
    }
  };

  const toggleMute = () => {
    const el = audioRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setIsMuted(el.muted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = audioRef.current;
    const val = Number(e.target.value);
    if (!el || !Number.isFinite(val)) return;
    el.currentTime = val;
    setCurrentTime(val);
  };

  const handlePosterLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (
      img.src.includes('maxresdefault.jpg') &&
      img.naturalWidth <= 120 &&
      posterSrc !== track.backdropFallbackUrl
    ) {
      setPosterSrc(track.backdropFallbackUrl);
    }
  };

  return (
    <div className="relative h-full w-full overflow-hidden flex items-center justify-center bg-slate-950">
      {/* Blurred Ambient Poster Backdrop */}
      <img
        src={posterSrc}
        alt=""
        aria-hidden="true"
        referrerPolicy="no-referrer"
        onLoad={handlePosterLoad}
        onError={() => {
          if (posterSrc !== track.backdropFallbackUrl) {
            setPosterSrc(track.backdropFallbackUrl);
          }
        }}
        className="absolute inset-0 h-full w-full object-cover scale-110 blur-2xl opacity-45 brightness-50 pointer-events-none"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/45 pointer-events-none" />

      {/* Centered High-Res Poster */}
      <div className="relative z-10 flex flex-col items-center justify-center p-4 sm:p-6 h-full w-full">
        <div className="relative h-[68%] max-h-[300px] aspect-[3/4] sm:aspect-auto sm:max-w-[72%] overflow-hidden rounded-2xl border border-white/20 shadow-2xl bg-slate-900">
          <img
            src={posterSrc}
            alt={track.seriesAr}
            referrerPolicy="no-referrer"
            onLoad={handlePosterLoad}
            onError={() => {
              if (posterSrc !== track.backdropFallbackUrl) {
                setPosterSrc(track.backdropFallbackUrl);
              }
            }}
            className="h-full w-full object-cover"
          />
        </div>
      </div>

      {/* Clean Minimal Audio Bar when playing audio-only stream */}
      {audioUrl && (
        <>
          <audio
            key={audioUrl}
            ref={audioRef}
            src={audioUrl}
            autoPlay
            playsInline
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime || 0)}
            onEnded={onEnded}
            onError={onError}
          />

          <div
            className="absolute inset-x-3 bottom-3 z-20 flex items-center gap-3 rounded-2xl bg-black/70 backdrop-blur-xl border border-white/15 px-3.5 py-2"
            dir="ltr"
          >
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="h-9 w-9 shrink-0 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center hover:bg-amber-300 transition cursor-pointer"
            >
              {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
            </button>

            <span className="text-[11px] font-mono tabular-nums text-white/80 shrink-0">
              {formatTrackTime(currentTime)}
            </span>

            <input
              type="range"
              min={0}
              max={duration > 0 ? duration : 100}
              value={duration > 0 ? currentTime : 0}
              onChange={handleSeek}
              aria-label="Seek"
              className="flex-1 h-1.5 accent-amber-400 cursor-pointer"
            />

            <span className="text-[11px] font-mono tabular-nums text-white/60 shrink-0">
              {formatTrackTime(duration)}
            </span>

            <button
              type="button"
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
              className="h-8 w-8 shrink-0 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition cursor-pointer"
            >
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
