import { useState, useRef, useEffect, useMemo, useCallback, memo, lazy, Suspense } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDeviceType } from '../hooks/useDeviceType';
import { extractDominantColorCached } from '../utils/extractColors';
import { 
  ActiveSong, 
  Song, 
  LyricLine, 
  WindowGeometry, 
  AudioStatus 
} from '../types';

const LyricsWindowContent = lazy(() => import('./LyricsEngine').then(m => ({ default: m.LyricsWindowContent })));
const LyricsWindow = lazy(() => import('./LyricsEngine').then(m => ({ default: m.LyricsWindow })));
const parseLRC = async (text: string) => {
  const { parseLRC: parse } = await import('./LyricsEngine');
  return parse(text);
};

const songs: Song[] = [
  { id: 1,  title: "TRI9 TBAWE9",           url: "https://github.com/user-attachments/files/27562010/TRI9.TBAWE9.mp3",             lrc: "/lrc/TRI9 TBAWE9.lrc", backgroundImage: "/images/songs Background/01. TRI9 TBA... - Background.jpeg" },
  { id: 2,  title: "VETO",                   url: "https://github.com/user-attachments/files/27562012/VETO.mp3",                    lrc: "/lrc/VETO.lrc", backgroundImage: "/images/songs Background/02. VETO - Background.jpeg" },
  { id: 3,  title: "TOTAL",                  url: "https://github.com/user-attachments/files/27562017/TOTAL.mp3",                   lrc: "/lrc/TOTAL.lrc", backgroundImage: "/images/songs Background/03. TOTAL - Background.jpeg" },
  { id: 4,  title: "7CHAYCHI DIMO9RATI",     url: "https://github.com/user-attachments/files/27562028/7CHAYCHI.DIMO9RATI.mp3",     lrc: "/lrc/7CHAYCHI DIMO9RATI.lrc", backgroundImage: "/images/songs Background/04. 7CHAYCH... - Background.jpeg" },
  { id: 5,  title: "A Lot",                  url: "https://github.com/user-attachments/files/27562033/A.Lot.mp3",                   lrc: "/lrc/A Lot.lrc", backgroundImage: "/images/songs Background/05. A Lot - Background.jpeg" },
  { id: 6,  title: "BEAUTIFUL",              url: "https://github.com/user-attachments/files/27562034/BEAUTIFUL.mp3",               lrc: null, backgroundImage: "/images/songs Background/06. BEAUTIFUL - Background.jpeg" },
  { id: 7,  title: "Bouh",                   url: "https://github.com/user-attachments/files/27562039/Bouh.mp3",                    lrc: "/lrc/Bouh.lrc", backgroundImage: "/images/songs Background/07. Bouh - Background.jpeg" },
  { id: 8,  title: "Brain Damage",           url: "https://github.com/user-attachments/files/27562042/Brain.Damage.mp3",            lrc: "/lrc/Brain Damage.lrc", backgroundImage: "/images/songs Background/08. Brain Da... - Background.jpeg" },
  { id: 9,  title: "Deal With The Devil",    url: "https://github.com/user-attachments/files/27562043/Deal.With.The.Devil.mp3",    lrc: "/lrc/Deal With The Devil.lrc", backgroundImage: "/images/songs Background/09. Deal With... - Background.jpeg" },
  { id: 10, title: "Dokhana V2",             url: "https://github.com/user-attachments/files/27562044/Dokhana.V2.mp3",              lrc: null, backgroundImage: "/images/songs Background/10. Dokhana V2 - Background.jpeg" },
  { id: 11, title: "GOUROU",                 url: "https://github.com/user-attachments/files/27562046/GOUROU.mp3",                  lrc: "/lrc/GOUROU.lrc", backgroundImage: "/images/songs Background/11. GOUROU - Background.jpeg" },
  { id: 12, title: "ITCHY W SCRATCHY",       url: "https://github.com/user-attachments/files/27562047/ITCHY.W.SCRATCHY.mp3",       lrc: null, backgroundImage: "/images/songs Background/12. ITCHY W SCRATCHY - Background.jpeg" },
  { id: 13, title: "KOUN NADI",              url: "https://github.com/user-attachments/files/27562048/KOUN.NADI.mp3",               lrc: "/lrc/KOUN NADI.lrc", backgroundImage: "/images/songs Background/13. KOUN NADI - Background.jpeg" },
  { id: 14, title: "L'AI Could Never",       url: "https://github.com/user-attachments/files/27562049/L.AI.Could.Never.mp3",       lrc: "/lrc/L'AI Could Never.lrc", backgroundImage: "/images/songs Background/14. L'AI Could... - Background.jpeg" },
  { id: 15, title: "L'bayda Mon Amour",      url: "https://github.com/user-attachments/files/27562051/L.bayda.Mon.Amour.mp3",      lrc: "/lrc/L'bayda Mon Amour.lrc", backgroundImage: "/images/songs Background/15. L'bayda M... - Background.jpeg" },
  { id: 16, title: "Let The Rhythm Hit 'em", url: "https://github.com/user-attachments/files/27562053/Let.The.Rhythm.Hit.em.mp3",  lrc: "/lrc/Let The Rhythm Hit 'em.lrc", backgroundImage: "/images/songs Background/16. Let The R... - Background.jpeg" },
  { id: 17, title: "LMORPHINIYA 31",         url: "https://github.com/user-attachments/files/27562055/LMORPHINIYA.31.mp3",          lrc: null, backgroundImage: "/images/songs Background/17. LMORPHINIYA 31 - Background.jpeg" },
  { id: 18, title: "LMORPHINIYA 33",         url: "https://github.com/user-attachments/files/27562057/LMORPHINIYA.33.mp3",          lrc: null, backgroundImage: "/images/songs Background/18. LMORPHINIYA 33 - Background.jpeg" },
  { id: 19, title: "LMORPHINIYA 1013",       url: "https://github.com/user-attachments/files/27562059/LMORPHINIYA.1013.mp3",       lrc: "/lrc/LMORPHINIYA 1013.lrc", backgroundImage: "/images/songs Background/19. LMORPHI... - Background.png" },
  { id: 20, title: "Lmorphinya 19 V2",       url: "https://github.com/user-attachments/files/27562060/Lmorphinya.19.V2.mp3",       lrc: null, backgroundImage: "/images/songs Background/20. Lmorphinya 19 V2 - Background.png" },
  { id: 21, title: "MAGNETO",                url: "https://github.com/user-attachments/files/27562061/MAGNETO.mp3",                 lrc: "/lrc/MAGNETO.lrc", backgroundImage: "/images/songs Background/21. MAGNETO - Background.png" },
  { id: 22, title: "None Shall Pass",        url: "https://github.com/user-attachments/files/27562062/None.Shall.Pass.mp3",        lrc: "/lrc/None Shall Pass.lrc", backgroundImage: "/images/songs Background/22. None Sha... - Background.jpeg" },
  { id: 23, title: "Ohio",                   url: "https://github.com/user-attachments/files/27562063/Ohio.mp3",                   lrc: "/lrc/OHIO.lrc", backgroundImage: "/images/songs Background/23. Ohio - Background.jpeg" },
  { id: 24, title: "Ostora",                 url: "https://github.com/user-attachments/files/27562064/Ostora.mp3",                  lrc: "/lrc/Ostora.lrc", backgroundImage: "/images/songs Background/24. Ostora - Background.jpeg" },
  { id: 25, title: "Tromso",                 url: "https://github.com/user-attachments/files/27562065/Tromso.mp3",                  lrc: "/lrc/Tromso.lrc", backgroundImage: "/images/songs Background/25. Tromso - Background.jpeg" },
];

