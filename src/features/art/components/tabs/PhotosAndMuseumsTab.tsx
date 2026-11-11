/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Tab 1: Photos & World Museums (Chicago IIIF, Met Museum, Cleveland Open Access, NL Lens, Lorem Picsum)
 */

import React from 'react';
import {
  Camera,
  ExternalLink,
  Landmark,
  RefreshCw,
  Search,
  Sliders,
  ZoomIn,
} from 'lucide-react';
import type { ArtMuseumPiece, MuseumSourceId } from '../../types/art.types';
import { buildCustomPicsumUrl } from '../../services/photographyClient';

export interface PhotosAndMuseumsTabProps {
  activeSource: MuseumSourceId;
  onSelectSource: (src: MuseumSourceId) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  pieces: ArtMuseumPiece[];
  loading: boolean;
  onInspectPiece: (piece: ArtMuseumPiece) => void;
  picsumBlur: number;
  onPicsumBlurChange: (val: number) => void;
  picsumGrayscale: boolean;
  onPicsumGrayscaleChange: (val: boolean) => void;
}

const MUSEUM_SOURCES: Array<{
  id: MuseumSourceId;
  label: string;
  badge: string;
}> = [
  { id: 'all', label: 'كل المتاحف والصور', badge: 'Unified' },
  { id: 'nl-lens', label: 'عدسة الفنان NL Lens', badge: 'Original' },
  { id: 'chicago', label: 'معهد شيكاغو (IIIF)', badge: 'Deep Zoom' },
  { id: 'cleveland', label: 'متحف كليفلاند', badge: 'Open Access' },
  { id: 'met', label: 'متحف المتروبوليتان NYC', badge: 'The Met' },
  { id: 'picsum', label: 'صور فوتوغرافية Picsum', badge: 'Filters' },
];

export const PhotosAndMuseumsTab: React.FC<PhotosAndMuseumsTabProps> = ({
  activeSource,
  onSelectSource,
  searchQuery,
  onSearchChange,
  pieces,
  loading,
  onInspectPiece,
  picsumBlur,
  onPicsumBlurChange,
  picsumGrayscale,
  onPicsumGrayscaleChange,
}) => {
  return (
    <div className="space-y-5">
      {/* Top Filter & Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-2xl bg-slate-900/75 border border-white/10 p-3.5 backdrop-blur-xl">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
          {MUSEUM_SOURCES.map((src) => {
            const active = activeSource === src.id;
            return (
              <button
                key={src.id}
                type="button"
                onClick={() => onSelectSource(src.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                  active
                    ? 'bg-cyan-500/25 border border-cyan-400/50 text-cyan-200 shadow-lg shadow-cyan-500/10'
                    : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                {src.id === 'nl-lens' || src.id === 'picsum' ? (
                  <Camera size={13} />
                ) : (
                  <Landmark size={13} />
                )}
                <span>{src.label}</span>
                <span className="px-1.5 py-0.5 rounded-md bg-black/30 text-[10px] text-slate-400">
                  {src.badge}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative min-w-[240px] sm:min-w-[290px]">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ابحث عن لوحة أو فنان (Van Gogh, Monet, Portrait)..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white placeholder:text-slate-400 outline-none focus:border-cyan-400/60"
          />
        </div>
      </div>

      {/* Picsum Live Filter Controls when Picsum is active */}
      {activeSource === 'picsum' && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-cyan-950/30 border border-cyan-400/25 p-3.5 text-xs text-cyan-100">
          <div className="flex items-center gap-2 font-bold">
            <Sliders size={15} className="text-cyan-400" />
            <span>معمل فلاتر الصور الفوتوغرافية الحية (Picsum Studio):</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2">
              <span>درجة الضبابية (Blur: {picsumBlur}):</span>
              <input
                type="range"
                min={0}
                max={10}
                value={picsumBlur}
                onChange={(e) => onPicsumBlurChange(Number(e.target.value))}
                className="accent-cyan-400 cursor-pointer"
              />
            </label>
            <button
              type="button"
              onClick={() => onPicsumGrayscaleChange(!picsumGrayscale)}
              className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer border ${
                picsumGrayscale
                  ? 'bg-cyan-400 text-slate-950 border-cyan-300'
                  : 'bg-white/10 text-white border-white/15'
              }`}
            >
              {picsumGrayscale ? 'التدرج الرمادي: مفعّل' : 'تفعيل التدرج الرمادي (B&W)'}
            </button>
          </div>
        </div>
      )}

      {/* Artworks & Photography Masonry Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-cyan-200">
          <RefreshCw size={20} className="animate-spin" />
          <span className="text-sm font-semibold">
            جاري جلب اللوحات والصور عالية الدقة من المتاحف العالمية...
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {pieces.map((piece) => {
            const displayImg =
              piece.source === 'picsum' && (picsumBlur > 0 || picsumGrayscale)
                ? buildCustomPicsumUrl({
                    picsumId: piece.id,
                    width: 800,
                    height: 600,
                    blur: picsumBlur,
                    grayscale: picsumGrayscale,
                  })
                : piece.imageUrl;

            return (
              <div
                key={piece.id}
                onClick={() => onInspectPiece(piece)}
                className="group relative flex flex-col overflow-hidden rounded-2xl bg-slate-900/80 border border-white/10 hover:border-cyan-400/50 transition-all duration-300 cursor-pointer shadow-xl"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-950">
                  <img
                    src={displayImg}
                    alt={piece.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
                  <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-[10px] font-bold text-cyan-200">
                    {piece.sourceLabel}
                  </span>
                  <button
                    type="button"
                    className="absolute bottom-2.5 right-2.5 p-2 rounded-full bg-cyan-500/80 text-slate-950 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    aria-label="تكبير اللوحة"
                  >
                    <ZoomIn size={15} />
                  </button>
                </div>

                <div className="p-3.5 flex-1 flex flex-col justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white line-clamp-1">
                      {piece.title}
                    </h3>
                    <p className="text-xs text-slate-300 line-clamp-1 mt-0.5">
                      {piece.artist}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/10">
                    <span className="truncate max-w-[160px]">
                      {piece.dateDisplay}
                    </span>
                    {piece.externalUrl && (
                      <a
                        href={piece.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-cyan-300 hover:underline"
                      >
                        <span>المصدر</span>
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
