/**
 * SongCard
 * ─────────────────────────────────────────────────────────────────────────────
 * Presentational shell for one card in the bento grid.
 *
 * Refactor summary:
 *   • Ambient color extraction        → useAmbientColor (lazy + cached + IO)
 *   • LRC fetch/parse/cache/listener  → useSongLyrics (single AbortController)
 *   • Body scroll lock (mobile sheet) → useMobileLyricsBodyLock (refcount)
 *     (effect lives inside SongCardLyricsPanel now)
 *
 * Visual contract: external props unchanged, every class/style preserved.
 */
import { memo, useEffect, useRef } from 'react';
import { m } from 'framer-motion';
import './lyricsReveal.css';
import { Song, LyricLine } from '../../types';
import { SONG_BG_FALLBACK } from '../../constants/assets';
import { useDeviceType } from '../../hooks/useDeviceType';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { useAmbientColor } from '../../hooks/useAmbientColor';
import { OsWindow } from '../OsWindow';
import { Waveform } from './Waveform';
import { SongCardHeader } from './SongCardHeader';
import { SongCardControls } from './SongCardControls';
import { useSongLyricsStore } from '../../features/songLyrics';

export interface SongCardProps {
  song: Song;
  index: number;
  isActive: boolean;
  isActiveInBar: boolean;
  isPlaying: boolean;
  isWaiting: boolean;
  onPlay: () => void;
  onPlayPause?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  setLyricsOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
  isLyricsOpen?: boolean;
  lyrics?: LyricLine[];
  currentTime?: number;
  duration?: number;
  onSeek?: (val: number) => void;
  volume?: number;
  onVolumeChange?: (val: number) => void;
  karaokeMode?: boolean;
  setKaraokeMode?: (val: boolean | ((prev: boolean) => boolean)) => void;
  currentLyricLine?: string | null;
  onAmbientColorChange?: (color: string) => void;

  observeCard?: (id: string | number, el: HTMLElement | null) => void;
  isRevealed?: boolean;
  onHoverPrefetchLrc?: (id: number) => void;
}

