/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Isolated Glass Download Studio Modal & Global Background Floating Pill
 * Mounted at the application root so downloads continue seamlessly in the
 * background across all pages even after closing MoviesPage.
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
            className="fixed bottom-4 inset-inline-end-4 z-[10250] max-w-[340px] w-[calc(100vw-2rem)] rounded-2xl p-3 text-white select-none shadow-2xl border border-white/25"
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
                    {activeBackgroundTask.progressPct.toFixed(0)}%
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

      {/* Main Glass Download Studio Modal */}
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
                  ? 'نافذة التحميل عبر الكاش القرصي OPFS والكتابة المباشرة للقرص'
                  : 'OPFS & Direct Disk Browser Download Studio'
              }
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 w-full max-w-2xl max-h-[90dvh] rounded-3xl overflow-hidden flex flex-col text-white border border-white/25 shadow-2xl"
              style={{
                background:
                  'linear-gradient(165deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.04) 45%, rgba(8,12,22,0.92) 100%), rgba(8,12,22,0.86)',
                backdropFilter: 'blur(26px) saturate(190%)',
                WebkitBackdropFilter: 'blur(26px) saturate(190%)',
              }}
            >
              {/* Modal Top Header */}
              <div className="px-4 sm:px-6 py-4 border-b border-white/14 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-2xl bg-sky-500/20 border border-sky-300/40 flex items-center justify-center text-sky-300 shrink-0">
                    <Download size={18} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-black text-white truncate">
                      {isAr
                        ? 'مركز التحميل المباشر بالمتصفح (OPFS + Direct Disk)'
                        : 'Direct Browser Download Studio (OPFS + Direct Disk)'}
                    </h3>
                    <p className="text-[11px] text-white/65 truncate tabular-nums">
                      <HardDrive
                        size={11}
                        className="inline me-1 text-sky-300"
                      />
                      {quota.freeGB > 0
                        ? isAr
                          ? `كاش OPFS المتاح: ${quota.freeGB} GB · المستخدم: ${quota.usageMB} MB · ${liveTrackersCount} تراكر نشط`
                          : `Free OPFS Quota: ${quota.freeGB} GB · Used: ${quota.usageMB} MB · ${liveTrackersCount} Live Trackers`
                        : isAr
                          ? 'تجميع مباشر على القرص مع تحويل تلقائي للكتابة المباشرة عند تجاوز OPFS'
                          : 'Zero-RAM OPFS Disk Staging & Auto Direct-Disk Overflow'}
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

              {/* Active Media Context Card (if opened from a Movie or Series) */}
              {activeMedia && (
                <div className="px-4 sm:px-6 py-3.5 bg-white/[0.04] border-b border-white/12 flex items-center gap-3.5">
                  <img
                    src={activeMedia.posterUrl}
                    alt={activeMedia.title}
                    className="w-12 h-16 sm:w-14 sm:h-20 rounded-xl object-cover border border-white/25 shadow-md shrink-0"
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
                    <div className="flex items-center gap-2 text-xs text-white/70 mt-1 flex-wrap tabular-nums">
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
                      {activeMedia.episodeTitle && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="truncate max-w-[180px]">
                            {activeMedia.episodeTitle}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Segmented Navigation Bar: Discover Releases vs Active/Saved OPFS Tasks */}
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
                    {isAr ? 'خيارات الجودات والروابط' : 'Qualities & Sources'}
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
                        ? 'التحميلات والكاش القرصي'
                        : 'Downloads & OPFS Cache'}
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
                          ? 'اختر أي فيلم أو مسلسل واضغط على زر "تحميل" بجانب زر المشاهدة لجلب جميع الجودات تلقائياً.'
                          : 'Select any movie or series and click "Download" next to Watch Now to fetch available qualities.'}
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
                          ? 'جاري ربط المعرف العالمي (IMDb) وفحص السرب الحقيقي ومصادر البث...'
                          : 'Linking IMDb ID & scanning real BitTorrent swarms and direct streams...'}
                      </p>
                      <p className="text-[11px] text-white/55">
                        {isAr
                          ? 'يتم جلب المصادر الحقيقية فقط مع تطبيق بوابات الفلترة الـ 6 لحظر الامتدادات التنفيذية'
                          : 'Discovering real verified video streams & applying 6-stage malware filter'}
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
                          ? 'لم يتم العثور على ملفات فيديو حقيقية متاحة في السرب لهذه الجودة حالياً.'
                          : 'No verified real video swarms or direct streams found for this filter right now.'}
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
                      const exceedsOpfs =
                        quota.freeBytes > 0 &&
                        rel.sizeBytes > quota.freeBytes * 0.92;

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
                              {exceedsOpfs ? (
                                <span className="text-amber-300 font-bold flex items-center gap-1">
                                  <HardDrive size={12} className="shrink-0" />
                                  {isAr
                                    ? `أكبر من كاش OPFS (${quota.freeGB} GB) · سيتم الحفظ المباشر لقرص جهازك تلقائياً (Direct Disk)`
                                    : `Exceeds OPFS Quota (${quota.freeGB} GB) · Auto Direct-to-Disk Streaming`}
                                </span>
                              ) : (
                                <span className="text-emerald-300/90 flex items-center gap-1">
                                  <ShieldCheck size={12} className="shrink-0" />
                                  {isAr
                                    ? 'مصدر حقيقي · تجميع في OPFS مع تحقق SHA-1 أو حفظ مباشر للقرص'
                                    : 'Real Source · OPFS Disk Cache with SHA-1 or Direct Disk Save'}
                                </span>
                              )}
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

                            {!exceedsOpfs && (
                              <button
                                type="button"
                                onClick={() => {
                                  void cinemaDownloadManager.startDownload(
                                    activeMedia,
                                    rel,
                                    'direct-disk',
                                  );
                                }}
                                title={
                                  isAr
                                    ? 'كتابة مباشرة لقرص الجهاز بدون المرور على كاش OPFS'
                                    : 'Write directly to device disk bypassing OPFS cache'
                                }
                                className="px-2.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 border border-amber-300/45 text-xs font-extrabold text-amber-100 flex items-center gap-1 cursor-pointer whitespace-nowrap"
                              >
                                <HardDrive size={13} />
                                <span>
                                  {isAr ? 'حفظ مباشر للقرص' : 'Direct Disk'}
                                </span>
                              </button>
                            )}

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
                                  );
                                }
                              }}
                              className="px-3.5 py-2 rounded-xl bg-sky-500/30 hover:bg-sky-500/45 border border-sky-300/55 text-xs font-black text-white flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-md"
                            >
                              <Download size={14} />
                              <span>
                                {isThisActive
                                  ? isAr
                                    ? `جاري التحميل (${existingTask.progressPct.toFixed(0)}%)`
                                    : `Downloading (${existingTask.progressPct.toFixed(0)}%)`
                                  : existingTask?.status === 'paused'
                                    ? isAr
                                      ? `استئناف (${existingTask.progressPct.toFixed(0)}%)`
                                      : `Resume (${existingTask.progressPct.toFixed(0)}%)`
                                    : existingTask?.status === 'completed'
                                      ? isAr
                                        ? 'عرض المكتمل'
                                        : 'View Completed'
                                      : exceedsOpfs
                                        ? isAr
                                          ? 'تحميل مباشر للقرص'
                                          : 'Direct Disk Download'
                                        : isAr
                                          ? 'تحميل بالمتصفح'
                                          : 'Browser Download'}
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
                        ? 'لا توجد تحميلات نشطة أو محفوظة في كاش المتصفح (OPFS) حالياً.'
                        : 'No active or cached downloads in OPFS storage.'}
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
                          ? 'استعراض جودات التحميل المتاحة'
                          : 'Browse Available Qualities'}
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
                              <div className="flex items-center gap-2 min-w-0">
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
                                    task.storageMode === 'direct-disk'
                                      ? 'bg-amber-400/20 text-amber-200 border border-amber-300/40'
                                      : 'bg-sky-400/20 text-sky-200 border border-sky-300/40'
                                  }`}
                                >
                                  {task.storageMode === 'direct-disk'
                                    ? isAr
                                      ? 'قرص مباشر Direct Disk'
                                      : 'Direct Disk'
                                    : 'OPFS Cache'}
                                </span>
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

                            {/* Progress Bar */}
                            <div className="w-full h-2 rounded-full bg-white/12 overflow-hidden mt-2">
                              <div
                                className={`h-full rounded-full transition-transform duration-200 origin-left ${
                                  isCompleted
                                    ? 'bg-emerald-400'
                                    : isPaused
                                      ? 'bg-amber-400'
                                      : 'bg-sky-400'
                                }`}
                                style={{
                                  transform: `scaleX(${Math.max(
                                    0.02,
                                    task.progressPct / 100,
                                  )})`,
                                }}
                              />
                            </div>

                            <p className="text-[11px] text-white/80 mt-1.5 font-semibold">
                              {task.statusMessage}
                            </p>
                          </div>
                        </div>

                        {/* Task Action Controls: Pause / Resume / Export / Confirm Cache Cleanup */}
                        <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-white/10">
                          <div className="flex items-center gap-2 flex-wrap">
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

                            {isCompleted &&
                              task.storageMode === 'opfs-cache' &&
                              !task.cacheCleared && (
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
                                        ? 'تأكيد وتفريغ كاش المتصفح (OPFS)'
                                        : 'Confirm & Clean OPFS Cache'}
                                    </span>
                                  </button>
                                </>
                              )}

                            {task.cacheCleared && (
                              <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1">
                                <CheckCircle2 size={13} />
                                {task.storageMode === 'direct-disk'
                                  ? isAr
                                    ? 'تم الحفظ المباشر لقرص جهازك بدون استهلاك كاش المتصفح'
                                    : 'Saved directly to device disk with zero OPFS usage'
                                  : isAr
                                    ? 'تم النقل للجهاز وتفريغ الكاش بنجاح'
                                    : 'Saved to device & OPFS cache cleaned'}
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
                    ? '💡 يستمر التحميل في الخلفية حتى لو أغلقت هذه النافذة أو خرجت من صفحة الأفلام.'
                    : '💡 Downloads continue in the background even if you close this window or leave Movies.'}
                </span>
                <span className="font-bold text-sky-300 shrink-0">
                  WebTorrent + HLS + OPFS/Disk
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
