import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { Play, Pause, Music, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useDeviceType } from '../hooks/useDeviceType';
import { extractDominantColor } from '../utils/extractColors';
import { ActiveSong } from '../App';

interface LyricLine {
  time: number;
  text: string;
}

interface Song {
  id: number;
  title: string;
  url: string;
  lrc: string | null;
  cover?: string;
}

const songs: Song[] = [
  { id: 1,  title: "TRI9 TBAWE9",           url: "https://github.com/user-attachments/files/27562010/TRI9.TBAWE9.mp3",             lrc: "/lrc/TRI9 TBAWE9.lrc", cover: "/images/playlist_cover.jpg" },
  { id: 2,  title: "VETO",                   url: "https://github.com/user-attachments/files/27562012/VETO.mp3",                    lrc: "/lrc/VETO.lrc" },
  { id: 3,  title: "TOTAL",                  url: "https://github.com/user-attachments/files/27562017/TOTAL.mp3",                   lrc: "/lrc/TOTAL.lrc" },
  { id: 4,  title: "7CHAYCHI DIMO9RATI",     url: "https://github.com/user-attachments/files/27562028/7CHAYCHI.DIMO9RATI.mp3",     lrc: "/lrc/7CHAYCHI DIMO9RATI.lrc" },
  { id: 5,  title: "A Lot",                  url: "https://github.com/user-attachments/files/27562033/A.Lot.mp3",                   lrc: "/lrc/A Lot.lrc" },
  { id: 6,  title: "BEAUTIFUL",              url: "https://github.com/user-attachments/files/27562034/BEAUTIFUL.mp3",               lrc: null },
  { id: 7,  title: "Bouh",                   url: "https://github.com/user-attachments/files/27562039/Bouh.mp3",                    lrc: "/lrc/Bouh.lrc" },
  { id: 8,  title: "Brain Damage",           url: "https://github.com/user-attachments/files/27562042/Brain.Damage.mp3",            lrc: "/lrc/Brain Damage.lrc" },
  { id: 9,  title: "Deal With The Devil",    url: "https://github.com/user-attachments/files/27562043/Deal.With.The.Devil.mp3",    lrc: "/lrc/Deal With The Devil.lrc" },
  { id: 10, title: "Dokhana V2",             url: "https://github.com/user-attachments/files/27562044/Dokhana.V2.mp3",              lrc: null },
  { id: 11, title: "GOUROU",                 url: "https://github.com/user-attachments/files/27562046/GOUROU.mp3",                  lrc: "/lrc/GOUROU.lrc" },
  { id: 12, title: "ITCHY W SCRATCHY",       url: "https://github.com/user-attachments/files/27562047/ITCHY.W.SCRATCHY.mp3",       lrc: null },
  { id: 13, title: "KOUN NADI",              url: "https://github.com/user-attachments/files/27562048/KOUN.NADI.mp3",               lrc: "/lrc/KOUN NADI.lrc" },
  { id: 14, title: "L'AI Could Never",       url: "https://github.com/user-attachments/files/27562049/L.AI.Could.Never.mp3",       lrc: "/lrc/L'AI Could Never.lrc" },
  { id: 15, title: "L'bayda Mon Amour",      url: "https://github.com/user-attachments/files/27562051/L.bayda.Mon.Amour.mp3",      lrc: "/lrc/L'bayda Mon Amour.lrc" },
  { id: 16, title: "Let The Rhythm Hit 'em", url: "https://github.com/user-attachments/files/27562053/Let.The.Rhythm.Hit.em.mp3",  lrc: "/lrc/Let The Rhythm Hit 'em.lrc" },
  { id: 17, title: "LMORPHINIYA 31",         url: "https://github.com/user-attachments/files/27562055/LMORPHINIYA.31.mp3",          lrc: null },
  { id: 18, title: "LMORPHINIYA 33",         url: "https://github.com/user-attachments/files/27562057/LMORPHINIYA.33.mp3",          lrc: null },
  { id: 19, title: "LMORPHINIYA 1013",       url: "https://github.com/user-attachments/files/27562059/LMORPHINIYA.1013.mp3",       lrc: "/lrc/LMORPHINIYA 1013.lrc" },
  { id: 20, title: "Lmorphinya 19 V2",       url: "https://github.com/user-attachments/files/27562060/Lmorphinya.19.V2.mp3",       lrc: null },
  { id: 21, title: "MAGNETO",                url: "https://github.com/user-attachments/files/27562061/MAGNETO.mp3",                 lrc: "/lrc/MAGNETO.lrc" },
  { id: 22, title: "None Shall Pass",        url: "https://github.com/user-attachments/files/27562062/None.Shall.Pass.mp3",        lrc: "/lrc/None Shall Pass.lrc" },
  { id: 23, title: "Ohio",                   url: "https://github.com/user-attachments/files/27562063/Ohio.mp3",                   lrc: "/lrc/OHIO.lrc" },
  { id: 24, title: "Ostora",                 url: "https://github.com/user-attachments/files/27562064/Ostora.mp3",                  lrc: "/lrc/Ostora.lrc" },
  { id: 25, title: "Tromso",                 url: "https://github.com/user-attachments/files/27562065/Tromso.mp3",                  lrc: "/lrc/Tromso.lrc" },
];

