import { useState, useRef, useEffect } from 'react';
import { getLocalAssetUrl } from '../../constants/assets';
import { audioManager } from '../../audio/audioManager';
import { ActiveSong } from '../../types';
import { BlackHoleTransition } from '../MusicMood/BlackHoleTransition';
import { MusicMoodScreen } from '../MusicMood/MusicMoodScreen';
import { useButtonContext } from '../layout/ButtonOrchestrator';
import { useMySongsState } from './hooks/useMySongsState';
import { useMySongsPlayback } from './hooks/useMySongsPlayback';
import { MySongsList } from './MySongsList';

const PRIMARY_RGB = '99, 102, 241';

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
  const [isMoodTransitioning, setIsMoodTransitioning] = useState(false);
  const [isMoodActive, setIsMoodActive] = useState(false);
  const moodAudioCtxRef = useRef<AudioContext | null>(null);

  const { setContext } = useButtonContext();

  const state = useMySongsState({ onAmbientColorChange });

  const playback = useMySongsPlayback({
    songs: state.songs,
    activeId: state.activeId,
    setActiveId: state.setActiveId,
    currentSong: state.currentSong,
    volume: state.volume,
    setVolume: state.setVolume,
    lyricsOpen: state.lyricsOpen,
    isDismissed: state.isDismissed,
    setIsDismissed: state.setIsDismissed,
    isShuffle: state.isShuffle,
    setIsShuffle: state.setIsShuffle,
    repeatMode: state.repeatMode,
    setRepeatMode: state.setRepeatMode,
    lrcCache: state.lrcCache,
    onSongPlay,
    onSongStop,
    onActiveSongChange,
  });

  useEffect(() => {
    if (isMoodActive) {
      setContext('songs-modal');
    } else {
      setContext('page');
    }
  }, [isMoodActive, setContext]);

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

  return (
    <section
      id="my-songs-section"
      className="w-full py-24 px-6 sm:px-12 font-sans selection:bg-indigo-500/30 relative"
      style={{
        background: `radial-gradient(ellipse at 50% 0%, rgba(${state.ambientColor}, 0.25) 0%, transparent 65%), var(--bg-glass)`,
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
          songs={state.songs}
          existingAudioCtx={moodAudioCtxRef.current}
          onExit={() => {
            setIsMoodActive(false);
            onSongStop?.();
            if (typeof audioManager.unpauseBg === 'function') audioManager.unpauseBg();
            else (audioManager as any).resume?.('bg');
          }}
        />
      )}
      <audio ref={playback.audioTagRef} preload="none" crossOrigin="anonymous" style={{ display: 'none' }} />
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
              {state.songs.length > 0 && (
                <button
                  onClick={() => {
                    if (!moodAudioCtxRef.current || moodAudioCtxRef.current.state === 'closed') {
                      moodAudioCtxRef.current = new AudioContext();
                    }
                    if (moodAudioCtxRef.current.state === 'suspended') {
                      moodAudioCtxRef.current.resume();
                    }
                    if (playback.isPlaying) {
                      playback.audioTagRef.current?.pause();
                      onSongStop?.();
                    }
                    audioManager.pause?.('bg');
                    setIsMoodTransitioning(true);
                  }}
                  className="music-mood-trigger px-4 py-2 border rounded-full text-xs font-mono uppercase text-zinc-400 border-zinc-800 hover:border-violet-500 hover:text-violet-400 transition-all flex items-center gap-2 cursor-pointer group"
                >
                  <img
                    src={getLocalAssetUrl('music mood.svg')}
                    className="w-4 h-4 object-contain transition-all group-hover:scale-110"
                    style={{ filter: 'invert(1)' }}
                    alt=""
                  />
                  MUSIC MOOD
                </button>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-baseline gap-2">
              <span className="text-[var(--accent-indigo)] font-mono text-4xl font-bold tracking-tighter">
                {state.songs.length}
              </span>
              <span className="text-[var(--text-muted)] text-sm font-medium uppercase tracking-[0.3em] pb-1">
                Tracks
              </span>
            </div>
          </div>
        </header>

        <MySongsList
          songs={state.songs}
          activeId={state.activeId}
          isPlaying={playback.isPlaying}
          isWaiting={playback.audioStatus === 'loading'}
          currentTime={playback.currentTime}
          duration={playback.duration}
          durationCache={state.durationCache}
          onSeek={playback.handleSeek}
          volume={state.volume}
          onVolumeChange={state.setVolume}
          onPlay={playback.handlePlayToggle}
          lyricsOpen={state.lyricsOpen}
          onToggleLyrics={() => state.setLyricsOpen((p) => !p)}
          lrcCache={state.lrcCache}
          karaokeMode={state.karaokeMode}
          setKaraokeMode={state.setKaraokeMode}
          currentLyricLine={playback.currentLyricLine}
          onShare={playback.handleShare}
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
