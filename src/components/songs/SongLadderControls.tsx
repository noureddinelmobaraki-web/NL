import { memo } from 'react';
import { SONG_LADDER_PAGE_SIZE } from './songLadderWindow';

interface SongLadderControlsProps {
  pageIndex: number;
  pageCount: number;
  visibleCount: number;
  totalCount: number;
  disabled: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export const SongLadderControls = memo(function SongLadderControls({
  pageIndex,
  pageCount,
  visibleCount,
  totalCount,
  disabled,
  onPrevious,
  onNext,
}: SongLadderControlsProps) {
  if (pageCount <= 1) return null;

  const firstItem = pageIndex * SONG_LADDER_PAGE_SIZE + 1;
  const lastItem = Math.min(totalCount, firstItem + visibleCount - 1);
  const firstPage = pageIndex === 0;
  const lastPage = pageIndex >= pageCount - 1;
  const rootClass = `nl-song-ladder__controls ${firstPage ? 'is-first-page' : 'has-previous'}`;

  return (
    <div className={rootClass}>
      <svg
        className="nl-song-ladder__control-harness"
        viewBox="0 0 320 76"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M 54 0 C 62 18, 92 22, 104 30" />
        <path d="M 266 0 C 258 18, 228 22, 216 30" />
        <path className="is-beam" d="M 104 30 L 216 30" />
        {!firstPage ? <path d="M 112 30 L 92 76" /> : null}
        <path d={firstPage ? 'M 160 30 L 160 76' : 'M 208 30 L 228 76'} />
      </svg>

      <div className="nl-song-ladder__control-deck">
        {!firstPage ? (
          <button
            type="button"
            className="nl-song-ladder__page-button is-previous"
            onClick={onPrevious}
            disabled={disabled}
            aria-label="Show the previous six songs"
            title="Previous six songs"
          >
            <span aria-hidden="true">−</span>
          </button>
        ) : null}

        <span className="nl-song-ladder__page-status" aria-live="polite">
          {firstItem}–{lastItem} / {totalCount}
        </span>

        <button
          type="button"
          className="nl-song-ladder__page-button is-next"
          onClick={onNext}
          disabled={disabled || lastPage}
          aria-label={lastPage ? 'No more songs' : 'Show the next six songs'}
          title={lastPage ? 'Last group' : 'Next six songs'}
        >
          <span aria-hidden="true">+</span>
        </button>
      </div>
    </div>
  );
});
