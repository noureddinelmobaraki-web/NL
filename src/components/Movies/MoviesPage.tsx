import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Search, Volume2, VolumeX, Play, Info, ChevronLeft, ChevronRight, Star, Film, Tv, Heart, Eye, Bookmark } from "lucide-react";
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
import { MovieSourcesModal } from "./MovieSourcesModal";
import { useTopMovies } from "./useTopMovies";
import { logPlay } from "../../features/music/data/playTracking";

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

export async function fetchWithCache(url: string, signal?: AbortSignal, ttlMs = 3600_000 * 24): Promise<any> {
  // لا تُضمّن api_key في مفتاح التخزين
  const key = `cache_v2_${url.replace(/([?&])api_key=[^&]*/i, '$1api_key=_')}`;
  const now = Date.now();
  const fresh = (t: number) => now - t < ttlMs;

  const revalidate = async () => {
    const res = await fetch(url, { signal: signal ?? AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error("TMDB network response failed");
    const d = await res.json();
    const entry = { d, t: Date.now() };
    MEMORY_CACHE[key] = entry;
    try { localStorage.setItem(key, JSON.stringify(entry)); } catch {}
    return d;
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

export interface CinemaItem {
  id: number;
  mediaType: Media;
  title: string;
  overview: string;
  posterPath: string;
  backdropPath: string;
  year: string;
  rating: number;
  genreIds: number[];
  genreNames: string[];
  trailerKey: string;
  imdbId?: string;
  runtime?: number;
  seasons?: number;
  episodes?: number;
  cast: { name: string; character: string; profilePath: string }[];
  similar: CinemaItem[];
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
    || raw.trailer_key || raw.trailerKey || '';
  
  const rawTitle = pick(isTv ? (raw.name ?? raw.title) : (raw.title ?? raw.name), lang) || "Unknown Title";
  let rawOverview = pick(raw.overview, lang);
  if (!rawOverview || rawOverview.trim() === '') {
    if (lang === 'ar') rawOverview = "Synopsis currently unavailable.";
    else if (lang === 'fr') rawOverview = "Synopsis non disponible.";
    else rawOverview = "Overview not available.";
  }

  return {
    id: raw.id,
    mediaType,
    title: rawTitle,
    overview: rawOverview,
    posterPath: raw.poster_path || raw.posterPath || '',
    backdropPath: raw.backdrop_path || raw.backdropPath || '',
    year: String(isTv ? (raw.first_air_date || raw.year || '') : (raw.release_date || raw.year || '')).split('-')[0],
    rating: typeof raw.vote_average === 'number' ? raw.vote_average : (typeof raw.rating === 'number' ? raw.rating : 0),
    genreIds,
    genreNames,
    trailerKey,
    imdbId: raw.imdb_id || raw.imdbId || raw.external_ids?.imdb_id,
    runtime: raw.runtime || raw.duration,
    seasons: raw.number_of_seasons || raw.seasons,
    episodes: raw.number_of_episodes || raw.episodes,
    cast: (raw.credits?.cast || raw.cast || []).map((c: any) => ({
      name: c.name, character: c.character || '', profilePath: c.profile_path || c.profilePath || '',
    })),
    similar: (raw.similar?.results || raw.similar || []).map((s: any) => normalizeItem(s, mediaType, lang)),
  };
}

const getBackdropSrc_static = (
  path: string | null | undefined,
  trailerKey?: string,
  posterPath?: string,
) => {
  if (path) {
    if (path.startsWith("http")) return path;
    return `${TMDB_IMAGE_BASE}/original${path}`;
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
  }: {
    item: CinemaItem;
    isTouch: boolean;
    activeHoverId: number | null;
    setActiveHoverId: (id: number | null) => void;
    hoverTimer: React.MutableRefObject<any>;
    setSelectedItemId: (id: number | null) => void;
    onQuickWatch?: (item: CinemaItem) => void;
    t: any;
    isFavorite?: boolean;
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
        onClick={() => setSelectedItemId(item.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setSelectedItemId(item.id);
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

        {/* Top-right Rating Pill */}
        <span className="absolute top-2 right-2 z-20 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[10px] font-extrabold text-amber-400 shadow">
          <Star size={9} className="fill-current" />
          {item.rating?.toFixed(1) || "8.1"}
        </span>

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
            {item.year || "2024"} · {fallbackGenText}
          </p>
        </div>

        {/* Zoomed Liquid Glass Drawer Overlay (Shows full artwork above + rich glass controls below) */}
        <AnimatePresence>
          {isZoomed && (
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="nl-poster__glass-drawer flex flex-col gap-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="text-[11px] font-black text-white leading-tight line-clamp-1">
                {item.title}
              </h4>
              <div className="flex items-center justify-between text-[9px] text-white/80 font-mono">
                <span>{item.year || "2024"}</span>
                <span className="px-1.5 py-0.2 rounded bg-white/15 text-[8px] font-bold text-white">
                  {item.mediaType === "movie" ? "MOVIE" : "SERIES"}
                </span>
              </div>
              <p className="text-[9.5px] text-white/80 line-clamp-2 leading-snug">
                {item.overview}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                {onQuickWatch && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickWatch(item);
                    }}
                    className="lg-cinema-primary-pill flex-1 py-1 px-2 rounded-full text-[9.5px] font-extrabold text-white flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Play size={10} className="fill-current" />
                    <span>{t("movies.meta.watchNow") || "Watch"}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedItemId(item.id);
                  }}
                  className="lg-cinema-action-pill py-1 px-2.5 rounded-full text-[9.5px] font-bold text-white flex items-center justify-center gap-1 cursor-pointer"
                  title={t("movies.meta.moreInfo") || "Details"}
                >
                  <Info size={10} />
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

  // Resolution effects for Top items
  useEffect(() => {
    let cancelled = false;
    if (topMoviesRows.length === 0) {
      setTopMovies([]);
      return;
    }
    const loadTopMoviesDetails = async () => {
      const items: CinemaItem[] = [];
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

      for (const row of topMoviesRows) {
        if (cancelled) return;
        const matched = allLoaded.find(m => m.id === row.tmdb_id && m.mediaType === 'movie');
        if (matched) {
          items.push(matched);
        } else if (tmdbKey) {
          try {
            const detail = await fetchWithCache(
              `${TMDB_BASE_URL}/movie/${row.tmdb_id}?api_key=${tmdbKey}${langParam}`
            );
            if (!cancelled && detail) {
              items.push(normalizeItem(detail, 'movie', currentLang));
            }
          } catch (e) {
            console.warn("Failed to fetch top movie details for ID", row.tmdb_id, e);
          }
        }
      }
      if (!cancelled) {
        setTopMovies(items);
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
      const items: CinemaItem[] = [];
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

      for (const row of topSeriesRows) {
        if (cancelled) return;
        const matched = allLoaded.find(m => m.id === row.tmdb_id && m.mediaType === 'tv');
        if (matched) {
          items.push(matched);
        } else if (tmdbKey) {
          try {
            const detail = await fetchWithCache(
              `${TMDB_BASE_URL}/tv/${row.tmdb_id}?api_key=${tmdbKey}${langParam}`
            );
            if (!cancelled && detail) {
              items.push(normalizeItem(detail, 'tv', currentLang));
            }
          } catch (e) {
            console.warn("Failed to fetch top series details for ID", row.tmdb_id, e);
          }
        }
      }
      if (!cancelled) {
        setTopSeries(items);
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

  // Slideshow / Modal
  useDocumentMeta("movies.title", "movies.description");

  const [heroIndex, setHeroIndex] = useState(0);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [detailedItem, setDetailedItem] = useState<CinemaItem | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [selectedWatchItem, setSelectedWatchItem] = useState<CinemaItem | null>(null);
  const [showHeroTrailer, setShowHeroTrailer] = useState(false);
  const [activeHoverId, setActiveHoverId] = useState<number | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const detailDialogRef = useFocusTrap(selectedItemId !== null && !!detailedItem);

  useEffect(() => {
    setShowHeroTrailer(false);
    if (selectedItemId === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedItemId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedItemId]);

  const handleQuickWatch = useCallback((item: CinemaItem) => {
    setSelectedWatchItem(item);
  }, []);

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
    setSelectedItemId(rec.tmdb_id);
  }, []);

  const isOpenForAudio = Boolean(detailedItem || selectedItemId || selectedWatchItem);
  const { isMuted, toggleMute } = useMoviesMusic(isOpenForAudio);

  const [scrolled, setScrolled] = useState(false);
  const mainScrollRef = useRef<HTMLDivElement | null>(null);

  const handleScrollEvent = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrolled(e.currentTarget.scrollTop > 40);
  }, []);

  useEffect(() => {
    setMovieActive(Boolean(detailedItem));
    registerMovieBack(() => {
      setDetailedItem(null);
      setSelectedItemId(null);
    });
  }, [detailedItem, setMovieActive, registerMovieBack]);

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

  useEffect(() => {
    setSelectedGenreId(null);
    setSearchQuery("");
    setDetailedItem(null);
    setSelectedItemId(null);
    setHeroIndex(0);
  }, [activeTab]);

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

  // Load Series
  useEffect(() => {
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
  }, [tmdbKey, currentLang]);

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
    setIsLoadingDetails(true);

    const isTv = activeTab === 'series';
    const mediaType: Media = isTv ? 'tv' : 'movie';

    if (!tmdbKey) {
      const list = isTv ? FALLBACK_SERIES : FALLBACK_MOVIES;
      const match = list.find(m => m.id === selectedItemId);
      if (!cancelled && match) {
        const normalized = normalizeItem(match, mediaType, currentLang);
        setDetailedItem(normalized);
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
          `${TMDB_BASE_URL}/${detailType}/${selectedItemId}?api_key=${tmdbKey}${langParam}&append_to_response=${detailsAppend}`
        );

        let imdbRating = "N/A";
        const imdbId = isTv ? detail.external_ids?.imdb_id : detail.imdb_id;

        if (imdbId && omdbKey) {
          try {
            const omdb = await fetch(`${window.location.protocol}//www.omdbapi.com/?i=${imdbId}&apikey=${omdbKey}`).then(r => r.json());
            if (omdb && omdb.imdbRating && omdb.imdbRating !== "N/A") {
              imdbRating = omdb.imdbRating;
            }
          } catch (omdbErr) {
            console.warn("Could not fetch ratings from OMDB API:", omdbErr);
          }
        }

        if (!cancelled) {
          const normalized = normalizeItem(detail, mediaType, currentLang);
          const resolvedItem = {
            ...normalized,
            rating: imdbRating !== "N/A" ? parseFloat(imdbRating) : normalized.rating || 8.1
          };
          setDetailedItem(resolvedItem);
          logPlay({
            item_type: resolvedItem.mediaType === 'tv' ? 'series' : 'movie',
            item_id: String(resolvedItem.id),
            media_type: resolvedItem.mediaType,
            title: resolvedItem.title || null,
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
  }, [selectedItemId, activeTab, tmdbKey, currentLang, omdbKey]);

  const activeGenres = activeTab === 'movies' ? movieGenres : seriesGenres;
  const activeFallbackSelected = activeTab === 'movies' ? FALLBACK_MOVIES : FALLBACK_SERIES;
  const activeLiveTrending = activeTab === 'movies' ? trendingMovies : trendingSeries;

  const slideshowSlides = useMemo(() => {
    if (activeLiveTrending.length > 0) return activeLiveTrending.slice(0, 5);
    return activeFallbackSelected.map(r => normalizeItem(r, activeTab === 'movies' ? 'movie' : 'tv', currentLang));
  }, [activeLiveTrending, activeFallbackSelected, activeTab, currentLang]);

  const slideshowSlidesLength = slideshowSlides.length;

  useEffect(() => {
    if (slideshowSlidesLength <= 1) return;
    const interval = setInterval(() => {
      if (document.hidden) return;
      setHeroIndex(prev => (prev + 1) % slideshowSlidesLength);
    }, 8000);
    return () => clearInterval(interval);
  }, [slideshowSlidesLength]);

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
    ? getBackdropSrc_static(ambientBackdropItem.backdropPath, ambientBackdropItem.posterPath, ambientBackdropItem.trailerKey)
    : "";

  return createPortal(
    <div dir={currentLang === "ar" ? "rtl" : "ltr"} className="nl-cinema-root fixed inset-0 z-[9500] w-full h-[100dvh] text-zinc-100 font-sans overflow-hidden select-none pointer-events-auto">
      {/* Dynamic Liquid Glass Ambient Backdrop Illumination */}
      {ambientBackdropUrl && (
        <div
          className="lg-cinema-ambient-bg"
          style={{ backgroundImage: `url(${ambientBackdropUrl})` }}
          aria-hidden="true"
        />
      )}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 15%, rgba(16, 24, 42, 0.35) 0%, rgba(6, 9, 17, 0.88) 70%, rgba(4, 6, 12, 0.97) 100%)",
        }}
      />

      <div
        ref={mainScrollRef}
        onScroll={handleScrollEvent}
        className="nl-cinema-scroll absolute inset-0 z-20 overflow-y-auto h-full w-full scrollbar-none"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
      >
        {/* Unified Non-Overlapping Liquid Glass Header */}
        <header
          className={`nl-cinema-header fixed top-0 inset-x-0 z-50 flex items-center justify-between gap-2 px-3 sm:px-8 py-3 transition-all duration-300 ${
            scrolled ? "nl-cinema-header--scrolled" : "bg-gradient-to-b from-black/70 via-black/30 to-transparent"
          }`}
        >
          {/* Left / Start Zone: Back button (when inside subview) + Logo + Liquid Glass Tabs + Desktop Genres */}
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
                className={`px-3 py-1.5 text-[11px] sm:text-xs font-black rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'movies'
                    ? 'lg-cinema-pill-btn--active'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <Film size={12} />
                <span>{currentLang === "ar" ? "أفلام" : "Movies"}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('series')}
                className={`px-3 py-1.5 text-[11px] sm:text-xs font-black rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'series'
                    ? 'lg-cinema-pill-btn--active'
                    : 'text-white/70 hover:text-white'
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
                  className={`text-[11px] font-bold px-3 py-1 rounded-full transition-all cursor-pointer border ${
                    selectedGenreId === null
                      ? "text-white bg-white/18 border-white/35 shadow-[0_4px_14px_rgba(255,255,255,0.12)]"
                      : "text-white/65 bg-white/5 border-white/10 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {t("movies.all") || (currentLang === "ar" ? "الكل" : "All")}
                </button>
                {activeGenres.slice(0, 5).map(g => (
                  <button
                    type="button"
                    key={g.id}
                    onClick={() => setSelectedGenreId(g.id)}
                    className={`text-[11px] font-bold px-3 py-1 rounded-full transition-all cursor-pointer border whitespace-nowrap ${
                      selectedGenreId === g.id
                        ? "text-white bg-white/18 border-white/35 shadow-[0_4px_14px_rgba(255,255,255,0.12)]"
                        : "text-white/65 bg-white/5 border-white/10 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {g.name}
                  </button>
                ))}
              </nav>
            )}
          </div>

          {/* Right / End Zone: Search + Watchlist + Sound Mute + Close Window (Cleanly spaced, zero overlap) */}
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
                className="relative flex flex-col justify-end w-full pb-8 sm:pb-14 px-5 sm:px-14"
                style={{ height: isMobile ? "56vh" : "76vh" }}
              >
                <div className="absolute inset-0 z-0 overflow-hidden">
                  <img
                    src={getBackdropSrc_static(activeHeroItem.backdropPath, activeHeroItem.posterPath, activeHeroItem.trailerKey)}
                    alt=""
                    className="w-full h-full object-cover select-none pointer-events-none scale-105 transition-transform duration-1000"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(to top, rgba(7,10,18,1) 0%, rgba(7,10,18,0.45) 45%, rgba(7,10,18,0.3) 100%)",
                    }}
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        currentLang === "ar"
                          ? "linear-gradient(to left, rgba(7,10,18,0.88) 0%, rgba(7,10,18,0.35) 50%, transparent 100%)"
                          : "linear-gradient(to right, rgba(7,10,18,0.88) 0%, rgba(7,10,18,0.35) 50%, transparent 100%)",
                    }}
                  />
                </div>

                {/* Liquid Glass Hero Showcase Card */}
                <div className="relative z-10 flex flex-col max-w-2xl text-white gap-3 p-5 sm:p-7 rounded-3xl border border-white/15 bg-white/[0.06] backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.25)]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/25 border border-rose-300/40 text-rose-100">
                      {activeHeroItem.mediaType === 'movie'
                        ? (currentLang === "ar" ? "فيلم مميز" : "Featured Movie")
                        : (currentLang === "ar" ? "مسلسل مميز" : "Featured Series")}
                    </span>
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-400/20 border border-amber-300/40 text-amber-300">
                      <Star size={11} className="fill-current" />
                      {activeHeroItem.rating?.toFixed(1) || "8.1"}
                    </span>
                    <span className="text-xs text-white/80 font-semibold">{activeHeroItem.year || "2024"}</span>
                    <span className="border border-white/25 bg-white/10 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      {activeHeroItem.mediaType === 'movie' ? "PG-13" : "TV-MA"}
                    </span>
                    <span className="text-xs text-white/75 font-medium">
                      {activeHeroItem.mediaType === 'movie'
                        ? activeHeroItem.runtime ? `${activeHeroItem.runtime}${t("movies.meta.minutes")}` : `148${t("movies.meta.minutes")}`
                        : activeHeroItem.seasons ? `${activeHeroItem.seasons} ${t("movies.meta.seasons")}` : `5 ${t("movies.meta.seasons")}`}
                    </span>
                  </div>

                  <h2 className="text-2xl sm:text-4xl font-black leading-tight tracking-tight select-text drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
                    {localizedHeroTitle}
                  </h2>

                  <p className="text-xs sm:text-sm text-white/80 tracking-wide leading-relaxed line-clamp-2 select-text">
                    {activeHeroItem.overview}
                  </p>

                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setSelectedWatchItem(activeHeroItem)}
                      className="lg-cinema-primary-pill py-2.5 px-6 text-white font-black flex items-center gap-2 text-xs sm:text-sm cursor-pointer"
                    >
                      <Play size={15} className="fill-current" />
                      <span>{t("movies.meta.watchNow") || (currentLang === "ar" ? "شاهد الآن" : "Watch Now")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedItemId(activeHeroItem.id)}
                      className="lg-cinema-action-pill py-2.5 px-5 text-white font-bold flex items-center gap-2 text-xs sm:text-sm cursor-pointer"
                    >
                      <Info size={15} />
                      <span>{t("movies.meta.moreInfo") || (currentLang === "ar" ? "التفاصيل والتريلر" : "Details & Trailer")}</span>
                    </button>

                    {/* Hero Slide Indicators */}
                    {slideshowSlidesLength > 1 && (
                      <div className="ms-auto flex items-center gap-1.5">
                        {slideshowSlides.map((slide, idx) => (
                          <button
                            key={slide.id}
                            type="button"
                            onClick={() => setHeroIndex(idx)}
                            aria-label={`Slide ${idx + 1}`}
                            className={`h-1.5 rounded-full transition-all cursor-pointer ${
                              idx === heroIndex ? "w-6 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" : "w-1.5 bg-white/35 hover:bg-white/60"
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'movies' ? (
              globalError && trendingMovies.length === 0 ? (
                <div className="w-full py-20 flex flex-col items-center gap-4 text-center">
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
                <div className="relative pb-24 -mt-2">
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
                <div className="relative pb-24 -mt-2">
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
                <div className="w-full py-20 flex flex-col items-center gap-4 text-center">
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
                <div className="relative pb-24 -mt-2">
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
                <div className="relative pb-24 -mt-2">
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

      {/* Liquid Glass Movie / Series Details & Practical Trailer Modal */}
      <AnimatePresence>
        {selectedItemId !== null && detailedItem && (
          <div className="nl-detail-wrap fixed inset-0 z-[7000] flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/75 backdrop-blur-xl">
            <div onClick={() => setSelectedItemId(null)} className="absolute inset-0 z-0 cursor-zoom-out" />
            {isLoadingDetails ? (
              <div className="relative z-10 flex flex-col items-center gap-3 text-white lg-cinema-glass-modal px-8 py-7 rounded-3xl">
                <div className="w-11 h-11 border-3 border-t-rose-500 border-white/20 rounded-full animate-spin" />
                <p className="text-white/75 text-xs font-medium">{t("movies.meta.resolving")}</p>
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
                transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                className="nl-detail-card lg-cinema-glass-modal relative w-full max-w-4xl rounded-3xl z-10 overflow-hidden my-auto max-h-[92dvh] flex flex-col"
              >
                {/* Top 16:9 Stage: Switches between Backdrop Hero & Interactive Full-Width Trailer */}
                <div className="relative aspect-video w-full bg-black flex-shrink-0 overflow-hidden">
                  {showHeroTrailer && detailedItem.trailerKey ? (
                    <iframe
                      className="w-full h-full border-0"
                      src={`https://www.youtube.com/embed/${detailedItem.trailerKey}?autoplay=1&rel=0&modestbranding=1`}
                      title={`${detailedItem.title} Trailer`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                      allowFullScreen
                    />
                  ) : (
                    <>
                      <img
                        src={getBackdropSrc_static(detailedItem.backdropPath, detailedItem.posterPath, detailedItem.trailerKey)}
                        alt={detailedItem.title}
                        className="w-full h-full object-cover opacity-90"
                      />
                      <div
                        className="absolute inset-0"
                        style={{
                          background:
                            "linear-gradient(to top, rgba(10, 14, 24, 0.98) 0%, rgba(10, 14, 24, 0.45) 50%, rgba(10, 14, 24, 0.3) 100%)",
                        }}
                      />

                      {/* Center Play Trailer Trigger on Backdrop if trailer exists */}
                      {detailedItem.trailerKey && (
                        <button
                          type="button"
                          onClick={() => setShowHeroTrailer(true)}
                          className="absolute inset-0 m-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/15 hover:bg-white/25 border border-white/40 backdrop-blur-xl flex items-center justify-center text-white shadow-[0_12px_36px_rgba(0,0,0,0.65)] transition-transform hover:scale-110 cursor-pointer group"
                          aria-label={currentLang === "ar" ? "تشغيل التريلر" : "Play Trailer"}
                          title={currentLang === "ar" ? "تشغيل التريلر" : "Play Trailer"}
                        >
                          <Play size={28} className="fill-current ms-1 group-hover:scale-110 transition-transform" />
                        </button>
                      )}

                      {/* Bottom Overlay Info inside Hero Stage */}
                      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 flex items-end justify-between gap-4">
                        <div className="flex items-end gap-3.5 min-w-0">
                          <img
                            src={getPosterSrc_static(detailedItem.posterPath, detailedItem.backdropPath, detailedItem.trailerKey)}
                            alt=""
                            className="hidden sm:block w-20 md:w-24 aspect-[2/3] object-cover rounded-xl border border-white/25 shadow-2xl flex-shrink-0"
                          />
                          <div className="flex flex-col gap-1.5 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-400/20 border border-amber-300/45 text-amber-300">
                                <Star size={11} className="fill-current" />
                                {detailedItem.rating?.toFixed(1) || "8.2"}
                              </span>
                              <span className="text-xs font-bold text-white/85">{detailedItem.year || "2024"}</span>
                              <span className="border border-white/25 bg-white/10 px-2 py-0.5 rounded-full text-[10px] font-bold text-white/90">
                                {detailedItem.mediaType === 'movie' ? "PG-13" : "TV-MA"}
                              </span>
                              <span className="text-xs text-white/75 font-medium">
                                {detailedItem.mediaType === 'movie'
                                  ? detailedItem.runtime ? `${detailedItem.runtime}${t("movies.meta.minutes")}` : `148${t("movies.meta.minutes")}`
                                  : detailedItem.seasons ? `${detailedItem.seasons} ${t("movies.meta.seasons")}` : `5 ${t("movies.meta.seasons")}`}
                              </span>
                              {detailedItem.mediaType === 'tv' && detailedItem.episodes && (
                                <span className="text-xs text-white/75 font-medium">
                                  • {detailedItem.episodes} {t("movies.meta.episodes")}
                                </span>
                              )}
                            </div>
                            <h3 className="text-xl sm:text-3xl font-black text-white select-text truncate drop-shadow-md">
                              {detailedItem.title}
                            </h3>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Top Floating Controls inside Modal Hero */}
                  <div className="absolute top-3.5 inset-x-4 flex items-center justify-between gap-2 z-20 pointer-events-none">
                    <div className="pointer-events-auto">
                      {detailedItem.trailerKey && (
                        <button
                          type="button"
                          onClick={() => setShowHeroTrailer((v) => !v)}
                          className="lg-cinema-action-pill px-3.5 py-1.5 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
                        >
                          <Film size={13} />
                          <span>
                            {showHeroTrailer
                              ? (currentLang === "ar" ? "إغلاق التريلر" : "Hide Trailer")
                              : (currentLang === "ar" ? "تشغيل التريلر" : "Watch Trailer")}
                          </span>
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedItemId(null)}
                      className="lg-cinema-icon-pill pointer-events-auto hover:!bg-rose-600/45 hover:!border-rose-300/60"
                      aria-label={currentLang === "ar" ? "إغلاق" : "Close"}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Scrollable Liquid Glass Body */}
                <div className="p-5 sm:p-7 flex flex-col gap-5 overflow-y-auto">
                  {/* Action Bar: Watch Now (In-App Stream) + Trailer Toggle + Account Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setSelectedWatchItem(detailedItem)}
                        className="lg-cinema-primary-pill py-2.5 px-6 text-white font-black flex items-center gap-2 cursor-pointer text-xs sm:text-sm"
                      >
                        <Play size={15} className="fill-current" />
                        <span>{t("movies.meta.watchNow") || (currentLang === "ar" ? "شاهد الآن" : "Watch Now")}</span>
                      </button>

                      {detailedItem.trailerKey && (
                        <button
                          type="button"
                          onClick={() => setShowHeroTrailer((v) => !v)}
                          className={`lg-cinema-action-pill py-2.5 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer ${
                            showHeroTrailer ? "!bg-white/25 !border-white/50 text-white" : "text-white/90"
                          }`}
                        >
                          <Film size={14} />
                          <span>
                            {showHeroTrailer
                              ? (currentLang === "ar" ? "عرض الملصق" : "Show Backdrop")
                              : (currentLang === "ar" ? "التريلر الرسمي" : "Official Trailer")}
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

                  {/* Overview */}
                  <p className="text-xs sm:text-sm text-white/85 leading-relaxed select-text">
                    {detailedItem.overview}
                  </p>

                  {/* Practical Trailer Card + Genres & Cast */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                    {/* Interactive Trailer Box (7 cols on desktop) */}
                    <div className="md:col-span-7 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[11px] font-bold text-white/60 uppercase tracking-widest">
                          {currentLang === "ar" ? "الإعلان التشويقي (التريلر)" : "Official Trailer"}
                        </h4>
                        {detailedItem.trailerKey && !showHeroTrailer && (
                          <button
                            type="button"
                            onClick={() => setShowHeroTrailer(true)}
                            className="text-[11px] font-bold text-rose-300 hover:text-rose-200 cursor-pointer"
                          >
                            {currentLang === "ar" ? "تكبير في الأعلى ↗" : "Expand to Top Stage ↗"}
                          </button>
                        )}
                      </div>

                      {detailedItem.trailerKey ? (
                        <div className="w-full aspect-video rounded-2xl overflow-hidden border border-white/20 bg-black shadow-[0_12px_30px_rgba(0,0,0,0.5)]">
                          <iframe
                            className="w-full h-full border-0"
                            src={`https://www.youtube.com/embed/${detailedItem.trailerKey}?autoplay=0&rel=0&modestbranding=1`}
                            title="Cinema Trailer"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                            allowFullScreen
                          />
                        </div>
                      ) : (
                        <div className="w-full aspect-video rounded-2xl border border-white/15 flex items-center justify-center text-white/50 text-xs font-semibold bg-white/[0.04]">
                          {t("movies.meta.noTrailer")}
                        </div>
                      )}
                    </div>

                    {/* Genres & Cast (5 cols on desktop) */}
                    <div className="md:col-span-5 flex flex-col gap-4 p-4 rounded-2xl bg-white/[0.04] border border-white/12">
                      <div>
                        <h4 className="text-[11px] font-bold text-white/60 uppercase tracking-widest mb-2">
                          {t("movies.genres")}
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {detailedItem.genreNames.map((g, i) => (
                            <span
                              key={i}
                              className="text-[11px] font-bold px-3 py-1 bg-white/10 border border-white/20 rounded-full text-white/90"
                            >
                              {g}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-[11px] font-bold text-white/60 uppercase tracking-widest mb-2">
                          {t("movies.cast")}
                        </h4>
                        <div className="grid grid-cols-2 gap-2.5">
                          {detailedItem.cast.slice(0, 6).map((actor, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2.5 p-1.5 rounded-xl bg-white/[0.04] border border-white/10"
                            >
                              <div className="w-9 h-9 rounded-full bg-white/10 overflow-hidden border border-white/20 flex-shrink-0">
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
                                <span className="text-[11px] font-bold text-white/90 truncate">{actor.name}</span>
                                {actor.character && (
                                  <span className="text-[9.5px] text-white/55 truncate">{actor.character}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </m.div>
            )}
          </div>
        )}
      </AnimatePresence>

      <MovieSourcesModal
        isOpen={selectedWatchItem !== null}
        onClose={() => setSelectedWatchItem(null)}
        item={selectedWatchItem}
      />
    </div>,
    document.body
  );
}
