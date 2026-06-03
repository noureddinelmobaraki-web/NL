import React, { memo, useState } from 'react';
import { PERSONAL_PHOTOS, PERSONAL_PHOTOS_CDN } from './personal-photos';

interface Props {
  scrollY: number;
  viewportHeight: number;
  totalBlockHeight: number;
  scaleFactor: number;
}

const PersonalPhotoFloaterInner: React.FC<Props> = ({ scrollY, viewportHeight, totalBlockHeight }) => {
  const [reducedMotion] = useState(() => 
    typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false
  );

  if (!totalBlockHeight) return null;

  const buffer = viewportHeight * 1.5; 
  const minY = Math.max(0, scrollY - buffer);
  const maxY = scrollY + viewportHeight + buffer;

  const startLoopIndex = Math.floor(minY / totalBlockHeight);
  const endLoopIndex = Math.floor(maxY / totalBlockHeight);

  // Define 5 relative vertical positions per loop, alternating left/right
  const CARD_CONFIGS = [
    { ratio: 0.15, side: 'left' as const, rot: '-5deg', xOffset: '3%' },
    { ratio: 0.35, side: 'right' as const, rot: '4deg', xOffset: '3%' },
    { ratio: 0.55, side: 'left' as const, rot: '-3deg', xOffset: '4%' },
    { ratio: 0.75, side: 'right' as const, rot: '6deg', xOffset: '4%' },
    { ratio: 0.90, side: 'left' as const, rot: '-4deg', xOffset: '3%' },
  ];

  const cardsToRender: Array<{
    key: string;
    top: number;
    side: 'left' | 'right';
    xOffset: string;
    rotation: string;
    photoIndex: number;
    caption: string;
  }> = [];

  for (let loop = startLoopIndex; loop <= endLoopIndex; loop++) {
    CARD_CONFIGS.forEach((config, cardIdx) => {
      const top = loop * totalBlockHeight + totalBlockHeight * config.ratio;
      // Fetch photo in a deterministic, repeating order so they are distinct
      const photoIndex = (loop * 5 + cardIdx) % PERSONAL_PHOTOS.length;
      
      cardsToRender.push({
        key: `card-${loop}-${cardIdx}`,
        top,
        side: config.side,
        xOffset: config.xOffset,
        rotation: reducedMotion ? '0deg' : config.rot,
        photoIndex,
        caption: `NL · ${26 + (loop % 5)}`,
      });
    });
  }

  return (
    <>
      <style>{`
        .personal-photo-card {
          position: absolute;
          z-index: 50;
          background-color: white;
          padding: 12px 12px 36px 12px;
          box-shadow: 5px 5px 0 #000, 10px 10px 0 #ff00ff;
          width: 230px;
          transition: transform 300ms ease-out;
        }
        .personal-photo-card:hover {
          transform: scale(1.08) rotate(0deg) !important;
          z-index: 999;
          box-shadow: 8px 8px 0 #000, 15px 15px 0 #00ffff;
        }
        @media (max-width: 1200px) {
          .personal-photo-card {
            width: 170px;
            padding: 9px 9px 28px 9px;
            box-shadow: 4px 4px 0 #000, 8px 8px 0 #ff00ff;
          }
        }
        @media (max-width: 768px) {
          .personal-photo-card {
            width: 110px;
            padding: 6px 6px 20px 6px;
            box-shadow: 3px 3px 0 #000, 6px 6px 0 #ff00ff;
          }
        }
        .personal-photo-caption {
          position: absolute;
          bottom: 10px;
          left: 0;
          right: 0;
          text-align: center;
          font-family: var(--font-manga, 'Comic Neue', cursive);
          font-size: 13px;
          font-weight: bold;
          color: #000;
          pointer-events: none;
        }
        @media (max-width: 768px) {
          .personal-photo-caption {
            font-size: 9px;
            bottom: 4px;
          }
        }
      `}</style>
      {cardsToRender.map(card => {
        const photo = PERSONAL_PHOTOS[card.photoIndex];
        if (!photo) return null;

        const style: React.CSSProperties = {
          top: `${card.top}px`,
          transform: `rotate(${card.rotation})`,
        };

        if (card.side === 'left') {
          style.left = card.xOffset;
        } else {
          style.right = card.xOffset;
        }

        return (
          <div
            key={card.key}
            className="personal-photo-card"
            style={style}
          >
            <img
              src={`${PERSONAL_PHOTOS_CDN}/${photo.file}`}
              alt={`Personal Retro ${card.photoIndex}`}
              loading="lazy"
              decoding="async"
              style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }}
            />
            <div className="personal-photo-caption">{card.caption}</div>
          </div>
        );
      })}
    </>
  );
};

export const PersonalPhotoFloater = memo(PersonalPhotoFloaterInner, (prev, next) => {
  return (
    prev.scrollY === next.scrollY &&
    prev.viewportHeight === next.viewportHeight &&
    prev.totalBlockHeight === next.totalBlockHeight &&
    prev.scaleFactor === next.scaleFactor
  );
});
