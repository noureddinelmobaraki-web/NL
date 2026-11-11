/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Mobile & iOS Native-Like Bottom Sheet for Artwork / Drawing Inspection
 */

import React from 'react';
import { Download, ExternalLink, Palette, Share2, X } from 'lucide-react';
import type { ArtMuseumPiece } from '../../types/art.types';
import { useColorPaletteExtractor } from '../../hooks/useColorPaletteExtractor';

export interface ArtMobileInspectorSheetProps {
  piece: ArtMuseumPiece | null;
  onClose: () => void;
}

export const ArtMobileInspectorSheet: React.FC<
  ArtMobileInspectorSheetProps
> = ({ piece, onClose }) => {
  const palette = useColorPaletteExtractor(piece?.dominantHex || '#38bdf8');

  if (!piece) return null;

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: piece.title,
          text: `${piece.title} — ${piece.artist}`,
          url: piece.externalUrl || piece.highResUrl || piece.imageUrl,
        });
      } catch {
        // user cancelled share
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-[10150] flex flex-col justify-end bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 16px) + 16px)' }}
        className="w-full max-h-[88vh] overflow-y-auto rounded-t-3xl bg-slate-950 border-t border-white/15 p-4 space-y-4 shadow-2xl"
      >
        <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto" />

        <div className="flex items-center justify-between">
          <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-[11px] font-bold text-cyan-200">
            {piece.sourceLabel}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 text-white"
            aria-label="إغلاق"
          >
            <X size={16} />
          </button>
        </div>

        <div className="rounded-2xl overflow-hidden bg-black border border-white/10">
          <img
            src={piece.highResUrl || piece.imageUrl}
            alt={piece.title}
            className="w-full max-h-[46vh] object-contain mx-auto"
          />
        </div>

        <div>
          <h3 className="text-base font-black text-white">{piece.title}</h3>
          <p className="text-xs text-cyan-300 mt-0.5">{piece.artist}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {piece.dateDisplay} · {piece.mediumDisplay}
          </p>
        </div>

        {/* Color Harmony Strip */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
            <Palette size={13} className="text-cyan-400" />
            <span>تناغم الألوان المستخرج:</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {palette.swatches.map((sw) => (
              <div
                key={sw.hex}
                className="shrink-0 px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-1.5"
              >
                <span
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: sw.hex }}
                />
                <span className="text-[11px] font-bold text-white">
                  {sw.hex}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-2">
          <a
            href={piece.highResUrl || piece.imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-cyan-400 text-slate-950 font-black text-xs"
          >
            <Download size={14} />
            <span>حفظ بدقة فائقة</span>
          </a>

          {typeof navigator !== 'undefined' && 'share' in navigator ? (
            <button
              type="button"
              onClick={() => void handleNativeShare()}
              className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white/10 text-white font-bold text-xs"
            >
              <Share2 size={14} />
              <span>مشاركة سريعة</span>
            </button>
          ) : piece.externalUrl ? (
            <a
              href={piece.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white/10 text-white font-bold text-xs"
            >
              <ExternalLink size={14} />
              <span>المصدر</span>
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
};
