import type { YouTubeFeed } from './types';

const CHANNEL_URL = 'https://www.youtube.com/@nourdin_el_mobaraki';
let cache: YouTubeFeed | null = null;
let inflight: Promise<YouTubeFeed> | null = null;

const EMPTY: YouTubeFeed = {
  channelId: '',
  channelHandle: '@nourdin_el_mobaraki',
  updatedAt: '',
  count: 0,
  videos: [],
};

export function getChannelUrl(): string {
  return CHANNEL_URL;
}

export async function loadYoutubeFeed(): Promise<YouTubeFeed> {
  if (cache) return cache;
  if (inflight) return inflight;
  const url = import.meta.env.BASE_URL + 'data/youtube.json';
  inflight = fetch(url, { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : EMPTY))
    .then((data: YouTubeFeed) => {
      cache = data && Array.isArray(data.videos) ? data : EMPTY;
      return cache;
    })
    .catch(() => EMPTY);
  return inflight;
}
