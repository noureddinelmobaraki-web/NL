/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import type { YouTubeFeed, YouTubeVideo } from './types';

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

function hydrateVideo(v: Partial<YouTubeVideo> & { id: string }): YouTubeVideo {
  return {
    id: v.id,
    title: v.title || '',
    publishedAt: v.publishedAt || '',
    description: v.description || '',
    thumbnail: v.thumbnail || `https://i.ytimg.com/vi/${v.id}/maxresdefault.jpg`,
    duration: v.duration,
    viewCount: v.viewCount,
    likeCount: v.likeCount,
  };
}

export async function loadYoutubeFeed(): Promise<YouTubeFeed> {
  if (cache) return cache;
  if (inflight) return inflight;
  const url = import.meta.env.BASE_URL + 'data/youtube.json';
  inflight = fetch(url, { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : EMPTY))
    .then((data: YouTubeFeed) => {
      if (data && Array.isArray(data.videos)) {
        cache = {
          ...data,
          videos: data.videos.filter((v) => v && v.id).map(hydrateVideo),
        };
      } else {
        cache = EMPTY;
      }
      return cache;
    })
    .catch(() => EMPTY);
  return inflight;
}
