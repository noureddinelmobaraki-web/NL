import React, { useState, useEffect, useRef } from 'react';
import { RetroSection as RetroSectionType, RETRO_CDN } from './retro-data';

export interface ProcessedRetroSection extends RetroSectionType {
  numericHeight: number;
  originalHeight: number;
  offsetTop: number;
}

export const RetroSection: React.FC<{ section: ProcessedRetroSection, scaleFactor?: number }> = ({ section, scaleFactor = 1 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement | null>(null);
  
  const [reducedMotion] = useState(() => 
    typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (reducedMotion) {
          setIsVisible(false);
        } else {
          setIsVisible(entry.isIntersecting);
        }
      },
      {
        rootMargin: '3000px 0px 3000px 0px', // Large seamless buffer
        threshold: 0.01,
      }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [reducedMotion]);

  return (
    <div
      ref={elementRef}
      className="retro-section"
      style={{
        height: `${section.numericHeight}px`,
        backgroundImage: section.background_image
          ? `url(${RETRO_CDN}/${section.background_image})`
          : undefined,
        position: 'relative',
        overflow: 'hidden',
      }}
      data-section-id={section.id}
    >
      <div
        style={{
          position: 'absolute',
          width: '880px',
          height: `${section.originalHeight}px`,
          left: '50%',
          marginLeft: '-440px',
          top: 0,
          transform: scaleFactor < 1 ? `scale(${scaleFactor})` : 'none',
          transformOrigin: 'top center',
        }}
      >
        {section.graphics.map((g: any) => {
          const imgToShow = isVisible ? (g.ani_image || g.image) : (g.image || g.ani_image);
          const bgUrl = imgToShow ? `url(${RETRO_CDN}/${imgToShow})` : undefined;

          const style: React.CSSProperties = {
            width: g.width,
            height: g.height,
            left: g.left,
            top: g.top,
            right: g.right,
            bottom: g.bottom,
            backgroundImage: bgUrl,
            backgroundPosition: g['background-position'] || 'center',
            backgroundSize: g['background-size'] || 'auto',
            transform: g.transform,
            zIndex: g['z-index'] ? Number(g['z-index']) : undefined,
          };

          return (
            <div
              key={`g-${section.id}-${g.id}`}
              className="retro-graphic"
              style={style}
              data-graphic-id={g.id}
            />
          );
        })}
      </div>
    </div>
  );
};
