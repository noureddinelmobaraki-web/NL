import type React from "react";
import { WORKER_ENDPOINT } from "../../services/videoExtractor";

export const TMDB_BASE_URL = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export interface CacheEntry {
  d: any;
  t: number;
}
export const MEMORY_CACHE: Record<string, CacheEntry> = {};
export const IN_FLIGHT: Record<string, Promise<any> | undefined> = {};

export async function fetchWithCache(
  url: string,
  signal?: AbortSignal,
  ttlMs = 3600_000 * 24,
): Promise<any> {
  const key = `cache_v2_${url.replace(/([?&])api_key=[^&]*/i, "$1api_key=_")}`;
  const now = Date.now();
  const fresh = (t: number) => now - t < ttlMs;

  const revalidate = (): Promise<any> => {
    if (IN_FLIGHT[key]) return IN_FLIGHT[key]!;
    const p = (async () => {
      try {
        const res = await fetch(url, {
          signal: signal ?? AbortSignal.timeout(10_000),
        });
        if (!res.ok) throw new Error("TMDB network response failed");
        const d = await res.json();
        const entry = { d, t: Date.now() };
        MEMORY_CACHE[key] = entry;
        if (!/\/search\//.test(url)) {
          try {
            localStorage.setItem(key, JSON.stringify(entry));
          } catch {}
        }
        return d;
      } finally {
        delete IN_FLIGHT[key];
      }
    })();
    IN_FLIGHT[key] = p;
    return p;
  };

  if (MEMORY_CACHE[key]) {
    if (!fresh(MEMORY_CACHE[key].t)) revalidate().catch(() => {});
    return MEMORY_CACHE[key].d;
  }

  try {
    const local = localStorage.getItem(key);
    if (local) {
      const parsed = JSON.parse(local) as CacheEntry;
      MEMORY_CACHE[key] = parsed;
      if (!fresh(parsed.t)) revalidate().catch(() => {});
      return parsed.d;
    }
  } catch {}

  return revalidate();
}

export type Media = "movie" | "tv";

export interface CastMember {
  id?: number;
  name: string;
  character: string;
  profilePath: string;
}

export interface ActorDetails {
  id: number;
  name: string;
  character?: string;
  profilePath: string;
  biography: string;
  birthday?: string;
  placeOfBirth?: string;
  knownForDepartment?: string;
  knownWorks: {
    id: number;
    mediaType: Media;
    title: string;
    posterPath: string;
    year: string;
    rating: number;
  }[];
}

export interface CinemaItem {
  id: number;
  mediaType: Media;
  title: string;
  overview: string;
  posterPath: string;
  backdropPath: string;
  year: string;
  releaseDate?: string;
  rating: number;
  voteCount?: number;
  genreIds: number[];
  genreNames: string[];
  trailerKey: string;
  imdbId?: string;
  runtime?: number;
  seasons?: number;
  episodes?: number;
  tagline?: string;
  status?: string;
  originalLanguage?: string;
  certification?: string;
  rottenTomatoes?: string;
  metascore?: string;
  awards?: string;
  boxOffice?: string;
  budget?: number;
  revenue?: number;
  directors?: string[];
  productionCompanies?: { id: number; name: string; logoPath: string }[];
  cast: CastMember[];
  similar: CinemaItem[];
}

const USE_WORKER_META = import.meta.env.VITE_USE_WORKER_META === "1";

export interface OmdbEnrichedMeta {
  imdbRating?: string;
  imdbVotes?: string;
  metascore?: string;
  rottenTomatoes?: string;
  rated?: string;
  runtime?: string;
  awards?: string;
  boxOffice?: string;
  director?: string;
  writer?: string;
  actors?: string;
  language?: string;
  country?: string;
}

export const OMDB_CACHE: Record<string, OmdbEnrichedMeta | null> = {};
export const OMDB_STORAGE_PREFIX = "nl_omdb_v1_";

