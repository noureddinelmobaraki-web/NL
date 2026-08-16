// scripts/seo-generate.mjs
// Build-time SSG + sitemap + search-index generator for NL.
// Pure Node (no extra deps). Reads public/data/*.json and public/lrc/*.
// Writes into dist/ (SEO_OUT_DIR overrides) and mirrors sitemap + search-index into public/.
import fs from 'fs';
import path from 'path';
import { resolveBuildDate } from './build-metadata.mjs';
import { assertItemsHaveFields, assertArray, assertObject } from './build-data-validation.mjs';
import { ORIGIN, BASE, DOMAIN, ARTIST, ARTIST_ALIASES, ARTIST_SAMEAS } from './build-constants.mjs';

const BUILD_DATE = resolveBuildDate();
const CWD = process.cwd();
const OUT = process.env.SEO_OUT_DIR ? path.resolve(process.env.SEO_OUT_DIR) : path.resolve(CWD, 'dist');
const PUB = path.resolve(CWD, 'public');
const DATA = path.join(PUB, 'data');
const LRC = path.join(PUB, 'lrc');

const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
const yt = (id, size) => 'https://i.ytimg.com/vi/' + id + '/' + size + '.jpg';

function slugify(str, fallback) {
  const s = String(str || '').toLowerCase()
    .replace(/[\u2019'"]/g, '')
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
  return s || fallback;
}

function lyricSnippet(lrcFile, maxLines = 5) {
  if (!lrcFile) return '';
  const p = path.join(LRC, lrcFile);
  if (!fs.existsSync(p)) return '';
  const raw = fs.readFileSync(p, 'utf8');
  const lines = raw.split(/\r?\n/)
    .map((l) => l.replace(/\[[0-9:.]+\]/g, '').replace(/<[^>]+>/g, '').trim())
    .filter((l) => l && !/^\d+$/.test(l) && !/-->/.test(l) && !/^WEBVTT/i.test(l));
  return lines.slice(0, maxLines).join(' / ');
}

const ensureDir = (d) => fs.mkdirSync(d, { recursive: true });
function write(rel, content) { const f = path.join(OUT, rel); ensureDir(path.dirname(f)); fs.writeFileSync(f, content, 'utf8'); }

// ---------- load data ----------
const songs = read(path.join(DATA, 'songs.json'));
const ytMap = fs.existsSync(path.join(DATA, 'song-youtube.json')) ? read(path.join(DATA, 'song-youtube.json')) : {};
const fv = read(path.join(DATA, 'nl-music-fv.json'));
const videos = read(path.join(DATA, 'videos.json'));
const gamesDoc = read(path.join(DATA, 'games.json'));
const games = Array.isArray(gamesDoc) ? gamesDoc : (gamesDoc.games || []);

// Fail fast with a clear message if any build-data file has an unexpected shape.
assertItemsHaveFields(songs, ['id', 'title'], 'public/data/songs.json');
assertObject(ytMap, 'public/data/song-youtube.json');
assertArray(fv, 'public/data/nl-music-fv.json');
assertArray(videos, 'public/data/videos.json');
assertArray(games, 'public/data/games.json (.games)');

// ---------- per-song static pages ----------
const usedSlugs = new Set();
const songUrls = [];
for (const s of songs) {
  let slug = slugify(s.title, 'song-' + s.id);
  if (usedSlugs.has(slug)) slug = slug + '-' + s.id;
  usedSlugs.add(slug);
  const pageUrl = DOMAIN + '/song/' + slug + '/';
  const deepLink = BASE + '/?song=' + s.id;
  const ytid = ytMap[String(s.id)];
  const cover = ytid ? yt(ytid, 'hqdefault') : ORIGIN + '/nl-audio-cdn/playlist_cover.webp';
  const snippet = lyricSnippet(s.lrcFile, 5);
  const desc = 'استمع إلى «' + s.title + '» للفنان ' + ARTIST + ' (NL) — راب/هيب هوب من الدار البيضاء.' + (snippet ? ' مقطع من الكلمات: ' + snippet : '');
  const ld = {
    '@context': 'https://schema.org', '@type': 'MusicRecording',
    name: s.title,
    byArtist: { '@type': 'MusicGroup', name: 'NL', '@id': DOMAIN + '/#musicgroup', alternateName: ARTIST_ALIASES },
    inLanguage: 'ar', url: pageUrl, image: cover,
    ...(ytid ? { sameAs: 'https://www.youtube.com/watch?v=' + ytid } : {}),
    potentialAction: { '@type': 'ListenAction', target: DOMAIN + '/?song=' + s.id },
  };
  const html = '<!DOCTYPE html>\n<html lang="ar" dir="rtl">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>' + esc(s.title) + ' — ' + esc(ARTIST) + ' (NL)</title>\n<meta name="description" content="' + esc(desc) + '">\n<meta name="robots" content="index, follow, max-image-preview:large">\n<link rel="canonical" href="' + pageUrl + '">\n<meta property="og:type" content="music.song">\n<meta property="og:title" content="' + esc(s.title) + ' — ' + esc(ARTIST) + '">\n<meta property="og:description" content="' + esc(desc) + '">\n<meta property="og:image" content="' + cover + '">\n<meta property="og:url" content="' + pageUrl + '">\n<meta name="twitter:card" content="summary_large_image">\n<link rel="icon" href="' + BASE + '/favicon.ico" sizes="any">\n<script type="application/ld+json">' + JSON.stringify(ld) + '</script>\n<style>body{margin:0;background:#080a14;color:#e8eaf0;font-family:system-ui,Cairo,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;padding:24px}main{max-width:640px}img{width:220px;height:220px;object-fit:cover;border-radius:16px}h1{font-size:1.6rem;margin:16px 0 4px}p{color:#aab;line-height:1.9}a.btn{display:inline-block;margin-top:18px;background:#fff;color:#000;padding:12px 28px;border-radius:100px;font-weight:700;text-decoration:none}</style>\n</head>\n<body>\n<main>\n<img src="' + cover + '" alt="' + esc(s.title) + ' — ' + esc(ARTIST) + '" width="220" height="220">\n<h1>' + esc(s.title) + '</h1>\n<p><strong>' + esc(ARTIST) + ' — NL</strong><br>راب/هيب هوب مستقل من الدار البيضاء، المغرب.</p>\n' + (snippet ? '<p>' + esc(snippet) + '</p>\n' : '') + '<a class="btn" href="' + deepLink + '">▶ استمع الآن على NL</a>\n</main>\n</body>\n</html>';
  write('song/' + slug + '/index.html', html);
  songUrls.push({ loc: pageUrl, image: cover, title: s.title });
}

// ---------- section hub pages ----------
function hubPage(o) {
  const pageUrl = DOMAIN + '/' + o.slug + '/';
  const html = '<!DOCTYPE html>\n<html lang="ar" dir="rtl">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>' + esc(o.title) + '</title>\n<meta name="description" content="' + esc(o.desc) + '">\n<meta name="robots" content="index, follow">\n<link rel="canonical" href="' + pageUrl + '">\n<meta property="og:type" content="website">\n<meta property="og:title" content="' + esc(o.title) + '">\n<meta property="og:description" content="' + esc(o.desc) + '">\n<meta property="og:url" content="' + pageUrl + '">\n<link rel="icon" href="' + BASE + '/favicon.ico" sizes="any">\n' + (o.ld ? '<script type="application/ld+json">' + JSON.stringify(o.ld) + '</script>\n' : '') + '<style>body{margin:0;background:#080a14;color:#e8eaf0;font-family:system-ui,Cairo,sans-serif;padding:32px;line-height:1.9}main{max-width:900px;margin:0 auto}h1{font-size:1.8rem}a.btn{display:inline-block;margin:12px 0;background:#fff;color:#000;padding:10px 24px;border-radius:100px;font-weight:700;text-decoration:none}ul{columns:2;gap:24px;padding-inline-start:18px}li{margin:4px 0}</style>\n</head>\n<body><main>\n<h1>' + esc(o.title) + '</h1>\n<p>' + esc(o.desc) + '</p>\n<a class="btn" href="' + BASE + '/' + o.deepPath + '">افتح داخل NL</a>\n' + (o.listHtml || '') + '\n</main></body></html>';
  write(o.slug + '/index.html', html);
  return pageUrl;
}

const hubUrls = [];
hubUrls.push(hubPage({
  slug: 'music', title: 'NL Music — ' + ARTIST + ' | مكتبة الموسيقى',
  desc: 'مشغّل NL Music: استمع لأعمال ' + ARTIST + ' (NL) ومكتبة موسيقية واسعة. راب وهيب هوب من الدار البيضاء.',
  deepPath: '?music=1',
  ld: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'NL Music', url: DOMAIN + '/music/' },
}));
hubUrls.push(hubPage({
  slug: 'movies', title: 'NL Cinema — أفلام ومسلسلات',
  desc: 'قسم NL Cinema لمشاهدة الأفلام والمسلسلات داخل موقع NL. تُجلب البيانات مباشرة من TMDB.',
  deepPath: '?movies=1',
}));
const vidList = '<h2>الفيديوهات (' + videos.length + ')</h2><ul>' + videos.map((v) => '<li>' + esc('NL Drawing ' + String(v.id).replace(/^v/, '')) + '</li>').join('') + '</ul>';
hubUrls.push(hubPage({
  slug: 'videos', title: 'NL Drawings — فيديوهات الرسم',
  desc: 'مجموعة من ' + videos.length + ' فيديو رسم قصير من إبداع ' + ARTIST + ' (NL).',
  deepPath: '?drawings=1', listHtml: vidList,
  ld: { '@context': 'https://schema.org', '@type': 'ItemList', numberOfItems: videos.length, itemListElement: videos.map((v, i) => ({ '@type': 'ListItem', position: i + 1, name: 'NL Drawing ' + String(v.id).replace(/^v/, '') })) },
}));
const gameList = '<h2>الألعاب (' + games.length + ')</h2><ul>' + games.map((g) => '<li>' + esc(g.title) + '</li>').join('') + '</ul>';
hubUrls.push(hubPage({
  slug: 'games', title: 'NL Retro Games — ألعاب كلاسيكية',
  desc: 'العب ' + games.length + ' لعبة ريترو كلاسيكية داخل موقع NL.',
  deepPath: '?games=1', listHtml: gameList,
  ld: { '@context': 'https://schema.org', '@type': 'ItemList', numberOfItems: games.length, itemListElement: games.map((g, i) => ({ '@type': 'ListItem', position: i + 1, name: g.title })) },
}));

hubUrls.push(hubPage({
  slug: 'about',
  title: 'Nordine GB (NL) - ' + ARTIST + ' | من هو',
  desc: 'نور الدين المباركي، المعروف فنياً بـ Nordine GB ويصدر أعماله تحت اسم NL. فنان راب ومنتج موسيقي مستقل من الدار البيضاء، المغرب.',
  deepPath: '?about=1',
  listHtml: '<h2>أسماء وألقاب أخرى / Also known as</h2>'
    + '<p>Nordine GB, NORDINE GB, Nourdine GB, NL, NL MUSIC, NL GB, '
    + 'Noureddin El Mobaraki, Noureddine El Moubaraki, Nourdine El Mobaraki, '
    + 'Nordine Lmbarki, Nordine Lembarki, Nordine Mbarki, Noureddine Mbarki, '
    + 'نور الدين المباركي, نورالدين المباركي, نوردين المباركي, نوردين جي بي.</p>'
    + '<h2>المنصات الرسمية</h2><ul>'
    + ARTIST_SAMEAS.map((u) => '<li><a href="' + u + '" rel="me">' + u + '</a></li>').join('')
    + '</ul>',
  ld: {
    '@context': 'https://schema.org', '@type': 'ProfilePage',
    url: DOMAIN + '/about/',
    inLanguage: 'ar',
    mainEntity: {
      '@type': 'Person', '@id': DOMAIN + '/#person',
      name: ARTIST, alternateName: ARTIST_ALIASES, sameAs: ARTIST_SAMEAS,
      jobTitle: 'Rap Artist & Music Producer',
      homeLocation: { '@type': 'Place', name: 'Casablanca, Morocco' },
    },
  },
}));

// ---------- sitemap.xml ----------
const urls = [
  { loc: DOMAIN + '/', priority: '1.0', changefreq: 'weekly' },
  ...songUrls.map((s) => ({ loc: s.loc, priority: '0.8', changefreq: 'monthly', image: s.image, title: s.title })),
  ...hubUrls.map((u) => ({ loc: u, priority: '0.7', changefreq: 'weekly' })),
];
const lastmod = BUILD_DATE ? '\n    <lastmod>' + BUILD_DATE + '</lastmod>' : '';
const sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' +
  urls.map((u) => '  <url>\n    <loc>' + u.loc + '</loc>' + lastmod + '\n    <changefreq>' + u.changefreq + '</changefreq>\n    <priority>' + u.priority + '</priority>' + (u.image ? '\n    <image:image><image:loc>' + u.image + '</image:loc><image:title>' + esc(u.title) + ' — NL</image:title></image:image>' : '') + '\n  </url>').join('\n') +
  '\n</urlset>\n';
write('sitemap.xml', sm);
fs.writeFileSync(path.join(PUB, 'sitemap.xml'), sm);

// ---------- search-index.json (unified, lightweight) ----------
const index = [];
for (const s of songs) {
  const ytid = ytMap[String(s.id)];
  index.push({ id: 'own-' + s.id, t: 'song', title: s.title, artist: 'NL', link: BASE + '/?song=' + s.id, cover: ytid ? yt(ytid, 'mqdefault') : '' });
}
for (const r of fv) index.push({ id: 'fv-' + r.id, t: 'library', title: r.title, artist: r.artist || '', link: BASE + '/?song=fv-' + r.id, cover: r.coverUrl || '' });
for (const v of videos) index.push({ id: v.id, t: 'video', title: 'NL Drawing ' + String(v.id).replace(/^v/, ''), artist: 'NL', link: BASE + '/?drawings=1', cover: '' });
for (const g of games) index.push({ id: g.id, t: 'game', title: g.title, artist: '', link: BASE + '/?games=1', cover: '' });
const idxStr = JSON.stringify(index);
write('data/search-index.json', idxStr);
fs.writeFileSync(path.join(DATA, 'search-index.json'), idxStr);

console.log(JSON.stringify({ songPages: songUrls.length, hubPages: hubUrls.length, sitemapUrls: urls.length, searchRecords: index.length, sampleSong: songUrls[0], outDir: OUT }, null, 2));
