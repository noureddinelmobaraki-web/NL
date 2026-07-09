// src/config/socialIcons.ts
// Custom 250x250 brand icons for the Home streaming/social lattice windows.
// Keyed by the SAME ids used in src/config/streaming.ts so the map stays in sync.
const ICON_BASE =
  'https://raw.githubusercontent.com/noureddinelmobaraki-web/nl-audio-cdn/main/streaming.socia.licons';

export const SOCIAL_ICON_URLS: Record<string, string> = {
  spotify: `${ICON_BASE}/spotify.webp`,
  apple: `${ICON_BASE}/apple%20music.ico`,
  deezer: `${ICON_BASE}/dezzer.ico`,
  amazon: `${ICON_BASE}/amazon%20music.webp`,
  anghami: `${ICON_BASE}/anghami.webp`,
  soundcloud: `${ICON_BASE}/soundcloud.webp`,
  instagram: `${ICON_BASE}/instagram.webp`,
  tiktok: `${ICON_BASE}/toktok.webp`,
  facebook: `${ICON_BASE}/facebook.webp`,
};
