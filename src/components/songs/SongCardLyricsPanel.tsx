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
import { useDeferredValue, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Song, LyricLine } from '../../types';
import { LyricsWindowContent } from '../LyricsEngine';
import { formatTime } from './formatTime';
import { LyricsPanelHeader } from './LyricsPanelHeader';
import { LyricsPanelBody } from './LyricsPanelBody';
import { LyricsPanelDragHandle } from './LyricsPanelDragHandle';
import { useMobileLyricsBodyLock } from '../../hooks/useMobileLyricsBodyLock';

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

const isHeaderLineHelper = (text: string): boolean => {
  const t = text.trim().toLowerCase();
  return ['intro','chorus','verse','hook','bridge','outro','solo','instrumental']
    .some((kw) => t.includes(kw));
};

const closeMobileLyrics = () =>
  document.dispatchEvent(new CustomEvent('close-mobile-lyrics'));

// ───────────────────────────────────────────────
// Inline (Dark / Manga themes)
// ───────────────────────────────────────────────
const InlineLyrics = ({
  karaokeMode, localLyrics, currentLineIndex, currentTime, onSeek, currentLyricLine,
}: Pick<
  SongCardLyricsPanelProps,
  'karaokeMode' | 'localLyrics' | 'currentLineIndex' | 'currentTime' | 'onSeek' | 'currentLyricLine'
>) => {
  // Defer per-word render at high tick rates — paint stays in fast track.
  const deferredTime = useDeferredValue(currentTime || 0);
  const deferredIndex = useDeferredValue(currentLineIndex);

  if (karaokeMode) {
    const activeLine = deferredIndex !== -1 ? localLyrics[deferredIndex] : undefined;
    // Fallback to currentLyricLine prop if index lookup fails (e.g. lyrics
    // not yet loaded but a global broadcast gave us the line text).
    const fallbackText = !activeLine && currentLyricLine ? currentLyricLine : null;

    return (
      <div
        style={{
          marginTop: '16px',
          minHeight: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderTop: '1px solid var(--card-border-line)',
          paddingTop: '12px',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-manga)',
            fontSize: 'clamp(1.2rem, 4vw, 2rem)',
            textAlign: 'center',
            letterSpacing: '0.05em',
            lineHeight: 1.4,
            padding: '0 16px',
          }}
        >
          {activeLine ? (
            activeLine.words && activeLine.words.length > 0 ? (
              activeLine.words.map((word, wi) => {
                const isPlayed = word.time <= deferredTime;
                return (
                  <span
                    key={wi}
                    style={{
                      color: isPlayed
                        ? 'var(--lyric-active-color)'
                        : 'var(--lyric-inactive-color)',
                      opacity: isPlayed ? 1 : 0.45,
                      textShadow: isPlayed
                        ? '0 0 20px var(--lyric-active-shadow)'
                        : 'none',
                      transition: 'color 150ms ease-out, opacity 150ms ease-out',
                      display: 'inline-block',
                      whiteSpace: 'pre',
                      willChange: isPlayed ? 'auto' : 'opacity',
                    }}
                  >
                    {word.text}
                  </span>
                );
              })
            ) : (
              <span
                style={{
                  color: 'var(--lyric-active-color)',
                  textShadow: '0 0 20px var(--lyric-active-shadow)',
                }}
              >
                {activeLine.text}
              </span>
            )
          ) : fallbackText ? (
            <span style={{ color: 'var(--lyric-active-color)' }}>{fallbackText}</span>
          ) : (
            <span style={{ color: 'var(--lyric-inactive-color)' }}>♪</span>
          )}
        </p>
      </div>
    );
  }

  // Scroll-list mode
  return (
    <div
      style={{
        marginTop: '16px',
        borderTop: '1px solid var(--card-border-line)',
        paddingTop: '12px',
        maxHeight: '220px',
        overflowY: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
      className="no-scrollbar"
    >
      {!localLyrics || localLyrics.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '24px',
            color: 'var(--text-muted)',
            fontSize: '13px',
            fontFamily: 'monospace',
            opacity: 0.6,
          }}
        >
          ♪ جاري تحميل الكلمات...
        </div>
      ) : (
        <LyricsWindowContent
          currentTime={currentTime || 0}
          onSeek={onSeek || (() => {})}
          lyrics={localLyrics}
          isMobilePlayer={true}
        />
      )}
    </div>
  );
};

