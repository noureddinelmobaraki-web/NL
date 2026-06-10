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
        let spokenRatio: number;
        if (isPrevious) {
          spokenRatio = 1;
        } else if (isNext) {
          spokenRatio = 0;
        } else {
          // تدرّج نطق الكلمة عبر نافذة 280ms
          const delta = currentTime - w.time;
          spokenRatio = delta <= 0 ? 0 : delta >= 0.28 ? 1 : delta / 0.28;
        }

        const opacity = 0.32 + spokenRatio * 0.68;
        const glow = spokenRatio > 0 && spokenRatio < 1
          ? `drop-shadow(0 0 6px rgba(255,255,255,${(0.5 * (1 - spokenRatio)).toFixed(3)}))`
          : 'none';

        return (
          <span
            key={idx}
            style={{
              opacity,
              filter: glow,
              transition: 'opacity 0.18s ease-out, filter 0.18s ease-out',
            }}
          >
            {w.text}{' '}
          </span>
        );
      })}
    </>
  );
});
