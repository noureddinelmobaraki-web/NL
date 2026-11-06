/**
 * src/features/liquid-glass/stages/audiobooks/components/ChapterList.tsx
 *
 * Scrollable list of Clear Bubble Glass Chapter Tubes (expands to PlayerCard on desktop).
 */

import React, { useCallback, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import type { AudiobookChapter, AudiobookItem } from '../../../services/types';
import { PlayerCard } from './PlayerCard';
import { formatDurationClock } from './ResumeStrip';

export interface ChapterListProps {
  book: AudiobookItem;
  chapters: AudiobookChapter[];
  loadingChapters: boolean;
  activeChapterIdx: number;
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  externalMuted: boolean;
  showVideoBg: boolean;
  lowPower: boolean;
  isPhone: boolean;
  isPlayerExpanded: boolean;
  setIsPlayerExpanded: (v: boolean) => void;
  seekBarRef: React.RefObject<HTMLDivElement | null>;
  onSelectChapter: (idx: number) => void;
  onTogglePlayPause: (e?: React.MouseEvent) => void;
  onRestartChapter: (e?: React.MouseEvent) => void;
  onSkipSeconds: (delta: number, e?: React.MouseEvent) => void;
  onCycleSpeed: (e?: React.MouseEvent) => void;
  onToggleVideoBg: () => void;
  onToggleMute: () => void;
  onSeekPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onSeekPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onSeekPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
}

export const ChapterList: React.FC<ChapterListProps> = ({
  book,
  chapters,
  loadingChapters,
  activeChapterIdx,
  isPlaying,
  isBuffering,
  currentTime,
  duration,
  playbackRate,
  externalMuted,
  showVideoBg,
  lowPower,
  isPhone,
  isPlayerExpanded,
  setIsPlayerExpanded,
  seekBarRef,
  onSelectChapter,
  onTogglePlayPause,
  onRestartChapter,
  onSkipSeconds,
  onCycleSpeed,
  onToggleVideoBg,
  onToggleMute,
  onSeekPointerDown,
  onSeekPointerMove,
  onSeekPointerUp,
}) => {
  const [playerDragOffset, setPlayerDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingPlayer, setIsDraggingPlayer] = useState(false);
  const playerDragStartRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const handlePlayerCardPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isPhone) return;
      const target = e.target as HTMLElement;
      if (
        target.closest('button') ||
        target.closest('a') ||
        target.closest('[role="slider"]') ||
        target.closest('.lg-seek-hit')
      ) {
        return;
      }
      e.stopPropagation();
      playerDragStartRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        origX: playerDragOffset.x,
        origY: playerDragOffset.y,
      };
      setIsDraggingPlayer(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [isPhone, playerDragOffset.x, playerDragOffset.y],
  );

  const handlePlayerCardPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = playerDragStartRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    e.stopPropagation();
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
    setPlayerDragOffset({
      x: Math.max(-vw * 0.4, Math.min(vw * 0.4, drag.origX + dx)),
      y: Math.max(-vh * 0.4, Math.min(vh * 0.4, drag.origY + dy)),
    });
  }, []);

  const handlePlayerCardPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = playerDragStartRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    e.stopPropagation();
    playerDragStartRef.current = null;
    setIsDraggingPlayer(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div
      className="lg-track-tubes-list"
      role="list"
      aria-label={`Chapters of ${book.title}`}
    >
      {loadingChapters ? (
        Array.from({ length: 5 }).map((_, idx) => (
          <div
            key={idx}
            className="lg-track-tube lg-audiobook-info-capsule--skeleton"
            style={{ height: '58px' }}
          >
            <span className="lg-orb-capsule-caustic" aria-hidden="true" />
          </div>
        ))
      ) : chapters.length === 0 ? (
        <div className="lg-track-tube" style={{ padding: '22px', textAlign: 'center' }}>
          <span className="lg-orb-capsule-caustic" aria-hidden="true" />
          <span className="lg-orb-capsule-sheen" aria-hidden="true" />
          <p style={{ margin: 0, fontWeight: 800, color: '#fff3a8' }}>
            No direct audio chapters available for this edition.
          </p>
        </div>
      ) : (
        chapters.map((ch, idx) => {
          const isSelectedChapter = activeChapterIdx === idx;
          const isExpandedCard = !isPhone && isSelectedChapter && isPlayerExpanded;
          const chNumFormatted = String(ch.index || idx + 1).padStart(2, '0');

          return (
            <div
              key={`${ch.index}_${idx}`}
              role="listitem"
              className={`lg-track-tube${isSelectedChapter ? ' lg-track-tube--current' : ''}${
                isExpandedCard ? ' lg-track-tube--expanded-player' : ''
              }${isExpandedCard && isDraggingPlayer ? ' lg-track-tube--dragging-player' : ''}`}
              style={
                {
                  '--tube-delay': `${Math.min(idx * 20, 300)}ms`,
                  transform: isExpandedCard
                    ? `translate3d(${playerDragOffset.x.toFixed(1)}px, ${playerDragOffset.y.toFixed(1)}px, 0)`
                    : undefined,
                  zIndex: isExpandedCard ? 60 : undefined,
                } as React.CSSProperties
              }
              onPointerDown={isExpandedCard ? handlePlayerCardPointerDown : undefined}
              onPointerMove={isExpandedCard ? handlePlayerCardPointerMove : undefined}
              onPointerUp={isExpandedCard ? handlePlayerCardPointerUp : undefined}
              onPointerCancel={isExpandedCard ? handlePlayerCardPointerUp : undefined}
              onClick={() => {
                if (!isExpandedCard) {
                  if (isSelectedChapter) {
                    setIsPlayerExpanded(true);
                    onTogglePlayPause();
                  } else {
                    onSelectChapter(idx);
                  }
                }
              }}
            >
              <span className="lg-orb-capsule-caustic" aria-hidden="true" />
              <span className="lg-orb-capsule-sheen" aria-hidden="true" />

              {!isExpandedCard && (
                <div className="lg-track-tube__header">
                  {isSelectedChapter ? (
                    <button
                      type="button"
                      className="lg-tube-play-btn"
                      onClick={onTogglePlayPause}
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isBuffering ? (
                        <span className="lg-tube-mini-spinner" aria-hidden="true" />
                      ) : isPlaying ? (
                        <Pause size={15} fill="currentColor" />
                      ) : (
                        <Play size={15} fill="currentColor" />
                      )}
                    </button>
                  ) : (
                    <span className="lg-track-tube__num">
                      <span className="lg-track-tube__num-glyph">{chNumFormatted}</span>
                    </span>
                  )}

                  <span className="lg-track-tube__title">{ch.title}</span>

                  <span className="lg-audiobook-ch-duration">
                    {ch.duration > 0 ? formatDurationClock(ch.duration) : 'MP3'}
                  </span>
                </div>
              )}

              {isExpandedCard && (
                <PlayerCard
                  book={book}
                  chapter={ch}
                  chapterNumberLabel={chNumFormatted}
                  activeChapterIdx={activeChapterIdx}
                  totalChapters={chapters.length}
                  isPlaying={isPlaying}
                  isBuffering={isBuffering}
                  currentTime={currentTime}
                  duration={duration}
                  playbackRate={playbackRate}
                  externalMuted={externalMuted}
                  showVideoBg={showVideoBg}
                  lowPower={lowPower}
                  seekBarRef={seekBarRef}
                  onTogglePlayPause={onTogglePlayPause}
                  onRestartChapter={onRestartChapter}
                  onSkipSeconds={onSkipSeconds}
                  onPrevChapter={() => {
                    if (activeChapterIdx > 0) onSelectChapter(activeChapterIdx - 1);
                  }}
                  onNextChapter={() => {
                    if (activeChapterIdx + 1 < chapters.length) {
                      onSelectChapter(activeChapterIdx + 1);
                    }
                  }}
                  onCycleSpeed={onCycleSpeed}
                  onToggleVideoBg={onToggleVideoBg}
                  onToggleMute={onToggleMute}
                  onCollapse={() => {
                    setIsPlayerExpanded(false);
                    setPlayerDragOffset({ x: 0, y: 0 });
                  }}
                  onSeekPointerDown={onSeekPointerDown}
                  onSeekPointerMove={onSeekPointerMove}
                  onSeekPointerUp={onSeekPointerUp}
                />
              )}
            </div>
          );
        })
      )}
    </div>
  );
};
