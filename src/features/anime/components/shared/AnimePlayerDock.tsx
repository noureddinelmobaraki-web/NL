/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Unified Anime Player Dock:
 * - Sub / Dub Instant Toggle
 * - Server Selector Bar + Auto-Failover Button
 * - AniSkip Floating "Skip Intro" Button
 * - Arabic Subtitles (.ass / .vtt) Selector & Download
 * - Direct Integration with CinemaDownloadModal & SeaDex Best Releases
 */

import React, { useState } from 'react';
import {
  FastForward,
  RefreshCw,
  Subtitles,
  Download,
  Award,
  Maximize2,
  Minimize2,
  Languages,
  Server,
  Sparkles,
  Users,
  HardDrive,
} from 'lucide-react';
import { GlassVectorIcon } from '../../../../components/shared/icons';
import { cinemaDownloadManager } from '../../../cinemaDownload';
import type {
  AnimeAudioMode,
  AnimeIdentifiers,
  AnimeItem,
  AnimePlayServer,
  AnimeSkipWindow,
  AnimeSubtitleTrack,
  AnimeTorrentRelease,
} from '../../types/anime.types';

interface AnimePlayerDockProps {
  anime: AnimeItem;
  resolvedIds: AnimeIdentifiers;
  episodeNumber: number;
  audioMode: AnimeAudioMode;
  onChangeAudioMode: (mode: AnimeAudioMode) => void;
  servers: AnimePlayServer[];
  activeServer: AnimePlayServer | null;
  activeServerIdx: number;
  onSelectServer: (index: number) => void;
  onFailoverNext: () => void;
  skipWindows: AnimeSkipWindow[];
  subtitles: AnimeSubtitleTrack[];
  activeSubtitle: AnimeSubtitleTrack | null;
  onSelectSubtitle: (id: string | null) => void;
  torrentReleases: AnimeTorrentRelease[];
}

