import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { m, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  ArrowUpDown,
  Download,
  FolderDown,
  HardDrive,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { normLang } from '../../utils/lang';
import {
  computeTaskMetrics,
  useCinemaDownloadModalState,
  useCinemaDownloadTasks,
  useReleaseDiscovery,
  type ReleaseSortKey,
} from './hooks';
import { DownloadReleaseCard } from './components/DownloadReleaseCard';
import { DownloadTaskCard } from './components/DownloadTaskCard';
import { DownloadFloatingPill } from './components/DownloadFloatingPill';
import { formatBytes } from './releaseParserAndFilter';

const QUALITIES = ['all', '2160p', '1080p', '720p'] as const;
type CodecFilterKey = 'all' | 'hevc' | 'avc';

const ZWaitingLoader: React.FC<{ text?: string }> = ({ text }) => (
  <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
    <div className="cd-z-loader-wrapper" aria-hidden="true">
      <div>
        <div className="z z-1">Z</div>
        <div className="z z-2">Z</div>
        <div className="z z-3">Z</div>
        <div className="z z-4">Z</div>
      </div>
    </div>
    {text && <p className="text-xs sm:text-sm font-bold text-white/75 max-w-md">{text}</p>}
  </div>
);

export const CinemaDownloadHost: React.FC = () => {
  const { i18n } = useTranslation();
  const isAr = normLang(i18n.resolvedLanguage || i18n.language) === 'ar';

  const modal = useCinemaDownloadModalState();
  const tasks = useCinemaDownloadTasks();
  const disc = useReleaseDiscovery();
  const [codecFilter, setCodecFilter] = useState<CodecFilterKey>('all');

  const metricsByHash = useMemo(
    () =>
      Object.fromEntries(
        tasks.allTasks.map((t) => [t.infoHash, computeTaskMetrics(t, isAr)]),
      ),
    [tasks.allTasks, isAr],
  );

  const visibleReleases = useMemo(() => {
    if (codecFilter === 'all') return disc.filteredReleases;
    return disc.filteredReleases.filter((r) => {
      const c = (r.videoCodec || '').toUpperCase();
      if (codecFilter === 'hevc') return c.includes('265') || c.includes('HEVC');
      return c.includes('264') || c.includes('AVC');
    });
  }, [disc.filteredReleases, codecFilter]);

  if (typeof document === 'undefined') return null;

  const tabBtn = (active: boolean, tone: 'sky' | 'emerald') =>
    `px-4 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer whitespace-nowrap flex items-center gap-1.5 transition-colors ${
      active
        ? tone === 'sky'
          ? 'bg-sky-500/25 border border-sky-300/40 text-white'
          : 'bg-emerald-500/25 border border-emerald-300/40 text-white'
        : 'text-white/65 hover:text-white border border-transparent'
    }`;

  const renderDiscover = () => {
    if (!disc.activeMedia) {
      return (
        <Empty
          icon={<Sparkles size={26} className="text-sky-300/80" />}
          text={
            isAr
              ? 'اختر فيلماً أو مسلسلاً واضغط "تحميل" لاستعراض الجودات المتاحة.'
              : 'Pick a movie or series and press "Download" to browse available releases.'
          }
        />
      );
    }
    if (disc.isDiscovering) {
      return (
        <ZWaitingLoader
          text={
            isAr
              ? `جاري جلب الجودات والتورنتات المتاحة (${disc.liveTrackersCount} تراكر)...`
              : `Fetching available torrents (${disc.liveTrackersCount} trackers)...`
          }
        />
      );
    }
    if (disc.discoveryError || visibleReleases.length === 0) {
      return (
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/12 text-center flex flex-col items-center gap-3">
          <AlertCircle
            size={24}
            className={disc.discoveryError ? 'text-rose-300' : 'text-amber-300'}
          />
          <p className="text-xs sm:text-sm font-bold text-white/85">
            {disc.discoveryError ??
              (isAr ? 'لا توجد نسخ مطابقة لهذا الفلتر.' : 'No releases match this filter.')}
          </p>
          <div className="flex items-center gap-2">
            {codecFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setCodecFilter('all')}
                className="px-3.5 py-1.5 rounded-xl bg-sky-500/20 border border-sky-300/40 text-xs font-extrabold cursor-pointer"
              >
                {isAr ? 'عرض كل الترميزات' : 'Show all codecs'}
              </button>
            )}
            <button
              type="button"
              onClick={disc.retryDiscovery}
              className="px-4 py-1.5 rounded-xl bg-white/12 hover:bg-white/20 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RefreshCw size={13} />
              <span>{isAr ? 'إعادة الفحص' : 'Rescan'}</span>
            </button>
          </div>
        </div>
      );
    }
    return visibleReleases.map((rel) => (
      <DownloadReleaseCard
        key={rel.id}
        release={rel}
        existingTask={tasks.tasksMap[rel.infoHash]}
        isAr={isAr}
        isCopied={disc.copiedId === rel.id}
        exportState={disc.torrentExportState[rel.id]}
        onCopyMagnet={disc.copyMagnetLink}
        onExportTorrent={disc.exportTorrentFile}
        onDownload={disc.triggerDownload}
      />
    ));
  };

  const renderTasks = () =>
    tasks.allTasks.length === 0 ? (
      <Empty
        icon={<FolderDown size={28} className="text-sky-300/75" />}
        text={isAr ? 'لا توجد مهام تحميل حالياً.' : 'No downloads yet.'}
      />
    ) : (
      tasks.allTasks.map((t) => (
        <DownloadTaskCard
          key={t.taskId}
          task={t}
          metrics={metricsByHash[t.infoHash]}
          isAr={isAr}
          onPause={tasks.pauseTask}
          onResume={tasks.resumeTask}
          onSaveToDevice={tasks.saveTaskToDevice}
          onCleanCache={tasks.cleanTaskCache}
          onRemove={tasks.removeTask}
        />
      ))
    );

  return createPortal(
    <>
      <DownloadFloatingPill
        visible={!modal.isModalOpen && Boolean(tasks.activeBackgroundTask)}
        task={tasks.activeBackgroundTask}
        isAr={isAr}
        onOpenModal={modal.openTasks}
        onPause={tasks.pauseTask}
        onResume={tasks.resumeTask}
      />

      <AnimatePresence>
        {modal.isModalOpen && (
          <div
            dir={isAr ? 'rtl' : 'ltr'}
            className="fixed inset-0 z-[10300] flex items-center justify-center p-2.5 sm:p-5 bg-black/80 backdrop-blur-xl"
          >
            <div onClick={modal.close} className="absolute inset-0" aria-hidden="true" />
            <m.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="cd-title"
              initial={{ opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 14 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 w-full max-w-3xl max-h-[90dvh] rounded-3xl overflow-hidden flex flex-col text-white border border-white/15 bg-gradient-to-b from-slate-900/98 to-slate-950 shadow-2xl"
            >
              <header className="px-4 sm:px-6 py-4 border-b border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-300/35 flex items-center justify-center text-sky-300 shrink-0">
                    <Download size={19} />
                  </div>
                  <div className="min-w-0">
                    <h3 id="cd-title" className="text-sm sm:text-base font-black truncate">
                      {isAr ? 'استوديو التحميل' : 'Download Studio'}
                    </h3>
                    <p
                      dir="ltr"
                      className="text-[11px] text-white/65 truncate tabular-nums flex items-center gap-1.5"
                    >
                      <HardDrive size={11} className="text-emerald-300 shrink-0" />
                      <span>
                        Free {tasks.quota.freeGB} GB · Used {tasks.quota.usageMB} MB
                      </span>
                      {tasks.quota.insufficient && (
                        <span className="text-rose-300 font-bold">
                          · Need {formatBytes(tasks.quota.pendingBytes)}
                        </span>
                      )}
                      {!tasks.quota.persisted && (
                        <button
                          type="button"
                          onClick={tasks.requestPersistence}
                          className="ms-1 underline text-amber-200 cursor-pointer"
                        >
                          {isAr ? 'تثبيت التخزين' : 'Persist'}
                        </button>
                      )}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={modal.close}
                  aria-label={isAr ? 'إغلاق' : 'Close'}
                  className="w-9 h-9 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/15 flex items-center justify-center cursor-pointer transition-colors shrink-0"
                >
                  <X size={16} />
                </button>
              </header>

              {modal.activeMedia && (
                <div className="px-4 sm:px-6 py-3 bg-white/[0.025] border-b border-white/10 flex items-center gap-3.5">
                  <img
                    src={modal.activeMedia.posterUrl}
                    alt=""
                    className="w-11 h-15 rounded-xl object-cover border border-white/20 shrink-0"
                  />
                  <div className="min-w-0">
                    <h4 className="text-sm sm:text-base font-black truncate">
                      {modal.activeMedia.title}
                      {modal.activeMedia.mediaType === 'tv' && (
                        <span className="ms-2 text-xs text-sky-300 tabular-nums" dir="ltr">
                          S{String(modal.activeMedia.season || 1).padStart(2, '0')}E
                          {String(modal.activeMedia.episode || 1).padStart(2, '0')}
                        </span>
                      )}
                    </h4>
                    <p dir="ltr" className="text-xs text-white/65 tabular-nums">
                      {modal.activeMedia.year}
                      {modal.activeMedia.imdbId && ` · IMDb ${modal.activeMedia.imdbId}`}
                    </p>
                  </div>
                </div>
              )}

              <nav className="px-4 sm:px-6 py-3 border-b border-white/10 flex flex-col gap-2.5 bg-black/25">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div
                    role="tablist"
                    className="flex gap-1 p-1 rounded-2xl bg-white/[0.05] border border-white/10"
                  >
                    <button
                      role="tab"
                      aria-selected={modal.activeTab === 'discover'}
                      type="button"
                      onClick={() => modal.setTab('discover')}
                      className={tabBtn(modal.activeTab === 'discover', 'sky')}
                    >
                      {isAr ? 'الجودات المتاحة' : 'Available releases'}
                    </button>
                    <button
                      role="tab"
                      aria-selected={modal.activeTab === 'tasks'}
                      type="button"
                      onClick={() => modal.setTab('tasks')}
                      className={tabBtn(modal.activeTab === 'tasks', 'emerald')}
                    >
                      <span>{isAr ? 'التحميلات' : 'Downloads'}</span>
                      {tasks.allTasks.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black tabular-nums">
                          {tasks.allTasks.length}
                        </span>
                      )}
                    </button>
                  </div>

                  {modal.activeTab === 'discover' && disc.discoveredReleases.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <ArrowUpDown size={13} className="text-white/50 shrink-0" />
                      <select
                        value={disc.sortKey}
                        onChange={(e) => disc.setSortKey(e.target.value as ReleaseSortKey)}
                        aria-label={isAr ? 'ترتيب النتائج' : 'Sort releases'}
                        className="px-2.5 py-1.5 rounded-xl bg-white/[0.07] border border-white/15 text-[11px] font-bold text-white cursor-pointer outline-none"
                      >
                        <option value="seeders" className="bg-slate-900 text-white">
                          {isAr ? 'الأكثر بذوراً (Seeders)' : 'Most Seeders'}
                        </option>
                        <option value="quality" className="bg-slate-900 text-white">
                          {isAr ? 'الأعلى جودة (4K → 720p)' : 'Highest Quality'}
                        </option>
                        <option value="size-asc" className="bg-slate-900 text-white">
                          {isAr ? 'الأصغر حجماً' : 'Smallest Size'}
                        </option>
                        <option value="size-desc" className="bg-slate-900 text-white">
                          {isAr ? 'الأكبر حجماً' : 'Largest Size'}
                        </option>
                      </select>
                    </div>
                  )}
                </div>

                {modal.activeTab === 'discover' && disc.discoveredReleases.length > 0 && (
                  <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {QUALITIES.map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => disc.setQualityFilter(q)}
                          disabled={q !== 'all' && !disc.qualityCounts[q]}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold cursor-pointer tabular-nums transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                            disc.selectedQualityFilter === q
                              ? 'bg-sky-500/25 border border-sky-300/45 text-white'
                              : 'bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-white/70'
                          }`}
                        >
                          {q === 'all' ? (isAr ? 'الكل' : 'All') : q}{' '}
                          <span className="opacity-60 ms-0.5">{disc.qualityCounts[q] ?? 0}</span>
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1" dir="ltr">
                      {(
                        [
                          { id: 'all', label: isAr ? 'كل الترميزات' : 'All Codecs' },
                          { id: 'hevc', label: 'H.265 / HEVC' },
                          { id: 'avc', label: 'H.264' },
                        ] as const
                      ).map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setCodecFilter(c.id)}
                          className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold cursor-pointer transition-colors ${
                            codecFilter === c.id
                              ? 'bg-amber-400/20 border border-amber-300/40 text-amber-200'
                              : 'bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/65'
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </nav>

              <main className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-3">
                {modal.activeTab === 'discover' ? renderDiscover() : renderTasks()}
              </main>
            </m.div>
          </div>
        )}
      </AnimatePresence>
    </>,
    document.body,
  );
};

const Empty: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
  <div className="py-12 text-center text-white/65 flex flex-col items-center gap-2.5">
    {icon}
    <p className="text-xs sm:text-sm font-bold max-w-md">{text}</p>
  </div>
);
