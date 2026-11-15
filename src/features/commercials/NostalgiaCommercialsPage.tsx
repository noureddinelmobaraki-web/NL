import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  X,
  Download,
  SkipForward,
  SkipBack,
  Tv,
  ExternalLink,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import type { CinemaItem } from '../../components/Movies/moviesDataClient';
import { MovieRow } from '../../components/Movies/MovieGridComponents';
import { useVirtualizedShelves } from '../../hooks/useVirtualizedShelves';
import { LiquidGlassBooksBackdrop } from '../liquid-glass/shared/LiquidGlassBooksBackdrop';
import { COMMERCIALS_SHELVES_CONFIG } from './catalog/commercialsShelvesConfig';
import {
  buildCommercialsShelfDefinitions,
  resolveCommercialClip,
  searchCommercialsArchive,
  type CommercialPlayableClip,
} from './services/commercialsArchiveService';

export interface NostalgiaCommercialsPageProps {
  onClose?: () => void;
}

export const NostalgiaCommercialsPage: React.FC<NostalgiaCommercialsPageProps> = ({
  onClose,
}) => {
  const { navigateTo } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CinemaItem[] | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [activeHoverId, setActiveHoverId] = useState<number | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Continuous TV Playlist state
  const [playlistQueue, setPlaylistQueue] = useState<CinemaItem[]>([]);
  const [activeClipIndex, setActiveClipIndex] = useState<number>(0);
  const [resolvedClip, setResolvedClip] = useState<CommercialPlayableClip | null>(null);
  const [useEmbedFallback, setUseEmbedFallback] = useState(false);

  const shelfDefs = useMemo(
    () => buildCommercialsShelfDefinitions(activeCategoryId),
    [activeCategoryId],
  );

  const { shelves, loadMoreShelfItems, sentinelRef } = useVirtualizedShelves<CinemaItem>({
    hub: `commercials-${activeCategoryId}`,
    shelfDefinitions: shelfDefs,
    initialVisibleShelves: 3,
    shelfBatchSize: 2,
    scrollRootRef: scrollContainerRef,
    getKey: (item) => item.archiveIds?.[0] || `comm:${item.id}`,
  });

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void searchCommercialsArchive(q).then((res) => {
        if (!cancelled) setSearchResults(res);
      });
    }, 320);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchQuery]);

  const activeClip = playlistQueue[activeClipIndex] || null;

  const startPlaylistFromShelf = useCallback(
    async (clickedItem: CinemaItem, shelfItems: CinemaItem[]) => {
      const queue = shelfItems.length > 0 ? shelfItems : [clickedItem];
      const startIdx = Math.max(
        0,
        queue.findIndex((i) => i.id === clickedItem.id),
      );
      setPlaylistQueue(queue);
      setActiveClipIndex(startIdx);
      setResolvedClip(null);
      setUseEmbedFallback(false);
      const resolved = await resolveCommercialClip(queue[startIdx]);
      setResolvedClip(resolved);
    },
    [],
  );

  const advancePlaylist = useCallback(
    async (delta: number) => {
      if (playlistQueue.length === 0) return;
      const nextIdx =
        (activeClipIndex + delta + playlistQueue.length) % playlistQueue.length;
      setActiveClipIndex(nextIdx);
      setResolvedClip(null);
      setUseEmbedFallback(false);
      const resolved = await resolveCommercialClip(playlistQueue[nextIdx]);
      setResolvedClip(resolved);
    },
    [playlistQueue, activeClipIndex],
  );

  const t = useCallback((key: string) => {
    if (key === 'movies.meta.watchNow') return 'Watch Spot';
    if (key === 'movies.meta.moreInfo') return 'Details';
    return '';
  }, []);

  const handleClose = () => {
    if (onClose) onClose();
    else navigateTo('home');
  };

  return (
    <div
      className="nl-cinema-root fixed inset-0 z-[10050] w-full h-[100dvh] text-white select-none overflow-hidden pointer-events-auto bg-slate-950"
      dir="ltr"
    >
      <LiquidGlassBooksBackdrop dimmerOpacity={0.58} />

      <div
        ref={scrollContainerRef}
        className="nl-cinema-scroll absolute inset-0 z-20 h-full w-full overflow-y-auto overflow-x-hidden overscroll-contain px-4 sm:px-8 pt-6 pb-28 pointer-events-auto"
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
      >
        {/* Minimal Clean Top Bar: Search + Filter Pills + Close X */}
        <header className="max-w-7xl mx-auto mb-8 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-xl">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search vintage TV commercials, 1950s–90s ads, bumpers, or drive-in reels..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/[0.07] border border-white/15 focus:border-amber-400/70 text-xs sm:text-sm text-white placeholder:text-white/45 outline-none transition"
              />
            </div>

            <button
              type="button"
              onClick={handleClose}
              aria-label="Close"
              className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition cursor-pointer shrink-0"
            >
              <X size={18} />
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: 'all', label: 'All Channels' },
              ...COMMERCIALS_SHELVES_CONFIG.map((s) => ({
                id: s.id,
                label: s.badgeText,
              })),
            ].map((pill) => {
              const active = activeCategoryId === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setActiveCategoryId(pill.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    active
                      ? 'bg-amber-400 text-slate-950 shadow-md'
                      : 'bg-white/[0.07] hover:bg-white/15 text-white/85 border border-white/15'
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>
        </header>

        {/* Orthogonal Commercials Shelves */}
        <main className="max-w-7xl mx-auto space-y-8">
          {searchResults ? (
            <MovieRow
              title={`Archive Commercial Results for "${searchQuery}"`}
              items={searchResults}
              isTouch={false}
              activeHoverId={activeHoverId}
              setActiveHoverId={setActiveHoverId}
              hoverTimer={hoverTimerRef}
              setSelectedItemId={(id: number) => {
                const found = searchResults.find((it) => it.id === id);
                if (found) void startPlaylistFromShelf(found, searchResults);
              }}
              onQuickWatch={(item: CinemaItem) =>
                void startPlaylistFromShelf(item, searchResults)
              }
              t={t}
              isFavoriteFn={() => false}
            />
          ) : (
            <>
              {shelves.map((shelf) => (
                <MovieRow
                  key={shelf.id}
                  title={shelf.title}
                  items={shelf.items}
                  isTouch={false}
                  activeHoverId={activeHoverId}
                  setActiveHoverId={setActiveHoverId}
                  hoverTimer={hoverTimerRef}
                  setSelectedItemId={(id: number) => {
                    const found = shelf.items.find((it) => it.id === id);
                    if (found) void startPlaylistFromShelf(found, shelf.items);
                  }}
                  onQuickWatch={(item: CinemaItem) =>
                    void startPlaylistFromShelf(item, shelf.items)
                  }
                  onReachEnd={() => void loadMoreShelfItems(shelf.id)}
                  t={t}
                  isFavoriteFn={() => false}
                />
              ))}
              <div ref={sentinelRef} className="h-12 w-full" />
            </>
          )}
        </main>
      </div>

      {/* Continuous TV Playlist Modal with Auto-Advance & MP4 Download */}
      {activeClip && (
        <div
          className="fixed inset-0 z-[10600] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-2xl"
          onClick={() => setPlaylistQueue([])}
        >
          <div
            className="relative w-full max-w-4xl rounded-3xl border border-white/25 bg-slate-950/95 p-5 sm:p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <Tv size={13} />
                  <span>
                    Continuous TV Mode · Spot {activeClipIndex + 1} of{' '}
                    {playlistQueue.length}
                  </span>
                </div>
                <h3 className="text-base sm:text-xl font-black text-white truncate mt-0.5">
                  {activeClip.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setPlaylistQueue([])}
                className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white cursor-pointer shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black border border-white/15">
              {!resolvedClip ? (
                <div className="h-full w-full flex items-center justify-center text-xs text-white/60">
                  Tuning archival broadcast stream...
                </div>
              ) : resolvedClip.directMp4Url && !useEmbedFallback ? (
                <video
                  key={resolvedClip.directMp4Url}
                  src={resolvedClip.directMp4Url}
                  poster={activeClip.posterPath}
                  controls
                  autoPlay
                  playsInline
                  onEnded={() => void advancePlaylist(1)}
                  onError={() => setUseEmbedFallback(true)}
                  className="h-full w-full object-contain"
                />
              ) : (
                <iframe
                  key={resolvedClip.embedUrl}
                  title={activeClip.title}
                  src={resolvedClip.embedUrl}
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  className="h-full w-full border-0"
                />
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void advancePlaylist(-1)}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <SkipBack size={14} />
                  <span>Prev Spot</span>
                </button>
                <button
                  type="button"
                  onClick={() => void advancePlaylist(1)}
                  className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Next Commercial</span>
                  <SkipForward size={14} />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {resolvedClip?.downloadMp4Url && (
                  <a
                    href={resolvedClip.downloadMp4Url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="nl-glass-download-capsule"
                  >
                    <Download size={13} className="nl-glass-download-icon" />
                    <span>Download MP4</span>
                  </a>
                )}
                {resolvedClip?.torrentUrl && (
                  <a
                    href={resolvedClip.torrentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="nl-glass-download-capsule"
                  >
                    <Download size={13} className="nl-glass-download-icon" />
                    <span>.Torrent</span>
                  </a>
                )}
                {resolvedClip?.detailsUrl && (
                  <a
                    href={resolvedClip.detailsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-white/80 text-xs font-semibold inline-flex items-center gap-1.5 transition"
                  >
                    <ExternalLink size={13} />
                    <span>Archive Source</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NostalgiaCommercialsPage;
