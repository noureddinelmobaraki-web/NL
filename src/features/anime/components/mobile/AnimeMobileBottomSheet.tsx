/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import React from 'react';
import { m, AnimatePresence } from 'framer-motion';
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

interface AnimeMobileBottomSheetProps {
  anime: AnimeItem | null;
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

export const AnimeMobileBottomSheet: React.FC<AnimeMobileBottomSheetProps> = ({
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
  return (
    <AnimatePresence>
      {anime && (
        <div
          className="fixed inset-0 z-[10100] bg-black/75 backdrop-blur-md flex flex-col justify-end"
          onClick={onClose}
        >
          <m.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.18}
            onDragEnd={(_, info) => {
              if (info.offset.y > 140) onClose();
            }}
            onClick={(e) => e.stopPropagation()}
            style={{
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
            }}
            className="w-full max-h-[92dvh] rounded-t-3xl bg-slate-950 border-t border-white/15 flex flex-col overflow-hidden"
          >
            {/* Drag Handle Affordance */}
            <div className="w-10 h-1.5 bg-slate-600 rounded-full mx-auto my-3 shrink-0" />

            {/* Sheet Header */}
            <div className="flex items-center justify-between gap-3 px-4 pb-3 border-b border-white/10 shrink-0">
              <div className="flex flex-col min-w-0 flex-1">
                <h2 className="text-base font-extrabold text-white truncate">
                  {anime.titleAr || anime.title}
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-slate-300 tabular-nums">
                  <span className="inline-flex items-center gap-0.5 text-amber-400 font-bold">
                    <Star size={11} className="fill-current" />
                    {anime.score.toFixed(1)}
                  </span>
                  <span>·</span>
                  <span>{anime.year}</span>
                  <span>·</span>
                  <span>الحلقة {selectedEpisode}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="إغلاق"
                className="min-h-[44px] min-w-[44px] rounded-full bg-white/10 text-white flex items-center justify-center shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-4">
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

              <p className="text-xs text-slate-300 leading-relaxed px-1">
                {anime.synopsisAr || anime.synopsis}
              </p>

              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-bold text-white px-1">
                  اختر الحلقة ({episodes.length})
                </h3>
                <AnimeEpisodeGrid
                  episodes={episodes}
                  selectedEpisode={selectedEpisode}
                  onSelectEpisode={onSelectEpisode}
                  fallbackThumbUrl={anime.bannerUrl || anime.posterUrl}
                  compact
                />
              </div>
            </div>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
};
