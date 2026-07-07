import { memo } from 'react';
import type { LyricLine } from '../../types';
import { isSectionHeader } from './lyricFormat';

interface Props {
  line: LyricLine;
  index: number;
  register: (index: number, el: HTMLElement | null) => void;
  onSeek: (t: number) => void;
}

const ARABIC = /[\u0600-\u06FF]/;

export const LyricsLine = memo(({ line, index, register, onSeek }: Props) => {
  const setRef = (el: HTMLElement | null) => register(index, el);

  if (isSectionHeader(line.text)) {
    return (
      <div ref={setRef} className="nl-lyr-section">
        <span>{line.text.replace(/[[\]]/g, '')}</span>
      </div>
    );
  }

  const isArabic = ARABIC.test(line.text);
  const hasWords = !!line.words && line.words.length > 1;

  return (
    <p
      ref={setRef}
      className="nl-lyr-line"
      dir={isArabic ? 'rtl' : 'ltr'}
      onClick={() => onSeek(line.time)}
    >
      {hasWords && line.words ? (
        line.words.map((w, wi) => (
          <span key={wi} className="nl-lw">{w.text}</span>
        ))
      ) : (
        <span className="nl-lyr-text">{line.text || '\u266a'}</span>
      )}
      {line.translation ? (
        <span className="nl-lyr-tr">{line.translation}</span>
      ) : null}
    </p>
  );
});
LyricsLine.displayName = 'LyricsLine';
