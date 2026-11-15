import {
  TMDB_BASE_URL,
  fetchWithCache,
  normalizeItem,
  type CinemaItem,
  type Media,
} from "../moviesDataClient";
import { FALLBACK_MOVIES } from "../CuratedFallback";
import { FALLBACK_SERIES } from "../../Series/CuratedFallback";
import type { ShelfDefinition } from "../../../services/catalog/CatalogOrchestrator";

const NO_ANIM_AND_BW = "&without_genres=16&without_keywords=9016|156866&include_adult=false";

function filterLiveActionList(rawList: any[], mediaType: Media): CinemaItem[] {
  return (rawList || [])
    .filter(
      (r: any) =>
        !(Array.isArray(r?.genre_ids) && r.genre_ids.includes(16)) &&
        !(
          Array.isArray(r?.genres) &&
          r.genres.some((g: any) =>
            typeof g === "string"
              ? g.toLowerCase() === "animation"
              : g?.id === 16 || String(g?.name || "").toLowerCase() === "animation",
          )
        ),
    )
    .map((r: any) => ({ ...normalizeItem(r, mediaType, "en"), hub: "movies" as const }))
    .filter((item) => Boolean(item.posterPath || item.backdropPath));
}

async function fetchTmdbShelf(
  endpointAndParams: string,
  mediaType: Media,
  tmdbKey: string,
  page: number,
): Promise<CinemaItem[]> {
  if (!tmdbKey) {
    const fb = mediaType === "tv" ? FALLBACK_SERIES : FALLBACK_MOVIES;
    return filterLiveActionList(fb, mediaType);
  }
  const sep = endpointAndParams.includes("?") ? "&" : "?";
  const url = `${TMDB_BASE_URL}${endpointAndParams}${sep}api_key=${tmdbKey}&language=en-US&page=${page}`;
  try {
    const data = await fetchWithCache(url);
    return filterLiveActionList(data?.results || [], mediaType);
  } catch {
    return page === 1
      ? filterLiveActionList(mediaType === "tv" ? FALLBACK_SERIES : FALLBACK_MOVIES, mediaType)
      : [];
  }
}

