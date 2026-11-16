import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Search, X } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useViewportSize } from '../../hooks/useViewportSize';
import { useBackToClose } from '../../hooks/useBackToClose';
import type { LiquidGlassAlbum } from '../liquid-glass/albumsData';
import { FisheyeMeshViewport } from '../liquid-glass/stages/SunAlbumsStage/FisheyeMeshViewport';
import { LiquidGlassBooksBackdrop } from '../liquid-glass/shared/LiquidGlassBooksBackdrop';
import '../liquid-glass/stages/orbs/portal.lens.css';
import type { SharatTrack } from './types/sharat.types';
import { SHARAT_VERIFIED_CATALOG } from './catalog/sharatVerifiedCatalog';
import { SharatAscendedWorkspace } from './components/SharatAscendedWorkspace';
import { resolveFullSharatArchiveCatalog } from './services/sharatArchiveResolver';

export const SharatPage: React.FC = () => {
  const { navigateTo } = useAppContext();
  const { width: viewportWidth, height: viewportHeight } = useViewportSize();
  const [catalogTracks, setCatalogTracks] = useState<SharatTrack[]>(
    SHARAT_VERIFIED_CATALOG,
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTrack, setActiveTrack] = useState<SharatTrack | null>(null);

  useEffect(() => {
    let cancelled = false;
    void resolveFullSharatArchiveCatalog(SHARAT_VERIFIED_CATALOG).then(
      (resolved) => {
        if (!cancelled && resolved.length > 0) {
          setCatalogTracks(resolved);
          setActiveTrack((prev) => {
            if (!prev) return null;
            return resolved.find((t) => t.id === prev.id) || prev;
          });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredTracks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return catalogTracks;
    return catalogTracks.filter(
      (track) =>
        track.seriesAr.toLowerCase().includes(q) ||
        track.titleAr.toLowerCase().includes(q) ||
        track.artistAr.toLowerCase().includes(q) ||
        track.originalTitle.toLowerCase().includes(q),
    );
  }, [catalogTracks, searchQuery]);

  const brickAlbums = useMemo<LiquidGlassAlbum[]>(
    () =>
      filteredTracks.map((track, idx) => ({
        id: track.id,
        index: idx,
        title: track.seriesAr,
        artist: track.artistAr,
        subtitle: `${track.titleAr} · ${track.artistAr}`,
        coverUrl: track.posterUrl,
        fallbackCoverUrl: track.backdropFallbackUrl,
        tracks: [],
      })),
    [filteredTracks],
  );

  const trackById = useMemo(() => {
    const map = new Map<string, SharatTrack>();
    for (const track of filteredTracks) {
      map.set(track.id, track);
    }
    return map;
  }, [filteredTracks]);

  const handleSelectBrick = useCallback(
    (album: LiquidGlassAlbum) => {
      const hit = trackById.get(album.id);
      if (hit) setActiveTrack(hit);
    },
    [trackById],
  );

  const handleStepTrack = useCallback(
    (delta: number) => {
      if (!activeTrack || filteredTracks.length === 0) return;
      const idx = filteredTracks.findIndex((t) => t.id === activeTrack.id);
      const nextIdx =
        idx === -1
          ? 0
          : (idx + delta + filteredTracks.length) % filteredTracks.length;
      setActiveTrack(filteredTracks[nextIdx]);
    },
    [activeTrack, filteredTracks],
  );

  const handleBack = useCallback(() => {
    if (activeTrack) {
      setActiveTrack(null);
    } else {
      navigateTo('home');
    }
  }, [activeTrack, navigateTo]);

  useBackToClose(Boolean(activeTrack), () => setActiveTrack(null));

  return (
    <div
      className="fixed inset-0 z-[10050] w-full h-[100dvh] text-white select-none overflow-hidden pointer-events-auto bg-slate-950"
      dir="rtl"
    >
      <LiquidGlassBooksBackdrop dimmerOpacity={0.58} />

      <div className="lg-sun-fullstage">
        <div className="lg-sun-backdrop-dim" aria-hidden="true" />

        {/* Clean Floating Top Bar — Search + Close Only (No Lists, No Planets) */}
        <div className="fixed top-4 inset-x-4 z-[120] flex items-center justify-between gap-3 pointer-events-none">
          <button
            type="button"
            onClick={handleBack}
            aria-label="العودة"
            className="pointer-events-auto h-11 w-11 rounded-full bg-black/55 hover:bg-black/75 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white transition cursor-pointer shrink-0"
          >
            <ArrowRight size={18} />
          </button>

          <div className="pointer-events-auto relative w-full max-w-sm">
            <Search
              size={15}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/55 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن شارة أو عمل..."
              className="w-full pr-10 pl-9 py-2.5 rounded-full bg-black/55 backdrop-blur-xl border border-white/20 focus:border-amber-400/70 text-xs sm:text-sm text-white placeholder:text-white/50 outline-none transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="مسح البحث"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full text-white/60 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="w-11 shrink-0" aria-hidden="true" />
        </div>

        {brickAlbums.length > 0 ? (
          <FisheyeMeshViewport
            albums={brickAlbums}
            viewportWidth={viewportWidth}
            viewportHeight={viewportHeight}
            onSelectAlbum={handleSelectBrick}
            onBackToOrbs={() => navigateTo('home')}
          />
        ) : (
          <div className="relative z-10 text-center text-sm text-white/70 px-6">
            لا توجد شارات مطابقة لبحثك.
          </div>
        )}
      </div>

      {activeTrack && (
        <SharatAscendedWorkspace
          track={activeTrack}
          onClose={() => setActiveTrack(null)}
          onNext={() => handleStepTrack(1)}
          onPrev={() => handleStepTrack(-1)}
        />
      )}
    </div>
  );
};

export default SharatPage;
