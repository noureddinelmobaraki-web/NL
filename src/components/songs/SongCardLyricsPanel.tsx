/**
 * SongCardLyricsPanel — orchestrator (post-refactor).
 *
 * Responsibilities only:
 *   1. Pick rendering surface (inline / desktop popover / mobile sheet).
 *   2. Compose LyricsPanelHeader / LyricsPanelBody / LyricsPanelDragHandle.
 *   3. Own the karaoke vs. scroll-list mode switch.
 *
 * Body scroll lock is delegated to useMobileLyricsBodyLock (ref-counted).
 */
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './lyricsReveal.css';
import { useGenieTransition } from '../../transitions/useGenieTransition';
import { getGenieOrigin, genieOriginToTransformOrigin } from '../../transitions/genieOrigin';
import type { Song, LyricLine } from '../../types';
import { LyricsPanelHeader } from './LyricsPanelHeader';
import { LyricsPanelBody } from './LyricsPanelBody';
import { LyricsPanelDragHandle } from './LyricsPanelDragHandle';
import { useMobileLyricsBodyLock } from '../../hooks/useMobileLyricsBodyLock';
import { DesktopLyricsViewport } from './DesktopLyricsViewport';

interface SongCardLyricsPanelProps {
  layoutType: 'inline' | 'popover';
  song: Song;
  isLyricsOpen: boolean;
  resolvedTheme: string;
  karaokeMode: boolean;
  setKaraokeMode?: (v: boolean | ((p: boolean) => boolean)) => void;
  localLyrics: LyricLine[];
  currentLineIndex: number;
  currentLyricLine?: string | null;
  currentTime?: number;
  onSeek?: (v: number) => void;
  isMobile?: boolean;
  isTablet?: boolean;
}

const closeMobileLyrics = () =>
  document.dispatchEvent(new CustomEvent('close-mobile-lyrics'));

// ───────────────────────────────────────────────
// Inline (Dark / Manga themes)
// ───────────────────────────────────────────────
const InlineLyrics = ({
  localLyrics, currentTime, onSeek,
}: Pick<
  SongCardLyricsPanelProps,
  'localLyrics' | 'currentTime' | 'onSeek'
>) => (
  <DesktopLyricsViewport
    lyrics={localLyrics}
    currentTime={currentTime || 0}
    onSeek={onSeek || (() => {})}
    variant="inline"
  />
);

// ───────────────────────────────────────────────
// Desktop popover (Light theme only) — preserved from original.
// ───────────────────────────────────────────────
const DesktopLightPopover = ({
  localLyrics, currentTime, onSeek,
}: Pick<SongCardLyricsPanelProps, 'localLyrics' | 'currentTime' | 'onSeek'>) => (
  <div 
    className="light-lyrics-card-popover absolute bg-white p-4 z-50 rounded-lg flex flex-col nl-desktop-lyrics-pop"
    style={{
      ['--genie-origin' as string]: genieOriginToTransformOrigin(getGenieOrigin()),
      transformOrigin: 'var(--genie-origin)',
      top: '100%',
      right: '16px',
      width: '345px',
      height: '330px',
      marginTop: '12px',
      boxSizing: 'border-box',
    }}
    onClick={(e) => e.stopPropagation()}
  >
    <DesktopLyricsViewport
      lyrics={localLyrics}
      currentTime={currentTime || 0}
      onSeek={onSeek || (() => {})}
      variant="light"
    />
  </div>
);

