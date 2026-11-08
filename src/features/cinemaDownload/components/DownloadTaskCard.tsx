import React, { memo } from 'react';
import { Activity, CheckCircle2, Eye, EyeOff, FolderDown, Pause, Play, Trash2, Tv } from 'lucide-react';
import { useOptionalStreamPlayer } from '../hooks/useOptionalStreamPlayer';
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

const OptionalStreamSection: React.FC<{ infoHash: string; isAr: boolean; isRunning: boolean }> = ({ infoHash, isAr, isRunning }) => {
  const p = useOptionalStreamPlayer(infoHash);
  const buckets = p.pieceMapBuckets ?? [];
  return (
    <>
      {p.showPieceMap && buckets.length > 0 && (
        <div className="p-3 rounded-xl bg-black/35 border border-white/10 flex flex-col gap-1.5">
          <div className="flex justify-between text-[10px] text-white/70 tabular-nums">
            <span>{isAr ? 'خريطة القطع (اضغط لتوجيه الأولوية)' : 'Piece map (click to prioritize)'}</span>
            {isRunning && typeof p.activeDownloadingPieceIndex === 'number' && (
              <span className="text-sky-300 font-bold">#{p.activeDownloadingPieceIndex + 1}</span>
            )}
          </div>
          <div className="grid gap-0.5 h-3 rounded-lg bg-black/50 p-0.5" style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(0,1fr))` }}>
            {buckets.map((k, i) => (
              <button key={i} type="button" aria-label={`${Math.round((i / buckets.length) * 100)}%`}
                onClick={() => p.seekToRatio(i / buckets.length)}
                className={`rounded-[2px] cursor-pointer ${k === 'verified' ? 'bg-emerald-400' : k === 'header-tail' ? 'bg-amber-400' : k === 'playhead-window' ? 'bg-sky-400' : 'bg-white/12 hover:bg-white/30'}`} />
            ))}
          </div>
        </div>
      )}

      {p.isStreamingActive && (
        <div className="rounded-2xl overflow-hidden bg-black border border-white/20">
          <div className="px-3.5 py-2 bg-white/[0.06] flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold text-sky-200 flex items-center gap-1.5">
              <Eye size={13} />{isAr ? 'المشاهدة أثناء التحميل (اختياري)' : 'Optional watch-while-downloading'}
            </span>
            <button type="button" onClick={p.openInMainCinema}
              className="px-3 py-1 rounded-lg bg-sky-500/30 border border-sky-300/50 text-[11px] font-black flex items-center gap-1.5 cursor-pointer">
              <Tv size={12} />{isAr ? 'المشغل الرئيسي' : 'Main player'}
            </button>
          </div>
          {p.canPlay ? (
            <video key={p.streamUrl} src={p.streamUrl} controls playsInline preload="metadata"
              className="w-full aspect-video bg-black object-contain" onSeeking={p.onSeeking} onTimeUpdate={p.onTimeUpdate} />
          ) : (
            <div className="aspect-video flex items-center justify-center text-xs text-white/60 px-4 text-center">
              {isAr ? 'بانتظار تحميل رأس وذيل الملف (moov/Cues) قبل التشغيل...' : 'Waiting for file header & tail before playback...'}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={p.toggleStreamPlayer}
          className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${p.isStreamingActive ? 'bg-sky-500/30 border-sky-300/50 text-sky-100' : 'bg-white/8 hover:bg-white/15 border-white/15 text-white/80'}`}>
          {p.isStreamingActive ? <EyeOff size={13} /> : <Eye size={13} />}
          {p.isStreamingActive ? (isAr ? 'إغلاق المشغل' : 'Close player') : (isAr ? 'مشاهدة أثناء التحميل (اختياري)' : 'Watch while downloading (optional)')}
        </button>
        <button type="button" onClick={p.togglePieceMap}
          className="px-2.5 py-1.5 rounded-xl bg-white/6 hover:bg-white/12 border border-white/12 text-[11px] font-bold text-white/75 flex items-center gap-1 cursor-pointer">
          <Activity size={12} />{p.showPieceMap ? (isAr ? 'إخفاء الخريطة' : 'Hide map') : (isAr ? 'خريطة القطع' : 'Piece map')}
        </button>
      </div>
    </>
  );
};

