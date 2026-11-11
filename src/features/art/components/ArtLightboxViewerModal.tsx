import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, Download, ExternalLink, Landmark, User, Calendar, Layers } from 'lucide-react';
import type { ArtMuseumPiece } from '../types/art.types';
import { getMuseumBadgeLabel } from '../services/artMuseumService';
import { GlassVectorIcon } from '../../../components/shared/icons';

export interface ArtLightboxViewerModalProps {
  artwork: ArtMuseumPiece | null;
  onClose: () => void;
}

export const ArtLightboxViewerModal: React.FC<ArtLightboxViewerModalProps> = ({
  artwork,
  onClose,
}) => {
  const [zoom, setZoom] = useState(1);

  if (!artwork) return null;

  return (
    <div
      className="fixed inset-0 z-[120] bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="relative w-full max-w-6xl max-h-[92vh] rounded-3xl bg-slate-900/85 border border-white/25 shadow-2xl overflow-hidden flex flex-col lg:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Close & Zoom Controls */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.25).toFixed(2)))}
            className="p-2.5 rounded-full bg-slate-950/75 hover:bg-white/20 text-white border border-white/25 transition cursor-pointer"
            aria-label="Zoom in"
          >
            <ZoomIn size={17} />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))}
            className="p-2.5 rounded-full bg-slate-950/75 hover:bg-white/20 text-white border border-white/25 transition cursor-pointer"
            aria-label="Zoom out"
          >
            <ZoomOut size={17} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-full bg-rose-500/80 hover:bg-rose-500 text-white border border-white/30 transition cursor-pointer"
            aria-label="Close"
          >
            <X size={17} />
          </button>
        </div>

        {/* High-Resolution IIIF Canvas Frame */}
        <div className="flex-1 bg-black/80 flex items-center justify-center overflow-auto min-h-[300px] max-h-[60vh] lg:max-h-[92vh] p-4">
          <img
            src={artwork.highResUrl || artwork.imageUrl}
            alt={artwork.title}
            className="max-h-[82vh] w-auto object-contain rounded-xl transition-transform duration-300 select-none"
            style={{ transform: `scale(${zoom})` }}
          />
        </div>

        {/* Full Museum Metadata Side Panel */}
        <div className="w-full lg:w-96 p-6 bg-slate-950/90 border-t lg:border-t-0 lg:border-r border-white/15 flex flex-col justify-between gap-5 overflow-y-auto">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/15 border border-sky-400/35 text-sky-200 text-xs font-bold">
              <GlassVectorIcon icon={Landmark} theme="science" size={14} badge={false} />
              <span>{getMuseumBadgeLabel(artwork.source)}</span>
            </div>

            <h2 className="text-xl font-black text-white leading-snug">{artwork.title}</h2>

            <div className="space-y-2.5 pt-2 border-t border-white/10 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <GlassVectorIcon icon={User} theme="cosmic" size={14} badge={false} />
                <span className="text-slate-400">الفنان:</span>
                <span className="font-bold text-white">{artwork.artist}</span>
              </div>

              {artwork.dateDisplay && (
                <div className="flex items-center gap-2">
                  <GlassVectorIcon icon={Calendar} theme="comedy" size={14} badge={false} />
                  <span className="text-slate-400">التاريخ:</span>
                  <span className="font-semibold text-white">{artwork.dateDisplay}</span>
                </div>
              )}

              {artwork.mediumDisplay && (
                <div className="flex items-start gap-2">
                  <GlassVectorIcon icon={Layers} theme="emerald" size={14} badge={false} />
                  <span className="text-slate-400 shrink-0">الخامة:</span>
                  <span className="text-slate-200">{artwork.mediumDisplay}</span>
                </div>
              )}

              {artwork.dimensions && (
                <p className="text-[11px] text-slate-400">الأبعاد: {artwork.dimensions}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2.5 pt-4 border-t border-white/10">
            <a
              href={artwork.highResUrl || artwork.imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:brightness-110 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition"
            >
              <Download size={15} />
              <span>تحميل اللوحة بدقة المتاحف الكاملة (CC0)</span>
            </a>

            {artwork.externalUrl && (
              <a
                href={artwork.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition"
              >
                <ExternalLink size={14} />
                <span>صفحة الأرشيف الرسمي في المتحف</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
