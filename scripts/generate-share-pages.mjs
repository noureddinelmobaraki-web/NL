import fs from 'fs';
import path from 'path';

function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const songsJsonPath = path.resolve('public/data/nl-music-fv.json');
const distPath = path.resolve('dist');
const sharePagesDir = path.join(distPath, 's');

console.log('📢 Starting generation of static share pages for NL Music...');

if (!fs.existsSync(distPath)) {
  console.log('⚠️ dist/ directory does not exist yet. Skipping share pages generation.');
  process.exit(0);
}

if (!fs.existsSync(songsJsonPath)) {
  console.error(`❌ Songs data file not found at ${songsJsonPath}!`);
  process.exit(1);
}

try {
  const songsData = JSON.parse(fs.readFileSync(songsJsonPath, 'utf8'));
  
  if (!fs.existsSync(sharePagesDir)) {
    fs.mkdirSync(sharePagesDir, { recursive: true });
  }

  const fallbackCover = 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/playlist_cover.webp';

  for (const song of songsData) {
    const id = song.id;
    if (id === undefined || id === null) continue;

    const title = song.title || 'أغنية غير معروفة';
    const artist = song.artist || 'فنان غير معروف';
    const coverUrl = song.coverUrl || fallbackCover;

    const escapedTitle = escapeHtml(title);
    const escapedArtist = escapeHtml(artist);

    const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${escapedTitle} — ${escapedArtist}</title>
  <meta name="robots" content="noindex">
  
  <!-- Open Graph -->
  <meta property="og:type" content="music.song">
  <meta property="og:title" content="${escapedTitle} — ${escapedArtist}">
  <meta property="og:description" content="استمع إلى ${escapedTitle} على NL Music">
  <meta property="og:image" content="${coverUrl}">
  <meta property="og:url" content="https://noureddinelmobaraki-web.github.io/NL/s/${id}.html">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapedTitle} — ${escapedArtist}">
  <meta name="twitter:description" content="استمع إلى ${escapedTitle} على NL Music">
  <meta name="twitter:image" content="${coverUrl}">
  
  <!-- Redirect -->
  <meta http-equiv="refresh" content="0; url=/NL/?song=fv-${id}">
  <script>location.replace('/NL/?song=fv-' + ${id})</script>
</head>
<body style="font-family: sans-serif; text-align: center; padding: 50px; background-color: #0d1117; color: #c9d1d9;">
  <p>جاري تحويلك إلى NL Music... إذا لم يتم تحويلك تلقائياً، <a href="/NL/?song=fv-${id}" style="color: #58a6ff; text-decoration: none;">افتح NL Music</a>.</p>
</body>
</html>`;

    fs.writeFileSync(path.join(sharePagesDir, `${id}.html`), htmlContent, 'utf8');
  }

  console.log(`✅ Generated ${songsData.length} static share pages in dist/s/.`);
} catch (error) {
  console.error('❌ Error generating share pages:', error);
  process.exit(1);
}
