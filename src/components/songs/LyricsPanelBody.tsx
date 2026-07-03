/**
 * LyricsPanelBody — scrollable list inside the mobile bottom-sheet.
 * Colors are ALWAYS derived from theme CSS variables (--lyric-*),
 * so on the light midnight sheet the words become dark automatically,
 * and dark themes keep their own colors.
 */
import { useDeferredValue, useEffect, useRef } from 'react';
import type { LyricLine } from '../../types';

const isHeaderLineHelper = (text: string): boolean => {
  const t = text.trim().toLowerCase();
  return [
    'intro', 'chorus', 'verse', 'hook',
    'bridge', 'outro', 'solo', 'instrumental',
  ].some((kw) => t.includes(kw));
};

interface LyricsPanelBodyProps {
  lyrics: LyricLine[];
  currentLineIndex: number;
  onSeek?: (time: number) => void;
}

export const LyricsPanelBody = ({
  lyrics,
  currentLineIndex,
  onSeek,
}: LyricsPanelBodyProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const deferredIndex = useDeferredValue(currentLineIndex);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || deferredIndex === -1) return;
    const activeEl = container.querySelector(
      `#light-lyric-line-mobile-${deferredIndex}`,
    ) as HTMLElement | null;
    if (!activeEl) return;
    // توسيط السطر النشط عبر إحداثيات الشاشة (rect) — مناعة ضد تغيّر offsetParent
    // الناتج عن backdrop-filter في لوح midnight.
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
      <div className="flex flex-col items-center justify-center h-full gap-4" style={{ color: 'var(--lyric-inactive-color)' }}>
        <div className="spinner !w-6 !h-6" />
        <span className="text-xs font-mono uppercase tracking-widest">Loading lyrics...</span>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className="lyrics-panel-body flex-1 overflow-y-auto px-6 py-4 no-scrollbar mid-lyrics"
    >
      <div className="flex flex-col gap-4 py-8">
        {lyrics.map((line, i) => {
          const isActive = i === currentLineIndex;
          const isHeader = isHeaderLineHelper(line.text);
          const isArabic = /[\u0600-\u06FF]/.test(line.text);

          if (isHeader) {
            return (
              <div key={`lyric-mob-${i}`} className="flex justify-center my-6">
                <span
                  className="px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase border"
                  style={{
                    color: 'var(--lyric-inactive-color)',
                    borderColor: 'var(--lyric-inactive-color)',
                    background: 'transparent',
                  }}
                >
                  {line.text.replace(/\[|\]/g, '')}
                </span>
              </div>
            );
          }

          return (
            <div
              key={`lyric-mob-${i}`}
              id={`light-lyric-line-mobile-${i}`}
              onClick={() => onSeek?.(line.time)}
              className={`relative py-3 transition-transform duration-300 ${isActive ? 'scale-105' : ''}`}
              style={{
                textAlign: isArabic ? 'right' : 'left',
                direction: isArabic ? 'rtl' : 'ltr',
                cursor: 'pointer',
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: isActive ? 'var(--lyric-active-color)' : 'var(--lyric-inactive-color)',
                  fontWeight: isActive ? 700 : 400,
                  fontSize: isActive ? 'clamp(1.25rem, 5.5vw, 1.8rem)' : 'clamp(0.95rem, 3.8vw, 1.1rem)',
                  textShadow: isActive ? '0 0 14px var(--lyric-active-shadow)' : 'none',
                  opacity: isActive ? 1 : 0.85,
                  lineHeight: 1.45,
                  transition: 'color 200ms ease, opacity 200ms ease',
                }}
              >
                {line.text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
