import { useRef } from "react";
import { useMeBitPrefetch } from "../MeBit/useMeBitPrefetch";
import { useCenterSpotlight } from "../../hooks/useCenterSpotlight";
import { useDeviceType } from "../../hooks/useDeviceType";
import { m, Variants } from "framer-motion";
import { Maximize2 } from "lucide-react";
import { ASSETS, getThemedImage, getLocalAssetUrl } from "../../constants/assets";
import { ResponsiveImage } from "../ResponsiveImage";
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
  onGalleryOpen: (index?: number) => void;
  onLensOpen: () => void;
  onPrefetchMeBit?: () => void;
}

export const GallerySection = ({
  resolvedTheme,
  onGalleryOpen,
  onLensOpen,
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
      {/* ME bit Interactive Gallery - 3D Liquid Glass */}
      <m.section 
        variants={itemVariants}
        className="flex flex-col gap-4 mt-8"
        id="me-bit-gallery"
      >
        <div className="flex justify-between items-end">
          <h2 className="nl-lc-badge font-manga text-fluid-section font-bold text-[var(--lc-text-main)] text-left tracking-wider">
            ■ ME bit
          </h2>
        </div>
        
        <div 
          ref={(node) => {
            ctaRef.current = node;
            spotlightRef.current = node;
          }}
          onClick={() => onGalleryOpen()}
          data-centered={isCentered ? 'true' : 'false'}
          className="me-bit-cta nl-liquid-interactive relative w-full p-[12px] overflow-hidden group cursor-[zoom-in] transition-all h-[220px] sm:h-[260px] md:h-[280px] manga-panel"
        >
          {resolvedTheme === 'bit' && (
            <img
              src={getThemedImage('meBitPoster', resolvedTheme)}
              alt="ME BIT gallery thumbnail"
              className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none rounded-[20px]"
              style={{ imageRendering: 'pixelated' }}
            />
          )}
          <div className="me-bit-track flex gap-[12px] relative z-[2]">
            {[...ME_BIT_IMAGES, ...ME_BIT_IMAGES].map((src, idx) => (
              <button 
                type="button"
                key={`${src}-${idx}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onGalleryOpen(idx % ME_BIT_IMAGES.length);
                }}
                className="nl-me-bit-thumb inline-block h-[196px] sm:h-[236px] md:h-[252px] w-auto aspect-[3/4] shrink-0 overflow-hidden relative group/item"
                aria-label={`Open photo ${idx + 1}`}
              >
                <ResponsiveImage 
                  src={src}
                  alt={`Me bit ${idx}`}
                  className="w-full h-full object-cover grayscale-[35%] group-hover:grayscale-0 transition-all duration-500 scale-105 group-hover:scale-100 rounded-[14px]"
                  loading="lazy"
                  decoding="async"
                />
                <div className="nl-me-bit-thumb__sheen absolute inset-0 pointer-events-none" />
              </button>
            ))}
          </div>
          
          {/* أيقونة تكبير زجاجية عائمة */}
          <div className="me-bit-cta-glint absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <span className="nl-gallery-orb-btn">
              <Maximize2 className="w-6 h-6 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)]" aria-hidden="true" />
            </span>
          </div>
        </div>
      </m.section>

      <m.section
        variants={itemVariants}
        className="flex flex-col gap-4 mt-4"
        id="lens-section"
      >
        <div className="flex justify-between items-end">
          <h2 className="nl-lc-badge font-manga text-fluid-section font-bold text-[var(--lc-text-main)] tracking-wider">
            ■ THROUGH THE LENS
          </h2>
        </div>

        {/* Thumbnail trigger — 3D Liquid Glass */}
        <div
          onClick={() => {
            audioManager.play('lens');
            onLensOpen();
          }}
          className="nl-lens-cta nl-liquid-interactive relative w-full overflow-hidden group cursor-pointer transition-all h-[180px] sm:h-[220px]"
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
            className="nl-lens-cta__bg absolute inset-0 bg-cover bg-center transition-all duration-700 group-hover:scale-105 opacity-75 group-hover:opacity-95"
            style={{ backgroundImage: `url('${getThemedImage('photo', resolvedTheme)}')` }}
          />

          {/* Liquid glass sheen & dark bottom vignette */}
          <div className="nl-lens-cta__scrim absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-white/10 z-[1]" />

          {/* Always-visible CTA — center of the card */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 z-[2]">
            <div className="nl-gallery-orb-btn w-16 h-16 md:w-20 md:h-20 group-hover:scale-110 transition-all duration-300">
              <img 
                src={getLocalAssetUrl('lens.svg')} 
                className="w-8 h-8 md:w-10 md:h-10 object-contain" 
                style={{ filter: 'invert(1)' }} 
                alt="Lens icon" 
              />
            </div>
            <span className="md:hidden text-white/75 text-xs font-mono">Tap to view</span>
            <span className="font-manga text-white text-xl tracking-widest uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.75)]">
              Open Gallery
            </span>
            <span className="nl-lc-badge !py-1 !px-3 font-hand text-white/90 text-xs tracking-wider">
              {ASSETS.profile.lens.length} photos
            </span>
          </div>

          {/* Corner hint for desktop */}
          <div className="absolute bottom-3 right-4 z-[2] hidden sm:flex items-center gap-1 text-white/65 text-xs font-mono">
            <span>click to view</span>
          </div>
        </div>
      </m.section>

    </>
  );
};

export default GallerySection;
