import { useRef } from "react";
import { useMeBitPrefetch } from "../MeBit/useMeBitPrefetch";
import { useCenterSpotlight } from "../../hooks/useCenterSpotlight";
import { useDeviceType } from "../../hooks/useDeviceType";
import { motion, Variants } from "framer-motion";
import { Maximize2 } from "lucide-react";
import { ASSETS, getThemedImage, getLocalAssetUrl } from "../../constants/assets";
import { ResponsiveImage } from "../ResponsiveImage";
import { LensGallery } from "../Lens/LensGallery";
import { audioManager } from "../../audio/audioManager";

const ME_BIT_IMAGES = ASSETS.profile.me_bits;

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: [0.175, 0.885, 0.32, 1.275] }
  }
};

export interface GallerySectionProps {
  resolvedTheme: string;
  isLensGalleryOpen: boolean;
  onGalleryOpen: (index?: number) => void;
  onLensOpen: () => void;
  onLensClose: () => void;
  onPrefetchMeBit?: () => void;
}

export const GallerySection = ({
  resolvedTheme,
  isLensGalleryOpen,
  onGalleryOpen,
  onLensOpen,
  onLensClose,
  onPrefetchMeBit,
}: GallerySectionProps) => {
  const ctaRef = useRef<HTMLDivElement>(null);
  const { ref: spotlightRef, isCentered } = useCenterSpotlight<HTMLDivElement>();
  const { isMobile } = useDeviceType();

  useMeBitPrefetch({
    ctaRef,
    isMobile,
    onPrefetch: onPrefetchMeBit || (() => {}),
  });

  return (
    <>
      {/* ME bit Interactive Gallery - Moved out of grid to be more prominent */}
      <motion.section 
        variants={itemVariants}
        className="flex flex-col gap-4 mt-8"
        id="me-bit-gallery"
      >
        <div className="flex justify-between items-end">
          <h2 className="font-manga text-fluid-section font-bold text-[var(--text-primary)] text-left tracking-wider">
            ME bit
          </h2>
        </div>
        <div className="manga-divider" />
        
        <div 
          ref={(node) => {
            ctaRef.current = node;
            spotlightRef.current = node;
          }}
          onClick={() => onGalleryOpen()}
          data-centered={isCentered ? 'true' : 'false'}
          className="me-bit-cta relative w-full border-[4px] border-[var(--ink-color)] bg-[var(--paper-color)] p-[10px] overflow-hidden group cursor-[zoom-in] shadow-[6px_6px_0px_var(--manga-shadow-color)] sm:shadow-[10px_10px_0px_var(--manga-shadow-color)] hover:shadow-[8px_8px_0px_var(--manga-shadow-color)] sm:hover:shadow-[14px_14px_0px_var(--manga-shadow-color)] transition-all h-[220px] sm:h-[260px] md:h-[280px] manga-panel"
        >
          {resolvedTheme === 'bit' && (
            <img
              src={getThemedImage('meBitPoster', resolvedTheme)}
              alt="ME BIT gallery thumbnail"
              className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none"
              style={{ imageRendering: 'pixelated' }}
            />
          )}
          <div className="me-bit-track flex gap-[10px]">
            {[...ME_BIT_IMAGES, ...ME_BIT_IMAGES].map((src, idx) => (
              <button 
                type="button"
                key={`${src}-${idx}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onGalleryOpen(idx % ME_BIT_IMAGES.length);
                }}
                className="inline-block h-[200px] sm:h-[240px] md:h-[250px] w-auto aspect-[3/4] shrink-0 border-[2px] border-black overflow-hidden relative group/item"
                aria-label={`Open photo ${idx + 1}`}
              >
                <ResponsiveImage 
                  src={src}
                  alt={`Me bit ${idx}`}
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 scale-110 group-hover:scale-100"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-black/20 group-hover/item:bg-transparent transition-colors" />
              </button>
            ))}
          </div>
          
          {/* أيقونة تكبير فقط — بلا أي نص */}
          <div className="me-bit-cta-glint absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <Maximize2 className="w-7 h-7 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)]" aria-hidden="true" />
          </div>
        </div>
      </motion.section>

      <motion.section
        variants={itemVariants}
        className="flex flex-col gap-4 mt-4"
        id="lens-section"
      >
        <div className="flex justify-between items-end">
          <h2 className="font-manga text-fluid-section font-bold text-[var(--text-primary)] tracking-wider">
            THROUGH THE LENS
          </h2>
        </div>
        <div className="manga-divider" />

        {/* Thumbnail trigger */}
        <div
          onClick={() => {
            audioManager.play('lens');
            onLensOpen();
          }}
          className="relative w-full border-[4px] border-[var(--ink-color)] bg-black overflow-hidden group cursor-pointer shadow-[10px_10px_0px_var(--manga-shadow-color)] hover:shadow-[14px_14px_0px_var(--manga-shadow-color)] transition-all h-[160px] sm:h-[200px]"
          role="button"
          aria-label="Open photography gallery"
          tabIndex={0}
          onKeyDown={e => { 
            if (e.key === 'Enter') {
              audioManager.play('lens');
              onLensOpen();
            }
          }}
        >
          {/* Background image */}
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-700 group-hover:scale-110 opacity-50 group-hover:opacity-70"
            style={{ backgroundImage: `url('${getThemedImage('photo', resolvedTheme)}')` }}
          />

          {/* Dark gradient overlay for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-[1]" />

          {/* Always-visible CTA — center of the card */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-[2]">
            <div className="w-16 h-16 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full bg-white/10 border-2 border-white/40 flex items-center justify-center group-hover:bg-white/20 group-hover:scale-110 transition-all duration-300 shadow-lg">
              <img 
                src={getLocalAssetUrl('lens.svg')} 
                className="w-8 h-8 sm:w-8 sm:h-8 md:w-10 md:h-10 object-contain" 
                style={{ filter: 'invert(1)' }} 
                alt="Lens icon" 
              />
            </div>
            <span className="md:hidden text-white/50 text-xs font-mono mb-1">Tap to view</span>
            <span className="font-manga text-white text-xl tracking-widest uppercase" style={{ textShadow: '2px 2px 0 #000' }}>
              Open Gallery
            </span>
            <span className="font-hand text-white/60 text-sm tracking-wider">
              {ASSETS.profile.lens.length} photos
            </span>
          </div>

          {/* Corner hint for desktop */}
          <div className="absolute bottom-3 right-4 z-[2] hidden sm:flex items-center gap-1 text-white/40 text-xs font-mono">
            <span>click to view</span>
          </div>
        </div>
      </motion.section>

      <LensGallery
        isOpen={isLensGalleryOpen}
        onClose={() => {
          audioManager.pause('lens');
          onLensClose();
        }}
      />
    </>
  );
};

export default GallerySection;