const PRIMARY_RGB = "99, 102, 241"; 

function parseLRC(text: string): LyricLine[] {
  return text.trim().split('\n').map(line => {
    const m = line.match(/\[(\d+):(\d+\.\d+)\](.*)/);
    if (!m) return null;
    return { time: parseInt(m[1]) * 60 + parseFloat(m[2]), text: m[3].trim() };
  }).filter((line): line is LyricLine => line !== null);
}

const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const SNAP_THRESHOLD = 20;
const MIN_WINDOW_WIDTH = 280;
const MIN_WINDOW_HEIGHT = 100;

type WindowState = 'normal' | 'maximized' | 'minimized';

interface WindowGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

const applySnapping = (
  newPos: { x: number; y: number },
  size: { width: number; height: number },
  others: { x: number; y: number; width: number; height: number }[]
) => {
  let { x, y } = newPos;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Snap to screen edges
  if (Math.abs(x) < SNAP_THRESHOLD) x = 0;
  if (Math.abs(x + size.width - vw) < SNAP_THRESHOLD) x = vw - size.width;
  if (Math.abs(y) < SNAP_THRESHOLD) y = 0;
  if (Math.abs(y + size.height - vh) < SNAP_THRESHOLD) y = vh - size.height;

  // Snap to other windows
  others.forEach(other => {
    // Horizontal snaps
    if (Math.abs((x + size.width) - other.x) < SNAP_THRESHOLD) x = other.x - size.width;
    else if (Math.abs(x - (other.x + other.width)) < SNAP_THRESHOLD) x = other.x + other.width;
    
    // Vertical snaps
    if (Math.abs((y + size.height) - other.y) < SNAP_THRESHOLD) y = other.y - size.height;
    else if (Math.abs(y - (other.y + other.height)) < SNAP_THRESHOLD) y = other.y + other.height;

    // Alignment snaps
    if (Math.abs(x - other.x) < SNAP_THRESHOLD) x = other.x;
    if (Math.abs(y - other.y) < SNAP_THRESHOLD) y = other.y;
  });

  return { x, y };
};

