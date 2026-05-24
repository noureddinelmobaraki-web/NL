import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useDeviceType } from '../hooks/useDeviceType';
import { preloadAllSongs, preloadSong } from '../hooks/useHlsAudio';
import { extractDominantColorCached } from '../utils/extractColors';
import { ASSETS } from '../constants/assets';
import { audioManager } from '../audio/audioManager';
import { Song, ActiveSong, LyricLine } from '../types';
import { loadPrefs, savePrefs } from '../utils/userPrefs';
import type { RepeatMode } from '../utils/userPrefs';
import { loadSession } from '../utils/sessionState';
import { BlackHoleTransition } from './MusicMood/BlackHoleTransition';
import { MusicMoodScreen } from './MusicMood/MusicMoodScreen';
import { useSongPlayer } from './songs/SongPlayer';
import { SongList } from './songs/SongList';

const PRIMARY_RGB = '99, 102, 241';
const initialPrefs = loadPrefs();

export const MySongs = ({
  onSongPlay,
  onSongStop,
  onActiveSongChange,
  onAmbientColorChange,
}: {
  onSongPlay: () => void;
  onSongStop?: () => void;
  onActiveSongChange: (data: ActiveSong | null) => void;
  onAmbientColorChange?: (color: string | null) => void;
}) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [volume, setVolume] = useState(initialPrefs.lastVolume);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [karaokeMode, setKaraokeMode] = useState(false);
  const [durationCache] = useState<Record<number, number>>(loadSession().durationCache);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isShuffle, setIsShuffle] = useState(initialPrefs.isShuffle);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(initialPrefs.repeatMode);
  const [lrcCache] = useState<Record<number, LyricLine[]>>(loadSession().lrcCache);
  const [ambientColor, setAmbientColor] = useState('20, 20, 30');
  const { isMobile } = useDeviceType();

  const [isMoodTransitioning, setIsMoodTransitioning] = useState(false);
  const [isMoodActive, setIsMoodActive] = useState(false);
  const moodAudioCtxRef = useRef<AudioContext | null>(null);

  // Lock body scroll when either mood transition or active mood is running
  useEffect(() => {
    if (isMoodTransitioning || isMoodActive) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMoodTransitioning, isMoodActive]);

  const currentSong = useMemo(() => songs.find((s) => s.id === activeId) || null, [activeId, songs]);

  useEffect(() => {
    setLyricsOpen(false);
    setKaraokeMode(false);
  }, [activeId]);

  useEffect(() => {
    const base = import.meta.env.BASE_URL || './';
    fetch(`${base}data/songs.json`)
      .then((r) => r.json())
      .then((data: any[]) => {
        const mapped: Song[] = data.map((s) => ({
          id: s.id,
          title: s.title,
          url: s.url,
          lrc: s.hasLrc && s.lrcFile ? `${base}lrc/${s.lrcFile}.lrc` : null,
          backgroundImage: ASSETS.songs.backgrounds[s.bgIndex],
          sharePath: `/NL/share/song-${s.id}.html`,
        }));
        setSongs(mapped);
        const sectionEl = document.getElementById('my-songs-section');
        if (sectionEl && 'IntersectionObserver' in window) {
          const observer = new IntersectionObserver(
            (entries) => {
              if (entries[0].isIntersecting) {
                observer.disconnect();
                mapped.forEach((s) => preloadSong(s.url));
                const startPhase2 = () => {
                  const allUrls = mapped.map((s) => s.url);
                  preloadAllSongs(allUrls.slice(0, 8), 8, 2, 300);
                  setTimeout(() => preloadAllSongs(allUrls.slice(8), 8, 1, 800), 3000);
                };
                if ('requestIdleCallback' in window) {
                   (window as any).requestIdleCallback(startPhase2, { timeout: 2000 });
                } else {
                  setTimeout(startPhase2, 1000);
                }
              }
            },
            { rootMargin: '400px 0px' }
          );
          observer.observe(sectionEl);
        } else {
          mapped.forEach((s) => preloadSong(s.url));
        }
      });
  }, []);

  const handleNext = useCallback(() => {
    if (!songs.length) return;
    const idx = songs.findIndex((s) => s.id === activeId);
    let nIdx = isShuffle ? Math.floor(Math.random() * songs.length) : (idx + 1) % songs.length;
    if (isShuffle && nIdx === idx && songs.length > 1) nIdx = (nIdx + 1) % songs.length;
    handlePlayToggle(songs[nIdx]);
  }, [activeId, songs, isShuffle]);

  const handlePrev = useCallback(() => {
    if (!songs.length) return;
    const idx = songs.findIndex((s) => s.id === activeId);
    let pIdx = isShuffle ? Math.floor(Math.random() * songs.length) : (idx - 1 + songs.length) % songs.length;
    if (isShuffle && pIdx === idx && songs.length > 1) pIdx = (pIdx - 1 + songs.length) % songs.length;
    handlePlayToggle(songs[pIdx]);
  }, [activeId, songs, isShuffle]);

  const {
    audioTagRef,
    isPlaying,
    currentTime,
    duration,
    audioStatus,
    pendingPlayRef,
    handlePlayPause,
    handleSeek,
  } = useSongPlayer({
    currentSong,
    onSongEnd: handleNext,
    onTimeUpdate: () => {},
    onPlay: onSongPlay,
    onPause: () => onSongStop?.(),
    onNext: handleNext,
    onPrev: handlePrev,
  });

  const handlePlayToggle = useCallback(
    (song?: Song) => {
      if (song && song.id !== activeId) {
        pendingPlayRef.current = true;
        setActiveId(song.id);
        setIsDismissed(false);
        onSongPlay();
        savePrefs({ lastSongId: song.id });
      } else {
        handlePlayPause();
      }
    },
    [activeId, handlePlayPause, onSongPlay]
  );

  useEffect(() => {
    if (audioTagRef.current) {
      audioTagRef.current.volume = volume;
      savePrefs({ lastVolume: volume });
    }
  }, [volume]);

  useEffect(() => {
    if (audioTagRef.current) audioTagRef.current.loop = repeatMode === 'one';
  }, [repeatMode]);

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
    let line = null;
    for (const l of lrcCache[activeId]) {
      if (l.time <= currentTime) line = l.text;
      else break;
    }
    return line;
  }, [activeId, lrcCache, currentTime]);

  const handleShare = (song: Song) => {
    const baseUrl = window.location.origin + import.meta.env.BASE_URL;
    const shareUrl = `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}share/song-${song.id}.html`;
    if (navigator.share && isMobile) {
      navigator.share({ title: song.title, text: `Listen to ${song.title}`, url: shareUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
    }
  };

  useEffect(() => {
    if (!isDismissed && activeId && currentSong) {
      onActiveSongChange({
        id: activeId,
        title: currentSong.title,
        cover: currentSong.cover || currentSong.backgroundImage,
        audioRef: { current: audioTagRef.current },
        isPlaying,
        currentTime,
        duration,
        onPlayPause: () => handlePlayToggle(),
        onPrev: handlePrev,
        onNext: handleNext,
        onShare: () => handleShare(currentSong),
        onDismiss: () => {
          if (audioTagRef.current) {
            audioTagRef.current.pause();
            audioTagRef.current.src = '';
            audioTagRef.current.load();
          }
          setActiveId(null);
          setIsDismissed(true);
        },
        suppressMiniBar: activeId !== null && lyricsOpen,
        isShuffle,
        onShuffleToggle: () =>
          setIsShuffle((p) => {
            savePrefs({ isShuffle: !p });
            return !p;
          }),
        repeatMode,
        onRepeatToggle: () =>
          setRepeatMode((prev) => {
            const next: RepeatMode = prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off';
            savePrefs({ repeatMode: next });
            return next;
          }),
        volume,
        onVolumeChange: (v) => {
          setVolume(v);
          savePrefs({ lastVolume: v });
        },
        nextSongs: songs
          .slice(songs.findIndex((s) => s.id === activeId) + 1, songs.findIndex((s) => s.id === activeId) + 6)
          .map((s) => ({ id: s.id, title: s.title, cover: s.cover || s.backgroundImage })),
      });
    } else {
      onActiveSongChange(null);
    }
  }, [activeId, isPlaying, currentTime, duration, songs, isShuffle, repeatMode, volume, isDismissed, lyricsOpen]);

  useEffect(() => {
    const songId = new URLSearchParams(window.location.search).get('s');
    if (songId && songs.length) {
      const s = songs.find((x) => x.id === parseInt(songId));
      if (s) {
        setTimeout(() => {
          handlePlayToggle(s);
          document.getElementById('my-songs-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 1000);
      }
    }
  }, [songs]);

  return (
    <section
      id="my-songs-section"
      className="w-full py-24 px-6 sm:px-12 font-sans selection:bg-indigo-500/30 relative"
      style={{
        background: `radial-gradient(ellipse at 50% 0%, rgba(${ambientColor}, 0.25) 0%, transparent 65%), var(--bg-glass)`,
        backdropFilter: 'blur(14px) saturate(160%)',
        WebkitBackdropFilter: 'blur(14px) saturate(160%)',
        borderTop: '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
        transition: 'background 1500ms ease',
      }}
    >
      {isMoodTransitioning && (
        <BlackHoleTransition
          onNearComplete={() => setIsMoodActive(true)}
          onComplete={() => setIsMoodTransitioning(false)}
        />
      )}
      {isMoodActive && (
        <MusicMoodScreen
          songs={songs}
          existingAudioCtx={moodAudioCtxRef.current}
          onExit={() => {
            setIsMoodActive(false);
            onSongStop?.();
            if (typeof audioManager.unpauseBg === 'function') audioManager.unpauseBg();
            else (audioManager as any).resume?.('bg');
          }}
        />
      )}
      <audio ref={audioTagRef} preload="auto" crossOrigin="anonymous" style={{ display: 'none' }} />
      <div className="max-w-6xl mx-auto relative z-10">
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-20">
          <div className="space-y-2">
            <h1 className="text-fluid-title font-black italic tracking-tighter uppercase leading-none text-[var(--text-primary)]">
              MY SONGS
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="h-1 w-12 bg-[var(--accent-indigo)]" />
              <p className="text-[var(--text-muted)] font-medium tracking-[0.2em] text-xs uppercase text-nowrap">
                Curated Soundscape
              </p>
              {songs.length > 0 && (
                <button
                  onClick={() => {
                    if (!moodAudioCtxRef.current || moodAudioCtxRef.current.state === 'closed') {
                      moodAudioCtxRef.current = new AudioContext();
                    }
                    if (moodAudioCtxRef.current.state === 'suspended') {
                      moodAudioCtxRef.current.resume();
                    }
                    if (isPlaying) {
                      audioTagRef.current?.pause();
                      onSongStop?.();
                    }
                    audioManager.pause?.('bg');
                    setIsMoodTransitioning(true);
                  }}
                  className="music-mood-trigger px-4 py-2 border rounded-full text-xs font-mono uppercase text-zinc-400 border-zinc-800 hover:border-violet-500 hover:text-violet-400 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
                    <circle cx="7" cy="7" r="2.5" fill="currentColor" opacity="0.8" />
                    <ellipse cx="7" cy="7" rx="6" ry="2" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
                  </svg>
                  MUSIC MOOD
                </button>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-baseline gap-2">
              <span className="text-[var(--accent-indigo)] font-mono text-4xl font-bold tracking-tighter">
                {songs.length}
              </span>
              <span className="text-[var(--text-muted)] text-sm font-medium uppercase tracking-[0.3em] pb-1">
                Tracks
              </span>
            </div>
          </div>
        </header>

        <SongList
          songs={songs}
          currentSong={currentSong}
          onSelect={handlePlayToggle}
          isPlaying={isPlaying}
          isWaiting={audioStatus === 'loading'}
          currentTime={currentTime}
          duration={duration}
          durationCache={durationCache}
          onSeek={handleSeek}
          volume={volume}
          onVolumeChange={setVolume}
          onPlayPause={handlePlayPause}
          onPrev={handlePrev}
          onNext={handleNext}
          onShare={handleShare}
          lyricsOpen={lyricsOpen}
          setLyricsOpen={setLyricsOpen}
          lrcCache={lrcCache}
          karaokeMode={karaokeMode}
          setKaraokeMode={setKaraokeMode}
          currentLyricLine={currentLyricLine}
          onAmbientColorChange={(color) => onAmbientColorChange?.(`rgb(${color})`)}
        />
      </div>

      <style>{`
        :root {
          --primary-rgb: ${PRIMARY_RGB};
        }
        @keyframes slow-zoom {
          from { transform: scale(1); }
          to { transform: scale(1.05); }
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
