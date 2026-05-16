import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useDeviceType } from '../hooks/useDeviceType';
import { useHlsAudio, preloadAllSongs, preloadSong } from '../hooks/useHlsAudio';
import { extractDominantColorCached } from '../utils/extractColors';
import { ASSETS } from '../constants/assets';
import { audioManager } from '../audio/audioManager';
import { SongCard } from './SongCard';
import { 
  ActiveSong, 
  Song, 
  LyricLine, 
  AudioStatus 
} from '../types';

import { parseLRC } from './LyricsEngine';



const PRIMARY_RGB = "99, 102, 241"; 

import { loadPrefs, savePrefs } from '../utils/userPrefs';
import type { RepeatMode } from '../utils/userPrefs';
import { loadSession, saveSession } from '../utils/sessionState';

const initialPrefs = loadPrefs();

export const MySongs = ({ 
  onSongPlay,
  onSongStop,
  onActiveSongChange,
  onAmbientColorChange
}: { 
  onSongPlay: () => void;
  onSongStop?: () => void;
  onActiveSongChange: (data: ActiveSong | null) => void;
  onAmbientColorChange?: (color: string | null) => void;
}) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [audioStatus, setAudioStatus] = useState<AudioStatus>('idle');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(initialPrefs.lastVolume);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [karaokeMode, setKaraokeMode] = useState(false);
  const [durationCache, setDurationCache] = useState<Record<number, number>>(loadSession().durationCache);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isShuffle, setIsShuffle] = useState(initialPrefs.isShuffle);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(initialPrefs.repeatMode);
  const [lrcCache, setLrcCache] = useState<Record<number, LyricLine[]>>(loadSession().lrcCache);
  const [ambientColor, setAmbientColor] = useState('20, 20, 30');
  const { isMobile } = useDeviceType();

  useEffect(() => {
    setLyricsOpen(false);
    setKaraokeMode(false);
  }, [activeId]);

  useEffect(() => {
    const base = import.meta.env.BASE_URL || './';
    fetch(`${base}data/songs.json`)
      .then(r => r.json())
      .then((data: Array<{id:number,title:string,url:string,hasLrc:boolean,lrcFile:string|null,bgIndex:number}>) => {
        const base2 = import.meta.env.BASE_URL || './';
        const mapped: Song[] = data.map(s => ({
          id: s.id,
          title: s.title,
          url: s.url,
          lrc: s.hasLrc && s.lrcFile 
            ? (base2.endsWith('/') ? base2 : base2 + '/') + `lrc/${s.lrcFile}.lrc`
            : null,
          backgroundImage: ASSETS.songs.backgrounds[s.bgIndex],
          sharePath: `/NL/share/song-${s.id}.html`
        }));
        setSongs(mapped);
        
        // Phase 1: create HLS pool instances for ALL songs immediately (manifest only, tiny)
        mapped.forEach(s => preloadSong(s.url));

        // Phase 2: fetch first 8 seconds of ALL songs in small batches
        const startPhase2 = () => {
          const allUrls = mapped.map(s => s.url);
          // Batching for all songs: 8 songs at a time, then remaining
          preloadAllSongs(allUrls.slice(0, 8), 8, 2, 300);
          
          setTimeout(() => {
            preloadAllSongs(allUrls.slice(8), 8, 1, 800);
          }, 3000);
        };

        if ('requestIdleCallback' in window) {
          (window as any).requestIdleCallback(startPhase2, { timeout: 2000 });
        } else {
          setTimeout(startPhase2, 1000);
        }
      });
  }, []);

  const handleNextRef = useRef<() => void>(() => {});
  const handlePrevRef = useRef<() => void>(() => {});
  const handlePlayToggleRef = useRef<(song?: Song) => void>(() => {});

  // Geometry lifting for the window system
  const prewarmDoneForId = useRef<number | null>(null);

  const audioTagRef = useRef<HTMLAudioElement | null>(null);
  const pendingPlayRef = useRef(false); // true = play as soon as HLS is ready
  
  const currentSong = useMemo(() => songs.find(s => s.id === activeId) || null, [activeId, songs]);

  useHlsAudio(audioTagRef, currentSong?.url, () => {
    // Called when HLS manifest is parsed and audio is ready to play
    if (pendingPlayRef.current) {
      pendingPlayRef.current = false;
      audioManager.register('song', audioTagRef.current!, 0.7);
      audioManager.play('song');
    }
  });

  const preloadDuration = useCallback((song: Song) => {
    if (durationCache[song.id]) return;

    // Check session cache
    const session = loadSession();
    if (session.durationCache[song.id]) {
      setDurationCache(prev => ({ ...prev, [song.id]: session.durationCache[song.id] }));
      return;
    }

    // Skip HLS songs — setting audio.src to .m3u8 doesn't work in Chrome without hls.js
    // Duration will be populated naturally when the song is played
    const isHls = song.url.endsWith('.m3u8') || song.url.includes('/index.m3u8');
    if (isHls) return;
    
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      const d = audio.duration;
      setDurationCache(prev => ({ ...prev, [song.id]: d }));
      saveSession({ durationCache: { ...session.durationCache, [song.id]: d } });
      audio.src = '';
    };
    audio.src = song.url;
  }, [durationCache]);

  useEffect(() => {
    if (songs.length > 0) {
      songs.slice(0, 6).forEach(preloadDuration);
    }
  }, [songs, preloadDuration]);

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
              // For HLS: just fetch the manifest (tiny text file, no Range header needed)
              // This tells the browser/CDN to warm up the connection for the next song
              fetch(nextSong.url, { 
                method: 'GET', 
                cache: 'force-cache',
                headers: { 'Range': 'bytes=0-1023' }  // اول 1KB فقط من manifest
              }).catch(() => {});
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
  }, [activeId, songs]);

  // MediaSession Enhancement
  useEffect(() => {
    if (!currentSong || typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title,
      artist: 'NL',
      album: 'NL Collection',
      artwork: [
        { src: currentSong.cover || ASSETS.songs.playlistCover, sizes: '512x512', type: 'image/webp' }
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

    // Check session cache
    const session = loadSession();
    if (session.lrcCache[activeId]) {
      setLrcCache(prev => ({ ...prev, [activeId!]: session.lrcCache[activeId!] }));
      return;
    }

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
        setLrcCache(prev => ({ ...prev, [activeId!]: parsed }));
        saveSession({ lrcCache: { ...loadSession().lrcCache, [activeId!]: parsed } });
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
    const coverUrl = currentSong?.cover || currentSong?.backgroundImage;
    if (coverUrl) {
      extractDominantColorCached(coverUrl, (color) => {
        setAmbientColor(color);
        onAmbientColorChange?.(`rgb(${color})`);
      });
    } else {
      setAmbientColor('20, 20, 30');
      onAmbientColorChange?.(null);
    }
  }, [activeId, currentSong, onAmbientColorChange]);

  const currentLyricLine = useMemo(() => {
    if (!activeId || !lrcCache[activeId]) return null;
    const lyrics = lrcCache[activeId];
    let line = null;
    for (const l of lyrics) {
      if (l.time <= currentTime) line = l.text;
      else break;
    }
    return line;
  }, [activeId, lrcCache, currentTime]);

  useEffect(() => {
    if (audioStatus === 'ended' || audioStatus === 'paused') {
      onSongStop?.();
    }
  }, [audioStatus, onSongStop]);

  const handlePlayToggle = useCallback((song?: Song) => {
    const audio = audioTagRef.current;
    if (!audio) return;

    if (song && song.id !== activeId) {
      pendingPlayRef.current = true;
      setActiveId(song.id);
      setIsDismissed(false);
      onSongPlay();
      savePrefs({ lastSongId: song.id });
    } else {
      if (audioStatus === 'playing') {
        audioManager.pause('song');
      } else if (activeId) {
        setIsDismissed(false);
        audioManager.play('song');
        onSongPlay();
      } else if (songs.length > 0) {
        handlePlayToggle(songs[0]);
      }
    }
  }, [activeId, audioStatus, songs, onSongPlay]);

  const handleNext = useCallback(() => {
    if (songs.length === 0) return;
    const idx = songs.findIndex(s => s.id === activeId);
    let nextIdx: number;
    
    if (isShuffle) {
      nextIdx = Math.floor(Math.random() * songs.length);
      // Try to avoid the same song if possible
      if (nextIdx === idx && songs.length > 1) {
        nextIdx = (nextIdx + 1) % songs.length;
      }
    } else {
      nextIdx = (idx + 1) % songs.length;
    }
    
    handlePlayToggle(songs[nextIdx]);
  }, [activeId, songs, isShuffle]);

  const handlePrev = useCallback(() => {
    if (songs.length === 0) return;
    const idx = songs.findIndex(s => s.id === activeId);
    let prevIdx: number;

    if (isShuffle) {
      prevIdx = Math.floor(Math.random() * songs.length);
      if (prevIdx === idx && songs.length > 1) {
        prevIdx = (prevIdx - 1 + songs.length) % songs.length;
      }
    } else {
      prevIdx = (idx - 1 + songs.length) % songs.length;
    }

    handlePlayToggle(songs[prevIdx]);
  }, [activeId, songs, isShuffle]);

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
      savePrefs({ lastVolume: volume });
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
      if (!isDismissed && activeId && currentSong && (audioStatus === 'playing' || audioStatus === 'loading' || audioStatus === 'paused')) {
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
          onShare: () => handleShare(currentSong),
          onDismiss: () => {
            const audio = audioTagRef.current;
            if (audio) {
              audio.pause();
              audio.src = '';
              audio.load();
            }
            setActiveId(null);
            setIsDismissed(true);
          },
          suppressMiniBar: activeId !== null && lyricsOpen,
          isShuffle,
          onShuffleToggle: () => setIsShuffle(prev => {
            const next = !prev;
            savePrefs({ isShuffle: next });
            return next;
          }),
          repeatMode,
          onRepeatToggle: () => {
            setRepeatMode(prev => {
              let next: RepeatMode;
              if (prev === 'off') next = 'all';
              else if (prev === 'all') next = 'one';
              else next = 'off';
              savePrefs({ repeatMode: next });
              return next;
            });
          },
          volume,
          onVolumeChange: (v) => {
            setVolume(v);
            savePrefs({ lastVolume: v });
          },
          nextSongs: songs
            .slice(songs.findIndex(s => s.id === activeId) + 1, songs.findIndex(s => s.id === activeId) + 6)
            .map(s => ({ id: s.id, title: s.title, cover: s.cover || s.backgroundImage })),
        });
      } else {
        onActiveSongChange(null);
      }
    }
  }, [
    activeId, 
    audioStatus, 
    currentTime, 
    duration, 
    onActiveSongChange, 
    handlePrev, 
    handleNext, 
    handlePlayToggle, 
    currentSong, 
    isDismissed, 
    isMobile, 
    lyricsOpen, 
    isShuffle, 
    repeatMode, 
    volume
  ]);

  useEffect(() => {
    const audio = audioTagRef.current;
    if (audio) {
      audio.loop = repeatMode === 'one';
    }
  }, [repeatMode]);

  const renderedSongs = useMemo(() => {
    return songs.map((song, i) => (
      <div key={song.id} onMouseEnter={() => preloadSong(song.url)} style={{ display: 'contents' }}>
        <SongCard 
          index={i}
          song={song} 
          isActive={activeId === song.id && audioStatus !== 'idle'}
          isActiveInBar={activeId === song.id && audioStatus !== 'idle'}
          isPlaying={audioStatus === 'playing'}
          isWaiting={audioStatus === 'loading'}
          currentTime={currentTime}
          duration={activeId === song.id ? duration : durationCache[song.id]}
          onSeek={handleSeek}
          volume={volume}
          onVolumeChange={setVolume}
          onPlay={() => handlePlayToggle(song)}
          onPlayPause={() => handlePlayToggle()}
          onPrev={handlePrev}
          onNext={handleNext}
          onShare={() => handleShare(song)}
          setLyricsOpen={setLyricsOpen}
          isLyricsOpen={activeId === song.id && lyricsOpen}
          lyrics={lrcCache[song.id] || []}
          karaokeMode={karaokeMode}
          setKaraokeMode={setKaraokeMode}
          currentLyricLine={activeId === song.id ? currentLyricLine : null}
          onAmbientColorChange={(color) => onAmbientColorChange?.(`rgb(${color})`)}
        />
      </div>
    ));
  }, [activeId, audioStatus, isMobile, handlePlayToggle, currentTime, duration, handleSeek, volume, songs, lrcCache, lyricsOpen, karaokeMode, currentLyricLine, durationCache, handlePrev, handleNext]);

  const handleShare = (song: Song) => {
    const baseUrl = window.location.origin + import.meta.env.BASE_URL;
    const shareUrl = `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}share/song-${song.id}.html`;
    
    if (navigator.share && isMobile) {
      navigator.share({
        title: `${song.title} | NRADIO`,
        text: `Listen to ${song.title} by NL on NRADIO`,
        url: shareUrl,
      }).catch((err) => {
        if (err.name !== 'AbortError') {
          // Fallback to clipboard if share fails
          navigator.clipboard.writeText(shareUrl);
        }
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
    }
  };

  // Deep-linking effect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const songId = params.get('s');
    let timer: NodeJS.Timeout | undefined;
    
    if (songId && songs.length > 0) {
      const id = parseInt(songId);
      const song = songs.find(s => s.id === id);
      if (song) {
        // Delay slightly to ensure UI is ready
        timer = setTimeout(() => {
          handlePlayToggle(song);
          const element = document.getElementById('my-songs-section');
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }, 1000);
      }
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [songs]);

  return (
    <section 
      id="my-songs-section" 
      className="w-full py-24 px-6 sm:px-12 font-sans selection:bg-indigo-500/30 relative overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at 50% 0%, rgba(${ambientColor}, 0.25) 0%, transparent 65%), var(--bg-glass)`,
        backdropFilter: 'blur(14px) saturate(160%)',
        WebkitBackdropFilter: 'blur(14px) saturate(160%)',
        borderTop: '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
        transition: 'background 1500ms ease'
      }}
    >
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.015] pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '4px 4px' }} />
      
      <audio ref={audioTagRef} preload="auto" crossOrigin="anonymous" style={{ display: 'none' }} />
      <div className="max-w-6xl mx-auto relative z-10">
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-20">
          <div className="space-y-2">
            <h1 className="text-fluid-title font-black italic tracking-tighter uppercase leading-none text-[var(--text-primary)] drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">
              MY SONGS
            </h1>
            <div className="flex items-center gap-3">
              <div className="h-1 w-12 bg-[var(--accent-indigo)]" />
              <p className="text-[var(--text-muted)] font-medium tracking-[0.2em] text-xs uppercase">Curated Soundscape</p>
            </div>
          </div>
          <div className="text-right flex flex-col items-end">
            <div className="flex items-baseline gap-2">
              <span className="text-[var(--accent-indigo)] font-mono text-4xl font-bold tracking-tighter">{songs.length}</span>
              <span className="text-[var(--text-muted)] text-sm font-medium uppercase tracking-[0.3em] pb-1">Tracks</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max">
          <AnimatePresence mode="popLayout">
            {renderedSongs}
          </AnimatePresence>
        </div>
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
          color: var(--song-title-color);
          text-shadow: 0 0 12px var(--song-title-shadow);
          font-weight: 900 !important;
          letter-spacing: -0.01em;
          animation: golden-glow 3s ease-in-out infinite alternate;
          font-size: clamp(1.1rem, 3vw, 1.7rem) !important;
        }
        @keyframes golden-glow {
          from { text-shadow: 0 0 8px var(--song-title-shadow); }
          to { text-shadow: 0 0 20px var(--song-title-shadow), 0 0 30px var(--song-title-shadow); }
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
        .lyrics-btn-active {
          background: rgba(139, 92, 246, 0.5);
          border-color: rgba(139, 92, 246, 1);
          color: white;
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
        @keyframes spin {
          to { transform: rotate(360deg); }
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
