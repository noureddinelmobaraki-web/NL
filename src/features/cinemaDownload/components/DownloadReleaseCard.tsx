import { memo } from 'react';
import { Check, Copy, Download, FileDown, Loader2, ShieldCheck } from 'lucide-react';
import type { DiscoveredReleaseOption, DownloadTaskState } from '../types';

interface Props {
  release: DiscoveredReleaseOption;
  existingTask?: DownloadTaskState;
  isCopied: boolean;
  exportState?: 'saving' | 'saved' | 'magnet-only';
  isAr: boolean;
  onCopyMagnet: (r: DiscoveredReleaseOption) => void;
  onExportTorrent: (r: DiscoveredReleaseOption) => void;
  onDownload: (r: DiscoveredReleaseOption) => void;
}

export const DownloadReleaseCard = memo<Props>(function DownloadReleaseCard({
  release: r, existingTask: t, isCopied, exportState, isAr, onCopyMagnet, onExportTorrent, onDownload,
}) {
  const active = t && ['downloading', 'initializing', 'exporting'].includes(t.status);
  const pct = t?.progressPct.toFixed(1);
  const label = active ? (isAr ? `جاري التحميل (${pct}%)` : `Downloading (${pct}%)`)
    : t?.status === 'paused' ? (isAr ? `استئناف (${pct}%)` : `Resume (${pct}%)`)
    : t?.status === 'completed' ? (isAr ? 'عرض المكتمل' : 'View completed')
    : (isAr ? 'تحميل الآن' : 'Download now');
  const isTorrent = r.sourceKind === 'torrent-hybrid';
  const seedTone = r.seeders >= 20 ? 'text-emerald-300' : r.seeders > 0 ? 'text-amber-300' : 'text-rose-300';

  return (
    <div className="p-4 rounded-2xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/14 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
      <div className="flex flex-col gap-1.5 min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-black px-2.5 py-0.5 rounded-lg ${r.quality === '2160p' ? 'bg-amber-400/20 text-amber-200' : r.quality === '1080p' ? 'bg-sky-400/20 text-sky-200' : 'bg-emerald-400/20 text-emerald-200'}`}>
            {r.quality === '2160p' ? '4K · 2160p' : r.quality}
          </span>
          <span className="text-xs sm:text-sm font-extrabold truncate" dir="ltr">{r.cleanFileName}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-white/75 flex-wrap tabular-nums">
          <span className="font-black text-sky-200">{r.sizeFormatted}</span>·<span>{r.videoCodec}</span>·
          <span>{r.audioCodec} {r.audioChannels}</span>
          {r.hdrBadges.length > 0 && <>·<span className="text-amber-300">{r.hdrBadges.join(' / ')}</span></>}
          {isTorrent && <>·<span className={`font-bold ${seedTone}`}>{r.seeders} Seeders</span></>}
          ·<span className="text-white/55">{r.sourceLabel}</span>
        </div>
        {isTorrent && r.seeders > 0 && !(r.webSeeds?.length) && (
          <p className="text-[10.5px] text-white/55">
            {isAr ? 'ملاحظة: البذور قد تكون غير قابلة للوصول من المتصفح — يتوفر دائماً خيار التطبيق الخارجي.' : 'Seeders may be unreachable from the browser — external app handoff is always available.'}
          </p>
        )}
        <div className="flex items-center gap-1.5 text-[10.5px] text-emerald-300/90">
          <ShieldCheck size={12} />{isAr ? 'تحقق SHA-1 · حفظ قرصي OPFS' : 'SHA-1 verified · OPFS disk storage'}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        {isTorrent && (
          <>
            <button type="button" onClick={() => onCopyMagnet(r)}
              className="px-2.5 py-2 rounded-xl bg-white/8 hover:bg-white/15 border border-white/15 text-xs font-bold flex items-center gap-1 cursor-pointer">
              {isCopied ? <><Check size={13} className="text-emerald-300" />{isAr ? 'نُسخ' : 'Copied'}</> : <><Copy size={13} />Magnet</>}
            </button>
            <button type="button" onClick={() => onExportTorrent(r)} disabled={exportState === 'saving'}
              title={exportState === 'magnet-only' ? (isAr ? 'لا يوجد .torrent — نُسخ Magnet' : 'No .torrent — Magnet copied') : undefined}
              className="px-2.5 py-2 rounded-xl bg-white/8 hover:bg-white/15 border border-white/15 text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50">
              {exportState === 'saving' ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
              {exportState === 'saved' ? '✓ .torrent' : '.torrent'}
            </button>
          </>
        )}
        <button type="button" onClick={() => onDownload(r)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 text-xs font-black text-slate-950 flex items-center gap-1.5 cursor-pointer shadow-lg">
          <Download size={14} strokeWidth={2.6} />{label}
        </button>
      </div>
    </div>
  );
});
