import React, { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { LiquidGlassBooksBackdrop } from '../liquid-glass/shared/LiquidGlassBooksBackdrop';
import type {
  SharatArtistGroupId,
  SharatTrack,
} from './types/sharat.types';
import {
  SHARAT_ARTIST_PILLS,
  SHARAT_VERIFIED_CATALOG,
} from './catalog/sharatVerifiedCatalog';
import { SharatSquareBrickGrid } from './components/SharatSquareBrickGrid';
import { SharatAscendedWorkspace } from './components/SharatAscendedWorkspace';
import { resolveFullSharatArchiveCatalog } from './services/sharatArchiveResolver';

export const SharatPage: React.FC = () => {
  const { navigateTo } = useAppContext();
  const [catalogTracks, setCatalogTracks] = useState<SharatTrack[]>(
    SHARAT_VERIFIED_CATALOG,
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [artistFilter, setArtistFilter] = useState<SharatArtistGroupId>('all');
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
    return catalogTracks.filter((track) => {
      if (artistFilter === 'top_classics') {
        if ((track.priorityRank ?? 500) > 25 && track.artistGroupId !== 'top_classics') {
          return false;
        }
      } else if (artistFilter !== 'all' && track.artistGroupId !== artistFilter) {
        return false;
      }
      if (!q) return true;
      return (
        track.titleAr.toLowerCase().includes(q) ||
        track.seriesAr.toLowerCase().includes(q) ||
        track.artistAr.toLowerCase().includes(q) ||
        track.planetAr.toLowerCase().includes(q) ||
        track.channelAr.toLowerCase().includes(q)
      );
    });
  }, [catalogTracks, searchQuery, artistFilter]);

  const handleStepTrack = (delta: number) => {
    if (!activeTrack || filteredTracks.length === 0) return;
    const idx = filteredTracks.findIndex((t) => t.id === activeTrack.id);
    const nextIdx =
      idx === -1
        ? 0
        : (idx + delta + filteredTracks.length) % filteredTracks.length;
    setActiveTrack(filteredTracks[nextIdx]);
  };

  return (
    <div
      className="nl-cinema-root fixed inset-0 z-[10050] w-full h-[100dvh] text-white select-none overflow-hidden pointer-events-auto bg-slate-950"
      dir="rtl"
    >
      <LiquidGlassBooksBackdrop dimmerOpacity={0.55} />

      <div
        className="nl-cinema-scroll absolute inset-0 z-20 h-full w-full overflow-y-auto overflow-x-hidden overscroll-contain px-4 sm:px-8 pt-6 pb-28 pointer-events-auto"
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
      >
        {/* Minimal Clean Top Bar: Title + Search Input + Artist Filter Pills + Close X */}
        <header className="max-w-7xl mx-auto mb-7 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-lg sm:text-xl font-black tracking-tight text-white shrink-0">
              شارات ({catalogTracks.length})
            </span>

            <div className="relative flex-1 max-w-xl">
              <Search
                size={16}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن شارة، مسلسل، أو فنان (رشا رزق، طارق طرقان، هالة الصباغ، سامي كلارك...)"
                className="w-full pr-10 pl-4 py-2.5 rounded-2xl bg-white/[0.07] border border-white/15 focus:border-amber-400/70 text-xs sm:text-sm text-white placeholder:text-white/45 outline-none transition"
              />
            </div>

            <button
              type="button"
              onClick={() => navigateTo('home')}
              aria-label="إغلاق"
              className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition cursor-pointer shrink-0"
            >
              <X size={18} />
            </button>
          </div>

          {/* Artist Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {SHARAT_ARTIST_PILLS.map((pill) => {
              const active = artistFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setArtistFilter(pill.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition cursor-pointer ${
                    active
                      ? 'bg-amber-400 text-slate-950 shadow-md'
                      : 'bg-white/[0.07] hover:bg-white/15 text-white/85 border border-white/15'
                  }`}
                >
                  {pill.id === 'all' ? `الكل (${catalogTracks.length})` : pill.labelAr}
                </button>
              );
            })}
          </div>
        </header>

        {/* 1:1 Square Album-Brick Grid */}
        <main className="max-w-7xl mx-auto">
          <SharatSquareBrickGrid
            tracks={filteredTracks}
            activeTrackId={activeTrack?.id}
            onSelectTrack={setActiveTrack}
          />
        </main>
      </div>

      {/* Direct-Archive-First Ascended Player Workspace */}
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
