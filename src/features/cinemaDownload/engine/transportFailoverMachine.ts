import type {
  CandidateTransportStage,
  DiscoveredReleaseOption,
  ResolvedTransport,
  StageProbeOutcome,
  TransportAttemptLogEntry,
  TransportDiagnostics,
  TransportGeometry,
} from '../types';
import { abortError, abortableSleep } from './abortUtils';

export interface FailoverPolicy {
  maxProbeAttemptsPerStage: number;
  maxPieceFailuresPerStage: number;
  healthyStageExtraPatience: number;
  baseBackoffMs: number;
  maxBackoffMs: number;
  jitterRatio: number;
  autoReprobeDelayMs: number;
  maxAutoReprobeRounds: number;
  logLimit: number;
}

export const DEFAULT_FAILOVER_POLICY: FailoverPolicy = {
  maxProbeAttemptsPerStage: 2,
  maxPieceFailuresPerStage: 4,
  healthyStageExtraPatience: 4,
  baseBackoffMs: 1_000,
  maxBackoffMs: 20_000,
  jitterRatio: 0.25,
  autoReprobeDelayMs: 60_000,
  maxAutoReprobeRounds: 3,
  logLimit: 14,
};

export const ALL_STAGES: CandidateTransportStage[] = ['bridge', 'webseed', 'edge-tcp', 'webrtc', 'hls-stream'];

export const STAGE_LABELS: Record<CandidateTransportStage, { ar: string; en: string }> = {
  bridge: { ar: 'جسر الخادم (TCP/UDP/DHT)', en: 'Server Bridge (TCP/UDP/DHT)' },
  webseed: { ar: 'بذور الويب HTTP 206', en: 'HTTP WebSeed (206)' },
  'edge-tcp': { ar: 'نفق Edge TCP (BitTorrent)', en: 'Edge TCP Swarm (Worker)' },
  webrtc: { ar: 'سرب WebRTC داخل المتصفح', en: 'Browser WebRTC Swarm' },
  'hls-stream': { ar: 'بث مستخرج HLS/MP4', en: 'Extracted HLS/MP4 Stream' },
};

export interface PieceFailure {
  reason: string;
  httpStatus?: number;
  permanent: boolean;
}

export type StageProbeResult =
  | { ok: true; transport: ResolvedTransport; detail: string }
  | { ok: false; detail: string; httpStatus?: number; permanent: boolean };

export type StageProber = (
  stage: CandidateTransportStage,
  frozenGeometry: TransportGeometry | null,
) => Promise<StageProbeResult>;

export type FailoverDecision =
  | { kind: 'retry' }
  | { kind: 'switch'; transport: ResolvedTransport; geometryChanged: boolean }
  | { kind: 'exhausted' };

export function stageOrderFor(release: DiscoveredReleaseOption): CandidateTransportStage[] {
  switch (release.sourceKind) {
    case 'direct-hls':
      return ['hls-stream'];
    case 'direct-mp4':
      return ['webseed', 'hls-stream'];
    default:
      return ['bridge', 'webseed', 'edge-tcp', 'webrtc', 'hls-stream'];
  }
}

export function geometryKey(g: TransportGeometry): string {
  return g.isVariableSegments
    ? `seg:${g.totalPieces}`
    : `fix:${g.pieceLength}:${g.totalPieces}`;
}

export function computeBackoffMs(
  attempt: number,
  policy: FailoverPolicy = DEFAULT_FAILOVER_POLICY,
  random: () => number = Math.random,
): number {
  const exp = Math.min(policy.maxBackoffMs, policy.baseBackoffMs * 2 ** Math.max(0, attempt));
  const spread = exp * policy.jitterRatio;
  return Math.max(250, Math.round(exp - spread + random() * spread * 2));
}

function outcomesFor(order: CandidateTransportStage[]): Record<CandidateTransportStage, StageProbeOutcome> {
  return Object.fromEntries(
    ALL_STAGES.map((s) => [s, order.includes(s) ? 'pending' : 'skipped']),
  ) as Record<CandidateTransportStage, StageProbeOutcome>;
}

export function createInitialDiagnostics(order: CandidateTransportStage[]): TransportDiagnostics {
  return {
    stage: 'probing',
    probingStage: null,
    committedStage: null,
    stageOutcomes: outcomesFor(order),
    attemptInStage: 0,
    maxAttemptsInStage: DEFAULT_FAILOVER_POLICY.maxProbeAttemptsPerStage,
    nextRetryAt: null,
    webrtcPeers: 0,
    bridgePeers: 0,
    edgeTcpPeers: 0,
    httpSources: 0,
    lastError: null,
    autoReprobeRound: 0,
    geometrySwitchBlocked: false,
    log: [],
  };
}

