/**
 * SongCardLite — one brushed-silver song slot with blood-red accents.
 *
 * Behavior contract (unchanged):
 *  - Row click / Enter / Space  -> onPlay()
 *  - Play button                -> onPlayPause() when active, else onPlay()
 *  - Lyrics button              -> active: toggle; inactive: play then open
 *  - Active card expands with SongCardControls + SongCardLyricsPanel;
 *    lyrics layoutType is 'popover' on mobile/tablet (panel shows its own
 *    bottom sheet) and 'inline' on desktop.
 *
 * Perf notes:
 *  - React.memo + stable list callbacks: only the ACTIVE card re-renders on
 *    timeupdate ticks.
 *  - `isRevealed === false` renders a fixed-height ghost (cheap paint) while
 *    still registering with `observeCard` so it can be revealed.
 *  - Current lyric line found via O(log n) binary search.
 */
import { memo, useCallback, useEffect, useRef } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import type { SongCardProps } from './SongCard';
import { SongCardHeaderAero } from './SongCardHeaderAero';
import { SongCardControls } from './SongCardControls';
import { useSongLyricsStore } from '../../features/songLyrics';

const noop = () => {};

interface SongCardLiteProps extends SongCardProps {
  resolvedTheme: string;
  isMobileViewport: boolean;
}

/** True if the event originated inside the transport/lyrics area or a control. */
function isInteractiveTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    Boolean(
      target.closest('button, a, input, select, [role="slider"], .nl-song-card__expand'),
    )
  );
}

function SongCardLiteInner(props: SongCardLiteProps) {
  const {
    song,
    index,
    isActive,
    isActiveInBar,
    isPlaying,
    isWaiting,
    onPlay,
    onPlayPause,
    onPrev,
    onNext,
    currentTime,
    duration,
    onSeek,
    volume,
    onVolumeChange,
    observeCard,
    isRevealed,
    onHoverPrefetchLrc,
    resolvedTheme,
    isMobileViewport,
  } = props;

  const theme = resolvedTheme;
  const isMobile = isMobileViewport;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const revealed = isRevealed !== false;

  /* Register the root element with the list's IntersectionObserver.
     This runs even for ghost cards so off-screen rows can be revealed. */
  useEffect(() => {
    observeCard?.(song.id, rootRef.current);
    return () => {
      observeCard?.(song.id, null);
    };
  }, [observeCard, song.id]);

  const currentTimeRef = useRef(currentTime ?? 0);
  currentTimeRef.current = currentTime ?? 0;

  const lyricsOpen = useSongLyricsStore((s) => s.song?.id === song.id);

  const time = currentTime ?? 0;

  /* ----- Button wiring (behavior identical to the old card) ----- */

  const handlePlayPause = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (isActive && onPlayPause) onPlayPause();
      else onPlay();
    },
    [isActive, onPlayPause, onPlay],
  );

  const handleLyrics = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (!song.lrc) return;
      if (!isActive) {
        onPlay();
      }
      useSongLyricsStore.getState().toggle({
        song,
        anchorEl: e.currentTarget,
        getCurrentTime: () => currentTimeRef.current,
        onSeek: onSeek ?? noop,
      });
    },
    [song, isActive, onPlay, onSeek],
  );

  /* Row acts as a button; clicks on inner controls/expanded area are ignored
     here (inner buttons also stopPropagation as a second line of defense). */
  const handleRowClick = (e: MouseEvent<HTMLDivElement>) => {
    if (isInteractiveTarget(e.target)) return;
    onPlay();
  };

  const handleRowKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (isInteractiveTarget(e.target)) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onPlay();
    }
  };

  const rootClass = [
    'nl-song-card',
    `theme-${theme}`,
    isActive ? 'is-active' : '',
    isActiveInBar ? 'is-in-bar' : '',
    isPlaying ? 'is-playing' : '',
    isWaiting ? 'is-waiting' : '',
    revealed ? '' : 'is-ghost',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={rootRef}
      className={rootClass}
      role="button"
      tabIndex={0}
      aria-label={isActive && isPlaying ? `Pause ${song.title}` : `Play ${song.title}`}
      onClick={handleRowClick}
      onKeyDown={handleRowKeyDown}
      onPointerEnter={() => onHoverPrefetchLrc?.(song.id)}
    >
      {revealed ? (
        <>
          <SongCardHeaderAero
            song={song}
            index={index}
            isActive={isActive}
            isPlaying={isPlaying}
            isWaiting={isWaiting}
            isLyricsOpen={lyricsOpen}
            duration={duration}
            onPlayPauseClick={handlePlayPause}
            onLyricsClick={handleLyrics}
          />
          {isActive ? (
            <div className="nl-song-card__expand">
              <SongCardControls
                isMobile={isMobile}
                resolvedTheme={theme}
                currentTime={time}
                duration={duration ?? 0}
                volume={volume ?? 1}
                onSeek={onSeek ?? noop}
                onVolumeChange={onVolumeChange ?? noop}
                onPrev={onPrev ?? noop}
                onNext={onNext ?? noop}
                onPlayPause={onPlayPause ?? onPlay}
                isPlaying={isPlaying}
                isWaiting={isWaiting}
                song={song}
              />
            </div>
          ) : null}
        </>
      ) : (
        /* Off-screen placeholder: fixed height, zero-cost paint, no children. */
        <div className="nl-song-card__ghost" aria-hidden="true" />
      )}
    </div>
  );
}

export const SongCardLite = memo(SongCardLiteInner);
SongCardLite.displayName = 'SongCardLite';
export default SongCardLite;