const WindowFrame = ({ 
  title, 
  icon: Icon,
  geometry, 
  setGeometry, 
  zIndex, 
  onFocus, 
  isFocused, 
  onClose,
  children,
  otherWindowRect,
  minHeight = MIN_WINDOW_HEIGHT
}: { 
  title: string;
  icon: any;
  geometry: WindowGeometry;
  setGeometry: (g: WindowGeometry) => void;
  zIndex: number;
  onFocus: () => void;
  isFocused: boolean;
  onClose: () => void;
  children: React.ReactNode;
  otherWindowRect?: WindowGeometry | null;
  minHeight?: number;
}) => {
  const windowRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<WindowState>('normal');
  const cachedGeometry = useRef<WindowGeometry>(geometry);
  const rafId = useRef<number | null>(null);
  const { isMobile } = useDeviceType();
  
  const interaction = useRef({
    isInteracting: false,
    mode: 'none' as 'move' | 'resize',
    handle: '' as 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw',
    startPos: { x: 0, y: 0 },
    startGeom: { ...geometry },
    currentGeom: { ...geometry }
  });

  useEffect(() => {
    if (!interaction.current.isInteracting && state === 'normal' && !isMobile) {
      if (windowRef.current) {
        windowRef.current.style.transform = `translate3d(${geometry.x}px, ${geometry.y}px, 0)`;
        windowRef.current.style.width = `${geometry.width}px`;
        windowRef.current.style.height = `${geometry.height}px`;
      }
    }
  }, [geometry, state, isMobile]);

  const handlePointerDown = (e: React.PointerEvent, mode: 'move' | 'resize', handle = '') => {
    if (isMobile) return;
    if (state === 'maximized' && mode === 'move') return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;

    onFocus();
    interaction.current = {
      isInteracting: true,
      mode,
      handle: handle as any,
      startPos: { x: e.clientX, y: e.clientY },
      startGeom: { ...geometry },
      currentGeom: { ...geometry }
    };

    if (windowRef.current) {
      windowRef.current.style.pointerEvents = 'none';
      windowRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!interaction.current.isInteracting) return;

    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      const dx = e.clientX - interaction.current.startPos.x;
      const dy = e.clientY - interaction.current.startPos.y;
      const { mode, handle, startGeom } = interaction.current;

      let newGeom = { ...startGeom };

      if (mode === 'move') {
        const rawPos = { x: startGeom.x + dx, y: startGeom.y + dy };
        const snapped = applySnapping(rawPos, { width: startGeom.width, height: startGeom.height }, otherWindowRect ? [otherWindowRect] : []);
        newGeom.x = snapped.x;
        newGeom.y = snapped.y;
      } else if (mode === 'resize') {
        if (handle.includes('e')) newGeom.width = Math.max(MIN_WINDOW_WIDTH, startGeom.width + dx);
        if (handle.includes('s')) newGeom.height = Math.max(minHeight, startGeom.height + dy);
        if (handle.includes('w')) {
          const possibleWidth = Math.max(MIN_WINDOW_WIDTH, startGeom.width - dx);
          newGeom.x = startGeom.x + (startGeom.width - possibleWidth);
          newGeom.width = possibleWidth;
        }
        if (handle.includes('n')) {
          const possibleHeight = Math.max(minHeight, startGeom.height - dy);
          newGeom.y = startGeom.y + (startGeom.height - possibleHeight);
          newGeom.height = possibleHeight;
        }

        // Viewport clamping
        newGeom.x = Math.max(0, Math.min(window.innerWidth - newGeom.width, newGeom.x));
        newGeom.y = Math.max(0, Math.min(window.innerHeight - newGeom.height, newGeom.y));
      }

      if (windowRef.current) {
        windowRef.current.style.transform = `translate3d(${newGeom.x}px, ${newGeom.y}px, 0)`;
        windowRef.current.style.width = `${newGeom.width}px`;
        windowRef.current.style.height = `${newGeom.height}px`;
      }
      
      interaction.current.currentGeom = newGeom;
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!interaction.current.isInteracting) return;
    interaction.current.isInteracting = false;
    if (windowRef.current) {
      windowRef.current.style.pointerEvents = 'auto';
      windowRef.current.releasePointerCapture(e.pointerId);
    }
    setGeometry(interaction.current.currentGeom);
  };

  const toggleMaximize = () => {
    if (state === 'maximized') {
      setState('normal');
      setGeometry(cachedGeometry.current);
    } else {
      cachedGeometry.current = { ...geometry };
      setState('maximized');
      const maxGeom = { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
      setGeometry(maxGeom);
    }
  };

  return (
    <div 
      ref={windowRef}
      onPointerDown={(e) => handlePointerDown(e, 'move')}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onMouseDown={onFocus}
      className={isMobile ? "mobile-fullscreen" : ""}
      style={{ 
        position: 'fixed', 
        left: 0, 
        top: 0, 
        zIndex,
        display: state === 'minimized' ? 'none' : 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        border: (state === 'maximized' || isMobile) ? 'none' : '2px ridge #ccc',
        boxShadow: (isFocused && !isMobile) ? '0 20px 50px rgba(0,0,0,0.9), 0 0 30px rgba(99, 102, 241, 0.3)' : (isMobile ? 'none' : '4px 4px 15px rgba(0,0,0,0.6)'),
        backgroundColor: '#1a1a2e',
        userSelect: 'none',
        overflow: 'hidden',
        transition: 'box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1), height 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        willChange: 'transform, width, height',
        contain: 'layout size',
      }}
    >
      {isMobile && (
        <button className="mobile-back-btn" onClick={onClose}>
          <ChevronLeft size={20} /> Back
        </button>
      )}
      {/* 8 Resize Handles */}
      {state === 'normal' && !isMobile && (
        <>
          <div onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, 'resize', 'n'); }} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', cursor: 'ns-resize', zIndex: 10 }} />
          <div onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, 'resize', 's'); }} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', cursor: 'ns-resize', zIndex: 10 }} />
          <div onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, 'resize', 'e'); }} style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '4px', cursor: 'ew-resize', zIndex: 10 }} />
          <div onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, 'resize', 'w'); }} style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '4px', cursor: 'ew-resize', zIndex: 10 }} />
          <div onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, 'resize', 'nw'); }} style={{ position: 'absolute', top: 0, left: 0, width: '10px', height: '10px', cursor: 'nwse-resize', zIndex: 11 }} />
          <div onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, 'resize', 'ne'); }} style={{ position: 'absolute', top: 0, right: 0, width: '10px', height: '10px', cursor: 'nesw-resize', zIndex: 11 }} />
          <div onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, 'resize', 'sw'); }} style={{ position: 'absolute', bottom: 0, left: 0, width: '10px', height: '10px', cursor: 'nesw-resize', zIndex: 11 }} />
          <div onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, 'resize', 'se'); }} style={{ position: 'absolute', bottom: 0, right: 0, width: '10px', height: '10px', cursor: 'nwse-resize', zIndex: 11 }} />
        </>
      )}

      {/* Control Bar */}
      <div 
        className={isMobile ? "desktop-only" : ""}
        style={{
          height: '32px',
          background: isFocused ? 'linear-gradient(to right, #0058a3, #2d8acd)' : 'linear-gradient(to right, #444, #666)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px',
          cursor: state === 'maximized' ? 'default' : 'move',
          flexShrink: 0,
          borderBottom: '1px solid #003366',
          transition: 'background 0.2s ease',
          zIndex: 12
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontFamily: 'Tahoma, sans-serif', fontSize: '12px', fontWeight: 'bold' }}>
          <Icon size={14} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>{title}</span>
        </div>
        <div style={{ display: 'flex', gap: '2px' }}>
          <button 
            onClick={toggleMaximize}
            style={{ width: '21px', height: '21px', backgroundColor: '#3498db', border: '1px solid #fff', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, borderRadius: '2px' }}
          >
            <div style={{ width: '10px', height: '8px', border: '1px solid white', borderTop: '2px solid white' }} />
          </button>
          <button 
            onClick={onClose}
            className="hover:brightness-110 active:brightness-90 transition-all font-bold"
            style={{ width: '21px', height: '21px', backgroundColor: '#c0392b', border: '1px solid #fff', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, borderRadius: '2px' }}
          >
            <X size={14} strokeWidth={3} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
};

