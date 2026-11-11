import React from 'react';
import { Palette } from 'lucide-react';
import type { ArtMuseumPiece } from '../types/art.types';
import { ArtGlassLargeCard } from './ArtGlassLargeCard';
import { GlassVectorIcon } from '../../../components/shared/icons';

export interface ArtGlassDualGridProps {
  items: ArtMuseumPiece[];
  loading: boolean;
  onSelectArtwork: (item: ArtMuseumPiece) => void;
}

export const ArtGlassDualGrid: React.FC<ArtGlassDualGridProps> = ({
  items,
  loading,
  onSelectArtwork,
}) => {
  if (loading) {
    return (
      <div className="art-glass-dual-grid" aria-busy="true">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="art-glass-large-card animate-pulse pointer-events-none"
          >
            <div className="art-glass-large-card__frame bg-white/5" />
            <div className="art-glass-large-card__caption">
              <div className="h-4 w-2/3 rounded bg-white/10" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center gap-3">
        <GlassVectorIcon icon={Palette} theme="cosmic" size={28} />
        <p className="text-base font-bold text-white">لم يتم العثور على لوحات مطابقة</p>
        <p className="text-xs text-slate-400">جرب البحث بكلمات فنية أخرى أو تغيير القسم الفني.</p>
      </div>
    );
  }

  return (
    <div className="art-glass-dual-grid">
      {items.map((item) => (
        <ArtGlassLargeCard key={item.id} item={item} onSelect={onSelectArtwork} />
      ))}
    </div>
  );
};
