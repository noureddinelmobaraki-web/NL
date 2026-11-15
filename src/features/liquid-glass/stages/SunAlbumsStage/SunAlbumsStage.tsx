/**
 * src/features/liquid-glass/stages/SunAlbumsStage/SunAlbumsStage.tsx
 *
 * Modularized Sun Albums Stage:
 *  - Lazily fetches `albums.json` via `loadAlbums()` from `nl-audio-cdn` (99 Curated NL Albums primary by default).
 *  - Supports open discovery across Archive.org Live Music Archive (etree), Great 78s (78rpm), Netlabels, and Old Time Radio.
 *  - Binds hardware Back button (`useBackToClose`) when an album is selected.
 *  - Delegates 2D Fisheye Mesh to `FisheyeMeshViewport` and Album Player to `AlbumPlayerWorkspace`.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { useBackToClose } from '../../../../hooks/useBackToClose';
import type { LiquidGlassAlbum } from '../../albumsData';
import { getCachedAlbumsSync, loadAlbums } from '../../services/albums';
import {
  ALBUM_COLLECTION_PILLS,
  fetchOpenArchiveAlbums,
  resolveOpenAlbumTracks,
  type AlbumCollectionFilter,
} from '../../services/openAlbumsArchiveService';
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
  const [curatedAlbums, setCuratedAlbums] = useState<LiquidGlassAlbum[]>(
    () => getCachedAlbumsSync() || [],
  );
  const [openAlbums, setOpenAlbums] = useState<LiquidGlassAlbum[]>([]);
  const [collectionFilter, setCollectionFilter] =
    useState<AlbumCollectionFilter>('nl-curated');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAlbum, setSelectedAlbum] = useState<LiquidGlassAlbum | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSelectTimeRef = useRef<number>(0);

  useEffect(() => {
    let alive = true;
    if (curatedAlbums.length === 0) {
      loadAlbums()
        .then((loaded) => {
          if (alive) setCuratedAlbums(loaded);
        })
        .catch(() => {});
    }
    return () => {
      alive = false;
    };
  }, [curatedAlbums.length]);

  useEffect(() => {
    if (collectionFilter === 'nl-curated') return;
    let alive = true;
    fetchOpenArchiveAlbums(collectionFilter, searchQuery, 1).then((items) => {
      if (alive) setOpenAlbums(items);
    });
    return () => {
      alive = false;
    };
  }, [collectionFilter, searchQuery]);

  const displayedAlbums = useMemo(() => {
    const base =
      collectionFilter === 'nl-curated' ? curatedAlbums : openAlbums;
    const q = searchQuery.trim().toLowerCase();
    if (!q || collectionFilter !== 'nl-curated') return base;
    return base.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.artist.toLowerCase().includes(q),
    );
  }, [collectionFilter, curatedAlbums, openAlbums, searchQuery]);

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
    if (album.id.startsWith('ia-album-') && album.tracks.length === 0) {
      void resolveOpenAlbumTracks(album).then((hydrated) => {
        setSelectedAlbum(hydrated);
      });
    } else {
      setSelectedAlbum(album);
    }
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
        aria-label={selectedAlbum ? 'Back to Albums Grid' : 'Back to Orbs'}
      >
        <ArrowLeft size={18} strokeWidth={2.3} />
      </button>

      {!selectedAlbum && (
        <>
          {/* Floating Collection Filter & Search Bar */}
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[120] flex flex-wrap items-center justify-center gap-2 px-3 py-2 rounded-2xl bg-black/55 backdrop-blur-xl border border-white/20 max-w-[92vw]">
            {ALBUM_COLLECTION_PILLS.map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => setCollectionFilter(pill.id)}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  collectionFilter === pill.id
                    ? 'bg-amber-400 text-slate-950 shadow'
                    : 'bg-white/10 hover:bg-white/20 text-white/85'
                }`}
              >
                {pill.label}
              </button>
            ))}
            <div className="relative flex items-center">
              <Search
                size={13}
                className="absolute left-2.5 text-white/55 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter albums..."
                className="pl-7 pr-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs text-white placeholder:text-white/50 outline-none w-36 sm:w-44"
              />
            </div>
          </div>

          <FisheyeMeshViewport
            albums={displayedAlbums}
            viewportWidth={viewportWidth}
            viewportHeight={viewportHeight}
            onSelectAlbum={handleSelectAlbum}
            onBackToOrbs={onBackToOrbs}
          />
        </>
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
