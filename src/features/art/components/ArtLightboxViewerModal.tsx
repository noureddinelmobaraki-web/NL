import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  Download,
  ExternalLink,
} from 'lucide-react';
import type { ArtMuseumPiece } from '../types/art.types';
import { getMuseumBadgeLabel } from '../services/artMuseumService';

export interface ArtLightboxViewerModalProps {
  artwork: ArtMuseumPiece | null;
  onClose: () => void;
}

/**
 * 100% Fullscreen Edge-to-Edge Lightbox (`fixed inset-0 z-[10500] w-screen h-[100dvh] bg-black/95`)
 * with windowless floating golden typography (`#f5d061`) that fades out when idle.
 */
export const ArtLightboxViewerModal: React.FC<ArtLightboxViewerModalProps> = ({
  artwork,
  onClose,
}) => {
  const [zoom, setZoom] = useState(1);
  const [hudVisible, setHudVisible] = useState(true);
  const idleTimerRef = useRef<number | null>(null);

  const wakeHud = () => {
    setHudVisible(true);
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = window.setTimeout(() => {
      setHudVisible(false);
    }, 2600);
  };

  useEffect(() => {
    if (!artwork) return;
    setZoom(1);
    wakeHud();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
  }, [artwork, onClose]);

  if (!artwork) return null;

  return (
    <div
      className="fixed inset-0 z-[10500] w-screen h-[100dvh] bg-black/95 flex items-center justify-center overflow-hidden select-none"
      dir="ltr"
      onPointerMove={wakeHud}
      onClick={onClose}
    >
      {/* Edge-to-Edge Fullscreen High-Res Canvas */}
      <img
        src={artwork.highResUrl || artwork.imageUrl}
        alt={artwork.title}
        onClick={(e) => {
          e.stopPropagation();
          wakeHud();
        }}
        className="max-w-[96vw] max-h-[94dvh] w-auto h-auto object-contain transition-transform duration-300"
        style={{ transform: `scale(${zoom})` }}
      />

      {/* Top-Right Floating Controls */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`fixed top-5 right-6 z-20 flex items-center gap-2.5 transition-opacity duration-500 ${
          hudVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(3, +(z + 0.3).toFixed(2)))}
          aria-label="Zoom in"
          className="h-10 w-10 rounded-full bg-black/50 hover:bg-black/80 text-[#f5d061] border border-[#f5d061]/35 flex items-center justify-center transition cursor-pointer"
        >
          <ZoomIn size={18} />
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(1, +(z - 0.3).toFixed(2)))}
          aria-label="Zoom out"
          className="h-10 w-10 rounded-full bg-black/50 hover:bg-black/80 text-[#f5d061] border border-[#f5d061]/35 flex items-center justify-center transition cursor-pointer"
        >
          <ZoomOut size={18} />
        </button>
        <a
          href={artwork.highResUrl || artwork.imageUrl}
          target="_blank"
          rel="noopener noreferrer"
          download
          aria-label="Download High-Res Masterpiece"
          className="h-10 px-4 rounded-full bg-black/55 hover:bg-black/80 text-[#f5d061] border border-[#f5d061]/45 text-xs font-bold inline-flex items-center gap-1.5 transition"
        >
          <Download size={15} />
          <span>Download CC0</span>
        </a>
        {artwork.externalUrl && (
          <a
            href={artwork.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Museum Source"
            className="h-10 w-10 rounded-full bg-black/50 hover:bg-black/80 text-[#f5d061] border border-[#f5d061]/35 flex items-center justify-center transition"
          >
            <ExternalLink size={16} />
          </a>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="h-10 w-10 rounded-full bg-black/60 hover:bg-black/85 text-white border border-white/30 flex items-center justify-center transition cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      {/* Windowless Floating Golden Typography Overlay (Zero Card/Box Frame) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`fixed bottom-7 left-7 right-7 z-20 pointer-events-none flex flex-col items-start gap-1 transition-opacity duration-500 ${
          hudVisible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          textShadow: '0 2px 18px rgba(0,0,0,0.95), 0 1px 4px rgba(0,0,0,0.9)',
        }}
      >
        <span className="text-[11px] uppercase tracking-[0.22em] font-bold text-[#f5d061]/85">
          {getMuseumBadgeLabel(artwork.source)}
        </span>
        <h2 className="text-xl sm:text-3xl font-serif font-bold text-[#f5d061] tracking-wide max-w-4xl">
          {artwork.title}
        </h2>
        <p className="text-xs sm:text-sm font-medium text-[#f5d061]/90">
          {artwork.artist}
          {artwork.dateDisplay ? ` · ${artwork.dateDisplay}` : ''}
          {artwork.mediumDisplay ? ` · ${artwork.mediumDisplay}` : ''}
          {artwork.dimensions ? ` · ${artwork.dimensions}` : ''}
        </p>
      </div>
    </div>
  );
};
