/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Isolated Glass Download Studio Modal, Progressive Torrent HTTP 206 Player,
 * Interactive Sliding-Window Piece Map Bar, & Global Background Floating Pill.
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { m, AnimatePresence } from 'framer-motion';
import {
  X,
  Download,
  Pause,
  Play,
  Trash2,
  CheckCircle2,
  HardDrive,
  ShieldCheck,
  Copy,
  Check,
  Sparkles,
  Loader2,
  FolderDown,
  RefreshCw,
  AlertCircle,
  Tv,
  Zap,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { normLang } from '../../utils/lang';
import { formatBytes } from './releaseParserAndFilter';
import {
  cinemaDownloadManager,
  useCinemaDownloadState,
} from './downloadManager';
import type {
  DiscoveredReleaseOption,
  DownloadQualityTier,
  DownloadTaskState,
} from './types';

export const CinemaDownloadHost: React.FC = () => {
  const { i18n } = useTranslation();
  const currentLang = normLang(i18n.resolvedLanguage || i18n.language);
  const isAr = currentLang === 'ar';

  const {
    isModalOpen,
    activeMedia,
    isDiscovering,
    discoveredReleases,
    discoveryError,
    selectedQualityFilter,
    activeTab,
    activeStreamingTaskHash,
    quota,
    tasks,
    liveTrackersCount,
  } = useCinemaDownloadState();

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const allTasks = (Object.values(tasks) as DownloadTaskState[]).sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );
  const activeBackgroundTask =
    allTasks.find(
      (t) =>
        t.status === 'downloading' ||
        t.status === 'initializing' ||
        t.status === 'exporting',
    ) ||
    allTasks.find((t) => t.status === 'paused') ||
    allTasks.find((t) => t.status === 'completed' && !t.cacheCleared);

  const filteredReleases =
    selectedQualityFilter === 'all'
      ? discoveredReleases
      : discoveredReleases.filter((r) => r.quality === selectedQualityFilter);

  const handleCopyMagnet = (rel: DiscoveredReleaseOption) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(rel.magnetUri);
      setCopiedId(rel.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      {/* Global Floating Background Download Pill (visible across all pages when modal is closed) */}
      <AnimatePresence>
        {!isModalOpen && activeBackgroundTask && (
          <m.div
            initial={{ opacity: 0, y: 20, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.94 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            dir={isAr ? 'rtl' : 'ltr'}
            className="fixed bottom-4 inset-inline-end-4 z-[10250] max-w-[350px] w-[calc(100vw-2rem)] rounded-2xl p-3 text-white select-none shadow-2xl border border-white/25"
            style={{
              background:
                'linear-gradient(165deg, rgba(255,255,255,0.16) 0%, rgba(10,16,28,0.88) 100%)',
              backdropFilter: 'blur(22px) saturate(185%)',
              WebkitBackdropFilter: 'blur(22px) saturate(185%)',
            }}
          >
            <div className="flex items-center gap-3">
              <img
                src={activeBackgroundTask.media.posterUrl}
                alt={activeBackgroundTask.media.title}
                className="w-10 h-14 rounded-lg object-cover border border-white/20 flex-shrink-0"
              />
              <div
                onClick={() => cinemaDownloadManager.openTasksModal()}
                className="flex-1 min-w-0 cursor-pointer"
              >
                <div className="flex items-center justify-between gap-1.5">
                  <p className="text-xs font-extrabold text-white truncate">
                    {activeBackgroundTask.media.title}
                  </p>
                  <span className="text-[11px] font-black text-sky-300 tabular-nums shrink-0">
                    {activeBackgroundTask.progressPct.toFixed(1)}%
                  </span>
                </div>
                <p className="text-[10px] text-white/70 truncate mt-0.5 tabular-nums">
                  {activeBackgroundTask.release.quality}
                  {' · '}
                  {activeBackgroundTask.status === 'completed'
                    ? isAr
                      ? 'اكتمل النقل — اضغط لتفريغ الكاش'
                      : 'Exported — Click to clean cache'
                    : activeBackgroundTask.status === 'paused'
                      ? isAr
                        ? 'متوقف مؤقتاً'
                        : 'Paused'
                      : `${activeBackgroundTask.completedPieces}/${activeBackgroundTask.totalPieces} SHA-1`}
                </p>
                <div className="w-full h-1.5 rounded-full bg-white/15 overflow-hidden mt-1.5">
                  <div
                    className={`h-full rounded-full transition-transform duration-200 origin-left ${
                      activeBackgroundTask.status === 'completed'
                        ? 'bg-emerald-400'
                        : activeBackgroundTask.status === 'paused'
                          ? 'bg-amber-400'
                          : 'bg-sky-400'
                    }`}
                    style={{
                      transform: `scaleX(${Math.max(
                        0.02,
                        activeBackgroundTask.progressPct / 100,
                      )})`,
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {activeBackgroundTask.status === 'downloading' ? (
                  <button
                    type="button"
                    onClick={() =>
                      cinemaDownloadManager.pauseTask(
                        activeBackgroundTask.infoHash,
                      )
                    }
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center cursor-pointer"
                    aria-label={isAr ? 'إيقاف مؤقت' : 'Pause'}
                  >
                    <Pause size={13} />
                  </button>
                ) : activeBackgroundTask.status === 'paused' ? (
                  <button
                    type="button"
                    onClick={() =>
                      cinemaDownloadManager.resumeTask(
                        activeBackgroundTask.infoHash,
                      )
                    }
                    className="w-8 h-8 rounded-full bg-sky-500/30 hover:bg-sky-500/45 border border-sky-300/40 flex items-center justify-center cursor-pointer"
                    aria-label={isAr ? 'استئناف' : 'Resume'}
                  >
                    <Play size={13} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      cinemaDownloadManager.confirmClearCache(
                        activeBackgroundTask.infoHash,
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/30 hover:bg-emerald-500/45 border border-emerald-300/50 text-[10px] font-extrabold text-emerald-100 cursor-pointer whitespace-nowrap"
                  >
                    {isAr ? 'تفريغ الكاش' : 'Clean Cache'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => cinemaDownloadManager.openTasksModal()}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center cursor-pointer"
                  aria-label={
                    isAr ? 'فتح نافذة التحميل' : 'Open Download Window'
                  }
                >
                  <Download size={13} />
                </button>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Main Glass Download & Progressive Stream Studio Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div
            dir={isAr ? 'rtl' : 'ltr'}
            className="fixed inset-0 z-[10300] flex items-center justify-center p-2.5 sm:p-5 bg-black/75 backdrop-blur-xl select-none"
          >
            <div
              onClick={() => cinemaDownloadManager.closeModal()}
              className="absolute inset-0 z-0 cursor-zoom-out"
            />

            <m.div
              role="dialog"
              aria-modal="true"
              aria-label={
                isAr
                  ? 'مركز التحميل والبث التقدمي عبر التورنت (OPFS + HTTP 206)'
                  : 'Progressive Torrent Streaming & OPFS Download Studio'
              }
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 w-full max-w-3xl max-h-[92dvh] rounded-3xl overflow-hidden flex flex-col text-white border border-white/25 shadow-2xl"
              style={{
                background:
                  'linear-gradient(165deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.04) 45%, rgba(8,12,22,0.92) 100%), rgba(8,12,22,0.88)',
                backdropFilter: 'blur(26px) saturate(190%)',
                WebkitBackdropFilter: 'blur(26px) saturate(190%)',
              }}
            >
              {/* Modal Top Header */}
              <div className="px-4 sm:px-6 py-3.5 border-b border-white/14 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-2xl bg-sky-500/20 border border-sky-300/40 flex items-center justify-center text-sky-300 shrink-0">
                    <Download size={18} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-black text-white truncate">
                      {isAr
                        ? 'استوديو تحميل التورنت والبث التقدمي الفوري (OPFS + HTTP 206)'
                        : 'Magnet Download & Progressive Stream Studio (OPFS + HTTP 206)'}
                    </h3>
                    <p className="text-[11px] text-white/65 truncate tabular-nums">
                      <HardDrive
                        size={11}
                        className="inline me-1 text-sky-300"
                      />
                      {quota.freeGB > 0
                        ? isAr
                          ? `كاش OPFS: ${quota.freeGB} GB (+ تخزين ممتد غير محدود) · المستخدم: ${quota.usageMB} MB · ${liveTrackersCount} تراكر حي`
                          : `Free OPFS: ${quota.freeGB} GB (+ Extended Store) · Used: ${quota.usageMB} MB · ${liveTrackersCount} Trackers`
                        : isAr
                          ? 'النافذة المنزلقة (Sliding-Window) + بث جزئي HTTP 206 + كاش OPFS ممتد'
                          : 'Sliding-Window Priority + HTTP 206 Byte-Range Seeking + OPFS'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => cinemaDownloadManager.closeModal()}
                  className="lg-cinema-icon-pill !w-9 !h-9 !min-w-[36px] !min-h-[36px] shrink-0"
                  aria-label={isAr ? 'إغلاق' : 'Close'}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Active Media Context Card */}
              {activeMedia && (
                <div className="px-4 sm:px-6 py-3 bg-white/[0.04] border-b border-white/12 flex items-center gap-3.5">
                  <img
                    src={activeMedia.posterUrl}
                    alt={activeMedia.title}
                    className="w-11 h-15 sm:w-12 sm:h-16 rounded-xl object-cover border border-white/25 shadow-md shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm sm:text-base font-black text-white truncate">
                        {activeMedia.title}
                      </h4>
                      {activeMedia.mediaType === 'tv' && (
                        <span className="text-xs font-extrabold text-sky-300 tabular-nums">
                          S{String(activeMedia.season || 1).padStart(2, '0')}E
                          {String(activeMedia.episode || 1).padStart(2, '0')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/70 mt-0.5 flex-wrap tabular-nums">
                      <span>
                        {activeMedia.mediaType === 'tv'
                          ? isAr
                            ? 'مسلسل'
                            : 'TV Series'
                          : isAr
                            ? 'فيلم'
                            : 'Movie'}
                      </span>
                      {activeMedia.year && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{activeMedia.year}</span>
                        </>
                      )}
                      {activeMedia.imdbId && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-300 font-bold">
                            IMDb {activeMedia.imdbId}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Segmented Navigation Bar */}
              <div className="px-4 sm:px-6 py-2.5 border-b border-white/10 flex items-center justify-between gap-2 flex-wrap bg-black/20">
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/8 border border-white/15">
                  <button
                    type="button"
                    onClick={() =>
                      cinemaDownloadManager.setActiveTab('discover')
                    }
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-colors cursor-pointer whitespace-nowrap ${
                      activeTab === 'discover'
                        ? 'bg-white/20 text-white shadow-sm'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    {isAr
                      ? 'ملفات التورنت والجودات (Magnet)'
                      : 'Magnet Releases & Qualities'}
                  </button>
                  <button
                    type="button"
                    onClick={() => cinemaDownloadManager.setActiveTab('tasks')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      activeTab === 'tasks'
                        ? 'bg-sky-500/30 text-white border border-sky-300/40 shadow-sm'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    <span>
                      {isAr
                        ? 'التحميل الحي والبث الفوري (OPFS + 206)'
                        : 'Live Downloads & Instant Stream'}
                    </span>
                    {allTasks.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-sky-500 text-white text-[10px] font-black tabular-nums">
                        {allTasks.length}
                      </span>
                    )}
                  </button>
                </div>

                {activeTab === 'discover' && discoveredReleases.length > 0 && (
                  <div className="flex items-center gap-1">
                    {(['all', '2160p', '1080p', '720p'] as const).map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() =>
                          cinemaDownloadManager.setQualityFilter(
                            q as DownloadQualityTier | 'all',
                          )
                        }
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold cursor-pointer transition-colors tabular-nums ${
                          selectedQualityFilter === q
                            ? 'bg-sky-500/30 border border-sky-300/50 text-sky-100'
                            : 'bg-white/6 border border-white/12 text-white/70 hover:text-white'
                        }`}
                      >
                        {q === 'all' ? (isAr ? 'الكل' : 'All') : q}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Scrollable Content Viewport */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-3">
                {activeTab === 'discover' ? (
                  !activeMedia ? (
                    <div className="py-12 text-center text-white/65 flex flex-col items-center gap-2">
                      <Sparkles size={26} className="text-sky-300/80" />
                      <p className="text-xs sm:text-sm font-bold">
                        {isAr
                          ? 'اختر أي فيلم أو مسلسل واضغط على زر "تحميل" بجانب زر المشاهدة لجلب ملفات الـ Magnet الحقيقية.'
                          : 'Select any movie or series and click "Download" next to Watch Now to fetch real Magnet releases.'}
                      </p>
                    </div>
                  ) : isDiscovering ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
                      <Loader2
                        size={28}
                        className="animate-spin text-sky-300"
                      />
                      <p className="text-xs sm:text-sm font-extrabold text-white/90">
                        {isAr
                          ? 'جاري ربط المعرف العالمي (IMDb) واستخراج روابط الـ Magnet الحقيقية والتراكرات...'
                          : 'Linking IMDb ID & discovering real Magnet swarms and trackers...'}
                      </p>
                      <p className="text-[11px] text-white/55">
                        {isAr
                          ? 'يتم تجهيز النافذة المنزلقة (Header + Tail First) لدعم المشاهدة الفورية والقفز الزمني'
                          : 'Preparing Sliding-Window (Header + Tail First) for instant streaming & seeking'}
                      </p>
                    </div>
                  ) : discoveryError ? (
                    <div className="p-6 rounded-2xl bg-rose-500/15 border border-rose-400/35 text-center flex flex-col items-center gap-2.5">
                      <AlertCircle size={24} className="text-rose-300" />
                      <p className="text-xs sm:text-sm font-bold text-rose-100">
                        {discoveryError}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          cinemaDownloadManager.openModalForMedia(activeMedia)
                        }
                        className="px-4 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-extrabold cursor-pointer flex items-center gap-1.5"
                      >
                        <RefreshCw size={13} />
                        <span>{isAr ? 'إعادة المحاولة' : 'Retry'}</span>
                      </button>
                    </div>
                  ) : filteredReleases.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-white/[0.04] border border-white/14 text-center flex flex-col items-center gap-2.5">
                      <AlertCircle size={24} className="text-amber-300" />
                      <p className="text-xs sm:text-sm font-extrabold text-white/90">
                        {isAr
                          ? 'لم يتم العثور على ملفات تورنت حقيقية لهذه الجودة حالياً.'
                          : 'No verified real torrent swarms found for this filter right now.'}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          cinemaDownloadManager.openModalForMedia(activeMedia)
                        }
                        className="px-4 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-extrabold cursor-pointer flex items-center gap-1.5"
                      >
                        <RefreshCw size={13} />
                        <span>{isAr ? 'إعادة الفحص' : 'Rescan Sources'}</span>
                      </button>
                    </div>
                  ) : (
                    filteredReleases.map((rel) => {
                      const existingTask = tasks[rel.infoHash];
                      const isThisActive =
                        existingTask &&
                        (existingTask.status === 'downloading' ||
                          existingTask.status === 'initializing' ||
                          existingTask.status === 'exporting');
                      const usesHybridExtended =
                        quota.freeBytes > 0 &&
                        rel.sizeBytes > quota.freeBytes * 0.85;

                      return (
                        <div
                          key={rel.id}
                          className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/14 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex flex-col gap-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-xs font-black px-2.5 py-0.5 rounded-md tabular-nums ${
                                  rel.quality === '2160p'
                                    ? 'bg-amber-400/20 text-amber-200 border border-amber-300/40'
                                    : rel.quality === '1080p'
                                      ? 'bg-sky-400/20 text-sky-200 border border-sky-300/40'
                                      : 'bg-emerald-400/20 text-emerald-200 border border-emerald-300/40'
                                }`}
                              >
                                {rel.quality === '2160p'
                                  ? '4K · 2160p'
                                  : rel.quality}
                              </span>
                              <span className="text-xs font-extrabold text-white truncate">
                                {rel.cleanFileName}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 text-[11px] text-white/70 flex-wrap tabular-nums">
                              <span className="font-bold text-white/90">
                                {rel.sizeFormatted}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>
                                {rel.totalPieces.toLocaleString()}{' '}
                                {isAr ? 'قطعة' : 'Pieces'}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>{rel.videoCodec}</span>
                              <span aria-hidden="true">·</span>
                              <span>
                                {rel.audioCodec} {rel.audioChannels}
                              </span>
                              {rel.hdrBadges.length > 0 && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="text-amber-300 font-semibold">
                                    {rel.hdrBadges.join(' / ')}
                                  </span>
                                </>
                              )}
                              <span aria-hidden="true">·</span>
                              <span className="text-emerald-300 font-bold">
                                {rel.seeders} Seeders
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="text-white/55">
                                {rel.sourceLabel}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 text-[10px] mt-0.5 flex-wrap">
                              <span className="text-emerald-300/90 flex items-center gap-1">
                                <ShieldCheck size={12} className="shrink-0" />
                                {usesHybridExtended
                                  ? isAr
                                    ? 'كاش هجين ممتد (OPFS + IndexedDB) يتجاوز حد المساحة · يدعم المشاهدة الفورية والقفز الزمني HTTP 206'
                                    : 'Hybrid Extended Cache (OPFS + IDB) · Instant HTTP 206 Streaming & Seeking'
                                  : isAr
                                    ? 'النافذة المنزلقة (Header+Tail First) · مشاهدة فورية مع القفز لأي دقيقة + حفظ في OPFS'
                                    : 'Sliding-Window (Header+Tail First) · Instant HTTP 206 Stream & OPFS Cache'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleCopyMagnet(rel)}
                              title={
                                isAr
                                  ? 'نسخ رابط المغناطيس (Magnet URI) مع التراكرات الحية'
                                  : 'Copy Magnet URI with live trackers'
                              }
                              className="px-2.5 py-2 rounded-xl bg-white/8 hover:bg-white/15 border border-white/15 text-xs font-bold text-white/85 flex items-center gap-1 cursor-pointer whitespace-nowrap"
                            >
                              {copiedId === rel.id ? (
                                <>
                                  <Check
                                    size={13}
                                    className="text-emerald-300"
                                  />
                                  <span>{isAr ? 'تم' : 'Copied'}</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={13} />
                                  <span>Magnet</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                void cinemaDownloadManager.startProgressiveStream(
                                  activeMedia,
                                  rel,
                                  false,
                                );
                              }}
                              title={
                                isAr
                                  ? 'مشاهدة فورية مع القفز الزمني العشوائي (HTTP 206) أثناء التحميل في الكاش'
                                  : 'Instant Progressive Stream with Byte-Range Seeking while caching in OPFS'
                              }
                              className="px-3 py-2 rounded-xl bg-fuchsia-500/25 hover:bg-fuchsia-500/40 border border-fuchsia-300/50 text-xs font-extrabold text-fuchsia-100 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                            >
                              <Zap size={13} className="text-fuchsia-300" />
                              <span>
                                {isAr
                                  ? 'بث فوري + تحميل'
                                  : 'Stream & Download'}
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (existingTask) {
                                  cinemaDownloadManager.setActiveTab('tasks');
                                  if (existingTask.status === 'paused') {
                                    cinemaDownloadManager.resumeTask(
                                      rel.infoHash,
                                    );
                                  }
                                } else {
                                  void cinemaDownloadManager.startDownload(
                                    activeMedia,
                                    rel,
                                    false,
                                  );
                                }
                              }}
                              className="px-3.5 py-2 rounded-xl bg-sky-500/30 hover:bg-sky-500/45 border border-sky-300/55 text-xs font-black text-white flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-md"
                            >
                              <Download size={14} />
                              <span>
                                {isThisActive
                                  ? isAr
                                    ? `جاري التحميل (${existingTask.progressPct.toFixed(1)}%)`
                                    : `Downloading (${existingTask.progressPct.toFixed(1)}%)`
                                  : existingTask?.status === 'paused'
                                    ? isAr
                                      ? `استئناف (${existingTask.progressPct.toFixed(1)}%)`
                                      : `Resume (${existingTask.progressPct.toFixed(1)}%)`
                                    : existingTask?.status === 'completed'
                                      ? isAr
                                        ? 'عرض المكتمل'
                                        : 'View Completed'
                                      : isAr
                                        ? 'تحميل التورنت'
                                        : 'Download Magnet'}
                              </span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )
                ) : allTasks.length === 0 ? (
                  <div className="py-12 text-center text-white/60 flex flex-col items-center gap-2.5">
                    <FolderDown size={28} className="text-sky-300/75" />
                    <p className="text-xs sm:text-sm font-bold">
                      {isAr
                        ? 'لا توجد تحميلات أو جلسات بث تقدمي نشطة حالياً.'
                        : 'No active downloads or progressive streams right now.'}
                    </p>
                    {activeMedia && (
                      <button
                        type="button"
                        onClick={() =>
                          cinemaDownloadManager.setActiveTab('discover')
                        }
                        className="px-4 py-2 rounded-xl bg-white/12 hover:bg-white/20 border border-white/20 text-xs font-extrabold text-white cursor-pointer mt-1"
                      >
                        {isAr
                          ? 'استعراض ملفات التورنت المتاحة'
                          : 'Browse Available Magnet Releases'}
                      </button>
                    )}
                  </div>
                ) : (
                  allTasks.map((task) => {
                    const isRunning =
                      task.status === 'downloading' ||
                      task.status === 'initializing' ||
                      task.status === 'exporting';
                    const isPaused = task.status === 'paused';
                    const isCompleted = task.status === 'completed';
                    const isPlayerOpen =
                      activeStreamingTaskHash === task.infoHash ||
                      Boolean(task.isStreamingActive);
                    const buckets = task.pieceMapBuckets || [];

                    return (
                      <div
                        key={task.taskId}
                        className="p-4 rounded-2xl bg-white/[0.06] border border-white/16 flex flex-col gap-3"
                      >
                        <div className="flex items-start gap-3">
                          <img
                            src={task.media.posterUrl}
                            alt={task.media.title}
                            className="w-12 h-16 rounded-xl object-cover border border-white/20 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                <h5 className="text-xs sm:text-sm font-black text-white truncate">
                                  {task.media.title}
                                  {task.media.mediaType === 'tv' && (
                                    <span className="ms-1.5 text-sky-300 tabular-nums">
                                      S
                                      {String(task.media.season || 1).padStart(
                                        2,
                                        '0',
                                      )}
                                      E
                                      {String(task.media.episode || 1).padStart(
                                        2,
                                        '0',
                                      )}
                                    </span>
                                  )}
                                </h5>
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold shrink-0 ${
                                    task.storageMode === 'hybrid-extended'
                                      ? 'bg-fuchsia-400/20 text-fuchsia-200 border border-fuchsia-300/40'
                                      : 'bg-sky-400/20 text-sky-200 border border-sky-300/40'
                                  }`}
                                >
                                  {task.storageMode === 'hybrid-extended'
                                    ? isAr
                                      ? 'كاش ممتد OPFS + IDB'
                                      : 'Hybrid OPFS + IDB'
                                    : 'OPFS Cache'}
                                </span>
                                {task.headerAndTailReady && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-400/20 text-amber-200 border border-amber-300/40 shrink-0">
                                    {isAr
                                      ? 'الرأس والذيل جاهزان للقفز'
                                      : 'Header+Tail Ready'}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs sm:text-sm font-black text-sky-300 tabular-nums shrink-0">
                                {task.progressPct.toFixed(1)}%
                              </span>
                            </div>

                            <p className="text-[11px] text-white/65 truncate mt-0.5 tabular-nums">
                              {task.release.quality}
                              {' · '}
                              {formatBytes(task.downloadedBytes)} /{' '}
                              {formatBytes(task.totalBytes)}
                              {' · '}
                              {task.completedPieces}/{task.totalPieces}{' '}
                              {isAr ? 'قطعة SHA-1' : 'SHA-1 Pieces'}
                              {task.activePeers > 0 && (
                                <>
                                  {' · '}
                                  <span className="text-sky-300 font-semibold">
                                    {task.activePeers}{' '}
                                    {isAr ? 'نظير متصل' : 'Peers'}
                                  </span>
                                </>
                              )}
                              {isRunning && task.speedBytesPerSec > 0 && (
                                <>
                                  {' · '}
                                  <span className="text-emerald-300 font-bold">
                                    {formatBytes(task.speedBytesPerSec)}/s
                                  </span>
                                </>
                              )}
                            </p>

                            {/* Interactive Sliding-Window Piece Map Bar (Secret #1 Visualization & Click-to-Seek) */}
                            {buckets.length > 0 && (
                              <div className="mt-2.5 flex flex-col gap-1">
                                <div className="flex items-center justify-between text-[10px] text-white/65 tabular-nums">
                                  <span>
                                    {isAr
                                      ? 'خريطة القطع الحية للنافذة المنزلقة (اضغط على أي موضع للقفز الزمني الفوري):'
                                      : 'Live Sliding-Window Piece Map (Click any point to seek priority):'}
                                  </span>
                                  {typeof task.activeDownloadingPieceIndex ===
                                    'number' &&
                                    isRunning && (
                                      <span className="text-fuchsia-300 font-bold">
                                        {isAr
                                          ? `القطعة النشطة: #${task.activeDownloadingPieceIndex + 1}`
                                          : `Active Piece: #${task.activeDownloadingPieceIndex + 1}`}
                                      </span>
                                    )}
                                </div>
                                <div
                                  className="grid gap-0.5 h-3 w-full rounded-lg bg-black/40 p-0.5 border border-white/10"
                                  style={{
                                    gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))`,
                                  }}
                                >
                                  {buckets.map((kind, bIdx) => (
                                    <button
                                      key={bIdx}
                                      type="button"
                                      onClick={() =>
                                        cinemaDownloadManager.seekStreamToProgress(
                                          task.infoHash,
                                          bIdx / buckets.length,
                                        )
                                      }
                                      title={
                                        isAr
                                          ? `قفز أولوية السرب إلى الموضع ${Math.round((bIdx / buckets.length) * 100)}%`
                                          : `Seek swarm priority to ${Math.round((bIdx / buckets.length) * 100)}%`
                                      }
                                      className={`h-full rounded-[2px] cursor-pointer transition-opacity hover:opacity-100 ${
                                        kind === 'playhead-window'
                                          ? 'bg-fuchsia-400'
                                          : kind === 'header-tail'
                                            ? 'bg-amber-400'
                                            : kind === 'verified'
                                              ? 'bg-sky-400'
                                              : 'bg-white/12 hover:bg-white/30'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <div className="flex items-center gap-3 text-[10px] text-white/55 flex-wrap">
                                  <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-xs bg-amber-400 inline-block" />
                                    {isAr
                                      ? 'الرأس والذيل (moov/Cues)'
                                      : 'Header & Tail (moov/Cues)'}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-xs bg-fuchsia-400 inline-block" />
                                    {isAr
                                      ? 'نافذة المشاهدة / القفز الحالية'
                                      : 'Playhead / Seek Window'}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-xs bg-sky-400 inline-block" />
                                    {isAr
                                      ? 'قطع موثقة في الكاش (SHA-1)'
                                      : 'Verified Cached Pieces'}
                                  </span>
                                </div>
                              </div>
                            )}

                            <p className="text-[11px] text-white/85 mt-1.5 font-semibold">
                              {task.statusMessage}
                            </p>
                          </div>
                        </div>

                        {/* Embedded Progressive HTTP 206 Video Streamer inside Modal */}
                        {isPlayerOpen && task.streamUrl && (
                          <div className="rounded-2xl overflow-hidden bg-black border border-white/20 flex flex-col">
                            <div className="px-3 py-2 bg-white/[0.06] border-b border-white/12 flex items-center justify-between gap-2 flex-wrap">
                              <span className="text-[11px] font-extrabold text-fuchsia-200 flex items-center gap-1.5">
                                <Zap size={13} className="text-fuchsia-300" />
                                {isAr
                                  ? 'مشغل البث التقدمي الفوري (HTTP 206 Byte-Range Seeking) — يمكنك التقديم لأي دقيقة فوراً'
                                  : 'Progressive Torrent Player (HTTP 206 Byte-Range Seeking) — Seek to any timestamp'}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  cinemaDownloadManager.openInMainCinemaPlayer(
                                    task.infoHash,
                                  )
                                }
                                className="px-3 py-1 rounded-lg bg-sky-500/30 hover:bg-sky-500/45 border border-sky-300/50 text-[11px] font-black text-white flex items-center gap-1.5 cursor-pointer"
                              >
                                <Tv size={12} />
                                <span>
                                  {isAr
                                    ? 'فتح في مشغل السينما الرئيسي بالصفحة'
                                    : 'Watch in Main Cinema Player'}
                                </span>
                              </button>
                            </div>
                            <video
                              key={task.streamUrl}
                              src={task.streamUrl}
                              controls
                              autoPlay
                              playsInline
                              className="w-full aspect-video bg-black object-contain"
                              onSeeking={(e) => {
                                const v = e.currentTarget;
                                if (v.duration && Number.isFinite(v.duration) && v.duration > 0) {
                                  cinemaDownloadManager.seekStreamToProgress(
                                    task.infoHash,
                                    v.currentTime / v.duration,
                                  );
                                }
                              }}
                              onTimeUpdate={(e) => {
                                const v = e.currentTarget;
                                if (v.duration && Number.isFinite(v.duration) && v.duration > 0) {
                                  const ratio = v.currentTime / v.duration;
                                  const targetP = Math.floor(
                                    ratio * task.totalPieces,
                                  );
                                  if (
                                    Math.abs(
                                      targetP - (task.playheadPieceIndex || 0),
                                    ) >= 3
                                  ) {
                                    cinemaDownloadManager.seekStreamToProgress(
                                      task.infoHash,
                                      ratio,
                                    );
                                  }
                                }
                              }}
                            />
                          </div>
                        )}

                        {/* Task Action Controls */}
                        <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-white/10">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() =>
                                cinemaDownloadManager.toggleStreamPlayerForTask(
                                  task.infoHash,
                                )
                              }
                              className="px-3 py-1.5 rounded-xl bg-fuchsia-500/25 hover:bg-fuchsia-500/40 border border-fuchsia-300/45 text-xs font-extrabold text-fuchsia-100 flex items-center gap-1.5 cursor-pointer"
                            >
                              <Zap size={13} />
                              <span>
                                {isPlayerOpen
                                  ? isAr
                                    ? 'إخفاء المشغل المصغر'
                                    : 'Hide Mini Player'
                                  : isAr
                                    ? 'مشاهدة فورية أثناء التحميل'
                                    : 'Watch Progressive Stream'}
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                cinemaDownloadManager.openInMainCinemaPlayer(
                                  task.infoHash,
                                )
                              }
                              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-extrabold text-white flex items-center gap-1.5 cursor-pointer"
                            >
                              <Tv size={13} />
                              <span>
                                {isAr
                                  ? 'مشغل السينما الرئيسي'
                                  : 'Main Cinema Player'}
                              </span>
                            </button>

                            {isRunning && (
                              <button
                                type="button"
                                onClick={() =>
                                  cinemaDownloadManager.pauseTask(task.infoHash)
                                }
                                className="px-3.5 py-1.5 rounded-xl bg-amber-500/25 hover:bg-amber-500/35 border border-amber-300/45 text-xs font-extrabold text-amber-100 flex items-center gap-1.5 cursor-pointer"
                              >
                                <Pause size={13} />
                                <span>{isAr ? 'إيقاف مؤقت' : 'Pause'}</span>
                              </button>
                            )}

                            {isPaused && (
                              <button
                                type="button"
                                onClick={() =>
                                  cinemaDownloadManager.resumeTask(
                                    task.infoHash,
                                  )
                                }
                                className="px-3.5 py-1.5 rounded-xl bg-sky-500/30 hover:bg-sky-500/45 border border-sky-300/55 text-xs font-extrabold text-white flex items-center gap-1.5 cursor-pointer"
                              >
                                <Play size={13} />
                                <span>
                                  {isAr ? 'استئناف التحميل' : 'Resume Download'}
                                </span>
                              </button>
                            )}

                            {isCompleted && !task.cacheCleared && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    cinemaDownloadManager.reExportTask(
                                      task.infoHash,
                                    )
                                  }
                                  className="px-3.5 py-1.5 rounded-xl bg-white/12 hover:bg-white/20 border border-white/25 text-xs font-extrabold text-white flex items-center gap-1.5 cursor-pointer"
                                >
                                  <FolderDown size={13} />
                                  <span>
                                    {isAr
                                      ? 'حفظ للجهاز مجدداً'
                                      : 'Save to Device Again'}
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    cinemaDownloadManager.confirmClearCache(
                                      task.infoHash,
                                    )
                                  }
                                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500/30 hover:bg-emerald-500/45 border border-emerald-300/55 text-xs font-black text-emerald-100 flex items-center gap-1.5 cursor-pointer shadow-sm"
                                >
                                  <CheckCircle2 size={13} />
                                  <span>
                                    {isAr
                                      ? 'تأكيد وتفريغ الكاش القرصي'
                                      : 'Confirm & Clean Cache'}
                                  </span>
                                </button>
                              </>
                            )}

                            {task.cacheCleared && (
                              <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1">
                                <CheckCircle2 size={13} />
                                {isAr
                                  ? 'تم النقل للجهاز وتفريغ الكاش بنجاح'
                                  : 'Saved to device & cache cleaned'}
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              cinemaDownloadManager.removeTaskFromList(
                                task.infoHash,
                              )
                            }
                            className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 border border-rose-300/40 text-xs font-bold text-rose-200 flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 size={13} />
                            <span>
                              {isAr ? 'حذف وتنظيف' : 'Remove & Clean'}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer Notice */}
              <div className="px-4 sm:px-6 py-3 border-t border-white/12 bg-black/30 flex items-center justify-between gap-2 text-[11px] text-white/65">
                <span>
                  {isAr
                    ? '💡 كل قطعة تشاهدها عبر البث التقدمي (HTTP 206) تُحفظ تلقائياً في كاش المتصفح (OPFS) لتكتمل نسختك دون إعادة تحميل.'
                    : '💡 Every piece watched via HTTP 206 Progressive Stream is automatically cached in OPFS.'}
                </span>
                <span className="font-bold text-sky-300 shrink-0">
                  Sliding-Window + HTTP 206 + OPFS
                </span>
              </div>
            </m.div>
          </div>
        )}
      </AnimatePresence>
    </>,
    document.body,
  );
};
