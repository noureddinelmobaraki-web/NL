/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { getBookArtisticPalette } from '../services/types';

export interface GlassPosterProps {
  title: string;
  author: string;
  coverUrl?: string;
  fallbackCoverUrl?: string;
  fallbackIcon: LucideIcon;
  frameClassName: string;
  imgClassName: string;
  fallbackClassName: string;
  onActivate: () => void;
  ariaLabel: string;
  children?: React.ReactNode;
}

export const GlassPoster: React.FC<GlassPosterProps> = ({
  title,
  author,
  coverUrl,
  fallbackCoverUrl,
  fallbackIcon: FallbackIcon,
  frameClassName,
  imgClassName,
  fallbackClassName,
  onActivate,
  ariaLabel,
  children,
}) => {
  const [c1, c2, c3] = getBookArtisticPalette(title + author);

  return (
    <div
      className={frameClassName}
      onClick={onActivate}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onActivate();
        }
      }}
    >
      {coverUrl ? (
        <img
          src={coverUrl}
          alt={title}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className={imgClassName}
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            if (fallbackCoverUrl && img.src !== fallbackCoverUrl) {
              img.src = fallbackCoverUrl;
            } else {
              img.style.display = 'none';
            }
          }}
        />
      ) : null}

      <div
        className={fallbackClassName}
        style={{
          background: `linear-gradient(145deg, ${c1} 0%, ${c2} 52%, ${c3} 100%)`,
        }}
      >
        <FallbackIcon size={26} className={`${fallbackClassName}__icon`} />
        <span className={`${fallbackClassName}__title`}>{title}</span>
        <span className={`${fallbackClassName}__author`}>{author}</span>
      </div>

      <span className="lg-main-glass__caustic" aria-hidden="true" />
      <span className="lg-main-glass__rim" aria-hidden="true" />
      <span className="lg-main-glass__sheen" aria-hidden="true" />

      {children}
    </div>
  );
};
