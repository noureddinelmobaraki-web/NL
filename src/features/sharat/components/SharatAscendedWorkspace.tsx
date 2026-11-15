import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Download,
  SkipBack,
  SkipForward,
  Radio,
  Youtube,
  HardDrive,
} from 'lucide-react';
import type { SharatTrack } from '../types/sharat.types';
import { nowPlayingBus } from '../../../audio/nowPlayingBus';

interface SharatAscendedWorkspaceProps {
  track: SharatTrack;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

type WinningSource = 'racing' | 'archive' | 'youtube';

/**
 * Fastest-Source Auto-Race Workspace ("اسرع واحد يوفر منهم يشتغل")
 * Races the direct Archive.org MP4/MP3 stream against the YouTube embed readiness
 * and plays whichever source becomes ready first, while allowing instant manual switch.
 */
export const SharatAscendedWorkspace: React.FC<SharatAscendedWorkspaceProps> = ({
  track,
  onClose,
  onNext,
  onPrev,
}) => {
  const [winningSource, setWinningSource] = useState<WinningSource>('racing');
  const [activeYoutubeId, setActiveYoutubeId] = useState<string>(track.youtubeId);
  const mediaRef = useRef<HTMLVideoElement | null>(null);
  const winnerLockedRef = useRef(false);

  useEffect(() => {
    winnerLockedRef.current = false;
    setWinningSource('racing');
    setActiveYoutubeId(track.youtubeId);

    nowPlayingBus.publish({
      source: 'song',
      title: track.titleAr,
      subtitle: `${track.artistAr} · ${track.seriesAr}`,
      artworkUrl: track.posterUrl,
      isPlaying: true,
    });

    // If Archive hasn't won within 1600ms and YouTube ID is present, let the fastest responder take the stage
    const raceTimer = window.setTimeout(() => {
      if (!winnerLockedRef.current) {
        winnerLockedRef.current = true;
        setWinningSource('archive');
      }
    }, 1600);

    return () => {
      window.clearTimeout(raceTimer);
    };
  }, [track]);

  const handleArchiveReady = () => {
    if (!winnerLockedRef.current) {
      winnerLockedRef.current = true;
      setWinningSource('archive');
      void mediaRef.current?.play().catch(() => {});
    }
  };

  const handleArchiveError = () => {
    winnerLockedRef.current = true;
    setWinningSource('youtube');
  };

  const handleYoutubeLoad = () => {
    if (!winnerLockedRef.current) {
      winnerLockedRef.current = true;
      setWinningSource('youtube');
      mediaRef.current?.pause();
    }
  };

  const switchSourceManually = (target: 'archive' | 'youtube') => {
    winnerLockedRef.current = true;
    setWinningSource(target);
    if (target === 'youtube') {
      mediaRef.current?.pause();
    } else {
      void mediaRef.current?.play().catch(() => {});
    }
  };

  return (
    <div
      className="fixed inset-0 z-[10600] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-2xl"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl rounded-3xl border border-white/25 bg-slate-950/90 p-5 sm:p-6 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={track.posterUrl}
              alt={track.seriesAr}
              className="h-14 w-14 rounded-2xl object-cover border border-white/20 shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-amber-300 font-bold">
                <span>{track.artistAr}</span>
                <span>·</span>
                <span>{track.planetAr}</span>
                <span>·</span>
                <span>{track.year}</span>
              </div>
              <h3 className="text-base sm:text-xl font-black text-white truncate">
                {track.titleAr}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Fastest-Source Race Stage */}
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black border border-white/15">
          {/* Direct Archive Stream (raced in parallel) */}
          <video
            ref={mediaRef}
            src={track.archiveUrl}
            poster={track.posterUrl}
            controls={winningSource !== 'youtube'}
            autoPlay
            playsInline
            onCanPlay={handleArchiveReady}
            onError={handleArchiveError}
            onEnded={onNext}
            className={`h-full w-full object-contain transition-opacity duration-300 ${
              winningSource === 'youtube'
                ? 'opacity-0 pointer-events-none absolute inset-0'
                : 'opacity-100'
            }`}
          />

          {/* YouTube Embed (raced in parallel) */}
          {(winningSource === 'racing' || winningSource === 'youtube') && (
            <iframe
              title={track.titleAr}
              src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(activeYoutubeId)}?autoplay=1&rel=0`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onLoad={handleYoutubeLoad}
              className={`h-full w-full border-0 transition-opacity duration-300 ${
                winningSource === 'youtube'
                  ? 'opacity-100 relative z-10'
                  : 'opacity-0 pointer-events-none absolute inset-0'
              }`}
            />
          )}
        </div>

        {/* Controls & Source Switcher Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrev}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white inline-flex items-center gap-1.5 cursor-pointer"
            >
              <SkipForward size={14} />
              <span>السابق</span>
            </button>
            <button
              type="button"
              onClick={onNext}
              className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>الشارة التالية</span>
              <SkipBack size={14} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] text-white/65">
              <Radio size={12} className="text-emerald-400" />
              <span>المصدر الأسرع:</span>
            </span>

            <button
              type="button"
              onClick={() => switchSourceManually('archive')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 border transition cursor-pointer ${
                winningSource === 'archive'
                  ? 'bg-emerald-400/20 border-emerald-400/60 text-emerald-200'
                  : 'bg-white/10 border-white/15 text-white/75 hover:text-white'
              }`}
            >
              <HardDrive size={13} />
              <span>بث الأرشيف المباشر</span>
            </button>

            <button
              type="button"
              onClick={() => switchSourceManually('youtube')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 border transition cursor-pointer ${
                winningSource === 'youtube'
                  ? 'bg-red-500/25 border-red-400/60 text-red-200'
                  : 'bg-white/10 border-white/15 text-white/75 hover:text-white'
              }`}
            >
              <Youtube size={13} />
              <span>مشغل يوتيوب</span>
            </button>

            {track.backupYoutubeId && winningSource === 'youtube' && (
              <button
                type="button"
                onClick={() =>
                  setActiveYoutubeId((prev) =>
                    prev === track.youtubeId
                      ? track.backupYoutubeId || track.youtubeId
                      : track.youtubeId,
                  )
                }
                className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-[11px] text-white/80 cursor-pointer"
              >
                تبديل خادم يوتيوب
              </button>
            )}

            <a
              href={track.downloadUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-xl bg-teal-400/20 hover:bg-teal-400/30 border border-teal-300/45 text-teal-200 text-xs font-extrabold inline-flex items-center gap-1.5"
            >
              <Download size={13} />
              <span>تحميل الشارة</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