export function createTmdbMovieShelves(tmdbKey: string): ShelfDefinition<CinemaItem>[] {
  const specs: Array<{ id: string; title: string; path: string }> = [
    {
      id: "movies-trending-week",
      title: "Trending This Week",
      path: `/trending/movie/week?without_genres=16`,
    },
    {
      id: "movies-now-playing",
      title: "Now Playing in Theaters",
      path: `/movie/now_playing?without_genres=16`,
    },
    {
      id: "movies-acclaimed-2020s",
      title: "Critically Acclaimed 2020s",
      path: `/discover/movie?primary_release_date.gte=2020-01-01&vote_count.gte=1200&sort_by=vote_average.desc${NO_ANIM_AND_BW}`,
    },
    {
      id: "movies-mind-bending-scifi",
      title: "Mind-Bending Sci-Fi & Cyberpunk",
      path: `/discover/movie?with_genres=878&primary_release_date.gte=1975-01-01&vote_count.gte=800&sort_by=popularity.desc${NO_ANIM_AND_BW}`,
    },
    {
      id: "movies-psychological-thrillers",
      title: "Psychological Thrillers & Neo-Mystery",
      path: `/discover/movie?with_genres=53,9648&primary_release_date.gte=1980-01-01&vote_count.gte=700&sort_by=vote_average.desc${NO_ANIM_AND_BW}`,
    },
    {
      id: "movies-heist-crime",
      title: "High-Stakes Heist & Crime",
      path: `/discover/movie?with_genres=80&primary_release_date.gte=1972-01-01&vote_count.gte=900&sort_by=popularity.desc${NO_ANIM_AND_BW}`,
    },
    {
      id: "movies-modern-horror",
      title: "Modern Supernatural & Folk Horror",
      path: `/discover/movie?with_genres=27&primary_release_date.gte=2010-01-01&vote_count.gte=600&sort_by=vote_average.desc${NO_ANIM_AND_BW}`,
    },
    {
      id: "movies-epic-historical-war",
      title: "Epic Historical & War",
      path: `/discover/movie?with_genres=36|10752&primary_release_date.gte=1970-01-01&vote_count.gte=600&sort_by=vote_average.desc${NO_ANIM_AND_BW}`,
    },
    {
      id: "movies-korean-wave",
      title: "Korean New Wave Cinema",
      path: `/discover/movie?with_original_language=ko&primary_release_date.gte=1998-01-01&vote_count.gte=300&sort_by=vote_average.desc${NO_ANIM_AND_BW}`,
    },
    {
      id: "movies-european-festival",
      title: "European Arthouse & Festival Winners",
      path: `/discover/movie?with_original_language=fr|it|es|de|da|sv&primary_release_date.gte=1975-01-01&vote_count.gte=400&sort_by=vote_average.desc${NO_ANIM_AND_BW}`,
    },
    {
      id: "movies-arabic-mena",
      title: "Arabic & Middle Eastern Cinema",
      path: `/discover/movie?with_original_language=ar&primary_release_date.gte=1975-01-01&vote_count.gte=40&sort_by=popularity.desc${NO_ANIM_AND_BW}`,
    },
    {
      id: "movies-90s-2000s-cult",
      title: "90s & 2000s Cult Classics",
      path: `/discover/movie?primary_release_date.gte=1990-01-01&primary_release_date.lte=2009-12-31&vote_count.gte=2500&sort_by=vote_average.desc${NO_ANIM_AND_BW}`,
    },
    {
      id: "movies-70s-80s-new-hollywood",
      title: "70s & 80s New Hollywood Color Icons",
      path: `/discover/movie?primary_release_date.gte=1970-01-01&primary_release_date.lte=1989-12-31&vote_count.gte=1500&sort_by=vote_average.desc${NO_ANIM_AND_BW}`,
    },
    {
      id: "movies-martial-arts-east-asian",
      title: "Martial Arts & East Asian Action",
      path: `/discover/movie?with_genres=28&with_original_language=zh|cn|ja&primary_release_date.gte=1972-01-01&vote_count.gte=250&sort_by=vote_average.desc${NO_ANIM_AND_BW}`,
    },
    {
      id: "movies-indie-comedies",
      title: "Sharp Dark Comedies & Satire",
      path: `/discover/movie?with_genres=35,18&primary_release_date.gte=1985-01-01&vote_count.gte=900&sort_by=vote_average.desc${NO_ANIM_AND_BW}`,
    },
    {
      id: "movies-documentaries",
      title: "Investigative & Nature Documentaries",
      path: `/discover/movie?with_genres=99&primary_release_date.gte=1990-01-01&vote_count.gte=250&sort_by=vote_average.desc${NO_ANIM_AND_BW}`,
    },
    {
      id: "movies-fantasy-adventure",
      title: "Grand Adventure & Mythic Worlds",
      path: `/discover/movie?with_genres=12,14&primary_release_date.gte=1977-01-01&vote_count.gte=1500&sort_by=popularity.desc${NO_ANIM_AND_BW}`,
    },
  ];

  return specs.map((s) => ({
    id: s.id,
    title: s.title,
    fetcher: (page: number) => fetchTmdbShelf(s.path, "movie", tmdbKey, page),
  }));
}

export function createTmdbSeriesShelves(tmdbKey: string): ShelfDefinition<CinemaItem>[] {
  const specs: Array<{ id: string; title: string; path: string }> = [
    {
      id: "tv-prestige-drama",
      title: "Prestige Drama Series",
      path: `/discover/tv?with_genres=18&without_genres=16&first_air_date.gte=1999-01-01&vote_count.gte=800&sort_by=vote_average.desc`,
    },
    {
      id: "tv-crime-mystery",
      title: "Crime & Mystery Limited Series",
      path: `/discover/tv?with_genres=80,9648&without_genres=16&first_air_date.gte=2000-01-01&vote_count.gte=500&sort_by=vote_average.desc`,
    },
    {
      id: "tv-scifi-fantasy",
      title: "Sci-Fi & Speculative Worlds",
      path: `/discover/tv?with_genres=10765&without_genres=16&first_air_date.gte=1990-01-01&vote_count.gte=600&sort_by=popularity.desc`,
    },
    {
      id: "tv-international-thrillers",
      title: "Global Non-English Series",
      path: `/discover/tv?without_original_language=en&without_genres=16&first_air_date.gte=2010-01-01&vote_count.gte=250&sort_by=vote_average.desc`,
    },
    {
      id: "tv-trending-now",
      title: "Trending TV Shows This Week",
      path: `/trending/tv/week?without_genres=16`,
    },
  ];

  return specs.map((s) => ({
    id: s.id,
    title: s.title,
    fetcher: (page: number) => fetchTmdbShelf(s.path, "tv", tmdbKey, page),
  }));
}
