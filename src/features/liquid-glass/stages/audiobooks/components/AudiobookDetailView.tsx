/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * src/features/liquid-glass/stages/audiobooks/components/AudiobookDetailView.tsx
 *
 * Selected Audiobook detail workspace with wobbling droplet cover, chapter list,
 * and mobile bottom MiniPlayer.
 */

import React, { useEffect, useRef } from 'react';
import { Eye, Headphones } from 'lucide-react';
import type { AudiobookChapter, AudiobookItem } from '../../../booksAudioService';
import type { useAudiobookPlayer } from '../hooks/useAudiobookPlayer';
import { ChapterList } from './ChapterList';
import { MiniPlayer } from './MiniPlayer';

export interface AudiobookDetailViewProps {
  selectedBook: AudiobookItem;
  chapters: AudiobookChapter[];
  loadingChapters: boolean;
  player: ReturnType<typeof useAudiobookPlayer>;
  externalMuted: boolean;
  showVideoBg: boolean;
  ambientVideoId: string;
  lowPower: boolean;
  isPhone: boolean;
  hasSwitchToBook: boolean;
  onToggleVideoBg: () => void;
  onToggleMute: () => void;
  onEmptySpaceClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onSwitchToWrittenBook: (item: AudiobookItem, e?: React.MouseEvent) => void;
}

