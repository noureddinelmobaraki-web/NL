import type { CinemaItem } from '../../../components/Movies/moviesDataClient';
import type { PlaySource } from '../../../components/Movies/MovieSourcesModal';
import type { AnimeItem, AnimeAudioMode } from '../types/anime.types';
import { buildAnimeSources } from '../services/animeEmbedBuilder';

export function getAnimeNumericId(anime: AnimeItem, index: number): number {
  return anime.tmdbId || anime.malId || anime.anilistId || anime.kitsuId || 700000 + index;
}

export function adaptAnimeItemToCinemaItem(anime: AnimeItem, index: number): CinemaItem {
  return {
    id: getAnimeNumericId(anime, index),
    mediaType: anime.format === 'MOVIE' ? 'movie' : 'tv',
    title: anime.titleAr || anime.title || anime.titleRomaji || 'Anime',
    overview:
      anime.synopsisAr ||
      anime.synopsis ||
      'أنمي ياباني مترجم ومدبلج بجودة عالية عبر سيرفرات البث المباشر وسيدكس.',
    posterPath: anime.posterUrl,
    backdropPath: anime.bannerUrl || anime.posterUrl,
    rating: anime.score > 0 ? anime.score : 8.4,
    year: String(anime.year || 2025),
    genreIds: [16],
    genreNames: anime.genres?.length ? anime.genres : ['Anime', 'Animation'],
    seasons: 1,
    episodes: anime.episodesCount || 24,
    trailerKey: anime.trailerYoutubeId || '',
    imdbId: anime.imdbId,
    productionCompanies: (anime.studios?.length ? anime.studios : ['Japan Animation Studio']).map(
      (name, idx) => ({ id: idx + 1, name, logoPath: '' })
    ),
    cast: [],
    similar: [],
  };
}

export function buildAnimeCinemaPlaySources(
  anime: AnimeItem | undefined,
  episodeNumber: number,
  audioMode: AnimeAudioMode
): PlaySource[] {
  if (!anime) return [];
  const servers = buildAnimeSources({
    ids: {
      malId: anime.malId,
      anilistId: anime.anilistId,
      kitsuId: anime.kitsuId,
      tmdbId: anime.tmdbId,
      imdbId: anime.imdbId,
    },
    courEpisode: episodeNumber,
    mode: audioMode,
    isMovie: anime.format === 'MOVIE',
  });

  return servers.map((srv) => ({
    id: srv.id,
    label: srv.label,
    host: srv.host,
    url: srv.url,
    origins: [`https://${srv.host}`],
    timeoutMs: srv.timeoutMs || 12000,
  }));
}
