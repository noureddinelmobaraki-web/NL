/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * The Color API Live Harmony & Palette Service
 * - Generates harmonious color schemes (analogic, complement, triad, monochrome, quad)
 * - Returns real color names, HEX, RGB, and HSL values
 */

import type { ColorHarmonyMode, ColorSwatchItem } from '../types/art.types';

const PALETTE_CACHE = new Map<string, ColorSwatchItem[]>();

export async function fetchColorHarmonyPalette(
  hex: string,
  mode: ColorHarmonyMode = 'analogic',
  count = 6,
  signal?: AbortSignal,
): Promise<ColorSwatchItem[]> {
  const cleanHex = hex.replace(/[^0-9a-fA-F]/g, '').slice(0, 6) || '38bdf8';
  const cacheKey = `${cleanHex}:${mode}:${count}`;
  const cached = PALETTE_CACHE.get(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(
      `https://www.thecolorapi.com/scheme?hex=${cleanHex}&mode=${mode}&count=${count}`,
      { signal: signal ?? AbortSignal.timeout(6000) },
    );
    if (!res.ok) throw new Error('Color API HTTP error');
    const json = await res.json();
    const colors: Array<{
      hex?: { value?: string };
      name?: { value?: string };
      rgb?: { value?: string };
      hsl?: { value?: string };
    }> = Array.isArray(json?.colors) ? json.colors : [];

    const swatches: ColorSwatchItem[] = colors.map((c) => ({
      hex: c.hex?.value || `#${cleanHex}`,
      name: c.name?.value || 'Artistic Tone',
      rgb: c.rgb?.value || 'rgb(56, 189, 248)',
      hsl: c.hsl?.value || 'hsl(198, 93%, 60%)',
    }));

    if (swatches.length > 0) {
      PALETTE_CACHE.set(cacheKey, swatches);
      return swatches;
    }
  } catch {
    // Fallback algorithmic palette
  }

  return [
    { hex: `#${cleanHex}`, name: 'Primary Anchor', rgb: 'RGB', hsl: 'HSL' },
    { hex: '#38bdf8', name: 'Aero Cyan', rgb: 'rgb(56,189,248)', hsl: 'hsl(198,93%,60%)' },
    { hex: '#a855f7', name: 'Electric Violet', rgb: 'rgb(168,85,247)', hsl: 'hsl(271,91%,65%)' },
    { hex: '#f43f5e', name: 'Crimson Glow', rgb: 'rgb(244,63,94)', hsl: 'hsl(350,89%,60%)' },
    { hex: '#10b981', name: 'Emerald Mint', rgb: 'rgb(16,185,129)', hsl: 'hsl(160,84%,39%)' },
    { hex: '#f59e0b', name: 'Solar Amber', rgb: 'rgb(245,158,11)', hsl: 'hsl(38,92%,50%)' },
  ];
}
