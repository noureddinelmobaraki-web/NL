import { memo } from 'react';
import { Check, Copy, FileDown, Loader2 } from 'lucide-react';
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
  release: r,
  existingTask: t,
  isCopied,
  exportState,
  isAr,
  onCopyMagnet,
  onExportTorrent,
  onDownload,
}) {
  const active = t && ['downloading', 'initializing', 'exporting'].includes(t.status);
  const pct = t?.progressPct.toFixed(0);
  const label = active
    ? `${pct}%`
    : t?.status === 'paused'
      ? (isAr ? `استئناف ${pct}%` : `Resume ${pct}%`)
      : t?.status === 'completed'
        ? (isAr ? 'مكتمل' : 'Completed')
        : 'Download';

  const isTorrent = r.sourceKind === 'torrent-hybrid';
  const seedTone =
    r.seeders >= 20 ? 'text-emerald-300' : r.seeders > 0 ? 'text-amber-300' : 'text-rose-300';

  const bitDepthLabel =
    r.hdrBadges && r.hdrBadges.length > 0
      ? r.hdrBadges.join(' / ')
      : r.parsedMeta?.colorDepth && r.parsedMeta.colorDepth.length > 0
        ? r.parsedMeta.colorDepth.join(' / ')
        : '10-bit';

  const audioLabel = `${r.audioCodec || 'AAC'} ${r.audioChannels || '5.1'}`.trim();

  return (
    <div className="p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] transition-colors border border-white/12 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex flex-col gap-2 min-w-0 flex-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span
            className={`text-xs font-black px-2.5 py-0.5 rounded-lg tracking-wide tabular-nums ${
              r.quality === '2160p'
                ? 'bg-amber-400/20 text-amber-200 border border-amber-300/30'
                : r.quality === '1080p'
                  ? 'bg-sky-400/20 text-sky-200 border border-sky-300/30'
                  : 'bg-emerald-400/20 text-emerald-200 border border-emerald-300/30'
            }`}
          >
            {r.quality === '2160p' ? '4K · 2160p' : r.quality}
          </span>
          <span className="text-xs sm:text-sm font-extrabold text-white/95 truncate" dir="ltr">
            {r.cleanFileName}
          </span>
        </div>

        <div
          dir="ltr"
          className="flex items-center gap-2 text-xs text-white/80 flex-wrap tabular-nums font-medium"
        >
          <span className="font-extrabold text-sky-300">{r.sizeFormatted}</span>
          <span className="text-white/35">·</span>
          <span className="text-white/90">{r.videoCodec || 'H.265 / HEVC'}</span>
          <span className="text-white/35">·</span>
          <span className="text-white/85">{audioLabel}</span>
          <span className="text-white/35">·</span>
          <span className="text-amber-200/90 font-semibold">{bitDepthLabel}</span>
          {isTorrent && (
            <>
              <span className="text-white/35">·</span>
              <span className={`font-bold ${seedTone}`}>{r.seeders} Seeders</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2.5 shrink-0">
        {isTorrent && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onCopyMagnet(r)}
              title="Magnet"
              className="px-2.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/12 text-[11px] font-bold text-white/80 flex items-center gap-1 cursor-pointer transition-colors"
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
              onClick={() => onExportTorrent(r)}
              disabled={exportState === 'saving'}
              title={
                exportState === 'magnet-only'
                  ? isAr
                    ? 'لا يوجد .torrent — نُسخ Magnet'
                    : 'No .torrent — Magnet copied'
                  : '.torrent'
              }
              className="px-2.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/12 text-[11px] font-bold text-white/80 flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-colors"
            >
              {exportState === 'saving' ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <FileDown size={13} />
              )}
              <span>.torrent</span>
            </button>
          </div>
        )}

        <div className="cd-download-btn-wrapper">
          <button type="button" onClick={() => onDownload(r)} className="botao">
            <svg
              width="24px"
              height="24px"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="mysvg"
            >
              <g id="SVGRepo_bgCarrier" strokeWidth={0} />
              <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" />
              <g id="SVGRepo_iconCarrier">
                <g id="Interface / Download">
                  <path
                    id="Vector"
                    d="M6 21H18M12 3V17M12 17L17 12M12 17L7 12"
                    stroke="#f1f1f1"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              </g>
            </svg>
            <span className="texto">{label}</span>
          </button>
        </div>
      </div>
    </div>
  );
});
