/** Timings for the cinematic loading screen, in milliseconds. */
export const LOADING_TIMINGS = {
  /** Duration of the exit zoom-in animation */
  zoomOut: 900,
  /** When the "skip to enter" disclaimer fades in */
  disclaimerDelay: 3800,
  /** Default loading screen lifetime for first-time visitors */
  default: 4500,
  /** Loading screen lifetime for returning visitors */
  returning: 1500,
  /** Loading screen lifetime when fallback static poster is used */
  staticFallback: 1000,
  /** Loading screen lifetime in automated/headless environments */
  automated: 0,
} as const;
