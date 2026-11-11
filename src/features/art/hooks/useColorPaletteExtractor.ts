/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Smart Hook for Live Color Harmony Extraction via The Color API
 */

import { useState, useEffect } from 'react';
import type { ColorHarmonyMode, ColorSwatchItem } from '../types/art.types';
import { fetchColorHarmonyPalette } from '../services/colorHarmonyService';

export function useColorPaletteExtractor(initialHex = '#38bdf8') {
  const [seedHex, setSeedHex] = useState(initialHex);
  const [harmonyMode, setHarmonyMode] = useState<ColorHarmonyMode>('analogic');
  const [swatches, setSwatches] = useState<ColorSwatchItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    fetchColorHarmonyPalette(seedHex, harmonyMode, 6, controller.signal)
      .then((res) => {
        if (!controller.signal.aborted) {
          setSwatches(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [seedHex, harmonyMode]);

  return {
    seedHex,
    setSeedHex,
    harmonyMode,
    setHarmonyMode,
    swatches,
    loading,
  };
}
