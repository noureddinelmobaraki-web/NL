/**
 * Portrait page — single source of truth for every tunable value.
 *
 * Every geometric value is NORMALISED (0..1) against the square stage.
 * Because the stage is locked to the images' native 1:1 aspect ratio,
 * these fractions stay pixel-accurate at every viewport size.
 *
 * Coordinates were measured directly from the 2048x2048 source plates.
 * See section 1 of the task document before changing any of them.
 */

const CDN = 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn';

/**
 * NOTE: these filenames contain literal spaces on the CDN.
 * They MUST stay percent-encoded here. A raw space breaks both the
 * fetch and `scripts/verify-build.mjs`, which extracts URLs from source.
 */
export const PORTRAIT_ASSETS = {
  background: `${CDN}/just%20Bg.jpeg`,
  subject: `${CDN}/me%20no%20bg.png`,
  ambience: `${CDN}/MESROUR%20SALAH%20EDDINE%20BG.webm`,
  video: `${CDN}/MO_web.mp4`,
  poemTrack: `${CDN}/metxtbg.m4a`,
} as const;

/** Native size of both plates. Used only for the dev-mode assertion. */
export const PORTRAIT_SOURCE_SIZE = { width: 2048, height: 2048 } as const;

/** Subject alpha bounding box, normalised. */
export const SUBJECT_BOX = {
  left: 0.34375,
  top: 0.05176,
  right: 1.0,
  bottom: 1.0,
} as const;

/**
 * Alpha-weighted centroid of the subject — the orbit centre.
 * Deliberately NOT the bbox centre (0.67163, 0.52563): the centroid
 * tracks the visual mass of the torso and head, so the video orbits
 * around the person rather than around empty frame.
 */
export const SUBJECT_CENTER = { x: 0.63805, y: 0.59705 } as const;

/**
 * Lamp shade bounding box, normalised. Measured at luminance < 75.
 * Verified 0.00% occluded by the subject at every point.
 */
export const LAMP_HOTSPOT = {
  left: 0.2388,
  top: 0.5566,
  right: 0.374,
  bottom: 0.6831,
} as const;

/** CSS defines 1cm as exactly 96/2.54 px. Not a measurement — a constant. */
export const CSS_PX_PER_CM = 96 / 2.54; // 37.795…

export type ErasePointerConfig = {
  /** Brush radius in real centimetres on the user's screen. */
  radiusCm: number;
  /** 0..1. Fraction of the brush that is a feathered edge rather than solid. */
  softness: number;
  /** How long a stamp lives, ms. Short = the image snaps back. */
  trailMs: number;
  /** Mask blur as a fraction of the mask canvas edge. Diffuses the cut. */
  maskBlur: number;
  /** Outer radius multiplier. The band between 1 and this is the smear. */
  wideRadiusFactor: number;
  /** Pre-blur of the subject copy, as a fraction of the plate width. */
  distortionBlur: number;
  /** Mask resolution relative to the visible canvas. */
  maskScale: number;
  maxDpr: number;
  maxCanvasPx: number;
  maxStrokes: number;
  maxStepsPerMove: number;
  cssPxPerCm: number;
};

/** Mouse / trackpad. */
export const ERASE_POINTER: ErasePointerConfig = {
  radiusCm: 1.5,
  softness: 0.78,
  trailMs: 420,
  maskBlur: 0.012,
  wideRadiusFactor: 1.55,
  distortionBlur: 0.014,
  maskScale: 0.5,
  maxDpr: 2,
  maxCanvasPx: 1400,
  maxStrokes: 240,
  maxStepsPerMove: 24,
  cssPxPerCm: CSS_PX_PER_CM,
};

/** Touch. Smaller brush, smaller buffers. */
export const ERASE_TOUCH: ErasePointerConfig = {
  ...ERASE_POINTER,
  radiusCm: 1.0,
  softness: 0.74,
  trailMs: 380,
  maskScale: 0.5,
  maxDpr: 1.5,
  maxCanvasPx: 1000,
  maxStrokes: 160,
};

