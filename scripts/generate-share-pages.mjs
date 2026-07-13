import fs from 'fs';
import path from 'path';
import { assertArray } from './build-data-validation.mjs';
import { DOMAIN, BASE, PLAYLIST_COVER } from './build-constants.mjs';

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

console.log('📢 Generating static share pages for NL Music (clean + legacy)...');

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
  assertArray(songsData, 'public/data/nl-music-fv.json');

  // Remove stale share pages from a previous build before regenerating so that
  // songs deleted from the data source do not leave orphaned s/<id>/ folders.
  // On a fresh dist/ (clean CI build) this is a harmless no-op.
  fs.rmSync(sharePagesDir, { recursive: true, force: true });
  fs.mkdirSync(sharePagesDir, { recursive: true });

  const fallbackCover = PLAYLIST_COVER;
  let count = 0;

  for (const song of songsData) {
    const id = song.id;
    if (id === undefined || id === null) continue;
    const sid = String(id);

    const title = song.title || 'أغنية غير معروفة';
    const artist = song.artist || 'فنان غير معروف';
    const coverUrl = song.coverUrl || fallbackCover;

    const escapedTitle = escapeHtml(title);
    const escapedArtist = escapeHtml(artist);

    // الرابط النظيف (المجلّد) هو canonical للمشاركة
    const cleanUrl = DOMAIN + '/s/' + sid + '/';
    const target = BASE + '/?song=fv-' + sid;

    const htmlContent =
'<!DOCTYPE html>\n' +
'<html lang="ar" dir="rtl">\n' +
'<head>\n' +
'  <meta charset="UTF-8">\n' +
'  <title>' + escapedTitle + ' — ' + escapedArtist + '</title>\n' +
'  <meta name="robots" content="noindex">\n' +
'  <!-- Open Graph -->\n' +
'  <meta property="og:type" content="music.song">\n' +
'  <meta property="og:title" content="' + escapedTitle + ' — ' + escapedArtist + '">\n' +
'  <meta property="og:description" content="استمع إلى ' + escapedTitle + ' على NL Music">\n' +
'  <meta property="og:image" content="' + coverUrl + '">\n' +
'  <meta property="og:url" content="' + cleanUrl + '">\n' +
'  <!-- Twitter Card -->\n' +
'  <meta name="twitter:card" content="summary_large_image">\n' +
'  <meta name="twitter:title" content="' + escapedTitle + ' — ' + escapedArtist + '">\n' +
'  <meta name="twitter:description" content="استمع إلى ' + escapedTitle + ' على NL Music">\n' +
'  <meta name="twitter:image" content="' + coverUrl + '">\n' +
'  <!-- Redirect (الزواحف تتجاهلها وتقرأ og:*) -->\n' +
'  <meta http-equiv="refresh" content="0; url=' + target + '">\n' +
'  <script>location.replace(' + JSON.stringify(target) + ')</script>\n' +
'</head>\n' +
'<body style="font-family: sans-serif; text-align: center; padding: 50px; background-color: #0d1117; color: #c9d1d9;">\n' +
'  <p>جارٍ تحويلك إلى NL Music… إذا لم يتم تحويلك تلقائيًا، <a href="' + target + '" style="color: #58a6ff; text-decoration: none;">افتح NL Music</a>.</p>\n' +
'</body>\n' +
'</html>\n';

    // 1) الرابط النظيف الجديد: s/<id>/index.html
    const cleanDir = path.join(sharePagesDir, sid);
    fs.mkdirSync(cleanDir, { recursive: true });
    fs.writeFileSync(path.join(cleanDir, 'index.html'), htmlContent, 'utf8');

    // 2) توافق خلفي: s/<id>.html (الروابط المنشورة سابقًا تبقى تعمل)
    fs.writeFileSync(path.join(sharePagesDir, sid + '.html'), htmlContent, 'utf8');

    count++;
  }

  console.log('✅ Generated ' + count + ' share pages (clean folder + legacy .html).');
} catch (error) {
  console.error('❌ Error generating share pages:', error);
  process.exit(1);
}