const LyricsWindowContent = ({ 
  song, 
  currentTime, 
  onSeek,
  lyrics = [],
  isMobilePlayer = false
}: { 
  song: Song; 
  currentTime: number; 
  onSeek: (time: number) => void;
  lyrics?: LyricLine[];
  isMobilePlayer?: boolean;
}) => {
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const { isMobile } = useDeviceType();

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
        el.style.opacity = '1';
        el.style.color = isActive ? 'white' : 'rgba(255,255,255,0.35)';
        el.style.fontSize = isActive ? '19px' : '17px';
        el.style.fontWeight = isActive ? 'bold' : 'normal';
        el.style.textShadow = isActive ? '0 0 12px rgba(255,255,255,0.5)' : 'none';
        el.style.transform = 'none';
        el.style.background = 'transparent';
      } else {
        const isHovered = hoveredLine === i;
        el.style.opacity = isActive ? '1' : (isHovered ? '0.7' : '0.2');
        el.style.color = isActive ? 'var(--primary-accent, #fff)' : (isHovered ? 'rgba(255,255,255,0.7)' : '#7a7a9a');
        el.style.textShadow = isActive ? '0 0 15px rgba(var(--primary-rgb), 1), 0 0 30px rgba(var(--primary-rgb), 0.5)' : 'none';
        el.style.transform = isActive ? 'scale(1.04)' : 'scale(1)';
        el.style.background = isHovered ? 'rgba(255,255,255,0.05)' : 'transparent';
        el.style.borderRadius = '4px';
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
        padding: isMobilePlayer ? '24px 20px' : (isMobile ? '20px 16px' : '40px 20px'),
        overflowY: 'auto',
        fontFamily: isMobilePlayer ? "'Share Tech Mono', monospace" : '"Share Tech Mono", monospace',
        background: 'transparent',
        textAlign: 'center',
        fontSize: isMobilePlayer ? '17px' : (isMobile ? '17px' : '18px'),
        lineHeight: isMobilePlayer ? 1.8 : 2.2,
        WebkitOverflowScrolling: 'touch'
      }}
      className={`no-scrollbar selectable h-full`}
    >
      {lyrics.map((line, i) => (
        <div 
          key={i} 
          ref={el => { lineRefs.current[i] = el; }}
          onClick={() => onSeek(line.time)}
          onMouseEnter={() => !isMobilePlayer && setHoveredLine(i)}
          onMouseLeave={() => !isMobilePlayer && setHoveredLine(null)}
          onTouchStart={() => {
            if (!isMobilePlayer) {
              setHoveredLine(i);
              setTimeout(() => setHoveredLine(null), 200);
            }
          }}
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
      {lyrics.length === 0 && (
        <div style={{
          color: isMobilePlayer ? 'rgba(255,255,255,0.3)' : '#7a7a9a',
          fontSize: isMobilePlayer ? '15px' : '14px',
          fontFamily: 'monospace',
          fontStyle: 'italic',
          marginTop: '40px',
          textAlign: 'center'
        }}>
          {song.lrc ? "Loading lyrics..." : (isMobilePlayer ? "ما كاينش ترجمة لهاد الأغنية" : "No lyrics available")}
        </div>
      )}
    </div>
  );
};

const LyricsWindow = ({ 
  song, 
  currentTime, 
  onClose, 
  onSeek,
  geometry, 
  setGeometry, 
  zIndex, 
  onFocus,
  isFocused,
  otherWindowRect,
  lyrics
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
  otherWindowRect: WindowGeometry | null;
  lyrics: LyricLine[];
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
      otherWindowRect={otherWindowRect}
    >
      <div className="flex-1 bg-[#0d0d1a] overflow-hidden">
        <LyricsWindowContent song={song} currentTime={currentTime} onSeek={onSeek} lyrics={lyrics} />
      </div>
    </WindowFrame>
  );
};

const SongCard = memo(({ 
  song, 
  index,
  isActive, 
  isActiveInBar,
  isPlaying,
  isWaiting,
  onPlay,
  setLyricsOpen
}: { 
  song: Song; 
  index: number;
  isActive: boolean; 
  isActiveInBar: boolean;
  isPlaying: boolean;
  isWaiting: boolean;
  onPlay: () => void;
  setLyricsOpen: (open: boolean) => void;
}) => {
  return (
    <div className={`bg-zinc-900/90 border p-5 rounded-lg flex flex-col gap-3 transition-all hover:border-white/20 group ${isActive ? 'border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.1)]' : 'border-white/5'}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <span className={`font-mono text-sm ${isActive ? 'text-indigo-400' : 'text-zinc-600'}`}>{(index + 1).toString().padStart(2, '0')}</span>
          <div className="flex flex-col min-w-0">
            <h3 className={`font-medium truncate ${isActive ? 'text-white' : 'text-zinc-300'}`}>{song.title}</h3>
            <span className={`text-[10px] uppercase tracking-widest ${song.lrc ? 'text-indigo-400/60' : 'text-zinc-700'}`}>
              {song.lrc ? "Lyrics available" : "No lyrics"}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {song.lrc && (
            <button 
              onClick={(e) => { e.stopPropagation(); setLyricsOpen(true); }}
              className="text-[10px] uppercase tracking-wider font-bold text-indigo-400 hover:text-white transition-colors border border-indigo-500/30 px-2 py-1 rounded"
            >
              Lyrics
            </button>
          )}
          {!isActiveInBar && (
            <button
              onClick={onPlay}
              className={`w-12 h-12 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shrink-0 ${isActive && isPlaying ? 'bg-indigo-500 text-white' : 'bg-white text-black'}`}
            >
              {isActive && isWaiting ? (
                <div className="spinner" />
              ) : (
                isActive && isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="ml-1" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export const MySongs = ({ 
  onSongPlay,
  onActiveSongChange 
}: { 
  onSongPlay: () => void;
  onActiveSongChange: (data: ActiveSong | null) => void;
}) => {
  const [activeId, setActiveId] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume] = useState(0.7);
  const [showWindows, setShowWindows] = useState({ lyrics: false });
  const [focusedWindow, setFocusedWindow] = useState<'lyrics' | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const [mobileFullscreen, setMobileFullscreen] = useState<number | null>(null);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [lrcCache, setLrcCache] = useState<Record<number, LyricLine[]>>({});
  const [ambientColor, setAmbientColor] = useState('20, 20, 30');
  const { isMobile } = useDeviceType();

  // Geometry lifting for the window system
  const [lyricsGeom, setLyricsGeom] = useState<WindowGeometry>(() => ({ 
    x: typeof window !== 'undefined' ? window.innerWidth - 380 : 0, 
    y: 150, 
    width: 340, 
    height: 450 
  }));

  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const currentSong = useMemo(() => songs.find(s => s.id === activeId) || null, [activeId]);

  useEffect(() => {
    if (activeId && currentSong && currentSong.lrc && !lrcCache[activeId]) {
      const filename = currentSong.lrc.split('/').pop();
      fetch(`${import.meta.env.BASE_URL}lrc/${filename}`)
        .then(res => res.text())
        .then(text => {
          const parsed = parseLRC(text);
          setLrcCache(prev => ({ ...prev, [activeId]: parsed }));
        })
        .catch(() => {});
    }
  }, [activeId, currentSong, lrcCache]);

  // Ambient Mode Color Extraction
  useEffect(() => {
    if (currentSong?.cover) {
      const img = new Image();
      img.src = currentSong.cover;
      img.onload = () => {
        extractDominantColor(img, (color) => setAmbientColor(color));
      };
      img.onerror = () => {
        setAmbientColor('20, 20, 30');
      };
    } else {
      setAmbientColor('20, 20, 30');
    }
  }, [activeId, currentSong]);

  useEffect(() => {
    if (mobileFullscreen !== null) {
      setTimeout(() => setIsOverlayOpen(true), 10);
    } else {
      setIsOverlayOpen(false);
    }
  }, [mobileFullscreen]);

  const handleNext = useCallback(() => {
    if (!activeId) return;
    const idx = songs.findIndex(s => s.id === activeId);
    const nextIdx = (idx + 1) % songs.length;
    handlePlayToggle(songs[nextIdx]);
  }, [activeId]);

  const handlePrev = useCallback(() => {
    if (!activeId) return;
    const idx = songs.findIndex(s => s.id === activeId);
    const prevIdx = (idx - 1 + songs.length) % songs.length;
    handlePlayToggle(songs[prevIdx]);
  }, [activeId]);

  const initAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current;
    
    const audio = new Audio();
    audioRef.current = audio;
    return audio;
  }, []);

  const handlePlayToggle = useCallback((song?: Song) => {
    const audio = initAudio();

    if (song && song.id !== activeId) {
      if (isMobile) {
        setMobileFullscreen(song.id);
      }
      setActiveId(song.id);
      audio.src = song.url;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
      setIsPlaying(true);
      onSongPlay();
      
      // Proximity Spawning
      if (window.innerWidth > 768) {
        const basePos = { x: window.innerWidth - 400, y: 100 };
        setLyricsGeom(prev => ({ ...prev, x: basePos.x, y: basePos.y }));
      }
      
      if (!isMobile) {
        setShowWindows({ lyrics: !!song.lrc });
        setFocusedWindow(song.lrc ? 'lyrics' : null);
      }
    } else {
      if (isPlaying) {
        if (audioRef.current) audioRef.current.pause();
        setIsPlaying(false);
      } else if (activeId) {
        const audio = audioRef.current;
        if (audio) {
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch(() => {});
          }
          setIsPlaying(true);
          onSongPlay();
          if (isMobile) {
            setMobileFullscreen(activeId);
          }
        }
      }
    }
  }, [activeId, isMobile, isPlaying, onSongPlay, currentSong, initAudio]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => setDuration(audio.duration);
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration || 0);
    };
    const onWaiting = () => setIsWaiting(true);
    const onCanPlay = () => setIsWaiting(false);
    const onPlaying = () => setIsWaiting(false);
    const onEnded = () => handleNext();

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('ended', onEnded);
    };
  }, [handleNext]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || isMobile) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          handlePlayToggle();
          break;
        case 'arrowleft':
          e.preventDefault();
          if (audioRef.current) audioRef.current.currentTime -= 5;
          break;
        case 'arrowright':
          e.preventDefault();
          if (audioRef.current) audioRef.current.currentTime += 5;
          break;
        case 'm':
          if (audioRef.current) {
            audioRef.current.muted = !audioRef.current.muted;
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isMobile, currentSong]);

  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.src = "";
        audio.load();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const handleSeek = useCallback((val: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  }, []);

  // Notify parent of state changes
  useEffect(() => {
    if (onActiveSongChange) {
      if (activeId && currentSong) {
        onActiveSongChange({
          id: activeId,
          title: currentSong.title,
          audioRef: audioRef,
          isPlaying,
          currentTime,
          duration,
          onPlayPause: () => handlePlayToggle(),
          onPrev: handlePrev,
          onNext: handleNext,
        });
      } else {
        onActiveSongChange(null);
      }
    }
  }, [activeId, isPlaying, currentTime, duration, onActiveSongChange, handlePrev, handleNext, handlePlayToggle, currentSong]);

  const renderedSongs = useMemo(() => {
    return songs.map((song, i) => (
      <SongCard 
        key={song.id} 
        index={i}
        song={song} 
        isActive={activeId === song.id}
        isActiveInBar={activeId === song.id && !isMobile}
        isPlaying={isPlaying}
        isWaiting={isWaiting}
        onPlay={() => handlePlayToggle(song)}
        setLyricsOpen={(open: boolean) => {
          setActiveId(song.id);
          if (isMobile) {
            setMobileFullscreen(song.id);
          } else {
            setShowWindows(prev => ({ ...prev, lyrics: open }));
            setFocusedWindow('lyrics');
          }
        }}
      />
    ));
  }, [activeId, isPlaying, isWaiting, isMobile, handlePlayToggle]);

  return (
    <section 
      id="my-songs-section" 
      className="w-full py-20 px-6 sm:px-12 backdrop-blur-sm border-y border-white/5 font-sans selection:bg-indigo-500/30 relative"
      style={{
        background: `radial-gradient(ellipse at top, rgba(${ambientColor}, 0.3) 0%, transparent 70%), black`,
        transition: 'background 1500ms ease'
      }}
    >
      <div className="max-w-6xl mx-auto relative z-10">
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-16">
          <div className="space-y-4">
            <h1 className="text-6xl sm:text-8xl font-black italic tracking-tighter uppercase leading-none text-white">
              MY SONGS
            </h1>
          </div>
          <div className="h-px flex-1 bg-zinc-800 hidden sm:block mx-12 mb-4" />
          <div className="text-right">
            <span className="text-indigo-500 font-mono text-xl">{songs.length}</span>
            <span className="text-zinc-600 text-xs uppercase tracking-widest ml-2">Tracks total</span>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {renderedSongs}
        </div>

        {isMobile && mobileFullscreen !== null && currentSong && (
          <div 
            className={`mobile-fullscreen-player ${isOverlayOpen ? 'open' : ''}`}
            style={{ 
              position: 'fixed',
              inset: 0,
              zIndex: 9500,
              backgroundColor: '#080808',
              background: 'linear-gradient(180deg, #080808 0%, #111122 100%)',
              display: 'flex',
              flexDirection: 'column',
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: 'env(safe-area-inset-bottom)',
              transition: 'transform 350ms cubic-bezier(0.4, 0, 0.2, 1)',
              transform: isOverlayOpen ? 'translateY(0)' : 'translateY(100%)',
              color: 'white'
            }}
          >
            {/* HEADER */}
            <header style={{ 
              height: '56px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              padding: '0 16px',
              borderBottom: '1px solid rgba(255,255,255,0.05)'
            }}>
              <button 
                onClick={() => setMobileFullscreen(null)}
                style={{
                  background: 'transparent',
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: 600,
                  border: 'none',
                  minWidth: '44px',
                  minHeight: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <ChevronLeft size={20} /> Back
              </button>
              <div style={{
                maxWidth: '60%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontWeight: 'bold',
                fontSize: '16px'
              }}>
                {currentSong.title}
              </div>
              <div style={{ minWidth: '44px' }} />
            </header>

            {/* LYRICS PANEL */}
            <div className="flex-1 overflow-hidden">
               <LyricsWindowContent 
                 song={currentSong} 
                 currentTime={currentTime} 
                 onSeek={handleSeek} 
                 isMobilePlayer={true} 
                 lyrics={activeId ? lrcCache[activeId] : []}
               />
            </div>

            {/* CONTROLS BAR */}
            <div style={{
              padding: '24px 20px',
              paddingBottom: 'max(env(safe-area-inset-bottom), 32px)',
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              flexShrink: 0
            }}>
              {/* Row 1: Seek Bar */}
              <input 
                type="range"
                min={0}
                max={duration || 0}
                value={currentTime}
                step={0.1}
                onChange={(e) => handleSeek(parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: 'white',
                  height: '4px',
                  marginBottom: '8px',
                  cursor: 'pointer'
                }}
              />

              {/* Row 2: Time */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: 'rgba(255,255,255,0.4)',
                marginBottom: '20px',
                fontFamily: 'monospace'
              }}>
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>

              {/* Row 3: Controls */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '48px'
              }}>
                <button 
                  onClick={handlePrev}
                  style={{ background: 'transparent', color: 'white', border: 'none', padding: '12px' }}
                >
                  <ChevronLeft size={32} />
                </button>

                <button 
                  onClick={() => handlePlayToggle()}
                  style={{
                    background: 'white',
                    color: 'black',
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    fontSize: '24px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                  }}
                >
                   {isWaiting ? (
                    <div className="spinner !w-8 !h-8 !border-gray-300 !border-t-black" />
                  ) : (
                    isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />
                  )}
                </button>

                <button 
                  onClick={handleNext}
                  style={{ background: 'transparent', color: 'white', border: 'none', padding: '12px' }}
                >
                  <ChevronRight size={32} />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeId && currentSong && currentSong.lrc && showWindows.lyrics && (
          <LyricsWindow 
            song={currentSong} 
            currentTime={currentTime} 
            onClose={() => setShowWindows(prev => ({ ...prev, lyrics: false }))} 
            onSeek={handleSeek}
            geometry={lyricsGeom}
            setGeometry={setLyricsGeom}
            zIndex={focusedWindow === 'lyrics' ? 10002 : 10001}
            onFocus={() => setFocusedWindow('lyrics')}
            isFocused={focusedWindow === 'lyrics'}
            otherWindowRect={null}
            lyrics={lrcCache[activeId] || []}
          />
        )}
      </div>

      <style>{`
        :root {
          --primary-rgb: ${PRIMARY_RGB};
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </section>
  );
};
