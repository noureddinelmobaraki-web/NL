/**
 * SongListLite — silver/red songs window (toolbar + responsive grid).
 *
 * Layouts (see song-lite.css for the matching media queries):
 *  - Mobile  (<=767): single column, two-line compact rows, full width.
 *  - Tablet  (768–1023): 2 columns; active card spans both.
 *  - Desktop (>=1100): 3 columns; active card spans 2 with inline transport.
 *
 * Perf notes:
 *  - Per-song onPlay handlers are cached in a Map keyed by song id and read
 *    the latest `songs`/`onSelect` through refs — so every card receives a
 *    referentially-stable callback and React.memo actually works.
 *  - Playback-tick props (currentTime, isPlaying, onSeek, volume, lyrics…)
 *    are passed ONLY to the active card; inactive cards keep stable props
 *    and never re-render during playback.
 */
import { useCallback, useEffect, useRef } from 'react';
import type { SongListProps } from './SongList';
import { SongCardLite } from './SongCardLite';
import { SongsToolbar } from './SongsToolbar';
import { useSongsFilter } from './hooks/useSongsFilter';
import { useDeviceType } from '../../hooks/useDeviceType';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import '../../styles/components/song-lite.css';

type SongItem = SongListProps['songs'][number];

const noop = () => {};

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
    lyricsOpen,
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

  /* Latest values readable from stable callbacks without re-creating them. */
  const songsRef = useRef<SongItem[]>(songs);
  useEffect(() => {
    songsRef.current = songs;
  }, [songs]);

  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  /* Stable per-song play handlers (Map cache) — critical for React.memo. */
  const playHandlers = useRef(new Map<number, () => void>());
  const getPlayHandler = useCallback((id: number) => {
    let handler = playHandlers.current.get(id);
    if (!handler) {
      handler = () => {
        const s = songsRef.current.find((x) => x.id === id);
        if (s) onSelectRef.current(s);
      };
      playHandlers.current.set(id, handler);
    }
    return handler;
  }, []);

  const { searchQuery, setSearchQuery, sortOrder, setSortOrder, filteredSongs } =
    useSongsFilter(songs);

  const activeId = currentSong?.id ?? null;

  const rootClass = [
    'nl-songs-lite',
    `theme-${theme}`,
    isMobile ? 'is-mobile' : isTablet ? 'is-tablet' : 'is-desktop',
    isReducedMotion ? 'is-reduced-motion' : '',
  ]
    .filter(Boolean)
    .join(' ');

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
        <div className="nl-songs-lite__grid" role="list">
          {filteredSongs.map((song, i) => {
            const isActive = song.id === activeId;
            return (
              <div
                key={song.id}
                role="listitem"
                className={`nl-song-cell${isActive ? ' is-active' : ''}`}
              >
                <SongCardLite
                  song={song}
                  index={i}
                  isActive={isActive}
                  isActiveInBar={isActive}
                  /* Tick-frequency props go to the active card only, so
                     inactive cards keep stable props and skip re-renders. */
                  isPlaying={isActive && isPlaying}
                  isWaiting={isActive && isWaiting}
                  onPlay={getPlayHandler(song.id)}
                  onPlayPause={onPlayPause}
                  onPrev={onPrev}
                  onNext={onNext}
                  setLyricsOpen={setLyricsOpen ?? noop}
                  isLyricsOpen={isActive ? lyricsOpen : false}
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
                  isRevealed={isCardRevealed ? isCardRevealed(song.id) : true}
                  onHoverPrefetchLrc={onHoverPrefetchLrc}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SongListLite;