// ───────────────────────────────────────────────
// Desktop popover (Light theme only) — preserved from original.
// ───────────────────────────────────────────────
const DesktopLightPopover = ({
  localLyrics, currentLineIndex, onSeek,
}: Pick<SongCardLyricsPanelProps, 'localLyrics' | 'currentLineIndex' | 'onSeek'>) => (
  <div 
    className="light-lyrics-card-popover absolute bg-white p-4 z-50 rounded-lg flex flex-col"
    style={{
      top: '100%',
      right: '16px',
      width: '345px',
      height: '330px',
      marginTop: '12px',
      boxSizing: 'border-box',
    }}
    onClick={(e) => e.stopPropagation()}
  >
    <style>{`
      .light-lyrics-card-popover {
        box-shadow: 0 12px 40px rgba(0,0,0,0.12), 0 2px 10px rgba(0,0,0,0.06);
        border: 1px solid rgba(0,0,0,0.15);
        display: flex;
        flex-direction: column;
      }
      .light-lyrics-scroll-container::-webkit-scrollbar {
        width: 14px !important;
        display: block !important;
      }
      .light-lyrics-scroll-container::-webkit-scrollbar-track {
        background: #FFFFFF !important;
        border-left: 1px solid #E5E7EB !important;
      }
      .light-lyrics-scroll-container::-webkit-scrollbar-thumb {
        background: #C1C1C1 !important;
        border-radius: 9px !important;
        border: 3px solid #FFFFFF !important;
      }
      .light-lyrics-scroll-container::-webkit-scrollbar-thumb:hover {
        background: #A8A8A8 !important;
      }
      .light-lyrics-scroll-container::-webkit-scrollbar-button:single-button {
        background-color: #FFFFFF !important;
        display: block !important;
        height: 14px !important;
        width: 14px !important;
        border-left: 1px solid #E5E7EB !important;
      }
      .light-lyrics-scroll-container::-webkit-scrollbar-button:single-button:decrement {
        background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888888' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'><polyline points='18 15 12 9 6 15'></polyline></svg>") !important;
        background-repeat: no-repeat !important;
        background-size: 8px !important;
        background-position: center !important;
        border-bottom: 1px solid #E5E7EB !important;
      }
      .light-lyrics-scroll-container::-webkit-scrollbar-button:single-button:increment {
        background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888888' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>") !important;
        background-repeat: no-repeat !important;
        background-size: 8px !important;
        background-position: center !important;
        border-top: 1px solid #E5E7EB !important;
      }
    `}</style>
    <div 
      className="light-lyrics-scroll-container flex-1 overflow-y-auto pr-1 select-text" 
      style={{
        maxHeight: '100%',
        scrollbarWidth: 'auto',
      }}
    >
      {!localLyrics || localLyrics.length === 0 ? (
        <div className="flex items-center justify-center h-full text-zinc-400 text-xs font-mono">
          ♪ جاري تحميل الكلمات...
        </div>
      ) : (
        <div className="flex flex-col gap-1 text-left py-2 font-sans">
          {localLyrics.map((line, i) => {
            const isActive = i === currentLineIndex;
            const isHeader = isHeaderLineHelper(line.text);
            
            if (isHeader) {
              return (
                <div 
                  key={`lyric-${i}-${line.time}`}
                  id={`light-lyric-line-${i}`}
                  className="text-gray-400 text-[12px] font-semibold tracking-wider uppercase py-1 select-none font-sans mt-2 first:mt-0"
                >
                  {formatTime(line.time)} {line.text}
                </div>
              );
            }

            return (
              <div
                key={`lyric-${i}-${line.time}`}
                id={`light-lyric-line-${i}`}
                onClick={() => onSeek?.(line.time)}
                className="lyric-line-item relative px-2.5 py-1.5 transition-all text-left cursor-pointer rounded select-text"
                style={{
                  fontFamily: 'Geneva, Arial, sans-serif',
                  fontSize: '14px',
                  fontWeight: 'normal',
                  color: '#000000',
                  lineHeight: '1.45',
                  background: isActive ? 'rgba(0, 0, 0, 0.08)' : 'transparent',
                  transition: 'background-color 0.2s ease, transform 0.2s ease',
                }}
              >
                {line.text}
              </div>
            );
          })}
        </div>
      )}
    </div>
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
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 350 }}
            className="lyrics-bottom-sheet fixed inset-x-0 bottom-0 flex flex-col"
            style={{
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
  karaokeMode, localLyrics, currentLineIndex, currentLyricLine,
  currentTime, onSeek, isMobile = false, isTablet = false,
}: SongCardLyricsPanelProps) => {
  // Auto-scroll active line in the desktop light popover.
  useEffect(() => {
    if (resolvedTheme !== 'light') return;
    if (!isLyricsOpen || currentLineIndex === -1) return;
    const el = document.getElementById(`light-lyric-line-${currentLineIndex}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentLineIndex, isLyricsOpen, resolvedTheme]);

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
        karaokeMode={karaokeMode}
        localLyrics={localLyrics}
        currentLineIndex={currentLineIndex}
        currentLyricLine={currentLyricLine}
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
          currentLineIndex={currentLineIndex}
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
