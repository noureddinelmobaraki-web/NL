/**
 * src/features/liquid-glass/stages/audiobooks/components/MiniPlayer.tsx
 *
 * Mobile bottom bar player (Spotify/Apple Podcasts style) that expands to a clean
 * full-screen touch sheet without free-floating drag collisions.
 */

import React, { useState } from 'react';
import {
  ChevronDown,
  Download,
  FastForward,
  Headphones,
  Pause,
  Play,
  Rewind,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import type { AudiobookChapter, AudiobookItem } from '../../../services/types';
import { formatDurationClock } from './ResumeStrip';

export interface MiniPlayerProps {
  book: AudiobookItem;
  chapter: AudiobookChapter | undefined;
  activeChapterIdx: number;
  totalChapters: number;
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  seekBarRef: React.RefObject<HTMLDivElement | null>;
  onTogglePlayPause: (e?: React.MouseEvent) => void;
  onSkipSeconds: (delta: number, e?: React.MouseEvent) => void;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  onCycleSpeed: (e?: React.MouseEvent) => void;
  onSeekPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onSeekPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onSeekPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({
  book,
  chapter,
  activeChapterIdx,
  totalChapters,
  isPlaying,
  isBuffering,
  currentTime,
  duration,
  playbackRate,
  seekBarRef,
  onTogglePlayPause,
  onSkipSeconds,
  onPrevChapter,
  onNextChapter,
  onCycleSpeed,
  onSeekPointerDown,
  onSeekPointerMove,
  onSeekPointerUp,
}) => {
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!chapter) return null;

  const progressPercent =
    duration > 0 ? Math.min(Math.max((currentTime / duration) * 100, 0), 100) : 0;

  return (
    <>
      <div
        className="lg-mini-player"
        role="region"
        aria-label="Mini Audiobook Player"
        onClick={(e) => {
          e.stopPropagation();
          setSheetOpen(true);
        }}
      >
        {book.coverUrl ? (
          <img src={book.coverUrl} alt="" className="lg-mini-player__cover" />
        ) : (
          <div
            className="lg-mini-player__cover"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Headphones size={20} />
          </div>
        )}

        <div className="lg-mini-player__meta">
          <span className="lg-mini-player__title">
            {String(activeChapterIdx + 1).padStart(2, '0')}. {chapter.title}
          </span>
          <span className="lg-mini-player__sub">
            {book.title} · {formatDurationClock(currentTime)}
          </span>
        </div>

        <div className="lg-mini-player__actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="lg-glass-pill lg-icon-round-btn"
            onClick={(e) => onSkipSeconds(-15, e)}
            aria-label="Rewind 15 seconds"
          >
            <Rewind size={15} />
          </button>
          <button
            type="button"
            className="lg-glass-pill lg-icon-round-btn"
            onClick={onTogglePlayPause}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isBuffering ? (
              <span className="lg-tube-mini-spinner" aria-hidden="true" />
            ) : isPlaying ? (
              <Pause size={16} fill="currentColor" />
            ) : (
              <Play size={16} fill="currentColor" />
            )}
          </button>
        </div>

        <div className="lg-mini-player__progress" aria-hidden="true">
          <div
            className="lg-mini-player__progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {sheetOpen && (
        <div
          className="lg-mini-player-sheet"
          role="dialog"
          aria-modal="true"
          aria-label="Expanded Audiobook Controls"
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              className="lg-glass-pill lg-icon-round-btn"
              onClick={() => setSheetOpen(false)}
              aria-label="Minimize player"
            >
              <ChevronDown size={18} />
            </button>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, opacity: 0.85 }}>
              Chapter {activeChapterIdx + 1} of {totalChapters}
            </span>
            <button
              type="button"
              className="lg-glass-pill lg-filter-pill lg-filter-pill--sm lg-filter-pill--active"
              onClick={onCycleSpeed}
            >
              <span>{playbackRate}x</span>
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              textAlign: 'center',
            }}
          >
            {book.coverUrl ? (
              <img
                src={book.coverUrl}
                alt={book.title}
                style={{
                  width: '190px',
                  height: '190px',
                  borderRadius: '28px',
                  objectFit: 'cover',
                  boxShadow: '0 24px 48px rgba(0,0,0,0.65)',
                }}
              />
            ) : (
              <div
                style={{
                  width: '190px',
                  height: '190px',
                  borderRadius: '28px',
                  background: 'linear-gradient(145deg, #31102f, #6d28d9, #38bdf8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Headphones size={48} />
              </div>
            )}

            <div>
              <h2 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 900, color: '#fff3a8' }}>
                {chapter.title}
              </h2>
              <p style={{ margin: 0, fontSize: '0.84rem', opacity: 0.82 }}>
                {book.title} · {book.author}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <div
                ref={seekBarRef}
                className="lg-seek-hit lg-tube-seek-hit"
                role="slider"
                tabIndex={0}
                aria-label="Seek audiobook position"
                aria-valuemin={0}
                aria-valuemax={Math.round(duration || 0)}
                aria-valuenow={Math.round(currentTime || 0)}
                onPointerDown={onSeekPointerDown}
                onPointerMove={onSeekPointerMove}
                onPointerUp={onSeekPointerUp}
                onPointerCancel={onSeekPointerUp}
              >
                <div className="lg-seek-track lg-tube-seek-track" style={{ width: '100%' }}>
                  <div
                    className="lg-seek-fill lg-tube-seek-fill"
                    style={{ width: `${progressPercent}%` }}
                  />
                  <div
                    className="lg-seek-thumb lg-tube-seek-thumb"
                    style={{ left: `${progressPercent}%` }}
                  />
                </div>
              </div>
              <div className="lg-expanded-player__time-row">
                <span>{formatDurationClock(currentTime)}</span>
                <span>-{formatDurationClock(Math.max(0, duration - currentTime))}</span>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
              }}
            >
              <button
                type="button"
                className="lg-player-trio-btn"
                onClick={(e) => onSkipSeconds(-15, e)}
                aria-label="Rewind 15 seconds"
              >
                <Rewind size={18} />
              </button>
              <button
                type="button"
                className="lg-player-trio-btn"
                onClick={onPrevChapter}
                disabled={activeChapterIdx <= 0}
                aria-label="Previous Chapter"
              >
                <SkipBack size={20} fill="currentColor" />
              </button>
              <button
                type="button"
                className="lg-player-trio-btn lg-player-trio-btn--primary"
                onClick={onTogglePlayPause}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause size={24} fill="currentColor" />
                ) : (
                  <Play size={24} fill="currentColor" />
                )}
              </button>
              <button
                type="button"
                className="lg-player-trio-btn"
                onClick={onNextChapter}
                disabled={activeChapterIdx + 1 >= totalChapters}
                aria-label="Next Chapter"
              >
                <SkipForward size={20} fill="currentColor" />
              </button>
              <button
                type="button"
                className="lg-player-trio-btn"
                onClick={(e) => onSkipSeconds(15, e)}
                aria-label="Forward 15 seconds"
              >
                <FastForward size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <a
                href={chapter.url}
                target="_blank"
                rel="noopener noreferrer"
                className="lg-glass-pill lg-filter-pill lg-filter-pill--sm"
              >
                <Download size={13} />
                <span>Download MP3</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
