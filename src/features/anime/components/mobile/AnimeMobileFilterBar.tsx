/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import React, { useRef } from 'react';
import { Search, X, Image as ImageIcon } from 'lucide-react';
import type { AnimeCategoryFilter } from '../../types/anime.types';

interface AnimeMobileFilterBarProps {
  activeCategory: AnimeCategoryFilter;
  onSelectCategory: (cat: AnimeCategoryFilter) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSceneUpload: (file: File) => void;
  isSearchingScene: boolean;
}

const MOBILE_CATEGORIES: Array<{ id: AnimeCategoryFilter; label: string }> = [
  { id: 'all', label: 'الكل' },
  { id: 'arabic_dub', label: 'مدبلج ومترجم' },
  { id: 'trending', label: 'الرائج' },
  { id: 'seasonal', label: 'الموسم' },
  { id: 'top_rated', label: 'الأعلى تقييماً' },
  { id: 'movies', label: 'أفلام' },
];

export const AnimeMobileFilterBar: React.FC<AnimeMobileFilterBarProps> = ({
  activeCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  onSceneUpload,
  isSearchingScene,
}) => {
  const fileRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="flex flex-col gap-2.5 px-3 pt-2">
      {/* Search + Scene Image Input */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ابحث عن أنمي..."
            className="w-full h-11 pr-9 pl-8 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-red-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="مسح البحث"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-400"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onSceneUpload(f);
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label="بحث بصورة مشهد"
          className="min-h-[44px] min-w-[44px] px-3 rounded-xl bg-white/[0.06] border border-white/10 text-xs font-semibold text-white flex items-center justify-center gap-1.5 shrink-0"
        >
          <ImageIcon size={16} className="text-red-400" />
          <span>{isSearchingScene ? '...' : 'مشهد'}</span>
        </button>
      </div>

      {/* Swipeable Category Filter Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
        {MOBILE_CATEGORIES.map((cat) => {
          const active = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`min-h-[40px] px-4 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
                active
                  ? 'bg-red-600 text-white'
                  : 'bg-white/[0.05] text-slate-300 border border-white/10'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
