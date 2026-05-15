import React, { useState, useRef, useEffect, useMemo, memo } from 'react';
import { Music, X } from 'lucide-react';
import { useDeviceType } from '../hooks/useDeviceType';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { LyricLine, WindowGeometry, Song } from '../types';
import { LucideIcon } from 'lucide-react';

export function parseLRC(text: string): LyricLine[] {
  return text.trim().split('\n').map(line => {
    const m = line.match(/\[(\d+):(\d+\.\d+)\](.*)/);
    if (!m) return null;
    return { time: parseInt(m[1]) * 60 + parseFloat(m[2]), text: m[3].trim() };
  }).filter((line): line is LyricLine => line !== null);
}

const aeroWindowStyle: React.CSSProperties = {
  background: 'var(--bg-glass-strong)',
  backdropFilter: 'var(--backdrop-blur)',
  WebkitBackdropFilter: 'var(--backdrop-blur)',
  border: '1px solid var(--border-subtle)',
  borderTop: '1.5px solid var(--border-strong)',
  borderRadius: '8px 8px 4px 4px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
};

const aeroTitlebarStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  borderBottom: '1px solid var(--border-subtle)',
};

const WindowFrame = ({ 
  title, 
  icon: Icon, 
  children, 
  geometry, 
  setGeometry, 
  zIndex, 
  onFocus, 
  isFocused, 
  onClose,
  state: externalState
}: { 
  title: string; 
  icon: LucideIcon; 
  children: React.ReactNode; 
  geometry: WindowGeometry; 
  setGeometry: (g: WindowGeometry) => void;
  zIndex: number;
  onFocus: () => void;
  isFocused: boolean;
  onClose: () => void;
  state?: 'normal' | 'maximized' | 'minimized';
}) => {
  const [state, setState] = useState<'normal' | 'maximized' | 'minimized'>(externalState || 'normal');
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const { isMobile } = useDeviceType();
  const windowRef = useFocusTrap(isFocused);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (state === 'maximized') return;
    onFocus();
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - geometry.x,
      y: e.clientY - geometry.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const nx = e.clientX - dragOffset.current.x;
      const ny = e.clientY - dragOffset.current.y;
      setGeometry({ ...geometry, x: nx, y: ny });
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, geometry, setGeometry]);

  const toggleMaximize = () => setState(s => s === 'maximized' ? 'normal' : 'maximized');

  return (
    <div 
      ref={windowRef}
      style={{
        position: 'fixed',
        left: state === 'maximized' ? 0 : geometry.x,
        top: state === 'maximized' ? 0 : geometry.y,
        width: state === 'maximized' ? '100%' : geometry.width,
        height: state === 'maximized' ? '100%' : geometry.height,
        zIndex,
        display: state === 'minimized' ? 'none' : 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        pointerEvents: 'auto',
        transition: 'box-shadow 0.2s',
        ...aeroWindowStyle,
        boxShadow: isFocused 
          ? `0 25px 50px -12px rgba(0,0,0,0.5), ${aeroWindowStyle.boxShadow as string}` 
          : aeroWindowStyle.boxShadow
      }}
      onMouseDown={onFocus}
    >
      <div 
        style={{
          height: '32px',
          display: isMobile ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px',
          cursor: state === 'maximized' ? 'default' : 'move',
          flexShrink: 0,
          transition: 'background 0.2s ease',
          zIndex: 12,
          ...aeroTitlebarStyle
        }}
        onMouseDown={handleMouseDown}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontFamily: 'Segoe UI, Tahoma, sans-serif', fontSize: '13px', fontWeight: 500 }}>
          <Icon size={16} aria-hidden="true" style={{ opacity: 0.8 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px', textShadow: '0 0 10px rgba(var(--bg-page-rgb),0.5)' }}>{title}</span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button 
            onClick={toggleMaximize}
            style={{ 
              width: '28px', 
              height: '18px', 
              background: 'rgba(var(--text-primary-rgb),0.1)', 
              border: '1px solid var(--border-subtle)', 
              color: 'var(--text-primary)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: 0, 
              borderRadius: '3px', 
              cursor: 'pointer',
            }}
            aria-label={state === 'maximized' ? 'Restore' : 'Maximize'}
          >
            <div style={{ width: '10px', height: '8px', border: '1px solid currentColor', opacity: 0.7 }} aria-hidden="true" />
          </button>
          <button 
            onClick={onClose}
            style={{ 
              width: '45px', 
              height: '18px', 
              background: 'linear-gradient(180deg, #f08080 0%, #e05050 45%, #d03030 50%, #b02020 100%)', 
              border: '1px solid rgba(0,0,0,0.3)', 
              color: 'white', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: 0, 
              borderRadius: '3px',
              cursor: 'pointer',
              boxShadow: '0 0 2px rgba(255,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3)'
            }}
            aria-label="Close window"
          >
            <X size={14} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
};

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
        el.style.color = isActive ? 'var(--text-primary)' : 'var(--text-muted)';
        el.style.fontSize = isActive ? '19px' : '17px';
        el.style.fontWeight = isActive ? 'bold' : 'normal';
        el.style.textShadow = isActive ? '0 0 12px var(--accent-indigo)' : 'none';
      } else {
        const isHovered = hoveredLine === i;
        el.style.opacity = isActive ? '1' : (isHovered ? '0.7' : '0.2');
        el.style.color = isActive ? 'var(--text-primary)' : (isHovered ? 'var(--text-secondary)' : 'var(--text-muted)');
        el.style.textShadow = isActive ? '0 0 12px var(--accent-indigo)' : 'none';
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
              color: 'white'
            }}>▶</span>
          )}
          {line.text}
        </div>
      ))}
    </div>
  );
});

export const LyricsWindow = ({ 
  song, 
  currentTime, 
  onClose, 
  onSeek,
  geometry, 
  setGeometry, 
  zIndex, 
  onFocus,
  isFocused,
  lyrics,
  songBackground
}: { 
  song: Song; 
  currentTime: number; 
  onClose: () => void; 
  onSeek: (time: number) => void;
  geometry: WindowGeometry;
  setGeometry: (g: WindowGeometry) => void;
  zIndex: number;
  onFocus: () => void;
  isFocused: boolean;
  lyrics: LyricLine[];
  songBackground?: string;
}) => {
  return (
    <WindowFrame
      title={`Lyrics - ${song.title}`}
      icon={Music}
      geometry={geometry}
      setGeometry={setGeometry}
      zIndex={zIndex}
      onFocus={onFocus}
      isFocused={isFocused}
      onClose={onClose}
    >
      <div className="flex-1 overflow-hidden relative">
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          backgroundImage: songBackground ? `url('${songBackground}')` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(20px) brightness(0.4) saturate(0.7)',
          transform: 'scale(1.1)',
          borderRadius: 'inherit',
        }}>
        </div>
        <div style={{ position: 'relative', zIndex: 1, height: '100%' }}>
          <LyricsWindowContent currentTime={currentTime} onSeek={onSeek} lyrics={lyrics} />
        </div>
      </div>
    </WindowFrame>
  );
};
