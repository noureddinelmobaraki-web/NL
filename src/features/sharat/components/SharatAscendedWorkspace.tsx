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

type WinningSource = 'archive' | 'youtube' | 'archive-embed';

const FALLBACK_BUNDLE_MP4 =
  'https://archive.org/download/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002/01.ia.mp4';
const FALLBACK_ARCHIVE_PLAYLIST_EMBED =
  'https://archive.org/embed/20210811_20210811_2250?autoplay=1&playlist=1';

/**
 * Direct-Archive-First Ascended Workspace:
 * Starts directly with the verified Archive.org MP4/MP3 stream (never mounting the YouTube iframe
 * during 'archive' mode so YouTube's immediate onLoad cannot hijack playback).
 * If Archive fails after trying both the resolved track URL and bundle fallback, or when the user
 * clicks "مشغل يوتيوب", mounts the YouTube iframe with enablejsapi=1 and auto-recovers from
 * YouTube error codes (150/101/100) by switching to backupYoutubeId or Archive embed playlist.
 */
export const SharatAscendedWorkspace: React.FC<SharatAscendedWorkspaceProps> = ({
  track,
  onClose,
  onNext,
  onPrev,
}) => {
  const [winningSource, setWinningSource] = useState<WinningSource>(
    track.hasExactArchiveStream ? 'archive' : 'youtube',
  );
  const [activeArchiveSrc, setActiveArchiveSrc] = useState<string>(track.archiveUrl);
  const [triedFallbackArchive, setTriedFallbackArchive] = useState(false);
  const [activeYoutubeId, setActiveYoutubeId] = useState<string>(track.youtubeId);
  const mediaRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setWinningSource(track.hasExactArchiveStream ? 'archive' : 'youtube');
    setActiveArchiveSrc(track.archiveUrl);
    setTriedFallbackArchive(false);
    setActiveYoutubeId(track.youtubeId);

    nowPlayingBus.publish({
      source: 'song',
      title: track.titleAr,
      subtitle: `${track.artistAr} · ${track.seriesAr}`,
      artworkUrl: track.posterUrl,
      isPlaying: true,
    });
  }, [track]);

  // Listen for YouTube iframe API error codes (150, 101, 100) to auto-switch to backupYoutubeId or Archive playlist embed
  useEffect(() => {
    if (winningSource !== 'youtube') return undefined;

    const onMessage = (event: MessageEvent) => {
      if (typeof event.data !== 'string') return;
      try {
        const parsed = JSON.parse(event.data);
        if (parsed?.event === 'onError') {
          const code = Number(parsed?.info);
          if (code === 150 || code === 101 || code === 100 || !Number.isNaN(code)) {
            if (track.backupYoutubeId && activeYoutubeId !== track.backupYoutubeId) {
              setActiveYoutubeId(track.backupYoutubeId);
            } else {
              setWinningSource('archive-embed');
            }
          }
        }
      } catch {
        // ignore non-JSON messages
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [winningSource, activeYoutubeId, track.backupYoutubeId]);

  const handleArchiveReady = () => {
    if (winningSource === 'archive') {
      void mediaRef.current?.play().catch(() => {});
    }
  };

  const handleArchiveError = () => {
    if (!triedFallbackArchive && activeArchiveSrc !== FALLBACK_BUNDLE_MP4) {
      setTriedFallbackArchive(true);
      setActiveArchiveSrc(FALLBACK_BUNDLE_MP4);
      return;
    }
    setWinningSource('youtube');
  };

  const switchSourceManually = (target: WinningSource) => {
    setWinningSource(target);
    if (target !== 'archive') {
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
              onError={(e) => {
                e.currentTarget.src =
                  'https://archive.org/services/img/20210811_20210811_2250';
              }}
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

        {/* Player Stage */}
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black border border-white/15">
          {winningSource === 'archive' && (
            <video
              key={activeArchiveSrc}
              ref={mediaRef}
              src={activeArchiveSrc}
              poster={track.posterUrl}
              controls
              autoPlay
              playsInline
              onCanPlay={handleArchiveReady}
              onError={handleArchiveError}
              onEnded={onNext}
              className="h-full w-full object-contain"
            />
          )}

          {winningSource === 'youtube' && (
            <iframe
              key={activeYoutubeId}
              title={track.titleAr}
              src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(activeYoutubeId)}?autoplay=1&rel=0&enablejsapi=1`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full border-0 relative z-10"
            />
          )}

          {winningSource === 'archive-embed' && (
            <iframe
              title={`${track.titleAr} — Archive Playlist`}
              src={FALLBACK_ARCHIVE_PLAYLIST_EMBED}
              allow="autoplay; fullscreen"
              allowFullScreen
              className="h-full w-full border-0 relative z-10"
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
              <span>المصدر النشط:</span>
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
              href={activeArchiveSrc || track.downloadUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="nl-glass-download-capsule"
            >
              <Download size={13} className="nl-glass-download-icon" />
              <span>تحميل الشارة</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
