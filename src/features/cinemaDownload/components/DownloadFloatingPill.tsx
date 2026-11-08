import React from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Download, Pause, Play } from 'lucide-react';
import { formatSpeedMBps } from '../hooks/useCinemaDownloadTasks';
import type { DownloadTaskState } from '../types';

interface Props {
  visible: boolean; task: DownloadTaskState | null; isAr: boolean;
  onOpenModal: () => void; onPause: (h: string) => void; onResume: (h: string) => void;
}

export const DownloadFloatingPill: React.FC<Props> = ({ visible, task, isAr, onOpenModal, onPause, onResume }) => {
  const fallback = task?.diagnostics?.stage === 'fallback-needed';
  const sub = !task ? '' : fallback ? (isAr ? 'يحتاج تطبيقاً خارجياً' : 'Needs external app')
    : task.status === 'completed' ? (isAr ? 'اكتمل 100%' : 'Complete')
    : task.status === 'paused' ? (isAr ? 'متوقف مؤقتاً' : 'Paused')
    : task.status === 'initializing' ? (isAr ? 'فحص المسارات...' : 'Probing...')
    : task.speedBytesPerSec > 0 ? formatSpeedMBps(task.speedBytesPerSec) : `${task.completedPieces}/${task.totalPieces}`;

  return (
    <AnimatePresence>
      {visible && task && (
        <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
          dir={isAr ? 'rtl' : 'ltr'}
          className="fixed bottom-4 end-4 z-[10250] max-w-[360px] w-[calc(100vw-2rem)] rounded-2xl p-3 text-white shadow-2xl border border-white/25 bg-slate-900/90 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <img src={task.media.posterUrl} alt="" className="w-10 h-14 rounded-lg object-cover" />
            <button type="button" onClick={onOpenModal} className="flex-1 min-w-0 text-start cursor-pointer">
              <div className="flex justify-between gap-1.5">
                <span className="text-xs font-extrabold truncate">{task.media.title}</span>
                <span className="text-[11px] font-black text-sky-300 tabular-nums">{task.progressPct.toFixed(1)}%</span>
              </div>
              <span className={`text-[10px] flex items-center gap-1 mt-0.5 tabular-nums ${fallback ? 'text-rose-300' : 'text-white/70'}`}>
                {fallback && <AlertTriangle size={10} />}{task.release.quality} · {sub}
              </span>
              <div className="w-full h-1.5 rounded-full bg-white/15 overflow-hidden mt-1.5">
                <div className={`h-full ${task.status === 'completed' ? 'bg-emerald-400' : fallback || task.status === 'paused' ? 'bg-amber-400' : 'bg-sky-400'}`}
                  style={{ width: `${Math.max(2, task.progressPct)}%` }} />
              </div>
            </button>
            {task.status === 'downloading' && (
              <button type="button" onClick={() => onPause(task.infoHash)} aria-label={isAr ? 'إيقاف مؤقت' : 'Pause'}
                className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center cursor-pointer"><Pause size={13} /></button>
            )}
            {task.status === 'paused' && !fallback && (
              <button type="button" onClick={() => onResume(task.infoHash)} aria-label={isAr ? 'استئناف' : 'Resume'}
                className="w-8 h-8 rounded-full bg-sky-500/30 border border-sky-300/40 flex items-center justify-center cursor-pointer"><Play size={13} /></button>
            )}
            <button type="button" onClick={onOpenModal} aria-label={isAr ? 'فتح نافذة التحميل' : 'Open downloads'}
              className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center cursor-pointer"><Download size={13} /></button>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
};
