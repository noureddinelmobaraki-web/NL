// src/config/socialIcons.ts
// Custom 250x250 brand icons for the Home streaming/social lattice windows.
// Keyed by the SAME ids used in src/config/streaming.ts so the map stays in sync.
const ICON_BASE =
  'https://raw.githubusercontent.com/noureddinelmobaraki-web/nl-audio-cdn/main/optimized/streaming.socia.licons';

// Inline 250x250 tiles for platforms with no uploaded brand file yet.
// Permitted by the page CSP in index.html: img-src 'self' data: blob: https:
// Geometry only, no <text>, so the mark never depends on an installed font.
const svgTile = (svg: string): string =>
  'data:image/svg+xml,' + encodeURIComponent(svg);

const QOBUZ_TILE = svgTile(
  '<svg xmlns="http://www.w3.org/2000/svg" width="250" height="250" viewBox="0 0 250 250">' +
    '<rect width="250" height="250" rx="56" fill="#0A0A0C"/>' +
    '<rect x="7" y="7" width="236" height="236" rx="50" fill="none" stroke="#FFFFFF" stroke-opacity="0.16" stroke-width="3"/>' +
    '<circle cx="116" cy="112" r="49" fill="none" stroke="#FFFFFF" stroke-width="22"/>' +
    '<rect x="154" y="112" width="22" height="86" rx="11" fill="#FFFFFF"/>' +
    '</svg>',
);

const LINKTREE_TILE = svgTile(
  '<svg xmlns="http://www.w3.org/2000/svg" width="250" height="250" viewBox="0 0 250 250">' +
    '<rect width="250" height="250" rx="56" fill="#43E660"/>' +
    '<g stroke="#FFFFFF" stroke-width="16" stroke-linecap="round" fill="none">' +
    '<path d="M125 104 L125 196"/>' +
    '<path d="M74 62 L125 104"/>' +
    '<path d="M176 62 L125 104"/>' +
    '<path d="M84 150 L166 150"/>' +
    '</g>' +
    '</svg>',
);

export const SOCIAL_ICON_URLS: Record<string, string> = {
  spotify: `${ICON_BASE}/spotify.webp`,
  apple: `${ICON_BASE}/apple%20music.ico`,
  apple_nordine: `${ICON_BASE}/apple%20music.ico`,
  deezer: `${ICON_BASE}/dezzer.ico`,
  deezer_nordine: `${ICON_BASE}/dezzer.ico`,
  amazon: `${ICON_BASE}/amazon%20music.webp`,
  anghami: `${ICON_BASE}/anghami.webp`,
  anghami_nordine: `${ICON_BASE}/anghami.webp`,
  qobuz: QOBUZ_TILE,
  soundcloud: `${ICON_BASE}/soundcloud.webp`,
  instagram: `${ICON_BASE}/instagram.webp`,
  tiktok: `${ICON_BASE}/toktok.webp`,
  facebook: `${ICON_BASE}/facebook.webp`,
  linktree: LINKTREE_TILE,
};

