import type { Track } from '../engine/types';
import {
  resolveArchiveItemMetadata,
  searchArchiveCatalog,
} from '../../../services/archive/archiveMasterEngine';
import { buildArchiveThumbnailUrl } from '../../../services/archive/archiveUrlBuilder';

export async function searchOpenMusicDiscovery(
  query: string,
): Promise<Track[]> {
  const q = query.trim() || 'instrumental jazz classical';

  const [openverseRes, archiveRes] = await Promise.allSettled([
    fetchOpenverseAudioTracks(q),
    fetchInternetArchiveMusicTracks(q),
  ]);

  const combined: Track[] = [];
  if (openverseRes.status === 'fulfilled') {
    combined.push(...openverseRes.value);
  }
  if (archiveRes.status === 'fulfilled') {
    combined.push(...archiveRes.value);
  }
  return combined;
}

async function fetchOpenverseAudioTracks(query: string): Promise<Track[]> {
  try {
    const url = `https://api.openverse.org/v1/audio/?q=${encodeURIComponent(query)}&page_size=15`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6500) });
    if (!res.ok) return [];
    const data = await res.json();
    const results: any[] = Array.isArray(data?.results) ? data.results : [];
    return results
      .filter((r) => Boolean(r?.url) && /\.(mp3|ogg|flac|wav|m4a)(\?|$)/i.test(String(r.url)))
      .map((r): Track => ({
        id: `openverse-${r.id}`,
        title: String(r.title || 'Openverse Audio Track'),
        artist: String(r.creator || 'Openverse CC Audio'),
        album: String(r.source || 'Openverse Commons'),
        src: String(r.url),
        kind: 'file',
        hasLrc: false,
        durationSec: r.duration ? Math.round(Number(r.duration) / 1000) : undefined,
        coverUrl: r.thumbnail || undefined,
        source: 'remote',
      }));
  } catch {
    return [];
  }
}

async function fetchInternetArchiveMusicTracks(query: string): Promise<Track[]> {
  try {
    const lucene = `(collection:(audio_music) OR collection:(78rpm) OR collection:(netlabels)) AND mediatype:(audio) AND (title:("${query}") OR creator:("${query}"))`;
    const search = await searchArchiveCatalog({
      query: lucene,
      page: 1,
      rows: 8,
      sort: 'downloads desc',
    });

    const resolvedLists = await Promise.all(
      search.docs.slice(0, 6).map(async (doc) => {
        const meta = await resolveArchiveItemMetadata(doc.identifier, doc.title);
        const firstAudio = meta?.audios?.[0];
        if (!firstAudio) return null;
        const artist = Array.isArray(doc.creator)
          ? doc.creator[0]
          : doc.creator || 'Internet Archive Audio';
        const track: Track = {
          id: `ia-music-${doc.identifier}`,
          title: doc.title || firstAudio.title,
          artist: String(artist),
          album: 'Internet Archive Audio',
          year: Number(doc.year) || undefined,
          src: firstAudio.directNodeUrl || firstAudio.cdnStreamUrl,
          srcFallback: firstAudio.cdnStreamUrl,
          kind: 'file',
          hasLrc: false,
          durationSec: firstAudio.durationSeconds,
          coverUrl: buildArchiveThumbnailUrl(doc.identifier),
          source: 'remote',
        };
        return track;
      }),
    );

    return resolvedLists.filter((t): t is Track => Boolean(t));
  } catch {
    return [];
  }
}
