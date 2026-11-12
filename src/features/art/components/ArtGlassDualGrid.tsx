import React from 'react';
import { Sparkles, RefreshCw, PlusCircle } from 'lucide-react';
import type { ArtMuseumPiece } from '../types/art.types';
import { ArtGlassLargeCard } from './ArtGlassLargeCard';

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
  if (loading) {
    return (
      <div className="art-dual-grid" dir="rtl">
        {Array.from({ length: 12 }).map((_, idx) => (
          <div key={idx} className="art-skeleton-card" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="art-empty-state" dir="rtl">
        <Sparkles className="w-10 h-10 text-sky-300" />
        <h3 className="text-lg font-bold">لم يتم العثور على أعمال فنية مطابقة</h3>
        <p className="text-sm text-white/80 max-w-md">
          جرب البحث باسم فنان آخر (مثل Van Gogh أو Monet أو Hokusai) أو إعادة ضبط الفلاتر.
        </p>
        <button
          type="button"
          onClick={onResetFilters}
          className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/20 hover:bg-white/30 border border-white/35 text-sm font-semibold text-white transition cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>إعادة ضبط المعرض</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-8" dir="rtl">
      <div className="art-dual-grid">
        {items.map((item) => (
          <ArtGlassLargeCard key={item.id} item={item} onSelect={onSelect} />
        ))}
      </div>

      {onLoadMore && (
        <div className="flex justify-center pt-2 pb-6">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="inline-flex items-center gap-2.5 px-7 py-3 rounded-full bg-white/20 hover:bg-white/30 border border-white/40 text-sm font-bold text-white shadow-lg backdrop-blur-xl transition disabled:opacity-50 cursor-pointer"
          >
            {loadingMore ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-sky-200" />
                <span>جاري جلب المزيد من اللوحات والصور العالمية...</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4 text-sky-200" />
                <span>عرض المزيد من اللوحات والصور العالمية</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
