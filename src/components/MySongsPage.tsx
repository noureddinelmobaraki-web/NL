import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Play, Pause, Volume2, Music, X } from 'lucide-react';

interface LyricLine {
  time: number;
  text: string;
}

interface Song {
  id: number;
  title: string;
  url: string;
  lrc: string | null;
}

const songs: Song[] = [
  { id: 1,  title: "TRI9 TBAWE9",           url: "https://github.com/user-attachments/files/27562010/TRI9.TBAWE9.mp3",             lrc: "/lrc/TRI9 TBAWE9.lrc" },
  { id: 2,  title: "VETO",                   url: "https://github.com/user-attachments/files/27562012/VETO.mp3",                    lrc: "/lrc/VETO.lrc" },
  { id: 3,  title: "TOTAL",                  url: "https://github.com/user-attachments/files/27562017/TOTAL.mp3",                   lrc: "/lrc/TOTAL.lrc" },
  { id: 4,  title: "7CHAYCHI DIMO9RATI",     url: "https://github.com/user-attachments/files/27562028/7CHAYCHI.DIMO9RATI.mp3",     lrc: "/lrc/7CHAYCHI DIMO9RATI.lrc" },
  { id: 5,  title: "A Lot",                  url: "https://github.com/user-attachments/files/27562033/A.Lot.mp3",                   lrc: "/lrc/A Lot.lrc" },
  { id: 6,  title: "BEAUTIFUL",              url: "https://github.com/user-attachments/files/27562034/BEAUTIFUL.mp3",               lrc: "/lrc/BEAUTIFUL.lrc" },
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

const LyricsWindow = ({ 
  song, 
  currentTime, 
  onClose, 
  position, 
  setPosition, 
  zIndex, 
  onFocus,
  isFocused,
  otherWindowRect
}: { 
  song: Song; 
  currentTime: number; 
  onClose: () => void;
  position: { x: number; y: number };
  setPosition: (p: { x: number; y: number }) => void;
  zIndex: number;
  onFocus: () => void;
  isFocused: boolean;
  otherWindowRect: { x: number; y: number; width: number; height: number } | null;
}) => {
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const windowRef = useRef<HTMLDivElement>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dragInfo = useRef({ isDragging: false, offset: { x: 0, y: 0 }, currentPos: { x: position.x, y: position.y } });
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    if (song.lrc) {
      const filename = song.lrc.split('/').pop();
      fetch(`${import.meta.env.BASE_URL}lrc/${filename}`)
        .then(res => res.text())
        .then(text => setLyrics(parseLRC(text)))
        .catch(() => {});
    }
  }, [song.lrc]);

  // Keep internal position in sync if external position moves (e.g. proximity spawning)
  useEffect(() => {
    if (!dragInfo.current.isDragging) {
      dragInfo.current.currentPos = position;
      if (windowRef.current) {
        windowRef.current.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;
      }
    }
  }, [position]);

  const currentLineIndex = useMemo(() => {
    if (lyrics.length === 0) return -1;
    let index = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (lyrics[i].time <= currentTime) index = i;
      else break;
    }
    return index;
  }, [lyrics, currentTime]);

  useEffect(() => {
    lineRefs.current.forEach((el, i) => {
      if (!el) return;
      const isActive = i === currentLineIndex;
      el.style.opacity = isActive ? '1' : '0.3';
      el.style.color = isActive ? 'var(--primary-accent, #fff)' : '#7a7a9a';
      el.style.textShadow = isActive ? '0 0 10px rgba(var(--primary-rgb), 0.8), 0 0 20px rgba(var(--primary-rgb), 0.4)' : 'none';
      el.style.transform = isActive ? 'scale(1.02)' : 'scale(1)';
    });

    if (currentLineIndex !== -1 && lineRefs.current[currentLineIndex]) {
      lineRefs.current[currentLineIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentLineIndex]);

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;

    onFocus();
    dragInfo.current.isDragging = true;
    dragInfo.current.offset = {
      x: e.clientX - dragInfo.current.currentPos.x,
      y: e.clientY - dragInfo.current.currentPos.y
    };
    
    if (windowRef.current) {
      windowRef.current.style.pointerEvents = 'none';
      windowRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragInfo.current.isDragging) return;

    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      const rawPos = {
        x: e.clientX - dragInfo.current.offset.x,
        y: e.clientY - dragInfo.current.offset.y
      };
      
      const snappedPos = applySnapping(rawPos, { width: 320, height: 400 }, otherWindowRect ? [otherWindowRect] : []);
      
      dragInfo.current.currentPos = snappedPos;
      if (windowRef.current) {
        windowRef.current.style.transform = `translate3d(${snappedPos.x}px, ${snappedPos.y}px, 0)`;
      }
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragInfo.current.isDragging) return;
    dragInfo.current.isDragging = false;
    if (windowRef.current) {
      windowRef.current.style.pointerEvents = 'auto';
      windowRef.current.releasePointerCapture(e.pointerId);
    }
    setPosition(dragInfo.current.currentPos);
  };

  return (
    <div 
      ref={windowRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onMouseDown={onFocus}
      style={{ 
        position: 'fixed', 
        left: 0, 
        top: 0, 
        width: '320px', 
        height: '400px', 
        zIndex,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        border: '2px ridge #ccc',
        boxShadow: isFocused ? '0 10px 40px rgba(0,0,0,0.8), 0 0 20px rgba(99, 102, 241, 0.2)' : '4px 4px 15px rgba(0,0,0,0.6)',
        backgroundColor: '#0d0d1a',
        userSelect: 'none',
        overflow: 'hidden',
        transition: 'box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        willChange: 'transform'
      }}
    >
      <div 
        style={{
          height: '28px',
          background: isFocused ? 'linear-gradient(to right, #0058a3, #2d8acd)' : 'linear-gradient(to right, #4a4a4a, #7a7a7a)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px',
          cursor: 'move',
          flexShrink: 0,
          borderBottom: '1px solid #003366',
          transition: 'background 0.2s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'white', fontFamily: 'Tahoma, sans-serif', fontSize: '11px', fontWeight: 'bold' }}>
          <Music size={12} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>Lyrics - {song.title}</span>
        </div>
        <button 
          onClick={onClose}
          className="hover:brightness-110 active:brightness-90 transition-all"
          style={{ width: '21px', height: '21px', backgroundColor: '#c0392b', border: '1px solid #fff', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, borderRadius: '2px' }}
        >
          <X size={14} />
        </button>
      </div>

      <div 
        ref={lyricsContainerRef}
        style={{
          flex: 1,
          padding: '20px',
          overflowY: 'auto',
          fontFamily: '"Share Tech Mono", monospace',
          color: '#7a7a9a',
          lineHeight: 2,
          textAlign: 'center',
          fontSize: '15px',
          background: '#0d0d1a'
        }}
        className="no-scrollbar"
      >
        {lyrics.map((line, i) => (
          <div 
            key={i} 
            ref={el => lineRefs.current[i] = el}
            style={{
              marginBottom: '1rem',
              transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              padding: '4px 0',
              willChange: 'opacity, text-shadow, transform'
            }}
          >
            {line.text}
          </div>
        ))}
      </div>
    </div>
  );
};

const ControllerWindow = ({ 
  song, 
  isPlaying, 
  currentTime, 
  duration, 
  volume,
  onTogglePlay, 
  onSeek, 
  onVolumeChange,
  onNext,
  onPrev,
  onClose,
  position,
  setPosition,
  zIndex,
  onFocus,
  isFocused,
  otherWindowRect
}: { 
  song: Song; 
  isPlaying: boolean; 
  currentTime: number; 
  duration: number;
  volume: number;
  onTogglePlay: () => void;
  onSeek: (val: number) => void;
  onVolumeChange: (val: number) => void;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  position: { x: number; y: number };
  setPosition: (p: { x: number; y: number }) => void;
  zIndex: number;
  onFocus: () => void;
  isFocused: boolean;
  otherWindowRect: { x: number; y: number; width: number; height: number } | null;
}) => {
  const windowRef = useRef<HTMLDivElement>(null);
  const dragInfo = useRef({ isDragging: false, offset: { x: 0, y: 0 }, currentPos: { x: position.x, y: position.y } });
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    if (!dragInfo.current.isDragging) {
      dragInfo.current.currentPos = position;
      if (windowRef.current) {
        windowRef.current.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;
      }
    }
  }, [position]);

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;

    onFocus();
    dragInfo.current.isDragging = true;
    dragInfo.current.offset = {
      x: e.clientX - dragInfo.current.currentPos.x,
      y: e.clientY - dragInfo.current.currentPos.y
    };
    
    if (windowRef.current) {
      windowRef.current.style.pointerEvents = 'none';
      windowRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragInfo.current.isDragging) return;

    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      const rawPos = {
        x: e.clientX - dragInfo.current.offset.x,
        y: e.clientY - dragInfo.current.offset.y
      };
      
      const snappedPos = applySnapping(rawPos, { width: 320, height: 180 }, otherWindowRect ? [otherWindowRect] : []);
      
      dragInfo.current.currentPos = snappedPos;
      if (windowRef.current) {
        windowRef.current.style.transform = `translate3d(${snappedPos.x}px, ${snappedPos.y}px, 0)`;
      }
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragInfo.current.isDragging) return;
    dragInfo.current.isDragging = false;
    if (windowRef.current) {
      windowRef.current.style.pointerEvents = 'auto';
      windowRef.current.releasePointerCapture(e.pointerId);
    }
    setPosition(dragInfo.current.currentPos);
  };

  return (
    <div 
      ref={windowRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onMouseDown={onFocus}
      style={{ 
        position: 'fixed', 
        left: 0, 
        top: 0, 
        width: '320px', 
        zIndex,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        border: '2px ridge #ccc',
        boxShadow: isFocused ? '0 10px 40px rgba(0,0,0,0.8), 0 0 20px rgba(99, 102, 241, 0.2)' : '4px 4px 15px rgba(0,0,0,0.6)',
        backgroundColor: '#1a1a2e',
        userSelect: 'none',
        borderRadius: '4px 4px 0 0',
        transition: 'box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        willChange: 'transform'
      }}
    >
      <div 
        style={{
          height: '28px',
          background: isFocused ? 'linear-gradient(to right, #0058a3, #2d8acd)' : 'linear-gradient(to right, #4a4a4a, #7a7a7a)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px',
          cursor: 'move',
          borderBottom: '1px solid #003366',
          transition: 'background 0.2s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'white', fontFamily: 'Tahoma, sans-serif', fontSize: '11px', fontWeight: 'bold' }}>
          <Music size={12} />
          <span>VLC-XP Controller</span>
        </div>
        <button 
          onClick={onClose}
          className="hover:brightness-110 active:brightness-90 transition-all"
          style={{ width: '21px', height: '21px', backgroundColor: '#c0392b', border: '1px solid #fff', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px' }}
        >
          <X size={14} />
        </button>
      </div>

      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
         <div style={{ color: 'white', fontSize: '12px', fontFamily: '"Share Tech Mono", monospace', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {song.title}
        </div>
        
        <input 
          type="range" 
          min="0" 
          max={duration || 0} 
          step="0.1"
          value={currentTime} 
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: '#2d8acd' }}
        />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#7a7a9a', fontSize: '10px', fontFamily: 'monospace' }}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '10px', marginTop: '4px' }}>
          <button onClick={onPrev} className="text-white hover:text-indigo-400 transition-colors">
            <Music size={18} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <button onClick={onTogglePlay} className="text-white hover:scale-110 active:scale-95 transition-all">
            {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
          </button>
          <button onClick={onNext} className="text-white hover:text-indigo-400 transition-colors">
            <Music size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
          <Volume2 size={14} className="text-zinc-500" />
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01" 
            value={volume} 
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: '#7a7a9a' }}
          />
        </div>
      </div>
    </div>
  );
};



const SongCard: React.FC<{ 
  song: Song; 
  index: number;
  isActive: boolean; 
  isPlaying: boolean;
  onPlay: () => void 
}> = ({ 
  song, 
  index,
  isActive, 
  isPlaying,
  onPlay 
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
        
        <button
          onClick={onPlay}
          className={`w-12 h-12 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shrink-0 ${isActive && isPlaying ? 'bg-indigo-500 text-white' : 'bg-white text-black'}`}
        >
          {isActive && isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="ml-1" />}
        </button>
      </div>
    </div>
  );
};

// State for z-index management
let activeWindow: 'lyrics' | 'controller' | null = null;

export const MySongs = ({ onSongPlay }: { onSongPlay: () => void }) => {
  const [activeId, setActiveId] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [showWindows, setShowWindows] = useState({ lyrics: false, controller: false });
  const [focusedWindow, setFocusedWindow] = useState<'lyrics' | 'controller' | null>(null);

  // Position lifting for magnetic snapping
  const [lyricsPos, setLyricsPos] = useState({ x: window.innerWidth - 340, y: 150 });
  const [ctrlPos, setCtrlPos] = useState({ x: window.innerWidth - 680, y: 150 });

  useEffect(() => {
    activeWindow = focusedWindow;
  }, [focusedWindow]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<number | null>(null);

  const currentSong = useMemo(() => songs.find(s => s.id === activeId) || null, [activeId]);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.addEventListener('loadedmetadata', () => {
        if (audioRef.current) setDuration(audioRef.current.duration);
      });
      audioRef.current.addEventListener('timeupdate', () => {
        if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
      });
      audioRef.current.addEventListener('ended', () => handleNext());
    }
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Handle proximity spawning when windows first appear
  const handlePlayToggle = (song?: Song) => {
    if (!audioRef.current) return;

    if (song && song.id !== activeId) {
      setActiveId(song.id);
      audioRef.current.src = song.url;
      audioRef.current.play();
      setIsPlaying(true);
      onSongPlay();
      
      // Proximity Spawning
      const basePos = { x: window.innerWidth - 400, y: 100 };
      setLyricsPos(basePos);
      setCtrlPos({ x: basePos.x - 340, y: basePos.y });
      
      setShowWindows({ lyrics: !!song.lrc, controller: true });
      setFocusedWindow('controller');
    } else {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else if (activeId) {
        audioRef.current.play();
        setIsPlaying(true);
        onSongPlay();
        setShowWindows(prev => ({ ...prev, controller: true, lyrics: currentSong?.lrc ? true : prev.lyrics }));
        setFocusedWindow('controller');
      }
    }
  };

  const handleNext = () => {
    if (!activeId) return;
    const idx = songs.findIndex(s => s.id === activeId);
    const nextIdx = (idx + 1) % songs.length;
    handlePlayToggle(songs[nextIdx]);
  };

  const handlePrev = () => {
    if (!activeId) return;
    const idx = songs.findIndex(s => s.id === activeId);
    const prevIdx = (idx - 1 + songs.length) % songs.length;
    handlePlayToggle(songs[prevIdx]);
  };

  const handleSeek = (val: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  return (
    <section id="my-songs-section" className="w-full py-20 px-6 sm:px-12 bg-black/40 backdrop-blur-sm border-y border-white/5 font-sans selection:bg-indigo-500/30">
      <div className="max-w-6xl mx-auto">
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
          {songs.map((song, i) => (
            <SongCard 
              key={song.id} 
              index={i}
              song={song} 
              isActive={activeId === song.id}
              isPlaying={isPlaying}
              onPlay={() => handlePlayToggle(song)}
            />
          ))}
        </div>

        {activeId && currentSong && showWindows.controller && (
          <ControllerWindow 
            song={currentSong}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            volume={volume}
            onTogglePlay={() => handlePlayToggle()}
            onSeek={handleSeek}
            onVolumeChange={setVolume}
            onNext={handleNext}
            onPrev={handlePrev}
            onClose={() => setShowWindows(prev => ({ ...prev, controller: false }))}
            position={ctrlPos}
            setPosition={setCtrlPos}
            zIndex={focusedWindow === 'controller' ? 10002 : 10001}
            onFocus={() => setFocusedWindow('controller')}
            isFocused={focusedWindow === 'controller'}
            otherWindowRect={showWindows.lyrics ? { ...lyricsPos, width: 320, height: 400 } : null}
          />
        )}

        {activeId && currentSong && currentSong.lrc && showWindows.lyrics && (
          <LyricsWindow 
            song={currentSong} 
            currentTime={currentTime} 
            onClose={() => setShowWindows(prev => ({ ...prev, lyrics: false }))} 
            position={lyricsPos}
            setPosition={setLyricsPos}
            zIndex={focusedWindow === 'lyrics' ? 10002 : 10001}
            onFocus={() => setFocusedWindow('lyrics')}
            isFocused={focusedWindow === 'lyrics'}
            otherWindowRect={showWindows.controller ? { ...ctrlPos, width: 320, height: 180 } : null}
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
