/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export function useSeekUnsupportedToast() {
  const [embedSeekStartAtSec, setEmbedSeekStartAtSec] = useState<number | null>(null);
  const [workerBridgeRevision, setWorkerBridgeRevision] = useState(0);
  const [seekUnsupportedToast, setSeekUnsupportedToast] = useState(false);
  const seekUnsupportedToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSeekUnsupportedToast = useCallback(() => {
    setSeekUnsupportedToast(true);
    if (seekUnsupportedToastTimerRef.current) {
      clearTimeout(seekUnsupportedToastTimerRef.current);
    }
    seekUnsupportedToastTimerRef.current = setTimeout(() => {
      setSeekUnsupportedToast(false);
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (seekUnsupportedToastTimerRef.current) {
        clearTimeout(seekUnsupportedToastTimerRef.current);
      }
    };
  }, []);

  return {
    embedSeekStartAtSec,
    setEmbedSeekStartAtSec,
    workerBridgeRevision,
    setWorkerBridgeRevision,
    seekUnsupportedToast,
    setSeekUnsupportedToast,
    seekUnsupportedToastTimerRef,
    showSeekUnsupportedToast,
  };
}

export type UseSeekUnsupportedToastResult = ReturnType<typeof useSeekUnsupportedToast>;
