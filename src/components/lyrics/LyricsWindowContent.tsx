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

  const currentLineIndex = useMemo(() => {
    if (lyrics.length === 0) return -1;
    let index = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (lyrics[i].time <= currentTime) index = i;
      else break;
    }
    return index;
  }, [lyrics, currentTime]);

  const [hoveredLine, setHoveredLine] = useState<number | null>(null);

  useEffect(() => {
    lineRefs.current.forEach((el, i) => {
      if (!el) return;
      const isActive = i === currentLineIndex;

      if (isMobilePlayer) {
        el.style.color = isActive ? 'var(--lyric-active-color)' : 'var(--lyric-inactive-color)';
        el.style.fontSize = isActive ? '19px' : '17px';
        el.style.fontWeight = isActive ? 'bold' : 'normal';
        el.style.textShadow = isActive ? '0 0 14px var(--lyric-active-shadow)' : 'none';
      } else {
        const isHovered = hoveredLine === i;
        el.style.opacity = isActive ? '1' : (isHovered ? '0.7' : '0.2');
        el.style.color = isActive ? 'var(--lyric-active-color)' : (isHovered ? 'var(--text-secondary)' : 'var(--lyric-inactive-color)');
        el.style.textShadow = isActive ? '0 0 14px var(--lyric-active-shadow)' : 'none';
        el.style.transform = isActive ? 'scale(1.04)' : 'scale(1)';
        el.style.background = isHovered ? 'var(--bg-glass)' : 'transparent';
      }
    });

    if (currentLineIndex !== -1 && lineRefs.current[currentLineIndex]) {
      lineRefs.current[currentLineIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentLineIndex, hoveredLine, isMobilePlayer]);

  return (
    <div 
      ref={lyricsContainerRef}
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
      {lyrics.map((line, i) => (
        <div 
          key={i} 
          ref={el => { lineRefs.current[i] = el; }}
          onClick={() => onSeek(line.time)}
          onMouseEnter={() => !isMobilePlayer && setHoveredLine(i)}
          onMouseLeave={() => !isMobilePlayer && setHoveredLine(null)}
          style={{
            padding: isMobilePlayer ? '10px 0' : '4px 8px',
            marginBottom: isMobilePlayer ? '0' : '1.5rem',
            transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            willChange: 'opacity, text-shadow, transform',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          {!isMobilePlayer && (
            <span style={{ 
              opacity: hoveredLine === i ? 1 : 0, 
              transition: 'opacity 150ms',
              fontSize: '10px',
              color: 'var(--text-primary)'
            }}>▶</span>
          )}
          {line.text}
        </div>
      ))}
    </div>
  );
});
