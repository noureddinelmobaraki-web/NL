import React from 'react';
import { Play, Music2 } from 'lucide-react';
import type { SharatTrack } from '../types/sharat.types';

interface SharatSquareBrickGridProps {
  tracks: SharatTrack[];
  activeTrackId?: string | null;
  onSelectTrack: (track: SharatTrack) => void;
}

export const SharatSquareBrickGrid: React.FC<SharatSquareBrickGridProps> = ({
  tracks,
  activeTrackId,
  onSelectTrack,
}) => {
  if (tracks.length === 0) {
    return (
      <div className="py-20 text-center text-white/60 text-sm">
        لا توجد شارات مطابقة لبحثك.
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5"
      dir="rtl"
    >
      {tracks.map((track) => {
        const isActive = activeTrackId === track.id;
        return (
          <button
            key={track.id}
            type="button"
            onClick={() => onSelectTrack(track)}
            className={`lg-album-brick group relative aspect-square w-full overflow-hidden rounded-2xl border text-right transition-all duration-300 cursor-pointer ${
              isActive
                ? 'border-amber-400/80 ring-2 ring-amber-400/40 scale-[1.02]'
                : 'border-white/15 hover:border-white/40 hover:-translate-y-1'
            } bg-slate-900/70 shadow-xl`}
          >
            <img
              src={track.posterUrl}
              alt={track.titleAr}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={(e) => {
                const img = e.currentTarget;
                if (!img.dataset.fallbackApplied) {
                  img.dataset.fallbackApplied = '1';
                  img.src =
                    'https://archive.org/services/img/20210811_20210811_2250';
                }
              }}
            />

            {/* Top Artist & Year Pill */}
            <div className="absolute top-2.5 right-2.5 left-2.5 flex items-center justify-between gap-1.5 pointer-events-none">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/65 backdrop-blur-md border border-white/20 text-[10px] font-bold text-amber-300 truncate">
                <Music2 size={10} />
                {track.artistAr}
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-black/60 text-[10px] font-semibold text-white/80">
                {track.year}
              </span>
            </div>

            {/* Hover Play Trigger */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="h-12 w-12 rounded-full bg-amber-400/95 text-slate-950 flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                <Play size={20} fill="currentColor" />
              </div>
            </div>

            {/* Bottom Glass Title Overlay */}
            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/95 via-black/75 to-transparent">
              <p className="text-xs sm:text-sm font-extrabold text-white line-clamp-1">
                {track.seriesAr}
              </p>
              <p className="text-[11px] text-white/75 line-clamp-1 mt-0.5">
                {track.titleAr}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
};
