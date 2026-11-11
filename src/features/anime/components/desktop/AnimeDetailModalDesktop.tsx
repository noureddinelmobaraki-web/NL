/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import React from 'react';
import { X, Star } from 'lucide-react';
import { AnimePlayerDock } from '../shared/AnimePlayerDock';
import { AnimeEpisodeGrid } from '../shared/AnimeEpisodeGrid';
import type {
  AnimeAudioMode,
  AnimeEpisodeInfo,
  AnimeIdentifiers,
  AnimeItem,
  AnimePlayServer,
  AnimeSkipWindow,
  AnimeSubtitleTrack,
  AnimeTorrentRelease,
} from '../../types/anime.types';

interface AnimeDetailModalDesktopProps {
  anime: AnimeItem;
  resolvedIds: AnimeIdentifiers;
  episodes: AnimeEpisodeInfo[];
  selectedEpisode: number;
  onSelectEpisode: (ep: number) => void;
  onClose: () => void;
  audioMode: AnimeAudioMode;
  onChangeAudioMode: (mode: AnimeAudioMode) => void;
  servers: AnimePlayServer[];
  activeServer: AnimePlayServer | null;
  activeServerIdx: number;
  onSelectServer: (idx: number) => void;
  onFailoverNext: () => void;
  skipWindows: AnimeSkipWindow[];
  subtitles: AnimeSubtitleTrack[];
  activeSubtitle: AnimeSubtitleTrack | null;
  onSelectSubtitle: (id: string | null) => void;
  torrentReleases: AnimeTorrentRelease[];
}

export const AnimeDetailModalDesktop: React.FC<AnimeDetailModalDesktopProps> = ({
  anime,
  resolvedIds,
  episodes,
  selectedEpisode,
  onSelectEpisode,
  onClose,
  audioMode,
  onChangeAudioMode,
  servers,
  activeServer,
  activeServerIdx,
  onSelectServer,
  onFailoverNext,
  skipWindows,
  subtitles,
  activeSubtitle,
  onSelectSubtitle,
  torrentReleases,
}) => {
  const displayTitle = anime.titleAr || anime.title;
  const displaySynopsis = anime.synopsisAr || anime.synopsis;

  return (
    <div
      className="fixed inset-0 z-[10100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl max-h-[92vh] overflow-y-auto rounded-3xl bg-slate-950/95 border border-white/15 shadow-2xl p-6 flex flex-col gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              {displayTitle}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 tabular-nums">
              <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
                <Star size={13} className="fill-current" />
                {anime.score.toFixed(2)}
              </span>
              <span aria-hidden="true">·</span>
              <span>{anime.year}</span>
              <span aria-hidden="true">·</span>
              <span>{episodes.length} حلقة</span>
              {resolvedIds.malId && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>MAL #{resolvedIds.malId}</span>
                </>
              )}
              {resolvedIds.anilistId && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>AniList #{resolvedIds.anilistId}</span>
                </>
              )}
              {resolvedIds.imdbId && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>IMDb {resolvedIds.imdbId}</span>
                </>
              )}
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
        <AnimePlayerDock
          anime={anime}
          resolvedIds={resolvedIds}
          episodeNumber={selectedEpisode}
          audioMode={audioMode}
          onChangeAudioMode={onChangeAudioMode}
          servers={servers}
          activeServer={activeServer}
          activeServerIdx={activeServerIdx}
          onSelectServer={onSelectServer}
          onFailoverNext={onFailoverNext}
          skipWindows={skipWindows}
          subtitles={subtitles}
          activeSubtitle={activeSubtitle}
          onSelectSubtitle={onSelectSubtitle}
          torrentReleases={torrentReleases}
        />

        {/* Synopsis & Studios */}
        <div className="flex flex-col gap-2">
          <p className="text-sm text-slate-300 leading-relaxed">
            {displaySynopsis}
          </p>
          {anime.genres.length > 0 && (
            <div className="text-xs text-slate-400">
              التصنيفات: {anime.genres.join(' · ')}
            </div>
          )}
        </div>

        {/* Episode Grid */}
        <div className="flex flex-col gap-3">
          <h3 className="text-lg font-bold text-white">
            قائمة الحلقات ({episodes.length})
          </h3>
          <AnimeEpisodeGrid
            episodes={episodes}
            selectedEpisode={selectedEpisode}
            onSelectEpisode={onSelectEpisode}
            fallbackThumbUrl={anime.bannerUrl || anime.posterUrl}
          />
        </div>
      </div>
    </div>
  );
};
