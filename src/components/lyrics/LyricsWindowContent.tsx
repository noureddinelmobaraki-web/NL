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
  const scrollTimeoutRef = useRef<number | null>(null);
  const currentTimeRef = useRef(currentTime);

  const [hoveredLine, setHoveredLine] = useState<number | null>(null);
  const [isManualScrolling, setIsManualScrolling] = useState(false); // MOBILE-ONLY
  const manualScrollTimerRef = useRef<number | null>(null); // MOBILE-ONLY

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

  // MOBILE-ONLY: Handle manual scroll detection
  const handleScroll = () => {
    if (!isMobilePlayer) return;
    setIsManualScrolling(true);
    if (manualScrollTimerRef.current) window.clearTimeout(manualScrollTimerRef.current);
    manualScrollTimerRef.current = window.setTimeout(() => {
      setIsManualScrolling(false);
    }, 3000);
  };

  // AUTO-SCROLL with 250ms debounce
  useEffect(() => {
    if (currentLineIndex !== -1 && lineRefs.current[currentLineIndex]) {
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = window.setTimeout(() => {
        if (!isManualScrolling) {
          lineRefs.current[currentLineIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 250);
    }
    
    return () => {
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [currentLineIndex, isManualScrolling]);

  // SMOOTH PROGRESS loop with requestAnimationFrame
  useEffect(() => {
    const activeLine = lyrics[currentLineIndex];
    if (!activeLine || !activeLine.words || activeLine.words.length < 2) {
      return;
    }

    let rAFId: number;
    
    const updateProgress = () => {
      if (currentLineRef.current) {
        const currentWordEl = currentLineRef.current.querySelector('.lyric-word--current') as HTMLSpanElement | null;
        if (currentWordEl) {
          const wTime = parseFloat(currentWordEl.getAttribute('data-word-time') || '0');
          const wEndTime = parseFloat(currentWordEl.getAttribute('data-word-endtime') || '0');
          const duration = wEndTime - wTime;
          
          if (duration > 0) {
            const ct = currentTimeRef.current;
            const pct = Math.min(100, Math.max(0, ((ct - wTime) / duration) * 100));
            currentWordEl.style.setProperty('--word-progress', `${pct}%`);
          }
        }
      }
      rAFId = requestAnimationFrame(updateProgress);
    };
    
    rAFId = requestAnimationFrame(updateProgress);
    return () => {
      cancelAnimationFrame(rAFId);
    };
  }, [currentLineIndex, lyrics]);

  const lineStyle = (i: number) => {
    const isActive = i === currentLineIndex;
    const isHovered = hoveredLine === i;
    
    const baseStyle: React.CSSProperties = {
      padding: isMobilePlayer ? '10px 0' : '4px 8px',
      marginBottom: isMobilePlayer ? '0' : '1.5rem',
      transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      willChange: 'opacity, text-shadow, transform',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
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
        textAlign: 'center' as const,
      };
    } else {
      return {
        ...baseStyle,
        opacity: isActive ? 1 : (isHovered ? 0.7 : 0.2),
        color: isActive 
          ? 'var(--lyric-active-color)' 
          : (isHovered ? 'var(--text-secondary)' : 'var(--lyric-inactive-color)'),
        textShadow: isActive ? '0 0 14px var(--lyric-active-shadow)' : 'none',
        transform: isActive ? 'scale(1.04)' : 'scale(1)',
        background: isHovered ? 'var(--bg-glass)' : 'transparent',
      };
    }
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
      onScroll={handleScroll}
      style={{
        flex: 1,
        padding: isMobilePlayer ? '24px 20px' : '40px 20px',
        overflowY: 'auto',
        fontFamily: '"Share Tech Mono", monospace',
        background: 'transparent',
        textAlign: 'center',
        fontSize: '18px',
        lineHeight: 2.2,
        WebkitOverflowScrolling: 'touch',
        height: '100%',
        userSelect: 'text',
        msOverflowStyle: 'none',
        scrollbarWidth: 'none'
      }}
      className="no-scrollbar"
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
          </div>
        );
      })}
    </div>
  );
});
