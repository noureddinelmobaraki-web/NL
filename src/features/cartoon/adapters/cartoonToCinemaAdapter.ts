import type { CinemaItem } from '../../../components/Movies/moviesDataClient';
import type { PlaySource } from '../../../components/Movies/MovieSourcesModal';
import type { CartoonSeriesItem } from '../types/cartoon.types';
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

export async function buildCartoonEpisodesList(
  series: CartoonSeriesItem | undefined
): Promise<Array<{ episode_number: number; name: string }>> {
  if (!series) return [{ episode_number: 1, name: 'الحلقة 1' }];
  try {
    if (series.archiveIds.length > 0) {
      const resolved = await resolveArchiveIdentifierStreams(
        series.archiveIds[0],
        series.titleAr
      );
      if (resolved.length > 0) {
        return resolved.map((ep) => ({
          episode_number: ep.episodeNumber,
          name: ep.titleAr,
        }));
      }
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
  episodeNumber: number
): PlaySource[] {
  if (!series) return [];
  const options = buildCartoonPlayOptions(series, episodeNumber, null);
  const archiveDirectUrl =
    series.archiveIds.length > 0
      ? `https://archive.org/embed/${encodeURIComponent(series.archiveIds[0])}`
      : '';

  const sources: PlaySource[] = [];
  if (archiveDirectUrl) {
    sources.push({
      id: `archive-embed-${series.id}-${episodeNumber}`,
      label: `أرشيف سبيستون المباشر (الحلقة ${episodeNumber})`,
      host: 'archive.org',
      url: archiveDirectUrl,
      origins: ['https://archive.org'],
      timeoutMs: 12000,
    });
  }

  options.forEach((opt) => {
    sources.push({
      id: `${opt.id}-ep${episodeNumber}`,
      label: opt.label,
      host: 'spacetoon-source',
      url: opt.url,
      origins: ['https://archive.org', 'https://vidlink.pro'],
      timeoutMs: 12000,
    });
  });

  return sources;
}