export const AnimePlayerDock: React.FC<AnimePlayerDockProps> = ({
  anime,
  resolvedIds,
  episodeNumber,
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSubsPanel, setShowSubsPanel] = useState(false);
  const [showTorrentsPanel, setShowTorrentsPanel] = useState(false);
  const [skipDismissed, setSkipDismissed] = useState(false);

  const opWindow = skipWindows.find((w) => w.type === 'op');
  const seaDexBest = torrentReleases.find((r) => r.isSeaDexBest);

  const handleOpenCinemaDownloadModal = () => {
    const tmdbId = resolvedIds.tmdbId || anime.tmdbId || anime.malId || 1;
    cinemaDownloadManager.openModalForMedia({
      id: tmdbId,
      tmdbId,
      imdbId: resolvedIds.imdbId || anime.imdbId,
      mediaType: anime.format === 'MOVIE' ? 'movie' : 'tv',
      title: anime.title,
      originalTitle: anime.titleRomaji || anime.title,
      year: String(anime.year),
      posterUrl: anime.posterUrl,
      backdropUrl: anime.bannerUrl || anime.posterUrl,
      season: resolvedIds.resolvedSeason || 1,
      episode: episodeNumber,
      episodeTitle: `Episode ${episodeNumber}`,
      rating: anime.score,
    });
  };

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl bg-slate-950/90 border border-white/12 p-3 sm:p-4 ${
        isExpanded ? 'fixed inset-2 sm:inset-6 z-[10200] bg-black/95' : ''
      }`}
    >
      {/* Top Control Strip: Sub/Dub Toggle + Server Selector + Download */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Sub / Dub Segmented Switch */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
          <button
            type="button"
            onClick={() => onChangeAudioMode('sub')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 min-h-[36px] ${
              audioMode === 'sub'
                ? 'bg-red-600 text-white'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Languages size={14} />
            <span>مترجم (Sub)</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeAudioMode('dub')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 min-h-[36px] ${
              audioMode === 'dub'
                ? 'bg-red-600 text-white'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <span>مدبلج (Dub)</span>
          </button>
        </div>

        {/* Servers Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          {servers.map((srv, idx) => (
            <button
              key={srv.id}
              type="button"
              onClick={() => onSelectServer(idx)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer min-h-[36px] ${
                idx === activeServerIdx
                  ? 'bg-white text-slate-950 font-bold'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <Server size={12} />
              <span>{srv.label}</span>
            </button>
          ))}
        </div>

        {/* Action Controls: Failover, Subtitles, Download, Expand */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onFailoverNext}
            title="تبديل السيرفر تلقائياً إذا تأخر التحميل"
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 min-h-[36px]"
          >
            <RefreshCw size={13} />
            <span>سيرفر بديل</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowSubsPanel((v) => !v);
              setShowTorrentsPanel(false);
            }}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 min-h-[36px] ${
              showSubsPanel || activeSubtitle
                ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
                : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
            }`}
          >
            <Subtitles size={14} />
            <span>الترجمة العربية ({subtitles.length})</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCinemaDownloadModal}
            className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 min-h-[36px]"
          >
            <Download size={14} />
            <span>تحميل الحلقة</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            aria-label={isExpanded ? 'تصغير المشغل' : 'تكبير المشغل'}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* Video Stage Container */}
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-white/10">
        {activeServer ? (
          <iframe
            key={`${activeServer.id}_${episodeNumber}_${audioMode}`}
            src={activeServer.url}
            title={`${anime.title} - Episode ${episodeNumber}`}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="origin"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm text-slate-400">
            جاري تجهيز سيرفرات المشاهدة...
          </div>
        )}

        {/* AniSkip Floating Intro Skip Button */}
        {opWindow && !skipDismissed && (
          <div className="absolute bottom-14 left-4 z-20 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSkipDismissed(true)}
              className="px-4 py-2 rounded-xl bg-red-600/95 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-2 shadow-xl border border-white/20 cursor-pointer transition-transform active:scale-95"
            >
              <FastForward size={14} />
              <span className="tabular-nums">
                تخطي المقدمة ({Math.floor(opWindow.startTime)}s –{' '}
                {Math.floor(opWindow.endTime)}s)
              </span>
            </button>
          </div>
        )}
      </div>

      {/* SeaDex & Torrents Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white">
            {anime.titleAr || anime.title} · الحلقة {episodeNumber}
          </span>
          {seaDexBest && (
            <button
              type="button"
              onClick={() => setShowTorrentsPanel((v) => !v)}
              className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200 font-semibold cursor-pointer"
            >
              <Award size={14} />
              <span>SeaDex Best Release متاح ({torrentReleases.length})</span>
            </button>
          )}
        </div>

        {torrentReleases.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setShowTorrentsPanel((v) => !v);
              setShowSubsPanel(false);
            }}
            className="text-xs text-red-300 hover:text-red-200 font-semibold cursor-pointer"
          >
            {showTorrentsPanel
              ? 'إخفاء نسخ التورنت المباشرة'
              : `عرض نسخ AnimeTosho و Stremio (${torrentReleases.length})`}
          </button>
        )}
      </div>

      {/* Collapsible Arabic Subtitles (.ass / .vtt) Panel */}
      {showSubsPanel && (
        <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white">
              ملفات الترجمة العربية والملونة (.ASS / .VTT)
            </span>
            <span className="text-[11px] text-slate-400">
              مرتبة تلقائياً بالأولوية للعربية
            </span>
          </div>
          {subtitles.length === 0 ? (
            <p className="text-xs text-slate-400">
              الترجمة مدمجة تلقائياً داخل المشغل، أو يمكنك البحث عبر نافذة التحميل.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
              {subtitles.map((sub) => (
                <div
                  key={sub.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${
                    activeSubtitle?.id === sub.id
                      ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-100'
                      : 'bg-white/5 border-white/10 text-slate-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectSubtitle(sub.id)}
                    className="font-medium cursor-pointer text-right"
                  >
                    {sub.label}
                  </button>
                  <a
                    href={sub.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-300 hover:underline text-[11px] font-bold"
                  >
                    تحميل .{sub.format}
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Collapsible Torrents / SeaDex Releases Panel */}
      {showTorrentsPanel && torrentReleases.length > 0 && (
        <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col gap-2 max-h-48 overflow-y-auto">
          {torrentReleases.slice(0, 10).map((rel) => (
            <div
              key={rel.id}
              className="flex flex-wrap items-center justify-between gap-2 py-1.5 border-b border-white/5 last:border-0 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {rel.isSeaDexBest && (
                  <span className="inline-flex items-center gap-1 text-amber-300 font-bold shrink-0">
                    <GlassVectorIcon icon={Sparkles} theme="comedy" size={12} badge={false} />
                    <span>SeaDex Best</span>
                  </span>
                )}
                <span className="text-slate-200 truncate">{rel.title}</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-400 tabular-nums shrink-0">
                <span>{rel.resolution}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <GlassVectorIcon icon={HardDrive} theme="adventure" size={12} badge={false} />
                  <span>{rel.sizeLabel}</span>
                </span>
                <span>·</span>
                <span className="inline-flex items-center gap-1 text-emerald-400">
                  <GlassVectorIcon icon={Users} theme="science" size={12} badge={false} />
                  <span>{rel.seeders} Seeders</span>
                </span>
                {rel.magnetUri && (
                  <a
                    href={rel.magnetUri}
                    className="px-2.5 py-1 rounded bg-red-600/80 hover:bg-red-500 text-white font-semibold"
                  >
                    Magnet
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
