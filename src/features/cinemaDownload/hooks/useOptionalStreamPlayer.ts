import { useCallback, useMemo, useRef } from 'react';
import { cinemaDownloadManager } from '../downloadManager';
import type { CinemaDownloadSnapshot } from '../types';
import { useCinemaDownloadSelector } from './useCinemaDownloadSelector';

/** Strictly opt-in: nothing streams unless `isStreamingActive` was toggled by the user. */
export function useOptionalStreamPlayer(infoHash: string) {
  const sel = useMemo(() => (s: CinemaDownloadSnapshot) => {
    const t = s.tasks[infoHash];
    return {
      isStreamingActive: Boolean(t?.isStreamingActive),
      showPieceMap: Boolean(t?.showPieceMap),
      streamUrl: t?.streamUrl,
      headerAndTailReady: Boolean(t?.headerAndTailReady),
      totalPieces: t?.totalPieces ?? 1,
      playheadPieceIndex: t?.playheadPieceIndex ?? 0,
      pieceMapBuckets: t?.showPieceMap ? t.pieceMapBuckets : undefined,
      activeDownloadingPieceIndex: t?.activeDownloadingPieceIndex,
    };
  }, [infoHash]);
  const st = useCinemaDownloadSelector(sel);
  const lastSeekAt = useRef(0);

  const seekToRatio = useCallback((r: number) => {
    cinemaDownloadManager.seekStreamToProgress(infoHash, Math.min(1, Math.max(0, r)));
  }, [infoHash]);

  const onSeeking = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    if (!Number.isFinite(v.duration) || v.duration <= 0) return;
    const now = Date.now();
    if (now - lastSeekAt.current < 300) return; // debounce scrubbing
    lastSeekAt.current = now;
    seekToRatio(v.currentTime / v.duration);
  }, [seekToRatio]);

  const onTimeUpdate = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    if (!Number.isFinite(v.duration) || v.duration <= 0) return;
    const target = Math.floor((v.currentTime / v.duration) * st.totalPieces);
    if (Math.abs(target - st.playheadPieceIndex) >= 3) seekToRatio(v.currentTime / v.duration);
  }, [seekToRatio, st.totalPieces, st.playheadPieceIndex]);

  return {
    ...st,
    canPlay: st.isStreamingActive && Boolean(st.streamUrl) && st.headerAndTailReady,
    toggleStreamPlayer: useCallback(() => cinemaDownloadManager.toggleStreamPlayerForTask(infoHash), [infoHash]),
    togglePieceMap: useCallback(() => cinemaDownloadManager.togglePieceMapForTask(infoHash), [infoHash]),
    openInMainCinema: useCallback(() => cinemaDownloadManager.openInMainCinemaPlayer(infoHash), [infoHash]),
    seekToRatio, onSeeking, onTimeUpdate,
  };
}
