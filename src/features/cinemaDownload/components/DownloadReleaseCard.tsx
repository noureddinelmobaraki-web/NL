import React from 'react';
import { Check, Copy, Download, ShieldCheck } from 'lucide-react';
import type { DiscoveredReleaseOption, DownloadTaskState } from '../types';

interface DownloadReleaseCardProps {
  release: DiscoveredReleaseOption;
  existingTask?: DownloadTaskState;
  isCopied: boolean;
  isAr: boolean;
  onCopyMagnet: (rel: DiscoveredReleaseOption) => void;
  onDownloadOnly: (rel: DiscoveredReleaseOption) => void;
}

export const DownloadReleaseCard: React.FC<DownloadReleaseCardProps> = ({
  release,
  existingTask,
  isCopied,
  isAr,
  onCopyMagnet,
  onDownloadOnly,
}) => {
  const isThisActive =
    existingTask &&
    (existingTask.status === 'downloading' ||
      existingTask.status === 'initializing' ||
      existingTask.status === 'exporting');

  return (
    <div className="p-4 rounded-2xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/14 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
      <div className="flex flex-col gap-1.5 min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-xs font-black px-2.5 py-0.5 rounded-lg tabular-nums ${
              release.quality === '2160p'
                ? 'bg-amber-400/20 text-amber-200 border border-amber-300/40'
                : release.quality === '1080p'
                  ? 'bg-sky-400/20 text-sky-200 border border-sky-300/40'
                  : 'bg-emerald-400/20 text-emerald-200 border border-emerald-300/40'
            }`}
          >
            {release.quality === '2160p' ? '4K · 2160p' : release.quality}
          </span>
          <span className="text-xs sm:text-sm font-extrabold text-white truncate">
            {release.cleanFileName}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-white/75 flex-wrap tabular-nums">
          <span className="font-black text-sky-200">
            {release.sizeFormatted}
          </span>
          <span aria-hidden="true">·</span>
          <span>{release.videoCodec}</span>
          <span aria-hidden="true">·</span>
          <span>
            {release.audioCodec} {release.audioChannels}
          </span>
          {release.hdrBadges.length > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-amber-300 font-semibold">
                {release.hdrBadges.join(' / ')}
              </span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <span className="text-emerald-300 font-bold">
            {release.seeders} Seeders
          </span>
          <span aria-hidden="true">·</span>
          <span className="text-white/55">{release.sourceLabel}</span>
        </div>

        <div className="flex items-center gap-1.5 text-[10.5px] text-emerald-300/90">
          <ShieldCheck size={12} className="shrink-0" />
          <span>
            {isAr
              ? 'مفحوص أمنياً · حفظ قرصي مباشر بدون استهلاك الرام (TPPIECES OPFS)'
              : 'Verified Safe · Zero-RAM Direct Disk Caching (TPPIECES OPFS)'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        <button
          type="button"
          onClick={() => onCopyMagnet(release)}
          title={isAr ? 'نسخ رابط Magnet' : 'Copy Magnet URI'}
          className="px-2.5 py-2 rounded-xl bg-white/8 hover:bg-white/15 border border-white/15 text-xs font-bold text-white/80 flex items-center gap-1 cursor-pointer whitespace-nowrap"
        >
          {isCopied ? (
            <>
              <Check size={13} className="text-emerald-300" />
              <span>{isAr ? 'نُسخ' : 'Copied'}</span>
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
          onClick={() => onDownloadOnly(release)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-400 hover:to-emerald-400 text-xs font-black text-slate-950 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-lg"
        >
          <Download size={14} strokeWidth={2.6} />
          <span>
            {isThisActive
              ? isAr
                ? `جاري التحميل (${existingTask.progressPct.toFixed(1)}%)`
                : `Downloading (${existingTask.progressPct.toFixed(1)}%)`
              : existingTask?.status === 'paused'
                ? isAr
                  ? `استئناف التحميل (${existingTask.progressPct.toFixed(1)}%)`
                  : `Resume (${existingTask.progressPct.toFixed(1)}%)`
                : existingTask?.status === 'completed'
                  ? isAr
                    ? 'حفظ المكتمل'
                    : 'View Completed'
                  : isAr
                    ? 'تحميل الآن'
                    : 'Download Now'}
          </span>
        </button>
      </div>
    </div>
  );
};
