import { useEffect, useState } from 'react';
import { POEM_STAGE, SUBJECT_BOX } from '../constants';

/** Width of his bounding box in plate units. */
const BOX_W = SUBJECT_BOX.right - SUBJECT_BOX.left;   // 0.65625
/**
 * Plate coordinate that must land on the right edge of the viewport for
 * `visibleFraction` of him to remain on screen. At 0.5 this is the centre of
 * his bounding box, 0.671875.
 */
const U_EDGE = SUBJECT_BOX.left + POEM_STAGE.visibleFraction * BOX_W;
/** Visible width of him, in plate units. */
const VIS = U_EDGE - SUBJECT_BOX.left;

export type PoemStageVars = Record<string, string>;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

function compute(vw: number, vh: number): PoemStageVars {
  // Identical to --nl-stage: the stage grows to the full viewport in poem mode,
  // but min(w, h) of a viewport-sized box is still min(vw, vh), so the canvas
  // backing store is never reallocated on toggle.
  const S = Math.min(vw, vh);
  const narrow = vw < POEM_STAGE.wideBreakpointPx;
  const target = narrow
    ? POEM_STAGE.personWidthVwNarrow
    : POEM_STAGE.personWidthVwWide;

  const zoom = clamp(
    (target * vw) / (S * VIS),
    POEM_STAGE.zoomMin,
    POEM_STAGE.zoomMax,
  );
  const P = zoom * S;

  // A plate coordinate u maps to screen x = vw/2 + dx + P * (u - 0.5).
  // Solving that for U_EDGE landing on vw gives dx directly.
  const dx = vw / 2 - P * (U_EDGE - 0.5);

  // dyBottom is a hard floor: the plate is cut at his chest, and that cut must
  // never rise above the bottom of the viewport or he ends in mid-air.
  const dyHead =
    vh * (POEM_STAGE.headTopVh - 0.5) + P * (0.5 - SUBJECT_BOX.top);
  const dyBottom = vh / 2 - P / 2;
  const dy = Math.max(dyHead, dyBottom);

  const headTop = vh / 2 + dy + P * (SUBJECT_BOX.top - 0.5);
  const subjLeft = vw / 2 + dx + P * (SUBJECT_BOX.left - 0.5);

  const gap = vw * POEM_STAGE.sideGapVw;
  const besideRight = vw - subjLeft + vw * POEM_STAGE.subjectGutterVw;
  const besideCol = vw - besideRight - gap;

  // Beside him only when he is a full-height figure AND the resulting column
  // is actually wide enough to read Arabic in. RTL makes this mandatory rather
  // than cosmetic: lines start at the right, so if he covered that edge the
  // first word of every line would be behind him.
  const beside =
    headTop <= vh * POEM_STAGE.tallFigureVh &&
    besideCol >= Math.max(POEM_STAGE.minColumnPx, POEM_STAGE.minColumnVw * vw);

  const right = beside ? besideRight : gap;
  const col = vw - right - gap;

  const top = beside ? vh * POEM_STAGE.besideTopVh : vh * POEM_STAGE.aboveTopVh;

  const rawFont = clamp(
    col * (narrow ? POEM_STAGE.fontOfColumnNarrow : POEM_STAGE.fontOfColumn),
    POEM_STAGE.fontMinPx,
    POEM_STAGE.fontMaxPx,
  );

  // Above his head the clear zone is fixed by his anatomy, not by the column,
  // so the column-derived size has to be capped or the window gets clipped.
  let font = rawFont;
  if (!beside) {
    const clearH = headTop - top;
    const fit = clearH / (POEM_STAGE.minVisibleLines * POEM_STAGE.linePitch);
    font = clamp(
      Math.min(rawFont, fit),
      POEM_STAGE.fontMinPx,
      POEM_STAGE.fontMaxPx,
    );
  }

  const pitch = font * POEM_STAGE.linePitch;

  // aboveHead: the box bottom stops one pitch below the top of his head, so a
  // line becomes fully legible exactly as it clears him.
  let bottom = beside
    ? vh * POEM_STAGE.besideBottomVh
    : Math.max(vh * 0.06, vh - headTop - pitch);

  // Last resort. If the two insets together would leave less than the rolling
  // window needs, give the space back from the bottom.
  const minBoxH = POEM_STAGE.minVisibleLines * pitch;
  if (vh - top - bottom < minBoxH) {
    bottom = Math.max(vh * 0.04, vh - top - minBoxH);
  }

  return {
    '--nl-poem-zoom': zoom.toFixed(4),
    '--nl-poem-dx': `${Math.round(dx)}px`,
    '--nl-poem-dy': `${Math.round(dy)}px`,
    '--nl-poem-left': `${Math.round(gap)}px`,
    '--nl-poem-right': `${Math.round(right)}px`,
    '--nl-poem-top': `${Math.round(top)}px`,
    '--nl-poem-bottom': `${Math.round(bottom)}px`,
    '--nl-poem-font': `${font.toFixed(1)}px`,
  };
}

/**
 * CSS custom properties for the poem cinematic mode.
 *
 * Recomputed on resize and orientation change only — it is pure arithmetic on
 * two numbers, so there is nothing to throttle.
 */
export function usePoemStage(active: boolean): PoemStageVars {
  const [vars, setVars] = useState<PoemStageVars>({});

  useEffect(() => {
    if (!active) return undefined;

    const update = () =>
      setVars(compute(window.innerWidth, window.innerHeight));

    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, [active]);

  return vars;
}
