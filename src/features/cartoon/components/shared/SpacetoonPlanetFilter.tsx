/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import React from 'react';
import type { PlanetFilterInfo } from '../../services/spacetoonArchiveRegistry';
import type {
  DubbingStudioTag,
  SpacetoonPlanetId,
} from '../../types/cartoon.types';

interface SpacetoonPlanetFilterProps {
  planets: PlanetFilterInfo[];
  selectedPlanet: SpacetoonPlanetId;
  onSelectPlanet: (planet: SpacetoonPlanetId) => void;
  selectedStudio: DubbingStudioTag | 'all';
  onSelectStudio: (studio: DubbingStudioTag | 'all') => void;
  compact?: boolean;
}

const STUDIOS: Array<{ id: DubbingStudioTag | 'all'; label: string }> = [
  { id: 'all', label: 'كل الاستوديوهات' },
  { id: 'مركز الزهرة', label: 'مركز الزهرة' },
  { id: 'سبيستون', label: 'سبيستون' },
  { id: 'سبيس باور', label: 'سبيس باور' },
  { id: 'دبلجة أردنية / خليجية', label: 'دبلجة أردنية وخليجية' },
  { id: 'كرتون زمان (الثمانينات)', label: 'كرتون زمان (الثمانينات)' },
  { id: 'أنيميشن عالمي', label: 'أنيميشن عالمي' },
];

export const SpacetoonPlanetFilter: React.FC<SpacetoonPlanetFilterProps> = ({
  planets,
  selectedPlanet,
  onSelectPlanet,
  selectedStudio,
  onSelectStudio,
  compact = false,
}) => {
  return (
    <div className="flex flex-col gap-2.5">
      {/* 10 Spacetoon Planets Segmented Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
        {planets.map((p) => {
          const active = selectedPlanet === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectPlanet(p.id)}
              className={`px-4 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                compact ? 'min-h-[42px]' : 'py-2.5'
              } ${
                active
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-white/[0.05] text-slate-200 border border-white/10 hover:bg-white/10'
              }`}
            >
              {p.labelAr}
            </button>
          );
        })}
      </div>

      {/* Dubbing Studios Secondary Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
        {STUDIOS.map((st) => {
          const active = selectedStudio === st.id;
          return (
            <button
              key={st.id}
              type="button"
              onClick={() => onSelectStudio(st.id)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                active
                  ? 'bg-white/20 text-amber-300 border border-amber-400/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