export async function fetchOmdbMeta(
  imdbId: string,
  omdbKey?: string,
): Promise<OmdbEnrichedMeta | null> {
  const cleanId = (imdbId || "").trim();
  if (!/^tt\d{5,10}$/i.test(cleanId)) return null;

  if (cleanId in OMDB_CACHE) {
    return OMDB_CACHE[cleanId];
  }

  try {
    const rawStorage = localStorage.getItem(OMDB_STORAGE_PREFIX + cleanId);
    if (rawStorage) {
      const parsed = JSON.parse(rawStorage);
      if (parsed && typeof parsed === "object") {
        OMDB_CACHE[cleanId] = parsed;
        return parsed;
      }
    }
  } catch {
    // ignore localStorage parse error
  }

  const cleanVal = (v: unknown): string | undefined =>
    typeof v === "string" && v.trim() && v.trim() !== "N/A"
      ? v.trim()
      : undefined;

  const saveToCache = (result: OmdbEnrichedMeta | null) => {
    OMDB_CACHE[cleanId] = result;
    if (result) {
      try {
        localStorage.setItem(
          OMDB_STORAGE_PREFIX + cleanId,
          JSON.stringify(result),
        );
      } catch {
        // ignore quota error
      }
    }
    return result;
  };

  if (USE_WORKER_META) {
    try {
      const r = await fetch(
        `${WORKER_ENDPOINT}meta/omdb?i=${encodeURIComponent(cleanId)}`,
        { signal: AbortSignal.timeout(3500) },
      );
      if (r.ok) {
        const d: any = await r.json();
        const res: OmdbEnrichedMeta = {
          imdbRating: cleanVal(d?.imdbRating),
          imdbVotes: cleanVal(d?.imdbVotes),
          metascore: cleanVal(d?.metascore),
          rottenTomatoes: cleanVal(d?.rottenTomatoes),
          rated: cleanVal(d?.rated),
          runtime: cleanVal(d?.runtime),
          awards: cleanVal(d?.awards),
          boxOffice: cleanVal(d?.boxOffice),
          director: cleanVal(d?.director),
          writer: cleanVal(d?.writer),
          actors: cleanVal(d?.actors),
          language: cleanVal(d?.language),
          country: cleanVal(d?.country),
        };
        return saveToCache(res);
      }
    } catch {
      // fall through to direct OMDb if key exists
    }
  }

  if (!omdbKey) return saveToCache(null);
  try {
    const r = await fetch(
      `${window.location.protocol}//www.omdbapi.com/?i=${encodeURIComponent(cleanId)}&apikey=${encodeURIComponent(omdbKey)}`,
      { signal: AbortSignal.timeout(3500) },
    );
    if (!r.ok) return saveToCache(null);
    const d: any = await r.json();
    if (!d || d.Response === "False") return saveToCache(null);
    const rt = Array.isArray(d.Ratings)
      ? d.Ratings.find((x: any) => x?.Source === "Rotten Tomatoes")?.Value
      : undefined;
    const res: OmdbEnrichedMeta = {
      imdbRating: cleanVal(d.imdbRating),
      imdbVotes: cleanVal(d.imdbVotes),
      metascore: cleanVal(d.Metascore ?? d.metascore),
      rottenTomatoes: cleanVal(rt ?? d.rottenTomatoes),
      rated: cleanVal(d.Rated ?? d.rated),
      runtime: cleanVal(d.Runtime ?? d.runtime),
      awards: cleanVal(d.Awards ?? d.awards),
      boxOffice: cleanVal(d.BoxOffice ?? d.boxOffice),
      director: cleanVal(d.Director ?? d.director),
      writer: cleanVal(d.Writer ?? d.writer),
      actors: cleanVal(d.Actors ?? d.actors),
      language: cleanVal(d.Language ?? d.language),
      country: cleanVal(d.Country ?? d.country),
    };
    return saveToCache(res);
  } catch (omdbErr) {
    console.warn("Could not fetch ratings from OMDB API:", omdbErr);
    return saveToCache(null);
  }
}

const pick = (v: any, lang: string): string => {
  if (!v) return "";
  if (typeof v === "string") return v;
  return v[lang] || v.en || "";
};

