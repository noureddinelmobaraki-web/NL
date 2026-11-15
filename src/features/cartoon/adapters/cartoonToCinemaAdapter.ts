import type { CinemaItem } from '../../../components/Movies/moviesDataClient';
import type { PlaySource } from '../../../components/Movies/MovieSourcesModal';
import type { CartoonEpisodeStream, CartoonSeriesItem } from '../types/cartoon.types';
import { resolveArchiveIdentifierStreams } from '../services/archiveOrgStreamResolver';
import { buildCartoonPlayOptions } from '../services/cartoonEmbedFallback';

export function getCartoonNumericId(
  series: CartoonSeriesItem,
  index: number,
): number {
  const base = series.tmdbId || series.malId || index + 1;
  return 20_000_000 + index * 1000 + (Number(base) % 1000);
}

export function adaptCartoonToCinemaItem(
  series: CartoonSeriesItem,
  index: number,
): CinemaItem {
  return {
    id: getCartoonNumericId(series, index),
    hub: 'cartoon',
    tmdbId: series.tmdbId,
    malId: series.malId,
    archiveIds: series.archiveIds,
    mediaType: series.mediaType,
    title: series.titleAr || series.titleEn,
    overview:
      series.synopsisAr ||
      'عمل كرتوني كلاسيكي مدبلج باللغة العربية من أرشيف سبيستون ومركز الزهرة.',
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

export const adaptCartoonSeriesToCinemaItem = adaptCartoonToCinemaItem;

export async function resolveCartoonEpisodes(
  series: CartoonSeriesItem | undefined,
): Promise<CartoonEpisodeStream[]> {
  if (!series || series.archiveIds.length === 0) return [];
  try {
    return await resolveArchiveIdentifierStreams(
      series.archiveIds[0],
      series.titleAr,
    );
  } catch {
    return [];
  }
}

export async function buildCartoonEpisodesList(
  series: CartoonSeriesItem | undefined,
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
  resolvedEpisodes?: CartoonEpisodeStream[],
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

  const options = buildCartoonPlayOptions(series, epNum, matchedStream);
  options.forEach((opt) => {
    if (!opt.url || seenUrls.has(opt.url)) return;
    seenUrls.add(opt.url);
    const isDirectMp4 =
      opt.kind === 'archive-primary' || opt.kind === 'archive-mirror';
    const isArchiveHost = opt.url.includes('archive.org');
    sources.push({
      id: `${opt.id}-${series.id}-ep${epNum}`,
      label: opt.label,
      host: isArchiveHost ? 'archive.org' : 'spacetoon-source',
      url: opt.url,
      isDirect: isDirectMp4,
      origins: ['https://archive.org', 'https://vidlink.pro', 'https://player.videasy.net'],
      timeoutMs: 12000,
    });
  });

  return sources;
}

export const buildCartoonPlaySources = buildCartoonPlaySourcesSync;
