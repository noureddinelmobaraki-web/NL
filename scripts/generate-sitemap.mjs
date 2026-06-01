import fs from 'fs';
import path from 'path';

const DOMAIN = 'https://noureddinelmobaraki-web.github.io/NL';
const TODAY = new Date().toISOString().split('T')[0];

// قراءة الأغاني والفيديوهات ديناميكياً من ملفات JSON
const songsPath = path.resolve(process.cwd(), 'public', 'data', 'songs.json');
const videosPath = path.resolve(process.cwd(), 'public', 'data', 'videos.json');

const songs = JSON.parse(fs.readFileSync(songsPath, 'utf8'));
const videos = fs.existsSync(videosPath)
  ? JSON.parse(fs.readFileSync(videosPath, 'utf8'))
  : [];

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateSitemap() {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">

  <!-- ===========================================================
       SITEMAP - NL | Noureddin El Mobaraki
       ${DOMAIN}/
       Generated: ${TODAY}
       Total songs: ${songs.length} | Total videos: ${videos.length}
       =========================================================== -->

  <!-- === MAIN PAGE ============================================ -->
  <url>
    <loc>${DOMAIN}/</loc>
    <lastmod>${TODAY}</lastmod>
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

  <!-- === SONG ANCHORS (deep-links into SPA) =================== -->
`;

  // كل أغنية تحصل على URL بـ query parameter ?s=ID 
  // (الموقع SPA، الـ App.tsx يقرأ ?s= ويفتح الأغنية المناسبة)
  for (const song of songs) {
    xml += `  <url>
    <loc>${DOMAIN}/?s=${song.id}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;
  }

  xml += `\n  <!-- === END =============================================== -->\n</urlset>\n`;

  // اكتب إلى public/sitemap.xml
  fs.writeFileSync(songsPath.replace(/data\/songs\.json$/, 'sitemap.xml').replace(/\\/g, '/'), xml);
  const publicSitemap = path.resolve(process.cwd(), 'public', 'sitemap.xml');
  fs.writeFileSync(publicSitemap, xml);
  console.log(`✅ Updated public/sitemap.xml (${songs.length} songs)`);

  // اكتب أيضاً إلى dist/sitemap.xml (يُستدعى بعد vite build)
  const distDir = path.resolve(process.cwd(), 'dist');
  if (fs.existsSync(distDir)) {
    const distPath = path.join(distDir, 'sitemap.xml');
    fs.writeFileSync(distPath, xml);
    console.log(`✅ Generated dist/sitemap.xml`);
  }
}

generateSitemap();