const PRIMARY_RGB = "99, 102, 241"; 

const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};




const Waveform = ({ isPlaying }: { isPlaying: boolean }) => (
  <div className="waveform" style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '16px' }}>
    {[1, 2, 3, 4, 5].map(i => (
      <span key={i} style={{
        width: '3px',
        background: '#a78bfa',
        borderRadius: '1px',
        animation: `wave 0.8s ease-in-out infinite`,
        animationDelay: `calc(${i} * 0.1s)`,
        animationPlayState: isPlaying ? 'running' : 'paused',
      } as React.CSSProperties} />
    ))}
  </div>
);

const SongCard = memo(({ 
  song, 
  index,
  isActive, 
  isActiveInBar,
  isPlaying,
  isWaiting,
  onPlay,
  setLyricsOpen,
  currentTime,
  duration,
  onSeek,
  volume,
  onVolumeChange
}: { 
  song: Song; 
  index: number;
  isActive: boolean; 
  isActiveInBar: boolean;
  isPlaying: boolean;
  isWaiting: boolean;
  onPlay: () => void;
  setLyricsOpen: (open: boolean) => void;
  currentTime?: number;
  duration?: number;
  onSeek?: (val: number) => void;
  volume?: number;
  onVolumeChange?: (val: number) => void;
}) => {
  return (
    <motion.div 
      layout
      layoutId={`song-${song.id}`}
      className={`
        song-card relative overflow-hidden p-6 rounded-2xl flex flex-col gap-4 transition-all duration-700
        ${isActive ? 'active shadow-[0_20px_50px_rgba(0,0,0,0.6)]' : 'shadow-lg hover:shadow-xl'}
      `}
      style={{
        backgroundImage: `url('${song.backgroundImage}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        gridColumn: isActive ? 'span 2' : 'span 1'
      }}
    >
      {/* Bento expansion handle */}
      {isActive && (
        <div className="absolute top-4 left-4 z-30">
          <Waveform isPlaying={isPlaying} />
        </div>
      )}

      {/* Background Image with Animation */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url('${song.backgroundImage}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          animation: isActive ? 'slow-zoom 8s ease-in-out infinite alternate' : 'none',
        }}
      />

      {/* Overlay */}
      <div 
        className="absolute inset-0 z-10 transition-all duration-600"
        style={{
          background: isActive ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.55)',
          backdropFilter: isActive ? 'none' : 'blur(1px)',
          WebkitBackdropFilter: isActive ? 'none' : 'blur(1px)',
        }} 
      />

      {/* Content wrapper */}
      <div className="relative z-20 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-5 flex-1 min-w-0">
            <span className={`font-mono text-xs font-bold ${isActive ? 'text-indigo-400' : 'text-zinc-400'}`}>
              {(index + 1).toString().padStart(2, '0')}
            </span>
            <div className="flex flex-col min-w-0">
              <h3 
                className="font-bold text-lg tracking-tight rainbow-text"
                style={{
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.9))'
                }}
              >
                {song.title}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${song.lrc ? 'bg-indigo-500/40 text-indigo-200' : 'bg-zinc-800/80 text-zinc-400'}`}>
                  {song.lrc ? "LRC" : "INST"}
                </span>
                <span className="text-[10px] text-zinc-300/60 font-medium uppercase tracking-widest">NRADIO</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {song.lrc && (
              <button 
                onClick={(e) => { e.stopPropagation(); setLyricsOpen(true); }}
                className="lyrics-btn"
                title="Lyrics"
              >
                ◉ LYRICS ✦
              </button>
            )}
            {!isActiveInBar && (
              <button
                onClick={onPlay}
                className={`
                  w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg
                  ${isActive && isPlaying 
                    ? 'bg-white text-black scale-110' 
                    : 'bg-indigo-600/90 text-white hover:bg-indigo-500 hover:scale-105 active:scale-95'}
                `}
                aria-label={isActive && isPlaying ? "Pause" : "Play"}
              >
                {isActive && isWaiting ? (
                  <div className="spinner !w-5 !h-5 border-white border-t-transparent" aria-hidden="true" />
                ) : (
                  isActive && isPlaying ? <Pause size={20} fill="currentColor" aria-hidden="true" /> : <Play size={20} fill="currentColor" className="ml-0.5" aria-hidden="true" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Controls shown when active */}
        {isActive && (
          <div className="mt-2 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Seek Bar */}
            <div className="space-y-1">
              <input 
                type="range"
                min={0}
                max={duration || 0}
                value={currentTime || 0}
                step={0.1}
                onChange={(e) => onSeek?.(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
              />
              <div className="flex justify-between text-[10px] font-mono text-white/60">
                <span>{formatTime(currentTime || 0)}</span>
                <span>{formatTime(duration || 0)}</span>
              </div>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-3">
              <Volume2 size={14} className="text-white/60" />
              <input 
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume || 0.7}
                onChange={(e) => onVolumeChange?.(parseFloat(e.target.value))}
                className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
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
  const [audioStatus, setAudioStatus] = useState<AudioStatus>('idle');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [showWindows, setShowWindows] = useState({ lyrics: false });
  const [focusedWindow, setFocusedWindow] = useState<'lyrics' | null>(null);
  const [mobileFullscreen, setMobileFullscreen] = useState<number | null>(null);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [lrcCache, setLrcCache] = useState<Record<number, LyricLine[]>>({});
  const [ambientColor, setAmbientColor] = useState('20, 20, 30');
  const { isMobile } = useDeviceType();

  const handleNextRef = useRef<() => void>(() => {});
  const handlePrevRef = useRef<() => void>(() => {});
  const handlePlayToggleRef = useRef<(song?: Song) => void>(() => {});

  // Geometry lifting for the window system
  const prewarmDoneForId = useRef<number | null>(null);
  const [lyricsGeom, setLyricsGeom] = useState<WindowGeometry>(() => ({ 
    x: typeof window !== 'undefined' ? window.innerWidth - 380 : 0, 
    y: 150, 
    width: 340, 
    height: 450 
  }));

  const audioTagRef = useRef<HTMLAudioElement | null>(null);
  
  const currentSong = useMemo(() => songs.find(s => s.id === activeId) || null, [activeId]);

  // Finite State Machine logic / Event Listeners
  useEffect(() => {
    const audio = audioTagRef.current;
    if (!audio) return;

    const handlers = {
      loadstart: () => setAudioStatus('loading'),
      waiting: () => setAudioStatus('loading'),
      playing: () => setAudioStatus('playing'),
      pause: () => setAudioStatus('paused'),
      ended: () => {
        setAudioStatus('ended');
        handleNextRef.current();
      },
      loadedmetadata: () => setDuration(audio.duration),
      timeupdate: () => {
        setCurrentTime(audio.currentTime);
        setDuration(audio.duration || 0);

        // Pre-warming logic: 80% through
        if (audio.duration > 0 && (audio.currentTime / audio.duration) > 0.8) {
          if (prewarmDoneForId.current !== activeId) {
            prewarmDoneForId.current = activeId;
            const idx = songs.findIndex(s => s.id === activeId);
            const nextSong = songs[(idx + 1) % songs.length];
            if (nextSong) {
              fetch(nextSong.url, { headers: { Range: 'bytes=0-512000' } }).catch(() => {});
            }
          }
        }
      },
      error: (e: any) => {
        console.error("Audio Load Error:", e);
        setAudioStatus('idle');
      }
    };

    audio.addEventListener('loadstart', handlers.loadstart);
    audio.addEventListener('waiting', handlers.waiting);
    audio.addEventListener('playing', handlers.playing);
    audio.addEventListener('pause', handlers.pause);
    audio.addEventListener('ended', handlers.ended);
    audio.addEventListener('loadedmetadata', handlers.loadedmetadata);
    audio.addEventListener('timeupdate', handlers.timeupdate);
    audio.addEventListener('error', handlers.error);

    return () => {
      audio.removeEventListener('loadstart', handlers.loadstart);
      audio.removeEventListener('waiting', handlers.waiting);
      audio.removeEventListener('playing', handlers.playing);
      audio.removeEventListener('pause', handlers.pause);
      audio.removeEventListener('ended', handlers.ended);
      audio.removeEventListener('loadedmetadata', handlers.loadedmetadata);
      audio.removeEventListener('timeupdate', handlers.timeupdate);
      audio.removeEventListener('error', handlers.error);
    };
  }, [activeId]);

  // MediaSession Enhancement
  useEffect(() => {
    if (!currentSong || typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title,
      artist: 'NL',
      album: 'NL Collection',
      artwork: [
        { src: currentSong.cover || '/images/playlist_cover.jpg', sizes: '512x512', type: 'image/jpeg' }
      ]
    });

    navigator.mediaSession.setActionHandler('play', () => handlePlayToggleRef.current());
    navigator.mediaSession.setActionHandler('pause', () => handlePlayToggleRef.current());
    navigator.mediaSession.setActionHandler('previoustrack', () => handlePrevRef.current());
    navigator.mediaSession.setActionHandler('nexttrack', () => handleNextRef.current());

    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
    };
  }, [currentSong]);

  useEffect(() => {
    if (!activeId || !currentSong?.lrc) return;
    
    if (lrcCache[activeId]) return;

    const controller = new AbortController();
    const filename = currentSong.lrc.split('/').pop() || "";
    const encodedFilename = encodeURIComponent(filename);

    fetch(`${import.meta.env.BASE_URL}lrc/${encodedFilename}`, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.text();
      })
      .then(async text => {
        const parsed = await parseLRC(text);
        setLrcCache(prev => ({ ...prev, [activeId]: parsed }));
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error("LRC fetch error:", err);
        }
      });

    return () => controller.abort();
  }, [activeId, currentSong]);

  // Ambient Mode Color Extraction
  useEffect(() => {
    if (currentSong?.cover) {
      extractDominantColorCached(currentSong.cover, (color) => setAmbientColor(color));
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

  const handlePlayToggle = (song?: Song) => {
    const audio = audioTagRef.current;
    if (!audio) return;

    if (song && song.id !== activeId) {
      if (isMobile) {
        setMobileFullscreen(song.id);
      }
      setActiveId(song.id);
      audio.src = song.url;
      audio.load();
      audio.play().catch((e) => console.error("Playback error:", e));
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
      if (audioStatus === 'playing') {
        audio.pause();
      } else if (activeId) {
        audio.play().catch((e) => console.error("Playback error:", e));
        onSongPlay();
        if (isMobile) {
          setMobileFullscreen(activeId);
        }
      } else if (songs.length > 0) {
        // Fallback: play first song if nothing active
        handlePlayToggle(songs[0]);
      }
    }
  };

  const handleNext = () => {
    const idx = songs.findIndex(s => s.id === activeId);
    const nextIdx = (idx + 1) % songs.length;
    handlePlayToggle(songs[nextIdx]);
  };

  const handlePrev = () => {
    const idx = songs.findIndex(s => s.id === activeId);
    const prevIdx = (idx - 1 + songs.length) % songs.length;
    handlePlayToggle(songs[prevIdx]);
  };

  // Assign refs every render
  handlePlayToggleRef.current = handlePlayToggle;
  handleNextRef.current = handleNext;
  handlePrevRef.current = handlePrev;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (audioStatus === 'idle' || isMobile) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          handlePlayToggle();
          break;
        case 'arrowleft':
          e.preventDefault();
          if (audioTagRef.current) audioTagRef.current.currentTime -= 5;
          break;
        case 'arrowright':
          e.preventDefault();
          if (audioTagRef.current) audioTagRef.current.currentTime += 5;
          break;
        case 'm':
          if (audioTagRef.current) {
            audioTagRef.current.muted = !audioTagRef.current.muted;
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [audioStatus, isMobile, handlePlayToggle]);

  useEffect(() => {
    const audio = audioTagRef.current;
    if (audio) {
      audio.volume = volume;
    }
  }, [volume]);

  const handleSeek = useCallback((val: number) => {
    if (audioTagRef.current) {
      audioTagRef.current.currentTime = val;
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
          cover: currentSong.cover || currentSong.backgroundImage,
          audioRef: { current: audioTagRef.current },
          isPlaying: audioStatus === 'playing',
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
  }, [activeId, audioStatus, currentTime, duration, onActiveSongChange, handlePrev, handleNext, handlePlayToggle, currentSong]);

  const renderedSongs = useMemo(() => {
    return songs.map((song, i) => (
      <SongCard 
        key={song.id} 
        index={i}
        song={song} 
        isActive={activeId === song.id}
        isActiveInBar={activeId === song.id && !isMobile}
        isPlaying={audioStatus === 'playing'}
        isWaiting={audioStatus === 'loading'}
        currentTime={currentTime}
        duration={duration}
        onSeek={handleSeek}
        volume={volume}
        onVolumeChange={setVolume}
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
  }, [activeId, audioStatus, isMobile, handlePlayToggle, currentTime, duration, handleSeek, volume]);

  return (
    <section 
      id="my-songs-section" 
      className="w-full py-24 px-6 sm:px-12 font-sans selection:bg-indigo-500/30 relative overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at 50% 0%, rgba(${ambientColor}, 0.15) 0%, transparent 80%), #050505`,
        transition: 'background 1500ms ease'
      }}
    >
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />
      
      <audio ref={audioTagRef} preload="auto" style={{ display: 'none' }} />
      <div className="max-w-6xl mx-auto relative z-10">
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-20">
          <div className="space-y-2">
            <h1 className="text-7xl sm:text-9xl font-black italic tracking-tighter uppercase leading-none text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">
              MY SONGS
            </h1>
            <div className="flex items-center gap-3">
              <div className="h-1 w-12 bg-indigo-500" />
              <p className="text-zinc-500 font-medium tracking-[0.2em] text-xs uppercase">Curated Soundscape</p>
            </div>
          </div>
          <div className="text-right flex flex-col items-end">
            <div className="flex items-baseline gap-2">
              <span className="text-indigo-500 font-mono text-4xl font-bold tracking-tighter">{songs.length}</span>
              <span className="text-zinc-500 text-sm font-medium uppercase tracking-[0.3em] pb-1">Tracks</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max">
          <AnimatePresence mode="popLayout">
            {renderedSongs}
          </AnimatePresence>
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
               <Suspense fallback={<div className="h-full flex items-center justify-center text-white/20">Loading Lyrics...</div>}>
                 <LyricsWindowContent 
                   currentTime={currentTime} 
                   onSeek={handleSeek} 
                   isMobilePlayer={true} 
                   lyrics={(activeId ? lrcCache[activeId] : []) || []}
                 />
               </Suspense>
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
                   {audioStatus === 'loading' ? (
                    <div className="spinner !w-8 !h-8 !border-gray-300 !border-t-black" aria-hidden="true" />
                  ) : (
                    audioStatus === 'playing' ? <Pause size={32} fill="currentColor" aria-hidden="true" /> : <Play size={32} fill="currentColor" className="ml-1" aria-hidden="true" />
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
          <Suspense fallback={null}>
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
              lyrics={lrcCache[activeId] || []}
              songBackground={currentSong.backgroundImage}
            />
          </Suspense>
        )}
      </div>

      <style>{`
        :root {
          --primary-rgb: ${PRIMARY_RGB};
        }
        @keyframes slow-zoom {
          from { transform: scale(1); }
          to { transform: scale(1.05); }
        }
        @keyframes shine {
          to {
            background-position: 200% center;
          }
        }
        .rainbow-text {
          background: linear-gradient(90deg, #ff3d00, #ffea00, #00e676, #00e5ff, #2979ff, #d500f9, #ff3d00);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shine 5s linear infinite;
          font-weight: 900 !important;
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 4px rgba(139,92,246,0.3); }
          50% { box-shadow: 0 0 12px rgba(139,92,246,0.7); }
        }
        .lyrics-btn {
          background: rgba(139, 92, 246, 0.2);
          border: 1px solid rgba(139, 92, 246, 0.6);
          color: #a78bfa;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          cursor: pointer;
          transition: all 200ms ease;
          animation: pulse-glow 2s ease-in-out infinite;
          display: flex;
          align-items: center;
          justify-content: center;
          white-space: nowrap;
        }
        .lyrics-btn:hover {
          background: rgba(139, 92, 246, 0.4);
          transform: scale(1.05);
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes wave {
          0%, 100% { height: 4px; }
          50% { height: 16px; }
        }
        @property --angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes rotate-angle {
          to { --angle: 360deg; }
        }
        .song-card {
          grid-column: span 1;
          transition: grid-column 300ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        .song-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 2px;
          background: conic-gradient(from var(--angle, 0deg), rgba(139,92,246,0.5), transparent 40%, rgba(139,92,246,0.5));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          animation: rotate-angle 3s linear infinite;
          opacity: 0;
          transition: opacity 300ms;
          pointer-events: none;
          z-index: 15;
        }
        .song-card:hover::before {
          opacity: 1;
        }
        .song-card.active {
          grid-column: span 2;
        }
        @media (max-width: 768px) {
          .song-card.active {
            grid-column: span 1;
          }
        }
      `}</style>
    </section>
  );
};
