import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const HANDLE = process.env.YOUTUBE_CHANNEL_HANDLE || '@nourdin_el_mobaraki';
const EXPLICIT_ID = process.env.YOUTUBE_CHANNEL_ID || '';
const API_KEY = process.env.YOUTUBE_API_KEY || '';
const OUT = 'public/data/youtube.json';
const MAX = 30;

async function resolveChannelId() {
  if (EXPLICIT_ID.startsWith('UC')) return EXPLICIT_ID;
  const handle = HANDLE.startsWith('@') ? HANDLE : '@' + HANDLE;
  try {
    const res = await fetch('https://www.youtube.com/' + handle, {
      headers: {
        'accept-language': 'en-US,en;q=0.9',
        'cookie': 'CONSENT=YES+1',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
    });
    if (!res.ok) throw new Error('Status ' + res.status);
    const html = await res.text();
    const m = html.match(/"(?:channelId|externalId)":"(UC[\w-]{20,})"/);
    if (!m) throw new Error('Regex match failed');
    return m[1];
  } catch (err) {
    console.warn('Could not resolve channel id from handle ' + handle + ' due to: ' + err.message + '. Using fallback channel ID.');
    return 'UC37eXf-gEAt_mFpXNn95vCw'; // Fallback channel ID for @nourdin_el_mobaraki
  }
}

function decodeEntities(s) {
  return (s || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function firstMatch(text, re, fallback) {
  const m = text.match(re);
  return m ? m[1] : fallback;
}

async function fetchRss(channelId) {
  const url = 'https://www.youtube.com/feeds/videos.xml?channel_id=' + channelId;
  const res = await fetch(url, {
    headers: {
      'accept-language': 'en-US,en;q=0.9',
      'cookie': 'CONSENT=YES+1',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
  });
  if (!res.ok) throw new Error('RSS fetch failed: ' + res.status);
  const xml = await res.text();
  const entries = xml.split('<entry>').slice(1);
  return entries.map((e) => {
    const id = firstMatch(e, /<yt:videoId>([^<]+)<\/yt:videoId>/, '');
    const title = decodeEntities(firstMatch(e, /<title>([^<]*)<\/title>/, ''));
    const publishedAt = firstMatch(e, /<published>([^<]+)<\/published>/, '');
    const description = decodeEntities(firstMatch(e, /<media:description>([\s\S]*?)<\/media:description>/, ''));
    const thumbnail = firstMatch(e, /<media:thumbnail url="([^"]+)"/, 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg');
    const views = firstMatch(e, /views="(\d+)"/, '');
    const rec = { id, title, publishedAt, description, thumbnail };
    const viewsNum = views ? Number(views) : undefined;
    return { ...rec, viewCount: viewsNum };
  }).filter((v) => v.id);
}

function isoDurationToSeconds(iso) {
  if (!iso) return undefined;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return undefined;
  return Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0);
}

async function enrich(videos) {
  if (!API_KEY || videos.length === 0) return videos;
  const ids = videos.map((v) => v.id).slice(0, 50).join(',');
  const url = 'https://www.googleapis.com/youtube/v3/videos'
    + '?part=contentDetails,statistics,snippet&id=' + ids + '&key=' + API_KEY;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn('Data API enrich skipped:', res.status);
    return videos;
  }
  const data = await res.json();
  const byId = new Map((data.items || []).map((it) => [it.id, it]));
  return videos.map((v) => {
    const it = byId.get(v.id);
    if (!it) return v;
    const out = { ...v };
    const dur = isoDurationToSeconds(it.contentDetails && it.contentDetails.duration);
    if (dur !== undefined) out.duration = dur;
    if (it.statistics && it.statistics.viewCount) out.viewCount = Number(it.statistics.viewCount);
    if (it.statistics && it.statistics.likeCount) out.likeCount = Number(it.statistics.likeCount);
    if (it.snippet && it.snippet.description) out.description = it.snippet.description;
    return out;
  });
}

async function main() {
  const channelId = await resolveChannelId();
  let videos = [];
  try {
    videos = await fetchRss(channelId);
    videos = await enrich(videos);
  } catch (err) {
    console.warn('Error fetching RSS/enriching feed:', err);
  }
  videos = videos.slice(0, MAX);
  const payload = {
    channelId,
    channelHandle: HANDLE,
    updatedAt: new Date().toISOString(),
    count: videos.length,
    videos,
  };
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log('Wrote ' + videos.length + ' videos to ' + OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
