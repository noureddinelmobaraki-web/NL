import React, { useEffect, useState } from 'react';
import { X, SkipBack, SkipForward } from 'lucide-react';
import type { SharatTrack } from '../types/sharat.types';
import { useSharatPlayerEngine } from './useSharatPlayerEngine';
import { SharatPosterAudioStage } from './SharatPosterAudioStage';

interface SharatAscendedWorkspaceProps {
  track: SharatTrack;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export const SharatAscendedWorkspace: React.FC<SharatAscendedWorkspaceProps> = ({
  track,
  onClose,
  onNext,
  onPrev,
}) => {
  const {
    mode,
    directMediaUrl,
    isAudioOnly,
    isVideoReady,
    setIsVideoReady,
    advanceSilently,
  } = useSharatPlayerEngine(track);

  const [thumbSrc, setThumbSrc] = useState(track.posterUrl);

  useEffect(() => {
    setThumbSrc(track.posterUrl);
  }, [track.id, track.posterUrl]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onNext();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onPrev();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, onNext, onPrev]);

  const originParam =
    typeof window !== 'undefined' ? encodeURIComponent(window.location.origin) : '';

  const showDirectVideo =
    (mode === 'archive' || mode === 'animethemes') && Boolean(directMediaUrl) && !isAudioOnly;
  const showAudioPoster =
    ((mode === 'archive' || mode === 'animethemes') && Boolean(directMediaUrl) && isAudioOnly) ||
    mode === 'poster-fallback';

  return (
    <div
      className="fixed inset-0 z-[10600] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-2xl"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl rounded-3xl border border-white/15 bg-slate-950/90 p-4 sm:p-6 max-md:max-h-[94dvh] max-md:overflow-y-auto max-md:pb-[calc(env(safe-area-inset-bottom,0px)+16px)] shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Clean Minimal Title Header — zero technical/source metadata */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={thumbSrc}
              alt={track.seriesAr}
              referrerPolicy="no-referrer"
              onLoad={(e) => {
                if (
                  e.currentTarget.src.includes('maxresdefault.jpg') &&
                  e.currentTarget.naturalWidth <= 120 &&
                  thumbSrc !== track.backdropFallbackUrl
                ) {
                  setThumbSrc(track.backdropFallbackUrl);
                }
              }}
              onError={() => {
                if (thumbSrc !== track.backdropFallbackUrl) {
                  setThumbSrc(track.backdropFallbackUrl);
                }
              }}
              className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl object-cover border border-white/15 shrink-0 bg-slate-900"
            />
            <div className="min-w-0">
              <h3 className="text-base sm:text-xl font-black text-white truncate">
                {track.seriesAr}
              </h3>
              <p className="text-xs sm:text-sm text-amber-300/90 font-semibold truncate mt-0.5">
                {track.titleAr} · {track.artistAr}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white transition cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Clean Unobstructed Stage */}
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black border border-white/10">
          {showDirectVideo && directMediaUrl && (
            <>
              {!isVideoReady && (
                <div className="absolute inset-0 z-10 pointer-events-none">
                  <SharatPosterAudioStage
                    track={track}
                    audioUrl={null}
                    onEnded={onNext}
                    onError={advanceSilently}
                  />
                </div>
              )}
              <video
                key={directMediaUrl}
                src={directMediaUrl}
                poster={track.backdropUrl}
                controls
                autoPlay
                playsInline
                onCanPlay={() => setIsVideoReady(true)}
                onError={advanceSilently}
                onEnded={onNext}
                className="h-full w-full object-contain bg-black"
              />
            </>
          )}

          {showAudioPoster && (
            <SharatPosterAudioStage
              track={track}
              audioUrl={directMediaUrl}
              onEnded={onNext}
              onError={advanceSilently}
            />
          )}

          {mode === 'youtube' && (
            <iframe
              key={track.youtubeId}
              title={`${track.seriesAr} — ${track.titleAr}`}
              src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(track.youtubeId)}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&enablejsapi=1${originParam ? `&origin=${originParam}` : ''}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full border-0 relative z-10"
            />
          )}
        </div>

        {/* Clean Playback Step Controls */}
        <div className="flex items-center justify-between gap-3 pt-0.5">
          <button
            type="button"
            onClick={onPrev}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs sm:text-sm font-bold text-white inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition"
          >
            <SkipForward size={15} />
            <span>السابق</span>
          </button>

          <button
            type="button"
            onClick={onNext}
            className="min-h-[44px] px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs sm:text-sm font-black inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition"
          >
            <span>الشارة التالية</span>
            <SkipBack size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};
