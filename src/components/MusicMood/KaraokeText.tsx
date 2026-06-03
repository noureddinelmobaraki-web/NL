import { memo } from 'react';
import type { LyricLine } from '../../types';

interface KaraokeTextProps {
  line: LyricLine | null;
  currentTime: number;
  isPrevious?: boolean;
  isNext?: boolean;
}

export const KaraokeText = memo(({ line, currentTime, isPrevious, isNext }: KaraokeTextProps) => {
  if (!line) return null;

  if (!line.words || line.words.length === 0) {
    return <>{line.text}</>;
  }

  return (
    <>
      {line.words.map((w, idx) => {
        let isSpoken = false;
        if (isPrevious) {
          isSpoken = true;
        } else if (isNext) {
          isSpoken = false;
        } else {
          isSpoken = currentTime >= w.time;
        }

        return (
          <span
            key={idx}
            style={{
              opacity: isSpoken ? 1 : 0.35,
              transition: 'opacity 0.2s ease-out, filter 0.2s ease-out',
            }}
          >
            {w.text}{' '}
          </span>
        );
      })}
    </>
  );
});