// ───────────────────────────────────────────────
// Mobile bottom-sheet
// ───────────────────────────────────────────────
const MobileBottomSheet = ({
  song, isLyricsOpen, localLyrics, currentLineIndex, onSeek,
}: Pick<
  SongCardLyricsPanelProps,
  'song' | 'isLyricsOpen' | 'localLyrics' | 'currentLineIndex' | 'onSeek'
>) => {
  const genie = useGenieTransition(true);
  // Ref-counted body lock — see Prompt 4.
  useMobileLyricsBodyLock(isLyricsOpen, /* enabled */ true);

  return createPortal(
    <AnimatePresence>
      {isLyricsOpen && (
        <>
          <motion.div
            key="lyrics-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.55 }}
            exit={{ opacity: 0 }}
            onClick={closeMobileLyrics}
            style={{
              position: 'fixed',
              inset: 0,
              background: '#000',
              zIndex: 10999,
              pointerEvents: 'auto',
              touchAction: 'none',
            }}
          />
          <motion.div
            key="lyrics-sheet"
            initial={genie.initial}
            animate={genie.animate}
            exit={genie.exit}
            transition={genie.transition}
            className="lyrics-bottom-sheet fixed inset-x-0 bottom-0 flex flex-col"
            style={{
              ...genie.style,
              height: '80vh',
              background: 'rgba(15, 15, 20, 0.98)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              borderRadius: '24px 24px 0 0',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              boxShadow: '0 -15px 50px rgba(0,0,0,0.8)',
              borderTop: '1px solid rgba(255,255,255,0.12)',
              borderLeft: '1px solid rgba(255,255,255,0.1)',
              borderRight: '1px solid rgba(255,255,255,0.1)',
              zIndex: 11000,
              pointerEvents: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <LyricsPanelDragHandle onDismiss={closeMobileLyrics} />
            <LyricsPanelHeader title={song.title} onClose={closeMobileLyrics} />
            <div className="flex flex-col flex-1 overflow-hidden">
              <LyricsPanelBody
                lyrics={localLyrics}
                currentLineIndex={currentLineIndex}
                onSeek={onSeek}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
};

// ───────────────────────────────────────────────
// Orchestrator
// ───────────────────────────────────────────────
export const SongCardLyricsPanel = ({
  layoutType, song, isLyricsOpen, resolvedTheme,
  localLyrics, currentLineIndex,
  currentTime, onSeek, isMobile = false, isTablet = false,
}: SongCardLyricsPanelProps) => {

  if (!isLyricsOpen) return null;

  // No lyrics file → placeholder (preserved from original — copy JSX 1:1).
  if (!song.lrc) {
    return (
      <div
        style={{
          marginTop: '16px',
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          minHeight: '80px',
          borderRadius: '8px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px dashed rgba(255, 255, 255, 0.08)',
        }}
      >
        <span
          style={{
            fontSize: '1.5rem',
            opacity: 0.4,
            lineHeight: 1,
          }}
          aria-hidden="true"
        >
          ♪
        </span>
        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: '0.78rem',
            fontFamily: 'var(--nav-font, monospace)',
            letterSpacing: '0.08em',
            textAlign: 'center',
            margin: 0,
          }}
        >
          الكلمات غير متوفرة حالياً
        </p>
        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: '0.68rem',
            opacity: 0.5,
            textAlign: 'center',
            margin: 0,
            fontFamily: 'monospace',
            letterSpacing: '0.05em',
          }}
        >
          LYRICS NOT AVAILABLE
        </p>
      </div>
    );
  }

  if (layoutType === 'inline') {
    if (resolvedTheme === 'light') return null;
    return (
      <InlineLyrics
        localLyrics={localLyrics}
        currentTime={currentTime}
        onSeek={onSeek}
      />
    );
  }

  if (layoutType === 'popover' || (isMobile && isLyricsOpen)) {
    const showAsBottomSheet = isMobile || isTablet;
    if (!showAsBottomSheet) {
      if (resolvedTheme !== 'light') return null;
      return (
        <DesktopLightPopover
          localLyrics={localLyrics}
          currentTime={currentTime}
          onSeek={onSeek}
        />
      );
    }
    if (typeof window === 'undefined') return null;
    return (
      <MobileBottomSheet
        song={song}
        isLyricsOpen={isLyricsOpen}
        localLyrics={localLyrics}
        currentLineIndex={currentLineIndex}
        onSeek={onSeek}
      />
    );
  }

  return null;
};
