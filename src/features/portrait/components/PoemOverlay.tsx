import { memo, useLayoutEffect, useRef } from 'react';
import { POEM_CONFIG } from '../poem';
import type { PoemLine } from '../hooks/usePoemPlayback';

type Props = { lines: PoemLine[] };

/**
 * The stack is pinned to the bottom of its box and grows upward, so adding a
 * line moves every older line up by exactly one line-height for free. The only
 * thing left to do is smooth that jump, which is the FLIP tween below.
 *
 * Every word of a line is rendered from the moment the line appears; unlit
 * words are transparent, not absent. That keeps the line box a fixed size, so
 * words light up in place instead of shoving each other around, and so the
 * offsetHeight the FLIP tween measures is correct on the first frame.
 */
export const PoemOverlay = memo(function PoemOverlay({ lines }: Props) {
  const stackRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<number>(-1);

  useLayoutEffect(() => {
    const el = stackRef.current;
    if (!el || lines.length === 0) return;

    const newestId = lines[lines.length - 1].id;
    if (newestId === lastIdRef.current) return; // same line, only more words
    lastIdRef.current = newestId;

    const newest = el.lastElementChild as HTMLElement | null;
    const delta = newest?.offsetHeight ?? 0;
    if (delta <= 0) return;

    el.animate(
      [{ transform: `translateY(${delta}px)` }, { transform: 'translateY(0)' }],
      { duration: POEM_CONFIG.riseMs, easing: 'cubic-bezier(.22,1,.36,1)' },
    );
  }, [lines]);

  return (
    <div className="nl-poem" dir="rtl" lang="ar" aria-live="polite">
      <div className="nl-poem__stack" ref={stackRef}>
        {lines.map((line) => (
          <p className="nl-poem__line" key={line.id}>
            {line.words.map((word, i) => (
              <span
                key={i}
                className="nl-poem__word"
                data-lit={i < line.shown ? 'true' : undefined}
              >
                {word}
              </span>
            ))}
          </p>
        ))}
      </div>
    </div>
  );
});
