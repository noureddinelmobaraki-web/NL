/**
 * DesktopLyricsViewport — unified desktop karaoke window for ALL 5 themes.
 * Mirrors the proven mobile LyricsPanelBody behavior:
 *   - One fixed-height viewport that OWNS its own scroll (no nested scrollers).
 *   - The currently-sung line is auto-centered (rect-delta + rAF), smoothly.
 *   - Sung lines move up, upcoming lines sit below; manual scroll still works.
 * DESKTOP ONLY. Mobile/tablet keep MobileBottomSheet + LyricsPanelBody.
 */
import { useDeferredValue, useEffect, useMemo, useRef } from 'react';
import type { LyricLine } from '../../types';
import './desktopLyrics.css';

const isHeaderLineHelper = (text: string): boolean => {
  const t = text.trim().toLowerCase();
  return ['intro', 'chorus', 'verse', 'hook', 'bridge', 'outro', 'solo', 'instrumental']
    .some((kw) => t.includes(kw));
};

interface DesktopLyricsViewportProps {
  lyrics: LyricLine[];
  currentTime: number;
  onSeek?: (time: number) => void;
  /** 'inline' = over cover image (dark/lite/bit/midnight). 'light' = white popover. */
  variant?: 'inline' | 'light';
}

export const DesktopLyricsViewport = ({
  lyrics,
  currentTime,
  onSeek,
  variant = 'inline',
}: DesktopLyricsViewportProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Active line from playback time (endTime-aware + fallback). Same rule the old engine used.
  const activeIndex = useMemo(() => {
    if (!lyrics || lyrics.length === 0) return -1;
    const i = lyrics.findIndex(
      (l) => currentTime >= l.time && currentTime < (l.endTime ?? Infinity),
    );
    if (i !== -1) return i;
    let fb = -1;
    for (let k = 0; k < lyrics.length; k++) {
      if (lyrics[k].time <= currentTime) fb = k;
      else break;
    }
    return fb;
  }, [lyrics, currentTime]);

  // Defer so centering does not thrash layout on every audio tick.
  const deferredIndex = useDeferredValue(activeIndex);

  // AUTO-CENTER the active line INSIDE this container only (never scroll the page).
  useEffect(() => {
    const container = containerRef.current;
    if (!container || deferredIndex === -1) return;
    const activeEl = container.querySelector(
      `#nl-desktop-lyric-${deferredIndex}`,
    ) as HTMLElement | null;
    if (!activeEl) return;
    const raf = window.requestAnimationFrame(() => {
      const cRect = container.getBoundingClientRect();
      const aRect = activeEl.getBoundingClientRect();
      const delta =
        (aRect.top - cRect.top) -
        (container.clientHeight / 2 - activeEl.clientHeight / 2);
      container.scrollTo({
        top: Math.max(0, container.scrollTop + delta),
        behavior: 'smooth',
      });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [deferredIndex, lyrics]);

  if (!lyrics || lyrics.length === 0) {
    return (
      <div className={`nl-desktop-lyrics nl-desktop-lyrics--${variant} nl-desktop-lyrics--empty`}>
        ♪ Loading lyrics......
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Lyrics"
      className={`nl-desktop-lyrics nl-desktop-lyrics--${variant} no-scrollbar`}
    >
      <div className="nl-desktop-lyrics__inner">
        {lyrics.map((line, i) => {
          const isActive = i === activeIndex;
          const isHeader = isHeaderLineHelper(line.text);

          if (isHeader) {
            return (
              <div key={`h-${i}-${line.time}`} className="nl-desktop-lyric-header">
                <span>{line.text.replace(/\[|\]/g, '')}</span>
              </div>
            );
          }

          return (
            <p
              key={`l-${i}-${line.time}`}
              id={`nl-desktop-lyric-${i}`}
              onClick={() => onSeek?.(line.time)}
              className={`nl-desktop-lyric-line${isActive ? ' is-active' : ''}`}
            >
              <span className="nl-lyric-text">{line.text}</span>
              {line.translation ? (
                <span className="nl-lyric-translation">{line.translation}</span>
              ) : null}
            </p>
          );
        })}
      </div>
    </div>
  );
};
