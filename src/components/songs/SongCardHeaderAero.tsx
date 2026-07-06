/**
 * SongCardHeaderAero — the always-visible header of a song card.
 *
 * DOM is 4 flat grid items (thumb / title / meta / actions) so CSS grid can
 * re-flow them per device:
 *  - Mobile (<=767): two stacked lines —
 *      line 1: thumb + full-width one-line title (always visible),
 *      line 2: LRC/INST + duration badges (left) and actions (right).
 *  - Tablet/Desktop (>=768): classic single row (thumb | title+meta | actions).
 *
 * Actions: Play/Pause, Lyrics (only if song.lrc), Video (only if a YouTube id
 * exists). Max 3 buttons. Share was removed by design.
 */
import { memo, useCallback, useMemo } from 'react';
import type { MouseEvent } from 'react';
import { Loader2, Mic2, Pause, Play, Youtube } from 'lucide-react';
import type { SongCardProps } from './SongCard';
import { getSongYoutubeId } from '../../features/youtube/songYoutubeMap';
import { useSongVideoStore } from '../../features/songVideo/songVideoStore';

type Song = SongCardProps['song'];

export interface SongCardHeaderAeroProps {
  song: Song;
  index: number;
  isActive: boolean;
  isPlaying: boolean;
  isWaiting: boolean;
  isLyricsOpen: boolean;
  duration?: number;
  onPlayPauseClick: (e: MouseEvent<HTMLButtonElement>) => void;
  onLyricsClick: (e: MouseEvent<HTMLButtonElement>) => void;
}

/** Hebrew / Arabic / Arabic presentation forms — enough to pick base direction. */
const RTL_CHARS = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;

function formatDuration(seconds?: number): string | null {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function SongCardHeaderAeroInner({
  song,
  index,
  isActive,
  isPlaying,
  isWaiting,
  isLyricsOpen,
  duration,
  onPlayPauseClick,
  onLyricsClick,
}: SongCardHeaderAeroProps) {
  const openSongVideo = useSongVideoStore((s) => s.openSongVideo);
  const videoId = useMemo(() => getSongYoutubeId(song.id), [song.id]);
  const isRtl = useMemo(() => RTL_CHARS.test(song.title), [song.title]);
  const durationLabel = formatDuration(duration);

  /* Video popup — tethered to the button element via e.currentTarget. */
  const handleVideo = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (videoId) openSongVideo(videoId, e.currentTarget);
    },
    [videoId, openSongVideo],
  );

  const playLabel =
    isActive && isPlaying ? `Pause ${song.title}` : `Play ${song.title}`;

  return (
    <div className="nl-aero-head">
      {/* Thumb orb: cover image OR padded track number. Fixed size = no CLS. */}
      <div className="nl-aero-thumb" aria-hidden="true">
        {song.cover ? (
          <img
            src={song.cover}
            alt=""
            width={44}
            height={44}
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        ) : (
          <span className="nl-aero-thumb__num">
            {String(index + 1).padStart(2, '0')}
          </span>
        )}
        {isActive && isPlaying ? (
          <span className="nl-eq" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        ) : null}
      </div>

      {/* Title: always its own full-width line on mobile; RTL-safe. */}
      <div
        className="nl-aero-title"
        dir={isRtl ? 'rtl' : 'ltr'}
        lang={isRtl ? 'ar' : undefined}
        title={song.title}
      >
        {song.title}
      </div>

      {/* Badges (mobile: line 2 left / desktop: under the title). */}
      <div className="nl-aero-meta">
        <span
          className={`nl-aero-badge ${song.lrc ? 'nl-aero-badge--lrc' : 'nl-aero-badge--inst'}`}
        >
          {song.lrc ? 'LRC' : 'INST'}
        </span>
        {durationLabel ? (
          <span className="nl-aero-badge nl-aero-badge--time">{durationLabel}</span>
        ) : null}
      </div>

      {/* Action cluster — max 3 buttons, always visible. */}
      <div className="nl-aero-actions">
        <button
          type="button"
          className="nl-aero-btn nl-aero-btn--primary"
          aria-label={playLabel}
          onClick={onPlayPauseClick}
        >
          {isActive && isWaiting ? (
            <Loader2 size={17} className="nl-spin" aria-hidden="true" />
          ) : isActive && isPlaying ? (
            <Pause size={17} aria-hidden="true" />
          ) : (
            <Play size={17} aria-hidden="true" />
          )}
        </button>

        {song.lrc ? (
          <button
            type="button"
            className="nl-aero-btn"
            aria-label={`Lyrics for ${song.title}`}
            aria-pressed={isActive && isLyricsOpen}
            onClick={onLyricsClick}
          >
            <Mic2 size={17} aria-hidden="true" />
          </button>
        ) : null}

        {videoId ? (
          <button
            type="button"
            className="nl-aero-btn"
            aria-label={`Watch video for ${song.title}`}
            onClick={handleVideo}
          >
            <Youtube size={17} aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export const SongCardHeaderAero = memo(SongCardHeaderAeroInner);
SongCardHeaderAero.displayName = 'SongCardHeaderAero';
export default SongCardHeaderAero;