export const AudiobookDetailView: React.FC<AudiobookDetailViewProps> = ({
  selectedBook,
  chapters,
  loadingChapters,
  player,
  externalMuted,
  showVideoBg,
  ambientVideoId,
  lowPower,
  isPhone,
  hasSwitchToBook,
  onToggleVideoBg,
  onToggleMute,
  onEmptySpaceClick,
  onSwitchToWrittenBook,
}) => {
  const ascendedCoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (lowPower) return undefined;
    let rafId = 0;
    const t0 = performance.now();
    const animateDroplet = (now: number) => {
      const elapsed = (now - t0) * 0.001;
      if (ascendedCoverRef.current) {
        const r1 = 28 + Math.sin(elapsed * 1.45) * 6 + Math.cos(elapsed * 0.75) * 2.5;
        const r2 = 28 + Math.cos(elapsed * 1.3) * 6 + Math.sin(elapsed * 0.9) * 2.5;
        const r3 = 28 + Math.sin(elapsed * 1.55 + 1.2) * 6;
        const r4 = 28 + Math.cos(elapsed * 1.2 + 2.1) * 6;
        const r5 = 28 + Math.cos(elapsed * 1.35 + 0.6) * 6;
        const r6 = 28 + Math.sin(elapsed * 1.65 + 1.8) * 6;
        const r7 = 28 + Math.cos(elapsed * 1.45 + 2.7) * 6;
        const r8 = 28 + Math.sin(elapsed * 1.25 + 0.4) * 6;
        ascendedCoverRef.current.style.borderRadius = `${r1.toFixed(1)}% ${r2.toFixed(1)}% ${r3.toFixed(1)}% ${r4.toFixed(1)}% / ${r5.toFixed(1)}% ${r6.toFixed(1)}% ${r7.toFixed(1)}% ${r8.toFixed(1)}%`;
      }
      rafId = requestAnimationFrame(animateDroplet);
    };
    rafId = requestAnimationFrame(animateDroplet);
    return () => cancelAnimationFrame(rafId);
  }, [lowPower]);

  return (
    <div className="lg-album-detail-workspace" onClick={onEmptySpaceClick}>
      {!lowPower && showVideoBg && ambientVideoId && (
        <div className="lg-audiobook-ambient-video-layer" aria-hidden="true">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${ambientVideoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${ambientVideoId}&playsinline=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1&modestbranding=1`}
            title="Ambient Nature & Space Background"
            className="lg-ambient-video-iframe"
            allow="autoplay; encrypted-media"
            tabIndex={-1}
          />
          <div className="lg-ambient-video-veil" />
        </div>
      )}

      <div className="lg-album-player-column" onClick={(e) => e.stopPropagation()}>
        <header className="lg-ascended-album-hero">
          <div
            ref={ascendedCoverRef}
            className="lg-ascended-album-cover lg-ascended-album-cover--sun-bubble"
          >
            {selectedBook.coverUrl ? (
              <img
                src={selectedBook.coverUrl}
                alt={selectedBook.title}
                className="lg-ascended-album-cover__img"
                decoding="async"
                draggable={false}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div
                className="lg-audiobook-poster-fallback"
                style={{
                  background: 'linear-gradient(145deg, #31102f 0%, #6d28d9 55%, #38bdf8 100%)',
                }}
              >
                <Headphones size={34} className="lg-audiobook-poster-fallback__icon" />
              </div>
            )}
            <span className="lg-main-glass__caustic lg-main-glass__caustic--sun" aria-hidden="true" />
            <span className="lg-main-glass__rim lg-main-glass__rim--sun" aria-hidden="true" />
            <span className="lg-main-glass__sheen" aria-hidden="true" />
          </div>

          <div className="lg-ascended-album-meta">
            <h1 className="lg-ascended-album-title">{selectedBook.title}</h1>
            <p className="lg-ascended-album-artist">
              {selectedBook.author} · {chapters.length || selectedBook.chapterCount || 1} Chapters
            </p>

            {hasSwitchToBook && (
              <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={(e) => onSwitchToWrittenBook(selectedBook, e)}
                  className="lg-glass-pill lg-filter-pill lg-filter-pill--read-cta"
                >
                  <Eye size={13} />
                  <span>Read Book Edition</span>
                </button>
              </div>
            )}
          </div>
        </header>

        <ChapterList
          book={selectedBook}
          chapters={chapters}
          loadingChapters={loadingChapters}
          activeChapterIdx={player.activeChapterIdx}
          isPlaying={player.isPlaying}
          isBuffering={player.isBuffering}
          currentTime={player.currentTime}
          duration={player.duration}
          playbackRate={player.playbackRate}
          externalMuted={externalMuted}
          showVideoBg={showVideoBg}
          lowPower={lowPower}
          isPhone={isPhone}
          isPlayerExpanded={player.isPlayerExpanded}
          setIsPlayerExpanded={player.setIsPlayerExpanded}
          seekBarRef={player.seekBarRef}
          onSelectChapter={(idx) => player.startChapterPlayback(chapters, idx, 0)}
          onTogglePlayPause={player.togglePlayPause}
          onRestartChapter={player.handleRestartChapter}
          onSkipSeconds={player.skipSeconds}
          onCycleSpeed={player.cycleSpeed}
          onToggleVideoBg={onToggleVideoBg}
          onToggleMute={onToggleMute}
          onSeekPointerDown={player.handleSeekPointerDown}
          onSeekPointerMove={player.handleSeekPointerMove}
          onSeekPointerUp={player.handleSeekPointerUp}
        />
      </div>

      {isPhone && (
        <MiniPlayer
          book={selectedBook}
          chapter={chapters[player.activeChapterIdx]}
          activeChapterIdx={player.activeChapterIdx}
          totalChapters={chapters.length}
          isPlaying={player.isPlaying}
          isBuffering={player.isBuffering}
          currentTime={player.currentTime}
          duration={player.duration}
          playbackRate={player.playbackRate}
          seekBarRef={player.seekBarRef}
          onTogglePlayPause={player.togglePlayPause}
          onSkipSeconds={player.skipSeconds}
          onPrevChapter={() => {
            if (player.activeChapterIdx > 0) {
              player.startChapterPlayback(chapters, player.activeChapterIdx - 1, 0);
            }
          }}
          onNextChapter={() => {
            if (player.activeChapterIdx + 1 < chapters.length) {
              player.startChapterPlayback(chapters, player.activeChapterIdx + 1, 0);
            }
          }}
          onCycleSpeed={player.cycleSpeed}
          onSeekPointerDown={player.handleSeekPointerDown}
          onSeekPointerMove={player.handleSeekPointerMove}
          onSeekPointerUp={player.handleSeekPointerUp}
        />
      )}
    </div>
  );
};
