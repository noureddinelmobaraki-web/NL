import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import type { SongListProps } from './SongList';
import { SongCardLite } from './SongCardLite';
import { SongsToolbar } from './SongsToolbar';
import { SongLadderControls } from './SongLadderControls';
import {
  SONG_LADDER_PAGE_SIZE,
  clampSongLadderPage,
  getSongLadderPageCount,
  getSongLadderPageForId,
  sliceSongLadderPage,
} from './songLadderWindow';
import { useSongsFilter } from './hooks/useSongsFilter';
import { useDeviceType } from '../../hooks/useDeviceType';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { useSongLyricsStore } from '../../features/songLyrics';
import '../../styles/components/song-lite.css';
import { SONG_LADDER_MOTION } from './songLadderMotion.config';

type SongItem = SongListProps['songs'][number];
type LadderPhase = 'idle' | 'retracting' | 'deploying';
type LadderDirection = 'next' | 'previous';

const noop = () => {};
const RETRACT_MS = SONG_LADDER_MOTION.retractMs;
const DEPLOY_MS = SONG_LADDER_MOTION.deployMs;

export function SongListLite(props: SongListProps) {
  const {
    songs,
    currentSong,
    onSelect,
    isPlaying = false,
    isWaiting = false,
    currentTime,
    duration,
    durationCache,
    onSeek,
    volume,
    onVolumeChange,
    onPlayPause,
    onPrev,
    onNext,
    setLyricsOpen,
    lrcCache,
    karaokeMode,
    setKaraokeMode,
    currentLyricLine,
    onAmbientColorChange,
    observeCard,
    isCardRevealed,
    onHoverPrefetchLrc,
  } = props;

  const theme = useResolvedTheme();
  const { isMobile, isTablet, isReducedMotion } = useDeviceType();
  const songsRef = useRef<SongItem[]>(songs);
  const onSelectRef = useRef(onSelect);
  const playHandlers = useRef(new Map<number, () => void>());
  const timersRef = useRef<number[]>([]);
  const previousActiveIdRef = useRef<number | null>(currentSong?.id ?? null);
  const [pageIndex, setPageIndex] = useState(0);
  const [phase, setPhase] = useState<LadderPhase>('idle');
  const [direction, setDirection] = useState<LadderDirection>('next');

  useEffect(() => { songsRef.current = songs; }, [songs]);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  useEffect(() => () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const getPlayHandler = useCallback((id: number) => {
    let handler = playHandlers.current.get(id);
    if (!handler) {
      handler = () => {
        const song = songsRef.current.find((candidate) => candidate.id === id);
        if (song) onSelectRef.current(song);
      };
      playHandlers.current.set(id, handler);
    }
    return handler;
  }, []);

  const {
    searchQuery,
    setSearchQuery,
    sortOrder,
    setSortOrder,
    filteredSongs,
  } = useSongsFilter(songs);

  const activeId = currentSong?.id ?? null;
  const openLyricsId = useSongLyricsStore((state) => state.song?.id ?? null);
  const pageCount = getSongLadderPageCount(filteredSongs.length);
  const safePageIndex = clampSongLadderPage(pageIndex, filteredSongs.length);
  const pageStart = safePageIndex * SONG_LADDER_PAGE_SIZE;
  const visibleSongs = useMemo(
    () => sliceSongLadderPage(filteredSongs, safePageIndex),
    [filteredSongs, safePageIndex],
  );

  const clearTransitionTimers = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  }, []);

  const showPageImmediately = useCallback((target: number) => {
    clearTransitionTimers();
    setPhase('idle');
    setPageIndex(clampSongLadderPage(target, filteredSongs.length));
  }, [clearTransitionTimers, filteredSongs.length]);

  const requestPage = useCallback((target: number, nextDirection: LadderDirection) => {
    const safeTarget = clampSongLadderPage(target, filteredSongs.length);
    if (safeTarget === safePageIndex || phase !== 'idle') return;
    setDirection(nextDirection);

    if (isReducedMotion) {
      showPageImmediately(safeTarget);
      return;
    }

    clearTransitionTimers();
    setPhase('retracting');
    const swapTimer = window.setTimeout(() => {
      setPageIndex(safeTarget);
      setPhase('deploying');
      const settleTimer = window.setTimeout(() => setPhase('idle'), DEPLOY_MS);
      timersRef.current.push(settleTimer);
    }, RETRACT_MS);
    timersRef.current.push(swapTimer);
  }, [
    clearTransitionTimers,
    filteredSongs.length,
    isReducedMotion,
    phase,
    safePageIndex,
    showPageImmediately,
  ]);

  // Search/sort creates a new result set. Start its ladder from the first group.
  useEffect(() => {
    showPageImmediately(0);
  }, [searchQuery, sortOrder, showPageImmediately]);

  // Clamp after data/filter count shrinks.
  useEffect(() => {
    if (pageIndex !== safePageIndex) setPageIndex(safePageIndex);
  }, [pageIndex, safePageIndex]);

  // Follow an actually CHANGED active song (ended/next/previous/deep action).
  // A manual + click does not change activeId, so it does not snap back.
  useEffect(() => {
    if (activeId === previousActiveIdRef.current) return;
    previousActiveIdRef.current = activeId;
    const activePage = getSongLadderPageForId(filteredSongs, activeId);
    if (activePage !== null) showPageImmediately(activePage);
  }, [activeId, filteredSongs, showPageImmediately]);

  const rootClass = [
    'nl-songs-lite',
    `theme-${theme}`,
    isMobile ? 'is-mobile' : isTablet ? 'is-tablet' : 'is-desktop',
    isReducedMotion ? 'is-reduced-motion' : '',
  ].filter(Boolean).join(' ');

  const ladderClass = [
    'nl-song-ladder',
    phase === 'retracting' ? 'is-retracting' : '',
    phase === 'deploying' ? 'is-deploying' : '',
    `is-${direction}`,
  ].filter(Boolean).join(' ');

  return (
    <div className={rootClass}>
      <div className="nl-songs-lite__toolbar">
        <SongsToolbar
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          sortOrder={sortOrder}
          onSort={setSortOrder}
        />
      </div>

      {filteredSongs.length === 0 ? (
        <div className="nl-songs-lite__empty" role="status">
          {searchQuery ? `No songs found for “${searchQuery}”.` : 'No songs available.'}
        </div>
      ) : (
        <div
          className={ladderClass}
          role="region"
          aria-label={`Songs ${pageStart + 1} to ${pageStart + visibleSongs.length} of ${filteredSongs.length}`}
          aria-busy={phase !== 'idle'}
        >
          <div className="nl-song-ladder__hook" aria-hidden="true">
            <span className="nl-song-ladder__hook-pin" />
            <span className="nl-song-ladder__hook-ring" />
          </div>
          <div className="nl-song-ladder__crown" aria-hidden="true">
            <span className="is-left" />
            <span className="is-right" />
          </div>

          <div className="nl-songs-lite__grid" role="list">
            {visibleSongs.map((song, localIndex) => {
              const isActive = song.id === activeId;
              const isRevealed = isCardRevealed ? isCardRevealed(song.id) : true;
              const globalIndex = pageStart + localIndex;
              const rungStyle = {
                '--nl-rung-index': localIndex,
                '--nl-rung-reverse-index': visibleSongs.length - 1 - localIndex,
                '--nl-rung-deploy-stagger': `${SONG_LADDER_MOTION.rungDeployStaggerMs}ms`,
                '--nl-rung-retract-stagger': `${SONG_LADDER_MOTION.rungRetractStaggerMs}ms`,
                '--nl-rung-control-reveal-delay': `${SONG_LADDER_MOTION.controlRevealDelayMs}ms`,
                '--nl-rung-deploy-duration': `${SONG_LADDER_MOTION.deployMs}ms`,
                '--nl-rung-retract-duration': `${SONG_LADDER_MOTION.retractMs}ms`,
              } as CSSProperties;

              return (
                <div
                  key={song.id}
                  role="listitem"
                  className={`nl-song-cell${isActive ? ' is-active' : ''}`}
                  data-song-revealed="true"
                  data-ladder-rung={localIndex + 1}
                  style={rungStyle}
                >
                  <SongCardLite
                    song={song}
                    index={globalIndex}
                    isActive={isActive}
                    isActiveInBar={isActive}
                    isPlaying={isActive && isPlaying}
                    isWaiting={isActive && isWaiting}
                    onPlay={getPlayHandler(song.id)}
                    onPlayPause={onPlayPause}
                    onPrev={onPrev}
                    onNext={onNext}
                    setLyricsOpen={setLyricsOpen ?? noop}
                    isLyricsOpen={openLyricsId === song.id}
                    lyrics={isActive ? lrcCache?.[song.id] : undefined}
                    currentTime={isActive ? currentTime : undefined}
                    duration={isActive ? duration : durationCache?.[song.id]}
                    onSeek={isActive ? onSeek : undefined}
                    volume={isActive ? volume : undefined}
                    onVolumeChange={isActive ? onVolumeChange : undefined}
                    karaokeMode={isActive ? karaokeMode : undefined}
                    setKaraokeMode={setKaraokeMode}
                    currentLyricLine={isActive ? currentLyricLine : null}
                    onAmbientColorChange={onAmbientColorChange}
                    observeCard={observeCard}
                    isRevealed={isRevealed}
                    onHoverPrefetchLrc={onHoverPrefetchLrc}
                    resolvedTheme={theme}
                    isMobileViewport={isMobile}
                  />
                </div>
              );
            })}
          </div>

          <SongLadderControls
            pageIndex={safePageIndex}
            pageCount={pageCount}
            visibleCount={visibleSongs.length}
            totalCount={filteredSongs.length}
            disabled={phase !== 'idle'}
            onPrevious={() => requestPage(safePageIndex - 1, 'previous')}
            onNext={() => requestPage(safePageIndex + 1, 'next')}
          />
        </div>
      )}
    </div>
  );
}

export default SongListLite;