export const SongCard = memo(({
  song, index, isActive, isActiveInBar, isPlaying, isWaiting,
  onPlay, onPlayPause, onPrev, onNext,
  currentTime, duration, onSeek,
  volume, onVolumeChange,
  onAmbientColorChange,
  observeCard, onHoverPrefetchLrc,
}: SongCardProps) => {
  const { isMobile, isTablet } = useDeviceType();
  const resolvedTheme = useResolvedTheme();
  const cardRef = useRef<HTMLDivElement>(null);

  const setRefs = (el: HTMLDivElement | null) => {
    cardRef.current = el;
    if (observeCard) observeCard(song.id, el);
  };

  const currentTimeRef = useRef(currentTime ?? 0);
  currentTimeRef.current = currentTime ?? 0;

  const lyricsOpen = useSongLyricsStore((s) => s.song?.id === song.id);

  // ── Ambient color: lazy + cached + visibility-aware ──────────────────────
  useAmbientColor({
    imageUrl: song.cover || song.backgroundImage,
    isActive,
    onColor: onAmbientColorChange,
    targetRef: cardRef,
  });

  // ── Global events: close-mobile-lyrics / open-song-lyrics ────────────────
  useEffect(() => {
    const closeHandler = () => useSongLyricsStore.getState().close();
    document.addEventListener('close-mobile-lyrics', closeHandler);
    return () => document.removeEventListener('close-mobile-lyrics', closeHandler);
  }, []);

  useEffect(() => {
    const openHandler = (e: Event) => {
      const detail = (e as CustomEvent<{ songId: number }>).detail;
      if (detail?.songId === song.id) {
        const cardEl = cardRef.current;
        if (cardEl) {
          useSongLyricsStore.getState().toggle({
            song,
            anchorEl: cardEl,
            getCurrentTime: () => currentTimeRef.current,
            onSeek: onSeek ?? (() => {}),
          });
        }
      }
    };
    document.addEventListener('open-song-lyrics', openHandler);
    return () => document.removeEventListener('open-song-lyrics', openHandler);
  }, [song, onSeek]);

  // ── Light-theme scroll-to-active is now owned by SongCardLyricsPanel ──

  const renderContent = () => {
    return (
    <m.div
      ref={setRefs}
      id={`song-card-${song.id}`}
      layout
      layoutId={`song-${song.id}`}
      transition={
        (isMobile || isTablet)
          ? undefined
          : { layout: { duration: 0.30, ease: [0.22, 1, 0.36, 1] } }
      }
      onClick={onPlay}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (isActive && onPlayPause) onPlayPause();
          else onPlay();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Play song ${song.title}`}
      onPointerEnter={() => {
        if (onHoverPrefetchLrc) onHoverPrefetchLrc(song.id);
        if (song.url.includes('.m3u8')) {
          import('../../hooks/useHlsAudio').then(({ preloadAllSongs }) => {
            preloadAllSongs([song.url], 4, 1, 0);
          });
        }
      }}
      className={`song-card-container
        song-card relative ${
          (resolvedTheme === 'light' && lyricsOpen) ||
          ((isMobile || isTablet) && lyricsOpen)
            ? 'overflow-visible'
            : 'overflow-hidden'
        } flex flex-col ${(isMobile || isTablet) ? 'transition-all' : ''} cursor-pointer
        ${
          isMobile || isTablet
            ? `song-card-mobile justify-center ${isActive ? 'song-card-mobile-active' : ''}`
            : resolvedTheme === 'dark'
              ? 'bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/20 transition-all duration-500 rounded-2xl'
              : resolvedTheme === 'light'
                ? 'bg-[#F0EBE3]'
                : isActive
                  ? 'active shadow-[0_20px_50px_rgba(0,0,0,0.6)] p-6 sm:p-8 rounded-2xl'
                  : 'shadow-lg hover:shadow-xl p-5 sm:p-6 rounded-2xl'
        }
        ${
          isActive && resolvedTheme !== 'dark' && resolvedTheme !== 'light'
            && !isMobile && !isTablet
            ? 'p-6 sm:p-8'
            : ''
        }
      `}
      style={{
        backgroundImage: resolvedTheme === 'light'
          ? 'none'
          : `url('${song.backgroundImage}'), url('${SONG_BG_FALLBACK}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        gridColumn: isActive && !isMobile ? 'span 2' : 'span 1',
        ...(!(isMobile || isTablet) ? {} : { transitionDuration: resolvedTheme === 'dark' ? '500ms' : '700ms' }),
        ...((isMobile || isTablet)
          ? {
              minHeight: '80px',
              ...(lyricsOpen ? {} : { maxHeight: '80px' }),
              padding: '12px 16px',
              borderRadius: resolvedTheme === 'light' ? '0' : '14px',
              border: isActive
                ? '1px solid var(--border-subtle, rgba(255,255,255,0.25))'
                : '1px solid transparent',
              ...(isActive ? { boxShadow: '0 4px 16px rgba(0,0,0,0.25)' } : {}),
            }
          : {}),
      }}
    >
      {isActive && resolvedTheme !== 'light' && !isMobile && (
        <div className="absolute top-4 left-4 z-30 scale-75 sm:scale-100">
          <Waveform isPlaying={isPlaying} />
        </div>
      )}

      {resolvedTheme !== 'light' && (
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url('${song.backgroundImage}'), url('${SONG_BG_FALLBACK}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            animation: isActive && !isMobile
              ? 'slow-zoom 8s ease-in-out infinite alternate'
              : 'none',
            willChange: 'transform',
            transform: 'translateZ(0)',
          }}
        />
      )}

      {resolvedTheme !== 'light' && (
        <div
          className="absolute inset-0 z-10 transition-all duration-600"
          style={{
            background: isActive ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.65)',
            backdropFilter: (isActive || isTablet || isMobile) ? 'none' : 'blur(1px)',
            WebkitBackdropFilter: (isActive || isTablet || isMobile) ? 'none' : 'blur(1px)',
          }}
        />
      )}

      <div className="relative z-20 flex flex-col gap-4">
        <SongCardHeader
          song={song}
          index={index}
          isActive={isActive}
          isActiveInBar={isActiveInBar}
          isPlaying={isPlaying}
          isWaiting={isWaiting}
          isMobile={isMobile}
          isTablet={isTablet}
          resolvedTheme={resolvedTheme}
          isLyricsOpen={lyricsOpen}
          duration={duration}
          onPlay={onPlay}
          onPlayPause={onPlayPause}
          onToggleLyrics={(anchorEl) => {
            if (!isActive) { onPlay(); }
            useSongLyricsStore.getState().toggle({
              song,
              anchorEl,
              getCurrentTime: () => currentTimeRef.current,
              onSeek: onSeek ?? (() => {}),
            });
          }}
        />

        {isActive && !isMobile && !isTablet && (
          <div className="mt-2 space-y-3 nl-lyrics-reveal">
            <SongCardControls
              isMobile={isMobile}
              resolvedTheme={resolvedTheme}
              currentTime={currentTime || 0}
              duration={duration || 0}
              volume={volume || 0.7}
              onSeek={onSeek || (() => {})}
              onVolumeChange={onVolumeChange || (() => {})}
              onPrev={onPrev || (() => {})}
              onNext={onNext || (() => {})}
              onPlayPause={onPlayPause || (() => {})}
              isPlaying={isPlaying}
              isWaiting={isWaiting}
              song={song}
            />
          </div>
        )}
      </div>

      {(isMobile || isTablet) && isActive && (
        <div className="song-card-mobile-progress" aria-hidden="true">
          <span
            style={{
              width: duration && duration > 0
                ? `${Math.min(100, ((currentTime || 0) / duration) * 100)}%`
                : '0%',
            }}
          />
        </div>
      )}
    </m.div>
    );
  };

  if (resolvedTheme === 'light') {
    return (
      <OsWindow
        title={`song_card.${song.id}`}
        className={isActive && !isMobile ? 'col-span-2' : ''}
        overflow={lyricsOpen ? 'visible' : 'hidden'}
      >
        {renderContent()}
      </OsWindow>
    );
  }

  return renderContent();
});
