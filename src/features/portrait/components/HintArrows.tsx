import { memo } from 'react';
import { LAMP_HOTSPOT, PORTRAIT_HINTS } from '../constants';

type Props = { leaving: boolean };

const LAMP_X = ((LAMP_HOTSPOT.left + LAMP_HOTSPOT.right) / 2) * 100;
const LAMP_Y = ((LAMP_HOTSPOT.top + LAMP_HOTSPOT.bottom) / 2) * 100;
const SUBJECT_X = PORTRAIT_HINTS.subject.x * 100;
const SUBJECT_Y = PORTRAIT_HINTS.subject.y * 100;

/**
 * Inline SVG, not an icon package: lucide-react is not currently in the
 * portrait chunk and pulling it in for one glyph would add a dependency edge
 * to a chunk that scripts/verify-build.mjs holds to 250 KB gzipped.
 *
 * The arrow points right and slightly down, so it reads as "over there".
 */
const Arrow = memo(function Arrow() {
  return (
    <svg className="nl-hint__svg" viewBox="0 0 40 24" aria-hidden="true" focusable="false">
      <path
        d="M2 6 C 14 6, 26 10, 33 17"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path d="M33 17 L 25 16 M33 17 L 32 9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
});

/**
 * The two stage-anchored hints. Rendered INSIDE .nl-portrait-stage so the
 * percentages below are the same normalised coordinates as every other
 * portrait measurement.
 *
 * aria-hidden and pointer-events: none are both load-bearing:
 *  - the erase trail lives on the stage's own onPointerMove, and an overlay
 *    that swallowed pointer events would break the very gesture the third
 *    arrow is advertising;
 *  - e2e/a11y-smoke.spec.ts walks every visible button and every visible img
 *    and asserts an accessible name. These are neither, and they are hidden
 *    from the tree, so they can never enter that assertion.
 */
export const HintArrows = memo(function HintArrows({ leaving }: Props) {
  return (
    <div className="nl-hint-layer" data-leaving={leaving ? 'true' : undefined} aria-hidden="true">
      <span className="nl-hint nl-hint--lamp" style={{ left: `${LAMP_X}%`, top: `${LAMP_Y}%` }}>
        {PORTRAIT_HINTS.showLabels && <b className="nl-hint__label">{PORTRAIT_HINTS.lampLabel}</b>}
        <Arrow />
      </span>

      <span className="nl-hint nl-hint--subject" style={{ left: `${SUBJECT_X}%`, top: `${SUBJECT_Y}%` }}>
        {PORTRAIT_HINTS.showLabels && <b className="nl-hint__label">{PORTRAIT_HINTS.subjectLabel}</b>}
        <Arrow />
      </span>
    </div>
  );
});

/**
 * The switch hint. It has to be a sibling of <PoemToggle /> in the root, not a
 * child of the stage: the switch is anchored to the root with the same
 * max(14px, env(safe-area-inset-*)) insets, and the stage is a centred square
 * that is narrower than the viewport on most screens with overflow: hidden.
 */
export const HintToggleArrow = memo(function HintToggleArrow({ leaving }: Props) {
  return (
    <span
      className="nl-hint nl-hint--toggle"
      data-leaving={leaving ? 'true' : undefined}
      aria-hidden="true"
    >
      <Arrow />
      {PORTRAIT_HINTS.showLabels && <b className="nl-hint__label">{PORTRAIT_HINTS.toggleLabel}</b>}
    </span>
  );
});
