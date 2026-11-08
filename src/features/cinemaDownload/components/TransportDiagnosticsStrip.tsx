import React from 'react';
import { CheckCircle2, Loader2, RefreshCw, XCircle, MinusCircle, Users } from 'lucide-react';
import { useSwarmTransportDiagnostics } from '../hooks/useSwarmTransportDiagnostics';

const toneCls = {
  emerald: 'border-emerald-300/30 bg-emerald-500/10',
  amber: 'border-amber-300/30 bg-amber-500/10',
  rose: 'border-rose-300/35 bg-rose-500/10',
};

export const TransportDiagnosticsStrip: React.FC<{ infoHash: string; isAr: boolean }> = ({ infoHash, isAr }) => {
  const { diagnostics: d, view, retryInSec, retryNow } = useSwarmTransportDiagnostics(infoHash, isAr);
  if (!d || !view) return null;

  return (
    <div className={`rounded-xl border p-2.5 flex flex-col gap-2 ${toneCls[view.tone]}`} aria-live="polite">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="font-extrabold text-white">{view.headline}</span>
        <span className="flex items-center gap-2 text-white/70 tabular-nums">
          <Users size={12} />
          {d.edgeTcpPeers > 0 && <span className="text-emerald-300 font-bold">TCP {d.edgeTcpPeers} ·</span>}
          <span>WebRTC {d.webrtcPeers}</span>
          {d.bridgePeers > 0 && <span>· Bridge {d.bridgePeers}</span>}
          {d.httpSources > 0 && <span>· HTTP {d.httpSources}</span>}
        </span>
      </div>

      <ol className="flex items-center gap-1 flex-wrap">
        {view.steps.map((s, i) => (
          <li key={s.stage} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => retryNow(s.stage)}
              title={isAr ? 'إعادة الفحص بدءاً من هذا المسار' : 'Re-probe starting here'}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 border cursor-pointer ${
                s.isActive ? 'bg-emerald-500/25 border-emerald-300/50 text-emerald-100' : 'bg-white/6 border-white/12 text-white/75'
              }`}
            >
              {s.outcome === 'probing' && <Loader2 size={10} className="animate-spin" />}
              {s.outcome === 'ok' && <CheckCircle2 size={10} className="text-emerald-300" />}
              {s.outcome === 'failed' && <XCircle size={10} className="text-rose-300" />}
              {s.outcome === 'pending' && <MinusCircle size={10} className="text-white/40" />}
              {s.label}
            </button>
            {i < view.steps.length - 1 && <span className="text-white/30 text-[10px]">{isAr ? '←' : '→'}</span>}
          </li>
        ))}
      </ol>

      {(retryInSec !== null || d.lastError) && (
        <div className="flex items-center justify-between gap-2 text-[10.5px] text-white/70">
          <span className="truncate" dir="ltr">{d.lastError}</span>
          {retryInSec !== null && (
            <span className="shrink-0 flex items-center gap-1 tabular-nums text-amber-200">
              <RefreshCw size={10} />
              {isAr ? `إعادة المحاولة خلال ${retryInSec} ث` : `Retry in ${retryInSec}s`}
              {d.attemptInStage > 0 && ` (${d.attemptInStage}/${d.maxAttemptsInStage})`}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
