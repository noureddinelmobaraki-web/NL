import fs from 'fs';
import path from 'path';
import { resolveBuildDate } from './build-metadata.mjs';
import { assertItemsHaveFields } from './build-data-validation.mjs';
import { DOMAIN } from './build-constants.mjs';

const BUILD_DATE = resolveBuildDate();

// Songs are still read so we can keep songs-jsonld.json in sync.
const songsPath = path.resolve(process.cwd(), 'public', 'data', 'songs.json');
const songs = JSON.parse(fs.readFileSync(songsPath, 'utf8'));
assertItemsHaveFields(songs, ['id', 'title', 'url'], 'public/data/songs.json');

/**
 * SITEMAP POLICY (important for SEO):
 * The site is a single-page app. Every `?s=<id>` / `?v=<id>` deep-link loads
 * the SAME index.html and shares ONE hard canonical (`/NL/`). Listing those
 * query-parameter URLs makes Google report "Alternate page with proper
 * canonical tag" and excludes them. So the sitemap intentionally contains
 * ONLY the canonical home URL.
 */
function generateSitemap() {
  const generatedLine = BUILD_DATE ? `       Source date: ${BUILD_DATE}\n` : '       Deterministic build: source date unavailable; lastmod omitted.\n';
  const lastmodLine = BUILD_DATE ? `    <lastmod>${BUILD_DATE}</lastmod>\n` : '';
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">

  <!-- ===========================================================
       SITEMAP - NL | Noureddin El Mobaraki
       ${DOMAIN}/
${generatedLine}
       Canonical-only sitemap (SPA): single indexable URL.
       =========================================================== -->

  <url>
    <loc>${DOMAIN}/</loc>
${lastmodLine}
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    <image:image>
      <image:loc>https://noureddinelmobaraki-web.github.io/nl-audio-cdn/header_bg.webp</image:loc>
      <image:title>NL — Noureddin El Mobaraki | Official Artist Website</image:title>
      <image:caption>Artist profile of NL, independent rap artist from Casablanca, Morocco</image:caption>
    </image:image>
    <image:image>
      <image:loc>https://noureddinelmobaraki-web.github.io/nl-audio-cdn/profile_img.webp</image:loc>
      <image:title>NL — Noureddin El Mobaraki Portrait</image:title>
    </image:image>
    <image:image>
      <image:loc>https://noureddinelmobaraki-web.github.io/nl-audio-cdn/hero_bg.webp</image:loc>
      <image:title>NL — Hero Background</image:title>
    </image:image>
    <image:image>
      <image:loc>https://noureddinelmobaraki-web.github.io/nl-audio-cdn/playlist_cover.webp</image:loc>
      <image:title>NL — Spotify Playlist Cover</image:title>
    </image:image>
    <image:image>
      <image:loc>https://noureddinelmobaraki-web.github.io/nl-audio-cdn/yt_highlights.webp</image:loc>
      <image:title>NL — YouTube Highlights</image:title>
    </image:image>
    <image:image>
      <image:loc>https://noureddinelmobaraki-web.github.io/nl-audio-cdn/photo.webp</image:loc>
      <image:title>NL — Through The Lens Photography</image:title>
    </image:image>
  </url>

</urlset>
`;

  const publicSitemap = path.resolve(process.cwd(), 'public', 'sitemap.xml');
  fs.writeFileSync(publicSitemap, xml);
  console.log('✅ Generated public/sitemap.xml (canonical-only)');

  const distDir = path.resolve(process.cwd(), 'dist');
  if (fs.existsSync(distDir)) {
    fs.writeFileSync(path.join(distDir, 'sitemap.xml'), xml);
    console.log('✅ Generated dist/sitemap.xml');
  }
}

function generateSongsJsonLd() {
  const ldData = {
    '@context': 'https://schema.org',
    '@graph': songs.map((song) => ({
      '@type': 'MusicRecording',
      name: song.title,
      byArtist: { '@type': 'MusicGroup', name: 'NL' },
      duration: 'PT3M00S',
      inAlbum: { '@type': 'MusicAlbum', name: 'NL Singles' },
      url: `${DOMAIN}/#song-${song.id}`,
      audio: song.url,
    })),
  };

  const jsonString = JSON.stringify(ldData, null, 2);

  const publicJsonLd = path.resolve(process.cwd(), 'public', 'songs-jsonld.json');
  fs.writeFileSync(publicJsonLd, jsonString);
  console.log(`✅ Updated public/songs-jsonld.json (${songs.length} songs)`);

  const distDir = path.resolve(process.cwd(), 'dist');
  if (fs.existsSync(distDir)) {
    fs.writeFileSync(path.join(distDir, 'songs-jsonld.json'), jsonString);
    console.log('✅ Generated dist/songs-jsonld.json');
  }
}

generateSitemap();
generateSongsJsonLd();
