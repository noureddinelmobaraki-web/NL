import type { LiquidGlassAlbum, LiquidGlassTrack } from '../albumsData';
import {
  resolveArchiveItemMetadata,
  searchArchiveCatalog,
} from '../../../services/archive/archiveMasterEngine';
import { buildArchiveThumbnailUrl } from '../../../services/archive/archiveUrlBuilder';

export type AlbumCollectionFilter =
  | 'nl-curated'
  | 'etree'
  | '78rpm'
  | 'netlabels'
  | 'oldtimeradio';

export const ALBUM_COLLECTION_PILLS: Array<{
  id: AlbumCollectionFilter;
  label: string;
}> = [
  { id: 'nl-curated', label: 'NL Curated (99)' },
  { id: 'etree', label: 'Live Music Archive' },
  { id: '78rpm', label: 'Great 78s' },
  { id: 'netlabels', label: 'Netlabels CC' },
  { id: 'oldtimeradio', label: 'Old Time Radio' },
];

const LUCENE_BY_COLLECTION: Record<
  Exclude<AlbumCollectionFilter, 'nl-curated'>,
  string
> = {
  etree: 'collection:(etree) AND mediatype:(etree)',
  '78rpm': 'collection:(78rpm) AND mediatype:(audio)',
  netlabels: 'collection:(netlabels) AND mediatype:(audio)',
  oldtimeradio: 'collection:(oldtimeradio) AND mediatype:(audio)',
};

export async function fetchOpenArchiveAlbums(
  filter: Exclude<AlbumCollectionFilter, 'nl-curated'>,
  searchQuery = '',
  page = 1,
): Promise<LiquidGlassAlbum[]> {
  const baseQuery = LUCENE_BY_COLLECTION[filter];
  const q = searchQuery.trim()
    ? `(${baseQuery}) AND (title:("${searchQuery.trim()}") OR creator:("${searchQuery.trim()}"))`
    : baseQuery;

  try {
    const res = await searchArchiveCatalog({
      query: q,
      page,
      rows: 36,
      sort: 'downloads desc',
    });

    return res.docs
      .filter((d) => Boolean(d.identifier))
      .map((doc, idx): LiquidGlassAlbum => {
        const artist = Array.isArray(doc.creator)
          ? doc.creator[0]
          : doc.creator || 'Internet Archive Audio';
        return {
          id: `ia-album-${doc.identifier}`,
          index: 100 + idx,
          title: doc.title || doc.identifier,
          artist: String(artist),
          coverUrl: buildArchiveThumbnailUrl(doc.identifier),
          tracks: [],
        };
      });
  } catch {
    return [];
  }
}

export async function resolveOpenAlbumTracks(
  album: LiquidGlassAlbum,
): Promise<LiquidGlassAlbum> {
  if (album.tracks.length > 0 || !album.id.startsWith('ia-album-')) {
    return album;
  }
  const archiveId = album.id.replace(/^ia-album-/, '');
  const meta = await resolveArchiveItemMetadata(archiveId, album.title);
  if (!meta || meta.audios.length === 0) {
    return album;
  }

  const tracks: LiquidGlassTrack[] = meta.audios.map((a, idx) => ({
    num: idx + 1,
    title: a.title || `Track ${idx + 1}`,
    url: a.directNodeUrl || a.cdnStreamUrl,
  }));

  return {
    ...album,
    tracks,
  };
}