export type OrbitConfig = {
  /** Video width as a fraction of the stage, at rest. */
  restWidthPct: number;
  /** Rest centre in stage-relative coordinates. */
  restCenter: { x: number; y: number };
  /** Subject scale while the video is out. */
  subjectShrink: number;
  /** Video scale while orbiting. */
  orbitScale: number;
  /** Ring radius as a fraction of the stage. */
  orbitRadiusPct: number;
  orbitTurns: number;
  orbitMsPerTurn: number;
  /** Where on the ring the orbit begins. 0 = nearest the camera. */
  startAngleDeg: number;
  /**
   * Peak self-rotation, degrees. Keep below 90: at 90 the element is edge-on
   * and disappears. 62 keeps at least cos(62) = 47% of its width visible.
   */
  maxFaceTurnDeg: number;
  /** Tilt of the orbital plane. Negative tips the far side upward. */
  orbitTiltDeg: number;
  /** Perspective distance in px. Lower = stronger depth. */
  perspectivePx: number;
  enterMs: number;
  exitMs: number;
};

export const ORBIT_POINTER: OrbitConfig = {
  restWidthPct: 0.42,
  restCenter: { x: 0.34, y: 0.5 },
  subjectShrink: 0.9,
  orbitScale: 0.62,
  orbitRadiusPct: 0.3,
  orbitTurns: 2,
  orbitMsPerTurn: 4000,
  startAngleDeg: -40,
  maxFaceTurnDeg: 62,
  orbitTiltDeg: -16,
  perspectivePx: 1200,
  enterMs: 420,
  exitMs: 520,
};

export const ORBIT_TOUCH: OrbitConfig = {
  ...ORBIT_POINTER,
  restWidthPct: 0.56,
  subjectShrink: 0.86,
  orbitScale: 0.55,
  orbitRadiusPct: 0.27,
  perspectivePx: 900, // shorter throw reads better on a small screen
};

/**
 * Coarse-pointer test. Not a width breakpoint: a 1024px tablet needs the
 * touch brush, and a 700px desktop window does not.
 */
