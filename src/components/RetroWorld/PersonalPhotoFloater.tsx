import React, { useEffect, memo, useState } from 'react';
import { PERSONAL_PHOTOS, PERSONAL_PHOTOS_CDN } from './personal-photos';

const SWAP_DISTANCE_MULT = 1.8;
const HISTORY = Array.from({ length: 23 }, (_, i) => i);

export const getPhotoIndexForBlock = (blockIndex: number): number => {
  while (HISTORY.length <= blockIndex) {
    const recent = HISTORY.slice(-3);
    const pool = Array.from({ length: 23 }, (_, i) => i).filter(id => !recent.includes(id));
    const nextId = pool[Math.floor(Math.random() * pool.length)];
    HISTORY.push(nextId);
  }
  return HISTORY[blockIndex];
};

interface Props {
  scrollY: number;
  viewportHeight: number;
}

const PersonalPhotoFloaterInner: React.FC<Props> = ({ scrollY, viewportHeight }) => {
  const [reducedMotion] = useState(() => 
    typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false
  );

  const blockIndex = Math.floor(Math.max(0, scrollY) / (viewportHeight * SWAP_DISTANCE_MULT || 1));
  const photoIndex = getPhotoIndexForBlock(blockIndex);
  const nextPhotoIndex = getPhotoIndexForBlock(blockIndex + 1);
  const isEven = photoIndex % 2 === 0;

  const currentPhoto = PERSONAL_PHOTOS[photoIndex];
  const nextPhoto = PERSONAL_PHOTOS[nextPhotoIndex];

  useEffect(() => {
    if (!nextPhoto) return;
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'image';
    link.href = `${PERSONAL_PHOTOS_CDN}/${nextPhoto.file}`;
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, [nextPhoto]);

  const rotation = reducedMotion ? '0deg' : (isEven ? '-4deg' : '3.5deg');
  const yOffset = scrollY + viewportHeight * 0.25;

  return (
    <>
      <style>{`
        #personal-photo-floater {
          position: absolute;
          top: 0;
          z-index: 50;
          transition: ${reducedMotion ? 'none' : 'transform 600ms ease-out'};
          background-color: white;
          padding: 14px 14px 50px 14px;
          box-shadow: 6px 6px 0 #000, 12px 12px 0 #ff00ff;
          max-width: 260px;
        }
        @media (max-width: 768px) {
          #personal-photo-floater {
            max-width: 170px;
          }
        }
        .personal-photo-caption {
          position: absolute;
          bottom: 12px;
          left: 0;
          right: 0;
          text-align: center;
          font-family: var(--font-manga, 'Comic Neue', cursive);
          font-size: 14px;
          font-weight: bold;
          color: #000;
          pointer-events: none;
        }
      `}</style>
      <div
        id="personal-photo-floater"
        style={{
          left: isEven ? '6%' : undefined,
          right: !isEven ? '6%' : undefined,
          transform: `translateY(${yOffset}px) rotate(${rotation})`,
        }}
      >
        <img
          key={photoIndex}
          src={`${PERSONAL_PHOTOS_CDN}/${currentPhoto.file}`}
          alt="Personal Retro"
          loading="eager"
          decoding="async"
          // @ts-ignore
          fetchPriority="high"
          style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }}
        />
        <div className="personal-photo-caption">NL · 26</div>
      </div>
    </>
  );
};

export const PersonalPhotoFloater = memo(PersonalPhotoFloaterInner, (prev, next) => {
  const S_prev = prev.viewportHeight * SWAP_DISTANCE_MULT;
  const S_next = next.viewportHeight * SWAP_DISTANCE_MULT;

  const oldBlock = Math.floor(Math.max(0, prev.scrollY) / (S_prev || 1));
  const newBlock = Math.floor(Math.max(0, next.scrollY) / (S_next || 1));

  if (oldBlock === newBlock && prev.viewportHeight === next.viewportHeight) {
    const el = document.getElementById('personal-photo-floater');
    const prefersReducedMotion = typeof window !== 'undefined' 
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
      : false;
      
    if (el) {
      const photoIdx = getPhotoIndexForBlock(newBlock);
      const isEven = photoIdx % 2 === 0;
      const rotation = prefersReducedMotion ? '0deg' : (isEven ? '-4deg' : '3.5deg');
      const yOffset = next.scrollY + next.viewportHeight * 0.25;
      el.style.transform = `translateY(${yOffset}px) rotate(${rotation})`;
    }
    return true; // Skip re-render
  }
  return false;
});