export function normalizeItem(
  raw: any,
  mediaType: Media,
  lang: string,
): CinemaItem {
  const isTv = mediaType === "tv";
  const genreObjs =
    Array.isArray(raw.genres) && typeof raw.genres[0] === "object"
      ? raw.genres
      : null;
  const genreNames = genreObjs
    ? genreObjs.map((g: any) => g.name)
    : Array.isArray(raw.genres)
      ? raw.genres
      : [];
  const genreIds = genreObjs
    ? genreObjs.map((g: any) => g.id)
    : Array.isArray(raw.genre_ids)
      ? raw.genre_ids
      : [];
  const trailerKey =
    raw.videos?.results?.find(
      (v: any) => v.site === "YouTube" && v.type === "Trailer",
    )?.key ||
    raw.videos?.results?.find((v: any) => v.site === "YouTube")?.key ||
    raw.trailer_key ||
    raw.trailerKey ||
    "";

  const rawTitle =
    pick(isTv ? (raw.name ?? raw.title) : (raw.title ?? raw.name), lang) ||
    "Unknown Title";
  let rawOverview = pick(raw.overview, lang);
  if (!rawOverview || rawOverview.trim() === "") {
    if (lang === "ar") rawOverview = "Synopsis currently unavailable.";
    else if (lang === "fr") rawOverview = "Synopsis non disponible.";
    else rawOverview = "Overview not available.";
  }

  const fullReleaseDate = String(
    isTv
      ? raw.first_air_date || raw.year || ""
      : raw.release_date || raw.year || "",
  );

  const directors: string[] = [];
  if (Array.isArray(raw.credits?.crew)) {
    raw.credits.crew
      .filter((c: any) => c.job === "Director" || c.job === "Executive Producer")
      .slice(0, 3)
      .forEach((c: any) => {
        if (c.name && !directors.includes(c.name)) directors.push(c.name);
      });
  }
  if (Array.isArray(raw.created_by)) {
    raw.created_by.forEach((c: any) => {
      if (c.name && !directors.includes(c.name)) directors.push(c.name);
    });
  }

  const prodSources = [
    ...(Array.isArray(raw.production_companies) ? raw.production_companies : []),
    ...(Array.isArray(raw.networks) ? raw.networks : []),
  ];
  const productionCompanies = prodSources.slice(0, 5).map((p: any) => ({
    id: p.id,
    name: p.name,
    logoPath: p.logo_path || "",
  }));

  let certification = "";
  if (Array.isArray(raw.release_dates?.results)) {
    const usRel =
      raw.release_dates.results.find((r: any) => r.iso_3166_1 === "US") ||
      raw.release_dates.results[0];
    const certObj = usRel?.release_dates?.find((d: any) => d.certification);
    if (certObj?.certification) certification = certObj.certification;
  }

  return {
    id: raw.id,
    mediaType,
    title: rawTitle,
    overview: rawOverview,
    posterPath: raw.poster_path || raw.posterPath || "",
    backdropPath: raw.backdrop_path || raw.backdropPath || "",
    year: fullReleaseDate.split("-")[0],
    releaseDate: fullReleaseDate || undefined,
    rating:
      typeof raw.vote_average === "number"
        ? raw.vote_average
        : typeof raw.rating === "number"
          ? raw.rating
          : 0,
    voteCount: typeof raw.vote_count === "number" ? raw.vote_count : undefined,
    genreIds,
    genreNames,
    trailerKey,
    imdbId: raw.imdb_id || raw.imdbId || raw.external_ids?.imdb_id,
    runtime:
      raw.runtime ||
      (Array.isArray(raw.episode_run_time)
        ? raw.episode_run_time[0]
        : undefined) ||
      raw.duration,
    seasons: raw.number_of_seasons || raw.seasons,
    episodes: raw.number_of_episodes || raw.episodes,
    tagline:
      typeof raw.tagline === "string" && raw.tagline.trim()
        ? raw.tagline.trim()
        : undefined,
    status: typeof raw.status === "string" ? raw.status : undefined,
    originalLanguage:
      typeof raw.original_language === "string"
        ? raw.original_language.toUpperCase()
        : undefined,
    certification: certification || undefined,
    budget:
      typeof raw.budget === "number" && raw.budget > 0 ? raw.budget : undefined,
    revenue:
      typeof raw.revenue === "number" && raw.revenue > 0
        ? raw.revenue
        : undefined,
    directors: directors.length > 0 ? directors : undefined,
    productionCompanies:
      productionCompanies.length > 0 ? productionCompanies : undefined,
    cast: (raw.credits?.cast || raw.cast || []).slice(0, 12).map((c: any) => ({
      id: c.id,
      name: c.name,
      character: c.character || "",
      profilePath: c.profile_path || c.profilePath || "",
    })),
    similar: (raw.similar?.results || raw.similar || [])
      .slice(0, 10)
      .map((s: any) => normalizeItem(s, mediaType, lang)),
  };
}

export const getBackdropSrc_static = (
  path: string | null | undefined,
  trailerKey?: string,
  posterPath?: string,
) => {
  if (path) {
    if (path.startsWith("http")) return path;
    return `${TMDB_IMAGE_BASE}/w1280${path}`;
  }
  if (posterPath) {
    if (posterPath.startsWith("http")) return posterPath;
    return `${TMDB_IMAGE_BASE}/w780${posterPath}`;
  }
  if (trailerKey) {
    return `https://i.ytimg.com/vi/${trailerKey}/hqdefault.jpg`;
  }
  return "https://noureddinelmobaraki-web.github.io/nl-audio-cdn/bioBG_poster.webp";
};

export const getPosterSrc_static = (
  path: string | null | undefined,
  trailerKey?: string,
  backdropPath?: string,
) => {
  if (path) {
    if (path.startsWith("http")) return path;
    return `${TMDB_IMAGE_BASE}/w500${path}`;
  }
  if (backdropPath) {
    if (backdropPath.startsWith("http")) return backdropPath;
    return `${TMDB_IMAGE_BASE}/w500${backdropPath}`;
  }
  if (trailerKey) {
    return `https://i.ytimg.com/vi/${trailerKey}/hqdefault.jpg`;
  }
  return "https://noureddinelmobaraki-web.github.io/nl-audio-cdn/bioBG_poster.webp";
};

export const MOVIE_ROW_SCROLL_STYLE: React.CSSProperties = {
  scrollbarWidth: "none",
  msOverflowStyle: "none",
  scrollSnapType: "x mandatory",
};
