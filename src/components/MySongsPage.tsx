import { useState, useRef, useEffect, useMemo, useCallback, Suspense } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, X } from 'lucide-react';
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

import { LyricsWindowContent, parseLRC } from './LyricsEngine';



const PRIMARY_RGB = "99, 102, 241"; 

const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const MySongs = ({ 
  onSongPlay,
  onActiveSongChange,
  onAmbientColorChange
}: { 
  onSongPlay: () => void;
  onActiveSongChange: (data: ActiveSong | null) => void;
  onAmbientColorChange?: (color: string | null) => void;
}) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [audioStatus, setAudioStatus] = useState<AudioStatus>('idle');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [karaokeMode, setKaraokeMode] = useState(false);
  const [durationCache, setDurationCache] = useState<Record<number, number>>({});
  const [mobileFullscreen, setMobileFullscreen] = useState<number | null>(null);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [lrcCache, setLrcCache] = useState<Record<number, LyricLine[]>>({});
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
        
        // [1] Preload first 6 songs immediately
        mapped.slice(0, 6).forEach(s => preloadSong(s.url));

        const firstFiveUrls = mapped.slice(0, 5).map(s => s.url);

        // انتظر تفاعل المستخدم أو 4 ثوانٍ ثم ابدأ
        const startPreload = () => {
          preloadAllSongs(firstFiveUrls, 4, 2, 600);  // 5 أغاني × 4 ثواني فقط، 2 بالتوازي
          window.removeEventListener('pointerdown', startPreload);
          window.removeEventListener('scroll', startPreload);
        };
        window.addEventListener('pointerdown', startPreload, { once: true, passive: true });
        window.addEventListener('scroll', startPreload, { once: true, passive: true });
        setTimeout(startPreload, 4000);  // fallback تلقائي بعد 4 ثواني

        // قائمة الباقي تُحمَّل تدريجياً بعد 15 ثانية
        setTimeout(() => {
          const remaining = mapped.slice(5).map(s => s.url);
          preloadAllSongs(remaining, 4, 1, 1500);  // واحدة بواحدة كل 1.5 ثانية
        }, 15000);
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
    // Skip HLS songs — setting audio.src to .m3u8 doesn't work in Chrome without hls.js
    // Duration will be populated naturally when the song is played
    const isHls = song.url.endsWith('.m3u8') || song.url.includes('/index.m3u8');
    if (isHls) return;
    
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      setDurationCache(prev => ({ ...prev, [song.id]: audio.duration }));
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
      if (isMobile) setMobileFullscreen(song.id);
      
      // 🚀 ابدأ play بشكل synchronous فوراً (لتجاوز autoplay block)
      // حتى لو لم تكن الـ source جاهزة، المتصفح سيقبل play() لاحقاً
      audio.play().catch(() => {}); // optimistic play
      
      pendingPlayRef.current = true;
      setActiveId(song.id);
      setIsDismissed(false);
      onSongPlay();
    } else {
      if (audioStatus === 'playing') {
        audioManager.pause('song');
      } else if (activeId) {
        setIsDismissed(false);
        audioManager.play('song');
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
      if (!isDismissed && activeId && currentSong) {
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
            setMobileFullscreen(null);
          },
          suppressMiniBar: mobileFullscreen !== null || (!isMobile && activeId !== null && lyricsOpen),
          isShuffle,
          onShuffleToggle: () => setIsShuffle(prev => !prev),
          repeatMode,
          onRepeatToggle: () => {
            setRepeatMode(prev => {
              if (prev === 'off') return 'all';
              if (prev === 'all') return 'one';
              return 'off';
            });
          },
          volume,
          onVolumeChange: setVolume,
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
    mobileFullscreen, 
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
          isActive={activeId === song.id}
          isActiveInBar={activeId === song.id && !isMobile}
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
        />
      </div>
    ));
  }, [activeId, audioStatus, isMobile, handlePlayToggle, currentTime, duration, handleSeek, volume, songs]);

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
      
      <audio ref={audioTagRef} preload="auto" style={{ display: 'none' }} />
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

        {isMobile && mobileFullscreen !== null && currentSong && (
          <div 
            className={`mobile-fullscreen-player ${isOverlayOpen ? 'open' : ''}`}
            style={{ 
              position: 'fixed',
              inset: 0,
              zIndex: 9500,
              background: 'var(--bg-page)',
              display: 'flex',
              flexDirection: 'column',
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: 'env(safe-area-inset-bottom)',
              transition: 'transform 350ms cubic-bezier(0.4, 0, 0.2, 1)',
              transform: isOverlayOpen ? 'translateY(0)' : 'translateY(100%)',
              color: 'var(--text-primary)'
            }}
          >
            {/* HEADER */}
            <header style={{ 
              height: '56px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              padding: '0 16px',
              borderBottom: '1px solid var(--border-subtle)'
            }}>
              <button 
                onClick={() => setMobileFullscreen(null)}
                style={{
                  background: 'transparent',
                  color: 'var(--text-primary)',
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
                <ChevronLeft size={20} />
              </button>
              <div style={{
                flex: 1,
                textAlign: 'center',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontWeight: 'bold',
                fontSize: '16px',
                padding: '0 8px'
              }}>
                {currentSong.title}
              </div>
              <button 
                onClick={() => setMobileFullscreen(null)}
                style={{
                  background: 'var(--bg-glass-strong)',
                  color: 'var(--text-primary)',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
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
              background: 'var(--bg-overlay)',
              borderTop: '1px solid var(--border-subtle)',
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
                  accentColor: 'var(--ink-color)',
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
                color: 'var(--text-muted)',
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
                  style={{ background: 'transparent', color: 'var(--text-primary)', border: 'none', padding: '12px' }}
                >
                  <ChevronLeft size={32} />
                </button>

                <button 
                  onClick={() => handlePlayToggle()}
                  style={{
                    background: 'var(--text-primary)',
                    color: 'var(--text-inverse)',
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
                  style={{ background: 'transparent', color: 'var(--text-primary)', border: 'none', padding: '12px' }}
                >
                  <ChevronRight size={32} />
                </button>
              </div>
            </div>
          </div>
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
          color: #FFD700;
          text-shadow: 0 0 12px rgba(255, 215, 0, 0.6);
          font-weight: 900 !important;
          letter-spacing: -0.01em;
          animation: golden-glow 3s ease-in-out infinite alternate;
          font-size: clamp(1.1rem, 3vw, 1.7rem) !important;
        }
        @keyframes golden-glow {
          from { text-shadow: 0 0 8px rgba(255, 215, 0, 0.4); }
          to { text-shadow: 0 0 20px rgba(255, 215, 0, 0.8), 0 0 30px rgba(255, 215, 0, 0.4); }
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
