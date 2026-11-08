import { useEffect, useMemo, useState } from 'react';
import { cinemaDownloadManager } from '../downloadManager';
import { ALL_STAGES, STAGE_LABELS } from '../engine/transportFailoverMachine';
import type { CandidateTransportStage, CinemaDownloadSnapshot, TransportDiagnostics } from '../types';
import { useCinemaDownloadSelector } from './useCinemaDownloadSelector';

function useCountdown(target: number | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [target]);
  return target ? Math.max(0, Math.ceil((target - now) / 1000)) : null;
}

export function useSwarmTransportDiagnostics(infoHash: string, isAr = true) {
  const sel = useMemo(
    () => (s: CinemaDownloadSnapshot) => s.tasks[infoHash]?.diagnostics ?? null,
    [infoHash],
  );
  const diag = useCinemaDownloadSelector<TransportDiagnostics | null>(sel, Object.is);
  const retryInSec = useCountdown(diag?.nextRetryAt ?? null);

  const view = useMemo(() => {
    if (!diag) return null;
    const lang = isAr ? 'ar' : 'en';
    const steps = ALL_STAGES.filter((s) => diag.stageOutcomes[s] !== 'skipped').map((s) => ({
      stage: s, label: STAGE_LABELS[s][lang], outcome: diag.stageOutcomes[s],
      isActive: diag.committedStage === s && diag.stage === s,
    }));
    const headline =
      diag.stage === 'fallback-needed'
        ? (isAr ? 'لا يوجد مسار متاح داخل المتصفح' : 'No in-browser transport available')
        : diag.stage === 'probing'
          ? (isAr ? `جاري الفحص: ${diag.probingStage ? STAGE_LABELS[diag.probingStage].ar : '...'}`
                  : `Probing: ${diag.probingStage ? STAGE_LABELS[diag.probingStage].en : '...'}`)
          : STAGE_LABELS[diag.stage][lang];
    const tone = diag.stage === 'fallback-needed' ? 'rose' : diag.stage === 'probing' ? 'amber' : 'emerald';
    return { steps, headline, tone: tone as 'rose' | 'amber' | 'emerald' };
  }, [diag, isAr]);

  return {
    diagnostics: diag,
    view,
    retryInSec,
    isFallbackNeeded: diag?.stage === 'fallback-needed',
    retryNow: (stage: CandidateTransportStage | null = null) => cinemaDownloadManager.retryFromStage(infoHash, stage),
    acceptGeometryChange: () => cinemaDownloadManager.acceptGeometryChange(infoHash),
  };
}
