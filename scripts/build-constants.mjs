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
export const ARTIST_ALIASES = [
  'Nordine GB', 'NORDINE GB', 'Nourdine GB', 'NL', 'NL MUSIC', 'NL GB',
  'Noureddin El Mobaraki', 'Noureddine El Mobaraki', 'Noureddine El Moubaraki',
  'Nourdine El Mobaraki', 'Nordine El Mobaraki',
  'Nordine Lmbarki', 'Nordine Lembarki', 'Nordine Mbarki', 'Noureddine Mbarki',
];
export const ARTIST_SAMEAS = [
  "https://open.spotify.com/artist/5nwGOyilF1p4uv35v6vb2u",
  "https://music.apple.com/us/artist/nl/1535833912",
  "https://music.apple.com/us/artist/nordine-gb/1840766925",
  "https://www.deezer.com/en/artist/362375722",
  "https://www.deezer.com/en/artist/346653281",
  "https://play.anghami.com/artist/1430009",
  "https://play.anghami.com/artist/25733968",
  "https://www.qobuz.com/us-en/label/noureddin-el-mobaraki/download-streaming-albums/9928225",
  "https://music.amazon.fr/artists/B0025ODH90/nl",
  "https://on.soundcloud.com/Ok8zBgOjCPqjvStEA",
  "https://www.youtube.com/@nourdin_el_mobaraki",
  "https://www.instagram.com/nordine_el_mobaraki",
  "https://www.tiktok.com/@nourdine_el_mobaraki",
  "https://www.facebook.com/profile.php?id=61558584390374",
  "https://linktr.ee/URL_NL"
];
