import { useState, useRef, useEffect, useMemo, memo } from 'react';
import { LyricLine } from '../../types';

export const LyricsWindowContent = memo(({ 
  currentTime, 
  onSeek,
  lyrics = [],
  isMobilePlayer = false
}: { 
  currentTime: number; 
  onSeek: (time: number) => void;
  lyrics?: LyricLine[];
  isMobilePlayer?: boolean;
}) => {
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const currentLineRef = useRef<HTMLDivElement | null>(null);
  const currentTimeRef = useRef(currentTime);
  const currentWordElRef = useRef<HTMLSpanElement | null>(null);
  const lastProgressRef = useRef<number>(-1);

  const [hoveredLine, setHoveredLine] = useState<number | null>(null);

  // Sync currentTime to ref for the rAF loop
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  // ACTIVE-LINE DETECTION — use endTime if present
  const currentLineIndex = useMemo(() => {
    if (lyrics.length === 0) return -1;
    
    const index = lyrics.findIndex(l => currentTime >= l.time && currentTime < (l.endTime ?? Infinity));
    if (index !== -1) return index;
    
    // Fallback: last line whose time <= currentTime
    let fallbackIdx = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (lyrics[i].time <= currentTime) fallbackIdx = i;
      else break;
    }
    return fallbackIdx;
  }, [lyrics, currentTime]);



  // AUTO-SCROLL: يُوسّط السطر النشط دائمًا داخل الحاوية (سطح المكتب + الهاتف) ولا يحرّك الصفحة.
  useEffect(() => {
    if (currentLineIndex === -1) return;
    const container = lyricsContainerRef.current;
    const lineEl = lineRefs.current[currentLineIndex];
    if (!container || !lineEl) return;

    const scrollToTarget = () => {
      const cRect = container.getBoundingClientRect();
      const lRect = lineEl.getBoundingClientRect();
      const delta = (lRect.top - cRect.top) - (container.clientHeight / 2 - lineEl.clientHeight / 2);
      container.scrollTo({ top: Math.max(0, container.scrollTop + delta), behavior: 'smooth' });
    };
    const rafId = window.requestAnimationFrame(scrollToTarget);
    return () => window.cancelAnimationFrame(rafId);
  }, [currentLineIndex]);

  // SMOOTH PROGRESS loop — minimal per-frame work (no querySelector/getAttribute each frame).
  useEffect(() => {
    const activeLine = lyrics[currentLineIndex];
    if (!activeLine || !activeLine.words || activeLine.words.length < 2) {
      currentWordElRef.current = null;
      lastProgressRef.current = -1;
      return;
    }

    let rAFId = 0;
    currentWordElRef.current = null;
    lastProgressRef.current = -1;

    const updateProgress = () => {
      const lineEl = currentLineRef.current;
      if (lineEl) {
        // Re-query only when the current word element actually changed.
        const liveCurrent = lineEl.querySelector('.lyric-word--current') as HTMLSpanElement | null;
        if (liveCurrent !== currentWordElRef.current) {
          currentWordElRef.current = liveCurrent;
          lastProgressRef.current = -1;
        }
        const el = currentWordElRef.current;
        if (el) {
          const wTime = parseFloat(el.dataset.wordTime || '0');
          const wEndTime = parseFloat(el.dataset.wordEndtime || '0');
          const duration = wEndTime - wTime;
          if (duration > 0) {
            const ct = currentTimeRef.current;
            const pct = Math.round(Math.min(100, Math.max(0, ((ct - wTime) / duration) * 100)));
            // Early-exit: skip DOM write when the rounded percentage did not change.
            if (pct !== lastProgressRef.current) {
              lastProgressRef.current = pct;
              el.style.setProperty('--word-progress', `${pct}%`);
            }
          }
        }
      }
      rAFId = requestAnimationFrame(updateProgress);
    };

    rAFId = requestAnimationFrame(updateProgress);
    return () => cancelAnimationFrame(rAFId);
  }, [currentLineIndex, lyrics]);

  const lineStyle = (i: number): React.CSSProperties => {
    const isActive = i === currentLineIndex;
    const isHovered = hoveredLine === i;

    const baseStyle: React.CSSProperties = {
      padding: isMobilePlayer ? '10px 0' : '4px 8px',
      marginBottom: isMobilePlayer ? '0' : '1.5rem',
      // Specific properties only (no `all`), and will-change limited to the active line.
      transition: 'opacity 0.3s ease, transform 0.3s ease, color 0.3s ease',
      willChange: isActive ? 'opacity, transform' : 'auto',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
    };

    if (isMobilePlayer) {
      return {
        ...baseStyle,
        color: isActive ? 'var(--lyric-active-color)' : 'var(--lyric-inactive-color)',
        fontSize: isActive ? 'clamp(1.4rem, 6vw, 2rem)' : 'clamp(0.95rem, 3.8vw, 1.1rem)',
        fontWeight: isActive ? 'bold' : 'normal',
        textShadow: isActive ? '0 0 14px var(--lyric-active-shadow)' : 'none',
        opacity: isActive ? 1 : 0.4,
        lineHeight: 1.45,
        textAlign: 'center',
      };
    }
    return {
      ...baseStyle,
      opacity: isActive ? 1 : isHovered ? 0.7 : 0.2,
      color: isActive
        ? 'var(--lyric-active-color)'
        : isHovered
          ? 'var(--text-secondary)'
          : 'var(--lyric-inactive-color)',
      textShadow: isActive ? '0 0 14px var(--lyric-active-shadow)' : 'none',
      transform: isActive ? 'scale(1.04)' : 'scale(1)',
      background: isHovered ? 'var(--bg-glass)' : 'transparent',
    };
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleKeyDown = (e: React.KeyboardEvent, time: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSeek(time);
    }
  };

  return (
    <div 
      ref={lyricsContainerRef}
      role="region"
      aria-label="Lyrics"
      style={{
        flex: 1,
        position: 'relative',
        padding: isMobilePlayer ? '24px 20px' : '96px 20px',
        overflowY: 'auto',
        overflowX: 'hidden',
        fontFamily: '"Share Tech Mono", monospace',
        background: 'transparent',
        textAlign: 'center',
        fontSize: isMobilePlayer ? '18px' : 'clamp(18px, 1.35vw, 24px)',
        lineHeight: isMobilePlayer ? 2.2 : 2.35,
        WebkitOverflowScrolling: 'touch',
        height: '100%',
        minHeight: 0,
        scrollBehavior: 'smooth',
        userSelect: 'text',
        msOverflowStyle: 'none',
        scrollbarWidth: 'none'
      }}
      className="no-scrollbar mid-lyrics"
    >
      {lyrics.map((line, i) => {
        const isActive = i === currentLineIndex;
        return (
          <div 
            key={i} 
            ref={el => { 
              lineRefs.current[i] = el; 
              if (isActive) {
                currentLineRef.current = el;
              }
            }}
            role="button"
            aria-label={`Seek to ${formatTime(line.time)}`}
            tabIndex={0}
            onKeyDown={(e) => handleKeyDown(e, line.time)}
            onClick={() => onSeek(line.time)}
            onMouseEnter={() => !isMobilePlayer && setHoveredLine(i)}
            onMouseLeave={() => !isMobilePlayer && setHoveredLine(null)}
            style={lineStyle(i)}
          >
            {!isMobilePlayer && (
              <span style={{ 
                opacity: hoveredLine === i ? 1 : 0, 
                transition: 'opacity 150ms',
                fontSize: '10px',
                color: 'var(--text-primary)'
              }}>▶</span>
            )}
            
            {line.words && line.words.length >= 2 ? (
              <div
                style={isMobilePlayer ? {
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  maxWidth: '100vw',
                } : { display: 'inline', whiteSpace: 'pre-wrap' }}
              >
                {line.words.map((word, wIdx) => {
                  const isPlayed = currentTime >= word.time;
                  const isCurrent = currentTime >= word.time && currentTime < (word.endTime ?? (word.time + 1));
                  
                  let displayText = word.text;
                  const nextWord = line.words?.[wIdx + 1];
                  if (nextWord) {
                    const currentEndsWithSpace = /\s$/.test(word.text);
                    const nextStartsWithSpace = /^\s/.test(nextWord.text);
                    if (!currentEndsWithSpace && !nextStartsWithSpace) {
                      displayText += ' ';
                    }
                  }

                  return (
                    <span
                      key={wIdx}
                      className={isActive ? `lyric-word ${isPlayed ? 'lyric-word--played' : ''} ${isCurrent ? 'lyric-word--current' : ''}` : ''}
                      data-word-idx={wIdx}
                      data-word-time={word.time}
                      data-word-endtime={word.endTime}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSeek(word.time);
                      }}
                      style={{
                        display: 'inline-block',
                        whiteSpace: isMobilePlayer ? 'pre' : 'pre-wrap',
                        transition: 'all 0.15s ease-out, color 150ms ease',
                        color: isPlayed ? 'var(--played-color)' : 'var(--idle-color)',
                        textShadow: (isCurrent && isActive) ? 'var(--current-glow)' : 'none',
                        background: (isCurrent && isActive) 
                          ? 'linear-gradient(to right, var(--played-color) var(--word-progress, 0%), var(--idle-color) var(--word-progress, 0%))'
                          : undefined,
                        WebkitBackgroundClip: (isCurrent && isActive) ? 'text' : undefined,
                        WebkitTextFillColor: (isCurrent && isActive) ? 'transparent' : undefined,
                        cursor: 'pointer',
                        ['--played-color' as any]: 'var(--lyric-active-color, #FFFFFF)',
                        ['--idle-color' as any]: 'var(--lyric-inactive-color, rgba(255,255,255,0.35))',
                        ['--current-glow' as any]: '0 0 14px var(--lyric-active-shadow, rgba(255,255,255,0.6))',
                      }}
                    >
                      {displayText}
                    </span>
                  );
                })}
              </div>
            ) : (
              line.text
            )}

            {line.translation ? (
              <span
                className="lyric-translation"
                style={{ display: 'block', width: '100%', textAlign: 'center' }}
              >
                {(() => {
                  const tWords = line.translation.split(/(\s+)/).filter((s) => s.length > 0);
                  const start = line.time;
                  const end = line.endTime ?? (line.time + 4);
                  const span = Math.max(0.001, end - start);
                  const isArabicT = /[\u0600-\u06FF]/.test(line.translation);
                  return tWords.map((w, ti) => {
                    if (/^\s+$/.test(w)) return <span key={`t-sp-${ti}`}>{w}</span>;
                    const ratio = tWords.length > 1 ? ti / (tWords.length - 1) : 0;
                    const wordStart = start + span * ratio;
                    const played = currentTime >= wordStart;
                    return (
                      <span
                        key={`t-${ti}`}
                        dir={isArabicT ? 'rtl' : 'ltr'}
                        style={{
                          display: 'inline-block',
                          whiteSpace: 'pre',
                          color: played ? 'var(--lyric-played-color, var(--lyric-active-color))' : 'var(--lyric-inactive-color)',
                          opacity: played ? 1 : 0.45,
                          transition: 'color 200ms ease, opacity 200ms ease',
                        }}
                      >
                        {w}
                      </span>
                    );
                  });
                })()}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
});