export function isCoarsePointer(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

/** audioManager channel id and the bg-suppression reason string. */
export const PORTRAIT_AUDIO_SOURCE = 'portrait' as const;
export const PORTRAIT_POEM_SOURCE = 'poem' as const;
export const PORTRAIT_BG_REASON = 'portrait_mode';
export const PORTRAIT_AMBIENCE_VOLUME = 0.55;
export const PORTRAIT_DUCK_MS = 260;

/**
 * Poem cinematic mode. Active only while the poem toggle is on; the normal
 * portrait layout and its 1:1 layer lock are untouched.
 */
export const POEM_STAGE = {
  /**
   * How much of him stays on screen, as a fraction of his bounding box.
   * 0.5 puts the centre of his silhouette exactly on the right edge, which is
   * the "looking in from the side of the screen" framing that was asked for.
   * Raise it toward 0.6 to slide him further left and reveal more of him;
   * lower it toward 0.4 to push him further off the edge. This single number
   * moves him and resizes the poem column together, so nothing else needs
   * touching.
   */
  visibleFraction: 0.5,

  /** Visible part of him as a fraction of viewport width, narrow screens. */
  personWidthVwNarrow: 0.44,
  /** Same, for screens wide enough to put the poem beside him. */
  personWidthVwWide: 0.30,
  /** Below this width the poem uses the full width above his head. */
  wideBreakpointPx: 700,

  zoomMin: 1.0,
  zoomMax: 2.2,

  /** Preferred top of his head, as a fraction of viewport height. */
  headTopVh: 0.10,
  /** At or above this head position he counts as a full-height figure. */
  tallFigureVh: 0.28,

  /** Outer margin of the poem column, fraction of viewport width. */
  sideGapVw: 0.045,
  /**
   * Breathing room between the column and his silhouette. At 0.02 a 1638 px
   * screen left only 32 px between the last glyph and his shoulder, which
   * reads as a collision.
   */
  subjectGutterVw: 0.035,

  /** "beside" is only used if the column clears both of these. */
  minColumnPx: 320,
  minColumnVw: 0.5,

  /** Top and bottom insets of the column when the poem sits beside him. */
  besideTopVh: 0.10,
  /**
   * 0.07 glued the newest line to the very bottom edge of the screen. Lifting
   * it puts the rolling window where it sits on the phone, which is the
   * placement that was approved.
   */
  besideBottomVh: 0.14,
  /** Top inset when the poem sits above his head. */
  aboveTopVh: 0.05,

  /** Font size as a fraction of the column width, then clamped. */
  fontOfColumn: 0.062,
  /**
   * Narrow screens get a larger share of a much narrower column. 0.062 of a
   * 355 px column is 22 px, which is what the phone screenshots show and what
   * was reported as too small.
   */
  fontOfColumnNarrow: 0.085,
  fontMinPx: 18,
  fontMaxPx: 58,

  /** CSS line-height on .nl-poem__line. Kept only so the two cannot drift. */
  lineHeight: 1.62,
  /**
   * Real distance between consecutive lines: line-height plus the 0.42em
   * bottom margin on .nl-poem__line. Use this for every geometry calculation;
   * lineHeight alone undercounts the stack by 26%.
   */
  linePitch: 2.04,
  /**
   * The rolling window only ever shows four lines at full opacity, so the
   * readable zone must hold at least this many pitches or lines are clipped
   * before they can be read.
   */
  minVisibleLines: 4.2,
  /** Duration of the push-in and the return. */
  transitionMs: 900,
} as const;

/**
 * First-visit affordance arrows.
 *
 * Anchors are normalised stage coordinates, identical in meaning to
 * LAMP_HOTSPOT and SUBJECT_BOX: the stage is locked to the plates' 1:1 aspect,
 * so a percentage is pixel-accurate at every viewport size.
 */
export const PORTRAIT_HINTS = {
  /**
   * Own localStorage key, deliberately NOT a new field on 'nl-prefs-v1'.
   * loadPrefs() merges DEFAULTS into whatever it reads, and userPrefs.test.ts
   * asserts on that shape; widening the shared interface for a portrait-only
   * flag would put an unrelated unit test at risk for no benefit.
   */
  storageKey: 'nl-portrait-hints-v1',
  /** Bump to re-show the hints to everyone after a UX change. */
  storageVersion: 1,

  /** How long they stay before fading on their own. */
  visibleMs: 3000,
  /** Fade-out duration. Must match --nl-hint-fade in portrait.css. */
  fadeMs: 320,

  /** Set false to show bare arrows with no words. */
  showLabels: true,
  lampLabel: 'اضغط المصباح',
  toggleLabel: 'القصيدة',
  subjectLabel: 'مرّر للمسح',

  /**
   * Head anchor. PERSON_HEAD_CX is 0.55737 and SUBJECT_BOX.top is 0.05176,
   * so y = 0.14 lands on his head rather than above it.
   */
  subject: { x: 0.5574, y: 0.14 },

  /**
   * Drop of the toggle arrow below the switch, in px. The switch box is 40px
   * tall and scales from its top-left corner, so the visual bottom edge is at
   * 40 * scale: 40px on desktop, 31.2px at --nl-toggle-scale 0.78.
   */
  toggleDropPx: 50,
  toggleDropNarrowPx: 40,
} as const;

/**
 * Warm-up of the two on-demand portrait assets, so the second visit — and the
 * first press of the poem switch — start instantly.
 *
 * Deliberately NOT done in the service worker's activate handler: activate runs
 * during whatever page load happens to register the worker, including the home
 * page that Lighthouse CI audits. Pulling media there competes with LCP for
 * bandwidth. Warming belongs on the portrait page, where the user has already
 * committed to this content.
 */
export const PORTRAIT_PREWARM = {
  /** Wait this long after mount so the ambience download is not starved. */
  delayMs: 2500,
  /** The poem track is small and is needed the moment the switch is flipped. */
  poemTrack: true,
  /**
   * The orbit video is several MB and many visitors never press the lamp.
   * Opt in only if you want it warmed unconditionally.
   */
  video: false,
} as const;


