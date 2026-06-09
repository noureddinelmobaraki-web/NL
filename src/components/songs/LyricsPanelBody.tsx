/**
 * LyricsPanelBody — scrollable list inside the mobile bottom-sheet.
 *
 * Responsibilities:
 *   1. Auto-scroll the active line to ~40% from top (via useDeferredValue
 *      to coalesce work during fast time updates).
 *   2. Render each line with RTL detection (Arabic).
 *   3. Apply `will-change: opacity` ONLY to the active line — keeps paint
 *      cost minimal on long lyrics (100+ lines).
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
  // Defer the scroll computation during high-frequency time updates.
  // The user perceives the highlight instantly (CSS), while the expensive
  // smoothScroll gets coalesced.
  const deferredIndex = useDeferredValue(currentLineIndex);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || deferredIndex === -1) return;
    const activeEl = container.querySelector(
      `#light-lyric-line-mobile-${deferredIndex}`,
    ) as HTMLElement | null;
    if (!activeEl) return;
    const target = activeEl.offsetTop - container.clientHeight * 0.4;
    container.scrollTo({ top: target, behavior: 'smooth' });
  }, [deferredIndex, lyrics]);

  if (!lyrics || lyrics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-500">
        <div className="spinner !w-6 !h-6" />
        <span className="text-xs font-mono uppercase tracking-widest">تحميل الكلمات...</span>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto px-6 py-4 no-scrollbar"
      style={{
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
      }}
    >
      <div className="flex flex-col gap-4 py-8">
        {lyrics.map((line, i) => {
          const isActive = i === currentLineIndex;
          const isHeader = isHeaderLineHelper(line.text);
          const isArabic = /[\u0600-\u06FF]/.test(line.text);

          if (isHeader) {
            return (
              <div key={`lyric-mob-${i}`} className="flex justify-center my-6">
                <span className="bg-white/5 px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase text-white/40 border border-white/5">
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
              className={`
                relative py-3 transition-all duration-300 transform
                ${isActive ? 'scale-105 opacity-100' : 'opacity-30 hover:opacity-50'}
              `}
              style={{
                textAlign: isArabic ? 'right' : 'left',
                direction: isArabic ? 'rtl' : 'ltr',
                // Apply paint hint ONLY to the active line.
                willChange: isActive ? 'opacity, transform' : 'auto',
              }}
            >
              <p
                style={{
                  fontFamily: isArabic
                    ? 'var(--font-manga, sans-serif)'
                    : 'var(--font-sans, sans-serif)',
                  fontSize: 'clamp(1.4rem, 6vw, 2.2rem)',
                  fontWeight: isActive ? 800 : 700,
                  lineHeight: 1.3,
                  color: isActive ? 'var(--text-primary, white)' : 'white',
                  textShadow: isActive ? '0 0 30px rgba(255,255,255,0.3)' : 'none',
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
