import React from 'react';
import {
  Activity,
  CheckCircle2,
  Eye,
  EyeOff,
  FolderDown,
  Pause,
  Play,
  Trash2,
  Tv,
} from 'lucide-react';
import { useOptionalStreamPlayer } from '../hooks/useOptionalStreamPlayer';
import type { DownloadTaskState } from '../types';

interface DownloadTaskCardProps {
  task: DownloadTaskState;
  isAr: boolean;
  metrics: {
    isRunning: boolean;
    isPaused: boolean;
    isCompleted: boolean;
    downloadedFormatted: string;
    totalFormatted: string;
    speedFormatted: string | null;
    etaFormatted: string;
    storageBadgeLabel: string;
  };
  onPause: (infoHash: string) => void;
  onResume: (infoHash: string) => void;
  onSaveToDevice: (infoHash: string) => void;
  onCleanCache: (infoHash: string) => void;
  onRemove: (infoHash: string) => void;
}

export const DownloadTaskCard: React.FC<DownloadTaskCardProps> = ({
  task,
  isAr,
  metrics,
  onPause,
  onResume,
  onSaveToDevice,
  onCleanCache,
  onRemove,
}) => {
  const {
    toggleStreamPlayer,
    togglePieceMap,
    openInMainCinema,
    seekToRatio,
    handleVideoSeeking,
    handleVideoTimeUpdate,
  } = useOptionalStreamPlayer(task.infoHash, task.totalPieces);

  const isPlayerOpen = Boolean(task.isStreamingActive);
  const buckets = task.pieceMapBuckets || [];

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.05] border border-white/15 flex flex-col gap-3.5 shadow-lg">
      <div className="flex items-start gap-3.5">
        <img
          src={task.media.posterUrl}
          alt={task.media.title}
          className="w-13 h-18 rounded-xl object-cover border border-white/20 shrink-0 shadow-md"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <h5 className="text-xs sm:text-sm font-black text-white truncate">
                {task.media.title}
                {task.media.mediaType === 'tv' && (
                  <span className="ms-1.5 text-sky-300 tabular-nums">
                    S{String(task.media.season || 1).padStart(2, '0')}E
                    {String(task.media.episode || 1).padStart(2, '0')}
                  </span>
                )}
              </h5>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-sky-500/20 text-sky-200 border border-sky-300/35 shrink-0">
                {task.release.quality}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/8 text-white/75 border border-white/15 shrink-0">
                {metrics.storageBadgeLabel}
              </span>
            </div>
            <span className="text-sm sm:text-base font-black text-emerald-300 tabular-nums shrink-0">
              {task.progressPct.toFixed(1)}%
            </span>
          </div>

          <div className="w-full h-2.5 rounded-full bg-black/50 border border-white/12 overflow-hidden mt-2">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                metrics.isCompleted
                  ? 'bg-emerald-400'
                  : metrics.isPaused
                    ? 'bg-amber-400'
                    : 'bg-gradient-to-r from-sky-400 to-emerald-400'
              }`}
              style={{
                width: `${Math.max(1.5, task.progressPct)}%`,
              }}
            />
          </div>

          <div className="flex items-center justify-between gap-2 text-[11px] text-white/75 mt-2 flex-wrap tabular-nums">
            <span>
              <strong className="text-white">
                {metrics.downloadedFormatted}
              </strong>{' '}
              / {metrics.totalFormatted}
              {' · '}
              {task.completedPieces}/{task.totalPieces}{' '}
              {isAr ? 'قطعة SHA-1' : 'Pieces'}
            </span>

            <div className="flex items-center gap-2">
              {metrics.speedFormatted && (
                <span className="text-emerald-300 font-black">
                  ⬇ {metrics.speedFormatted}
                </span>
              )}
              {metrics.etaFormatted && (
                <span className="text-sky-200 font-semibold">
                  {isAr
                    ? `المتبقي: ${metrics.etaFormatted}`
                    : `ETA: ${metrics.etaFormatted}`}
                </span>
              )}
            </div>
          </div>

          <p className="text-[11px] text-white/85 mt-1 font-semibold">
            {task.statusMessage}
          </p>
        </div>
      </div>

      {/* Optional Collapsible Piece Map */}
      {task.showPieceMap && buckets.length > 0 && (
        <div className="p-3 rounded-xl bg-black/35 border border-white/10 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[10px] text-white/70 tabular-nums">
            <span>
              {isAr
                ? 'خريطة القطع التفاعلية (اضغط على أي موضع لتوجيه أولوية التحميل):'
                : 'Interactive Piece Map (Click any point to prioritize):'}
            </span>
            {typeof task.activeDownloadingPieceIndex === 'number' &&
              metrics.isRunning && (
                <span className="text-sky-300 font-bold">
                  {isAr
                    ? `القطعة النشطة: #${task.activeDownloadingPieceIndex + 1}`
                    : `Active Piece: #${task.activeDownloadingPieceIndex + 1}`}
                </span>
              )}
          </div>
          <div
            className="grid gap-0.5 h-3 w-full rounded-lg bg-black/50 p-0.5 border border-white/10"
            style={{
              gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))`,
            }}
          >
            {buckets.map((kind, bIdx) => (
              <button
                key={bIdx}
                type="button"
                onClick={() => seekToRatio(bIdx / buckets.length)}
                className={`h-full rounded-[2px] cursor-pointer transition-opacity hover:opacity-100 ${
                  kind === 'verified'
                    ? 'bg-emerald-400'
                    : kind === 'header-tail'
                      ? 'bg-amber-400'
                      : kind === 'playhead-window'
                        ? 'bg-sky-400'
                        : 'bg-white/12 hover:bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Strictly Opt-In Video Stream Player */}
      {isPlayerOpen && task.streamUrl && (
        <div className="rounded-2xl overflow-hidden bg-black border border-white/20 flex flex-col">
          <div className="px-3.5 py-2 bg-white/[0.06] border-b border-white/12 flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[11px] font-extrabold text-sky-200 flex items-center gap-1.5">
              <Eye size={13} className="text-sky-300" />
              {isAr
                ? 'المشاهدة الاختيارية أثناء التحميل نشطة'
                : 'Optional Watch-While-Downloading Player'}
            </span>
            <button
              type="button"
              onClick={openInMainCinema}
              className="px-3 py-1 rounded-lg bg-sky-500/30 hover:bg-sky-500/45 border border-sky-300/50 text-[11px] font-black text-white flex items-center gap-1.5 cursor-pointer"
            >
              <Tv size={12} />
              <span>
                {isAr
                  ? 'فتح في مشغل السينما الرئيسي'
                  : 'Open in Main Cinema Player'}
              </span>
            </button>
          </div>
          <video
            key={task.streamUrl}
            src={task.streamUrl}
            controls
            playsInline
            className="w-full aspect-video bg-black object-contain"
            onSeeking={handleVideoSeeking}
            onTimeUpdate={(e) =>
              handleVideoTimeUpdate(e, task.playheadPieceIndex || 0)
            }
          />
        </div>
      )}

      {/* Action Controls */}
      <div className="flex items-center justify-between gap-2 flex-wrap pt-2.5 border-t border-white/10">
        <div className="flex items-center gap-2 flex-wrap">
          {metrics.isRunning && (
            <button
              type="button"
              onClick={() => onPause(task.infoHash)}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500/25 hover:bg-amber-500/35 border border-amber-300/45 text-xs font-extrabold text-amber-100 flex items-center gap-1.5 cursor-pointer"
            >
              <Pause size={13} />
              <span>{isAr ? 'إيقاف مؤقت' : 'Pause'}</span>
            </button>
          )}

          {metrics.isPaused && (
            <button
              type="button"
              onClick={() => onResume(task.infoHash)}
              className="px-4 py-1.5 rounded-xl bg-sky-500/35 hover:bg-sky-500/50 border border-sky-300/55 text-xs font-black text-white flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Play size={13} />
              <span>{isAr ? 'استئناف التحميل' : 'Resume Download'}</span>
            </button>
          )}

          {metrics.isCompleted && !task.cacheCleared && (
            <>
              <button
                type="button"
                onClick={() => onSaveToDevice(task.infoHash)}
                className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-black text-slate-950 flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <FolderDown size={14} />
                <span>
                  {isAr ? 'حفظ الملف على الجهاز' : 'Save File to Device'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onCleanCache(task.infoHash)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white/90 flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 size={13} />
                <span>
                  {isAr ? 'تفريغ الكاش القرصي' : 'Clean Disk Cache'}
                </span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={toggleStreamPlayer}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              isPlayerOpen
                ? 'bg-sky-500/30 border-sky-300/50 text-sky-100'
                : 'bg-white/8 hover:bg-white/15 border-white/15 text-white/80'
            }`}
          >
            {isPlayerOpen ? <EyeOff size={13} /> : <Eye size={13} />}
            <span>
              {isPlayerOpen
                ? isAr
                  ? 'إغلاق المشغل التجريبي'
                  : 'Close Stream Player'
                : isAr
                  ? 'مشاهدة أثناء التحميل (اختياري)'
                  : 'Watch Stream (Optional)'}
            </span>
          </button>

          <button
            type="button"
            onClick={togglePieceMap}
            className="px-2.5 py-1.5 rounded-xl bg-white/6 hover:bg-white/12 border border-white/12 text-[11px] font-bold text-white/75 flex items-center gap-1 cursor-pointer"
          >
            <Activity size={12} />
            <span>
              {task.showPieceMap
                ? isAr
                  ? 'إخفاء الخريطة'
                  : 'Hide Map'
                : isAr
                  ? 'خريطة القطع'
                  : 'Piece Map'}
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => onRemove(task.infoHash)}
          className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 border border-rose-300/40 text-xs font-bold text-rose-200 flex items-center gap-1 cursor-pointer"
        >
          <Trash2 size={13} />
          <span>{isAr ? 'حذف وتنظيف' : 'Remove & Clean'}</span>
        </button>
      </div>
    </div>
  );
};