export const DownloadTaskCard = memo<Props>(function DownloadTaskCard({ task, metrics, isAr, onPause, onResume, onSaveToDevice, onCleanCache, onRemove }) {
  const showDiag = task.status === 'initializing' || task.status === 'downloading' || metrics.needsFallback;
  return (
    <article className="p-4 sm:p-5 rounded-2xl bg-white/[0.05] border border-white/15 flex flex-col gap-3.5 shadow-lg">
      <div className="flex items-start gap-3.5">
        <img src={task.media.posterUrl} alt="" className="w-13 h-18 rounded-xl object-cover border border-white/20 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h5 className="text-xs sm:text-sm font-black truncate">
              {task.media.title}
              {task.media.mediaType === 'tv' && (
                <span className="ms-1.5 text-sky-300 tabular-nums">
                  S{String(task.media.season || 1).padStart(2, '0')}E{String(task.media.episode || 1).padStart(2, '0')}
                </span>
              )}
              <span className="ms-2 px-2 py-0.5 rounded-md text-[10px] bg-sky-500/20 text-sky-200 border border-sky-300/35">{task.release.quality}</span>
            </h5>
            <span className="text-sm sm:text-base font-black text-emerald-300 tabular-nums">{task.progressPct.toFixed(1)}%</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-black/50 overflow-hidden mt-2"
            role="progressbar" aria-valuenow={task.progressPct} aria-valuemin={0} aria-valuemax={100}>
            <div className={`h-full rounded-full transition-[width] duration-500 ${metrics.isCompleted ? 'bg-emerald-400' : metrics.isPaused ? 'bg-amber-400' : 'bg-gradient-to-r from-sky-400 to-emerald-400'}`}
              style={{ width: `${Math.max(1.5, task.progressPct)}%` }} />
          </div>
          <div className="flex items-center justify-between gap-2 text-[11px] text-white/75 mt-2 flex-wrap tabular-nums">
            <span><strong className="text-white">{metrics.downloadedFormatted}</strong> / {metrics.totalFormatted} · {task.completedPieces}/{task.totalPieces}</span>
            <span className="flex gap-2">
              {metrics.speedFormatted && <span className="text-emerald-300 font-black">⬇ {metrics.speedFormatted}</span>}
              {metrics.etaFormatted && <span className="text-sky-200">{isAr ? `المتبقي: ${metrics.etaFormatted}` : `ETA ${metrics.etaFormatted}`}</span>}
            </span>
          </div>
          <p className="text-[11px] text-white/85 mt-1 font-semibold">{task.statusMessage}</p>
        </div>
      </div>

      {showDiag && <TransportDiagnosticsStrip infoHash={task.infoHash} isAr={isAr} />}
      {metrics.needsFallback && <ExternalHandoffPanel infoHash={task.infoHash} release={task.release} isAr={isAr} />}
      {!metrics.needsFallback && !task.cacheCleared && (
        <OptionalStreamSection infoHash={task.infoHash} isAr={isAr} isRunning={metrics.isRunning} />
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap pt-2.5 border-t border-white/10">
        <div className="flex gap-2 flex-wrap">
          {metrics.isRunning && (
            <button type="button" onClick={() => onPause(task.infoHash)}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500/25 border border-amber-300/45 text-xs font-extrabold text-amber-100 flex items-center gap-1.5 cursor-pointer">
              <Pause size={13} />{isAr ? 'إيقاف مؤقت' : 'Pause'}
            </button>
          )}
          {metrics.isPaused && (
            <button type="button" onClick={() => onResume(task.infoHash)}
              className="px-4 py-1.5 rounded-xl bg-sky-500/35 border border-sky-300/55 text-xs font-black flex items-center gap-1.5 cursor-pointer">
              <Play size={13} />{isAr ? 'استئناف (إعادة فحص المسارات)' : 'Resume (re-probe)'}
            </button>
          )}
          {metrics.isCompleted && !task.cacheCleared && (
            <>
              <button type="button" onClick={() => onSaveToDevice(task.infoHash)}
                className="px-4 py-1.5 rounded-xl bg-emerald-500 text-xs font-black text-slate-950 flex items-center gap-1.5 cursor-pointer">
                <FolderDown size={14} />{isAr ? 'حفظ الملف على الجهاز' : 'Save to device'}
              </button>
              <button type="button" onClick={() => onCleanCache(task.infoHash)}
                className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                <CheckCircle2 size={13} />{isAr ? 'تفريغ الكاش' : 'Clean cache'}
              </button>
            </>
          )}
        </div>
        <button type="button" onClick={() => onRemove(task.infoHash)}
          className="px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-300/40 text-xs font-bold text-rose-200 flex items-center gap-1 cursor-pointer">
          <Trash2 size={13} />{isAr ? 'حذف وتنظيف' : 'Remove'}
        </button>
      </div>
    </article>
  );
});
