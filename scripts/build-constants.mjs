// scripts/build-constants.mjs
// Single source of truth for the site's canonical origin, base path, and
// identity strings, shared across build-time generators so their URLs can
// never drift apart. Pure constants, no dependencies.

export const ORIGIN = 'https://noureddinelmobaraki-web.github.io';
export const BASE = '/NL';
export const DOMAIN = ORIGIN + BASE;
export const ARTIST = 'Noureddin El Mobaraki';
export const CDN = ORIGIN + '/nl-audio-cdn/';
export const PLAYLIST_COVER = CDN + 'playlist_cover.webp';
