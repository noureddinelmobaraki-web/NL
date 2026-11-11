/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Unified Cartoon Player Stage:
 * - Native HTML5 <video> for direct Archive.org .ia.mp4 streams with auto-failover to Mirror CDN
 * - Direct "تحميل الحلقة مباشرة (MP4)" button with file size in MB
 * - Seamless switch to Official YouTube Playlist or TMDB Embed Servers
 * - Integrated with CinemaDownloadModal for torrent/swarm downloads
 */

import React, { useState } from 'react';
import {
  Download,
  RefreshCw,
  Server,
  Maximize2,
  Minimize2,
  HardDriveDownload,
} from 'lucide-react';
import { cinemaDownloadManager } from '../../../cinemaDownload';
import type {
  CartoonEpisodeStream,
  CartoonPlayOption,
  CartoonSeriesItem,
} from '../../types/cartoon.types';

interface CartoonPlayerStageProps {
  series: CartoonSeriesItem;
  episodeNumber: number;
  activeArchiveStream: CartoonEpisodeStream | null;
  playOptions: CartoonPlayOption[];
  activePlayOption: CartoonPlayOption | null;
  activeOptionIdx: number;
  onSelectOption: (idx: number) => void;
  onFailoverNext: () => void;
}

export const CartoonPlayerStage: React.FC<CartoonPlayerStageProps> = ({
  series,
  episodeNumber,
  activeArchiveStream,
  playOptions,
  activePlayOption,
  activeOptionIdx,
  onSelectOption,
  onFailoverNext,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const isDirectMp4 =
    activePlayOption?.kind === 'archive-primary' ||
    activePlayOption?.kind === 'archive-mirror';

  const directDownloadUrl =
    activePlayOption?.downloadUrl || activeArchiveStream?.downloadUrl || '';
  const sizeMb =
    activePlayOption?.sizeMegabytes || activeArchiveStream?.sizeMegabytes;

  const handleOpenAdvancedDownload = () => {
    const tmdbId = series.tmdbId || series.malId || 100;
    cinemaDownloadManager.openModalForMedia({
      id: tmdbId,
      tmdbId,
      imdbId: series.imdbId,
      mediaType: series.mediaType,
      title: series.titleAr,
      originalTitle: series.titleEn,
      year: String(series.year),
      posterUrl: series.posterUrl,
      backdropUrl: series.backdropUrl || series.posterUrl,
      season: 1,
      episode: episodeNumber,
      episodeTitle: activeArchiveStream?.titleAr || `الحلقة ${episodeNumber}`,
      rating: series.rating,
    });
  };

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl bg-slate-950/90 border border-white/12 p-3 sm:p-4 ${
        isExpanded ? 'fixed inset-2 sm:inset-6 z-[10200] bg-black/95' : ''
      }`}
    >
      {/* Top Bar: Sources + Failover + Direct MP4 Save + Advanced Download */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          {playOptions.map((opt, idx) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelectOption(idx)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer min-h-[38px] ${
                idx === activeOptionIdx
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-white/5 text-slate-200 hover:bg-white/10'
              }`}
            >
              <Server size={13} />
              <span>{opt.label}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onFailoverNext}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 min-h-[38px]"
          >
            <RefreshCw size={13} />
            <span>مصدر بديل</span>
          </button>

          {directDownloadUrl && (
            <a
              href={directDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 min-h-[38px]"
            >
              <Download size={14} />
              <span className="tabular-nums">
                تحميل الحلقة مباشرة (MP4{sizeMb ? ` · ${sizeMb} MB` : ''})
              </span>
            </a>
          )}

          <button
            type="button"
            onClick={handleOpenAdvancedDownload}
            className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 min-h-[38px]"
          >
            <HardDriveDownload size={14} />
            <span>مدير التحميل</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            aria-label={isExpanded ? 'تصغير' : 'تكبير'}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
          >
            {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* Video Player Viewport */}
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-white/10">
        {!activePlayOption ? (
          <div className="w-full h-full flex items-center justify-center text-sm text-slate-400">
            جاري استخراج روابط الحلقة من أرشيف سبيستون...
          </div>
        ) : isDirectMp4 ? (
          <video
            key={activePlayOption.url}
            src={activePlayOption.url}
            poster={
              activeArchiveStream?.thumbnailUrl ||
              series.backdropUrl ||
              series.posterUrl
            }
            controls
            autoPlay
            playsInline
            onError={onFailoverNext}
            className="w-full h-full object-contain bg-black"
          />
        ) : (
          <iframe
            key={activePlayOption.url}
            src={activePlayOption.url}
            title={`${series.titleAr} - ${episodeNumber}`}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="origin"
          />
        )}
      </div>

      {/* Episode Metadata Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
        <span className="font-bold text-white">
          {activeArchiveStream?.titleAr ||
            `${series.titleAr} · الحلقة ${episodeNumber}`}
        </span>
        <span className="text-slate-400 tabular-nums">
          {series.planetLabelAr} · {series.studio}
        </span>
      </div>
    </div>
  );
};
