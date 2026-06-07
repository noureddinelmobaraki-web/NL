// src/components/MusicMood/constants.ts

/** القيم الزمنية (بالـ milliseconds) */
export const TIMING = {
  THROTTLE_TIME_UPDATE: 100,
  PICK_RANDOM_DELAY: 200,
  DICE_SPIN_DURATION: 600,
  AUDIO_FADE: 150,
} as const;

/** قيم الـ Audio */
export const AUDIO = {
  DEFAULT_VOLUME: 0.7,
  CROSS_ORIGIN: 'anonymous' as const,
} as const;

/** قيم Glow الخلفي */
export const GLOW = {
  RADIUS_BASE: 30,
  RADIUS_MULTIPLIER: 40,
  OPACITY_BASE: 0.04,
  OPACITY_MULTIPLIER: 0.06,
} as const;

/** Z-index hierarchy للـ overlays */
export const Z_INDEX = {
  OVERLAY: 2147483646,
  CLOSE_BUTTON: 2147483647,
  CONTENT: 1,
  TAP_TO_PLAY: 10,
} as const;
