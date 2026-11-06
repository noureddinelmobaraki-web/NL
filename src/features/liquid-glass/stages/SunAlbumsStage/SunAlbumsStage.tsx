/**
 * src/features/liquid-glass/stages/SunAlbumsStage/SunAlbumsStage.tsx
 *
 * Modularized Sun Albums Stage:
 *  - Lazily fetches `albums.json` via `loadAlbums()` from `nl-audio-cdn` (zero 287KB inline bundle bloat).
 *  - Binds hardware Back button (`useBackToClose`) when an album is selected.
 *  - Delegates 2D Fisheye Mesh to `FisheyeMeshViewport` and Album Player to `AlbumPlayerWorkspace`.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useBackToClose } from '../../../../hooks/useBackToClose';
import type { LiquidGlassAlbum } from '../../albumsData';
import { getCachedAlbumsSync, loadAlbums } from '../../services/albums';
import { AlbumPlayerWorkspace } from './AlbumPlayerWorkspace';
import { FisheyeMeshViewport } from './FisheyeMeshViewport';
import { coverRgbCache, getInitialAlbumRgb } from './fisheyeMeshMath';

export interface SunAlbumsStageProps {
  viewportWidth: number;
  viewportHeight: number;
  externalMuted: boolean;
  onToggleMute: () => void;
  onAudioActiveChange?: (active: boolean) => void;
  onAudioElementMount?: (el: HTMLMediaElement | null) => void;
  onBackToOrbs: () => void;
}

export const SunAlbumsStage = React.memo(function SunAlbumsStage({
  viewportWidth,
  viewportHeight,
  externalMuted,
  onToggleMute,
  onAudioActiveChange,
  onAudioElementMount,
  onBackToOrbs,
}: SunAlbumsStageProps) {
  const [albums, setAlbums] = useState<LiquidGlassAlbum[]>(() => getCachedAlbumsSync() || []);
  const [selectedAlbum, setSelectedAlbum] = useState<LiquidGlassAlbum | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSelectTimeRef = useRef<number>(0);

  useEffect(() => {
    let alive = true;
    if (albums.length === 0) {
      loadAlbums()
        .then((loaded) => {
          if (alive) setAlbums(loaded);
        })
        .catch(() => {});
    }
    return () => {
      alive = false;
    };
  }, [albums.length]);

  useEffect(() => {
    const audio = audioRef.current;
    onAudioElementMount?.(audio);
    return () => {
      onAudioElementMount?.(null);
      onAudioActiveChange?.(false);
    };
  }, [onAudioElementMount, onAudioActiveChange]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = externalMuted;
    }
  }, [externalMuted]);

  const handleSelectAlbum = useCallback((album: LiquidGlassAlbum) => {
    const now = performance.now();
    if (now - lastSelectTimeRef.current < 220) return;
    lastSelectTimeRef.current = now;
    setSelectedAlbum(album);
  }, []);

  const handleBackNavigation = useCallback(() => {
    if (selectedAlbum) {
      if (audioRef.current) {
        try {
          audioRef.current.pause();
        } catch {
          /* ignore */
        }
      }
      onAudioActiveChange?.(false);
      setSelectedAlbum(null);
    } else {
      onBackToOrbs();
    }
  }, [selectedAlbum, onBackToOrbs, onAudioActiveChange]);

  useBackToClose(Boolean(selectedAlbum), handleBackNavigation);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedAlbum) {
        e.stopPropagation();
        e.preventDefault();
        handleBackNavigation();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [selectedAlbum, handleBackNavigation]);

  const selectedAlbumRgb = selectedAlbum
    ? coverRgbCache.get(selectedAlbum.id) ?? getInitialAlbumRgb(selectedAlbum.index)
    : '255, 196, 86';

  return (
    <div
      className="lg-sun-fullstage"
      style={
        {
          '--selected-album-rgb': selectedAlbumRgb,
        } as React.CSSProperties
      }
    >
      <div
        className={`lg-sun-backdrop-dim${selectedAlbum ? ' lg-sun-backdrop-dim--detail' : ''}`}
        aria-hidden="true"
      />

      <audio ref={audioRef} preload="none" crossOrigin="anonymous" />

      <button
        type="button"
        className="lg-glass-pill lg-back-orbs-btn"
        onClick={handleBackNavigation}
        aria-label={selectedAlbum ? 'العودة إلى شبكة الألبومات' : 'العودة إلى كوكب الأرض والشمس'}
      >
        <ArrowLeft size={18} strokeWidth={2.3} />
      </button>

      {!selectedAlbum && (
        <FisheyeMeshViewport
          albums={albums}
          viewportWidth={viewportWidth}
          viewportHeight={viewportHeight}
          onSelectAlbum={handleSelectAlbum}
          onBackToOrbs={onBackToOrbs}
        />
      )}

      {selectedAlbum && (
        <AlbumPlayerWorkspace
          album={selectedAlbum}
          viewportWidth={viewportWidth}
          viewportHeight={viewportHeight}
          externalMuted={externalMuted}
          audioRef={audioRef}
          onToggleMute={onToggleMute}
          onAudioActiveChange={onAudioActiveChange}
          onBack={handleBackNavigation}
        />
      )}
    </div>
  );
});
