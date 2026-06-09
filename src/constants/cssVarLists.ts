/**
 * cssVarLists.ts
 *
 * Centralised lists of CSS custom properties that each section depends on.
 * Used exclusively by the dev-only `useDevCSSVarCheck` utility.
 *
 * Keeping these at module scope (a) reduces noise inside the section files,
 * and (b) lets them be tree-shaken in production since `useDevCSSVarCheck`
 * no-ops when `import.meta.env.DEV === false`.
 */

export const REQUIRED_HERO_VARS = [
  '--window-chrome-display',
  '--window-border',
  '--window-shadow',
  '--window-bg',
  '--hero-header-align',
  '--hero-card-bg',
  '--hero-card-border',
  '--hero-card-shadow',
  '--hero-bg-image-url',
  '--hero-bg-filter',
  '--hero-bg-opacity',
  '--hero-bg-blend',
  '--hero-overlay-bg',
  '--hero-title-font',
  '--hero-title-weight',
  '--hero-title-color',
  '--hero-title-size',
  '--hero-title-shadow',
  '--hero-title-style',
  '--hero-title-lines',
  '--hero-title-transform',
  '--hero-divider-top',
  '--hero-divider-style',
  '--hero-loc-font',
  '--hero-loc-size',
  '--hero-loc-weight',
  '--hero-loc-shadow',
  '--hero-loc-prefix',
  '--hero-loc-suffix',
  '--hero-alias-bg',
  '--hero-alias-border',
  '--hero-alias-color',
  '--hero-alias-size',
  '--hero-alias-tracking',
  '--hero-alias-transform',
  '--hero-alias-font',
  '--hero-alias-deco',
  '--hero-alias-padding',
  '--hero-bio-font',
  '--hero-bio-size',
  '--hero-bio-shadow',
  '--hero-bio-filter',
  '--hero-bio-style',
  '--hero-profile-width',
  '--hero-profile-border',
  '--hero-profile-shadow',
  '--hero-profile-transform',
  '--hero-profile-hover-transform',
  '--hero-profile-display',
] as const;

export const REQUIRED_STREAMING_VARS = [
  '--streaming-titlebar-display',
  '--streaming-h2-display',
  '--streaming-divider-display',
  '--social-titlebar-display',
  '--social-h2-display',
  '--stream-card-border',
  '--stream-card-shadow',
  '--stream-card-bg',
  '--stream-card-flex-dir',
  '--stream-mini-titlebar-display',
  '--stream-content-dark-display',
  '--stream-content-light-display',
  '--stream-content-default-display',
  '--social-content-dark-display',
  '--social-content-light-display',
  '--social-content-default-display',
  '--social-card-rotate',
  '--social-card-radius',
  '--social-card-shadow',
] as const;

export const REQUIRED_HIGHLIGHTS_VARS = [
  '--yt-highlights-bg',
  '--vault-playlist-bg',
  '--highlights-vault-radius',
  '--highlights-yt-radius',
] as const;
