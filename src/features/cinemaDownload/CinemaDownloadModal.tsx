/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Modular Hook-Driven Cinema Download Studio Modal
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { m, AnimatePresence } from 'framer-motion';
import {
  X,
  Download,
  HardDrive,
  Sparkles,
  Loader2,
  FolderDown,
  RefreshCw,
  AlertCircle,
  FileUp,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { normLang } from '../../utils/lang';
import { cinemaDownloadManager } from './downloadManager';
import {
  useCinemaDownloadTasks,
  useCustomTorrentInput,
  useReleaseDiscovery,
} from './hooks';
import { DownloadCustomInputBar } from './components/DownloadCustomInputBar';
import { DownloadReleaseCard } from './components/DownloadReleaseCard';
import { DownloadTaskCard } from './components/DownloadTaskCard';
import { DownloadFloatingPill } from './components/DownloadFloatingPill';
import type { DownloadQualityTier } from './types';

export const CinemaDownloadHost: React.FC = () => {
  const { i18n } = useTranslation();
  const currentLang = normLang(i18n.resolvedLanguage || i18n.language);
  const isAr = currentLang === 'ar';

  const {
    tasksMap,
    allTasks,
    activeBackgroundTask,
    quota,
    activeTab,
    isModalOpen,
    formatTaskMetrics,
    pauseTask,
    resumeTask,
    saveTaskToDevice,
    cleanTaskCache,
    removeTask,
  } = useCinemaDownloadTasks(isAr);

  const {
    activeMedia,
    isDiscovering,
    discoveredReleases,
    filteredReleases,
    discoveryError,
    selectedQualityFilter,
    liveTrackersCount,
    copiedId,
    setQualityFilter,
    retryDiscovery,
    copyMagnetLink,
    triggerDownloadOnly,
    triggerOptionalStream,
  } = useReleaseDiscovery();

  const customInput = useCustomTorrentInput();

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <DownloadFloatingPill
        visible={!isModalOpen && Boolean(activeBackgroundTask)}
        task={activeBackgroundTask}
        isAr={isAr}
        onOpenModal={() => cinemaDownloadManager.openTasksModal()}
        onPause={pauseTask}
        onResume={resumeTask}
        onCleanCache={cleanTaskCache}
      />

      <AnimatePresence>
        {isModalOpen && (
          <div
            dir={isAr ? 'rtl' : 'ltr'}
            className="fixed inset-0 z-[10300] flex items-center justify-center p-2.5 sm:p-5 bg-black/80 backdrop-blur-xl select-none"
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
                  ? 'مركز تحميل الأفلام والمسلسلات (TPPIECES OPFS)'
                  : 'Cinema Torrent & Direct Download Center (OPFS)'
              }
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 w-full max-w-3xl max-h-[92dvh] rounded-3xl overflow-hidden flex flex-col text-white border border-white/20 shadow-[0_24px_80px_rgba(0,0,0,0.85)]"
              style={{
                background:
                  'linear-gradient(165deg, rgba(22,32,54,0.95) 0%, rgba(10,15,28,0.98) 100%)',
                backdropFilter: 'blur(28px) saturate(190%)',
                WebkitBackdropFilter: 'blur(28px) saturate(190%)',
              }}
            >
              {/* Header */}
              <div className="px-4 sm:px-6 py-4 border-b border-white/12 flex items-center justify-between gap-3 bg-gradient-to-r from-sky-500/10 via-transparent to-emerald-500/10">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-300/40 flex items-center justify-center text-sky-300 shrink-0 shadow-inner">
                    <Download size={19} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-black text-white truncate">
                      {isAr
                        ? 'مركز التنزيل المباشر والتورنت الذكي (OPFS Disk Engine)'
                        : 'Smart Torrent & Direct Disk Download Studio (OPFS)'}
                    </h3>
                    <p className="text-[11px] text-white/65 truncate tabular-nums mt-0.5">
                      <HardDrive
                        size={11}
                        className="inline me-1 text-emerald-300"
                      />
                      {quota.freeGB > 0
                        ? isAr
                          ? `المساحة الحرة: ${quota.freeGB} GB · المستخدم: ${quota.usageMB} MB · ${liveTrackersCount} تراكر نشط`
                          : `Free Disk Cache: ${quota.freeGB} GB · Used: ${quota.usageMB} MB · ${liveTrackersCount} Trackers`
                        : isAr
                          ? 'تخزين قرصي معزول TPPIECES + دمج ذري بدون تلف'
                          : 'TPPIECES Append-Only Disk Store + Atomic File Merger'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={customInput.toggleOpen}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold border flex items-center gap-1.5 cursor-pointer transition-colors ${
                      customInput.isOpen
                        ? 'bg-sky-500/30 border-sky-300/50 text-sky-100'
                        : 'bg-white/8 hover:bg-white/15 border-white/15 text-white/85'
                    }`}
                  >
                    <FileUp size={13} className="text-sky-300" />
                    <span className="hidden sm:inline">
                      {isAr ? 'إضافة .torrent / Magnet' : 'Add .torrent / Magnet'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => cinemaDownloadManager.closeModal()}
                    className="lg-cinema-icon-pill !w-9 !h-9 !min-w-[36px] !min-h-[36px] shrink-0"
                    aria-label={isAr ? 'إغلاق' : 'Close'}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <DownloadCustomInputBar
                isAr={isAr}
                isOpen={customInput.isOpen}
                magnetText={customInput.magnetText}
                errorMsg={customInput.errorMsg}
                isSubmitting={customInput.isSubmitting}
                fileInputRef={customInput.fileInputRef}
                onMagnetTextChange={customInput.setMagnetText}
                onSubmitMagnet={customInput.submitMagnetLink}
                onOpenFilePicker={customInput.openFilePicker}
                onFileSelected={customInput.handleFileSelected}
              />

              {/* Active Media Context Banner */}
              {activeMedia && (
                <div className="px-4 sm:px-6 py-3 bg-white/[0.03] border-b border-white/10 flex items-center justify-between gap-3.5">
                  <div className="flex items-center gap-3.5 min-w-0">
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
                          <span className="px-2 py-0.5 rounded-md bg-sky-500/20 border border-sky-300/35 text-xs font-extrabold text-sky-300 tabular-nums">
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
                </div>
              )}

              {/* Tabs & Quality Filter Bar */}
              <div className="px-4 sm:px-6 py-2.5 border-b border-white/10 flex items-center justify-between gap-2 flex-wrap bg-black/25">
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/6 border border-white/12">
                  <button
                    type="button"
                    onClick={() =>
                      cinemaDownloadManager.setActiveTab('discover')
                    }
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-colors cursor-pointer whitespace-nowrap ${
                      activeTab === 'discover'
                        ? 'bg-sky-500/30 text-white border border-sky-300/40 shadow-sm'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    {isAr
                      ? 'الجودات المتاحة للتنزيل'
                      : 'Available Download Qualities'}
                  </button>
                  <button
                    type="button"
                    onClick={() => cinemaDownloadManager.setActiveTab('tasks')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      activeTab === 'tasks'
                        ? 'bg-emerald-500/30 text-white border border-emerald-300/40 shadow-sm'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    <span>
                      {isAr
                        ? 'التحميلات النشطة والمكتملة'
                        : 'Active & Completed Downloads'}
                    </span>
                    {allTasks.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[10px] font-black tabular-nums">
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
                          setQualityFilter(q as DownloadQualityTier | 'all')
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

              {/* Scrollable Content */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-3">
                {activeTab === 'discover' ? (
                  !activeMedia ? (
                    <div className="py-12 text-center text-white/65 flex flex-col items-center gap-2">
                      <Sparkles size={26} className="text-sky-300/80" />
                      <p className="text-xs sm:text-sm font-bold">
                        {isAr
                          ? 'اختر أي فيلم أو مسلسل واضغط على زر "تحميل" بجانب زر المشاهدة لجلب جميع الجودات المتاحة.'
                          : 'Select any movie or series and click "Download" next to Watch Now to fetch available releases.'}
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
                          ? 'جاري فحص الجودات المتاحة وربط مصادر التنزيل المباشر والتورنت...'
                          : 'Scanning available qualities & linking direct/swarm download sources...'}
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
                        onClick={retryDiscovery}
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
                          ? 'لم يتم العثور على نسخ مطابقة لهذا الفلتر حالياً.'
                          : 'No verified releases found for this filter right now.'}
                      </p>
                      <button
                        type="button"
                        onClick={retryDiscovery}
                        className="px-4 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-extrabold cursor-pointer flex items-center gap-1.5"
                      >
                        <RefreshCw size={13} />
                        <span>{isAr ? 'إعادة الفحص' : 'Rescan Sources'}</span>
                      </button>
                    </div>
                  ) : (
                    filteredReleases.map((rel) => (
                      <DownloadReleaseCard
                        key={rel.id}
                        release={rel}
                        existingTask={tasksMap[rel.infoHash]}
                        isCopied={copiedId === rel.id}
                        isAr={isAr}
                        onCopyMagnet={copyMagnetLink}
                        onDownloadOnly={triggerDownloadOnly}
                        onOptionalStream={triggerOptionalStream}
                      />
                    ))
                  )
                ) : allTasks.length === 0 ? (
                  <div className="py-12 text-center text-white/60 flex flex-col items-center gap-2.5">
                    <FolderDown size={28} className="text-sky-300/75" />
                    <p className="text-xs sm:text-sm font-bold">
                      {isAr
                        ? 'لا توجد مهام تحميل حالياً.'
                        : 'No active or completed downloads right now.'}
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
                          ? 'عرض الجودات المتاحة للتنزيل'
                          : 'Browse Available Qualities'}
                      </button>
                    )}
                  </div>
                ) : (
                  allTasks.map((task) => (
                    <DownloadTaskCard
                      key={task.taskId}
                      task={task}
                      isAr={isAr}
                      metrics={formatTaskMetrics(task)}
                      onPause={pauseTask}
                      onResume={resumeTask}
                      onSaveToDevice={saveTaskToDevice}
                      onCleanCache={cleanTaskCache}
                      onRemove={removeTask}
                    />
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-4 sm:px-6 py-3 border-t border-white/12 bg-black/40 flex items-center justify-between gap-2 text-[11px] text-white/65">
                <span>
                  {isAr
                    ? '💾 يتم التحميل مباشرة إلى مخزن المتصفح القرصي (TPPIECES OPFS) مع فحص SHA-1 ودمج ذري كامل بدون استهلاك الذاكرة.'
                    : '💾 Downloads directly into TPPIECES OPFS disk store with SHA-1 verification and zero-RAM atomic merging.'}
                </span>
                <span className="font-bold text-emerald-300 shrink-0">
                  TPPIECES OPFS + SHA-1
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
