import React, { useEffect, useRef, useState } from 'react';
import { Play, Sparkles, Music, Maximize2, Volume2, VolumeX } from 'lucide-react';
import { GlassVectorIcon } from '../../../../components/shared/icons';

export interface SpacetoonOstTrack {
  id: string;
  titleAr: string;
  showAr: string;
  performerAr: string;
  planetBadgeAr: string;
  seriesTitleAr: string;
  vocalistAr: string;
  planetLabelAr: string;
  year: number;
  posterUrl: string;
  backdropUrl: string;
  archiveId: string;
  matchKeywords: string[];
  fallbackAudioUrl: string;
  fallbackVideoEmbedUrl: string;
  audioStreamUrl: string;
  videoEmbedUrl: string;
  tmdbId?: number;
  malId?: number;
  titleEn?: string;
}

export interface SpacetoonThemeSongCardProps {
  track: SpacetoonOstTrack;
  isActive: boolean;
  onSelectTrack: (track: SpacetoonOstTrack) => void;
}

export const SpacetoonThemeSongCard: React.FC<SpacetoonThemeSongCardProps> = ({
  track,
  isActive,
  onSelectTrack,
}) => {
  const [imgSrc, setImgSrc] = useState<string>(track.posterUrl);
  const [imgFailed, setImgFailed] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [hoverMuted, setHoverMuted] = useState<boolean>(false);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setImgSrc(track.posterUrl);
    setImgFailed(false);
  }, [track.posterUrl]);

  const isDirectVideoFile = /\.(ia\.mp4|mp4|webm|ogg)(\?|$)/i.test(track.videoEmbedUrl);

  useEffect(() => {
    const vid = previewVideoRef.current;
    if (!vid) return;
    if (isHovered && isDirectVideoFile) {
      vid.muted = hoverMuted;
      vid.play().catch(() => {
        // Fallback to muted autoplay if browser blocks unmuted hover play
        vid.muted = true;
        setHoverMuted(true);
        vid.play().catch(() => {});
      });
    } else {
      vid.pause();
    }
  }, [isHovered, isDirectVideoFile, hoverMuted]);

  const handlePosterError = () => {
    if (track.backdropUrl && imgSrc !== track.backdropUrl) {
      setImgSrc(track.backdropUrl);
      return;
    }
    const archiveThumb = `https://archive.org/services/img/${track.archiveId || '20210811_20210811_2250'}`;
    if (imgSrc !== archiveThumb) {
      setImgSrc(archiveThumb);
      return;
    }
    setImgFailed(true);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelectTrack(track)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelectTrack(track);
        }
      }}
      className={`group relative aspect-square rounded-3xl overflow-hidden border transition-all duration-300 cursor-pointer select-none ${
        isActive
          ? 'border-teal-300/80 shadow-[0_0_32px_rgba(45,212,191,0.35)] scale-[1.01]'
          : 'border-white/20 hover:border-teal-300/60 shadow-2xl hover:scale-[1.02]'
      }`}
      style={{
        backdropFilter: 'blur(18px) saturate(165%)',
        WebkitBackdropFilter: 'blur(18px) saturate(165%)',
      }}
    >
      {/* Poster Artwork Layer */}
      {!imgFailed && imgSrc ? (
        <img
          src={imgSrc}
          alt={track.titleAr}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={handlePosterError}
          className={`st-ost-card__poster w-full h-full object-cover transition-all duration-500 ${
            isHovered ? 'scale-105 opacity-25' : 'scale-100 opacity-100'
          }`}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-teal-950/80 via-slate-900 to-indigo-950/80">
          <Music size={34} className="text-teal-300 mb-2" />
          <span className="text-xs font-extrabold text-white/95 line-clamp-2">
            {track.seriesTitleAr}
          </span>
        </div>
      )}

      {/* Inline Hover Video Preview Layer */}
      {isHovered && (
        <div className="absolute inset-0 z-10 bg-black/85">
          {isDirectVideoFile ? (
            <video
              ref={previewVideoRef}
              src={track.videoEmbedUrl}
              poster={imgSrc}
              playsInline
              loop
              className="w-full h-full object-cover"
            />
          ) : (
            <iframe
              src={`${track.videoEmbedUrl}${track.videoEmbedUrl.includes('?') ? '&' : '?'}autoplay=1`}
              title={track.titleAr}
              className="w-full h-full border-0 pointer-events-none"
              allow="autoplay; fullscreen"
            />
          )}
        </div>
      )}

      {/* Top Badges */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/75 border border-white/25 backdrop-blur-md text-[10px] font-extrabold text-teal-200">
        <GlassVectorIcon icon={Sparkles} theme="emerald" size={12} badge={false} />
        <span>{track.planetLabelAr}</span>
      </div>

      {isHovered && isDirectVideoFile && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setHoverMuted((m) => !m);
          }}
          className="absolute top-3 left-3 z-30 p-2 rounded-full bg-slate-950/80 border border-white/30 text-white hover:bg-teal-500 hover:text-slate-950 transition cursor-pointer"
          aria-label={hoverMuted ? 'Unmute preview' : 'Mute preview'}
        >
          {hoverMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
        </button>
      )}

      {/* Bottom Translucent Glass Info Bar */}
      <div className="absolute inset-x-0 bottom-0 z-20 p-3.5 pt-10 bg-gradient-to-t from-slate-950/95 via-slate-950/75 to-transparent flex items-end justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-0.5">
          <h3 className="text-xs sm:text-sm font-black text-white truncate drop-shadow">
            {track.titleAr}
          </h3>
          <p className="text-[11px] font-bold text-teal-300 truncate">
            {track.vocalistAr}
          </p>
          <p className="text-[10px] text-slate-300/90 truncate">
            {track.seriesTitleAr} · {track.year}
          </p>
        </div>

        <span className="w-9 h-9 rounded-2xl bg-teal-400/90 group-hover:bg-teal-300 text-slate-950 flex items-center justify-center shadow-lg shrink-0 transition-transform group-hover:scale-105">
          {isHovered ? <Maximize2 size={15} /> : <Play size={15} className="fill-current" />}
        </span>
      </div>
    </div>
  );
};
