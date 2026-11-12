import type { CinemaItem } from '../../../components/Movies/moviesDataClient';
import type { PlaySource } from '../../../components/Movies/MovieSourcesModal';
import type { CartoonEpisodeStream, CartoonSeriesItem } from '../types/cartoon.types';
import { resolveArchiveIdentifierStreams } from '../services/archiveOrgStreamResolver';
import { buildCartoonPlayOptions } from '../services/cartoonEmbedFallback';

export function getCartoonNumericId(series: CartoonSeriesItem, index: number): number {
  return series.tmdbId || 800000 + index;
}

export function adaptCartoonToCinemaItem(
  series: CartoonSeriesItem,
  index: number
): CinemaItem {
  return {
    id: getCartoonNumericId(series, index),
    mediaType: series.mediaType,
    title: series.titleAr,
    overview: series.synopsisAr,
    posterPath: series.posterUrl,
    backdropPath: series.backdropUrl || series.posterUrl,
    rating: series.rating,
    year: String(series.year),
    genreIds: [16],
    genreNames: [series.planetLabelAr, series.studio],
    seasons: 1,
    episodes: series.episodesCount,
    trailerKey: '',
    imdbId: series.imdbId,
    productionCompanies: [
      { id: 1, name: series.studio, logoPath: '' },
      { id: 2, name: 'Spacetoon Archive', logoPath: '' },
    ],
    cast: [],
    similar: [],
  };
}

export async function resolveCartoonEpisodes(
  series: CartoonSeriesItem | undefined
): Promise<CartoonEpisodeStream[]> {
  if (!series || series.archiveIds.length === 0) return [];
  try {
    return await resolveArchiveIdentifierStreams(
      series.archiveIds[0],
      series.titleAr
    );
  } catch {
    return [];
  }
}

export async function buildCartoonEpisodesList(
  series: CartoonSeriesItem | undefined
): Promise<Array<{ episode_number: number; name: string }>> {
  if (!series) return [{ episode_number: 1, name: 'الحلقة 1' }];
  try {
    const resolved = await resolveCartoonEpisodes(series);
    if (resolved.length > 0) {
      return resolved.map((ep) => ({
        episode_number: ep.episodeNumber,
        name: ep.titleAr,
      }));
    }
  } catch {
    // fallback to static count
  }
  const count = Math.max(1, Math.min(60, series.episodesCount || 26));
  return Array.from({ length: count }, (_, idx) => ({
    episode_number: idx + 1,
    name: `${series.titleAr} — الحلقة ${idx + 1}`,
  }));
}

export function buildCartoonPlaySourcesSync(
  series: CartoonSeriesItem | undefined,
  episodeNumber: number,
  resolvedEpisodes?: CartoonEpisodeStream[]
): PlaySource[] {
  if (!series) return [];
  const epNum = Math.max(1, episodeNumber || 1);
  const matchedStream =
    resolvedEpisodes && resolvedEpisodes.length > 0
      ? resolvedEpisodes.find((e) => e.episodeNumber === epNum) ||
        resolvedEpisodes[epNum - 1] ||
        resolvedEpisodes[0] ||
        null
      : null;

  const sources: PlaySource[] = [];
  const seenUrls = new Set<string>();

  if (matchedStream?.streamUrl) {
    seenUrls.add(matchedStream.streamUrl);
    sources.push({
      id: `archive-mp4-${series.id}-${epNum}`,
      label: `بث مباشر سبيستون MP4 (الحلقة ${epNum})`,
      host: 'archive.org',
      url: matchedStream.streamUrl,
      origins: ['https://archive.org'],
      timeoutMs: 12000,
    });
  }

  const archiveEmbedUrl =
    series.archiveIds.length > 0
      ? `https://archive.org/embed/${encodeURIComponent(series.archiveIds[0])}?autoplay=1`
      : '';

  if (archiveEmbedUrl && !seenUrls.has(archiveEmbedUrl)) {
    seenUrls.add(archiveEmbedUrl);
    sources.push({
      id: `archive-embed-${series.id}-${epNum}`,
      label: `أرشيف سبيستون المباشر (الحلقة ${epNum})`,
      host: 'archive.org',
      url: archiveEmbedUrl,
      origins: ['https://archive.org'],
      timeoutMs: 12000,
    });
  }

  const options = buildCartoonPlayOptions(series, epNum, matchedStream);
  options.forEach((opt) => {
    if (seenUrls.has(opt.url)) return;
    seenUrls.add(opt.url);
    const isArchiveHost = opt.url.includes('archive.org');
    sources.push({
      id: `${opt.id}-ep${epNum}`,
      label: opt.label,
      host: isArchiveHost ? 'archive.org' : 'spacetoon-source',
      url: opt.url,
      origins: ['https://archive.org', 'https://vidlink.pro'],
      timeoutMs: 12000,
    });
  });

  return sources;
}

export const buildCartoonPlaySources = buildCartoonPlaySourcesSync;
