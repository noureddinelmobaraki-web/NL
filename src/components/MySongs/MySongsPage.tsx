import { useState, useEffect, useCallback } from 'react';
import { songSurfaceBus } from '../../audio/songSurfaceBus';
import { ActiveSong } from '../../types';
import { useButtonContext } from '../layout/ButtonOrchestrator';
import { useMySongsState } from './hooks/useMySongsState';
import { useMySongsPlayback } from './hooks/useMySongsPlayback';
import { useLrcHoverPreload } from './hooks/useLrcHoverPreload';
import { useMediaSession } from '../../hooks/useMediaSession';
import { MySongsList } from './MySongsList';
import { useStructuredData } from '../../hooks/useStructuredData';
import '../../styles/components/mySongs.css';

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
  // إعلان "سطح أغنية معروض" (My Songs) → النوتش يعرض الاسم فقط هنا.
  useEffect(() => songSurfaceBus.enter(), []);

  useStructuredData('songs-jsonld.json', 'songs-jsonld');

  const { setContext } = useButtonContext();
  
  const [visibleIds, setVisibleIds] = useState<Set<number | string>>(() => new Set());
  
  const state = useMySongsState({ onAmbientColorChange, visibleIds });

  const { prefetchLrc } = useLrcHoverPreload(state.songs);

  // Card reveal is only a rendering/HLS-priority signal. Do not turn viewport
  // observation (or the virtual-list safety reveal) into an LRC network burst.
  // Lyrics still preload on explicit pointer intent and for active/adjacent songs.
  const handleCardRevealed = useCallback((id: number | string) => {
    setVisibleIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

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

  useMediaSession({
    track: state.currentSong
      ? { title: state.currentSong.title, artist: 'NL', artwork: state.currentSong.backgroundImage }
      : null,
    isPlaying: playback.isPlaying,
    onPlay: playback.handlePlayPause,
    onPause: playback.handlePlayPause,
    onNext: playback.handleNext,
    onPrev: playback.handlePrev,
  });

  useEffect(() => {
    setContext('page');
  }, [setContext]);

  const { lyricsOpen, setLyricsOpen } = state;

  // Accessibility: Close lyrics bottom sheet on Escape press
  useEffect(() => {
    if (!lyricsOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLyricsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lyricsOpen, setLyricsOpen]);

  return (
    <section
      id="my-songs-section"
      aria-label="My Songs — My Songs"
      role="region"
      className="w-full py-24 px-6 sm:px-12 font-sans selection:bg-indigo-500/30 relative"
      style={{
        background: `radial-gradient(ellipse at 50% 0%, rgba(${state.ambientColor}, 0.16) 0%, transparent 70%)`,
        transition: 'background 1500ms ease',
      }}
    >
      <audio
        ref={playback.audioTagRef}
        preload="none"
        crossOrigin="anonymous"
        style={{ display: 'none' }}
        aria-hidden="true"
      />
      <div className="max-w-6xl mx-auto relative z-10">
        {state.error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Failed to load songs</h2>
            <p className="text-[var(--text-muted)] max-w-md">Please check your internet connection and try again</p>
            <button
              onClick={state.retry}
              className="px-8 py-3 bg-[var(--accent-indigo)] text-white rounded-full font-bold hover:scale-105 active:scale-95 transition-all shadow-lg shadow-indigo-500/20"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <header className="nl-songs-heading">
              <div className="nl-songs-heading__art" aria-hidden="true">
                <span className="nl-songs-heading__disc" />
                <span className="nl-songs-heading__needle" />
              </div>
              <div className="nl-songs-heading__identity">
                <p className="nl-songs-heading__eyebrow">CURATED SOUNDSCAPE</p>
                <h2 className="nl-songs-heading__title">
                  <span>MY</span>
                  <strong>SONGS</strong>
                </h2>
              </div>
              <div className="nl-songs-heading__count" aria-label={`${state.songs.length} tracks`}>
                <span className="nl-songs-heading__number">{state.songs.length}</span>
                <span className="nl-songs-heading__label">TRACKS</span>
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
          onCardRevealed={handleCardRevealed}
          onHoverPrefetchLrc={prefetchLrc}
        />
        </>
        )}
      </div>
    </section>
  );
};
