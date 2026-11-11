/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import React from 'react';
import { X, Star, Play, Download } from 'lucide-react';
import { CartoonPlayerStage } from '../shared/CartoonPlayerStage';
import type {
  CartoonEpisodeStream,
  CartoonPlayOption,
  CartoonSeriesItem,
} from '../../types/cartoon.types';

interface CartoonDetailModalDesktopProps {
  series: CartoonSeriesItem;
  episodes: CartoonEpisodeStream[];
  selectedEpisode: number;
  onSelectEpisode: (epNum: number) => void;
  activeArchiveStream: CartoonEpisodeStream | null;
  isLoadingArchive: boolean;
  playOptions: CartoonPlayOption[];
  activePlayOption: CartoonPlayOption | null;
  activeOptionIdx: number;
  onSelectOption: (idx: number) => void;
  onFailoverNext: () => void;
  onClose: () => void;
}

export const CartoonDetailModalDesktop: React.FC<
  CartoonDetailModalDesktopProps
> = ({
  series,
  episodes,
  selectedEpisode,
  onSelectEpisode,
  activeArchiveStream,
  isLoadingArchive,
  playOptions,
  activePlayOption,
  activeOptionIdx,
  onSelectOption,
  onFailoverNext,
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 z-[10100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl max-h-[92vh] overflow-y-auto rounded-3xl bg-slate-950/95 border border-white/15 shadow-2xl p-6 flex flex-col gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              {series.titleAr}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 tabular-nums">
              <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
                <Star size={13} className="fill-current" />
                {series.rating.toFixed(1)}
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-amber-300 font-semibold">
                {series.planetLabelAr}
              </span>
              <span aria-hidden="true">·</span>
              <span>{series.studio}</span>
              <span aria-hidden="true">·</span>
              <span>{series.year}</span>
              <span aria-hidden="true">·</span>
              <span>{episodes.length} حلقة</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Player Stage */}
        <CartoonPlayerStage
          series={series}
          episodeNumber={selectedEpisode}
          activeArchiveStream={activeArchiveStream}
          playOptions={playOptions}
          activePlayOption={activePlayOption}
          activeOptionIdx={activeOptionIdx}
          onSelectOption={onSelectOption}
          onFailoverNext={onFailoverNext}
        />

        {/* Synopsis */}
        <p className="text-sm text-slate-300 leading-relaxed">
          {series.synopsisAr}
        </p>

        {/* Episodes Grid with Direct MP4 Download links */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">
              قائمة الحلقات والملفات ({episodes.length})
            </h3>
            {isLoadingArchive && (
              <span className="text-xs text-amber-300">
                جاري فحص ملفات Archive.org...
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {episodes.map((ep, idx) => {
              const epNum = ep.episodeNumber || idx + 1;
              const isSelected = epNum === selectedEpisode;
              return (
                <div
                  key={`${ep.archiveIdentifier}-${ep.rawFileName}-${idx}`}
                  className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-400/60 text-white'
                      : 'bg-white/[0.04] border-white/10 text-slate-200 hover:bg-white/[0.08]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectEpisode(epNum)}
                    className="flex items-center gap-2.5 min-w-0 flex-1 text-right cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                      <Play size={14} className="fill-current" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-xs font-bold text-white truncate">
                        {ep.titleAr}
                      </span>
                      <span className="text-[11px] text-slate-400 tabular-nums">
                        الحلقة {epNum}
                        {ep.sizeMegabytes ? ` · ${ep.sizeMegabytes} MB` : ''}
                      </span>
                    </div>
                  </button>

                  {ep.downloadUrl && (
                    <a
                      href={ep.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      title="تحميل ملف MP4 مباشرة"
                      className="p-2 rounded-lg bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-300 shrink-0"
                    >
                      <Download size={14} />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
