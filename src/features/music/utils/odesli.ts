import { z } from 'zod';
import type { Track } from '../engine/types';
import { readStore, writeStore } from '../../../utils/storage';

const OdesliResponseSchema = z.object({
  pageUrl: z.string().url().optional(),
  linksByPlatform: z
    .record(
      z.string(),
      z.object({
        url: z.string().url(),
      }),
    )
    .optional(),
});

export interface OdesliPlatformLink {
  id: string;
  label: string;
  url: string;
  accent: string;
}

export interface OdesliTrackLinks {
  pageUrl: string;
  platforms: OdesliPlatformLink[];
}

const ODESLI_CACHE_KEY = 'nl:odesli-links:v1';
const CachedMapSchema = z.record(
  z.string(),
  z.object({
    pageUrl: z.string(),
    platforms: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        url: z.string(),
        accent: z.string(),
      }),
    ),
  }),
);

let ytMapPromise: Promise<Record<string, string>> | null = null;

async function getSongYoutubeMap(): Promise<Record<string, string>> {
  if (!ytMapPromise) {
    ytMapPromise = fetch(`${import.meta.env.BASE_URL}data/song-youtube.json`)
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}));
  }
  return ytMapPromise;
}

function buildFallbackLinks(track: Track, ytId?: string): OdesliTrackLinks {
  const q = encodeURIComponent(`${track.title} ${track.artist || ''}`.trim());
  const ytUrl = ytId
    ? `https://music.youtube.com/watch?v=${ytId}`
    : `https://music.youtube.com/search?q=${q}`;

  return {
    pageUrl: ytId ? `https://song.link/y/${ytId}` : `https://odesli.co`,
    platforms: [
      {
        id: 'spotify',
        label: 'Spotify',
        url: `https://open.spotify.com/search/${q}`,
        accent: '#1DB954',
      },
      {
        id: 'appleMusic',
        label: 'Apple Music',
        url: `https://music.apple.com/us/search?term=${q}`,
        accent: '#FA243C',
      },
      {
        id: 'anghami',
        label: 'Anghami',
        url: `https://play.anghami.com/search/${q}`,
        accent: '#A855F7',
      },
      {
        id: 'youtubeMusic',
        label: 'YouTube Music',
        url: ytUrl,
        accent: '#FF0033',
      },
    ],
  };
}

export async function fetchOdesliLinks(track: Track): Promise<OdesliTrackLinks> {
  const cacheMap = readStore(ODESLI_CACHE_KEY, CachedMapSchema, {});
  if (cacheMap[track.id]) {
    return cacheMap[track.id];
  }

  const numId = String(track.id).replace(/^fv-/, '');
  const ytMap = await getSongYoutubeMap();
  const ytId = ytMap[numId];
  const fallback = buildFallbackLinks(track, ytId);

  if (!ytId) {
    return fallback;
  }

  try {
    const targetUrl = `https://www.youtube.com/watch?v=${ytId}`;
    const endpoint = `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(
      targetUrl,
    )}&userCountry=MA`;
    const res = await fetch(endpoint);
    if (!res.ok) return fallback;

    const raw = await res.json();
    const parsed = OdesliResponseSchema.safeParse(raw);
    if (!parsed.success) return fallback;

    const byPlatform = parsed.data.linksByPlatform ?? {};
    const q = encodeURIComponent(`${track.title} ${track.artist || ''}`.trim());

    const platforms: OdesliPlatformLink[] = [
      {
        id: 'spotify',
        label: 'Spotify',
        url: byPlatform.spotify?.url ?? `https://open.spotify.com/search/${q}`,
        accent: '#1DB954',
      },
      {
        id: 'appleMusic',
        label: 'Apple Music',
        url: byPlatform.appleMusic?.url ?? `https://music.apple.com/us/search?term=${q}`,
        accent: '#FA243C',
      },
      {
        id: 'anghami',
        label: 'Anghami',
        url: byPlatform.anghami?.url ?? `https://play.anghami.com/search/${q}`,
        accent: '#A855F7',
      },
      {
        id: 'youtubeMusic',
        label: 'YouTube Music',
        url:
          byPlatform.youtubeMusic?.url ??
          byPlatform.youtube?.url ??
          `https://music.youtube.com/watch?v=${ytId}`,
        accent: '#FF0033',
      },
    ];

    const result: OdesliTrackLinks = {
      pageUrl: parsed.data.pageUrl ?? `https://song.link/y/${ytId}`,
      platforms,
    };

    writeStore(ODESLI_CACHE_KEY, {
      ...cacheMap,
      [track.id]: result,
    });

    return result;
  } catch {
    return fallback;
  }
}
