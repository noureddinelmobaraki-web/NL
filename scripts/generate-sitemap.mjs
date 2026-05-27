import fs from 'fs';
import path from 'path';

const DOMAIN = 'https://noureddinelmobaraki-web.github.io/NL';
const TODAY = new Date().toISOString().split('T')[0];

const SONGS_DATA = [
  { id: 1, name: "TRI9 TBAWE9", file: "01.%20TRI9%20TBA...%20-%20Background.webp" },
  { id: 2, name: "VETO", file: "02.%20VETO%20-%20Background.webp" },
  { id: 3, name: "TOTAL", file: "03.%20TOTAL%20-%20Background.webp" },
  { id: 4, name: "7CHAYCHI DIMO9RATI", file: "04.%207CHAYCHI%20DIMO9RATI%20-%20Background.webp" },
  { id: 5, name: "A Lot", file: "05.%20A%20Lot%20-%20Background.webp" },
  { id: 6, name: "BEAUTIFUL", file: "06.%20BEAUTIFUL%20-%20Background.webp" },
  { id: 7, name: "Bouh", file: "07.%20Bouh%20-%20Background.webp" },
  { id: 8, name: "Brain Damage", file: "08.%20Brain%20Damage%20-%20Background.webp" },
  { id: 9, name: "Deal With The Devil", file: "09.%20Deal%20With%20The%20Devil%20-%20Background.webp" },
  { id: 10, name: "Dokhana V2", file: "10.%20Dokhana%20V2%20-%20Background.webp" },
  { id: 11, name: "GOUROU", file: "11.%20GOUROU%20-%20Background.webp" },
  { id: 12, name: "ITCHY W SCRATCHY", file: "12.%20ITCHY%20W%20SCRATCHY%20-%20Background.webp" },
  { id: 13, name: "KOUN NADI", file: "13.%20KOUN%20NADI%20-%20Background.webp" },
  { id: 14, name: "L'AI Could Never", file: "14.%20L%27AI%20Could%20Never%20-%20Background.webp" },
  { id: 15, name: "L'bayda Mon Amour", file: "15.%20L%27bayda%20Mon%20Amour%20-%20Background.webp" },
  { id: 16, name: "Let The Rhythm Hit 'em", file: "16.%20Let%20The%20Rhythm%20Hit%20%27em%20-%20Background.webp" },
  { id: 17, name: "LMORPHINIYA 31", file: "17.%20LMORPHINIYA%2031%20-%20Background.webp" },
  { id: 18, name: "LMORPHINIYA 33", file: "18.%20LMORPHINIYA%2033%20-%20Background.webp" },
  { id: 19, name: "LMORPHINIYA 1013", file: "19.%20LMORPHINIYA%201013%20-%20Background.webp" },
  { id: 20, name: "Lmorphinya 19 V2", file: "20.%20Lmorphinya%2019%20V2%20-%20Background.webp" },
  { id: 21, name: "MAGNETO", file: "21.%20MAGNETO%20-%20Background.webp" },
  { id: 22, name: "None Shall Pass", file: "22.%20None%20Shall%20Pass%20-%20Background.webp" },
  { id: 23, name: "Ohio", file: "23.%20Ohio%20-%20Background.webp" },
  { id: 24, name: "Ostora", file: "24.%20Ostora%20-%20Background.webp" },
  { id: 25, name: "Tromso", file: "25.%20Tromso%20-%20Background.webp" }
];

function generateSitemap() {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">

  <!-- ===========================================================
       SITEMAP - NL | Noureddin El Mobaraki
       https://noureddinelmobaraki-web.github.io/NL/
       Generated: \${TODAY}
       =========================================================== -->

  <!-- === MAIN PAGE ======================================= -->
  <url>
    <loc>${DOMAIN}/</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    <image:image>
      <image:loc>https://noureddinelmobaraki-web.github.io/nl-audio-cdn/header_bg.webp</image:loc>
      <image:title>NL — Noureddin El Mobaraki | Official Artist Website</image:title>
      <image:caption>Artist profile of NL (Noureddin El Mobaraki), independent rap artist from Casablanca, Morocco</image:caption>
    </image:image>
    <image:image>
      <image:loc>https://noureddinelmobaraki-web.github.io/nl-audio-cdn/profile_img.webp</image:loc>
      <image:title>NL — Noureddin El Mobaraki Portrait</image:title>
      <image:caption>Official portrait of NL, Casablanca-based rapper and music producer</image:caption>
    </image:image>
    <image:image>
      <image:loc>https://noureddinelmobaraki-web.github.io/nl-audio-cdn/hero_bg.webp</image:loc>
      <image:title>NL — Hero Background</image:title>
      <image:caption>Visual identity background for NL official website</image:caption>
    </image:image>
    <image:image>
      <image:loc>https://noureddinelmobaraki-web.github.io/nl-audio-cdn/playlist_cover.webp</image:loc>
      <image:title>NL — Spotify Playlist Cover</image:title>
      <image:caption>Official Spotify playlist artwork for NL | Noureddin El Mobaraki</image:caption>
    </image:image>
    <image:image>
      <image:loc>https://noureddinelmobaraki-web.github.io/nl-audio-cdn/yt_highlights.webp</image:loc>
      <image:title>NL — YouTube Highlights</image:title>
      <image:caption>YouTube highlights visual for NL music video catalog</image:caption>
    </image:image>
    <image:image>
      <image:loc>https://noureddinelmobaraki-web.github.io/nl-audio-cdn/photo.webp</image:loc>
      <image:title>NL — Through The Lens Photography</image:title>
      <image:caption>Photography portfolio by Noureddin El Mobaraki</image:caption>
    </image:image>
  </url>

  <!-- === SONG SHARE PAGES ================================== -->
`;

  SONGS_DATA.forEach(song => {
    xml += `
  <url>
    <loc>${DOMAIN}/share/song-${song.id}.html</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
    <image:image>
      <image:loc>https://raw.githubusercontent.com/noureddinelmobaraki/nradio/main/src/assets/images/songs/${song.file}</image:loc>
      <image:title>${song.name} — NL</image:title>
      <image:caption>Listen to ${song.name} by NL on NRADIO</image:caption>
    </image:image>
  </url>
`;
  });

  xml += `\n</urlset>\n`;

  // Write to public/sitemap.xml
  const publicPath = path.resolve(process.cwd(), 'public', 'sitemap.xml');
  fs.writeFileSync(publicPath, xml);
  console.log('✅ Updated public/sitemap.xml successfully');

  // Write to dist/sitemap.xml
  const distDir = path.resolve(process.cwd(), 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  const distPath = path.join(distDir, 'sitemap.xml');
  fs.writeFileSync(distPath, xml);
  console.log('✅ Generated dist/sitemap.xml successfully');
}

generateSitemap();
