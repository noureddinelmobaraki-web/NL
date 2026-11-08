import React from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Download, Pause, Play } from 'lucide-react';
import { formatBytes } from '../releaseParserAndFilter';
import type { DownloadTaskState } from '../types';

interface DownloadFloatingPillProps {
  visible: boolean;
  task: DownloadTaskState | null;
  isAr: boolean;
  onOpenModal: () => void;
  onPause: (infoHash: string) => void;
  onResume: (infoHash: string) => void;
  onCleanCache: (infoHash: string) => void;
}

export const DownloadFloatingPill: React.FC<DownloadFloatingPillProps> = ({
  visible,
  task,
  isAr,
  onOpenModal,
  onPause,
  onResume,
  onCleanCache,
}) => {
  return (
    <AnimatePresence>
      {visible && task && (
        <m.div
          initial={{ opacity: 0, y: 20, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.94 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          dir={isAr ? 'rtl' : 'ltr'}
          className="fixed bottom-4 inset-inline-end-4 z-[10250] max-w-[360px] w-[calc(100vw-2rem)] rounded-2xl p-3 text-white select-none shadow-2xl border border-white/25"
          style={{
            background:
              'linear-gradient(165deg, rgba(16,28,48,0.92) 0%, rgba(8,12,22,0.96) 100%)',
            backdropFilter: 'blur(24px) saturate(185%)',
            WebkitBackdropFilter: 'blur(24px) saturate(185%)',
          }}
        >
          <div className="flex items-center gap-3">
            <img
              src={task.media.posterUrl}
              alt={task.media.title}
              className="w-10 h-14 rounded-lg object-cover border border-white/20 flex-shrink-0"
            />
            <div
              onClick={onOpenModal}
              className="flex-1 min-w-0 cursor-pointer"
            >
              <div className="flex items-center justify-between gap-1.5">
                <p className="text-xs font-extrabold text-white truncate">
                  {task.media.title}
                </p>
                <span className="text-[11px] font-black text-sky-300 tabular-nums shrink-0">
                  {task.progressPct.toFixed(1)}%
                </span>
              </div>
              <p className="text-[10px] text-white/70 truncate mt-0.5 tabular-nums">
                {task.release.quality}
                {' · '}
                {task.status === 'completed'
                  ? isAr
                    ? 'اكتمل التحميل 100%'
                    : 'Download Complete'
                  : task.status === 'paused'
                    ? isAr
                      ? 'متوقف مؤقتاً'
                      : 'Paused'
                    : task.speedBytesPerSec > 0
                      ? `${formatBytes(task.speedBytesPerSec)}/s`
                      : `${task.completedPieces}/${task.totalPieces}`}
              </p>
              <div className="w-full h-1.5 rounded-full bg-white/15 overflow-hidden mt-1.5">
                <div
                  className={`h-full rounded-full transition-transform duration-200 origin-left ${
                    task.status === 'completed'
                      ? 'bg-emerald-400'
                      : task.status === 'paused'
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
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {task.status === 'downloading' ? (
                <button
                  type="button"
                  onClick={() => onPause(task.infoHash)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center cursor-pointer"
                  aria-label={isAr ? 'إيقاف مؤقت' : 'Pause'}
                >
                  <Pause size={13} />
                </button>
              ) : task.status === 'paused' ? (
                <button
                  type="button"
                  onClick={() => onResume(task.infoHash)}
                  className="w-8 h-8 rounded-full bg-sky-500/30 hover:bg-sky-500/45 border border-sky-300/40 flex items-center justify-center cursor-pointer"
                  aria-label={isAr ? 'استئناف' : 'Resume'}
                >
                  <Play size={13} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onCleanCache(task.infoHash)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/30 hover:bg-emerald-500/45 border border-emerald-300/50 text-[10px] font-extrabold text-emerald-100 cursor-pointer whitespace-nowrap"
                >
                  {isAr ? 'تفريغ الكاش' : 'Clean Cache'}
                </button>
              )}
              <button
                type="button"
                onClick={onOpenModal}
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
  );
};
