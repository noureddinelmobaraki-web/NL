/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Smart Hook for "My Drawings" (NL Drawings + MeBit Archive) & Interactive Add/Create Options
 * - Starts on the dedicated "My Drawings" (`رسوماتي`) view with filter pills for
 *   Original Drawings, MeBit Pixel Series, and Visitor Creations
 * - Provides seamless switching to the Addition/Creation tools (Freehand Canvas, Pixel Grid 16x16/32x32, Upload/Import)
 */

import { useState, useCallback, useMemo } from 'react';
import { ASSETS } from '../../../constants/assets';
import type { ArtistDrawingItem } from '../types/art.types';

const STORAGE_KEY = 'nl_art_user_drawings_v1';

function buildInitialArtistDrawings(): ArtistDrawingItem[] {
  const mainDrawings: ArtistDrawingItem[] = ASSETS.gallery.drawings.map(
    (url, idx) => ({
      id: `nl-draw-${idx + 1}`,
      title:
        idx === 0
          ? 'NL Original Sketch #01 — Portrait & Ink'
          : 'NL Original Sketch #02 — Expressive Linework',
      category: 'my-drawings',
      imageUrl: url,
      accentHex: idx === 0 ? '#f43f5e' : '#a855f7',
      description:
        'لوحة مرسومة أصلية من أرشيف الفنان Nordine GB (NL) — رسوماتي الخاصة.',
    }),
  );

  const meBitPieces: ArtistDrawingItem[] = ASSETS.profile.me_bits.map(
    (url, idx) => ({
      id: `nl-mebit-${idx + 1}`,
      title: `ME Bit Pixel Artwork #0${idx + 1}`,
      category: 'mebit',
      imageUrl: url,
      accentHex: '#38bdf8',
      description: `لوحة بيكسل آرت رقمية من سلسلة ME Bit الخاصة بالفنان NL (#0${idx + 1}).`,
    }),
  );

  return [...mainDrawings, ...meBitPieces];
}

function loadUserCreatedDrawings(): ArtistDrawingItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export type DrawingsSubView =
  | 'my-drawings'
  | 'add-canvas'
  | 'add-pixel'
  | 'add-upload';

export function useArtDrawingsStudio() {
  const [subView, setSubView] = useState<DrawingsSubView>('my-drawings');
  const [categoryFilter, setCategoryFilter] = useState<
    'all' | 'my-drawings' | 'mebit' | 'user-created'
  >('all');
  const [userDrawings, setUserDrawings] = useState<ArtistDrawingItem[]>(() =>
    loadUserCreatedDrawings(),
  );
  const [activeBrushColor, setActiveBrushColor] = useState('#38bdf8');
  const [brushSize, setBrushSize] = useState(5);
  const [neonGlow, setNeonGlow] = useState(true);
  const [symmetryMode, setSymmetryMode] = useState(false);
  const [pixelGridSize, setPixelGridSize] = useState<16 | 32>(16);

  const baseArtistDrawings = useMemo(() => buildInitialArtistDrawings(), []);

  const allDrawings = useMemo(
    () => [...userDrawings, ...baseArtistDrawings],
    [userDrawings, baseArtistDrawings],
  );

  const filteredDrawings = useMemo(() => {
    if (categoryFilter === 'all') return allDrawings;
    return allDrawings.filter((d) => d.category === categoryFilter);
  }, [allDrawings, categoryFilter]);

  const addCreatedDrawing = useCallback(
    (title: string, dataUrl: string, description = 'عمل فني مضاف في معرض الرسومات') => {
      const item: ArtistDrawingItem = {
        id: `user-art-${Date.now()}`,
        title: title.trim() || `رسمة جديدة #${userDrawings.length + 1}`,
        category: 'user-created',
        imageUrl: dataUrl,
        accentHex: activeBrushColor,
        description,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      setUserDrawings((prev) => {
        const next = [item, ...prev].slice(0, 24);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore storage quota errors
        }
        return next;
      });
      setSubView('my-drawings');
      setCategoryFilter('all');
    },
    [activeBrushColor, userDrawings.length],
  );

  const removeUserDrawing = useCallback((id: string) => {
    setUserDrawings((prev) => {
      const next = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return {
    subView,
    setSubView,
    categoryFilter,
    setCategoryFilter,
    drawings: filteredDrawings,
    totalCount: allDrawings.length,
    activeBrushColor,
    setActiveBrushColor,
    brushSize,
    setBrushSize,
    neonGlow,
    setNeonGlow,
    symmetryMode,
    setSymmetryMode,
    pixelGridSize,
    setPixelGridSize,
    addCreatedDrawing,
    removeUserDrawing,
  };
}
