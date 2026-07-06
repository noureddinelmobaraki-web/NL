// Harvest NL YouTube uploads into public/data/youtube.json
// Uses YouTube Data API v3 when YOUTUBE_API_KEY is set (up to MAX videos; MAX=300 covers the whole ~277-video channel so Favorites/Proud Of tabs and song links all resolve),
// and falls back to the public RSS feed (~15 latest) when no key is available.

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const HANDLE = process.env.YOUTUBE_CHANNEL_HANDLE || '@nourdin_el_mobaraki';
const EXPLICIT_ID = process.env.YOUTUBE_CHANNEL_ID || '';
const API_KEY = process.env.YOUTUBE_API_KEY || '';
const OUT = 'public/data/youtube.json';
const MAX = 300;
const FALLBACK_ID = 'UC37eXf-gEAt_mFpXNn95vCw';

const API = 'https://www.googleapis.com/youtube/v3';

async function getJson(url) {
  const r = await fetch(url, { headers: { 'accept-language': 'en' } });
  if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + url);
  return r.json();
}

async function resolveChannelId() {
  if (EXPLICIT_ID && EXPLICIT_ID.startsWith('UC')) return EXPLICIT_ID;

  if (API_KEY) {
    const h = HANDLE.startsWith('@') ? HANDLE : '@' + HANDLE;
    try {
      const j = await getJson(
        API + '/channels?part=id&forHandle=' + encodeURIComponent(h) + '&key=' + API_KEY,
      );
      const id = j.items && j.items[0] && j.items[0].id;
      if (id) return id;
    } catch (err) {
      console.warn('[harvest] forHandle lookup failed:', err.message);
    }
  }

  try {
    const url = 'https://www.youtube.com/' + (HANDLE.startsWith('@') ? HANDLE : '@' + HANDLE);
    const r = await fetch(url, { headers: { 'accept-language': 'en' } });
    const html = await r.text();
    const m = html.match(/"(?:channelId|externalId)":"(UC[\w-]{20,})"/);
    if (m) return m[1];
  } catch (err) {
    console.warn('[harvest] handle-page scrape failed:', err.message);
  }

  console.warn('[harvest] using fallback channel id — set YOUTUBE_CHANNEL_ID to be safe');
  return FALLBACK_ID;
}

async function fetchViaApi(channelId) {
  const ch = await getJson(
    API + '/channels?part=contentDetails&id=' + channelId + '&key=' + API_KEY,
  );
  const uploads =
    ch.items &&
    ch.items[0] &&
    ch.items[0].contentDetails &&
    ch.items[0].contentDetails.relatedPlaylists &&
    ch.items[0].contentDetails.relatedPlaylists.uploads;
  if (!uploads) throw new Error('uploads playlist not found');

  const ids = [];
  let pageToken = '';
  while (ids.length < MAX) {
    const url =
      API +
      '/playlistItems?part=contentDetails&maxResults=50&playlistId=' +
      uploads +
      '&key=' +
      API_KEY +
      (pageToken ? '&pageToken=' + pageToken : '');
    const page = await getJson(url);
    for (const it of page.items || []) {
      const vid = it.contentDetails && it.contentDetails.videoId;
      if (vid) ids.push(vid);
    }
    if (!page.nextPageToken) break;
    pageToken = page.nextPageToken;
  }

  const wanted = ids.slice(0, MAX);
  const out = [];
  for (let i = 0; i < wanted.length; i += 50) {
    const batch = wanted.slice(i, i + 50);
    const url =
      API +
      '/videos?part=snippet,contentDetails,statistics&id=' +
      batch.join(',') +
      '&key=' +
      API_KEY;
    const j = await getJson(url);
    for (const v of j.items || []) {
      const sn = v.snippet || {};
      const st = v.statistics || {};
      const thumbs = sn.thumbnails || {};
      const thumb =
        (thumbs.maxres && thumbs.maxres.url) ||
        (thumbs.high && thumbs.high.url) ||
        (thumbs.medium && thumbs.medium.url) ||
        (thumbs.default && thumbs.default.url) ||
        '';
      out.push({
        id: v.id,
        title: sn.title || '',
        publishedAt: sn.publishedAt || '',
        description: sn.description || '',
        thumbnail: thumb,
        duration: parseIsoDuration(v.contentDetails && v.contentDetails.duration),
        viewCount: st.viewCount ? Number(st.viewCount) : undefined,
        likeCount: st.likeCount ? Number(st.likeCount) : undefined,
      });
    }
  }
  return out;
}

function parseIsoDuration(iso) {
  if (!iso) return undefined;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return undefined;
  const h = Number(m[1] || 0);
  const min = Number(m[2] || 0);
  const s = Number(m[3] || 0);
  return h * 3600 + min * 60 + s;
}

async function fetchViaRss(channelId) {
  const url = 'https://www.youtube.com/feeds/videos.xml?channel_id=' + channelId;
  const r = await fetch(url, { headers: { 'accept-language': 'en' } });
  if (!r.ok) throw new Error('RSS HTTP ' + r.status);
  const xml = await r.text();
  const entries = xml.split('<entry>').slice(1);
  const out = [];
  for (const e of entries) {
    const id = (e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1];
    const title = (e.match(/<title>([^<]+)<\/title>/) || [])[1] || '';
    const published = (e.match(/<published>([^<]+)<\/published>/) || [])[1] || '';
    const desc = (e.match(/<media:description>([\s\S]*?)<\/media:description>/) || [])[1] || '';
    if (!id) continue;
    out.push({
      id,
      title: decodeXml(title),
      publishedAt: published,
      description: decodeXml(desc),
      thumbnail: 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg',
    });
  }
  return out;
}

function decodeXml(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function main() {
  const channelId = await resolveChannelId();
  console.log('[harvest] channel id:', channelId, API_KEY ? '(API mode)' : '(RSS mode)');

  let videos = [];
  if (API_KEY) {
    try {
      videos = await fetchViaApi(channelId);
    } catch (err) {
      console.warn('[harvest] API fetch failed, falling back to RSS:', err.message);
    }
  }
  if (videos.length === 0) {
    try {
      videos = await fetchViaRss(channelId);
    } catch (err) {
      console.warn('[harvest] RSS fetch failed:', err.message);
    }
  }

  const payload = {
    channelId,
    channelHandle: HANDLE,
    updatedAt: new Date().toISOString(),
    count: videos.length,
    videos,
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(payload, null, 2), 'utf8');
  console.log('[harvest] Wrote ' + videos.length + ' videos to ' + OUT);
}

main().catch((err) => {
  console.error('[harvest] fatal:', err);
  process.exit(1);
});
