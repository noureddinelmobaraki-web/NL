import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { m, AnimatePresence } from 'framer-motion';
import { AlertCircle, Download, FileUp, FolderDown, HardDrive, Loader2, RefreshCw, Sparkles, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { normLang } from '../../utils/lang';
import {
  computeTaskMetrics, useCinemaDownloadModalState, useCinemaDownloadTasks, useCustomTorrentInput, useReleaseDiscovery,
  type ReleaseSortKey,
} from './hooks';
import { DownloadCustomInputBar } from './components/DownloadCustomInputBar';
import { DownloadReleaseCard } from './components/DownloadReleaseCard';
import { DownloadTaskCard } from './components/DownloadTaskCard';
import { DownloadFloatingPill } from './components/DownloadFloatingPill';
import { formatBytes } from './releaseParserAndFilter';

const QUALITIES = ['all', '2160p', '1080p', '720p'] as const;

export const CinemaDownloadHost: React.FC = () => {
  const { i18n } = useTranslation();
  const isAr = normLang(i18n.resolvedLanguage || i18n.language) === 'ar';

  const modal = useCinemaDownloadModalState();
  const tasks = useCinemaDownloadTasks();
  const disc = useReleaseDiscovery();
  const input = useCustomTorrentInput();

  const metricsByHash = useMemo(
    () => Object.fromEntries(tasks.allTasks.map((t) => [t.infoHash, computeTaskMetrics(t, isAr)])),
    [tasks.allTasks, isAr],
  );

  if (typeof document === 'undefined') return null;

  const tabBtn = (active: boolean, tone: 'sky' | 'emerald') =>
    `px-3.5 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
      active ? (tone === 'sky' ? 'bg-sky-500/30 border border-sky-300/40' : 'bg-emerald-500/30 border border-emerald-300/40') : 'text-white/70 hover:text-white'}`;

  const renderDiscover = () => {
    if (!disc.activeMedia) return (
      <Empty icon={<Sparkles size={26} className="text-sky-300/80" />}
        text={isAr ? 'اختر فيلماً أو مسلسلاً واضغط "تحميل"، أو أضف ملف .torrent / رابط Magnet من الأعلى.' : 'Pick a title and press "Download", or add a .torrent / Magnet above.'} />
    );
    if (disc.isDiscovering) return (
      <Empty icon={<Loader2 size={28} className="animate-spin text-sky-300" />}
        text={isAr ? `جاري البحث في المفهرسات (${disc.liveTrackersCount} تراكر)...` : `Querying indexers (${disc.liveTrackersCount} trackers)...`} />
    );
    if (disc.discoveryError || disc.filteredReleases.length === 0) return (
      <div className="p-6 rounded-2xl bg-white/[0.04] border border-white/14 text-center flex flex-col items-center gap-2.5">
        <AlertCircle size={24} className={disc.discoveryError ? 'text-rose-300' : 'text-amber-300'} />
        <p className="text-xs sm:text-sm font-bold">{disc.discoveryError ?? (isAr ? 'لا توجد نسخ لهذا الفلتر.' : 'No releases for this filter.')}</p>
        <button type="button" onClick={disc.retryDiscovery} className="px-4 py-1.5 rounded-xl bg-white/15 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer">
          <RefreshCw size={13} />{isAr ? 'إعادة الفحص' : 'Rescan'}
        </button>
      </div>
    );
    return disc.filteredReleases.map((rel) => (
      <DownloadReleaseCard key={rel.id} release={rel} existingTask={tasks.tasksMap[rel.infoHash]} isAr={isAr}
        isCopied={disc.copiedId === rel.id} exportState={disc.torrentExportState[rel.id]}
        onCopyMagnet={disc.copyMagnetLink} onExportTorrent={disc.exportTorrentFile} onDownload={disc.triggerDownload} />
    ));
  };

  const renderTasks = () => tasks.allTasks.length === 0 ? (
    <Empty icon={<FolderDown size={28} className="text-sky-300/75" />} text={isAr ? 'لا توجد مهام تحميل حالياً.' : 'No downloads yet.'} />
  ) : tasks.allTasks.map((t) => (
    <DownloadTaskCard key={t.taskId} task={t} metrics={metricsByHash[t.infoHash]} isAr={isAr}
      onPause={tasks.pauseTask} onResume={tasks.resumeTask} onSaveToDevice={tasks.saveTaskToDevice}
      onCleanCache={tasks.cleanTaskCache} onRemove={tasks.removeTask} />
  ));

  return createPortal(
    <>
      <DownloadFloatingPill visible={!modal.isModalOpen && Boolean(tasks.activeBackgroundTask)} task={tasks.activeBackgroundTask}
        isAr={isAr} onOpenModal={modal.openTasks} onPause={tasks.pauseTask} onResume={tasks.resumeTask} />

      <AnimatePresence>
        {modal.isModalOpen && (
          <div dir={isAr ? 'rtl' : 'ltr'} className="fixed inset-0 z-[10300] flex items-center justify-center p-2.5 sm:p-5 bg-black/80 backdrop-blur-xl">
            <div onClick={modal.close} className="absolute inset-0" aria-hidden="true" />
            <m.div role="dialog" aria-modal="true" aria-labelledby="cd-title" {...input.dropHandlers}
              initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 w-full max-w-3xl max-h-[92dvh] rounded-3xl overflow-hidden flex flex-col text-white border border-white/20 bg-gradient-to-b from-slate-900/95 to-slate-950/98">

              <header className="px-4 sm:px-6 py-4 border-b border-white/12 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-300/40 flex items-center justify-center text-sky-300"><Download size={19} /></div>
                  <div className="min-w-0">
                    <h3 id="cd-title" className="text-sm sm:text-base font-black truncate">{isAr ? 'استوديو التحميل' : 'Download Studio'}</h3>
                    <p className="text-[11px] text-white/65 truncate tabular-nums flex items-center gap-1">
                      <HardDrive size={11} className="text-emerald-300" />
                      {isAr ? `متاح ${tasks.quota.freeGB} GB · مستخدم ${tasks.quota.usageMB} MB` : `Free ${tasks.quota.freeGB} GB · Used ${tasks.quota.usageMB} MB`}
                      {tasks.quota.insufficient && (
                        <span className="text-rose-300 font-bold ms-1">
                          · {isAr ? `يلزم ${formatBytes(tasks.quota.pendingBytes)}` : `Need ${formatBytes(tasks.quota.pendingBytes)}`}
                        </span>
                      )}
                      {!tasks.quota.persisted && (
                        <button type="button" onClick={tasks.requestPersistence} className="ms-1 underline text-amber-200 cursor-pointer">
                          {isAr ? 'تثبيت التخزين' : 'Persist storage'}
                        </button>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button type="button" onClick={input.toggleOpen} aria-expanded={input.isOpen}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold border flex items-center gap-1.5 cursor-pointer ${input.isOpen ? 'bg-sky-500/30 border-sky-300/50' : 'bg-white/8 border-white/15'}`}>
                    <FileUp size={13} className="text-sky-300" /><span className="hidden sm:inline">{isAr ? 'إضافة .torrent / Magnet' : 'Add .torrent / Magnet'}</span>
                  </button>
                  <button type="button" onClick={modal.close} aria-label={isAr ? 'إغلاق' : 'Close'}
                    className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center cursor-pointer"><X size={16} /></button>
                </div>
              </header>

              <DownloadCustomInputBar ctl={input} isAr={isAr} />

              {modal.activeMedia && (
                <div className="px-4 sm:px-6 py-3 bg-white/[0.03] border-b border-white/10 flex items-center gap-3.5">
                  <img src={modal.activeMedia.posterUrl} alt="" className="w-11 h-15 rounded-xl object-cover border border-white/25" />
                  <div className="min-w-0">
                    <h4 className="text-sm sm:text-base font-black truncate">
                      {modal.activeMedia.title}
                      {modal.activeMedia.mediaType === 'tv' && (
                        <span className="ms-2 text-xs text-sky-300 tabular-nums">
                          S{String(modal.activeMedia.season || 1).padStart(2, '0')}E{String(modal.activeMedia.episode || 1).padStart(2, '0')}
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-white/70 tabular-nums">{modal.activeMedia.year}{modal.activeMedia.imdbId && ` · IMDb ${modal.activeMedia.imdbId}`}</p>
                  </div>
                </div>
              )}

              <nav className="px-4 sm:px-6 py-2.5 border-b border-white/10 flex items-center justify-between gap-2 flex-wrap bg-black/25">
                <div role="tablist" className="flex gap-1.5 p-1 rounded-xl bg-white/6 border border-white/12">
                  <button role="tab" aria-selected={modal.activeTab === 'discover'} type="button" onClick={() => modal.setTab('discover')} className={tabBtn(modal.activeTab === 'discover', 'sky')}>
                    {isAr ? 'الجودات المتاحة' : 'Available releases'}
                  </button>
                  <button role="tab" aria-selected={modal.activeTab === 'tasks'} type="button" onClick={() => modal.setTab('tasks')} className={tabBtn(modal.activeTab === 'tasks', 'emerald')}>
                    {isAr ? 'التحميلات' : 'Downloads'}
                    {tasks.allTasks.length > 0 && <span className="px-1.5 rounded-full bg-emerald-500 text-[10px] font-black tabular-nums">{tasks.allTasks.length}</span>}
                  </button>
                </div>
                {modal.activeTab === 'discover' && disc.discoveredReleases.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {QUALITIES.map((q) => (
                      <button key={q} type="button" onClick={() => disc.setQualityFilter(q)} disabled={q !== 'all' && !disc.qualityCounts[q]}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold cursor-pointer tabular-nums disabled:opacity-35 disabled:cursor-not-allowed ${disc.selectedQualityFilter === q ? 'bg-sky-500/30 border border-sky-300/50' : 'bg-white/6 border border-white/12 text-white/70'}`}>
                        {q === 'all' ? (isAr ? 'الكل' : 'All') : q} <span className="opacity-60">{disc.qualityCounts[q] ?? 0}</span>
                      </button>
                    ))}
                    <select value={disc.sortKey} onChange={(e) => disc.setSortKey(e.target.value as ReleaseSortKey)}
                      aria-label={isAr ? 'ترتيب' : 'Sort'} className="ms-1 px-2 py-1 rounded-lg bg-white/8 border border-white/15 text-[11px]">
                      <option value="seeders">{isAr ? 'الأكثر بذوراً' : 'Most seeders'}</option>
                      <option value="quality">{isAr ? 'الأعلى جودة' : 'Highest quality'}</option>
                      <option value="size-asc">{isAr ? 'الأصغر حجماً' : 'Smallest'}</option>
                      <option value="size-desc">{isAr ? 'الأكبر حجماً' : 'Largest'}</option>
                    </select>
                  </div>
                )}
              </nav>

              <main className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-3">
                {modal.activeTab === 'discover' ? renderDiscover() : renderTasks()}
              </main>

              <footer className="px-4 sm:px-6 py-3 border-t border-white/12 bg-black/40 text-[11px] text-white/65">
                {isAr
                  ? 'التحميل أولاً: يُحفظ الملف في OPFS مع تحقق SHA-1. المشاهدة أثناء التحميل اختيارية من بطاقة المهمة. إن تعذّر الوصول للسرب يتوفر دائماً خيار التطبيق الخارجي.'
                  : 'Download-first: OPFS storage with SHA-1 verification. Streaming is opt-in per task. External-app handoff is always available.'}
              </footer>
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
    {icon}<p className="text-xs sm:text-sm font-bold max-w-md">{text}</p>
  </div>
);