export interface FailoverControllerOptions {
  order: CandidateTransportStage[];
  probe: StageProber;
  signal: AbortSignal;
  onDiagnostics: (d: TransportDiagnostics) => void;
  canChangeGeometry: () => boolean;
  frozenGeometry: TransportGeometry | null;
  initialDiagnostics?: TransportDiagnostics;
  policy?: Partial<FailoverPolicy>;
}

/**
 * Pure multi-stage transport failover controller.
 * Owns no I/O itself: probing is injected, so it is fully unit-testable.
 */
export class TransportFailoverController {
  private readonly policy: FailoverPolicy;
  private diag: TransportDiagnostics;
  private frozen: TransportGeometry | null;
  private current: ResolvedTransport | null = null;
  private currentIdx = -1;
  private pieceFailures = 0;
  private piecesOnStage = 0;

  constructor(private readonly opts: FailoverControllerOptions) {
    this.policy = { ...DEFAULT_FAILOVER_POLICY, ...opts.policy };
    this.frozen = opts.frozenGeometry;
    const base = opts.initialDiagnostics ?? createInitialDiagnostics(opts.order);
    this.diag = {
      ...base,
      stage: 'probing',
      probingStage: null,
      stageOutcomes: outcomesFor(opts.order),
      attemptInStage: 0,
      maxAttemptsInStage: this.policy.maxProbeAttemptsPerStage,
      nextRetryAt: null,
      geometrySwitchBlocked: false,
    };
    this.publish();
  }

  get transport(): ResolvedTransport | null {
    return this.current;
  }

  get diagnostics(): TransportDiagnostics {
    return this.diag;
  }

  patch(partial: Partial<TransportDiagnostics>): void {
    this.diag = { ...this.diag, ...partial };
    this.publish();
  }

  updateLiveCounters(counters: {
    webrtcPeers?: number;
    bridgePeers?: number;
    edgeTcpPeers?: number;
  }): void {
    const nextWebrtc = counters.webrtcPeers ?? this.diag.webrtcPeers;
    const nextBridge = counters.bridgePeers ?? this.diag.bridgePeers;
    const nextEdgeTcp = counters.edgeTcpPeers ?? this.diag.edgeTcpPeers;
    if (
      nextWebrtc !== this.diag.webrtcPeers ||
      nextBridge !== this.diag.bridgePeers ||
      nextEdgeTcp !== this.diag.edgeTcpPeers
    ) {
      this.patch({
        webrtcPeers: nextWebrtc,
        bridgePeers: nextBridge,
        edgeTcpPeers: nextEdgeTcp,
      });
    }
  }

  async resolveFrom(start?: CandidateTransportStage | null): Promise<ResolvedTransport | null> {
    const { order } = this.opts;
    const startIdx = start && order.includes(start) ? order.indexOf(start) : 0;
    for (let k = 0; k < order.length; k++) {
      const t = await this.tryStage((startIdx + k) % order.length);
      if (t) return t;
    }
    this.enterExhausted();
    return null;
  }

  reportPieceSuccess(): void {
    this.pieceFailures = 0;
    this.piecesOnStage += 1;
    if (this.diag.attemptInStage !== 0 || this.diag.lastError !== null) {
      this.patch({ attemptInStage: 0, lastError: null });
    }
  }

  async reportPieceFailure(failure: PieceFailure): Promise<FailoverDecision> {
    const stage = this.current?.stage;
    if (!stage) return { kind: 'exhausted' };

    this.pieceFailures += 1;
    const budget =
      this.policy.maxPieceFailuresPerStage +
      (this.piecesOnStage > 0 ? this.policy.healthyStageExtraPatience : 0);

    this.log({ stage, kind: 'piece', ok: false, detail: failure.reason, httpStatus: failure.httpStatus });
    this.patch({
      lastError: `${stage}: ${failure.reason}`,
      attemptInStage: this.pieceFailures,
      maxAttemptsInStage: budget,
    });

    if (!failure.permanent && this.pieceFailures < budget) {
      await this.waitWithCountdown(computeBackoffMs(this.pieceFailures - 1, this.policy));
      return { kind: 'retry' };
    }

    const previous = this.current;
    const originIdx = this.currentIdx;
    this.setOutcome(stage, 'failed');
    const { order } = this.opts;

    for (let k = 1; k < order.length; k++) {
      const t = await this.tryStage((originIdx + k) % order.length);
      if (t) {
        return {
          kind: 'switch',
          transport: t,
          geometryChanged: previous ? geometryKey(previous.geometry) !== geometryKey(t.geometry) : true,
        };
      }
    }

    const again = await this.tryStage(originIdx);
    if (again) return { kind: 'switch', transport: again, geometryChanged: false };

    this.enterExhausted();
    return { kind: 'exhausted' };
  }

