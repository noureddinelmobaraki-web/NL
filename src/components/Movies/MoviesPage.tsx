import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Search,
  Volume2,
  VolumeX,
  Play,
  Info,
  ChevronLeft,
  ChevronRight,
  Star,
  Film,
  Tv,
  Heart,
  Eye,
  Bookmark,
  Calendar,
  Globe2,
  Award,
  Users,
  Sparkles,
  MapPin,
  Maximize2,
  Minimize2,
  Layers,
  RefreshCw,
  AlertTriangle,
  Subtitles,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { m, AnimatePresence } from "framer-motion";
import { useAppContext } from "../../context/AppContext";
import { useMovieItems } from "../../features/account/useMovieItems";
import { useAuth } from "../../context/AuthContext";
import { useDeviceType } from "../../hooks/useDeviceType";
import { useMoviesMusic } from "./useMoviesMusic";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { FALLBACK_MOVIES, FALLBACK_GENRES } from "./CuratedFallback";
import { FALLBACK_SERIES, FALLBACK_SERIES_GENRES } from "../Series/CuratedFallback";
import { normLang, tmdbLang } from "../../utils/lang";
import { PUBLIC_TMDB_KEY, PUBLIC_OMDB_KEY } from "../../config/publicKeys";
import "../../styles/components/cinema.css";
import {
  ServerBranchesInline,
  useResolvedImdbSources,
  type PlaySource,
} from "./MovieSourcesModal";
import Hls from "hls.js";
import {
  WORKER_ENDPOINT,
  buildWorkerProxyUrl,
  fetchExtractedVideos,
  guessLangFromLabelOrUrl,
  type ExtractedSubtitleTrack,
  type ExtractedVideoStream,
  type SubtitleCue,
} from "../../services/videoExtractor";
import {
  autoRetimeCues,
  hlsTracksToSubtitleTracks,
  mergeStreamFirst,
} from "../../features/cinema/subtitles/streamSubtitles";
import {
  createLocalSubtitleTrack,
  ensureTrackLoaded,
  fetchExternalSubtitles,
  revokeSubtitleBlobUrls,
} from "../../services/subtitleService";
import {
  buildSpeedSortedQueue,
  recordServerFailure,
  recordServerSuccess,
} from "../../services/serverSpeedMonitor";
import { EyeLoader } from "./EyeLoader";
import { useTopMovies } from "./useTopMovies";
import { logPlay } from "../../features/music/data/playTracking";
import {
  ALL_SERVER_FRAME_ORIGINS,
  toWorkerEmbedUrl,
  type CinemaServerConfig,
} from "../../config/servers";
import {
  bindVideoElementToClock,
  clockAnchor,
  clockGetState,
  clockNow,
  clockReport,
  clockReportedNow,
  clockReset,
  clockSync,
  useClockState,
} from "../../features/cinema/player/playbackClock";
import {
  sendIframePlayerCommand,
  useIframePlayerBridge,
} from "../../features/cinema/player/iframeBridge";
import {
  createSyncController,
  type SyncController,
} from "../../features/cinema/player/syncController";
import {
  CinemaTimeline,
  type PlayerControlMode,
} from "../../features/cinema/player/CinemaTimeline";
import { SubtitleOverlay } from "../../features/cinema/subtitles/SubtitleOverlay";
import { SubtitleSettingsPanel } from "../../features/cinema/subtitles/SubtitleSettingsPanel";
import {
  resolveTrailer,
  type TrailerSource,
} from "../../services/trailerService";
import {
  getProgress,
  removeProgress,
  saveProgress,
  useContinueWatching,
} from "../../features/cinema/progress/progressStore";

function NLLogo() {
  return <span className="nl-logo" aria-label="NL" role="img">NL</span>;
}

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

interface CacheEntry {
  d: any;
  t: number;
}
const MEMORY_CACHE: Record<string, CacheEntry> = {};
const IN_FLIGHT: Record<string, Promise<any> | undefined> = {};

