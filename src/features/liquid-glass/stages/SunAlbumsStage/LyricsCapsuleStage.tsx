/**
 * src/features/liquid-glass/stages/SunAlbumsStage/LyricsCapsuleStage.tsx
 *
 * iOS 26 Diagonal 3-Capsule Synced Lyrics Stage (strictly 2 lines) + Expressive Icons.
 */

import React from 'react';
import { X } from 'lucide-react';
import type { LiquidGlassAlbum, LiquidGlassTrack } from '../../albumsData';

export const LyricsExpressiveIcon = React.memo(function LyricsExpressiveIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 6h11" />
      <path d="M4 12h9" />
      <path d="M4 18h7" />
      <path d="M18 15a2.5 2.5 0 1 0 2.5 2.5V7l2.5 1.5" />
    </svg>
  );
});

export const YoutubeExpressiveIcon = React.memo(function YoutubeExpressiveIcon({
  active,
}: {
  active: boolean;
}) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="2"
        y="4.5"
        width="20"
        height="15"
        rx="4.5"
        stroke="currentColor"
        strokeWidth="2"
        fill={active ? 'rgba(255, 70, 70, 0.25)' : 'none'}
      />
      <path d="M10 9.2L15.2 12L10 14.8V9.2Z" fill="currentColor" />
      {!active && (
        <line
          x1="3.5"
          y1="3.5"
          x2="20.5"
          y2="20.5"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
});

export interface LyricsCapsuleStageProps {
  album: LiquidGlassAlbum;
  track: LiquidGlassTrack;
  lyricsLoading: boolean;
  hasLines: boolean;
  activeLyricIndex: number;
  currentPrimaryLyric: string;
  currentSecondaryLyric: string;
  lineKaraokeRatio: number;
  onClose: () => void;
}

export const LyricsCapsuleStage: React.FC<LyricsCapsuleStageProps> = ({
  album,
  track,
  lyricsLoading,
  hasLines,
  activeLyricIndex,
  currentPrimaryLyric,
  currentSecondaryLyric,
  lineKaraokeRatio,
  onClose,
}) => {
  return (
    <aside className="lg-ios26-lyrics-stage" aria-label={`كلمات أغنية ${track.title}`}>
      <div className="lg-ios26-diagonal-assembly">
        <div className="lg-ios26-quote-row">
          <div className="lg-ios26-quote-capsule lg-ios26-quote-capsule--open" aria-hidden="true">
            <div className="lg-ios26-quote-capsule__outer-rim">
              <div className="lg-ios26-quote-capsule__milky-core">
                <span className="lg-ios26-quote-glyph">“</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="lg-ios26-lyrics-close"
            onClick={onClose}
            aria-label="إغلاق الكلمات"
          >
            <X size={14} />
          </button>
        </div>

        <div className="lg-ios26-central-capsule">
          <span className="lg-orb-capsule-caustic" aria-hidden="true" />
          <span className="lg-orb-capsule-sheen" aria-hidden="true" />

          {lyricsLoading ? (
            <div className="lg-ios26-lyrics-empty">
              <span className="lg-tube-mini-spinner" aria-hidden="true" />
              <span>Synchronizing lyrics...</span>
            </div>
          ) : !hasLines ? (
            <div className="lg-ios26-lyrics-empty">
              <span>Instrumental / Lyrics unavailable</span>
            </div>
          ) : (
            <div
              className="lg-ios26-two-line-spotlight"
              style={
                {
                  '--word-aura-x': `${(18 + lineKaraokeRatio * 64).toFixed(1)}%`,
                } as React.CSSProperties
              }
            >
              <div
                className="lg-ios26-word-cover-aura"
                style={{
                  backgroundImage: `url("${album.coverUrl}")`,
                }}
                aria-hidden="true"
              />

              <p key={`p_${activeLyricIndex}`} className="lg-ios26-line lg-ios26-line--primary">
                {currentPrimaryLyric || '♪ ♪ ♪'}
              </p>

              {currentSecondaryLyric && (
                <p
                  key={`s_${activeLyricIndex + 1}`}
                  className="lg-ios26-line lg-ios26-line--secondary"
                >
                  {currentSecondaryLyric}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="lg-ios26-quote-capsule lg-ios26-quote-capsule--close" aria-hidden="true">
          <div className="lg-ios26-quote-capsule__outer-rim">
            <div className="lg-ios26-quote-capsule__milky-core">
              <span className="lg-ios26-quote-glyph">”</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
