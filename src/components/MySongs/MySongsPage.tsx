import { useState, useRef, useEffect, useCallback } from 'react';
import { preloadBlackHoleTransition, BlackHoleTransition } from '../MusicMood/BlackHoleTransition';
import { MusicMoodScreen } from '../MusicMood/MusicMoodScreen';
import { SectionErrorBoundary } from '../SectionErrorBoundary';
import newMoodIcon from '../../assets/images/regenerated_image_1780500901330.png';
import { audioManager } from '../../audio/audioManager';
import { ActiveSong } from '../../types';
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
  onRegisterMoodTrigger, // FIXED: Expose mood trigger to parent
}: {
  onSongPlay: () => void;
  onSongStop?: () => void;
  onActiveSongChange: (data: ActiveSong | null) => void;
  onAmbientColorChange?: (color: string | null) => void;
  onRegisterMoodTrigger?: (fn: () => void) => void;
}) => {
  const [isMoodTransitioning, setIsMoodTransitioning] = useState(false);
  const [isMoodActive, setIsMoodActive] = useState(false);
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? (window.innerWidth >= 1024 && !window.matchMedia("(pointer: coarse)").matches && !/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) : true);
  const moodAudioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
      const isMobileUA = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
      setIsDesktop(window.innerWidth >= 1024 && !coarsePointer && !isMobileUA);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const base = import.meta.env.BASE_URL || '/';
    const normalizedBase = base.endsWith('/') ? base : `${base}/`;
    const controller = new AbortController();

    fetch(`${normalizedBase}songs-jsonld.json`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`JSON-LD ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        document.getElementById('songs-jsonld')?.remove();

        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.id = 'songs-jsonld';
        script.textContent = JSON.stringify(data);
        document.head.appendChild(script);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        if (import.meta.env.DEV) {
          console.warn('[MySongsPage] failed to load JSON-LD:', err);
        }
      });
    return () => {
      controller.abort();
      document.getElementById('songs-jsonld')?.remove();
    };
  }, []);

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

  const handleTriggerMood = useCallback(() => {
    // FIXED: side effects خارج setState — والشرط check خارج الـ updaters
    setIsMoodTransitioning(prev => {
      if (prev) return prev;
      if (isMoodActive) return prev; // إذا كان Mood شغّال أصلاً، لا تبدأ transition جديدة
      return true;
    });

    // إنشاء/استئناف AudioContext مرة واحدة فقط
    if (!moodAudioCtxRef.current || moodAudioCtxRef.current.state === 'closed') {
      try {
        moodAudioCtxRef.current = new AudioContext();
      } catch (err) {
        console.warn('[MySongsPage] AudioContext creation failed:', err);
      }
    }
    if (moodAudioCtxRef.current?.state === 'suspended') {
      moodAudioCtxRef.current.resume().catch(() => {});
    }

    // إيقاف ما يلعب حالياً قبل دخول Mood
    try {
      if (playback?.isPlaying) {
        playback.audioTagRef.current?.pause();
        onSongStop?.();
      }
    } catch {}
    try { audioManager.pause?.('bg'); } catch {}
  }, [isMoodActive, playback?.isPlaying, playback?.audioTagRef, onSongStop]);

  useEffect(() => {
    onRegisterMoodTrigger?.(handleTriggerMood);
  }, [onRegisterMoodTrigger, handleTriggerMood]);

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

  // Accessibility: Close lyrics bottom sheet on Escape press
  useEffect(() => {
    if (!state.lyricsOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        state.setLyricsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.lyricsOpen, state.setLyricsOpen]);

  return (
    <section
      id="my-songs-section"
      aria-label="My Songs — أغانيّ"
      role="region"
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
        <SectionErrorBoundary sectionName="BlackHoleTransition">
          <BlackHoleTransition
            onComplete={() => {
              setIsMoodTransitioning(false);
              setIsMoodActive(true);
            }}
          />
        </SectionErrorBoundary>
      )}
      {isMoodActive && (
        <SectionErrorBoundary sectionName="MusicMoodScreen">
          <MusicMoodScreen
            songs={state.songs}
            initialSong={playback.currentSong}
            existingAudioCtx={moodAudioCtxRef.current}
            onExit={() => {
              setIsMoodActive(false);
              onSongStop?.();
              if (typeof audioManager.unpauseBg === 'function') audioManager.unpauseBg();
              else audioManager.unpauseBg();
            }}
          />
        </SectionErrorBoundary>
      )}
      <audio ref={playback.audioTagRef} preload="none" crossOrigin="anonymous" style={{ display: 'none' }} />
      <div className="max-w-6xl mx-auto relative z-10">
        {state.error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">تعذّر تحميل الأغاني</h2>
            <p className="text-[var(--text-muted)] max-w-md">يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى</p>
            <button
              onClick={state.retry}
              className="px-8 py-3 bg-[var(--accent-indigo)] text-white rounded-full font-bold hover:scale-105 active:scale-95 transition-all shadow-lg shadow-indigo-500/20"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : (
          <>
            <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-20">
          <div className="space-y-2">
            <h2 className="text-fluid-title font-black italic tracking-tighter uppercase leading-none text-[var(--text-primary)]">
              MY SONGS
            </h2>
            <div
              style={isDesktop ? {
                paddingLeft: '-4px'
              } : {}}
              className="flex items-center gap-3 flex-wrap"
            >
              <div
                style={isDesktop ? {
                  marginLeft: '-16px'
                } : {
                  marginTop: '56px'
                }}
                className="h-1 w-12 bg-[var(--accent-indigo)]"
              />
              <p
                style={isDesktop ? {
                  paddingTop: '3px',
                  paddingLeft: '-5px',
                  marginLeft: '300px',
                  width: '169.339px',
                } : {
                  marginLeft: '-8px',
                  paddingTop: '1px',
                  marginRight: '0px',
                  marginBottom: '-55px',
                }}
                className="text-[var(--text-muted)] font-medium tracking-[0.2em] text-xs uppercase text-nowrap"
              >
                Curated Soundscape
              </p>
              {state.songs.length > 0 && (
                <div className="relative flex items-center">
                  <div
                    style={isDesktop ? {
                      marginLeft: '-149px'
                    } : {}}
                    className="absolute -left-16 flex items-center animate-pulse hidden sm:flex"
                  >
                    <span
                      style={isDesktop ? {
                        marginLeft: '-271px'
                      } : {}}
                      className="text-[var(--text-primary)] font-bold text-[10px] uppercase tracking-wider mr-1"
                    >
                      Tap
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[var(--text-primary)] animate-bounce-horizontal">
                      <path
                        d="M5 12H19M19 12L12 5M19 12L12 19"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={isDesktop ? {
                          marginLeft: '-58px',
                          paddingTop: '-12px',
                          paddingLeft: '-8px',
                          paddingRight: '-7px',
                          marginBottom: '-8px'
                        } : {}}
                      />
                    </svg>
                  </div>
                  <div className="relative inline-block">
                    <button
                      onMouseEnter={preloadBlackHoleTransition}
                      onFocus={preloadBlackHoleTransition}
                      onClick={handleTriggerMood}
                      className="music-mood-trigger px-4 py-2 border rounded-full text-xs font-mono uppercase text-zinc-400 border-zinc-800 hover:border-violet-500 hover:text-violet-400 transition-all flex items-center gap-2 cursor-pointer group relative overflow-visible shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] bg-black/20 backdrop-blur-md"
                      style={isDesktop ? {
                        paddingRight: '39px',
                        paddingLeft: '-49px',
                        paddingTop: '10px',
                        paddingBottom: '13px',
                        marginLeft: '-409px',
                        width: '125.98400000000001px',
                        height: '46.0645px',
                        marginTop: '3px',
                        marginBottom: '1px',
                        marginRight: '0px'
                      } : {
                        marginLeft: '56px',
                        marginRight: '-31px',
                        paddingBottom: '16px',
                        paddingRight: '-9px',
                        paddingLeft: '17px',
                        marginTop: '24px',
                        height: '41px',
                        width: '135.984px',
                        paddingTop: '19px',
                        marginBottom: '-88px',
                      }}
                    >
                      {/* Mobile Tap Indicator */}
                      <div className="absolute -top-6 sm:hidden left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce">
                        <span className="text-[var(--text-primary)] font-bold text-[9px] uppercase tracking-widest bg-black/50 px-2 rounded-full mb-1">Tap</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[var(--text-primary)] rotate-90">
                          <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      
                      <img
                        src={newMoodIcon}
                        width={16}
                        height={16}
                        className="w-4 h-4 object-contain transition-all group-hover:scale-110"
                        alt="Music Mood mode"
                      />
                      MUSIC MOOD
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div
              style={isDesktop ? {} : {
                marginLeft: '-2px',
                marginRight: '-3px',
                marginBottom: '-3px',
                paddingBottom: '-3px',
                paddingRight: '-4px',
                paddingLeft: '-4px',
                paddingTop: '-4px',
                marginTop: '-9px',
              }}
              className="flex items-baseline gap-2"
            >
              <span
                style={isDesktop ? {} : {
                  marginLeft: '-20px',
                  marginTop: '-18px',
                  marginBottom: '41px',
                  marginRight: '-5px',
                  paddingBottom: '2px',
                  paddingRight: '9px',
                  paddingLeft: '-1px',
                  paddingTop: '-5px',
                }}
                className="text-[var(--accent-indigo)] font-mono text-4xl font-bold tracking-tighter"
              >
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
          onPlayPause={playback.handlePlayPause}
          onPrev={playback.handlePrev}
          onNext={playback.handleNext}
          lyricsOpen={state.lyricsOpen}
          setLyricsOpen={state.setLyricsOpen}
          lrcCache={state.lrcCache}
          karaokeMode={state.karaokeMode}
          setKaraokeMode={state.setKaraokeMode}
          currentLyricLine={playback.currentLyricLine}
          onAmbientColorChange={(color) => onAmbientColorChange?.(`rgb(${color})`)}
        />
        </>
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
