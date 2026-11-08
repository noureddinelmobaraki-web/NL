/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Smart Custom Hook: Strictly Opt-In Watch-While-Downloading Player & Piece Map Controls
 */

import { useCallback } from 'react';
import { cinemaDownloadManager } from '../downloadManager';

export function useOptionalStreamPlayer(infoHash: string, totalPieces: number) {
  const toggleStreamPlayer = useCallback(() => {
    cinemaDownloadManager.toggleStreamPlayerForTask(infoHash);
  }, [infoHash]);

  const togglePieceMap = useCallback(() => {
    cinemaDownloadManager.togglePieceMapForTask(infoHash);
  }, [infoHash]);

  const openInMainCinema = useCallback(() => {
    cinemaDownloadManager.openInMainCinemaPlayer(infoHash);
  }, [infoHash]);

  const seekToRatio = useCallback(
    (ratio0to1: number) => {
      cinemaDownloadManager.seekStreamToProgress(infoHash, ratio0to1);
    },
    [infoHash],
  );

  const handleVideoSeeking = useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement>) => {
      const v = e.currentTarget;
      if (v.duration && Number.isFinite(v.duration) && v.duration > 0) {
        cinemaDownloadManager.seekStreamToProgress(
          infoHash,
          v.currentTime / v.duration,
        );
      }
    },
    [infoHash],
  );

  const handleVideoTimeUpdate = useCallback(
    (
      e: React.SyntheticEvent<HTMLVideoElement>,
      currentPlayheadPiece = 0,
    ) => {
      const v = e.currentTarget;
      if (v.duration && Number.isFinite(v.duration) && v.duration > 0) {
        const ratio = v.currentTime / v.duration;
        const targetP = Math.floor(ratio * Math.max(1, totalPieces));
        if (Math.abs(targetP - currentPlayheadPiece) >= 3) {
          cinemaDownloadManager.seekStreamToProgress(infoHash, ratio);
        }
      }
    },
    [infoHash, totalPieces],
  );

  return {
    toggleStreamPlayer,
    togglePieceMap,
    openInMainCinema,
    seekToRatio,
    handleVideoSeeking,
    handleVideoTimeUpdate,
  };
}
