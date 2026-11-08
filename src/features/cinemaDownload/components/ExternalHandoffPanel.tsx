import React, { useState } from 'react';
import { Copy, ExternalLink, FileDown, RefreshCw, Share2, Film } from 'lucide-react';
import { cinemaDownloadManager } from '../downloadManager';
import { copyMagnet, shareMagnet } from '../services/externalHandoff';
import { useSwarmTransportDiagnostics } from '../hooks/useSwarmTransportDiagnostics';
import type { DiscoveredReleaseOption } from '../types';

interface Props { infoHash: string; release: DiscoveredReleaseOption; isAr: boolean }

export const ExternalHandoffPanel: React.FC<Props> = ({ infoHash, release, isAr }) => {
  const { diagnostics, retryInSec, retryNow, acceptGeometryChange } = useSwarmTransportDiagnostics(infoHash, isAr);
  const [note, setNote] = useState<string | null>(null);
  const isTorrent = release.sourceKind === 'torrent-hybrid';

  const onSaveTorrent = async () => {
    const ok = await cinemaDownloadManager.saveTaskTorrentFile(infoHash);
    if (!ok) await copyMagnet(release);
    setNote(ok
      ? (isAr ? 'تم حفظ ملف .torrent — افتحه في qBittorrent أو أي برنامج تحميل.' : '.torrent saved — open it in qBittorrent or any client.')
      : (isAr ? 'لا يتوفر ملف .torrent لهذا الإصدار — نُسخ رابط Magnet بدلاً منه.' : 'No .torrent available — Magnet copied instead.'));
  };

  const btn = 'px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer border';

  return (
    <div role="alert" className="rounded-2xl border border-rose-300/35 bg-gradient-to-br from-rose-500/12 to-amber-500/8 p-3.5 flex flex-col gap-2.5">
      <p className="text-xs font-black text-rose-100">
        {isAr
          ? 'لم يُعثر على نظراء WebRTC أو مصادر HTTP يمكن الوصول إليها من داخل المتصفح.'
          : 'No WebRTC peers or HTTP sources are reachable from inside the browser.'}
      </p>
      <p className="text-[11px] text-white/75 leading-relaxed">
        {isAr
          ? 'المتصفح لا يستطيع فتح اتصالات TCP/UDP التي يستخدمها معظم أعضاء السرب. انقل التحميل لتطبيق تورنت خارجي أو لبوت/برنامج تحميل — أو انتظر إعادة الفحص التلقائية.'
          : 'Browsers cannot open the TCP/UDP connections most swarm members use. Hand off to an external client or bot — or wait for the automatic re-probe.'}
      </p>

      <div className="flex flex-wrap gap-2">
        {isTorrent && (
          <>
            <button type="button" onClick={() => cinemaDownloadManager.openTaskInExternalClient(infoHash)}
              className={`${btn} bg-sky-500 hover:bg-sky-400 border-sky-300 text-slate-950`}>
              <ExternalLink size={13} />{isAr ? 'فتح في تطبيق التورنت الخارجي' : 'Open Magnet in Torrent App'}
            </button>
            <button type="button" onClick={onSaveTorrent}
              className={`${btn} bg-emerald-500/25 hover:bg-emerald-500/40 border-emerald-300/45 text-emerald-100`}>
              <FileDown size={13} />{isAr ? 'حفظ ملف .torrent' : 'Save .torrent File'}
            </button>
            <button type="button" onClick={async () => { await shareMagnet(release); setNote(isAr ? 'جاهز للإرسال لبوت أو برنامج التحميل.' : 'Ready to send to a bot or downloader.'); }}
              className={`${btn} bg-white/8 hover:bg-white/15 border-white/15 text-white/85`}>
              <Share2 size={13} />{isAr ? 'نقل لبوت أو برنامج التحميل' : 'Send to Bot / Downloader'}
            </button>
            <button type="button" onClick={async () => setNote((await copyMagnet(release)) ? (isAr ? 'نُسخ رابط Magnet.' : 'Magnet copied.') : null)}
              className={`${btn} bg-white/8 hover:bg-white/15 border-white/15 text-white/85`}>
              <Copy size={13} />Magnet
            </button>
          </>
        )}
        {diagnostics?.geometrySwitchBlocked && (
          <button type="button" onClick={acceptGeometryChange}
            className={`${btn} bg-amber-500/25 hover:bg-amber-500/40 border-amber-300/45 text-amber-100`}>
            <Film size={13} />{isAr ? 'استخدام البث البديل (يبدأ من الصفر)' : 'Use alternate stream (restarts)'}
          </button>
        )}
        <button type="button" onClick={() => retryNow(null)}
          className={`${btn} bg-white/8 hover:bg-white/15 border-white/15 text-white/85`}>
          <RefreshCw size={13} />
          {isAr ? 'إعادة الفحص الآن' : 'Re-probe now'}
          {retryInSec !== null && <span className="tabular-nums text-white/60">({retryInSec}s)</span>}
        </button>
      </div>
      {note && <p className="text-[11px] text-emerald-200 font-bold">{note}</p>}
    </div>
  );
};
