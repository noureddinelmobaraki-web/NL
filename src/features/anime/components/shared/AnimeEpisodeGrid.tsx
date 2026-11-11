/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import React, { useState, useMemo } from 'react';
import { Play, Search } from 'lucide-react';
import type { AnimeEpisodeInfo } from '../../types/anime.types';

interface AnimeEpisodeGridProps {
  episodes: AnimeEpisodeInfo[];
  selectedEpisode: number;
  onSelectEpisode: (epNumber: number) => void;
  fallbackThumbUrl?: string;
  compact?: boolean;
}

const EPISODES_PER_CHUNK = 50;

export const AnimeEpisodeGrid: React.FC<AnimeEpisodeGridProps> = ({
  episodes,
  selectedEpisode,
  onSelectEpisode,
  fallbackThumbUrl,
  compact = false,
}) => {
  const [chunkIndex, setChunkIndex] = useState(0);
  const [epFilter, setEpFilter] = useState('');

  const chunksCount = Math.ceil(episodes.length / EPISODES_PER_CHUNK);

  const visibleEpisodes = useMemo(() => {
    const q = epFilter.trim().toLowerCase();
    if (q) {
      return episodes.filter(
        (ep) =>
          String(ep.number).includes(q) ||
          ep.title.toLowerCase().includes(q) ||
          (ep.titleAr && ep.titleAr.toLowerCase().includes(q)),
      );
    }
    const start = chunkIndex * EPISODES_PER_CHUNK;
    return episodes.slice(start, start + EPISODES_PER_CHUNK);
  }, [episodes, chunkIndex, epFilter]);

  return (
    <div className="flex flex-col gap-3">
      {/* Range & Search Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {chunksCount > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
            {Array.from({ length: chunksCount }, (_, idx) => {
              const from = idx * EPISODES_PER_CHUNK + 1;
              const to = Math.min((idx + 1) * EPISODES_PER_CHUNK, episodes.length);
              const active = chunkIndex === idx && !epFilter.trim();
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setEpFilter('');
                    setChunkIndex(idx);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold tabular-nums whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    active
                      ? 'bg-red-600 text-white'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {from} – {to}
                </button>
              );
            })}
          </div>
        )}

        {episodes.length > 8 && (
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={epFilter}
              onChange={(e) => setEpFilter(e.target.value)}
              placeholder="ابحث برقم أو عنوان الحلقة..."
              className="w-full pr-8 pl-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-red-500/60"
            />
          </div>
        )}
      </div>

      {/* Episodes Grid */}
      <div
        className={`grid gap-2.5 ${
          compact
            ? 'grid-cols-2 sm:grid-cols-3'
            : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
        }`}
      >
        {visibleEpisodes.map((ep) => {
          const isSelected = ep.number === selectedEpisode;
          const thumb = ep.image || fallbackThumbUrl || '';
          return (
            <button
              key={ep.number}
              type="button"
              onClick={() => onSelectEpisode(ep.number)}
              className={`group flex items-center gap-2.5 p-2 rounded-xl border text-right transition-all cursor-pointer min-h-[56px] ${
                isSelected
                  ? 'bg-red-600/20 border-red-500/60 text-white'
                  : 'bg-white/[0.04] border-white/10 text-slate-200 hover:bg-white/[0.08] hover:border-white/20'
              }`}
            >
              <div className="relative w-16 h-11 rounded-lg overflow-hidden bg-slate-900 shrink-0">
                {thumb ? (
                  <img
                    src={thumb}
                    alt={ep.title}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                    className="w-full h-full object-cover"
                  />
                ) : null}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Play
                    size={13}
                    className={
                      isSelected
                        ? 'text-red-400 fill-current'
                        : 'text-white/80 group-hover:scale-110 transition-transform'
                    }
                  />
                </div>
              </div>

              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-bold tabular-nums text-white truncate">
                  الحلقة {ep.number}
                </span>
                <span className="text-[11px] text-slate-400 truncate">
                  {ep.title}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