export async function fetchWithCache(url: string, signal?: AbortSignal, ttlMs = 3600_000 * 24): Promise<any> {
  const key = `cache_v2_${url.replace(/([?&])api_key=[^&]*/i, '$1api_key=_')}`;
  const now = Date.now();
  const fresh = (t: number) => now - t < ttlMs;

  const revalidate = (): Promise<any> => {
    if (IN_FLIGHT[key]) return IN_FLIGHT[key]!;
    const p = (async () => {
      try {
        const res = await fetch(url, { signal: signal ?? AbortSignal.timeout(10_000) });
        if (!res.ok) throw new Error("TMDB network response failed");
        const d = await res.json();
        const entry = { d, t: Date.now() };
        MEMORY_CACHE[key] = entry;
        if (!/\/search\//.test(url)) {
          try { localStorage.setItem(key, JSON.stringify(entry)); } catch {}
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
    if (!fresh(MEMORY_CACHE[key].t)) revalidate().catch(()=>{});
    return MEMORY_CACHE[key].d;
  }

  try {
    const local = localStorage.getItem(key);
    if (local) {
      const parsed = JSON.parse(local) as CacheEntry;
      MEMORY_CACHE[key] = parsed;
      if (!fresh(parsed.t)) revalidate().catch(()=>{});
      return parsed.d;
    }
  } catch {}

  return revalidate();
}

type Media = 'movie' | 'tv';

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

interface OmdbEnrichedMeta {
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

const OMDB_CACHE: Record<string, OmdbEnrichedMeta | null> = {};
const OMDB_STORAGE_PREFIX = "nl_omdb_v1_";

async function fetchOmdbMeta(
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
        localStorage.setItem(OMDB_STORAGE_PREFIX + cleanId, JSON.stringify(result));
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
  if (!v) return '';
  if (typeof v === 'string') return v;
  return v[lang] || v.en || '';
};

export function normalizeItem(raw: any, mediaType: Media, lang: string): CinemaItem {
  const isTv = mediaType === 'tv';
  const genreObjs = Array.isArray(raw.genres) && typeof raw.genres[0] === 'object' ? raw.genres : null;
  const genreNames = genreObjs ? genreObjs.map((g: any) => g.name)
    : Array.isArray(raw.genres) ? raw.genres : [];
  const genreIds = genreObjs ? genreObjs.map((g: any) => g.id)
    : Array.isArray(raw.genre_ids) ? raw.genre_ids : [];
  const trailerKey =
    raw.videos?.results?.find((v: any) => v.site === 'YouTube' && v.type === 'Trailer')?.key
    || raw.videos?.results?.find((v: any) => v.site === 'YouTube')?.key
    || raw.trailer_key || raw.trailerKey || '';

  const rawTitle = pick(isTv ? (raw.name ?? raw.title) : (raw.title ?? raw.name), lang) || "Unknown Title";
  let rawOverview = pick(raw.overview, lang);
  if (!rawOverview || rawOverview.trim() === '') {
    if (lang === 'ar') rawOverview = "Synopsis currently unavailable.";
    else if (lang === 'fr') rawOverview = "Synopsis non disponible.";
    else rawOverview = "Overview not available.";
  }

  const fullReleaseDate = String(isTv ? (raw.first_air_date || raw.year || '') : (raw.release_date || raw.year || ''));

  const directors: string[] = [];
  if (Array.isArray(raw.credits?.crew)) {
    raw.credits.crew
      .filter((c: any) => c.job === 'Director' || c.job === 'Executive Producer')
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
    logoPath: p.logo_path || '',
  }));

  let certification = '';
  if (Array.isArray(raw.release_dates?.results)) {
    const usRel =
      raw.release_dates.results.find((r: any) => r.iso_3166_1 === 'US') ||
      raw.release_dates.results[0];
    const certObj = usRel?.release_dates?.find((d: any) => d.certification);
    if (certObj?.certification) certification = certObj.certification;
  }

  return {
    id: raw.id,
    mediaType,
    title: rawTitle,
    overview: rawOverview,
    posterPath: raw.poster_path || raw.posterPath || '',
    backdropPath: raw.backdrop_path || raw.backdropPath || '',
    year: fullReleaseDate.split('-')[0],
    releaseDate: fullReleaseDate || undefined,
    rating: typeof raw.vote_average === 'number' ? raw.vote_average : (typeof raw.rating === 'number' ? raw.rating : 0),
    voteCount: typeof raw.vote_count === 'number' ? raw.vote_count : undefined,
    genreIds,
    genreNames,
    trailerKey,
    imdbId: raw.imdb_id || raw.imdbId || raw.external_ids?.imdb_id,
    runtime: raw.runtime || (Array.isArray(raw.episode_run_time) ? raw.episode_run_time[0] : undefined) || raw.duration,
    seasons: raw.number_of_seasons || raw.seasons,
    episodes: raw.number_of_episodes || raw.episodes,
    tagline: typeof raw.tagline === 'string' && raw.tagline.trim() ? raw.tagline.trim() : undefined,
    status: typeof raw.status === 'string' ? raw.status : undefined,
    originalLanguage: typeof raw.original_language === 'string' ? raw.original_language.toUpperCase() : undefined,
    certification: certification || undefined,
    budget: typeof raw.budget === 'number' && raw.budget > 0 ? raw.budget : undefined,
    revenue: typeof raw.revenue === 'number' && raw.revenue > 0 ? raw.revenue : undefined,
    directors: directors.length > 0 ? directors : undefined,
    productionCompanies: productionCompanies.length > 0 ? productionCompanies : undefined,
    cast: (raw.credits?.cast || raw.cast || []).slice(0, 12).map((c: any) => ({
      id: c.id,
      name: c.name,
      character: c.character || '',
      profilePath: c.profile_path || c.profilePath || '',
    })),
    similar: (raw.similar?.results || raw.similar || []).slice(0, 10).map((s: any) => normalizeItem(s, mediaType, lang)),
  };
}

const getBackdropSrc_static = (
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
  return "/bioBG_poster.webp";
};

const getPosterSrc_static = (
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
  return "/bioBG_poster.webp";
};

const MOVIE_ROW_SCROLL_STYLE: React.CSSProperties = {
  scrollbarWidth: "none",
  msOverflowStyle: "none",
  scrollSnapType: "x mandatory",
};

const MoviePosterCard = React.memo(
  ({
    item,
    isTouch,
    activeHoverId,
    setActiveHoverId,
    hoverTimer,
    setSelectedItemId,
    onQuickWatch,
    t,
    isFavorite,
    progressRatio,
    episodeBadge,
    onRemoveProgress,
  }: {
    item: CinemaItem;
    isTouch: boolean;
    activeHoverId: number | null;
    setActiveHoverId: (id: number | null) => void;
    hoverTimer: React.MutableRefObject<any>;
    setSelectedItemId: (id: number | null, mediaType?: Media) => void;
    onQuickWatch?: (item: CinemaItem) => void;
    t: any;
    isFavorite?: boolean;
    progressRatio?: number;
    episodeBadge?: string;
    onRemoveProgress?: () => void;
  }) => {
    const cardRef = useRef<HTMLDivElement | null>(null);
    const [hovered, setHovered] = useState(false);

    const handleMouseEnter = useCallback(() => {
      if (isTouch) return;
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
      setHovered(true);
      setActiveHoverId(item.id);
    }, [isTouch, hoverTimer, item.id, setActiveHoverId]);

    const handleMouseLeave = useCallback(() => {
      if (isTouch) return;
      hoverTimer.current = setTimeout(() => {
        setHovered(false);
        setActiveHoverId(null);
      }, 180);
    }, [isTouch, hoverTimer, setActiveHoverId]);

    useEffect(() => {
      if (activeHoverId !== item.id) {
        setHovered(false);
      }
    }, [activeHoverId, item.id]);

    const isZoomed = hovered && activeHoverId === item.id && !isTouch;
    const fallbackGenText = item.genreNames.slice(0, 2).join(" · ") || "Cinema";
    const posterUrl = getPosterSrc_static(
      item.posterPath,
      item.trailerKey,
      item.backdropPath,
    );

    return (
      <div
        ref={cardRef}
        role="button"
        tabIndex={0}
        aria-label={item.title}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => setSelectedItemId(item.id, item.mediaType)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setSelectedItemId(item.id, item.mediaType);
          }
        }}
        className={`nl-poster relative w-[116px] sm:w-[154px] md:w-[176px] aspect-[2/3] overflow-hidden cursor-pointer select-none flex-shrink-0 snap-start ${
          isZoomed ? "nl-poster--hovered" : ""
        }`}
      >
        {/* Top-left Favorite Heart Badge */}
        {isFavorite && (
          <span
            className="absolute top-2 left-2 z-20 flex items-center justify-center w-6 h-6 rounded-full bg-red-600/90 border border-white/40 shadow-md"
            aria-label="Favorited"
          >
            <Heart size={11} strokeWidth={2.5} fill="white" color="white" />
          </span>
        )}

        {/* Episode badge or Remove button for Continue Watching */}
        {episodeBadge && !isFavorite && (
          <span className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded-full bg-black/70 border border-white/25 text-[9.5px] font-black text-white shadow">
            {episodeBadge}
          </span>
        )}

        {onRemoveProgress && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemoveProgress();
            }}
            aria-label={t("movies.close")}
            title={t("movies.close")}
            className="absolute top-2 right-2 z-30 w-6 h-6 rounded-full bg-black/75 hover:bg-rose-600 border border-white/30 text-white flex items-center justify-center text-xs font-black cursor-pointer shadow"
          >
            ×
          </button>
        )}

        {/* Top-right Rating Pill */}
        {!onRemoveProgress && item.rating > 0 && (
          <span className="absolute top-2 right-2 z-20 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[10px] font-extrabold text-amber-400 shadow">
            <Star size={9} className="fill-current" />
            {item.rating.toFixed(1)}
          </span>
        )}

        {/* Full-Bleed Movie/Series Artwork (Always Visible on Hover Zoom) */}
        <img
          src={posterUrl}
          alt={item.title}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            const el = e.currentTarget;
            if (item.trailerKey && !el.dataset.fb) {
              el.dataset.fb = "1";
              el.src = `https://i.ytimg.com/vi/${item.trailerKey}/hqdefault.jpg`;
            } else if (!el.dataset.fb2) {
              el.dataset.fb2 = "1";
              el.src = "/bioBG_poster.webp";
            }
          }}
          className={`w-full h-full object-cover select-none pointer-events-none transition-transform duration-500 ${
            isZoomed ? "scale-105 brightness-105" : "scale-100"
          }`}
        />

        {/* Specular Liquid Glass Sheen */}
        <span className="nl-poster__sheen" aria-hidden="true" />

        {/* Subtle resting bottom title gradient when not hovered */}
        <div
          className={`absolute inset-x-0 bottom-0 z-10 p-2.5 pt-8 bg-gradient-to-t from-black/90 via-black/45 to-transparent transition-opacity duration-200 ${
            isZoomed ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <p className="text-[11px] sm:text-xs font-extrabold text-white truncate drop-shadow">
            {item.title}
          </p>
          <p className="text-[9px] text-white/70 font-medium truncate">
            {[item.year, fallbackGenText].filter(Boolean).join(" · ")}
          </p>
        </div>

        {/* Thin red Continue Watching progress bar */}
        {typeof progressRatio === "number" && progressRatio > 0 && (
          <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/20 z-20 pointer-events-none">
            <div
              className="h-full bg-[#dc2626]"
              style={{
                width: `${Math.min(100, Math.max(2, Math.round(progressRatio * 100)))}%`,
              }}
            />
          </div>
        )}

        {/* Zoomed Liquid Glass Drawer Overlay (Ultra-light translucent finish) */}
        <AnimatePresence>
          {isZoomed && (
            <m.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="nl-poster__glass-drawer flex flex-col gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-1">
                <h4 className="text-[11px] font-black text-white leading-tight line-clamp-1 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                  {item.title}
                </h4>
                {item.year && (
                  <span className="px-1.5 py-0.5 rounded-full bg-white/12 border border-white/20 text-[7.5px] font-extrabold text-white/95 shrink-0">
                    {item.year}
                  </span>
                )}
              </div>
              <p className="text-[9px] text-white/90 line-clamp-2 leading-snug drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
                {item.overview}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {onQuickWatch && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickWatch(item);
                    }}
                    className="lg-cinema-primary-pill flex-1 py-1 px-2 rounded-full text-[9px] font-extrabold text-white flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Play size={9.5} className="fill-current" />
                    <span>{t("movies.meta.watchNow") || "Watch"}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedItemId(item.id, item.mediaType);
                  }}
                  className="lg-cinema-action-pill py-1 px-2 rounded-full text-[9px] font-bold text-white flex items-center justify-center gap-1 cursor-pointer"
                  title={t("movies.meta.moreInfo") || "Details"}
                >
                  <Info size={9.5} />
                </button>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    );
  },
);

const MovieRow = React.memo(
  ({
    title,
    items,
    isTouch,
    activeHoverId,
    setActiveHoverId,
    hoverTimer,
    setSelectedItemId,
    onQuickWatch,
    t,
    isFavoriteFn,
  }: any) => {
    const sliderRef = useRef<HTMLDivElement | null>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const updateScrollState = useCallback(() => {
      if (!sliderRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
      setCanScrollLeft(Math.abs(scrollLeft) > 6);
      setCanScrollRight(Math.abs(scrollLeft) + clientWidth < scrollWidth - 6);
    }, []);

    const handleScrollClick = useCallback((direction: "left" | "right") => {
      if (!sliderRef.current) return;
      const { clientWidth } = sliderRef.current;
      const scrollAmt =
        direction === "left" ? -clientWidth * 0.75 : clientWidth * 0.75;
      sliderRef.current.scrollBy({ left: scrollAmt, behavior: "smooth" });
    }, []);

    const [isVisible, setIsVisible] = useState(false);
    const rowRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        },
        { rootMargin: "240px" },
      );
      if (rowRef.current) observer.observe(rowRef.current);
      return () => observer.disconnect();
    }, []);

    if (items.length === 0) return null;

    return (
      <div
        ref={rowRef}
        className="relative z-10 flex flex-col gap-1.5 py-2.5 px-4 sm:px-10"
      >
        <div className="flex items-center justify-between px-2">
          <h2 className="text-sm sm:text-lg font-extrabold text-white tracking-tight drop-shadow">
            {title}
          </h2>
        </div>
        <div className="group/row relative w-full">
          {canScrollLeft && !isTouch && (
            <button
              type="button"
              onClick={() => handleScrollClick("left")}
              className="lg-cinema-icon-pill absolute left-1 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity text-white cursor-pointer"
              aria-label="Scroll left"
            >
              <ChevronLeft size={22} />
            </button>
          )}
          <div
            ref={sliderRef}
            onScroll={updateScrollState}
            className="nl-cinema-row flex gap-4 overflow-x-auto select-none px-3 scroll-smooth scrollbar-none snap-x snap-mandatory"
            style={MOVIE_ROW_SCROLL_STYLE}
          >
            {isVisible &&
              items.map((item: any) => (
                <div key={item.id} className="flex-shrink-0 snap-start">
                  <MoviePosterCard
                    item={item}
                    isTouch={isTouch}
                    activeHoverId={activeHoverId}
                    setActiveHoverId={setActiveHoverId}
                    hoverTimer={hoverTimer}
                    setSelectedItemId={setSelectedItemId}
                    onQuickWatch={onQuickWatch}
                    t={t}
                    isFavorite={isFavoriteFn?.(item.id, item.mediaType)}
                  />
                </div>
              ))}
          </div>
          {canScrollRight && !isTouch && (
            <button
              type="button"
              onClick={() => handleScrollClick("right")}
              className="lg-cinema-icon-pill absolute right-1 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity text-white cursor-pointer"
              aria-label="Scroll right"
            >
              <ChevronRight size={22} />
            </button>
          )}
        </div>
      </div>
    );
  },
);

export function MoviesPage({ onClose, initialTab = 'movies' }: { onClose: () => void; initialTab?: 'movies' | 'series' }) {
  const { t, i18n } = useTranslation();
  const { isMobile, isTablet } = useDeviceType();
  const { setMovieActive, registerMovieBack } = useAppContext();
  const isTouch = isMobile || isTablet;
  const currentLang = normLang(i18n.resolvedLanguage || i18n.language);
  const tmdbKey = import.meta.env.VITE_TMDB_API_KEY || PUBLIC_TMDB_KEY;
  const omdbKey = import.meta.env.VITE_OMDB_API_KEY || PUBLIC_OMDB_KEY;

  const { user } = useAuth();
  const { has, toggle, items: movieItems, watchlistCount } = useMovieItems();

  const topMoviesRows = useTopMovies('movie', 20);
  const topSeriesRows = useTopMovies('series', 20);
  const [topMovies, setTopMovies] = useState<CinemaItem[]>([]);
  const [topSeries, setTopSeries] = useState<CinemaItem[]>([]);

  const [activeTab, setActiveTab] = useState<'movies' | 'series'>(initialTab);
  const [moviesLoading, setMoviesLoading] = useState(true);
  const [seriesLoading, setSeriesLoading] = useState(true);
  const [globalError, setGlobalError] = useState(false);

  // Lists State
  const [trendingMovies, setTrendingMovies] = useState<CinemaItem[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<CinemaItem[]>([]);
  const [popularMovies, setPopularMovies] = useState<CinemaItem[]>([]);
  const [actionMovies, setActionMovies] = useState<CinemaItem[]>([]);
  const [horrorMovies, setHorrorMovies] = useState<CinemaItem[]>([]);
  const [dramaMovies, setDramaMovies] = useState<CinemaItem[]>([]);
  const [sciFiMovies, setSciFiMovies] = useState<CinemaItem[]>([]);
  const [movieGenres, setMovieGenres] = useState<any[]>([]);

  const [trendingSeries, setTrendingSeries] = useState<CinemaItem[]>([]);
  const [topRatedSeries, setTopRatedSeries] = useState<CinemaItem[]>([]);
  const [popularSeries, setPopularSeries] = useState<CinemaItem[]>([]);
  const [actionSeries, setActionSeries] = useState<CinemaItem[]>([]);
  const [mysterySeries, setMysterySeries] = useState<CinemaItem[]>([]);
  const [dramaSeries, setDramaSeries] = useState<CinemaItem[]>([]);
  const [animationSeries, setAnimationSeries] = useState<CinemaItem[]>([]);
  const [seriesGenres, setSeriesGenres] = useState<any[]>([]);

  // Resolution effects for Top items (batched 6 at a time, preserving order)
  useEffect(() => {
    let cancelled = false;
    if (topMoviesRows.length === 0) {
      setTopMovies([]);
      return;
    }
    const loadTopMoviesDetails = async () => {
      const langParam = `&language=${tmdbLang(currentLang)}`;

      const allLoaded = [
        ...trendingMovies,
        ...topRatedMovies,
        ...popularMovies,
        ...actionMovies,
        ...horrorMovies,
        ...dramaMovies,
        ...sciFiMovies,
        ...FALLBACK_MOVIES.map(r => normalizeItem(r, 'movie', currentLang))
      ];

      const resolved: (CinemaItem | null)[] = new Array(topMoviesRows.length).fill(null);
      const BATCH_SIZE = 6;
      for (let i = 0; i < topMoviesRows.length; i += BATCH_SIZE) {
        if (cancelled) return;
        const slice = topMoviesRows.slice(i, i + BATCH_SIZE);
        await Promise.all(
          slice.map(async (row, idx) => {
            const targetIdx = i + idx;
            const matched = allLoaded.find(m => m.id === row.tmdb_id && m.mediaType === 'movie');
            if (matched) {
              resolved[targetIdx] = matched;
              return;
            }
            if (!tmdbKey) return;
            try {
              const detail = await fetchWithCache(
                `${TMDB_BASE_URL}/movie/${row.tmdb_id}?api_key=${tmdbKey}${langParam}`
              );
              if (!cancelled && detail) {
                resolved[targetIdx] = normalizeItem(detail, 'movie', currentLang);
              }
            } catch (e) {
              console.warn("Failed to fetch top movie details for ID", row.tmdb_id, e);
            }
          }),
        );
      }
      if (!cancelled) {
        setTopMovies(resolved.filter((x): x is CinemaItem => x !== null));
      }
    };
    loadTopMoviesDetails();
    return () => { cancelled = true; };
  }, [topMoviesRows, trendingMovies, topRatedMovies, popularMovies, actionMovies, horrorMovies, dramaMovies, sciFiMovies, tmdbKey, currentLang]);

  useEffect(() => {
    let cancelled = false;
    if (topSeriesRows.length === 0) {
      setTopSeries([]);
      return;
    }
    const loadTopSeriesDetails = async () => {
      const langParam = `&language=${tmdbLang(currentLang)}`;

      const allLoaded = [
        ...trendingSeries,
        ...topRatedSeries,
        ...popularSeries,
        ...actionSeries,
        ...mysterySeries,
        ...dramaSeries,
        ...animationSeries,
        ...FALLBACK_SERIES.map(r => normalizeItem(r, 'tv', currentLang))
      ];

      const resolved: (CinemaItem | null)[] = new Array(topSeriesRows.length).fill(null);
      const BATCH_SIZE = 6;
      for (let i = 0; i < topSeriesRows.length; i += BATCH_SIZE) {
        if (cancelled) return;
        const slice = topSeriesRows.slice(i, i + BATCH_SIZE);
        await Promise.all(
          slice.map(async (row, idx) => {
            const targetIdx = i + idx;
            const matched = allLoaded.find(m => m.id === row.tmdb_id && m.mediaType === 'tv');
            if (matched) {
              resolved[targetIdx] = matched;
              return;
            }
            if (!tmdbKey) return;
            try {
              const detail = await fetchWithCache(
                `${TMDB_BASE_URL}/tv/${row.tmdb_id}?api_key=${tmdbKey}${langParam}`
              );
              if (!cancelled && detail) {
                resolved[targetIdx] = normalizeItem(detail, 'tv', currentLang);
              }
            } catch (e) {
              console.warn("Failed to fetch top series details for ID", row.tmdb_id, e);
            }
          }),
        );
      }
      if (!cancelled) {
        setTopSeries(resolved.filter((x): x is CinemaItem => x !== null));
      }
    };
    loadTopSeriesDetails();
    return () => { cancelled = true; };
  }, [topSeriesRows, trendingSeries, topRatedSeries, popularSeries, actionSeries, mysterySeries, dramaSeries, animationSeries, tmdbKey, currentLang]);

  // Filtering / Search
  const [selectedGenreId, setSelectedGenreId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CinemaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showWatchlist, setShowWatchlist] = useState(false);

  // Slideshow / Modal / Server Branching States
  useDocumentMeta("movies.title", "movies.description");

  const [heroIndex, setHeroIndex] = useState(0);
  const [heroServersOpen, setHeroServersOpen] = useState(false);
  const [detailServersOpen, setDetailServersOpen] = useState(false);

  const [selectedItemId, setSelectedItemIdState] = useState<number | null>(null);
  const [selectedMediaType, setSelectedMediaType] = useState<Media | null>(null);
  const [detailedItem, setDetailedItem] = useState<CinemaItem | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const findPreloadedCinemaItem = useCallback(
    (id: number, mediaType?: Media | null): CinemaItem | null => {
      const targetType: Media = mediaType ?? (activeTab === "series" ? "tv" : "movie");
      const pools: CinemaItem[][] =
        targetType === "tv"
          ? [
              trendingSeries,
              topRatedSeries,
              popularSeries,
              actionSeries,
              mysterySeries,
              dramaSeries,
              animationSeries,
              topSeries,
              searchResults,
            ]
          : [
              trendingMovies,
              topRatedMovies,
              popularMovies,
              actionMovies,
              horrorMovies,
              dramaMovies,
              sciFiMovies,
              topMovies,
              searchResults,
            ];
      for (const list of pools) {
        const match = list.find((it) => it.id === id && it.mediaType === targetType);
        if (match) return match;
      }
      const fbList = targetType === "tv" ? FALLBACK_SERIES : FALLBACK_MOVIES;
      const fbMatch = fbList.find((it: any) => it.id === id);
      return fbMatch ? normalizeItem(fbMatch, targetType, currentLang) : null;
    },
    [
      activeTab,
      currentLang,
      trendingSeries,
      topRatedSeries,
      popularSeries,
      actionSeries,
      mysterySeries,
      dramaSeries,
      animationSeries,
      topSeries,
      trendingMovies,
      topRatedMovies,
      popularMovies,
      actionMovies,
      horrorMovies,
      dramaMovies,
      sciFiMovies,
      topMovies,
      searchResults,
    ],
  );

  const setSelectedItemId = useCallback(
    (id: number | null, mediaType?: Media) => {
      if (id === null) {
        setSelectedMediaType(null);
        setSelectedItemIdState(null);
        return;
      }
      const effType: Media = mediaType ?? (activeTab === "series" ? "tv" : "movie");
      setSelectedMediaType(effType);
      setSelectedItemIdState(id);
      const preloaded = findPreloadedCinemaItem(id, effType);
      if (preloaded) {
        setDetailedItem((prev) => (prev && prev.id === id && prev.mediaType === effType ? prev : preloaded));
        setIsLoadingDetails(false);
      } else {
        setDetailedItem((prev) => (prev && prev.id === id && prev.mediaType === effType ? prev : null));
        setIsLoadingDetails(true);
      }
    },
    [activeTab, findPreloadedCinemaItem],
  );
  const [showHeroTrailer, setShowHeroTrailer] = useState(false);
  const [trailerFallbackToYoutube, setTrailerFallbackToYoutube] = useState(false);
  const [resolvedTrailer, setResolvedTrailer] = useState<TrailerSource | null>(null);
  const [imdbTrailerLoaded, setImdbTrailerLoaded] = useState(false);
  const [isWatchingInGallery, setIsWatchingInGallery] = useState(false);
  const [activeGalleryServerIdx, setActiveGalleryServerIdx] = useState(0);
  const [isPlayerLoading, setIsPlayerLoading] = useState(false);
  const [allServersFailed, setAllServersFailed] = useState(false);
  const [isCssFullscreen, setIsCssFullscreen] = useState(false);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [extractedStreams, setExtractedStreams] = useState<ExtractedVideoStream[]>([]);
  const [externalSubtitles, setExternalSubtitles] = useState<ExtractedSubtitleTrack[]>([]);
  const externalSubtitlesRef = useRef<ExtractedSubtitleTrack[]>([]);
  const [workerBridgeSubtitles, setWorkerBridgeSubtitles] = useState<ExtractedSubtitleTrack[]>([]);
  const retimedTrackIdsRef = useRef<Set<string>>(new Set());
  const [isLoadingSubtitles, setIsLoadingSubtitles] = useState(false);
  const [loadingSubtitleIdx, setLoadingSubtitleIdx] = useState<number | null>(null);
  const [subtitleOffsetSec, setSubtitleOffsetSec] = useState(0);
  const [activeTrackCues, setActiveTrackCues] = useState<SubtitleCue[]>([]);
  const [activeExtractedIdx, setActiveExtractedIdx] = useState(0);
  const [useDirectUrlFallback, setUseDirectUrlFallback] = useState(false);
  const [playerRenderMode, setPlayerRenderMode] = useState<
    "extracting" | "direct" | "clean-embed" | "iframe"
  >("extracting");
  const clockState = useClockState();
  const isVideoPaused = clockState.paused;
  const [videoVolume, setVideoVolume] = useState(1);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [activeSubtitleIdx, setActiveSubtitleIdx] = useState<number | null>(0);
  const [isSubtitleMenuOpen, setIsSubtitleMenuOpen] = useState(false);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const controlsHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [isFullSeasonEmbed, setIsFullSeasonEmbed] = useState(false);
  const [seasonEpisodes, setSeasonEpisodes] = useState<
    Array<{ episode_number: number; name: string }>
  >([]);
  const [loadingSeasonEpisodes, setLoadingSeasonEpisodes] = useState(false);
  const galleryStageRef = useRef<HTMLDivElement | null>(null);
  const playerIframeRef = useRef<HTMLIFrameElement | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const hlsInstanceRef = useRef<Hls | null>(null);
  const attemptTokenRef = useRef(0);
  const playAttemptStartedAtRef = useRef<number>(0);
  const failoverQueueRef = useRef<number[]>([]);
  const failoverStepRef = useRef(0);
  const loadedCurrentAttemptRef = useRef(false);
  const autoStartWatchRef = useRef(false);
  const appliedInitialSeekRef = useRef(false);
  const deepLinkSeRef = useRef<{ itemId: number; s?: number; e?: number } | null>(null);
  const preselectedProgressItemIdRef = useRef<number | null>(null);
  const continueWatchingItems = useContinueWatching();
  const [seriesLoadTriggered, setSeriesLoadTriggered] = useState(initialTab === 'series');
  const [activeHoverId, setActiveHoverId] = useState<number | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanupDirectVideoPlayer = useCallback(() => {
    if (hlsInstanceRef.current) {
      try {
        hlsInstanceRef.current.destroy();
      } catch {}
      hlsInstanceRef.current = null;
    }
    if (videoElementRef.current) {
      try {
        videoElementRef.current.pause();
        videoElementRef.current.removeAttribute("src");
        videoElementRef.current.load();
      } catch {}
    }
  }, []);

  const clearExternalSubtitleBlobs = useCallback(() => {
    if (externalSubtitlesRef.current.length > 0) {
      revokeSubtitleBlobUrls(externalSubtitlesRef.current);
      externalSubtitlesRef.current = [];
    }
    setExternalSubtitles([]);
    setWorkerBridgeSubtitles([]);
    retimedTrackIdsRef.current.clear();
  }, []);

  useEffect(() => {
    return () => {
      if (externalSubtitlesRef.current.length > 0) {
        revokeSubtitleBlobUrls(externalSubtitlesRef.current);
        externalSubtitlesRef.current = [];
      }
    };
  }, []);

  // Interactive Actor Profile Card State
  const [selectedActor, setSelectedActor] = useState<CastMember | null>(null);
  const [actorDetails, setActorDetails] = useState<ActorDetails | null>(null);
  const [loadingActor, setLoadingActor] = useState(false);

  const detailDialogRef = useFocusTrap(selectedItemId !== null && !!detailedItem);

  const resumeStartAtSec = useMemo(() => {
    if (!detailedItem) return undefined;
    const saved = getProgress(detailedItem.mediaType, detailedItem.id);
    if (!saved) return undefined;
    if (
      detailedItem.mediaType === "tv" &&
      ((saved.season && saved.season !== selectedSeason) ||
        (saved.episode && saved.episode !== selectedEpisode))
    ) {
      return undefined;
    }
    return saved.time > 5 ? saved.time : undefined;
  }, [detailedItem?.id, detailedItem?.mediaType, selectedSeason, selectedEpisode]);

  const detailWatchTarget = useMemo(() => {
    if (!detailedItem) return null;
    return {
      id: detailedItem.id,
      mediaType: detailedItem.mediaType,
      title: detailedItem.title,
      imdbId: detailedItem.imdbId,
      backdropPath: detailedItem.backdropPath,
      posterPath: detailedItem.posterPath,
      season: selectedSeason,
      episode: selectedEpisode,
      fullSeason: isFullSeasonEmbed,
      startAt: resumeStartAtSec,
    };
  }, [detailedItem, selectedSeason, selectedEpisode, isFullSeasonEmbed, resumeStartAtSec]);

  const { sources: detailPlaySources, resolvedImdbId } = useResolvedImdbSources(
    detailWatchTarget,
    Boolean(detailedItem),
  );
  const activeImdbId = resolvedImdbId || detailedItem?.imdbId || "";
  const activeGallerySource =
    detailPlaySources[activeGalleryServerIdx] || detailPlaySources[0] || null;
  const [embedSeekStartAtSec, setEmbedSeekStartAtSec] = useState<number | null>(null);
  const [workerBridgeRevision, setWorkerBridgeRevision] = useState(0);
  const [seekUnsupportedToast, setSeekUnsupportedToast] = useState(false);
  const seekUnsupportedToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSeekUnsupportedToast = useCallback(() => {
    setSeekUnsupportedToast(true);
    if (seekUnsupportedToastTimerRef.current) {
      clearTimeout(seekUnsupportedToastTimerRef.current);
    }
    seekUnsupportedToastTimerRef.current = setTimeout(() => {
      setSeekUnsupportedToast(false);
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (seekUnsupportedToastTimerRef.current) {
        clearTimeout(seekUnsupportedToastTimerRef.current);
      }
    };
  }, []);

  const activeIframeUrlBase = useMemo(() => {
    if (!activeGallerySource) return "";
    return playerRenderMode === "clean-embed"
      ? (extractedStreams[activeExtractedIdx] || extractedStreams[0])?.directUrl ||
          activeGallerySource.url
      : activeGallerySource.url;
  }, [activeGallerySource, playerRenderMode, extractedStreams, activeExtractedIdx]);

  const prevWatchingInGalleryRef = useRef(false);
  useEffect(() => {
    const wasWatching = prevWatchingInGalleryRef.current;
    prevWatchingInGalleryRef.current = isWatchingInGallery;
    if (!wasWatching && isWatchingInGallery) {
      try {
        const now = Date.now();
        const TTL_MS = 30 * 60 * 1000;
        const staleKeys: string[] = [];
        for (let i = 0; i < sessionStorage.length; i += 1) {
          const k = sessionStorage.key(i);
          if (k && k.startsWith("nl_wb_fail_")) {
            const raw = sessionStorage.getItem(k);
            const ts = raw ? Number(raw) : NaN;
            if (raw === "1" || !Number.isFinite(ts) || now - ts > TTL_MS) {
              staleKeys.push(k);
            }
          }
        }
        staleKeys.forEach((k) => sessionStorage.removeItem(k));
      } catch {
        // ignore storage errors
      }
    }
  }, [isWatchingInGallery]);

  const activeIframeUrl = useMemo(() => {
    if (!activeGallerySource || !activeIframeUrlBase) return "";
    let rawUrl = activeIframeUrlBase;
    if (
      embedSeekStartAtSec !== null &&
      embedSeekStartAtSec > 0 &&
      playerRenderMode === "iframe" &&
      activeGallerySource.capabilities?.startAt
    ) {
      try {
        const u = new URL(rawUrl);
        u.searchParams.set("startAt", String(Math.floor(embedSeekStartAtSec)));
        rawUrl = u.toString();
      } catch {
        // keep rawUrl
      }
    }
    const srvCaps = activeGallerySource.capabilities as CinemaServerConfig["capabilities"];
    if (
      playerRenderMode === "iframe" &&
      srvCaps?.workerBridge === true &&
      typeof window !== "undefined"
    ) {
      let wbFailed = false;
      try {
        const failKey = `nl_wb_fail_${activeGallerySource.id}`;
        const rawFail = sessionStorage.getItem(failKey);
        if (rawFail !== null) {
          const ts = Number(rawFail);
          if (rawFail === "1" || !Number.isFinite(ts) || Date.now() - ts > 30 * 60 * 1000) {
            sessionStorage.removeItem(failKey);
            wbFailed = false;
          } else {
            wbFailed = true;
          }
        }
      } catch {
        wbFailed = false;
      }
      if (!wbFailed) {
        return toWorkerEmbedUrl(rawUrl, WORKER_ENDPOINT, window.location.origin);
      }
    }
    return rawUrl;
  }, [
    activeGallerySource,
    activeIframeUrlBase,
    playerRenderMode,
    embedSeekStartAtSec,
    workerBridgeRevision,
  ]);

  const detailItemStorageKey = detailedItem
    ? `${detailedItem.mediaType}_${detailedItem.id}`
    : '';

  const persistCurrentProgress = useCallback(() => {
    if (!detailedItem || !isWatchingInGallery) return;
    const st = clockGetState();
    if (st.source !== "video" && st.source !== "bridge") return;
    const curTime = st.source === "bridge" ? clockReportedNow() : clockNow();
    if (curTime === null) return;
    const durationSec =
      st.duration > 0
        ? st.duration
        : detailedItem.runtime && detailedItem.runtime > 0
          ? detailedItem.runtime * 60
          : 0;
    if (durationSec <= 0 || curTime <= 5) return;
    saveProgress({
      id: detailedItem.id,
      mediaType: detailedItem.mediaType,
      title: detailedItem.title,
      posterPath: detailedItem.posterPath,
      backdropPath: detailedItem.backdropPath,
      season: detailedItem.mediaType === "tv" ? selectedSeason : undefined,
      episode: detailedItem.mediaType === "tv" ? selectedEpisode : undefined,
      time: curTime,
      duration: durationSec,
    });
  }, [detailedItem, isWatchingInGallery, selectedSeason, selectedEpisode]);

  const resolveServerIdForStream = useCallback(
    (stream?: ExtractedVideoStream | null): string => {
      if (stream?.sourcePage) {
        const matched = detailPlaySources.find(
          (s) =>
            s.url === stream.sourcePage ||
            stream.sourcePage.includes(s.host),
        );
        if (matched) return matched.id;
      }
      return activeGallerySource?.id || detailPlaySources[0]?.id || "server-7";
    },
    [detailPlaySources, activeGallerySource],
  );

  // Build speed-sorted failover queue starting automatically with the user's fastest cached server
  const startGalleryWatchSession = useCallback(
    (explicitServerIdx?: number) => {
      const speedOrdered = buildSpeedSortedQueue(
        detailPlaySources,
        detailItemStorageKey,
      );
      let ordered = speedOrdered.length > 0 ? speedOrdered : [0, 1, 2, 3, 4];

      if (typeof explicitServerIdx === "number" && explicitServerIdx >= 0) {
        const total = detailPlaySources.length || 5;
        const startIdx = explicitServerIdx % Math.max(1, total);
        ordered = [startIdx, ...ordered.filter((i) => i !== startIdx)];
      }

      const firstIdx = ordered[0] ?? 0;
      const targetSource = detailPlaySources[firstIdx] || detailPlaySources[0];
      const initialAnchorSec = targetSource?.capabilities?.startAt
        ? (resumeStartAtSec ?? 0)
        : 0;

      cleanupDirectVideoPlayer();
      clockAnchor(initialAnchorSec, {
        duration: (detailedItem?.runtime ?? 0) * 60,
        source: "manual",
        durationIsEstimated: true,
      });
      setEmbedSeekStartAtSec(null);
      appliedInitialSeekRef.current = false;
      checkedExtractionKeyRef.current = "";
      failoverQueueRef.current = ordered;
      failoverStepRef.current = 0;
      attemptTokenRef.current += 1;
      playAttemptStartedAtRef.current = performance.now();
      loadedCurrentAttemptRef.current = false;
      setAllServersFailed(false);
      setIsPlayerLoading(true);
      setActiveGalleryServerIdx(firstIdx);
      setSelectedActor(null);
      setActorDetails(null);
      setShowHeroTrailer(false);
      setIsSubtitleMenuOpen(false);
      setIsWatchingInGallery(true);
    },
    [
      detailPlaySources,
      detailItemStorageKey,
      cleanupDirectVideoPlayer,
      resumeStartAtSec,
      detailedItem?.runtime,
    ],
  );

  // Advance to the next fastest server in the failover queue
  const advanceFailoverServer = useCallback(
    (reason: string) => {
      const currentSrc = detailPlaySources[activeGalleryServerIdx];
      if (currentSrc) {
        recordServerFailure(currentSrc.id);
      }

      const queue = failoverQueueRef.current;
      const nextStep = failoverStepRef.current + 1;
      if (!queue.length || nextStep >= queue.length) {
        setIsPlayerLoading(false);
        setAllServersFailed(true);
        console.warn(`[CinemaPlayer] All servers exhausted (${reason}).`);
        return;
      }

      const nextServerIdx = queue[nextStep];
      const nextSource = detailPlaySources[nextServerIdx];
      const nextAnchorSec = nextSource?.capabilities?.startAt
        ? (resumeStartAtSec ?? 0)
        : 0;

      clockAnchor(nextAnchorSec, {
        duration: (detailedItem?.runtime ?? 0) * 60,
        source: "manual",
        durationIsEstimated: true,
      });
      failoverStepRef.current = nextStep;
      attemptTokenRef.current += 1;
      playAttemptStartedAtRef.current = performance.now();
      loadedCurrentAttemptRef.current = false;
      setIsPlayerLoading(true);
      setActiveGalleryServerIdx(nextServerIdx);
    },
    [
      detailPlaySources,
      activeGalleryServerIdx,
      resumeStartAtSec,
      detailedItem?.runtime,
    ],
  );

  const checkedExtractionKeyRef = useRef<string>("");
  const detailPlaySourcesRef = useRef<PlaySource[]>(detailPlaySources);
  detailPlaySourcesRef.current = detailPlaySources;

  // Background External Subtitles Loader (Decoupled so subtitle APIs NEVER block video/iframe startup)
  useEffect(() => {
    if (!isWatchingInGallery || !detailedItem) {
      return undefined;
    }
    let cancelled = false;
    const abortController = new AbortController();
    setIsLoadingSubtitles(true);

    void fetchExternalSubtitles({
      tmdbId: detailedItem.id,
      imdbId: activeImdbId || undefined,
      mediaType: detailedItem.mediaType,
      season: detailedItem.mediaType === "tv" ? selectedSeason : undefined,
      episode: detailedItem.mediaType === "tv" ? selectedEpisode : undefined,
      signal: abortController.signal,
    })
      .catch(() => [] as ExtractedSubtitleTrack[])
      .then((extSubs) => {
        if (cancelled) {
          revokeSubtitleBlobUrls(extSubs);
          return;
        }
        if (externalSubtitlesRef.current.length > 0) {
          revokeSubtitleBlobUrls(externalSubtitlesRef.current);
        }
        externalSubtitlesRef.current = extSubs;
        setExternalSubtitles(extSubs);
        setIsLoadingSubtitles(false);
      });

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [
    isWatchingInGallery,
    detailedItem?.id,
    detailedItem?.mediaType,
    activeImdbId,
    selectedSeason,
    selectedEpisode,
  ]);

  // Tier 1 Parallel Direct Stream Extraction (.m3u8 / .mp4) with Hot-Upgrade -> Never blocks mounting the iframe
  useEffect(() => {
    if (!isWatchingInGallery || !activeGallerySource || allServersFailed) {
      return undefined;
    }

    const extractionSessionKey = `${detailItemStorageKey}_s${selectedSeason}_e${selectedEpisode}`;
    playAttemptStartedAtRef.current = performance.now();
    loadedCurrentAttemptRef.current = false;
    setIsPlayerLoading(true);
    setUseDirectUrlFallback(false);

    // Mount iframe immediately so playback starts without waiting on Worker extraction
    setPlayerRenderMode((prev) => (prev === "direct" ? "direct" : "iframe"));

    if (checkedExtractionKeyRef.current === extractionSessionKey) {
      return undefined;
    }

    let cancelled = false;
    const abortController = new AbortController();
    const currentToken = ++attemptTokenRef.current;

    const orderedSources: PlaySource[] = [
      activeGallerySource,
      ...detailPlaySourcesRef.current.filter((s) => s.id !== activeGallerySource.id),
    ].filter((s): s is PlaySource => Boolean(s && s.url));
    const generatedTargetUrl = orderedSources.map((s) => s.url);

    async function loadAndHotUpgradeVideo() {
      checkedExtractionKeyRef.current = extractionSessionKey;
      if (generatedTargetUrl.length === 0) return;

      try {
        const videos = await fetchExtractedVideos(
          generatedTargetUrl,
          abortController.signal,
        ).catch(() => [] as ExtractedVideoStream[]);

        if (cancelled || attemptTokenRef.current !== currentToken) {
          return;
        }

        // Merge any Worker-extracted companion subtitle tracks immediately (even if staying in iframe mode!)
        const companionSubs = videos.flatMap((v) => v.subtitles || []).map((s, i) => ({
          ...s,
          id: s.id || `worker:${i}:${s.lang}`,
          provider: s.provider || ("worker" as const),
          remoteUrl: s.proxiedUrl || s.url,
          loaded: false,
          label: s.label.includes("·") ? s.label : `${s.label} · Source`,
        }));
        if (companionSubs.length > 0) {
          setWorkerBridgeSubtitles((prev) => mergeStreamFirst(companionSubs, prev));
        }

        const directStreams = videos.filter(
          (v) => v.type === "hls" || v.type === "mp4",
        );

        if (directStreams.length === 0) {
          return;
        }

        const elapsedSinceStart = performance.now() - playAttemptStartedAtRef.current;
        if (elapsedSinceStart <= 12_000 && clockNow() < 60) {
          setExtractedStreams(directStreams);
          setActiveExtractedIdx(0);
          setUseDirectUrlFallback(false);
          playAttemptStartedAtRef.current = performance.now();
          setPlayerRenderMode("direct");
        }
      } catch {
        // Stay on active iframe smoothly
      }
    }

    void loadAndHotUpgradeVideo();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [
    isWatchingInGallery,
    activeGallerySource?.id,
    activeGallerySource?.url,
    allServersFailed,
    detailItemStorageKey,
    selectedSeason,
    selectedEpisode,
  ]);

  // Attach HLS.js or direct MP4 stream to <video> when playerRenderMode === "direct"
  useEffect(() => {
    if (
      !isWatchingInGallery ||
      playerRenderMode !== "direct" ||
      extractedStreams.length === 0
    ) {
      cleanupDirectVideoPlayer();
      return undefined;
    }

    const selectedVideo =
      extractedStreams[activeExtractedIdx] || extractedStreams[0];
    if (!selectedVideo) return undefined;

    if (selectedVideo.type === "clean-embed") {
      cleanupDirectVideoPlayer();
      playAttemptStartedAtRef.current = performance.now();
      setPlayerRenderMode("clean-embed");
      return undefined;
    }

    const videoElement = videoElementRef.current;
    if (!videoElement) return undefined;

    cleanupDirectVideoPlayer();

    // Always prefer selectedVideo.proxiedUrl to bypass CORS and Referer blocks
    const streamUrlToPlay =
      useDirectUrlFallback && selectedVideo.directUrl
        ? selectedVideo.directUrl
        : selectedVideo.proxiedUrl || selectedVideo.directUrl;

    if (!streamUrlToPlay) {
      setPlayerRenderMode("iframe");
      return undefined;
    }

    // Priority: Try next extracted server stream BEFORE falling back to standard iframe
    const handleStreamErrorFallback = () => {
      if (
        !useDirectUrlFallback &&
        selectedVideo.directUrl &&
        selectedVideo.directUrl !== selectedVideo.proxiedUrl
      ) {
        setUseDirectUrlFallback(true);
      } else if (activeExtractedIdx + 1 < extractedStreams.length) {
        recordServerFailure(resolveServerIdForStream(selectedVideo));
        const nextIdx = activeExtractedIdx + 1;
        const nextItem = extractedStreams[nextIdx];
        setUseDirectUrlFallback(false);
        playAttemptStartedAtRef.current = performance.now();
        setIsPlayerLoading(true);
        setActiveExtractedIdx(nextIdx);
        if (nextItem?.type === "clean-embed") {
          cleanupDirectVideoPlayer();
          setPlayerRenderMode("clean-embed");
        }
      } else {
        recordServerFailure(resolveServerIdForStream(selectedVideo));
        cleanupDirectVideoPlayer();
        playAttemptStartedAtRef.current = performance.now();
        setIsPlayerLoading(true);
        setPlayerRenderMode("iframe");
      }
    };

    const playHlsStream = (url: string) => {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          maxBufferLength: 30,
          backBufferLength: 30,
        });
        hlsInstanceRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(videoElement);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          hls.subtitleDisplay = false;
          hls.subtitleTrack = -1;
          const streamTracks = hlsTracksToSubtitleTracks(hls);
          if (streamTracks.length > 0) {
            setExternalSubtitles((prev) => {
              const next = mergeStreamFirst(streamTracks, prev);
              externalSubtitlesRef.current = next;
              return next;
            });
          }
          const elapsedMs = Math.max(
            120,
            performance.now() - playAttemptStartedAtRef.current,
          );
          recordServerSuccess(
            resolveServerIdForStream(selectedVideo),
            elapsedMs,
            detailItemStorageKey,
          );
          setIsPlayerLoading(false);
          const resumeSec = clockNow();
          if (resumeSec > 5) {
            try {
              videoElement.currentTime = resumeSec;
            } catch {}
          }
          void videoElement.play().catch(() => {});
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                handleStreamErrorFallback();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                handleStreamErrorFallback();
                break;
            }
          }
        });
      } else if (videoElement.canPlayType("application/vnd.apple.mpegurl")) {
        videoElement.src = url;
        void videoElement.play().catch(() => {});
      } else {
        handleStreamErrorFallback();
      }
    };

    const playDirectVideo = (url: string) => {
      videoElement.src = url;
      void videoElement.play().catch(() => {});
    };

    if (
      selectedVideo.type === "hls" ||
      streamUrlToPlay.toLowerCase().includes(".m3u8")
    ) {
      playHlsStream(streamUrlToPlay);
    } else {
      playDirectVideo(streamUrlToPlay);
    }

    return () => {
      cleanupDirectVideoPlayer();
    };
  }, [
    isWatchingInGallery,
    playerRenderMode,
    extractedStreams,
    activeExtractedIdx,
    useDirectUrlFallback,
    cleanupDirectVideoPlayer,
    resolveServerIdForStream,
    detailItemStorageKey,
  ]);

  // Monitor active iframe / clean-embed for CSP violations or stalled server timeouts
  useEffect(() => {
    if (
      !isWatchingInGallery ||
      (playerRenderMode !== "iframe" && playerRenderMode !== "clean-embed") ||
      !activeGallerySource ||
      allServersFailed
    ) {
      return undefined;
    }

    const advanceFromCleanEmbedOrIframe = (reason: string) => {
      if (
        playerRenderMode === "clean-embed" &&
        activeExtractedIdx + 1 < extractedStreams.length
      ) {
        const currentStream = extractedStreams[activeExtractedIdx];
        recordServerFailure(resolveServerIdForStream(currentStream));
        const nextIdx = activeExtractedIdx + 1;
        const nextItem = extractedStreams[nextIdx];
        playAttemptStartedAtRef.current = performance.now();
        setIsPlayerLoading(true);
        setActiveExtractedIdx(nextIdx);
        setPlayerRenderMode(
          nextItem?.type === "clean-embed" ? "clean-embed" : "direct",
        );
        return;
      }
      if (playerRenderMode === "clean-embed") {
        const currentStream = extractedStreams[activeExtractedIdx];
        recordServerFailure(resolveServerIdForStream(currentStream));
        playAttemptStartedAtRef.current = performance.now();
        setIsPlayerLoading(true);
        setPlayerRenderMode("iframe");
        return;
      }
      advanceFailoverServer(reason);
    };

    const onCspViolation = (e: SecurityPolicyViolationEvent) => {
      const directive = String(e.effectiveDirective || e.violatedDirective || '');
      if (!directive.startsWith('frame-src') && !directive.startsWith('child-src')) {
        return;
      }
      const blocked = String(e.blockedURI || '');
      const matchesCurrent =
        blocked.includes(activeGallerySource.host) ||
        blocked.includes('2vcdn.skin') ||
        (activeGallerySource.origins || []).some((orig) => blocked.startsWith(orig));

      if (matchesCurrent) {
        advanceFromCleanEmbedOrIframe('csp-violation');
      }
    };
    document.addEventListener('securitypolicyviolation', onCspViolation);

    // Watchdog timeout: if iframe fails to load within server timeoutMs, automatically try next server
    const timeoutMs = Math.max(8500, activeGallerySource.timeoutMs || 11000);
    const watchdog = setTimeout(() => {
      if (!loadedCurrentAttemptRef.current) {
        advanceFromCleanEmbedOrIframe('timeout');
      }
    }, timeoutMs);

    return () => {
      clearTimeout(watchdog);
      document.removeEventListener('securitypolicyviolation', onCspViolation);
    };
  }, [
    isWatchingInGallery,
    playerRenderMode,
    activeGallerySource,
    allServersFailed,
    activeExtractedIdx,
    extractedStreams,
    resolveServerIdForStream,
    advanceFailoverServer,
  ]);

  // Stop audio & release iframe / HLS resources when closing or stopping gallery player
  useEffect(() => {
    if (!isWatchingInGallery && !showHeroTrailer) {
      cleanupDirectVideoPlayer();
      if (playerIframeRef.current) {
        try {
          playerIframeRef.current.src = 'about:blank';
        } catch {}
      }
    }
    if (!isWatchingInGallery) {
      clearExternalSubtitleBlobs();
    }
  }, [isWatchingInGallery, showHeroTrailer, cleanupDirectVideoPlayer, clearExternalSubtitleBlobs]);

  // Unified subtitle list across ALL player modes (direct, clean-embed, iframe)
  // Stream & Worker-extracted companion tracks are listed FIRST via mergeStreamFirst.
  const activeSubtitlesList = useMemo<ExtractedSubtitleTrack[]>(() => {
    if (!isWatchingInGallery) return [];
    const rawStreamSubs =
      extractedStreams[activeExtractedIdx]?.subtitles ||
      extractedStreams[0]?.subtitles ||
      [];
    const normalizedStreamSubs: ExtractedSubtitleTrack[] = rawStreamSubs.map((s, i) => ({
      ...s,
      id: s.id || `worker:stream:${i}:${s.lang}`,
      provider: s.provider || "worker",
      remoteUrl: s.remoteUrl || s.proxiedUrl || s.url,
      loaded: s.loaded ?? false,
      label: s.label.includes("·") ? s.label : `${s.label} · Source`,
    }));
    const sameSourceSubs = mergeStreamFirst(workerBridgeSubtitles, normalizedStreamSubs);
    const merged = mergeStreamFirst(sameSourceSubs, externalSubtitles).map((t) => ({
      ...t,
      default: false,
    }));
    merged.sort((a, b) => {
      const aSame = a.provider === "stream" || a.provider === "worker" ? 0 : 1;
      const bSame = b.provider === "stream" || b.provider === "worker" ? 0 : 1;
      if (a.lang === "ar" && b.lang !== "ar") return -1;
      if (b.lang === "ar" && a.lang !== "ar") return 1;
      return aSame - bSame;
    });
    if (merged.length > 0) {
      const arSameIdx = merged.findIndex(
        (s) => s.lang === "ar" && (s.provider === "stream" || s.provider === "worker"),
      );
      const arIdx = arSameIdx >= 0 ? arSameIdx : merged.findIndex((s) => s.lang === "ar");
      const defIdx = arIdx >= 0 ? arIdx : 0;
      merged[defIdx] = { ...merged[defIdx], default: true };
    }
    return merged;
  }, [
    isWatchingInGallery,
    workerBridgeSubtitles,
    extractedStreams,
    activeExtractedIdx,
    externalSubtitles,
  ]);

  // Select default subtitle track (Arabic prioritized) whenever available tracks change
  useEffect(() => {
    if (activeSubtitlesList.length === 0) {
      setActiveSubtitleIdx(null);
      setActiveTrackCues([]);
      setLoadingSubtitleIdx(null);
      return;
    }
    const defaultIdx = activeSubtitlesList.findIndex((s) => s.default);
    setActiveSubtitleIdx(defaultIdx >= 0 ? defaultIdx : 0);
  }, [activeSubtitlesList]);

  // Lazy-load parsed cues for the active subtitle track
  useEffect(() => {
    let cancelled = false;
    const tokenAtStart = attemptTokenRef.current;
    if (
      !isWatchingInGallery ||
      activeSubtitleIdx === null ||
      !activeSubtitlesList[activeSubtitleIdx]
    ) {
      setActiveTrackCues([]);
      setLoadingSubtitleIdx(null);
      return undefined;
    }
    const track = activeSubtitlesList[activeSubtitleIdx];
    if (track.loaded && Array.isArray(track.cues) && track.cues.length > 0) {
      setActiveTrackCues(track.cues);
      setLoadingSubtitleIdx(null);
      return undefined;
    }
    setLoadingSubtitleIdx(activeSubtitleIdx);
    void ensureTrackLoaded(track)
      .then((loadedTrack) => {
        if (!cancelled && attemptTokenRef.current === tokenAtStart) {
          setActiveTrackCues(loadedTrack.cues || []);
          setLoadingSubtitleIdx(null);
        }
      })
      .catch(() => {
        if (!cancelled && attemptTokenRef.current === tokenAtStart) {
          setActiveTrackCues([]);
          setLoadingSubtitleIdx(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isWatchingInGallery, activeSubtitleIdx, activeSubtitlesList]);

  // Automatic 25fps <-> 23.976fps subtitle retiming when cues overflow real media duration
  useEffect(() => {
    if (
      !isWatchingInGallery ||
      activeSubtitleIdx === null ||
      activeTrackCues.length === 0 ||
      clockState.duration <= 600 ||
      clockState.durationIsEstimated ||
      (clockState.source !== "video" && clockState.source !== "bridge")
    ) {
      return;
    }
    const activeTrack = activeSubtitlesList[activeSubtitleIdx];
    const trackKey = activeTrack?.id || activeTrack?.url || String(activeSubtitleIdx);
    if (retimedTrackIdsRef.current.has(trackKey)) return;
    const { cues: retimed, factor } = autoRetimeCues(activeTrackCues, clockState.duration);
    retimedTrackIdsRef.current.add(trackKey);
    if (factor !== 1) {
      setActiveTrackCues(retimed);
    }
  }, [
    isWatchingInGallery,
    activeSubtitleIdx,
    activeSubtitlesList,
    activeTrackCues,
    clockState.duration,
    clockState.durationIsEstimated,
    clockState.source,
  ]);

  const handleRefreshSubtitlesForLanguages = useCallback(async () => {
    if (!detailedItem || !isWatchingInGallery) return;
    const tokenAtStart = attemptTokenRef.current;
    setIsLoadingSubtitles(true);
    try {
      const extSubs = await fetchExternalSubtitles({
        tmdbId: detailedItem.id,
        imdbId: activeImdbId || undefined,
        mediaType: detailedItem.mediaType,
        season: detailedItem.mediaType === "tv" ? selectedSeason : undefined,
        episode: detailedItem.mediaType === "tv" ? selectedEpisode : undefined,
      });
      if (attemptTokenRef.current !== tokenAtStart) {
        revokeSubtitleBlobUrls(extSubs);
        return;
      }
      if (externalSubtitlesRef.current.length > 0) {
        revokeSubtitleBlobUrls(externalSubtitlesRef.current);
      }
      externalSubtitlesRef.current = extSubs;
      setExternalSubtitles(extSubs);
      setExtractedStreams((prev) =>
        prev.map((v) => ({
          ...v,
          subtitles: [
            ...(v.subtitles || []).filter((s) => s.provider === "worker" || s.provider === "local"),
            ...extSubs,
          ],
        })),
      );
    } catch {
      // ignore fetch error
    } finally {
      if (attemptTokenRef.current === tokenAtStart) {
        setIsLoadingSubtitles(false);
      }
    }
  }, [detailedItem, isWatchingInGallery, activeImdbId, selectedSeason, selectedEpisode]);

  const handleUploadLocalSubtitle = useCallback(async (file: File) => {
    const localTrack = await createLocalSubtitleTrack(file);
    if (!localTrack) return;
    externalSubtitlesRef.current = [localTrack, ...externalSubtitlesRef.current];
    setExternalSubtitles((prev) => [localTrack, ...prev]);
    setExtractedStreams((prev) =>
      prev.map((v) => ({
        ...v,
        subtitles: [localTrack, ...(v.subtitles || [])],
      })),
    );
    setActiveSubtitleIdx(0);
  }, []);

  // Bind HTML5 <video> element to isolated playbackClock in direct mode
  useEffect(() => {
    const v = videoElementRef.current;
    if (!isWatchingInGallery || playerRenderMode !== "direct" || !v) return undefined;
    return bindVideoElementToClock(v);
  }, [isWatchingInGallery, playerRenderMode, extractedStreams, activeExtractedIdx]);

  const syncControllerRef = useRef<SyncController | null>(null);
  const canReloadStartAt = Boolean(
    playerRenderMode === "iframe" && activeGallerySource?.capabilities?.startAt,
  );

  useEffect(() => {
    if (
      !isWatchingInGallery ||
      (playerRenderMode !== "iframe" && playerRenderMode !== "clean-embed")
    ) {
      syncControllerRef.current?.dispose();
      syncControllerRef.current = null;
      return undefined;
    }

    const ctrl = createSyncController({
      now: () => performance.now(),
      sendSeek: (target, id) => {
        sendIframePlayerCommand(
          playerIframeRef.current,
          { type: "seek", time: target },
          id,
        );
      },
      sendPlay: () => {
        sendIframePlayerCommand(playerIframeRef.current, { type: "play" });
      },
      sendPause: () => {
        sendIframePlayerCommand(playerIframeRef.current, { type: "pause" });
      },
      reloadAt: canReloadStartAt
        ? (target) => {
            const rounded = Math.max(0, Math.floor(target));
            const cur = clockGetState();
            clockAnchor(rounded, {
              duration: cur.duration || (detailedItem?.runtime ?? 0) * 60,
              source: "manual",
              durationIsEstimated: cur.durationIsEstimated,
            });
            setEmbedSeekStartAtSec(rounded);
          }
        : undefined,
      onSeekUnsupported: () => {
        showSeekUnsupportedToast();
      },
    });
    syncControllerRef.current = ctrl;
    return () => {
      ctrl.dispose();
      if (syncControllerRef.current === ctrl) {
        syncControllerRef.current = null;
      }
    };
  }, [
    isWatchingInGallery,
    activeIframeUrlBase,
    playerRenderMode,
    canReloadStartAt,
    showSeekUnsupportedToast,
  ]);

  const bridgeAllowedOrigins = useMemo(() => {
    const set = new Set<string>(ALL_SERVER_FRAME_ORIGINS);
    set.add("https://vidlink.pro");
    set.add("https://player.vidlink.pro");
    set.add("https://cloud.vidlink.pro");
    set.add("https://*.vidlink.pro");
    if (activeIframeUrl) {
      try {
        set.add(new URL(activeIframeUrl).origin);
      } catch {
        // ignore invalid URL
      }
    }
    if (WORKER_ENDPOINT) {
      try {
        set.add(new URL(WORKER_ENDPOINT).origin);
      } catch {
        // ignore invalid URL
      }
    }
    return Array.from(set);
  }, [activeIframeUrl]);

  const gotTimeSinceLoadRef = useRef(false);

  // Origin-allowlisted postMessage bridge for iframe / clean-embed players
  const bridge = useIframePlayerBridge({
    enabled:
      isWatchingInGallery &&
      (playerRenderMode === "iframe" || playerRenderMode === "clean-embed"),
    iframeRef: playerIframeRef,
    allowedOrigins: bridgeAllowedOrigins,
    sessionKey: `${activeGallerySource?.id ?? ""}:${activeIframeUrl}`,
    onEvent: (ev) => {
      if (typeof ev.currentTime === "number" && Number.isFinite(ev.currentTime)) {
        if (!gotTimeSinceLoadRef.current) {
          gotTimeSinceLoadRef.current = true;
          if (activeGallerySource) {
            const syncElapsedMs = Math.max(
              150,
              performance.now() - playAttemptStartedAtRef.current,
            );
            recordServerSuccess(
              activeGallerySource.id,
              syncElapsedMs,
              detailItemStorageKey,
            );
          }
        }
      }
      const decision = syncControllerRef.current
        ? syncControllerRef.current.onReport(ev)
        : "accept";
      if (decision === "ignore") return;
      if (ev.currentTime !== undefined) {
        const paused =
          ev.paused !== undefined
            ? ev.paused
            : ev.kind === "pause" || ev.kind === "ended"
              ? true
              : ev.kind === "play" || ev.kind === "timeupdate" || ev.kind === "media"
                ? false
                : undefined;
        clockReport(
          ev.currentTime,
          {
            duration: ev.duration,
            paused,
            rate: ev.rate,
            source: "bridge",
          },
          ev.kind === "timeupdate" ? 0.35 : 0,
        );
      } else if (ev.kind === "play" || ev.kind === "pause" || ev.kind === "ended") {
        clockSync({ paused: ev.kind !== "play", source: "bridge" });
      }
    },
    onMediaData: () => {
      persistCurrentProgress();
    },
    onSubtitlesDiscovered: (discovered) => {
      setWorkerBridgeSubtitles((prev) => {
        const added: ExtractedSubtitleTrack[] = discovered
          .filter((d) => Boolean(d.url))
          .map((item, idx) => {
            const guessed = guessLangFromLabelOrUrl(item.label || item.lang || "", item.url);
            const proxied = buildWorkerProxyUrl(
              item.url,
              item.referer || activeGallerySource?.url,
            );
            return {
              id: `worker:live:${idx}:${guessed.lang}:${item.url}`,
              provider: "worker",
              url: item.url,
              proxiedUrl: proxied,
              remoteUrl: proxied,
              lang: guessed.lang,
              label: `${guessed.label} · Source`,
              loaded: false,
            };
          });
        return added.length > 0 ? mergeStreamFirst(added, prev) : prev;
      });
    },
  });

  const controlMode: PlayerControlMode =
    playerRenderMode === "direct"
      ? "direct"
      : bridge.active
        ? "bridged"
        : "none";

  const [iframeLoadStamp, setIframeLoadStamp] = useState(0);

  // 8000ms post-load watchdog: fallback from Worker /embed to raw URL if no sync-capable event was received
  useEffect(() => {
    if (
      !isWatchingInGallery ||
      (playerRenderMode !== "iframe" && playerRenderMode !== "clean-embed") ||
      iframeLoadStamp === 0
    ) {
      return undefined;
    }
    const timer = setTimeout(() => {
      const srvCaps = activeGallerySource?.capabilities as
        | CinemaServerConfig["capabilities"]
        | undefined;
      if (
        playerRenderMode === "iframe" &&
        srvCaps?.workerBridge &&
        activeGallerySource &&
        !gotTimeSinceLoadRef.current
      ) {
        let alreadyFailed = false;
        try {
          const failKey = `nl_wb_fail_${activeGallerySource.id}`;
          const raw = sessionStorage.getItem(failKey);
          const ts = raw ? Number(raw) : NaN;
          alreadyFailed =
            raw !== null &&
            raw !== "1" &&
            Number.isFinite(ts) &&
            Date.now() - ts <= 30 * 60 * 1000;
          if (!alreadyFailed) {
            sessionStorage.setItem(failKey, String(Date.now()));
          }
        } catch {
          // ignore storage errors
        }
        if (!alreadyFailed) {
          setWorkerBridgeRevision((r) => r + 1);
          return;
        }
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, [
    isWatchingInGallery,
    playerRenderMode,
    iframeLoadStamp,
    activeGallerySource,
  ]);

  const handleUserSeek = useCallback((targetSec: number) => {
    syncControllerRef.current?.userSeek(targetSec);
  }, []);

  const handleUserTogglePlay = useCallback(() => {
    syncControllerRef.current?.userTogglePlay();
  }, []);

  // Save Continue Watching progress every 10s when clock source is video or bridge
  useEffect(() => {
    if (!isWatchingInGallery || !detailedItem) return undefined;
    const interval = setInterval(() => {
      persistCurrentProgress();
    }, 10_000);
    return () => clearInterval(interval);
  }, [isWatchingInGallery, detailedItem, persistCurrentProgress]);

  // Synchronize HTML5 <video> TextTrackList mode with activeSubtitleIdx (always hidden in direct mode so SubtitleOverlay is the sole renderer)
  const syncVideoTextTracks = useCallback((selectedIdx: number | null) => {
    const video = videoElementRef.current;
    if (!video || !video.textTracks) return;
    const tracks = video.textTracks;
    for (let i = 0; i < tracks.length; i += 1) {
      tracks[i].mode = selectedIdx !== null && i === selectedIdx ? "hidden" : "disabled";
    }
  }, []);

  useEffect(() => {
    syncVideoTextTracks(activeSubtitleIdx);
    const timer = setTimeout(() => syncVideoTextTracks(activeSubtitleIdx), 250);
    return () => clearTimeout(timer);
  }, [activeSubtitleIdx, activeSubtitlesList, syncVideoTextTracks]);

  // Track native Fullscreen API state and auto-hide controls after 3s of mouse inactivity in fullscreen
  useEffect(() => {
    const onFsChange = () => {
      const doc = document as any;
      const fsEl = doc.fullscreenElement || doc.webkitFullscreenElement || null;
      setIsNativeFullscreen(Boolean(fsEl));
    };
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
    };
  }, []);

  const isAnyFullscreen = isCssFullscreen || isNativeFullscreen;

  const bumpControlsVisibility = useCallback(() => {
    setIsControlsVisible(true);
    if (controlsHideTimerRef.current) {
      clearTimeout(controlsHideTimerRef.current);
      controlsHideTimerRef.current = null;
    }
    const shouldAutoHide =
      isWatchingInGallery &&
      !isSubtitleMenuOpen &&
      (playerRenderMode !== "direct" || !isVideoPaused);
    if (shouldAutoHide) {
      controlsHideTimerRef.current = setTimeout(() => {
        setIsControlsVisible(false);
      }, 2500);
    }
  }, [isWatchingInGallery, isSubtitleMenuOpen, playerRenderMode, isVideoPaused]);

  useEffect(() => {
    if (!isWatchingInGallery || isSubtitleMenuOpen) {
      setIsControlsVisible(true);
      if (controlsHideTimerRef.current) {
        clearTimeout(controlsHideTimerRef.current);
        controlsHideTimerRef.current = null;
      }
      return undefined;
    }
    bumpControlsVisibility();
    const onGlobalActivity = () => bumpControlsVisibility();
    window.addEventListener("mousemove", onGlobalActivity, { passive: true });
    window.addEventListener("touchstart", onGlobalActivity, { passive: true });
    window.addEventListener("keydown", onGlobalActivity);
    return () => {
      window.removeEventListener("mousemove", onGlobalActivity);
      window.removeEventListener("touchstart", onGlobalActivity);
      window.removeEventListener("keydown", onGlobalActivity);
      if (controlsHideTimerRef.current) {
        clearTimeout(controlsHideTimerRef.current);
        controlsHideTimerRef.current = null;
      }
    };
  }, [isWatchingInGallery, isSubtitleMenuOpen, playerRenderMode, isVideoPaused, bumpControlsVisibility]);

  const handleToggleVideoPlay = useCallback(() => {
    const video = videoElementRef.current;
    if (video && playerRenderMode === "direct") {
      if (video.paused) {
        void video.play().catch(() => {});
      } else {
        video.pause();
      }
    }
    bumpControlsVisibility();
  }, [playerRenderMode, bumpControlsVisibility]);

  // Resolve IMDb / YouTube trailer when showHeroTrailer opens
  useEffect(() => {
    if (!showHeroTrailer || !detailedItem) {
      setResolvedTrailer(null);
      setImdbTrailerLoaded(false);
      return undefined;
    }
    let cancelled = false;
    const ctrl = new AbortController();
    setImdbTrailerLoaded(false);
    void resolveTrailer({
      imdbId: activeImdbId || detailedItem.imdbId,
      youtubeKey: detailedItem.trailerKey,
      signal: ctrl.signal,
    }).then((res) => {
      if (!cancelled) {
        setResolvedTrailer(res);
      }
    });
    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [showHeroTrailer, detailedItem, activeImdbId]);

  // 7-second watchdog for IMDb trailer iframe -> fallback to YouTube if available
  useEffect(() => {
    if (
      !showHeroTrailer ||
      resolvedTrailer?.kind !== "imdb" ||
      trailerFallbackToYoutube ||
      imdbTrailerLoaded
    ) {
      return undefined;
    }
    const timer = setTimeout(() => {
      if (!imdbTrailerLoaded && detailedItem?.trailerKey) {
        setTrailerFallbackToYoutube(true);
      }
    }, 7000);
    return () => clearTimeout(timer);
  }, [
    showHeroTrailer,
    resolvedTrailer,
    trailerFallbackToYoutube,
    imdbTrailerLoaded,
    detailedItem?.trailerKey,
  ]);

  const handleToggleVideoMute = useCallback(() => {
    const video = videoElementRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsVideoMuted(video.muted);
    bumpControlsVisibility();
  }, [bumpControlsVisibility]);

  const handleChangeVideoVolume = useCallback(
    (nextVolume: number) => {
      const video = videoElementRef.current;
      const clamped = Math.max(0, Math.min(1, nextVolume));
      setVideoVolume(clamped);
      if (!video) return;
      video.volume = clamped;
      video.muted = clamped === 0;
      setIsVideoMuted(video.muted);
      bumpControlsVisibility();
    },
    [bumpControlsVisibility],
  );

  const handleToggleGalleryFullscreen = useCallback(() => {
    const el = galleryStageRef.current as any;
    if (!el) return;

    if (isCssFullscreen) {
      setIsCssFullscreen(false);
      return;
    }

    const doc = document as any;
    const fullscreenEl =
      doc.fullscreenElement || doc.webkitFullscreenElement || null;

    if (fullscreenEl) {
      try {
        const exitFn = doc.exitFullscreen || doc.webkitExitFullscreen;
        if (exitFn) {
          void Promise.resolve(exitFn.call(doc)).catch(() => {
            setIsCssFullscreen(false);
          });
          return;
        }
      } catch {}
      setIsCssFullscreen(false);
      return;
    }

    try {
      const reqFn =
        el.requestFullscreen ||
        el.webkitRequestFullscreen ||
        el.webkitEnterFullscreen;
      if (reqFn) {
        void Promise.resolve(reqFn.call(el)).catch(() => {
          setIsCssFullscreen((v) => !v);
        });
        return;
      }
    } catch {}

    // iOS Safari fallback: CSS fixed viewport fullscreen
    setIsCssFullscreen((v) => !v);
  }, [isCssFullscreen]);

  useEffect(() => {
    setHeroServersOpen(false);
  }, [heroIndex, activeTab]);

  useEffect(() => {
    if (playerIframeRef.current) {
      try {
        playerIframeRef.current.src = 'about:blank';
      } catch {}
    }
    clearExternalSubtitleBlobs();
    clockReset("manual");
    setEmbedSeekStartAtSec(null);
    appliedInitialSeekRef.current = false;
    attemptTokenRef.current += 1;
    setShowHeroTrailer(false);
    setTrailerFallbackToYoutube(false);
    setResolvedTrailer(null);
    setImdbTrailerLoaded(false);
    setIsWatchingInGallery(false);
    setIsPlayerLoading(false);
    setAllServersFailed(false);
    setIsCssFullscreen(false);
    setIsSubtitleMenuOpen(false);
    setSubtitleOffsetSec(0);
    setActiveTrackCues([]);
    setLoadingSubtitleIdx(null);
    setActiveGalleryServerIdx(0);
    const dl = deepLinkSeRef.current;
    if (dl && selectedItemId !== null && dl.itemId === selectedItemId) {
      setSelectedSeason(dl.s && dl.s > 0 ? dl.s : 1);
      setSelectedEpisode(dl.e && dl.e > 0 ? dl.e : 1);
      deepLinkSeRef.current = null;
    } else {
      setSelectedSeason(1);
      setSelectedEpisode(1);
    }
    setIsFullSeasonEmbed(false);
    setSeasonEpisodes([]);
    setDetailServersOpen(false);
    setSelectedActor(null);
    setActorDetails(null);
    if (selectedItemId === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCssFullscreen) {
          setIsCssFullscreen(false);
        } else if (selectedActor) {
          setSelectedActor(null);
          setActorDetails(null);
        } else {
          persistCurrentProgress();
          setSelectedItemId(null);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedItemId]);

  // Fetch TV Season Episodes when a TV Series is open in Details Modal
  useEffect(() => {
    if (!detailedItem || detailedItem.mediaType !== 'tv') {
      setSeasonEpisodes([]);
      return;
    }
    let cancelled = false;
    const loadSeasonEps = async () => {
      setLoadingSeasonEpisodes(true);
      const fallbackCount = Math.max(
        1,
        Math.min(
          30,
          detailedItem.episodes && detailedItem.seasons
            ? Math.ceil(detailedItem.episodes / Math.max(1, detailedItem.seasons))
            : 12,
        ),
      );
      try {
        if (tmdbKey) {
          const langParam = `&language=${tmdbLang(currentLang)}`;
          const seasonData = await fetchWithCache(
            `${TMDB_BASE_URL}/tv/${detailedItem.id}/season/${selectedSeason}?api_key=${tmdbKey}${langParam}`,
          );
          if (
            !cancelled &&
            Array.isArray(seasonData?.episodes) &&
            seasonData.episodes.length > 0
          ) {
            setSeasonEpisodes(
              seasonData.episodes.map((ep: any, idx: number) => ({
                episode_number: Number(ep.episode_number) || idx + 1,
                name:
                  ep.name ||
                  (currentLang === 'ar' ? `الحلقة ${idx + 1}` : `Episode ${idx + 1}`),
              })),
            );
            setLoadingSeasonEpisodes(false);
            return;
          }
        }
      } catch {
        // Fallback below
      }
      if (!cancelled) {
        setSeasonEpisodes(
          Array.from({ length: fallbackCount }, (_, idx) => ({
            episode_number: idx + 1,
            name: currentLang === 'ar' ? `الحلقة ${idx + 1}` : `Episode ${idx + 1}`,
          })),
        );
        setLoadingSeasonEpisodes(false);
      }
    };
    void loadSeasonEps();
    return () => {
      cancelled = true;
    };
  }, [detailedItem, selectedSeason, tmdbKey, currentLang]);

  // Fetch Actor Details when a Cast Member is clicked
  const handleSelectActor = useCallback(
    async (actor: CastMember) => {
      setSelectedActor(actor);
      if (!actor.id || !tmdbKey) {
        setActorDetails({
          id: actor.id || 0,
          name: actor.name,
          character: actor.character,
          profilePath: actor.profilePath,
          biography:
            currentLang === 'ar'
              ? 'نبذة الممثل غير متوفرة حالياً في الوضع غير المتصل.'
              : 'Actor biography currently unavailable.',
          knownWorks: [],
        });
        return;
      }

      setLoadingActor(true);
      try {
        const langParam = `&language=${tmdbLang(currentLang)}`;
        const personData = await fetchWithCache(
          `${TMDB_BASE_URL}/person/${actor.id}?api_key=${tmdbKey}${langParam}&append_to_response=combined_credits`,
        );

        let bio = personData?.biography || '';
        if (!bio.trim() && currentLang !== 'en') {
          try {
            const enPerson = await fetchWithCache(
              `${TMDB_BASE_URL}/person/${actor.id}?api_key=${tmdbKey}&language=en-US`,
            );
            bio = enPerson?.biography || '';
          } catch {}
        }

        const rawCredits: any[] = personData?.combined_credits?.cast || [];
        const uniqueCreditsMap = new Map<number, any>();
        rawCredits.forEach((c) => {
          if (
            c &&
            c.id &&
            (c.media_type === 'movie' || c.media_type === 'tv') &&
            (c.poster_path || c.backdrop_path) &&
            !uniqueCreditsMap.has(c.id)
          ) {
            uniqueCreditsMap.set(c.id, c);
          }
        });

        const topCredits = Array.from(uniqueCreditsMap.values())
          .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
          .slice(0, 10)
          .map((c) => ({
            id: c.id,
            mediaType: (c.media_type === 'tv' ? 'tv' : 'movie') as Media,
            title: c.title || c.name || 'Untitled',
            posterPath: c.poster_path || c.backdrop_path || '',
            year: String(c.release_date || c.first_air_date || '').split('-')[0],
            rating: typeof c.vote_average === 'number' ? c.vote_average : 7.5,
          }));

        setActorDetails({
          id: actor.id,
          name: personData?.name || actor.name,
          character: actor.character,
          profilePath: personData?.profile_path || actor.profilePath,
          biography:
            bio.trim() ||
            (currentLang === 'ar'
              ? 'لا تتوفر سيرة ذاتية مفصلة لهذا الممثل في قاعدة البيانات حالياً.'
              : 'Detailed biography is not available for this actor yet.'),
          birthday: personData?.birthday || undefined,
          placeOfBirth: personData?.place_of_birth || undefined,
          knownForDepartment: personData?.known_for_department || undefined,
          knownWorks: topCredits,
        });
      } catch {
        setActorDetails({
          id: actor.id,
          name: actor.name,
          character: actor.character,
          profilePath: actor.profilePath,
          biography:
            currentLang === 'ar'
              ? 'تعذر تحميل تفاصيل الممثل الإضافية.'
              : 'Could not load additional actor details.',
          knownWorks: [],
        });
      } finally {
        setLoadingActor(false);
      }
    },
    [tmdbKey, currentLang],
  );

  const handleQuickWatch = useCallback((item: CinemaItem) => {
    autoStartWatchRef.current = true;
    setSelectedItemId(item.id, item.mediaType);
  }, [setSelectedItemId]);

  const rowProps = useMemo(() => ({
    isTouch,
    activeHoverId,
    setActiveHoverId,
    hoverTimer,
    setSelectedItemId,
    onQuickWatch: handleQuickWatch,
    t,
    isFavoriteFn: (id: number, mediaType: 'movie' | 'tv') => has(id, mediaType, 'favorite')
  }), [isTouch, activeHoverId, setActiveHoverId, hoverTimer, setSelectedItemId, handleQuickWatch, t, has]);

  const watchlistItems = useMemo(
    () => movieItems.filter((i) => i.status === 'watchlist'),
    [movieItems]
  );

  const openWatchlistItem = useCallback((rec: { tmdb_id: number; media_type: 'movie' | 'tv' }) => {
    setActiveTab(rec.media_type === 'tv' ? 'series' : 'movies');
    setShowWatchlist(false);
    setSelectedItemId(rec.tmdb_id, rec.media_type);
  }, [setSelectedItemId]);

  const isOpenForAudio = Boolean(detailedItem || selectedItemId);
  const { isMuted, toggleMute } = useMoviesMusic(isOpenForAudio);

  const [scrolled, setScrolled] = useState(false);
  const mainScrollRef = useRef<HTMLDivElement | null>(null);

  const handleScrollEvent = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrolled(e.currentTarget.scrollTop > 40);
  }, []);

  useEffect(() => {
    setMovieActive(Boolean(detailedItem));
    registerMovieBack(() => {
      persistCurrentProgress();
      setDetailedItem(null);
      setSelectedItemId(null);
    });
  }, [detailedItem, setMovieActive, registerMovieBack, persistCurrentProgress, setSelectedItemId]);

  useEffect(() => {
    return () => { setMovieActive(false); };
  }, [setMovieActive]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("nl-cinema-active");
    return () => {
      document.body.style.overflow = prev;
      document.body.classList.remove("nl-cinema-active");
    };
  }, []);

  // Read deep-link parameters (?id=&type=movie|tv&s=&e=) on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      const idNum = Number(params.get("id"));
      if (Number.isFinite(idNum) && idNum > 0) {
        const rawType = params.get("type");
        const mediaType: Media =
          rawType === "tv" || params.get("view") === "series" ? "tv" : "movie";
        const sNum = Number(params.get("s"));
        const eNum = Number(params.get("e"));
        if (mediaType === "tv" && (sNum > 0 || eNum > 0)) {
          deepLinkSeRef.current = {
            itemId: idNum,
            s: sNum > 0 ? sNum : 1,
            e: eNum > 0 ? eNum : 1,
          };
        }
        setActiveTab(mediaType === "tv" ? "series" : "movies");
        setSelectedItemId(idNum, mediaType);
      }
    } catch {
      // ignore URL errors
    }
  }, [setSelectedItemId]);

  // Keep deep-link URL parameters (&id=&type=&s=&e=) synchronized when opening/closing a title
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const url = new URL(window.location.href);
      if (selectedItemId !== null) {
        const effType: Media =
          detailedItem?.mediaType ??
          selectedMediaType ??
          (activeTab === "series" ? "tv" : "movie");
        url.searchParams.set("id", String(selectedItemId));
        url.searchParams.set("type", effType);
        if (effType === "tv") {
          url.searchParams.set("s", String(selectedSeason));
          url.searchParams.set("e", String(selectedEpisode));
        } else {
          url.searchParams.delete("s");
          url.searchParams.delete("e");
        }
      } else {
        url.searchParams.delete("id");
        url.searchParams.delete("type");
        url.searchParams.delete("s");
        url.searchParams.delete("e");
      }
      window.history.replaceState(
        window.history.state,
        "",
        url.pathname + url.search + url.hash,
      );
    } catch {
      // ignore history errors
    }
  }, [selectedItemId, selectedMediaType, detailedItem?.mediaType, activeTab, selectedSeason, selectedEpisode]);

  const prevActiveTabRef = useRef(activeTab);
  useEffect(() => {
    if (prevActiveTabRef.current === activeTab) return;
    prevActiveTabRef.current = activeTab;
    setSelectedGenreId(null);
    setSearchQuery("");
    setDetailedItem(null);
    setSelectedItemId(null);
    setHeroIndex(0);
  }, [activeTab, setSelectedItemId]);

  const lastHeaderHeightRef = useRef<number>(0);
  useEffect(() => {
    const header = document.querySelector(".nl-cinema-header") as HTMLElement | null;
    if (!header) return;
    const ro = new ResizeObserver(() => {
      const h = header.offsetHeight;
      if (h !== lastHeaderHeightRef.current) {
        lastHeaderHeightRef.current = h;
        requestAnimationFrame(() => {
          document.documentElement.style.setProperty("--cinema-header-h", `${h}px`);
        });
      }
    });
    ro.observe(header);
    return () => ro.disconnect();
  }, []);

  // Load Movies
  useEffect(() => {
    let cancelled = false;
    setMoviesLoading(true);

    if (!tmdbKey) {
      if (!cancelled) {
        setTrendingMovies(FALLBACK_MOVIES.map(r => normalizeItem(r, 'movie', currentLang)));
        setTopRatedMovies([...FALLBACK_MOVIES].reverse().map(r => normalizeItem(r, 'movie', currentLang)));
        setPopularMovies(FALLBACK_MOVIES.map(r => normalizeItem(r, 'movie', currentLang)));
        setActionMovies(FALLBACK_MOVIES.filter(m => m.genres.includes("Action")).map(r => normalizeItem(r, 'movie', currentLang)));
        setHorrorMovies(FALLBACK_MOVIES.filter(m => m.genres.includes("Horror")).map(r => normalizeItem(r, 'movie', currentLang)));
        setDramaMovies(FALLBACK_MOVIES.filter(m => m.genres.includes("Drama")).map(r => normalizeItem(r, 'movie', currentLang)));
        setSciFiMovies(FALLBACK_MOVIES.filter(m => m.genres.includes("Sci-Fi")).map(r => normalizeItem(r, 'movie', currentLang)));
        setMovieGenres(FALLBACK_GENRES.map(g => ({ id: g.id, name: g.name[currentLang as "en" | "ar" | "fr"] || g.name.en })));
        setMoviesLoading(false);
      }
      return;
    }

    const loadMovies = async () => {
      try {
        const langParam = `&language=${tmdbLang(currentLang)}`;

        const results = await Promise.allSettled([
          fetchWithCache(`${TMDB_BASE_URL}/genre/movie/list?api_key=${tmdbKey}${langParam}`),
          fetchWithCache(`${TMDB_BASE_URL}/trending/movie/week?api_key=${tmdbKey}${langParam}`),
          fetchWithCache(`${TMDB_BASE_URL}/movie/top_rated?api_key=${tmdbKey}${langParam}`),
          fetchWithCache(`${TMDB_BASE_URL}/movie/popular?api_key=${tmdbKey}${langParam}`),
          fetchWithCache(`${TMDB_BASE_URL}/discover/movie?api_key=${tmdbKey}${langParam}&with_genres=28`),
          fetchWithCache(`${TMDB_BASE_URL}/discover/movie?api_key=${tmdbKey}${langParam}&with_genres=27`),
          fetchWithCache(`${TMDB_BASE_URL}/discover/movie?api_key=${tmdbKey}${langParam}&with_genres=18`),
          fetchWithCache(`${TMDB_BASE_URL}/discover/movie?api_key=${tmdbKey}${langParam}&with_genres=878`)
        ]);

        if (cancelled) return;

        if (results[0].status === 'fulfilled' && results[0].value?.genres) {
          setMovieGenres(results[0].value.genres);
        } else {
          setMovieGenres(FALLBACK_GENRES.map(g => ({ id: g.id, name: g.name[currentLang as "en" | "ar" | "fr"] || g.name.en })));
        }

        if (results[1].status === 'fulfilled' && results[1].value?.results?.length) {
          setTrendingMovies(results[1].value.results.map((r: any) => normalizeItem(r, 'movie', currentLang)));
        } else {
          setTrendingMovies(FALLBACK_MOVIES.map(r => normalizeItem(r, 'movie', currentLang)));
        }

        if (results[2].status === 'fulfilled' && results[2].value?.results?.length) {
          setTopRatedMovies(results[2].value.results.map((r: any) => normalizeItem(r, 'movie', currentLang)));
        } else {
          setTopRatedMovies([...FALLBACK_MOVIES].reverse().map(r => normalizeItem(r, 'movie', currentLang)));
        }

        if (results[3].status === 'fulfilled' && results[3].value?.results?.length) {
          setPopularMovies(results[3].value.results.map((r: any) => normalizeItem(r, 'movie', currentLang)));
        } else {
          setPopularMovies(FALLBACK_MOVIES.map(r => normalizeItem(r, 'movie', currentLang)));
        }

        if (results[4].status === 'fulfilled' && results[4].value?.results?.length) {
          setActionMovies(results[4].value.results.map((r: any) => normalizeItem(r, 'movie', currentLang)));
        } else {
          setActionMovies(FALLBACK_MOVIES.filter(m => m.genres.includes("Action")).map(r => normalizeItem(r, 'movie', currentLang)));
        }

        if (results[5].status === 'fulfilled' && results[5].value?.results?.length) {
          setHorrorMovies(results[5].value.results.map((r: any) => normalizeItem(r, 'movie', currentLang)));
        } else {
          setHorrorMovies(FALLBACK_MOVIES.filter(m => m.genres.includes("Horror")).map(r => normalizeItem(r, 'movie', currentLang)));
        }

        if (results[6].status === 'fulfilled' && results[6].value?.results?.length) {
          setDramaMovies(results[6].value.results.map((r: any) => normalizeItem(r, 'movie', currentLang)));
        } else {
          setDramaMovies(FALLBACK_MOVIES.filter(m => m.genres.includes("Drama")).map(r => normalizeItem(r, 'movie', currentLang)));
        }

        if (results[7].status === 'fulfilled' && results[7].value?.results?.length) {
          setSciFiMovies(results[7].value.results.map((r: any) => normalizeItem(r, 'movie', currentLang)));
        } else {
          setSciFiMovies(FALLBACK_MOVIES.filter(m => m.genres.includes("Sci-Fi")).map(r => normalizeItem(r, 'movie', currentLang)));
        }
      } catch (err) {
        console.error("Failed to fetch TMDB Live movies, using fallbacks:", err);
        setGlobalError(true);
      } finally {
        if (!cancelled) setMoviesLoading(false);
      }
    };
    loadMovies();
    return () => { cancelled = true; };
  }, [tmdbKey, currentLang]);

  // Trigger series load when Series tab is active OR on idle after movies finish loading
  useEffect(() => {
    if (activeTab === 'series') {
      setSeriesLoadTriggered(true);
      return undefined;
    }
    if (!moviesLoading && !seriesLoadTriggered) {
      const w = window as any;
      if (typeof w.requestIdleCallback === 'function') {
        const id = w.requestIdleCallback(() => setSeriesLoadTriggered(true), { timeout: 1500 });
        return () => w.cancelIdleCallback?.(id);
      }
      const timer = setTimeout(() => setSeriesLoadTriggered(true), 600);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [activeTab, moviesLoading, seriesLoadTriggered]);

  // Load Series (deferred until Series tab is opened or idle after movies finish)
  useEffect(() => {
    if (!seriesLoadTriggered) return;
    let cancelled = false;
    setSeriesLoading(true);

    if (!tmdbKey) {
      if (!cancelled) {
        setTrendingSeries(FALLBACK_SERIES.map(r => normalizeItem(r, 'tv', currentLang)));
        setTopRatedSeries([...FALLBACK_SERIES].reverse().map(r => normalizeItem(r, 'tv', currentLang)));
        setPopularSeries(FALLBACK_SERIES.map(r => normalizeItem(r, 'tv', currentLang)));
        setActionSeries(FALLBACK_SERIES.filter(s => s.genres.includes("Action") || s.genres.includes("Sci-Fi")).map(r => normalizeItem(r, 'tv', currentLang)));
        setMysterySeries(FALLBACK_SERIES.filter(s => s.genres.includes("Mystery")).map(r => normalizeItem(r, 'tv', currentLang)));
        setDramaSeries(FALLBACK_SERIES.filter(s => s.genres.includes("Drama")).map(r => normalizeItem(r, 'tv', currentLang)));
        setAnimationSeries(FALLBACK_SERIES.filter(s => s.genres.includes("Animation")).map(r => normalizeItem(r, 'tv', currentLang)));
        setSeriesGenres(FALLBACK_SERIES_GENRES.map(g => ({ id: g.id, name: g.name[currentLang as "en" | "ar" | "fr"] || g.name.en })));
        setSeriesLoading(false);
      }
      return;
    }

    const loadSeries = async () => {
      try {
        const langParam = `&language=${tmdbLang(currentLang)}`;

        const results = await Promise.allSettled([
          fetchWithCache(`${TMDB_BASE_URL}/genre/tv/list?api_key=${tmdbKey}${langParam}`),
          fetchWithCache(`${TMDB_BASE_URL}/trending/tv/week?api_key=${tmdbKey}${langParam}`),
          fetchWithCache(`${TMDB_BASE_URL}/tv/top_rated?api_key=${tmdbKey}${langParam}`),
          fetchWithCache(`${TMDB_BASE_URL}/tv/popular?api_key=${tmdbKey}${langParam}`),
          fetchWithCache(`${TMDB_BASE_URL}/discover/tv?api_key=${tmdbKey}${langParam}&with_genres=10759`),
          fetchWithCache(`${TMDB_BASE_URL}/discover/tv?api_key=${tmdbKey}${langParam}&with_genres=9648`),
          fetchWithCache(`${TMDB_BASE_URL}/discover/tv?api_key=${tmdbKey}${langParam}&with_genres=18`),
          fetchWithCache(`${TMDB_BASE_URL}/discover/tv?api_key=${tmdbKey}${langParam}&with_genres=16`)
        ]);

        if (cancelled) return;

        if (results[0].status === 'fulfilled' && results[0].value?.genres) {
          setSeriesGenres(results[0].value.genres);
        } else {
          setSeriesGenres(FALLBACK_SERIES_GENRES.map(g => ({ id: g.id, name: g.name[currentLang as "en" | "ar" | "fr"] || g.name.en })));
        }

        if (results[1].status === 'fulfilled' && results[1].value?.results?.length) {
          setTrendingSeries(results[1].value.results.map((r: any) => normalizeItem(r, 'tv', currentLang)));
        } else {
          setTrendingSeries(FALLBACK_SERIES.map(r => normalizeItem(r, 'tv', currentLang)));
        }

        if (results[2].status === 'fulfilled' && results[2].value?.results?.length) {
          setTopRatedSeries(results[2].value.results.map((r: any) => normalizeItem(r, 'tv', currentLang)));
        } else {
          setTopRatedSeries([...FALLBACK_SERIES].reverse().map(r => normalizeItem(r, 'tv', currentLang)));
        }

        if (results[3].status === 'fulfilled' && results[3].value?.results?.length) {
          setPopularSeries(results[3].value.results.map((r: any) => normalizeItem(r, 'tv', currentLang)));
        } else {
          setPopularSeries(FALLBACK_SERIES.map(r => normalizeItem(r, 'tv', currentLang)));
        }

        if (results[4].status === 'fulfilled' && results[4].value?.results?.length) {
          setActionSeries(results[4].value.results.map((r: any) => normalizeItem(r, 'tv', currentLang)));
        } else {
          setActionSeries(FALLBACK_SERIES.filter(s => s.genres.includes("Action") || s.genres.includes("Sci-Fi")).map(r => normalizeItem(r, 'tv', currentLang)));
        }

        if (results[5].status === 'fulfilled' && results[5].value?.results?.length) {
          setMysterySeries(results[5].value.results.map((r: any) => normalizeItem(r, 'tv', currentLang)));
        } else {
          setMysterySeries(FALLBACK_SERIES.filter(s => s.genres.includes("Mystery")).map(r => normalizeItem(r, 'tv', currentLang)));
        }

        if (results[6].status === 'fulfilled' && results[6].value?.results?.length) {
          setDramaSeries(results[6].value.results.map((r: any) => normalizeItem(r, 'tv', currentLang)));
        } else {
          setDramaSeries(FALLBACK_SERIES.filter(s => s.genres.includes("Drama")).map(r => normalizeItem(r, 'tv', currentLang)));
        }

        if (results[7].status === 'fulfilled' && results[7].value?.results?.length) {
          setAnimationSeries(results[7].value.results.map((r: any) => normalizeItem(r, 'tv', currentLang)));
        } else {
          setAnimationSeries(FALLBACK_SERIES.filter(s => s.genres.includes("Animation")).map(r => normalizeItem(r, 'tv', currentLang)));
        }
      } catch (err) {
        console.error("Failed to fetch TMDB Live series, using fallbacks:", err);
        setGlobalError(true);
      } finally {
        if (!cancelled) setSeriesLoading(false);
      }
    };
    loadSeries();
    return () => { cancelled = true; };
  }, [tmdbKey, currentLang, seriesLoadTriggered]);

  // Search Debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const isTv = activeTab === 'series';
        const mediaType: Media = isTv ? 'tv' : 'movie';

        if (!tmdbKey) {
          const list = isTv ? FALLBACK_SERIES : FALLBACK_MOVIES;
          const normalizedList = list.map(item => normalizeItem(item, mediaType, currentLang));
          const query = searchQuery.toLowerCase();
          const matched = normalizedList.filter(item => {
            return item.title.toLowerCase().includes(query) || item.overview.toLowerCase().includes(query);
          });
          setSearchResults(matched);
          setIsSearching(false);
          return;
        }

        const endpoint = isTv ? 'search/tv' : 'search/movie';
        const searchData = await fetchWithCache(
          `${TMDB_BASE_URL}/${endpoint}?api_key=${tmdbKey}&language=${tmdbLang(currentLang)}&query=${encodeURIComponent(searchQuery)}`
        );
        const results = (searchData?.results || []).map((r: any) => normalizeItem(r, mediaType, currentLang));
        setSearchResults(results);
      } catch (err) {
        console.error("Failed search operation:", err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, activeTab, tmdbKey, currentLang]);

  // Details Modal Loader
  useEffect(() => {
    if (selectedItemId === null) return;
    let cancelled = false;

    const mediaType: Media = selectedMediaType ?? (activeTab === 'series' ? 'tv' : 'movie');
    const isTv = mediaType === 'tv';

    // Fast-seed from memory if detailedItem is not already set for this item
    if (!detailedItem || detailedItem.id !== selectedItemId) {
      const seeded = findPreloadedCinemaItem(selectedItemId, mediaType);
      if (seeded) {
        setDetailedItem(seeded);
        setIsLoadingDetails(false);
      } else {
        setIsLoadingDetails(true);
      }
    }

    if (!tmdbKey) {
      const list = isTv ? FALLBACK_SERIES : FALLBACK_MOVIES;
      const match = list.find(m => m.id === selectedItemId);
      if (!cancelled && match) {
        const normalized = normalizeItem(match, mediaType, currentLang);
        setDetailedItem(normalized);
        if (isTv && preselectedProgressItemIdRef.current !== normalized.id) {
          preselectedProgressItemIdRef.current = normalized.id;
          const saved = getProgress('tv', normalized.id);
          if (saved?.season && saved.season > 0) setSelectedSeason(saved.season);
          if (saved?.episode && saved.episode > 0) setSelectedEpisode(saved.episode);
        }
        logPlay({
          item_type: normalized.mediaType === 'tv' ? 'series' : 'movie',
          item_id: String(normalized.id),
          media_type: normalized.mediaType,
          title: normalized.title || null,
        });
        setIsLoadingDetails(false);
      }
      return;
    }

    const loadDetails = async () => {
      try {
        const langParam = `&language=${tmdbLang(currentLang)}`;
        const detailType = isTv ? 'tv' : 'movie';
        const detailsAppend = isTv ? 'videos,credits,similar,external_ids' : 'videos,credits,similar,release_dates';

        const detail = await fetchWithCache(
          `${TMDB_BASE_URL}/${detailType}/${selectedItemId}?api_key=${tmdbKey}${langParam}&include_video_language=${currentLang},en,null&append_to_response=${detailsAppend}`
        );

        if (cancelled) return;

        const normalized = normalizeItem(detail, mediaType, currentLang);
        setDetailedItem(prev => {
          if (prev && prev.id === normalized.id) {
            return {
              ...normalized,
              rating: prev.rating || normalized.rating,
              certification: normalized.certification || prev.certification,
              rottenTomatoes: prev.rottenTomatoes || normalized.rottenTomatoes,
              metascore: prev.metascore || normalized.metascore,
              awards: prev.awards || normalized.awards,
              boxOffice: prev.boxOffice || normalized.boxOffice,
            };
          }
          return normalized;
        });

        if (isTv && preselectedProgressItemIdRef.current !== normalized.id) {
          preselectedProgressItemIdRef.current = normalized.id;
          const saved = getProgress('tv', normalized.id);
          if (saved?.season && saved.season > 0) setSelectedSeason(saved.season);
          if (saved?.episode && saved.episode > 0) setSelectedEpisode(saved.episode);
        }
        logPlay({
          item_type: normalized.mediaType === 'tv' ? 'series' : 'movie',
          item_id: String(normalized.id),
          media_type: normalized.mediaType,
          title: normalized.title || null,
        });
        setIsLoadingDetails(false);

        // Non-blocking OMDb enrichment in the background
        const imdbId = isTv ? detail.external_ids?.imdb_id : detail.imdb_id;
        if (imdbId && omdbKey) {
          fetchOmdbMeta(imdbId, omdbKey).then(omdb => {
            if (cancelled || !omdb) return;
            const parsedImdbRating = omdb.imdbRating ? parseFloat(omdb.imdbRating) : NaN;
            setDetailedItem(prev => {
              if (!prev || prev.id !== normalized.id) return prev;
              return {
                ...prev,
                rating:
                  Number.isFinite(parsedImdbRating) && parsedImdbRating > 0
                    ? parsedImdbRating
                    : prev.rating,
                certification: prev.certification || omdb.rated,
                rottenTomatoes: omdb.rottenTomatoes || prev.rottenTomatoes,
                metascore: omdb.metascore || prev.metascore,
                awards: omdb.awards || prev.awards,
                boxOffice: omdb.boxOffice || prev.boxOffice,
              };
            });
          }).catch(err => {
            console.debug("Non-blocking OMDb enrichment failed:", err);
          });
        }
      } catch (err) {
        console.error("Failed loading exact item details:", err);
      } finally {
        if (!cancelled) setIsLoadingDetails(false);
      }
    };

    loadDetails();
    return () => { cancelled = true; };
  }, [selectedItemId, selectedMediaType, activeTab, tmdbKey, currentLang, omdbKey]);

  // Automatically start in-app gallery player when opened via Hero Banner or Poster Card Quick-Watch
  useEffect(() => {
    if (
      detailedItem &&
      selectedItemId !== null &&
      detailedItem.id === selectedItemId &&
      autoStartWatchRef.current &&
      detailPlaySources.length > 0
    ) {
      autoStartWatchRef.current = false;
      setDetailServersOpen(true);
      startGalleryWatchSession();
    }
  }, [detailedItem, selectedItemId, detailPlaySources, startGalleryWatchSession]);

  const activeGenres = activeTab === 'movies' ? movieGenres : seriesGenres;
  const activeFallbackSelected = activeTab === 'movies' ? FALLBACK_MOVIES : FALLBACK_SERIES;
  const activeLiveTrending = activeTab === 'movies' ? trendingMovies : trendingSeries;

  const slideshowSlides = useMemo(() => {
    if (activeLiveTrending.length > 0) return activeLiveTrending.slice(0, 5);
    return activeFallbackSelected.map(r => normalizeItem(r, activeTab === 'movies' ? 'movie' : 'tv', currentLang));
  }, [activeLiveTrending, activeFallbackSelected, activeTab, currentLang]);

  const slideshowSlidesLength = slideshowSlides.length;

  useEffect(() => {
    if (slideshowSlidesLength <= 1 || heroServersOpen || selectedItemId !== null || isWatchingInGallery) return;
    const interval = setInterval(() => {
      if (document.hidden) return;
      setHeroIndex(prev => (prev + 1) % slideshowSlidesLength);
    }, 8000);
    return () => clearInterval(interval);
  }, [slideshowSlidesLength, heroServersOpen, selectedItemId, isWatchingInGallery]);

  const activeHeroItem = slideshowSlides[heroIndex];

  const filteredList = useMemo(() => {
    if (selectedGenreId === null) return [];
    const isTv = activeTab === 'series';
    const mediaType: Media = isTv ? 'tv' : 'movie';

    if (!tmdbKey) {
      const fallbackList = isTv ? FALLBACK_SERIES : FALLBACK_MOVIES;
      const genreObj = (isTv ? FALLBACK_SERIES_GENRES : FALLBACK_GENRES).find(g => g.id === selectedGenreId);
      if (!genreObj) return fallbackList.map(r => normalizeItem(r, mediaType, currentLang));
      const genreName = genreObj.name.en;
      return fallbackList
        .filter((item: any) => item.genres.includes(genreName))
        .map(r => normalizeItem(r, mediaType, currentLang));
    }

    const sourceLists = isTv
      ? [trendingSeries, topRatedSeries, popularSeries, actionSeries, mysterySeries, dramaSeries, animationSeries]
      : [trendingMovies, topRatedMovies, popularMovies, actionMovies, horrorMovies, dramaMovies, sciFiMovies];

    const allCollected = sourceLists.flat();
    const unique = Array.from(new Map(allCollected.map(item => [item.id, item])).values());
    return unique.filter((item: CinemaItem) => item.genreIds?.includes(selectedGenreId));
  }, [
    selectedGenreId, activeTab, tmdbKey, currentLang,
    trendingMovies, topRatedMovies, popularMovies, actionMovies, horrorMovies, dramaMovies, sciFiMovies,
    trendingSeries, topRatedSeries, popularSeries, actionSeries, mysterySeries, dramaSeries, animationSeries
  ]);

  const localizedHeroTitle = activeHeroItem ? activeHeroItem.title : "";
  const ambientBackdropItem = detailedItem || activeHeroItem;
  const ambientBackdropUrl = ambientBackdropItem
    ? getBackdropSrc_static(ambientBackdropItem.backdropPath, ambientBackdropItem.trailerKey, ambientBackdropItem.posterPath)
    : "";

  const isCinemaFocusActive = isWatchingInGallery && selectedItemId !== null && Boolean(detailedItem);

  return createPortal(
    <div dir={currentLang === "ar" ? "rtl" : "ltr"} className="nl-cinema-root fixed inset-0 z-[10050] w-full h-[100dvh] text-zinc-100 font-sans overflow-hidden select-none pointer-events-auto bg-black">
      {/* Dynamic Liquid Glass Ambient Backdrop Illumination (Unmounted during active Movie playback OR modal open to save GPU/RAM and prevent stacked blur lag) */}
      {!isCinemaFocusActive && selectedItemId === null && ambientBackdropUrl && (
        <div
          className="lg-cinema-ambient-bg"
          style={{ backgroundImage: `url(${ambientBackdropUrl})` }}
          aria-hidden="true"
        />
      )}
      {!isCinemaFocusActive && (
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 50% 15%, rgba(16, 24, 42, 0.32) 0%, rgba(6, 9, 17, 0.86) 68%, rgba(5, 7, 14, 0.96) 100%)",
          }}
        />
      )}

      {/* Main Background Grid & Hero (Completely unmounted during active Movie playback to free 100% CPU/GPU/RAM for the player) */}
      {!isCinemaFocusActive && (
      <div
        ref={mainScrollRef}
        onScroll={handleScrollEvent}
        className="nl-cinema-scroll absolute inset-0 z-20 overflow-y-auto h-full w-full scrollbar-none"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
      >
        {/* Unified Non-Overlapping Liquid Glass Header (CSS selector 2) */}
        <header
          className={`nl-cinema-header fixed top-0 inset-x-0 z-50 flex items-center justify-between gap-2 px-3 sm:px-8 py-3 transition-all duration-300 ${
            scrolled ? "nl-cinema-header--scrolled" : "bg-gradient-to-b from-black/75 via-black/30 to-transparent"
          }`}
        >
          {/* Left / Start Zone: Back button + Logo + Liquid Glass Tabs + Desktop Genres */}
          <div className="flex items-center gap-2.5 sm:gap-5 min-w-0">
            {(selectedItemId !== null || showWatchlist || searchQuery.trim() !== "" || selectedGenreId !== null) && (
              <button
                type="button"
                onClick={() => {
                  if (selectedItemId !== null) setSelectedItemId(null);
                  else if (showWatchlist) setShowWatchlist(false);
                  else if (searchQuery.trim() !== "" || selectedGenreId !== null) {
                    setSearchQuery("");
                    setSelectedGenreId(null);
                  }
                }}
                className="lg-cinema-icon-pill flex-shrink-0"
                aria-label={currentLang === "ar" ? "رجوع" : "Back"}
                title={currentLang === "ar" ? "رجوع" : "Back"}
              >
                <ChevronLeft size={17} className={currentLang === "ar" ? "rotate-180" : ""} />
              </button>
            )}

            <h1 className="text-base sm:text-2xl font-black tracking-tighter text-white drop-shadow-[0_2px_12px_rgba(229,9,20,0.55)] select-none flex-shrink-0">
              <NLLogo />
            </h1>

            <div className="lg-cinema-pill-group scale-95 sm:scale-100 flex-shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('movies')}
                className={`px-3.5 py-1.5 text-[11px] sm:text-xs font-black rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'movies'
                    ? 'lg-cinema-pill-btn--active'
                    : 'text-white/75 hover:text-white'
                }`}
              >
                <Film size={12} />
                <span>{currentLang === "ar" ? "أفلام" : "Movies"}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('series')}
                className={`px-3.5 py-1.5 text-[11px] sm:text-xs font-black rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'series'
                    ? 'lg-cinema-pill-btn--active'
                    : 'text-white/75 hover:text-white'
                }`}
              >
                <Tv size={12} />
                <span>{currentLang === "ar" ? "مسلسلات" : "Series"}</span>
              </button>
            </div>

            {!isMobile && (
              <nav className="hidden lg:flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedGenreId(null)}
                  className={`text-[11px] font-bold px-3.5 py-1 rounded-full transition-all cursor-pointer border backdrop-blur-md ${
                    selectedGenreId === null
                      ? "text-white bg-white/20 border-white/40 shadow-[0_4px_14px_rgba(255,255,255,0.14)]"
                      : "text-white/70 bg-white/6 border-white/14 hover:text-white hover:bg-white/12"
                  }`}
                >
                  {t("movies.all") || (currentLang === "ar" ? "الكل" : "All")}
                </button>
                {activeGenres.slice(0, 6).map(g => (
                  <button
                    type="button"
                    key={g.id}
                    onClick={() => setSelectedGenreId(g.id)}
                    className={`text-[11px] font-bold px-3.5 py-1 rounded-full transition-all cursor-pointer border whitespace-nowrap backdrop-blur-md ${
                      selectedGenreId === g.id
                        ? "text-white bg-white/20 border-white/40 shadow-[0_4px_14px_rgba(255,255,255,0.14)]"
                        : "text-white/70 bg-white/6 border-white/14 hover:text-white hover:bg-white/12"
                    }`}
                  >
                    {g.name}
                  </button>
                ))}
              </nav>
            )}
          </div>

          {/* Right / End Zone: Search + Watchlist + Sound Mute + Close Window */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
            <div className="relative flex items-center">
              {isTouch ? (
                <div className="flex items-center">
                  <m.div
                    animate={{ width: searchOpen ? (isMobile ? "135px" : "190px") : "0px", opacity: searchOpen ? 1 : 0 }}
                    transition={{ ease: "easeOut", duration: 0.22 }}
                    className="overflow-hidden"
                  >
                    <input
                      type="search"
                      placeholder={activeTab === 'movies' ? (t("movies.search") || "Search...") : (t("series.search") || "Search...")}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      dir="auto"
                      className="w-full px-3 py-1.5 bg-white/10 border border-white/20 text-white placeholder-white/45 rounded-full text-xs focus:outline-none focus:border-white/45 backdrop-blur-md me-1.5"
                    />
                  </m.div>
                  <button
                    type="button"
                    onClick={() => setSearchOpen(!searchOpen)}
                    className={`lg-cinema-icon-pill ${searchOpen || searchQuery ? "border-white/40 bg-white/15" : ""}`}
                    aria-label={currentLang === "ar" ? "بحث" : "Search"}
                  >
                    <Search size={15} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <m.div
                    animate={{ width: searchOpen ? "210px" : "0px", opacity: searchOpen ? 1 : 0 }}
                    transition={{ ease: "easeOut", duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <input
                      type="search"
                      placeholder={activeTab === 'movies' ? (t("movies.search") || "Search...") : (t("series.search") || "Search...")}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-3.5 py-1.5 bg-white/10 border border-white/25 text-white placeholder-white/50 rounded-full text-xs outline-none focus:border-white/50 backdrop-blur-md tracking-tight"
                    />
                  </m.div>
                  <button
                    type="button"
                    onClick={() => setSearchOpen(!searchOpen)}
                    className={`lg-cinema-icon-pill ${searchOpen || searchQuery ? "border-white/40 bg-white/15" : ""}`}
                    aria-label={currentLang === "ar" ? "بحث" : "Search"}
                  >
                    <Search size={15} />
                  </button>
                </div>
              )}
            </div>

            {user && (
              <button
                type="button"
                onClick={() => setShowWatchlist((v) => !v)}
                aria-pressed={showWatchlist}
                aria-label={currentLang === "ar" ? "قائمتي" : "Watchlist"}
                title={currentLang === "ar" ? "قائمتي" : "Watchlist"}
                className={`lg-cinema-icon-pill relative ${
                  showWatchlist ? "!bg-amber-500/35 !border-amber-300/60 text-amber-200" : ""
                }`}
              >
                <Bookmark size={15} fill={showWatchlist ? 'currentColor' : 'none'} />
                {watchlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-600 border border-white/40 text-white text-[9px] font-black flex items-center justify-center shadow">
                    {watchlistCount}
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={toggleMute}
              className="lg-cinema-icon-pill"
              aria-label={isMuted ? (currentLang === "ar" ? "تشغيل الصوت" : "Unmute") : (currentLang === "ar" ? "كتم الصوت" : "Mute")}
              title={isMuted ? (currentLang === "ar" ? "تشغيل الصوت" : "Unmute") : (currentLang === "ar" ? "كتم الصوت" : "Mute")}
            >
              {isMuted ? <VolumeX size={15} className="text-white/65" /> : <Volume2 size={15} className="text-emerald-300" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="lg-cinema-icon-pill hover:!bg-rose-600/40 hover:!border-rose-400/60"
              aria-label={currentLang === "ar" ? "إغلاق" : "Close"}
              title={currentLang === "ar" ? "إغلاق" : "Close"}
            >
              <X size={16} />
            </button>
          </div>
        </header>

        {/* Mobile / Tablet Liquid Glass Genre Bar */}
        {isMobile && activeGenres.length > 0 && (
          <div
            className="px-4 overflow-x-auto select-none overflow-y-hidden flex gap-2 scrollbar-none py-1.5 relative z-30"
            style={{ marginTop: "calc(var(--cinema-header-h, 64px) + env(safe-area-inset-top) + 6px)" }}
          >
            <button
              type="button"
              onClick={() => setSelectedGenreId(null)}
              className={`text-[11px] font-bold px-3.5 py-1 flex-shrink-0 rounded-full transition-all cursor-pointer border backdrop-blur-md ${
                selectedGenreId === null
                  ? "text-white bg-white/20 border-white/40 shadow-[0_4px_12px_rgba(255,255,255,0.12)]"
                  : "text-white/70 bg-white/6 border-white/12"
              }`}
            >
              {t("movies.all") || (currentLang === "ar" ? "الكل" : "All")}
            </button>
            {activeGenres.map(g => (
              <button
                type="button"
                key={g.id}
                onClick={() => setSelectedGenreId(g.id)}
                className={`text-[11px] font-bold px-3.5 py-1 flex-shrink-0 rounded-full transition-all cursor-pointer border backdrop-blur-md ${
                  selectedGenreId === g.id
                    ? "text-white bg-white/20 border-white/40 shadow-[0_4px_12px_rgba(255,255,255,0.12)]"
                    : "text-white/70 bg-white/6 border-white/12"
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>
        )}

        {showWatchlist ? (
          <main className="pt-24 px-4 sm:px-10 pb-24 relative z-20">
            <div className="flex items-center gap-3 mb-6">
              <button
                type="button"
                onClick={() => setShowWatchlist(false)}
                className="lg-cinema-action-pill px-4 py-1.5 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
              >
                <span>←</span>
                <span>{t("movies.back") || (currentLang === "ar" ? "رجوع" : "Back")}</span>
              </button>
              <div className="text-base sm:text-xl font-black flex items-center gap-2">
                <Bookmark size={18} className="text-amber-400 fill-current" />
                <span>{currentLang === "ar" ? "قائمتي للمشاهدة" : "My Watchlist"}</span>
              </div>
            </div>

            {watchlistItems.length === 0 ? (
              <div className="w-full py-20 flex flex-col items-center gap-3 text-center text-white/50 lg-cinema-glass-modal rounded-3xl p-10 max-w-md mx-auto">
                <Bookmark size={32} className="text-amber-300/70" />
                <span className="font-semibold text-sm">
                  {currentLang === "ar" ? "لا توجد عناصر في قائمتك حتى الآن." : "Your watchlist is empty."}
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                {watchlistItems.map((rec) => (
                  <div key={`${rec.tmdb_id}-${rec.media_type}`} className="relative group flex justify-center">
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label={rec.title}
                      onClick={() => openWatchlistItem(rec)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openWatchlistItem(rec); } }}
                      className="nl-poster relative w-[135px] sm:w-[160px] md:w-[175px] aspect-[2/3] cursor-pointer select-none flex-shrink-0"
                    >
                      <div className="nl-poster__sheen" />
                      {rec.poster_path ? (
                        <img
                          src={getPosterSrc_static(rec.poster_path)}
                          alt={rec.title}
                          loading="lazy"
                          className="w-full h-full object-cover pointer-events-none"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/40"><Film size={28} /></div>
                      )}
                      <span className="absolute top-2 inset-inline-start-2 text-[9px] font-black px-2 py-0.5 rounded-full bg-black/65 border border-white/20 backdrop-blur-md text-white">
                        {rec.media_type === 'tv' ? (currentLang === "ar" ? "مسلسل" : "Series") : (currentLang === "ar" ? "فيلم" : "Movie")}
                      </span>
                      <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                        <p className="text-[11px] font-bold text-white truncate">{rec.title}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggle(rec.tmdb_id, rec.media_type, 'watchlist', rec.title, rec.poster_path); }}
                      aria-label={currentLang === "ar" ? "إزالة من القائمة" : "Remove from watchlist"}
                      className="absolute top-2 inset-inline-end-4 w-7 h-7 grid place-items-center rounded-full bg-black/75 border border-white/25 text-white opacity-0 group-hover:opacity-100 transition hover:bg-rose-600 cursor-pointer z-20"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </main>
        ) : searchQuery.trim() !== "" || selectedGenreId !== null ? (
          <main className="pt-24 px-4 sm:px-10 pb-24 relative z-20">
            <div className="flex items-center gap-3 mb-6">
              <button
                type="button"
                onClick={() => { setSearchQuery(""); setSelectedGenreId(null); }}
                className="lg-cinema-action-pill px-4 py-1.5 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
              >
                <span>←</span>
                <span>{t("movies.back") || (currentLang === "ar" ? "رجوع" : "Back")}</span>
              </button>
              <div className="text-base sm:text-xl font-black text-white">
                {selectedGenreId
                  ? `${t("movies.genres") || (currentLang === "ar" ? "التصنيف" : "Category")}: ${activeGenres.find(g => g.id === selectedGenreId)?.name || ""}`
                  : `${t("movies.search") || (currentLang === "ar" ? "نتائج البحث" : "Search results")}: "${searchQuery}"`}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
              {(searchQuery ? searchResults : filteredList).map((item) => (
                <div key={item.id} className="flex justify-center py-2">
                  <MoviePosterCard item={item} {...rowProps} isFavorite={rowProps.isFavoriteFn?.(item.id, item.mediaType)} />
                </div>
              ))}
            </div>

            {(searchQuery ? searchResults : filteredList).length === 0 && !isSearching && (
              <div className="w-full py-20 text-center text-white/55 font-medium lg-cinema-glass-modal rounded-3xl max-w-md mx-auto">
                {t("movies.noResults") || (currentLang === "ar" ? "لا توجد نتائج مطابقة." : "No matching titles found.")}
              </div>
            )}
          </main>
        ) : (
          <>
            {activeHeroItem && (
              <section
                className="lg-cinema-hero-stage relative flex flex-col justify-end w-full pb-12 sm:pb-16 px-6 sm:px-14"
                style={{ minHeight: isMobile ? "58vh" : "76vh" }}
              >
                {/* Hero Image + Side Vignette Masked Together (100% Seamless Dissolve, Zero Seam Line) */}
                <div className="lg-cinema-hero-backdrop">
                  <img
                    src={getBackdropSrc_static(activeHeroItem.backdropPath, activeHeroItem.trailerKey, activeHeroItem.posterPath)}
                    srcSet={
                      activeHeroItem.backdropPath && !activeHeroItem.backdropPath.startsWith("http")
                        ? `${TMDB_IMAGE_BASE}/w780${activeHeroItem.backdropPath} 780w, ${TMDB_IMAGE_BASE}/w1280${activeHeroItem.backdropPath} 1280w`
                        : undefined
                    }
                    sizes={
                      activeHeroItem.backdropPath && !activeHeroItem.backdropPath.startsWith("http")
                        ? "100vw"
                        : undefined
                    }
                    fetchPriority={heroIndex === 0 ? "high" : undefined}
                    alt=""
                    className="w-full h-full object-cover object-top select-none pointer-events-none scale-105 transition-transform duration-1000"
                  />
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        currentLang === "ar"
                          ? "linear-gradient(to left, rgba(5,7,14,0.84) 0%, rgba(5,7,14,0.38) 48%, rgba(5,7,14,0.12) 100%)"
                          : "linear-gradient(to right, rgba(5,7,14,0.84) 0%, rgba(5,7,14,0.38) 48%, rgba(5,7,14,0.12) 100%)",
                    }}
                  />
                </div>

                {/* Frameless Cinematic Hero Content Floating Over Dissolved Gradient */}
                <div className="relative z-10 flex flex-col max-w-3xl text-white gap-3 pt-24">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/25 border border-rose-300/40 text-rose-100 backdrop-blur-md">
                      {activeHeroItem.mediaType === 'movie'
                        ? (currentLang === "ar" ? "فيلم مميز" : "Featured Movie")
                        : (currentLang === "ar" ? "مسلسل مميز" : "Featured Series")}
                    </span>
                    {activeHeroItem.rating > 0 && (
                      <span className="flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-extrabold bg-amber-400/20 border border-amber-300/40 text-amber-300 backdrop-blur-md">
                        <Star size={11} className="fill-current" />
                        {activeHeroItem.rating.toFixed(1)}
                      </span>
                    )}
                    {activeHeroItem.year && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs text-white/90 font-bold bg-white/10 border border-white/20 backdrop-blur-md">
                        {activeHeroItem.year}
                      </span>
                    )}
                    {activeHeroItem.certification && (
                      <span className="border border-white/25 bg-white/10 px-2.5 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md">
                        {activeHeroItem.certification}
                      </span>
                    )}
                    {activeHeroItem.mediaType === 'movie'
                      ? activeHeroItem.runtime ? (
                          <span className="text-xs text-white/80 font-semibold drop-shadow">
                            {`${activeHeroItem.runtime}${t("movies.meta.minutes")}`}
                          </span>
                        ) : null
                      : activeHeroItem.seasons ? (
                          <span className="text-xs text-white/80 font-semibold drop-shadow">
                            {`${activeHeroItem.seasons} ${t("movies.meta.seasons")}`}
                          </span>
                        ) : null}
                  </div>

                  <h2
                    onClick={() => setSelectedItemId(activeHeroItem.id, activeHeroItem.mediaType)}
                    className="text-3xl sm:text-5xl font-black leading-tight tracking-tight select-text cursor-pointer hover:text-white/90 transition-colors drop-shadow-[0_4px_24px_rgba(0,0,0,0.85)]"
                  >
                    {localizedHeroTitle}
                  </h2>

                  <p className="text-xs sm:text-sm text-white/85 tracking-wide leading-relaxed line-clamp-2 select-text max-w-xl drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]">
                    {activeHeroItem.overview}
                  </p>

                  {/* Branching Liquid Glass Server Capsules + Smart Floating TIP Card (More Info button removed per request) */}
                  <div className="flex flex-col gap-2.5 mt-1.5">
                    <div className="flex items-center gap-3 flex-wrap">
                      <ServerBranchesInline
                        item={activeHeroItem}
                        isOpen={heroServersOpen}
                        onToggle={() => {
                          autoStartWatchRef.current = true;
                          setSelectedItemId(activeHeroItem.id, activeHeroItem.mediaType);
                        }}
                        onClose={() => setHeroServersOpen(false)}
                        buttonLabel={t("movies.meta.watchNow") || (currentLang === "ar" ? "شاهد الآن" : "Watch Now")}
                      />

                      {/* Hero Slide Indicators */}
                      {slideshowSlidesLength > 1 && !heroServersOpen && (
                        <div className="ms-1 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md">
                          {slideshowSlides.map((slide, idx) => (
                            <button
                              key={slide.id}
                              type="button"
                              onClick={() => setHeroIndex(idx)}
                              aria-label={`Slide ${idx + 1}`}
                              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                                idx === heroIndex ? "w-6 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" : "w-1.5 bg-white/40 hover:bg-white/70"
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Continue Watching Row (Phase 5) */}
            {continueWatchingItems.length > 0 && (
              <div className="relative z-20 flex flex-col gap-1.5 py-2.5 px-4 sm:px-10 -mt-2">
                <div className="flex items-center justify-between px-2">
                  <h2 className="text-sm sm:text-lg font-extrabold text-white tracking-tight drop-shadow">
                    {t("movies.rows.continueWatching", "Continue watching")}
                  </h2>
                </div>
                <div
                  className="nl-cinema-row flex gap-4 overflow-x-auto select-none px-3 scroll-smooth scrollbar-none snap-x snap-mandatory"
                  style={MOVIE_ROW_SCROLL_STYLE}
                >
                  {continueWatchingItems.map((entry) => {
                    const cwItem: CinemaItem = {
                      id: entry.id,
                      mediaType: entry.mediaType,
                      title: entry.title,
                      overview: "",
                      posterPath: entry.posterPath || "",
                      backdropPath: entry.backdropPath || "",
                      year: "",
                      rating: 0,
                      genreIds: [],
                      genreNames: [],
                      trailerKey: "",
                      cast: [],
                      similar: [],
                    };
                    const ratio =
                      entry.duration > 0
                        ? entry.time / entry.duration
                        : 0;
                    const epBadge =
                      entry.mediaType === "tv" && entry.season && entry.episode
                        ? `S${entry.season}:E${entry.episode}`
                        : undefined;
                    return (
                      <div key={entry.key} className="flex-shrink-0 snap-start">
                        <MoviePosterCard
                          item={cwItem}
                          isTouch={isTouch}
                          activeHoverId={activeHoverId}
                          setActiveHoverId={setActiveHoverId}
                          hoverTimer={hoverTimer}
                          setSelectedItemId={(id, mt) => {
                            if (id !== null && entry.mediaType === "tv") {
                              deepLinkSeRef.current = {
                                itemId: id,
                                s: entry.season || 1,
                                e: entry.episode || 1,
                              };
                            }
                            setSelectedItemId(id, mt);
                          }}
                          onQuickWatch={(it) => {
                            if (entry.mediaType === "tv") {
                              deepLinkSeRef.current = {
                                itemId: it.id,
                                s: entry.season || 1,
                                e: entry.episode || 1,
                              };
                            }
                            handleQuickWatch(it);
                          }}
                          t={t}
                          progressRatio={ratio}
                          episodeBadge={epBadge}
                          onRemoveProgress={() =>
                            removeProgress(entry.mediaType, entry.id)
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'movies' ? (
              globalError && trendingMovies.length === 0 ? (
                <div className="w-full py-20 flex flex-col items-center gap-4 text-center relative z-20">
                  <p className="text-white/60 font-medium">{t("movies.meta.errorLoad")}</p>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="lg-cinema-action-pill px-5 py-2 text-white font-bold text-sm cursor-pointer"
                  >
                    ↻
                  </button>
                </div>
              ) : moviesLoading ? (
                <div className="relative z-20 pb-24 -mt-4 sm:-mt-6">
                  {[1, 2, 3, 4].map((idx) => (
                    <div key={idx} className="relative z-10 flex flex-col gap-2 py-3 px-4 sm:px-10 overflow-hidden">
                      <div className="h-5 w-36 bg-white/10 animate-pulse rounded-full px-2" />
                      <div className="flex gap-4 overflow-x-hidden py-4 px-2">
                        {[1, 2, 3, 4, 5, 6].map((idx2) => (
                          <div key={idx2} className="relative w-[135px] sm:w-[160px] md:w-[175px] aspect-[2/3] rounded-2xl overflow-hidden bg-white/5 border border-white/10 animate-pulse flex-shrink-0 nl-skeleton-card" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="relative z-20 pb-24 -mt-4 sm:-mt-6">
                  {topMovies.length > 0 && (
                    <MovieRow title={currentLang === "ar" ? "الأكثر مشاهدة" : "Top Movies"} items={topMovies} {...rowProps} />
                  )}
                  <MovieRow title={t("movies.rows.trending")} items={trendingMovies} {...rowProps} />
                  <MovieRow title={t("movies.rows.topRated")} items={topRatedMovies} {...rowProps} />
                  <MovieRow title={t("movies.rows.action")} items={actionMovies} {...rowProps} />
                  <MovieRow title={t("movies.rows.horror")} items={horrorMovies} {...rowProps} />
                  <MovieRow title={t("movies.rows.popular")} items={popularMovies} {...rowProps} />
                  <MovieRow title={t("movies.rows.drama")} items={dramaMovies} {...rowProps} />
                  <MovieRow title={t("movies.rows.scifi")} items={sciFiMovies} {...rowProps} />
                </div>
              )
            ) : (
              globalError && trendingSeries.length === 0 ? (
                <div className="w-full py-20 flex flex-col items-center gap-4 text-center relative z-20">
                  <p className="text-white/60 font-medium">{t("movies.meta.errorLoad")}</p>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="lg-cinema-action-pill px-5 py-2 text-white font-bold text-sm cursor-pointer"
                  >
                    ↻
                  </button>
                </div>
              ) : seriesLoading ? (
                <div className="relative z-20 pb-24 -mt-4 sm:-mt-6">
                  {[1, 2, 3, 4].map((idx) => (
                    <div key={idx} className="relative z-10 flex flex-col gap-2 py-3 px-4 sm:px-10 overflow-hidden">
                      <div className="h-5 w-36 bg-white/10 animate-pulse rounded-full px-2" />
                      <div className="flex gap-4 overflow-x-hidden py-4 px-2">
                        {[1, 2, 3, 4, 5, 6].map((idx2) => (
                          <div key={idx2} className="relative w-[135px] sm:w-[160px] md:w-[175px] aspect-[2/3] rounded-2xl overflow-hidden bg-white/5 border border-white/10 animate-pulse flex-shrink-0 nl-skeleton-card" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="relative z-20 pb-24 -mt-4 sm:-mt-6">
                  {topSeries.length > 0 && (
                    <MovieRow title={currentLang === "ar" ? "الأكثر مشاهدة" : "Top Series"} items={topSeries} {...rowProps} />
                  )}
                  <MovieRow title={t("movies.rows.trending")} items={trendingSeries} {...rowProps} />
                  <MovieRow title={t("movies.rows.topRated")} items={topRatedSeries} {...rowProps} />
                  <MovieRow title={t("movies.rows.popular")} items={popularSeries} {...rowProps} />
                  <MovieRow title={t("movies.rows.adventure")} items={actionSeries} {...rowProps} />
                  <MovieRow title={t("movies.rows.mystery")} items={mysterySeries} {...rowProps} />
                  <MovieRow title={t("movies.rows.drama")} items={dramaSeries} {...rowProps} />
                  <MovieRow title={t("movies.rows.animation")} items={animationSeries} {...rowProps} />
                </div>
              )
            )}
          </>
        )}
      </div>
      )}

      {/* Liquid Glass Movie / Series Details & Theater Stage Modal */}
      <AnimatePresence>
        {selectedItemId !== null && (
          <div
            className={`nl-detail-wrap fixed inset-0 z-[10100] flex items-center justify-center p-2 sm:p-5 overflow-y-auto ${
              isWatchingInGallery
                ? "bg-black"
                : "bg-black/75 backdrop-blur-xl"
            }`}
          >
            <div onClick={() => setSelectedItemId(null)} className="absolute inset-0 z-0 cursor-zoom-out" />
            {isLoadingDetails || !detailedItem ? (
              <div className="relative z-10 flex items-center justify-center p-8">
                <EyeLoader />
              </div>
            ) : (
              <m.div
                ref={detailDialogRef}
                role="dialog"
                aria-modal="true"
                aria-label={detailedItem.title}
                initial={{ opacity: 0, scale: 0.94, y: 18 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 18 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className={`nl-detail-card lg-cinema-glass-modal relative w-full rounded-3xl z-10 overflow-hidden my-auto max-h-[94dvh] flex flex-col ${
                  isWatchingInGallery
                    ? "nl-detail-card--theater"
                    : "max-w-4xl"
                }`}
              >
                {/* Top 16:9 Liquid Glass Gallery Stage (Expands to Cinema Theater Mode when Movie/Series plays; stays standard for Trailer) */}
                <div
                  className={`flex-shrink-0 flex flex-col gap-2 ${
                    isWatchingInGallery
                      ? "p-2 sm:p-3"
                      : "p-2.5 sm:p-3.5 pb-0"
                  }`}
                >
                  {/* Sleek Semi-Transparent Top Control Bar ABOVE Gallery Stage when Movie or Trailer is actively playing */}
                  {((isWatchingInGallery && Boolean(activeGallerySource)) ||
                    (showHeroTrailer && Boolean(activeImdbId || detailedItem.trailerKey))) && (
                    <div
                      onMouseMove={bumpControlsVisibility}
                      onTouchStart={bumpControlsVisibility}
                      className={`lg-cinema-gallery-top-bar flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-2xl transition-all duration-300 ${
                        isWatchingInGallery
                          ? "lg-cinema-gallery-top-bar--playing"
                          : ""
                      } ${
                        isWatchingInGallery && !isControlsVisible
                          ? "opacity-0 pointer-events-none"
                          : "opacity-100"
                      }`}
                      dir="ltr"
                    >
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        {(activeImdbId || detailedItem.trailerKey) && (
                          <button
                            type="button"
                            onClick={() => {
                              if (showHeroTrailer) {
                                setShowHeroTrailer(false);
                                setTrailerFallbackToYoutube(false);
                              } else {
                                persistCurrentProgress();
                                setIsWatchingInGallery(false);
                                clockReset("manual");
                                setTrailerFallbackToYoutube(!activeImdbId);
                                setShowHeroTrailer(true);
                              }
                            }}
                            className={`lg-cinema-action-pill px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                              showHeroTrailer
                                ? "!bg-rose-600/45 !border-rose-300/70 text-white"
                                : "text-white"
                            }`}
                          >
                            <Film size={13} />
                            <span>
                              {showHeroTrailer
                                ? currentLang === "ar"
                                  ? "إغلاق التريلر"
                                  : "Hide Trailer"
                                : currentLang === "ar"
                                  ? "تشغيل التريلر"
                                  : "Watch Trailer"}
                            </span>
                          </button>
                        )}

                        {showHeroTrailer && activeGallerySource && (
                          <button
                            type="button"
                            onClick={() => {
                              setDetailServersOpen(true);
                              startGalleryWatchSession();
                            }}
                            className="lg-cinema-primary-pill px-3.5 py-1.5 text-xs font-black text-white flex items-center gap-1.5 cursor-pointer"
                          >
                            <Play size={12} className="fill-current" />
                            <span>
                              {t("movies.meta.watchNow") ||
                                (currentLang === "ar" ? "مشاهدة الآن" : "Watch Now")}
                            </span>
                          </button>
                        )}

                        {isWatchingInGallery &&
                          activeGallerySource &&
                          detailedItem.mediaType === "tv" && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-black bg-white/10 border border-white/20 text-white/90 whitespace-nowrap">
                              {isFullSeasonEmbed
                                ? "Full Season"
                                : `S${selectedSeason}:E${selectedEpisode}`}
                            </span>
                          )}

                        {isWatchingInGallery && detailPlaySources.length > 1 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            {detailPlaySources.map((srv, idx) => {
                              const isCurrent = idx === activeGalleryServerIdx;
                              return (
                                <button
                                  key={srv.id}
                                  type="button"
                                  onClick={() => {
                                    if (idx !== activeGalleryServerIdx) {
                                      setWorkerBridgeSubtitles([]);
                                      startGalleryWatchSession(idx);
                                    }
                                  }}
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border transition-all cursor-pointer whitespace-nowrap ${
                                    isCurrent
                                      ? "bg-red-600/85 border-red-400 text-white shadow"
                                      : "bg-white/8 border-white/15 text-white/70 hover:text-white hover:bg-white/15"
                                  }`}
                                >
                                  {srv.label}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            persistCurrentProgress();
                            if (playerIframeRef.current) {
                              try {
                                playerIframeRef.current.src = "about:blank";
                              } catch {}
                            }
                            clockReset("manual");
                            setIsWatchingInGallery(false);
                            setShowHeroTrailer(false);
                            setTrailerFallbackToYoutube(false);
                            setIsCssFullscreen(false);
                            setIsSubtitleMenuOpen(false);
                          }}
                          className="lg-cinema-action-pill px-3 py-1.5 text-xs font-bold text-white/90 hover:text-white flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                          title={t("movies.player.showBackdrop")}
                        >
                          <span>{t("movies.player.showBackdrop")}</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleToggleGalleryFullscreen}
                          className="lg-cinema-icon-pill !w-9 !h-9 !min-w-[36px] !min-h-[36px]"
                          aria-label={
                            isAnyFullscreen
                              ? t("movies.player.exitFullscreen")
                              : t("movies.player.fullscreen")
                          }
                          title={
                            isAnyFullscreen
                              ? t("movies.player.exitFullscreen")
                              : t("movies.player.fullscreen")
                          }
                        >
                          {isAnyFullscreen ? (
                            <Minimize2 size={15} />
                          ) : (
                            <Maximize2 size={15} />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            persistCurrentProgress();
                            if (playerIframeRef.current) {
                              try {
                                playerIframeRef.current.src = "about:blank";
                              } catch {}
                            }
                            setSelectedItemId(null);
                          }}
                          className="lg-cinema-icon-pill !w-9 !h-9 !min-w-[36px] !min-h-[36px] hover:!bg-rose-600/45 hover:!border-rose-300/60"
                          aria-label={t("movies.close")}
                          title={t("movies.close")}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  )}

                  <div
                    ref={galleryStageRef}
                    onClick={(e) => e.stopPropagation()}
                    onMouseMove={bumpControlsVisibility}
                    onTouchStart={bumpControlsVisibility}
                    className={`lg-cinema-gallery-stage relative aspect-video w-full bg-black ${
                      isCssFullscreen ? "lg-cinema-gallery-stage--css-fullscreen" : ""
                    }`}
                  >
                    {isCssFullscreen && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsCssFullscreen(false);
                        }}
                        className={`lg-cinema-icon-pill fixed top-4 right-4 z-[10600] !w-10 !h-10 transition-opacity duration-300 ${
                          isControlsVisible
                            ? "opacity-100"
                            : "opacity-0 pointer-events-none"
                        }`}
                        aria-label={t("movies.player.exitFullscreen")}
                        title={t("movies.player.exitFullscreen")}
                      >
                        <Minimize2 size={16} />
                      </button>
                    )}

                    {isWatchingInGallery && !isControlsVisible && (
                      <>
                        <div
                          onMouseEnter={bumpControlsVisibility}
                          onMouseMove={bumpControlsVisibility}
                          onTouchStart={bumpControlsVisibility}
                          className="absolute top-0 inset-x-0 h-5 z-30"
                        />
                        <div
                          onMouseEnter={bumpControlsVisibility}
                          onMouseMove={bumpControlsVisibility}
                          onTouchStart={bumpControlsVisibility}
                          className="absolute bottom-0 inset-x-0 h-4 z-30"
                        />
                      </>
                    )}

                    {isWatchingInGallery && activeGallerySource ? (
                      <div className="relative w-full h-full bg-black">
                        {!allServersFailed && playerRenderMode === "direct" && (
                          <video
                            ref={videoElementRef}
                            className="w-full h-full border-0 bg-black block object-contain cursor-pointer"
                            autoPlay
                            playsInline
                            crossOrigin="anonymous"
                            onClick={handleToggleVideoPlay}
                            onDoubleClick={handleToggleGalleryFullscreen}
                            onPause={() => persistCurrentProgress()}
                            onLoadedMetadata={(e) => {
                              if (
                                !appliedInitialSeekRef.current &&
                                detailWatchTarget?.startAt &&
                                detailWatchTarget.startAt > 5
                              ) {
                                appliedInitialSeekRef.current = true;
                                try {
                                  e.currentTarget.currentTime = detailWatchTarget.startAt;
                                } catch {}
                              }
                              syncVideoTextTracks(activeSubtitleIdx);
                            }}
                            onVolumeChange={(e) => {
                              setVideoVolume(e.currentTarget.volume);
                              setIsVideoMuted(e.currentTarget.muted);
                            }}
                            onLoadedData={() => {
                              loadedCurrentAttemptRef.current = true;
                              const currentStream =
                                extractedStreams[activeExtractedIdx] ||
                                extractedStreams[0];
                              const elapsedMs = Math.max(
                                120,
                                performance.now() - playAttemptStartedAtRef.current,
                              );
                              recordServerSuccess(
                                resolveServerIdForStream(currentStream),
                                elapsedMs,
                                detailItemStorageKey,
                              );
                              setIsPlayerLoading(false);
                              syncVideoTextTracks(activeSubtitleIdx);
                            }}
                            onError={() => {
                              const currentStream =
                                extractedStreams[activeExtractedIdx] ||
                                extractedStreams[0];
                              if (
                                !useDirectUrlFallback &&
                                currentStream?.directUrl &&
                                currentStream.directUrl !== currentStream.proxiedUrl
                              ) {
                                setUseDirectUrlFallback(true);
                              } else if (
                                activeExtractedIdx + 1 <
                                extractedStreams.length
                              ) {
                                recordServerFailure(
                                  resolveServerIdForStream(currentStream),
                                );
                                const nextIdx = activeExtractedIdx + 1;
                                const nextItem = extractedStreams[nextIdx];
                                setUseDirectUrlFallback(false);
                                playAttemptStartedAtRef.current = performance.now();
                                setIsPlayerLoading(true);
                                setActiveExtractedIdx(nextIdx);
                                if (nextItem?.type === "clean-embed") {
                                  cleanupDirectVideoPlayer();
                                  setPlayerRenderMode("clean-embed");
                                }
                              } else {
                                recordServerFailure(
                                  resolveServerIdForStream(currentStream),
                                );
                                cleanupDirectVideoPlayer();
                                playAttemptStartedAtRef.current = performance.now();
                                setIsPlayerLoading(true);
                                setPlayerRenderMode("iframe");
                              }
                            }}
                          >
                            {activeSubtitlesList
                              .filter((sub) => sub.loaded !== false && Boolean(sub.proxiedUrl || sub.url))
                              .map((sub, subIdx) => (
                                <track
                                  key={`${sub.lang}-${subIdx}-${sub.id || sub.url}`}
                                  kind="subtitles"
                                  src={sub.proxiedUrl || sub.url}
                                  srcLang={sub.lang}
                                  label={sub.label}
                                />
                              ))}
                          </video>
                        )}

                        {!allServersFailed &&
                          (playerRenderMode === "iframe" ||
                            playerRenderMode === "clean-embed") && (
                            <iframe
                              ref={playerIframeRef}
                              key={`${activeGallerySource.id}-${activeIframeUrl}`}
                              className="w-full h-full border-0 bg-black block"
                              src={activeIframeUrl}
                              title={`${detailedItem.title} - ${activeGallerySource.label}`}
                              width="100%"
                              height="100%"
                              frameBorder="0"
                              scrolling="no"
                              referrerPolicy="origin"
                              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                              allowFullScreen
                              onLoad={() => {
                                loadedCurrentAttemptRef.current = true;
                                const elapsedMs = Math.max(
                                  120,
                                  performance.now() - playAttemptStartedAtRef.current,
                                );
                                const currentStream =
                                  extractedStreams[activeExtractedIdx] ||
                                  extractedStreams[0];
                                const activeServerId =
                                  playerRenderMode === "clean-embed"
                                    ? resolveServerIdForStream(currentStream)
                                    : activeGallerySource.id;
                                recordServerSuccess(
                                  activeServerId,
                                  elapsedMs,
                                  detailItemStorageKey,
                                );
                                setIsPlayerLoading(false);
                                gotTimeSinceLoadRef.current = false;
                                setIframeLoadStamp(Date.now());
                              }}
                            />
                          )}

                        {seekUnsupportedToast && (
                          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-full bg-black/85 border border-amber-400/50 text-amber-200 text-xs font-bold shadow-lg pointer-events-none">
                            {t(
                              "movies.player.seekUnsupported",
                              "This server doesn't support external seeking — use the player's own bar",
                            )}
                          </div>
                        )}

                        {/* Live Cinema Subtitle Overlay (Rendered ONLY in direct <video> mode; iframe servers have built-in subtitles) */}
                        {!allServersFailed &&
                          playerRenderMode === "direct" &&
                          activeSubtitleIdx !== null && (
                            <SubtitleOverlay
                              cues={activeTrackCues}
                              offsetSec={subtitleOffsetSec}
                              liftPx={isControlsVisible ? 56 : 0}
                            />
                          )}

                        {/* Pure Visual Eye Loader Overlay (Zero text, pointer-events-none) */}
                        {(isPlayerLoading || playerRenderMode === "extracting") && !allServersFailed && (
                          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/90 pointer-events-none">
                            <EyeLoader />
                          </div>
                        )}

                        {/* All Servers Exhausted Error State with Retry Button */}
                        {allServersFailed && (
                          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 p-6 text-center bg-black/95">
                            <AlertTriangle size={32} className="text-amber-400" />
                            <p className="text-xs sm:text-sm font-bold text-white/90 max-w-md leading-relaxed">
                              {t("movies.player.allFailed")}
                            </p>
                            <button
                              type="button"
                              onClick={() => startGalleryWatchSession(0)}
                              className="lg-cinema-primary-pill px-5 py-2 text-xs sm:text-sm font-black text-white flex items-center gap-2 cursor-pointer"
                            >
                              <RefreshCw size={14} />
                              <span>{t("movies.player.retry")}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ) : showHeroTrailer && (activeImdbId || detailedItem.trailerKey) ? (
                      <div className="relative w-full h-full bg-black">
                        {resolvedTrailer?.kind === "imdb" && !trailerFallbackToYoutube ? (
                          <>
                            <iframe
                              key={`imdb-trailer-${resolvedTrailer.videoId}`}
                              src={resolvedTrailer.embedUrl}
                              title={`${detailedItem.title} - IMDb Trailer`}
                              className="w-full h-full border-0 bg-black block"
                              width="100%"
                              height="100%"
                              frameBorder="0"
                              allow="autoplay; encrypted-media; fullscreen"
                              allowFullScreen
                              onLoad={() => setImdbTrailerLoaded(true)}
                            />
                            {detailedItem.trailerKey && (
                              <button
                                type="button"
                                onClick={() => setTrailerFallbackToYoutube(true)}
                                className="lg-cinema-action-pill absolute bottom-3 right-3 z-20 px-3 py-1 text-[11px] font-bold text-white/90 hover:text-white cursor-pointer"
                              >
                                YouTube
                              </button>
                            )}
                          </>
                        ) : detailedItem.trailerKey ? (
                          <iframe
                            key={`yt-trailer-${detailedItem.trailerKey}`}
                            src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(detailedItem.trailerKey)}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                            title={`${detailedItem.title} - Official Trailer`}
                            className="w-full h-full border-0 bg-black block"
                            width="100%"
                            height="100%"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                            allowFullScreen
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <EyeLoader />
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <img
                          src={getBackdropSrc_static(
                            detailedItem.backdropPath,
                            detailedItem.trailerKey,
                            detailedItem.posterPath,
                          )}
                          alt={detailedItem.title}
                          className="w-full h-full object-cover opacity-90"
                        />
                        <div
                          className="absolute inset-0"
                          style={{
                            background:
                              "linear-gradient(to top, rgba(8, 12, 22, 0.96) 0%, rgba(8, 12, 22, 0.42) 52%, rgba(8, 12, 22, 0.25) 100%)",
                          }}
                        />

                        {/* Center Liquid Glass Play Button (Starts Movie/Series directly, separated from Trailer option) */}
                        <button
                          type="button"
                          onClick={() => {
                            setDetailServersOpen(true);
                            startGalleryWatchSession();
                          }}
                          className="absolute inset-0 m-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/18 hover:bg-white/28 border border-white/50 backdrop-blur-xl flex items-center justify-center text-white shadow-[0_12px_36px_rgba(0,0,0,0.68),inset_0_1.5px_1px_rgba(255,255,255,0.85)] transition-transform hover:scale-110 cursor-pointer group z-10"
                          aria-label={
                            t("movies.meta.watchNow") ||
                            (currentLang === "ar" ? "مشاهدة الآن" : "Watch Now")
                          }
                          title={
                            t("movies.meta.watchNow") ||
                            (currentLang === "ar" ? "مشاهدة الآن" : "Watch Now")
                          }
                        >
                          <Play
                            size={28}
                            className="fill-current ms-1 group-hover:scale-110 transition-transform"
                          />
                        </button>

                        {/* Bottom Overlay Info inside Gallery Stage (Only when NOT playing) */}
                        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 flex items-end justify-between gap-4 z-10 pointer-events-none">
                          <div className="flex items-end gap-3.5 min-w-0">
                            <img
                              src={getPosterSrc_static(
                                detailedItem.posterPath,
                                detailedItem.trailerKey,
                                detailedItem.backdropPath,
                              )}
                              alt=""
                              className="hidden sm:block w-20 md:w-24 aspect-[2/3] object-cover rounded-2xl border border-white/35 shadow-2xl flex-shrink-0"
                            />
                            <div className="flex flex-col gap-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {detailedItem.rating > 0 && (
                                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-400/20 border border-amber-300/45 text-amber-300 backdrop-blur-md">
                                    <Star size={11} className="fill-current" />
                                    {detailedItem.rating.toFixed(1)}
                                  </span>
                                )}
                                {detailedItem.rottenTomatoes && (
                                  <span
                                    className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 border border-rose-300/40 text-rose-200 backdrop-blur-md"
                                    title={t("movies.meta.rottenTomatoes", "Rotten Tomatoes")}
                                  >
                                    🍅 {detailedItem.rottenTomatoes}
                                  </span>
                                )}
                                {detailedItem.metascore && (
                                  <span
                                    className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 border border-emerald-300/40 text-emerald-200 backdrop-blur-md"
                                    title={t("movies.meta.metascore", "Metacritic")}
                                  >
                                    MC {detailedItem.metascore}
                                  </span>
                                )}
                                {detailedItem.year && (
                                  <span className="text-xs font-bold text-white/90">
                                    {detailedItem.year}
                                  </span>
                                )}
                                {detailedItem.certification && (
                                  <span className="border border-white/30 bg-white/12 px-2 py-0.5 rounded-full text-[10px] font-bold text-white/95 backdrop-blur-md">
                                    {detailedItem.certification}
                                  </span>
                                )}
                                {detailedItem.mediaType === "movie"
                                  ? detailedItem.runtime ? (
                                      <span className="text-xs text-white/80 font-medium">
                                        {`${detailedItem.runtime}${t("movies.meta.minutes")}`}
                                      </span>
                                    ) : null
                                  : detailedItem.seasons ? (
                                      <span className="text-xs text-white/80 font-medium">
                                        {`${detailedItem.seasons} ${t("movies.meta.seasons")}`}
                                      </span>
                                    ) : null}
                                {detailedItem.mediaType === "tv" &&
                                  detailedItem.episodes && (
                                    <span className="text-xs text-white/80 font-medium">
                                      • {detailedItem.episodes}{" "}
                                      {t("movies.meta.episodes")}
                                    </span>
                                  )}
                              </div>
                              <h3 className="text-xl sm:text-3xl font-black text-white select-text truncate drop-shadow-md">
                                {detailedItem.title}
                              </h3>
                              {detailedItem.tagline && (
                                <p className="text-[11px] sm:text-xs italic text-rose-200/90 truncate">
                                  “{detailedItem.tagline}”
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Top Floating Glass Controls inside Gallery Stage (Only visible when NOT playing) */}
                        <div className="absolute top-3.5 inset-x-4 flex items-center justify-between gap-2 z-20 pointer-events-none">
                          <div className="pointer-events-auto">
                            {(activeImdbId || detailedItem.trailerKey) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsWatchingInGallery(false);
                                  clockReset("manual");
                                  setTrailerFallbackToYoutube(!activeImdbId);
                                  setShowHeroTrailer(true);
                                }}
                                className="lg-cinema-action-pill px-3.5 py-1.5 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
                              >
                                <Film size={13} />
                                <span>{t("movies.player.watchTrailer")}</span>
                              </button>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedItemId(null)}
                            className="lg-cinema-icon-pill pointer-events-auto hover:!bg-rose-600/45 hover:!border-rose-300/60"
                            aria-label={t("movies.close")}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </>
                    )}

                    {/* Floating Liquid Glass Movie/Series Player & Subtitle Controls Bar inside Fullscreen Stage */}
                    {isAnyFullscreen &&
                      isWatchingInGallery &&
                      playerRenderMode === "direct" &&
                      !allServersFailed && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        onMouseMove={bumpControlsVisibility}
                        className={`lg-cinema-player-controls lg-cinema-player-controls--fullscreen rounded-2xl px-4 py-2.5 flex flex-col gap-2 ${
                          isControlsVisible
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 translate-y-3 pointer-events-none"
                        }`}
                        dir="ltr"
                      >
                        {controlMode !== "none" && (
                          <CinemaTimeline
                            mode={controlMode}
                            videoRef={videoElementRef}
                            fallbackDurationSec={(detailedItem?.runtime ?? 0) * 60}
                            hasSubtitles={activeTrackCues.length > 0}
                            onUserSeek={handleUserSeek}
                            onUserTogglePlay={handleUserTogglePlay}
                          />
                        )}

                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            {playerRenderMode === "direct" && (
                              <div className="flex items-center gap-1.5 ps-1">
                                <button
                                  type="button"
                                  onClick={handleToggleVideoMute}
                                  className="lg-cinema-icon-pill !w-8 !h-8 !min-w-[32px] !min-h-[32px] cursor-pointer"
                                  aria-label={isVideoMuted ? "Unmute" : "Mute"}
                                >
                                  {isVideoMuted || videoVolume === 0 ? (
                                    <VolumeX size={14} />
                                  ) : (
                                    <Volume2 size={14} />
                                  )}
                                </button>
                                <input
                                  type="range"
                                  min={0}
                                  max={1}
                                  step={0.05}
                                  value={isVideoMuted ? 0 : videoVolume}
                                  onChange={(e) =>
                                    handleChangeVideoVolume(Number(e.target.value))
                                  }
                                  className="lg-cinema-seek-slider hidden sm:block w-20"
                                  aria-label="Volume"
                                />
                              </div>
                            )}

                            {activeSubtitleIdx !== null && (
                              <div className="flex items-center gap-1 ps-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSubtitleOffsetSec((s) =>
                                      Number((s - 0.5).toFixed(1)),
                                    )
                                  }
                                  className="lg-cinema-action-pill px-2 py-1 text-[10px] font-bold text-white/90 cursor-pointer"
                                  title="Sync Subtitles -0.5s"
                                >
                                  -0.5s
                                </button>
                                {subtitleOffsetSec !== 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setSubtitleOffsetSec(0)}
                                    className="px-1.5 py-0.5 rounded bg-rose-500/30 border border-rose-300/40 text-[10px] font-mono text-white cursor-pointer"
                                    title="Reset subtitle offset"
                                  >
                                    {subtitleOffsetSec > 0
                                      ? `+${subtitleOffsetSec}s`
                                      : `${subtitleOffsetSec}s`}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSubtitleOffsetSec((s) =>
                                      Number((s + 0.5).toFixed(1)),
                                    )
                                  }
                                  className="lg-cinema-action-pill px-2 py-1 text-[10px] font-bold text-white/90 cursor-pointer"
                                  title="Sync Subtitles +0.5s"
                                >
                                  +0.5s
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 relative ms-auto">
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() =>
                                  setIsSubtitleMenuOpen((prev) => !prev)
                                }
                                className={`lg-cinema-action-pill px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                                  activeSubtitleIdx !== null &&
                                  activeSubtitlesList[activeSubtitleIdx]
                                    ? "!bg-rose-600/45 !border-rose-300/70 text-white"
                                    : "text-white/85"
                                }`}
                                aria-label="Subtitles (CC)"
                                title="Subtitles (CC)"
                              >
                                <Subtitles size={14} />
                                <span>
                                  {activeSubtitleIdx !== null &&
                                  activeSubtitlesList[activeSubtitleIdx]
                                    ? activeSubtitlesList[
                                        activeSubtitleIdx
                                      ].lang.toUpperCase()
                                    : isLoadingSubtitles
                                      ? "CC..."
                                      : "OFF"}
                                </span>
                              </button>

                              {isSubtitleMenuOpen && (
                                <div className="absolute bottom-full right-0 mb-2 z-50">
                                  <SubtitleSettingsPanel
                                    tracks={activeSubtitlesList}
                                    activeIdx={activeSubtitleIdx}
                                    loadingIdx={loadingSubtitleIdx}
                                    isSearching={isLoadingSubtitles}
                                    offsetSec={subtitleOffsetSec}
                                    onSelect={(idx) => {
                                      setActiveSubtitleIdx(idx);
                                      syncVideoTextTracks(idx);
                                    }}
                                    onOffsetChange={setSubtitleOffsetSec}
                                    onUploadFile={handleUploadLocalSubtitle}
                                    onLanguagesChanged={handleRefreshSubtitlesForLanguages}
                                  />
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={handleToggleGalleryFullscreen}
                              className="lg-cinema-icon-pill !w-9 !h-9 !min-w-[36px] !min-h-[36px] cursor-pointer"
                              aria-label={t("movies.player.exitFullscreen")}
                            >
                              <Minimize2 size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* External Liquid Glass Movie/Series Player & Subtitle Controls Bar Directly BELOW Gallery Stage (Rendered ONLY in direct <video> mode; iframe servers have built-in controls) */}
                  {!isAnyFullscreen &&
                    isWatchingInGallery &&
                    playerRenderMode === "direct" &&
                    !allServersFailed && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="lg-cinema-player-controls rounded-2xl px-3.5 py-2.5 flex flex-col gap-2"
                      dir="ltr"
                    >
                      {controlMode !== "none" && (
                        <CinemaTimeline
                          mode={controlMode}
                          videoRef={videoElementRef}
                          fallbackDurationSec={(detailedItem?.runtime ?? 0) * 60}
                          hasSubtitles={activeTrackCues.length > 0}
                          onUserSeek={handleUserSeek}
                          onUserTogglePlay={handleUserTogglePlay}
                        />
                      )}

                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          {playerRenderMode === "direct" && (
                            <div className="flex items-center gap-1.5 ps-1">
                              <button
                                type="button"
                                onClick={handleToggleVideoMute}
                                className="lg-cinema-icon-pill !w-8 !h-8 !min-w-[32px] !min-h-[32px] cursor-pointer"
                                aria-label={isVideoMuted ? "Unmute" : "Mute"}
                              >
                                {isVideoMuted || videoVolume === 0 ? (
                                  <VolumeX size={14} />
                                ) : (
                                  <Volume2 size={14} />
                                )}
                              </button>
                              <input
                                type="range"
                                min={0}
                                max={1}
                                  step={0.05}
                                value={isVideoMuted ? 0 : videoVolume}
                                onChange={(e) =>
                                  handleChangeVideoVolume(Number(e.target.value))
                                }
                                className="lg-cinema-seek-slider hidden sm:block w-20"
                                aria-label="Volume"
                              />
                            </div>
                          )}

                          {activeSubtitleIdx !== null && (
                            <div className="flex items-center gap-1 ps-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setSubtitleOffsetSec((s) =>
                                    Number((s - 0.5).toFixed(1)),
                                  )
                                }
                                className="lg-cinema-action-pill px-2 py-1 text-[10px] font-bold text-white/90 cursor-pointer"
                                title={
                                  currentLang === "ar"
                                    ? "تقديم الترجمة -0.5 ثانية"
                                    : "Sync Subtitles -0.5s"
                                }
                              >
                                -0.5s
                              </button>
                              {subtitleOffsetSec !== 0 && (
                                <button
                                  type="button"
                                  onClick={() => setSubtitleOffsetSec(0)}
                                  className="px-1.5 py-0.5 rounded bg-rose-500/30 border border-rose-300/40 text-[10px] font-mono text-white cursor-pointer"
                                  title="Reset subtitle offset"
                                >
                                  {subtitleOffsetSec > 0
                                    ? `+${subtitleOffsetSec}s`
                                    : `${subtitleOffsetSec}s`}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  setSubtitleOffsetSec((s) =>
                                    Number((s + 0.5).toFixed(1)),
                                  )
                                }
                                className="lg-cinema-action-pill px-2 py-1 text-[10px] font-bold text-white/90 cursor-pointer"
                                title={
                                  currentLang === "ar"
                                    ? "تأخير الترجمة +0.5 ثانية"
                                    : "Sync Subtitles +0.5s"
                                }
                              >
                                +0.5s
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 relative ms-auto">
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setIsSubtitleMenuOpen((prev) => !prev)
                              }
                              className={`lg-cinema-action-pill px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                                activeSubtitleIdx !== null &&
                                activeSubtitlesList[activeSubtitleIdx]
                                  ? "!bg-rose-600/45 !border-rose-300/70 text-white"
                                  : "text-white/85"
                              }`}
                              aria-label="Subtitles (CC)"
                              title="Subtitles (CC)"
                            >
                              <Subtitles size={14} />
                              <span>
                                {activeSubtitleIdx !== null &&
                                activeSubtitlesList[activeSubtitleIdx]
                                  ? activeSubtitlesList[
                                      activeSubtitleIdx
                                    ].lang.toUpperCase()
                                  : isLoadingSubtitles
                                    ? "CC..."
                                    : "OFF"}
                              </span>
                            </button>

                            {isSubtitleMenuOpen && (
                              <div className="absolute bottom-full right-0 mb-2 z-50">
                                <SubtitleSettingsPanel
                                  tracks={activeSubtitlesList}
                                  activeIdx={activeSubtitleIdx}
                                  loadingIdx={loadingSubtitleIdx}
                                  isSearching={isLoadingSubtitles}
                                  offsetSec={subtitleOffsetSec}
                                  onSelect={(idx) => {
                                    setActiveSubtitleIdx(idx);
                                    syncVideoTextTracks(idx);
                                  }}
                                  onOffsetChange={setSubtitleOffsetSec}
                                  onUploadFile={handleUploadLocalSubtitle}
                                  onLanguagesChanged={handleRefreshSubtitlesForLanguages}
                                />
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={handleToggleGalleryFullscreen}
                            className="lg-cinema-icon-pill !w-9 !h-9 !min-w-[36px] !min-h-[36px] cursor-pointer"
                            aria-label={t("movies.player.fullscreen")}
                            title={t("movies.player.fullscreen")}
                          >
                            <Maximize2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Liquid-Glass Season & Episode Selector Bar directly below Gallery Stage for TV Series */}
                  {detailedItem.mediaType === "tv" && (
                    <div
                      className="lg-cinema-tv-selector-bar rounded-2xl p-3 flex flex-col gap-2.5"
                      dir="ltr"
                    >
                      {/* Row 1: Seasons + Complete Season Mode */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5 max-w-full">
                          <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-white/70 pe-1 shrink-0">
                            <Tv size={12} className="text-rose-400" />
                            <span>{t("movies.meta.seasons")}</span>
                          </span>
                          {Array.from(
                            { length: Math.max(1, Math.min(30, detailedItem.seasons || 1)) },
                            (_, idx) => idx + 1,
                          ).map((seasonNum) => {
                            const isSeasonActive =
                              !isFullSeasonEmbed && selectedSeason === seasonNum;
                            return (
                              <button
                                key={`season-${seasonNum}`}
                                type="button"
                                onClick={() => {
                                  setIsFullSeasonEmbed(false);
                                  setSelectedSeason(seasonNum);
                                  setSelectedEpisode(1);
                                  setDetailServersOpen(true);
                                  startGalleryWatchSession();
                                }}
                                className={`lg-cinema-tv-pill px-3 py-1 rounded-full text-xs font-extrabold shrink-0 cursor-pointer transition-all ${
                                  isSeasonActive
                                    ? "lg-cinema-tv-pill--active"
                                    : "text-white/80 hover:text-white"
                                }`}
                              >
                                {t("movies.player.season", { num: seasonNum })}
                              </button>
                            );
                          })}
                        </div>

                        {/* Complete Season (embedtvfull) Toggle Option */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsFullSeasonEmbed((prev) => !prev);
                            setDetailServersOpen(true);
                            startGalleryWatchSession();
                          }}
                          className={`lg-cinema-tv-pill px-3 py-1 rounded-full text-xs font-extrabold inline-flex items-center gap-1.5 shrink-0 cursor-pointer transition-all ${
                            isFullSeasonEmbed
                              ? "lg-cinema-tv-pill--active"
                              : "text-amber-200/90 hover:text-amber-100"
                          }`}
                          title="https://www.2embed.cc/embedtvfull/..."
                        >
                          <Layers size={12} />
                          <span>{t("movies.player.fullSeason")}</span>
                        </button>
                      </div>

                      {/* Row 2: Episodes Strip */}
                      {!isFullSeasonEmbed && (
                        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-0.5">
                          <span className="text-[11px] font-black uppercase tracking-wider text-white/65 pe-1 shrink-0">
                            {t("movies.meta.episodes")}
                          </span>
                          {loadingSeasonEpisodes && seasonEpisodes.length === 0 ? (
                            <span className="text-xs text-white/60 font-bold px-2">
                              {t("movies.meta.loading")}
                            </span>
                          ) : (
                            seasonEpisodes.map((ep) => {
                              const isEpActive =
                                selectedEpisode === ep.episode_number;
                              return (
                                <button
                                  key={`ep-${selectedSeason}-${ep.episode_number}`}
                                  type="button"
                                  onClick={() => {
                                    setIsFullSeasonEmbed(false);
                                    setSelectedEpisode(ep.episode_number);
                                    setDetailServersOpen(true);
                                    startGalleryWatchSession();
                                  }}
                                  className={`lg-cinema-tv-ep-pill px-2.5 py-1 rounded-full text-xs font-bold shrink-0 cursor-pointer transition-all inline-flex items-center gap-1 ${
                                    isEpActive
                                      ? "lg-cinema-tv-ep-pill--active"
                                      : "text-white/80 hover:text-white"
                                  }`}
                                  title={ep.name}
                                >
                                  <span>E{ep.episode_number}</span>
                                  {isEpActive && ep.name && (
                                    <span className="max-w-[140px] truncate text-[11px] opacity-95 font-semibold ms-0.5">
                                      • {ep.name}
                                    </span>
                                  )}
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Scrollable Liquid Glass Body (Completely unmounted during active Movie/Series playback to focus 100% on the Cinema Stage) */}
                {!isWatchingInGallery && (
                <div className="p-5 sm:p-7 flex flex-col gap-5 overflow-y-auto">
                  {/* Action Bar: Branching Server Capsules + TIP Card + Trailer Toggle + Account Actions */}
                  <div className="flex flex-col gap-3 pb-4 border-b border-white/12">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2.5 flex-1">
                        {detailWatchTarget && (
                          <ServerBranchesInline
                            item={detailWatchTarget}
                            isOpen={detailServersOpen}
                            onToggle={() => {
                              setDetailServersOpen(true);
                              if (!isWatchingInGallery) {
                                startGalleryWatchSession();
                              }
                            }}
                            onClose={() => setDetailServersOpen(false)}
                            buttonLabel={t("movies.meta.watchNow")}
                          />
                        )}

                        {(activeImdbId || detailedItem.trailerKey) && !detailServersOpen && (
                          <button
                            type="button"
                            onClick={() => {
                              if (showHeroTrailer) {
                                setShowHeroTrailer(false);
                                setTrailerFallbackToYoutube(false);
                              } else {
                                persistCurrentProgress();
                                setIsWatchingInGallery(false);
                                clockReset("manual");
                                setTrailerFallbackToYoutube(!activeImdbId);
                                setShowHeroTrailer(true);
                              }
                            }}
                            className={`lg-cinema-action-pill py-2.5 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer ${
                              showHeroTrailer
                                ? "!bg-white/25 !border-white/50 text-white"
                                : "text-white/90"
                            }`}
                          >
                            <Film size={14} />
                            <span>
                              {showHeroTrailer
                                ? currentLang === "ar"
                                  ? "عرض الملصق"
                                  : "Show Backdrop"
                                : currentLang === "ar"
                                  ? "التريلر الرسمي"
                                  : "Official Trailer"}
                            </span>
                          </button>
                        )}
                      </div>

                      {user && detailedItem && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Favorite */}
                          <button
                            type="button"
                            onClick={() =>
                              toggle(
                                detailedItem.id,
                                detailedItem.mediaType,
                                'favorite',
                                detailedItem.title,
                                detailedItem.posterPath
                              )
                            }
                            aria-pressed={has(detailedItem.id, detailedItem.mediaType, 'favorite')}
                            aria-label="Add to favorites"
                            className={[
                              'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full',
                              'text-xs font-bold border transition-all duration-200 cursor-pointer backdrop-blur-md',
                              has(detailedItem.id, detailedItem.mediaType, 'favorite')
                                ? 'bg-rose-600/40 border-rose-400/60 text-white shadow-md'
                                : 'bg-white/6 border-white/15 text-white/75 hover:border-rose-400/50 hover:text-rose-200',
                            ].join(' ')}
                          >
                            <Heart
                              size={13}
                              strokeWidth={2}
                              fill={has(detailedItem.id, detailedItem.mediaType, 'favorite') ? 'currentColor' : 'none'}
                            />
                            <span>{currentLang === "ar" ? "مفضل" : "Favorite"}</span>
                          </button>

                          {/* Watched */}
                          <button
                            type="button"
                            onClick={() =>
                              toggle(
                                detailedItem.id,
                                detailedItem.mediaType,
                                'watched',
                                detailedItem.title,
                                detailedItem.posterPath
                              )
                            }
                            aria-pressed={has(detailedItem.id, detailedItem.mediaType, 'watched')}
                            aria-label="Mark as watched"
                            className={[
                              'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full',
                              'text-xs font-bold border transition-all duration-200 cursor-pointer backdrop-blur-md',
                              has(detailedItem.id, detailedItem.mediaType, 'watched')
                                ? 'bg-emerald-600/40 border-emerald-400/60 text-white shadow-md'
                                : 'bg-white/6 border-white/15 text-white/75 hover:border-emerald-400/50 hover:text-emerald-200',
                            ].join(' ')}
                          >
                            <Eye
                              size={13}
                              strokeWidth={2}
                              fill={has(detailedItem.id, detailedItem.mediaType, 'watched') ? 'currentColor' : 'none'}
                            />
                            <span>{currentLang === "ar" ? "تمت مشاهدته" : "Watched"}</span>
                          </button>

                          {/* Watchlist */}
                          <button
                            type="button"
                            onClick={() =>
                              toggle(
                                detailedItem.id,
                                detailedItem.mediaType,
                                'watchlist',
                                detailedItem.title,
                                detailedItem.posterPath
                              )
                            }
                            aria-pressed={has(detailedItem.id, detailedItem.mediaType, 'watchlist')}
                            aria-label="Add to watchlist"
                            className={[
                              'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full',
                              'text-xs font-bold border transition-all duration-200 cursor-pointer backdrop-blur-md',
                              has(detailedItem.id, detailedItem.mediaType, 'watchlist')
                                ? 'bg-amber-500/40 border-amber-300/60 text-white shadow-md'
                                : 'bg-white/6 border-white/15 text-white/75 hover:border-amber-400/50 hover:text-amber-200',
                            ].join(' ')}
                          >
                            <Bookmark
                              size={13}
                              strokeWidth={2}
                              fill={has(detailedItem.id, detailedItem.mediaType, 'watchlist') ? 'currentColor' : 'none'}
                            />
                            <span>{currentLang === "ar" ? "للمشاهدة لاحقاً" : "Watchlist"}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Overview & Rich TMDB Metadata Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    {/* Left / Main Column: Storyline + Genres + Rich Metadata Badges */}
                    <div className="lg:col-span-6 flex flex-col gap-4">
                      <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/12 flex flex-col gap-2.5">
                        <h4 className="text-[11px] font-bold text-white/60 uppercase tracking-widest">
                          {currentLang === "ar" ? "القصة والملخص" : "Storyline"}
                        </h4>
                        <p className="text-xs sm:text-sm text-white/90 leading-relaxed select-text">
                          {detailedItem.overview}
                        </p>
                      </div>

                      {/* Genres */}
                      {detailedItem.genreNames.length > 0 && (
                        <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/12 flex flex-col gap-2.5">
                          <h4 className="text-[11px] font-bold text-white/60 uppercase tracking-widest">
                            {t("movies.genres") || (currentLang === "ar" ? "التصنيفات" : "Genres")}
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {detailedItem.genreNames.map((g, i) => (
                              <span
                                key={i}
                                className="text-[11px] font-bold px-3.5 py-1 bg-white/10 border border-white/22 rounded-full text-white/95 shadow-sm"
                              >
                                {g}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Rich TMDB Facts (Release Date, Status, Language, Vote Count, Directors, Studios) */}
                      <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/12 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        {detailedItem.releaseDate && (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-white/55 font-bold flex items-center gap-1">
                              <Calendar size={11} />
                              {currentLang === "ar" ? "تاريخ الإصدار" : "Release Date"}
                            </span>
                            <span className="font-extrabold text-white/95">{detailedItem.releaseDate}</span>
                          </div>
                        )}

                        {detailedItem.status && (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-white/55 font-bold flex items-center gap-1">
                              <Sparkles size={11} />
                              {currentLang === "ar" ? "الحالة" : "Status"}
                            </span>
                            <span className="font-extrabold text-emerald-300">{detailedItem.status}</span>
                          </div>
                        )}

                        {detailedItem.originalLanguage && (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-white/55 font-bold flex items-center gap-1">
                              <Globe2 size={11} />
                              {currentLang === "ar" ? "اللغة الأصلية" : "Language"}
                            </span>
                            <span className="font-extrabold text-white/95">{detailedItem.originalLanguage}</span>
                          </div>
                        )}

                        {detailedItem.voteCount !== undefined && detailedItem.voteCount > 0 && (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-white/55 font-bold flex items-center gap-1">
                              <Award size={11} />
                              {currentLang === "ar" ? "عدد التقييمات" : "Votes"}
                            </span>
                            <span className="font-extrabold text-amber-300">
                              {detailedItem.voteCount.toLocaleString()}
                            </span>
                          </div>
                        )}

                        {detailedItem.rottenTomatoes && (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-white/55 font-bold">
                              {t("movies.meta.rottenTomatoes", "Rotten Tomatoes")}
                            </span>
                            <span className="font-extrabold text-rose-300">
                              {detailedItem.rottenTomatoes}
                            </span>
                          </div>
                        )}

                        {detailedItem.metascore && (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-white/55 font-bold">
                              {t("movies.meta.metascore", "Metacritic")}
                            </span>
                            <span className="font-extrabold text-emerald-300">
                              {detailedItem.metascore}/100
                            </span>
                          </div>
                        )}

                        {detailedItem.boxOffice && (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-white/55 font-bold">
                              {t("movies.meta.boxOffice", "Box Office")}
                            </span>
                            <span className="font-extrabold text-amber-200">
                              {detailedItem.boxOffice}
                            </span>
                          </div>
                        )}

                        {detailedItem.awards && (
                          <div className="flex flex-col gap-0.5 col-span-2 sm:col-span-3">
                            <span className="text-[10px] text-white/55 font-bold flex items-center gap-1">
                              <Award size={11} />
                              {t("movies.meta.awards", "Awards")}
                            </span>
                            <span className="font-extrabold text-white/95">
                              {detailedItem.awards}
                            </span>
                          </div>
                        )}

                        {detailedItem.directors && detailedItem.directors.length > 0 && (
                          <div className="flex flex-col gap-0.5 col-span-2">
                            <span className="text-[10px] text-white/55 font-bold">
                              {detailedItem.mediaType === 'tv'
                                ? (currentLang === "ar" ? "صناع العمل" : "Created By")
                                : (currentLang === "ar" ? "الإخراج" : "Director")}
                            </span>
                            <span className="font-extrabold text-white/95 truncate">
                              {detailedItem.directors.join(" • ")}
                            </span>
                          </div>
                        )}

                        {detailedItem.productionCompanies && detailedItem.productionCompanies.length > 0 && (
                          <div className="flex flex-col gap-1 col-span-2 sm:col-span-3 pt-1 border-t border-white/10">
                            <span className="text-[10px] text-white/55 font-bold">
                              {currentLang === "ar" ? "شركات وشبكات الإنتاج" : "Production & Networks"}
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {detailedItem.productionCompanies.map((p) => (
                                <span
                                  key={p.id || p.name}
                                  className="px-2.5 py-0.5 rounded-full bg-white/8 border border-white/15 text-[10.5px] font-bold text-white/85"
                                >
                                  {p.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Interactive Cast Grid (Click any actor to open their Liquid Glass Profile) */}
                    <div className="lg:col-span-6 p-4 rounded-2xl bg-white/[0.04] border border-white/12 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[11px] font-bold text-white/70 uppercase tracking-widest flex items-center gap-1.5">
                          <Users size={13} className="text-rose-400" />
                          <span>{t("movies.cast") || (currentLang === "ar" ? "طاقم التمثيل" : "Top Cast")}</span>
                        </h4>
                        <span className="text-[10px] text-sky-300/90 font-semibold">
                          {currentLang === "ar" ? "اضغط على الممثل لعرض بطاقته وأعماله" : "Click any actor for bio & works"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {detailedItem.cast.slice(0, 9).map((actor, idx) => (
                          <button
                            key={actor.id || idx}
                            type="button"
                            onClick={() => handleSelectActor(actor)}
                            className="lg-cinema-cast-pill flex items-center gap-2.5 p-2 rounded-2xl text-start cursor-pointer group"
                          >
                            <div className="w-11 h-11 rounded-full bg-white/10 overflow-hidden border border-white/30 flex-shrink-0 shadow-md group-hover:scale-105 transition-transform">
                              {actor.profilePath ? (
                                <img
                                  src={actor.profilePath.startsWith("http") ? actor.profilePath : `${TMDB_IMAGE_BASE}/w185${actor.profilePath}`}
                                  className="w-full h-full object-cover select-none pointer-events-none"
                                  alt={actor.name}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs text-white/50">👤</div>
                              )}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[11px] font-extrabold text-white group-hover:text-rose-200 transition-colors truncate">
                                {actor.name}
                              </span>
                              {actor.character && (
                                <span className="text-[9.5px] text-white/60 truncate">
                                  {actor.character}
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Similar / Recommended Titles Row */}
                  {detailedItem.similar && detailedItem.similar.length > 0 && (
                    <div className="flex flex-col gap-2.5 pt-2 border-t border-white/10">
                      <h4 className="text-xs font-extrabold text-white/80 uppercase tracking-wider">
                        {currentLang === "ar" ? "أعمال مشابهة قد تعجبك" : "Similar Titles You May Like"}
                      </h4>
                      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none" style={MOVIE_ROW_SCROLL_STYLE}>
                        {detailedItem.similar.slice(0, 8).map((sim) => (
                          <button
                            key={sim.id}
                            type="button"
                            onClick={() => {
                              setShowHeroTrailer(false);
                              setSelectedItemId(sim.id, sim.mediaType);
                            }}
                            className="nl-poster relative w-[110px] sm:w-[126px] aspect-[2/3] flex-shrink-0 overflow-hidden cursor-pointer text-start group"
                          >
                            <img
                              src={getPosterSrc_static(sim.posterPath, sim.trailerKey, sim.backdropPath)}
                              alt={sim.title}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <span className="nl-poster__sheen" />
                            {sim.rating > 0 && (
                              <span className="absolute top-1.5 right-1.5 z-10 px-1.5 py-0.5 rounded-full bg-black/65 border border-white/20 text-[9px] font-extrabold text-amber-400 flex items-center gap-0.5">
                                <Star size={8} className="fill-current" />
                                {sim.rating.toFixed(1)}
                              </span>
                            )}
                            <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                              <p className="text-[10px] font-bold text-white truncate">{sim.title}</p>
                              <p className="text-[8.5px] text-white/65">{sim.year}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                )}
              </m.div>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* Interactive Liquid Glass Actor Profile Card Modal (Disabled while movie is actively playing) */}
      <AnimatePresence>
        {!isWatchingInGallery && selectedActor && (
          <div className="fixed inset-0 z-[10150] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xl select-none">
            <div
              className="absolute inset-0 cursor-zoom-out"
              onClick={() => {
                setSelectedActor(null);
                setActorDetails(null);
              }}
            />
            <m.div
              role="dialog"
              aria-modal="true"
              aria-label={selectedActor.name}
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="lg-cinema-glass-modal relative z-10 w-full max-w-2xl rounded-3xl p-5 sm:p-6 overflow-y-auto max-h-[88dvh] flex flex-col gap-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 min-w-0">
                  {/* Large High-Res Actor Portrait in Liquid Glass Frame */}
                  <div className="w-28 h-36 sm:w-32 sm:h-44 rounded-2xl overflow-hidden border border-white/35 shadow-2xl flex-shrink-0 bg-white/10 relative">
                    {(actorDetails?.profilePath || selectedActor.profilePath) ? (
                      <img
                        src={
                          (actorDetails?.profilePath || selectedActor.profilePath).startsWith("http")
                            ? (actorDetails?.profilePath || selectedActor.profilePath)
                            : `${TMDB_IMAGE_BASE}/h632${actorDetails?.profilePath || selectedActor.profilePath}`
                        }
                        alt={selectedActor.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">👤</div>
                    )}
                    <span className="nl-poster__sheen" />
                  </div>

                  <div className="flex flex-col gap-1.5 text-center sm:text-start min-w-0">
                    <span className="inline-flex self-center sm:self-start items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/25 border border-rose-300/40 text-rose-200">
                      {actorDetails?.knownForDepartment || (currentLang === "ar" ? "ممثل" : "Acting")}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-white select-text">
                      {actorDetails?.name || selectedActor.name}
                    </h3>
                    {selectedActor.character && (
                      <p className="text-xs font-bold text-amber-300">
                        {currentLang === "ar" ? `الدور: ${selectedActor.character}` : `Role: ${selectedActor.character}`}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-[11px] text-white/75 mt-1">
                      {actorDetails?.birthday && (
                        <span className="flex items-center gap-1">
                          <Calendar size={12} className="text-sky-300" />
                          {actorDetails.birthday}
                        </span>
                      )}
                      {actorDetails?.placeOfBirth && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} className="text-rose-300" />
                          {actorDetails.placeOfBirth}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedActor(null);
                    setActorDetails(null);
                  }}
                  className="lg-cinema-icon-pill flex-shrink-0 hover:!bg-rose-600/45"
                  aria-label="Close actor profile"
                >
                  <X size={16} />
                </button>
              </div>

              {loadingActor ? (
                <div className="py-10 flex flex-col items-center justify-center gap-2 text-white/75">
                  <div className="w-8 h-8 border-2 border-t-rose-500 border-white/20 rounded-full animate-spin" />
                  <span className="text-xs font-bold">
                    {currentLang === "ar" ? "جاري جلب معلومات الممثل..." : "Loading actor profile..."}
                  </span>
                </div>
              ) : (
                <>
                  {/* Biography */}
                  <div className="p-3.5 rounded-2xl bg-white/[0.05] border border-white/12 max-h-44 overflow-y-auto">
                    <h4 className="text-[10px] font-bold text-white/55 uppercase tracking-widest mb-1">
                      {currentLang === "ar" ? "السيرة الذاتية" : "Biography"}
                    </h4>
                    <p className="text-xs text-white/85 leading-relaxed select-text whitespace-pre-line">
                      {actorDetails?.biography}
                    </p>
                  </div>

                  {/* Actor's Known Works (Clickable to open directly) */}
                  {actorDetails?.knownWorks && actorDetails.knownWorks.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <h4 className="text-[10px] font-bold text-white/60 uppercase tracking-widest">
                        {currentLang === "ar" ? "أشهر الأعمال (اضغط للفتح)" : "Known For (Click to Open)"}
                      </h4>
                      <div className="flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-none" style={MOVIE_ROW_SCROLL_STYLE}>
                        {actorDetails.knownWorks.map((work) => (
                          <button
                            key={`${work.mediaType}-${work.id}`}
                            type="button"
                            onClick={() => {
                              setSelectedActor(null);
                              setActorDetails(null);
                              setActiveTab(work.mediaType === 'tv' ? 'series' : 'movies');
                              setSelectedItemId(work.id, work.mediaType);
                            }}
                            className="nl-poster relative w-[96px] sm:w-[108px] aspect-[2/3] flex-shrink-0 overflow-hidden cursor-pointer text-start group"
                          >
                            <img
                              src={getPosterSrc_static(work.posterPath)}
                              alt={work.title}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <span className="nl-poster__sheen" />
                            <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                              <p className="text-[9.5px] font-bold text-white truncate">{work.title}</p>
                              <p className="text-[8px] text-white/65">{work.year}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </m.div>
          </div>
        )}
      </AnimatePresence>

    </div>,
    document.body
  );
}
