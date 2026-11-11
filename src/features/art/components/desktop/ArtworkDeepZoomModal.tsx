/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Desktop IIIF Deep Zoom & Color Harmony Inspector Modal
 */

import React, { useState } from 'react';
import {
  Download,
  ExternalLink,
  Palette,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { ArtMuseumPiece } from '../../types/art.types';
import { useColorPaletteExtractor } from '../../hooks/useColorPaletteExtractor';

export interface ArtworkDeepZoomModalProps {
  piece: ArtMuseumPiece | null;
  onClose: () => void;
}

export const ArtworkDeepZoomModal: React.FC<ArtworkDeepZoomModalProps> = ({
  piece,
  onClose,
}) => {
  const [zoom, setZoom] = useState(1);
  const palette = useColorPaletteExtractor(piece?.dominantHex || '#38bdf8');

  if (!piece) return null;

  return (
    <div
      className="fixed inset-0 z-[10150] flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-6xl max-h-[90vh] grid grid-cols-1 lg:grid-cols-12 overflow-hidden rounded-3xl bg-slate-950/95 border border-white/15 shadow-2xl"
      >
        {/* Deep Zoom Viewport */}
        <div className="lg:col-span-8 relative flex items-center justify-center overflow-auto bg-black min-h-[380px] sm:min-h-[540px] p-4">
          <img
            src={piece.highResUrl || piece.imageUrl}
            alt={piece.title}
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
            }}
            className="max-h-[76vh] w-auto object-contain transition-transform duration-200 rounded-lg shadow-2xl"
          />

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900/90 border border-white/15 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(1, Number((z - 0.25).toFixed(2))))}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              title="تصغير"
            >
              <ZoomOut size={15} />
            </button>
            <span className="text-xs font-bold text-cyan-200 min-w-[48px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3.5, Number((z + 0.25).toFixed(2))))}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              title="تكبير فائق IIIF"
            >
              <ZoomIn size={15} />
            </button>
          </div>
        </div>

        {/* Metadata & Color Harmony Inspector */}
        <div className="lg:col-span-4 flex flex-col justify-between p-6 overflow-y-auto space-y-5 bg-slate-900/90 border-l border-white/10">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <span className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-xs font-bold text-cyan-200">
                {piece.sourceLabel}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                aria-label="إغلاق"
              >
                <X size={16} />
              </button>
            </div>

            <div>
              <h2 className="text-xl font-black text-white leading-snug">
                {piece.title}
              </h2>
              <p className="text-sm font-semibold text-cyan-300 mt-1">
                {piece.artist}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {piece.dateDisplay} · {piece.mediumDisplay}
              </p>
            </div>

            {/* Extracted Color Harmony from The Color API */}
            <div className="pt-3 border-t border-white/10 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <Palette size={14} className="text-cyan-400" />
                <span>الباليتة اللونية المتناغمة (The Color API):</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {palette.swatches.map((sw) => (
                  <div
                    key={sw.hex + sw.name}
                    className="p-2 rounded-xl bg-black/40 border border-white/10 text-center"
                  >
                    <div
                      className="w-full h-7 rounded-lg mb-1 border border-white/15"
                      style={{ backgroundColor: sw.hex }}
                    />
                    <div className="text-[11px] font-bold text-white">
                      {sw.hex}
                    </div>
                    <div className="text-[9px] text-slate-400 truncate">
                      {sw.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 pt-4 border-t border-white/10">
            <a
              href={piece.highResUrl || piece.imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-400 text-slate-950 font-black text-xs cursor-pointer"
            >
              <Download size={15} />
              <span>فتح / تحميل الدقة الفائقة (Master Print)</span>
            </a>

            {piece.externalUrl && (
              <a
                href={piece.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white"
              >
                <ExternalLink size={14} />
                <span>صفحة الأرشيف الرسمي للمتحف</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
