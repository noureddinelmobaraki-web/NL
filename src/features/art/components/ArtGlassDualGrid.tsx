import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, RefreshCw, PlusCircle } from 'lucide-react';
import type { ArtMuseumPiece } from '../types/art.types';
import { ArtGlassLargeCard } from './ArtGlassLargeCard';

const PAGE_SIZE = 18;

export interface ArtGlassDualGridProps {
  items: ArtMuseumPiece[];
  loading: boolean;
  loadingMore?: boolean;
  onSelect: (item: ArtMuseumPiece) => void;
  onResetFilters: () => void;
  onLoadMore?: () => void;
}

export const ArtGlassDualGrid: React.FC<ArtGlassDualGridProps> = ({
  items,
  loading,
  loadingMore = false,
  onSelect,
  onResetFilters,
  onLoadMore,
}) => {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [items.length === 0]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        setVisibleCount((prev) => {
          if (prev < items.length) {
            return prev + PAGE_SIZE;
          }
          if (onLoadMore && !loadingMore) {
            onLoadMore();
          }
          return prev;
        });
      },
      { rootMargin: '600px 0px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [items.length, loadingMore, onLoadMore]);

  if (loading) {
    return (
      <div className="art-dual-grid" dir="ltr">
        {Array.from({ length: 12 }).map((_, idx) => (
          <div key={idx} className="art-skeleton-card" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="art-empty-state" dir="ltr">
        <Sparkles className="w-10 h-10 text-sky-300" />
        <h3 className="text-lg font-bold">No matching artworks found</h3>
        <p className="text-sm text-white/80 max-w-md">
          Try searching for another artist (such as Van Gogh, Monet, or Hokusai) or reset your museum filters.
        </p>
        <button
          type="button"
          onClick={onResetFilters}
          className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/20 hover:bg-white/30 border border-white/35 text-sm font-semibold text-white transition cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Reset Gallery Filters</span>
        </button>
      </div>
    );
  }

  const slicedItems = items.slice(0, visibleCount);

  return (
    <div className="flex flex-col gap-6 pb-8" dir="ltr">
      <div className="art-dual-grid">
        {slicedItems.map((item) => (
          <ArtGlassLargeCard key={item.id} item={item} onSelect={onSelect} />
        ))}
      </div>

      <div ref={sentinelRef} className="h-4 w-full" />

      {onLoadMore && (
        <div className="flex justify-center pt-2 pb-6">
          <button
            type="button"
            onClick={() => {
              if (visibleCount < items.length) {
                setVisibleCount((v) => v + PAGE_SIZE);
              } else {
                onLoadMore();
              }
            }}
            disabled={loadingMore}
            className="inline-flex items-center gap-2.5 px-7 py-3 rounded-full bg-white/20 hover:bg-white/30 border border-white/40 text-sm font-bold text-white shadow-lg backdrop-blur-xl transition disabled:opacity-50 cursor-pointer"
          >
            {loadingMore ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-sky-200" />
                <span>Loading more world masterpieces...</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4 text-sky-200" />
                <span>Load More Artworks</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
