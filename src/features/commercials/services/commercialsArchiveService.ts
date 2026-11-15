import {
  resolveArchiveItemMetadata,
  searchArchiveCatalog,
  type ArchiveSearchDoc,
} from '../../../services/archive/archiveMasterEngine';
import {
  buildArchiveEmbedUrl,
  buildArchiveItemDetailsUrl,
  buildArchiveThumbnailUrl,
  buildArchiveTorrentUrl,
} from '../../../services/archive/archiveUrlBuilder';
import type { ShelfDefinition } from '../../../services/catalog/CatalogOrchestrator';
import type { CinemaItem } from '../../../components/Movies/moviesDataClient';
import { COMMERCIALS_SHELVES_CONFIG } from '../catalog/commercialsShelvesConfig';

function hashCommercialIdToNumber(identifier: string): number {
  let h = 2166136261;
  for (let i = 0; i < identifier.length; i++) {
    h ^= identifier.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return 40_000_000 + (Math.abs(h) % 9_000_000);
}

function docToCommercialItem(doc: ArchiveSearchDoc, badgeText: string): CinemaItem {
  const thumb = buildArchiveThumbnailUrl(doc.identifier);
  const cleanYear = doc.year ? String(doc.year).slice(0, 4) : '1970';
  const overview = doc.description
    ? String(doc.description).replace(/<[^>]*>?/gm, '').slice(0, 260)
    : 'Preserved vintage television broadcast and commercial reel from the Internet Archive.';

  return {
    id: hashCommercialIdToNumber(doc.identifier),
    title: doc.title || doc.identifier,
    year: cleanYear,
    rating: doc.avg_rating ? Number(doc.avg_rating.toFixed(1)) : 8.4,
    posterPath: thumb,
    backdropPath: thumb,
    overview,
    genreIds: [99, 10770],
    genreNames: [badgeText, 'Vintage TV & Commercials'],
    mediaType: 'movie',
    trailerKey: '',
    cast: [],
    similar: [],
    hub: 'commercials',
    archiveIds: [doc.identifier],
    archivePageUrl: buildArchiveItemDetailsUrl(doc.identifier),
    torrentDownloadUrl: buildArchiveTorrentUrl(doc.identifier),
    licenseUrl: doc.licenseurl || 'https://creativecommons.org/publicdomain/mark/1.0/',
    usageRights: 'Public Domain / Historical Ephemeral Broadcast Archive',
  };
}

export function buildCommercialsShelfDefinitions(
  categoryFilter: string,
): ShelfDefinition<CinemaItem>[] {
  const configs =
    categoryFilter === 'all'
      ? COMMERCIALS_SHELVES_CONFIG
      : COMMERCIALS_SHELVES_CONFIG.filter((c) => c.id.includes(categoryFilter));

  return configs.map((cfg) => ({
    id: cfg.id,
    title: cfg.titleEn,
    badgeText: cfg.badgeText,
    fetcher: async (page: number) => {
      const res = await searchArchiveCatalog({
        query: cfg.luceneQuery,
        sort: 'downloads desc',
        rows: 22,
        page,
        excludeBorrowLocked: true,
      });
      return res.docs.map((d) => docToCommercialItem(d, cfg.badgeText));
    },
  }));
}

export async function searchCommercialsArchive(query: string): Promise<CinemaItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const res = await searchArchiveCatalog({
    query: `(${trimmed}) AND (collection:adviews OR collection:prelinger OR collection:ephemera OR collection:classic_tv_commercials OR subject:"commercials") AND mediatype:movies`,
    sort: 'downloads desc',
    rows: 28,
    page: 1,
    excludeBorrowLocked: true,
  });
  return res.docs.map((d) => docToCommercialItem(d, 'Archive Search'));
}

export interface CommercialPlayableClip {
  readonly identifier: string;
  readonly title: string;
  readonly year: string;
  readonly directMp4Url: string;
  readonly fallbackCdnUrl: string;
  readonly embedUrl: string;
  readonly downloadMp4Url: string;
  readonly torrentUrl: string;
  readonly detailsUrl: string;
}

export async function resolveCommercialClip(item: CinemaItem): Promise<CommercialPlayableClip> {
  const identifier =
    item.archiveIds?.[0] || String(item.id).replace(/^comm_/, '');
  const resolved = await resolveArchiveItemMetadata(identifier, item.title);
  const firstVideo = resolved?.videos[0];

  const fallbackDownload = `https://archive.org/download/${encodeURIComponent(identifier)}`;
  return {
    identifier,
    title: item.title,
    year: String(item.year || '1970'),
    directMp4Url: firstVideo?.directNodeUrl || '',
    fallbackCdnUrl: firstVideo?.cdnStreamUrl || '',
    embedUrl: buildArchiveEmbedUrl(identifier, { autoplay: true, playlist: true }),
    downloadMp4Url: firstVideo?.downloadUrl || fallbackDownload,
    torrentUrl: buildArchiveTorrentUrl(identifier),
    detailsUrl: buildArchiveItemDetailsUrl(identifier),
  };
}
