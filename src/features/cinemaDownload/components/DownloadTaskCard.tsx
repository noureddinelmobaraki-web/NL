import { memo } from 'react';
import { CheckCircle2, FolderDown, Pause, Play } from 'lucide-react';
import type { TaskMetrics } from '../hooks/useCinemaDownloadTasks';
import type { DownloadTaskState } from '../types';
import { TransportDiagnosticsStrip } from './TransportDiagnosticsStrip';
import { ExternalHandoffPanel } from './ExternalHandoffPanel';

interface Props {
  task: DownloadTaskState;
  metrics: TaskMetrics;
  isAr: boolean;
  onPause: (h: string) => void;
  onResume: (h: string) => void;
  onSaveToDevice: (h: string) => void;
  onCleanCache: (h: string) => void;
  onRemove: (h: string) => void;
}

function stripEmojis(text: string): string {
  return text
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export const DownloadTaskCard = memo<Props>(function DownloadTaskCard({
  task,
  metrics,
  isAr,
  onPause,
  onResume,
  onSaveToDevice,
  onCleanCache,
  onRemove,
}) {
  const showDiag =
    task.status === 'initializing' ||
    task.status === 'downloading' ||
    metrics.needsFallback;

  const cleanStatusMessage = stripEmojis(task.statusMessage || '');

  return (
    <article className="p-4 sm:p-5 rounded-2xl bg-white/[0.04] border border-white/12 flex flex-col gap-4 shadow-xl">
      <div className="flex items-start gap-3.5 sm:gap-4">
        <img
          src={task.media.posterUrl}
          alt=""
          className="w-14 h-20 rounded-xl object-cover border border-white/15 shrink-0"
        />

        <div className="flex-1 min-w-0 flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <h5 className="text-sm sm:text-base font-black text-white truncate">
                {task.media.title}
              </h5>
              {task.media.mediaType === 'tv' && (
                <span className="text-xs font-bold text-sky-300 tabular-nums" dir="ltr">
                  S{String(task.media.season || 1).padStart(2, '0')}E
                  {String(task.media.episode || 1).padStart(2, '0')}
                </span>
              )}
              <span className="px-2 py-0.5 rounded-md text-[10.5px] font-extrabold bg-sky-500/20 text-sky-200 border border-sky-300/30 tabular-nums">
                {task.release.quality}
              </span>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {metrics.isRunning && (
                <div className="cd-pulse-wrapper" aria-hidden="true">
                  <div className="loading">
                    <svg width="64px" height="48px" viewBox="0 0 64 48">
                      <polyline
                        points="0.157 23.954, 14 23.954, 21.843 48, 43 0, 50 24, 64 24"
                        id="back"
                        className="cd-pulse-back"
                      />
                      <polyline
                        points="0.157 23.954, 14 23.954, 21.843 48, 43 0, 50 24, 64 24"
                        id="front"
                        className="cd-pulse-front"
                      />
                    </svg>
                  </div>
                </div>
              )}
              <span
                dir="ltr"
                className="text-base sm:text-lg font-black text-emerald-300 tabular-nums tracking-tight"
              >
                {task.progressPct.toFixed(1)}%
              </span>
            </div>
          </div>

          <div
            className="w-full h-2.5 rounded-full bg-black/60 border border-white/10 overflow-hidden p-[1px]"
            role="progressbar"
            aria-valuenow={task.progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={`h-full rounded-full transition-[width] duration-500 ${
                metrics.isCompleted
                  ? 'bg-emerald-400'
                  : metrics.isPaused
                    ? 'bg-amber-400'
                    : 'bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-400'
              }`}
              style={{ width: `${Math.max(1.5, task.progressPct)}%` }}
            />
          </div>

          <div className="flex items-center justify-between gap-2 text-xs text-white/80 flex-wrap tabular-nums">
            <div dir="ltr" className="flex items-center gap-1.5 font-semibold">
              <span className="text-white font-extrabold">{metrics.downloadedFormatted}</span>
              <span className="text-white/40">/</span>
              <span className="text-white/75">{metrics.totalFormatted}</span>
              <span className="text-white/30">·</span>
              <span className="text-white/60 text-[11px]">
                {task.completedPieces}/{task.totalPieces}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span
                dir="ltr"
                className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 font-black text-xs tabular-nums"
              >
                {metrics.speedFormatted ?? (metrics.isRunning ? '0.00 MB/s' : '—')}
              </span>
              {metrics.etaFormatted && (
                <span className="px-2.5 py-0.5 rounded-lg bg-sky-500/15 border border-sky-400/25 text-sky-200 font-bold text-[11px] tabular-nums">
                  {isAr ? `المتبقي ${metrics.etaFormatted}` : `ETA ${metrics.etaFormatted}`}
                </span>
              )}
            </div>
          </div>

          {cleanStatusMessage && (
            <p dir="auto" className="text-[11px] text-white/65 font-medium truncate">
              {cleanStatusMessage}
            </p>
          )}
        </div>
      </div>

      {showDiag && <TransportDiagnosticsStrip infoHash={task.infoHash} isAr={isAr} />}
      {metrics.needsFallback && (
        <ExternalHandoffPanel infoHash={task.infoHash} release={task.release} isAr={isAr} />
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap pt-3 border-t border-white/10">
        <div className="flex items-center gap-2 flex-wrap">
          {metrics.isRunning && (
            <button
              type="button"
              onClick={() => onPause(task.infoHash)}
              className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-300/40 text-xs font-extrabold text-amber-100 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Pause size={13} />
              <span>{isAr ? 'إيقاف مؤقت' : 'Pause'}</span>
            </button>
          )}
          {metrics.isPaused && (
            <button
              type="button"
              onClick={() => onResume(task.infoHash)}
              className="px-4 py-2 rounded-xl bg-sky-500/30 hover:bg-sky-500/40 border border-sky-300/50 text-xs font-black text-white flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Play size={13} />
              <span>{isAr ? 'استئناف التحميل' : 'Resume'}</span>
            </button>
          )}
          {metrics.isCompleted && !task.cacheCleared && (
            <>
              <button
                type="button"
                onClick={() => onSaveToDevice(task.infoHash)}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-black text-slate-950 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <FolderDown size={14} />
                <span>{isAr ? 'حفظ الملف على الجهاز' : 'Save to device'}</span>
              </button>
              <button
                type="button"
                onClick={() => onCleanCache(task.infoHash)}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <CheckCircle2 size={13} />
                <span>{isAr ? 'تفريغ الكاش' : 'Clean cache'}</span>
              </button>
            </>
          )}
        </div>

        <div className="cd-delete-wrapper">
          <button
            type="button"
            className="button"
            onClick={() => onRemove(task.infoHash)}
            aria-label={isAr ? 'حذف' : 'Delete'}
          >
            <svg viewBox="0 0 448 512" className="svgIcon">
              <path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z" />
            </svg>
          </button>
        </div>
      </div>
    </article>
  );
});
