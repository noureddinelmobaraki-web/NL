/**
 * src/features/liquid-glass/stages/audiobooks/components/PlayerCard.tsx
 *
 * Desktop Expanded Liquid Glass Player Card inside the active chapter tube.
 */

import React from 'react';
import {
  ChevronUp,
  Download,
  FastForward,
  Move,
  Pause,
  Play,
  Rewind,
  RotateCcw,
  SkipBack,
  SkipForward,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { AudiobookChapter, AudiobookItem } from '../../../services/types';
import { formatDurationClock } from './ResumeStrip';

export interface PlayerCardProps {
  book: AudiobookItem;
  chapter: AudiobookChapter;
  chapterNumberLabel: string;
  activeChapterIdx: number;
  totalChapters: number;
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  externalMuted: boolean;
  showVideoBg: boolean;
  lowPower: boolean;
  seekBarRef: React.RefObject<HTMLDivElement | null>;
  onTogglePlayPause: (e?: React.MouseEvent) => void;
  onRestartChapter: (e?: React.MouseEvent) => void;
  onSkipSeconds: (delta: number, e?: React.MouseEvent) => void;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  onCycleSpeed: (e?: React.MouseEvent) => void;
  onToggleVideoBg: () => void;
  onToggleMute: () => void;
  onCollapse: () => void;
  onSeekPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onSeekPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onSeekPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  book,
  chapter,
  chapterNumberLabel,
  activeChapterIdx,
  totalChapters,
  isPlaying,
  isBuffering,
  currentTime,
  duration,
  playbackRate,
  externalMuted,
  showVideoBg,
  lowPower,
  seekBarRef,
  onTogglePlayPause,
  onRestartChapter,
  onSkipSeconds,
  onPrevChapter,
  onNextChapter,
  onCycleSpeed,
  onToggleVideoBg,
  onToggleMute,
  onCollapse,
  onSeekPointerDown,
  onSeekPointerMove,
  onSeekPointerUp,
}) => {
  const progressPercent =
    duration > 0 ? Math.min(Math.max((currentTime / duration) * 100, 0), 100) : 0;

  return (
    <div className="lg-expanded-player-card" onClick={(e) => e.stopPropagation()}>
      <div className="lg-expanded-player__top-row">
        <span className="lg-expanded-player__drag-badge" title="Drag player anywhere on screen">
          <Move size={14} />
        </span>

        <div className="lg-expanded-player__track-info">
          <span className="lg-expanded-player__track-title">
            {chapterNumberLabel}. {chapter.title}
          </span>
          <span className="lg-expanded-player__track-sub">
            {book.title} · {book.author}
          </span>
        </div>

        <div className="lg-expanded-player__top-actions">
          <button
            type="button"
            className="lg-tube-lyrics-toggle lg-tube-lyrics-toggle--active"
            onClick={onCycleSpeed}
            title="Playback Speed"
          >
            <span style={{ fontSize: '0.7rem', fontWeight: 900 }}>{playbackRate}x</span>
          </button>

          {!lowPower && (
            <button
              type="button"
              className={`lg-tube-lyrics-toggle ${
                showVideoBg ? 'lg-tube-lyrics-toggle--active' : ''
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleVideoBg();
              }}
              title={
                showVideoBg ? 'Disable Ambient Video Backdrop' : 'Enable Ambient Video Backdrop'
              }
              aria-label="Toggle ambient video backdrop"
            >
              {showVideoBg ? <Video size={14} /> : <VideoOff size={14} />}
            </button>
          )}

          <a
            href={chapter.url}
            target="_blank"
            rel="noopener noreferrer"
            className="lg-tube-lyrics-toggle"
            title="Download Chapter Audio"
            onClick={(e) => e.stopPropagation()}
          >
            <Download size={14} />
          </a>

          <button
            type="button"
            className="lg-tube-collapse-btn"
            onClick={(e) => {
              e.stopPropagation();
              onCollapse();
            }}
            title="Collapse Player"
            aria-label="Collapse Player"
          >
            <ChevronUp size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <div className="lg-expanded-player__progress-section">
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
          <div className="lg-seek-track lg-tube-seek-track">
            <div
              className="lg-seek-fill lg-tube-seek-fill"
              style={{ width: `${progressPercent}%` }}
            >
              <span className="lg-seek-fill__wave" aria-hidden="true" />
            </div>
            <div
              className="lg-seek-thumb lg-tube-seek-thumb"
              style={{ left: `${progressPercent}%` }}
            />
            <div className="lg-seek-tube-gloss" aria-hidden="true" />
          </div>
        </div>

        <div className="lg-expanded-player__time-row">
          <span>{formatDurationClock(currentTime)}</span>
          <span>-{formatDurationClock(Math.max(0, duration - currentTime))}</span>
        </div>
      </div>

      <div className="lg-expanded-player__controls-row">
        <button
          type="button"
          className="lg-player-side-btn"
          onClick={onRestartChapter}
          title="Restart Chapter"
          aria-label="Restart Chapter"
        >
          <RotateCcw size={15} strokeWidth={2.3} />
        </button>

        <div className="lg-player-center-trio" style={{ gap: '10px' }}>
          <button
            type="button"
            className="lg-player-trio-btn"
            onClick={(e) => onSkipSeconds(-15, e)}
            title="Rewind 15 seconds"
            aria-label="Rewind 15 seconds"
          >
            <Rewind size={16} />
          </button>

          <button
            type="button"
            className="lg-player-trio-btn"
            onClick={(e) => {
              e.stopPropagation();
              onPrevChapter();
            }}
            disabled={activeChapterIdx <= 0}
            title="Previous Chapter"
            aria-label="Previous Chapter"
          >
            <SkipBack size={17} fill="currentColor" />
          </button>

          <button
            type="button"
            className="lg-player-trio-btn lg-player-trio-btn--primary"
            onClick={onTogglePlayPause}
            title={isPlaying ? 'Pause' : 'Play'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isBuffering ? (
              <span className="lg-tube-mini-spinner" aria-hidden="true" />
            ) : isPlaying ? (
              <Pause size={21} fill="currentColor" />
            ) : (
              <Play size={21} fill="currentColor" />
            )}
          </button>

          <button
            type="button"
            className="lg-player-trio-btn"
            onClick={(e) => {
              e.stopPropagation();
              onNextChapter();
            }}
            disabled={activeChapterIdx + 1 >= totalChapters}
            title="Next Chapter"
            aria-label="Next Chapter"
          >
            <SkipForward size={17} fill="currentColor" />
          </button>

          <button
            type="button"
            className="lg-player-trio-btn"
            onClick={(e) => onSkipSeconds(15, e)}
            title="Forward 15 seconds"
            aria-label="Forward 15 seconds"
          >
            <FastForward size={16} />
          </button>
        </div>

        <button
          type="button"
          className="lg-player-side-btn"
          onClick={(e) => {
            e.stopPropagation();
            onToggleMute();
          }}
          title={externalMuted ? 'Unmute' : 'Mute'}
          aria-label={externalMuted ? 'Unmute' : 'Mute'}
        >
          {externalMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </div>
    </div>
  );
};
