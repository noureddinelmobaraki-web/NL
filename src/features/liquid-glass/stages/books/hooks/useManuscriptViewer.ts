/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Smart Hook for RTL Two-Page Manuscript Spread & Deep Zoom
 */

import { useState, useEffect, useCallback } from 'react';
import {
  resolveManuscriptMetadata,
  type ManuscriptMetadata,
} from '../../../services/manuscriptsAndTurath';

export function useManuscriptViewer(iaId?: string, enabled = false) {
  const [metadata, setMetadata] = useState<ManuscriptMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentSpreadIdx, setCurrentSpreadIdx] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [twoPageMode, setTwoPageMode] = useState(true);

  useEffect(() => {
    if (!enabled || !iaId) {
      setMetadata(null);
      return undefined;
    }
    const controller = new AbortController();
    setLoading(true);
    setCurrentSpreadIdx(0);

    resolveManuscriptMetadata(iaId, controller.signal)
      .then((res) => {
        if (!controller.signal.aborted) {
          setMetadata(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [iaId, enabled]);

  const step = twoPageMode ? 2 : 1;
  const maxIdx = Math.max(0, (metadata?.pages.length || 1) - step);

  const nextSpread = useCallback(() => {
    setCurrentSpreadIdx((prev) => Math.min(maxIdx, prev + step));
  }, [maxIdx, step]);

  const prevSpread = useCallback(() => {
    setCurrentSpreadIdx((prev) => Math.max(0, prev - step));
  }, [step]);

  const rightPage = metadata?.pages[currentSpreadIdx] || null;
  const leftPage =
    twoPageMode && metadata?.pages[currentSpreadIdx + 1]
      ? metadata.pages[currentSpreadIdx + 1]
      : null;

  return {
    metadata,
    loading,
    currentSpreadIdx,
    rightPage,
    leftPage,
    zoomLevel,
    setZoomLevel,
    twoPageMode,
    setTwoPageMode,
    nextSpread,
    prevSpread,
  };
}