  private async tryStage(idx: number): Promise<ResolvedTransport | null> {
    const stage = this.opts.order[idx];
    const max = this.policy.maxProbeAttemptsPerStage;

    for (let attempt = 0; attempt < max; attempt++) {
      this.throwIfAborted();
      this.setOutcome(stage, 'probing');
      this.patch({ stage: 'probing', probingStage: stage, attemptInStage: attempt + 1, maxAttemptsInStage: max });

      let result: StageProbeResult;
      try {
        result = await this.opts.probe(stage, this.frozen);
      } catch (err) {
        this.throwIfAborted();
        result = { ok: false, detail: err instanceof Error ? err.message : 'Probe crashed', permanent: false };
      }
      this.throwIfAborted();

      if (result.ok) {
        const g = result.transport.geometry;
        if (this.frozen && geometryKey(g) !== geometryKey(this.frozen) && !this.opts.canChangeGeometry()) {
          this.log({ stage, kind: 'probe', ok: false, detail: 'Alternate source uses a different piece layout — user confirmation required' });
          this.setOutcome(stage, 'skipped');
          this.patch({ geometrySwitchBlocked: true });
          return null;
        }

        this.frozen = g;
        this.current = result.transport;
        this.currentIdx = idx;
        this.pieceFailures = 0;
        this.piecesOnStage = 0;
        this.log({ stage, kind: 'probe', ok: true, detail: result.detail });
        this.setOutcome(stage, 'ok');
        this.patch({
          stage,
          committedStage: stage,
          probingStage: null,
          attemptInStage: 0,
          lastError: null,
          nextRetryAt: null,
          webrtcPeers: stage === 'webrtc' ? result.transport.peers : this.diag.webrtcPeers,
          bridgePeers: stage === 'bridge' ? result.transport.peers : this.diag.bridgePeers,
          edgeTcpPeers: stage === 'edge-tcp' ? result.transport.peers : this.diag.edgeTcpPeers,
          httpSources: Math.max(this.diag.httpSources, result.transport.httpSources),
        });
        return result.transport;
      }

      this.log({ stage, kind: 'probe', ok: false, detail: result.detail, httpStatus: result.httpStatus });
      this.patch({
        lastError: `${stage}: ${result.detail}`,
        webrtcPeers: stage === 'webrtc' ? 0 : this.diag.webrtcPeers,
        edgeTcpPeers: stage === 'edge-tcp' ? 0 : this.diag.edgeTcpPeers,
      });

      if (result.permanent) break;
      if (attempt < max - 1) {
        await this.waitWithCountdown(computeBackoffMs(attempt, this.policy));
      }
    }

    this.setOutcome(stage, 'failed');
    this.publish();
    return null;
  }

  private enterExhausted(): void {
    this.current = null;
    this.patch({ stage: 'fallback-needed', probingStage: null, nextRetryAt: null });
  }

  private async waitWithCountdown(ms: number): Promise<void> {
    this.patch({ nextRetryAt: Date.now() + ms });
    try {
      await abortableSleep(ms, this.opts.signal);
    } finally {
      if (!this.opts.signal.aborted) this.patch({ nextRetryAt: null });
    }
  }

  private setOutcome(stage: CandidateTransportStage, outcome: StageProbeOutcome): void {
    this.diag = { ...this.diag, stageOutcomes: { ...this.diag.stageOutcomes, [stage]: outcome } };
  }

  private log(entry: Omit<TransportAttemptLogEntry, 'at'>): void {
    const log = [...this.diag.log, { ...entry, at: Date.now() }].slice(-this.policy.logLimit);
    this.diag = { ...this.diag, log };
  }

  private throwIfAborted(): void {
    if (this.opts.signal.aborted) throw abortError();
  }

  private publish(): void {
    this.opts.onDiagnostics(this.diag);
  }
}
