import React from 'react';
import { RefreshCw, Users } from 'lucide-react';
import { useSwarmTransportDiagnostics } from '../hooks/useSwarmTransportDiagnostics';
import type { CandidateTransportStage, TransportDiagnostics } from '../types';

function resolveShortTransportName(d: TransportDiagnostics): string {
  const isDownloadingStage = d.stage !== 'probing' && d.stage !== 'fallback-needed';
  if (isDownloadingStage && d.edgeTcpPeers > 0 && d.webrtcPeers > 0) {
    return 'HYBRID';
  }

  const stageToShort = (s: CandidateTransportStage | null): string => {
    switch (s) {
      case 'edge-tcp':
        return 'TCP';
      case 'webrtc':
        return 'WebRTC';
      case 'webseed':
        return 'HTTP';
      case 'bridge':
        return 'BRIDGE';
      case 'hls-stream':
        return 'HLS';
      default:
        return 'TCP';
    }
  };

  if (d.stage === 'probing') {
    if (d.edgeTcpPeers > 0) return 'TCP';
    if (d.webrtcPeers > 0) return 'WebRTC';
    return stageToShort(d.probingStage);
  }

  if (d.stage === 'fallback-needed') {
    return 'OFFLINE';
  }

  return stageToShort(d.stage);
}

export const TransportDiagnosticsStrip: React.FC<{ infoHash: string; isAr: boolean }> = ({ infoHash, isAr }) => {
  const { diagnostics: d, view, retryInSec, retryNow } = useSwarmTransportDiagnostics(infoHash, isAr);
  if (!d || !view) return null;

  const chipLabel = resolveShortTransportName(d);
  const totalPeers = d.edgeTcpPeers + d.webrtcPeers + d.bridgePeers + d.httpSources;

  return (
    <div className="cd-chip-wrapper" aria-live="polite">
      <div className="flex items-center justify-between gap-2 px-2 pt-1 text-[11px] text-white/75 tabular-nums">
        <span className="font-bold text-white/80 truncate">{view.headline}</span>
        <div className="flex items-center gap-2 shrink-0" dir="ltr">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-[10.5px]">
            <Users size={11} className="text-sky-300" />
            {d.edgeTcpPeers > 0 && <span className="text-emerald-300 font-bold">TCP {d.edgeTcpPeers}</span>}
            {d.edgeTcpPeers > 0 && d.webrtcPeers > 0 && <span className="text-white/30">·</span>}
            {(d.webrtcPeers > 0 || d.edgeTcpPeers === 0) && (
              <span className={d.webrtcPeers > 0 ? 'text-sky-300 font-bold' : 'text-white/60'}>
                WebRTC {d.webrtcPeers}
              </span>
            )}
            {d.bridgePeers > 0 && (
              <>
                <span className="text-white/30">·</span>
                <span className="text-purple-300 font-bold">Bridge {d.bridgePeers}</span>
              </>
            )}
            {d.httpSources > 0 && (
              <>
                <span className="text-white/30">·</span>
                <span className="text-amber-300 font-bold">HTTP {d.httpSources}</span>
              </>
            )}
            {totalPeers === 0 && d.edgeTcpPeers === 0 && (
              <span className="text-white/45">0</span>
            )}
          </span>
          {retryInSec !== null && (
            <button
              type="button"
              onClick={() => retryNow(null)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-[10px] font-bold text-amber-200 cursor-pointer"
            >
              <RefreshCw size={10} />
              <span>{retryInSec}s</span>
            </button>
          )}
        </div>
      </div>

      <div className="main-container">
        <div className="loader">
          <svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="chipGradient" x1={0} y1={0} x2={0} y2={1}>
                <stop offset="0%" stopColor="#2d2d2d" />
                <stop offset="100%" stopColor="#0f0f0f" />
              </linearGradient>
              <linearGradient id="textGradient" x1={0} y1={0} x2={0} y2={1}>
                <stop offset="0%" stopColor="#eeeeee" />
                <stop offset="100%" stopColor="#888888" />
              </linearGradient>
              <linearGradient id="pinGradient" x1={1} y1={0} x2={0} y2={0}>
                <stop offset="0%" stopColor="#bbbbbb" />
                <stop offset="50%" stopColor="#888888" />
                <stop offset="100%" stopColor="#555555" />
              </linearGradient>
            </defs>
            <g id="traces">
              <path d="M100 100 H200 V210 H326" className="trace-bg" />
              <path d="M100 100 H200 V210 H326" className="trace-flow purple" />
              <path d="M80 180 H180 V230 H326" className="trace-bg" />
              <path d="M80 180 H180 V230 H326" className="trace-flow blue" />
              <path d="M60 260 H150 V250 H326" className="trace-bg" />
              <path d="M60 260 H150 V250 H326" className="trace-flow yellow" />
              <path d="M100 350 H200 V270 H326" className="trace-bg" />
              <path d="M100 350 H200 V270 H326" className="trace-flow green" />
              <path d="M700 90 H560 V210 H474" className="trace-bg" />
              <path d="M700 90 H560 V210 H474" className="trace-flow blue" />
              <path d="M740 160 H580 V230 H474" className="trace-bg" />
              <path d="M740 160 H580 V230 H474" className="trace-flow green" />
              <path d="M720 250 H590 V250 H474" className="trace-bg" />
              <path d="M720 250 H590 V250 H474" className="trace-flow red" />
              <path d="M680 340 H570 V270 H474" className="trace-bg" />
              <path d="M680 340 H570 V270 H474" className="trace-flow yellow" />
            </g>
            <rect
              x={330}
              y={190}
              width={140}
              height={100}
              rx={20}
              ry={20}
              fill="url(#chipGradient)"
              stroke="#222"
              strokeWidth={3}
              filter="drop-shadow(0 0 6px rgba(0,0,0,0.8))"
            />
            <g>
              <rect x={322} y={205} width={8} height={10} fill="url(#pinGradient)" rx={2} />
              <rect x={322} y={225} width={8} height={10} fill="url(#pinGradient)" rx={2} />
              <rect x={322} y={245} width={8} height={10} fill="url(#pinGradient)" rx={2} />
              <rect x={322} y={265} width={8} height={10} fill="url(#pinGradient)" rx={2} />
            </g>
            <g>
              <rect x={470} y={205} width={8} height={10} fill="url(#pinGradient)" rx={2} />
              <rect x={470} y={225} width={8} height={10} fill="url(#pinGradient)" rx={2} />
              <rect x={470} y={245} width={8} height={10} fill="url(#pinGradient)" rx={2} />
              <rect x={470} y={265} width={8} height={10} fill="url(#pinGradient)" rx={2} />
            </g>
            <text
              x={400}
              y={240}
              fontFamily="Arial, sans-serif"
              fontSize={22}
              fontWeight="bold"
              fill="url(#textGradient)"
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              {chipLabel}
            </text>
            <circle cx={100} cy={100} r={5} fill="black" />
            <circle cx={80} cy={180} r={5} fill="black" />
            <circle cx={60} cy={260} r={5} fill="black" />
            <circle cx={100} cy={350} r={5} fill="black" />
            <circle cx={700} cy={90} r={5} fill="black" />
            <circle cx={740} cy={160} r={5} fill="black" />
            <circle cx={720} cy={250} r={5} fill="black" />
            <circle cx={680} cy={340} r={5} fill="black" />
          </svg>
        </div>
      </div>
    </div>
  );
};
