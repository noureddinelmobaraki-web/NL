import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Search, Volume2, VolumeX, Play, Info, ChevronLeft, ChevronRight, Star, Film, Tv, Heart, Eye, Bookmark } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
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
    if (lang === 'ar') rawOverview = "القصة غير متوفرة حالياً.";
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

const getBackdropSrc_static = (path: string | null | undefined) => {
  if (!path) return "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1600";
  if (path.startsWith("http")) return path;
  return `${TMDB_IMAGE_BASE}/original${path}`;
};

const getPosterSrc_static = (path: string | null | undefined) => {
  if (!path) return "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500";
  if (path.startsWith("http")) return path;
  return `${TMDB_IMAGE_BASE}/w342${path}`;
};

const MOVIE_ROW_SCROLL_STYLE: React.CSSProperties = { scrollbarWidth: "none", msOverflowStyle: "none", scrollSnapType: "x mandatory" };

const MoviePosterCard = React.memo(({ 
  item, isTouch, activeHoverId, setActiveHoverId, hoverTimer, setSelectedItemId, t, isFavorite 
}: { 
  item: CinemaItem, isTouch: boolean, activeHoverId: number | null, 
  setActiveHoverId: (id: number | null) => void, hoverTimer: React.MutableRefObject<any>, 
  setSelectedItemId: (id: number | null) => void, t: any, isFavorite?: boolean 
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
    }, 350);
  }, [isTouch, hoverTimer, setActiveHoverId]);

  useEffect(() => {
    if (activeHoverId !== item.id) { setHovered(false); }
  }, [activeHoverId, item.id]);

  const fallbackGenText = item.genreNames.slice(0, 2).join(" · ") || "Drama";

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
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setSelectedItemId(item.id);
        }
      }}
      className="nl-poster relative w-[110px] sm:w-[150px] md:w-[170px] aspect-[2/3] rounded-md overflow-hidden bg-neutral-900 border border-zinc-800 hover:border-red-600 focus-visible:outline-none focus-visible:border-red-500 focus-visible:ring-2 focus-visible:ring-red-500 cursor-pointer select-none transition shadow hover:shadow-red-900/50 hover:shadow-lg active:scale-95 flex-shrink-0 snap-start"
    >
      {isFavorite && (
        <span
          className="absolute top-1.5 left-1.5 z-10 flex items-center justify-center w-5 h-5 rounded-full bg-red-600 shadow-sm"
          aria-label="Favorited"
        >
          <Heart size={10} strokeWidth={2.5} fill="white" color="white" />
        </span>
      )}
      <img
        src={getPosterSrc_static(item.posterPath)}
        alt={item.title}
        loading="lazy"
        decoding="async"
        onError={(e) => {
          const el = e.currentTarget;
          if (item.trailerKey && !el.dataset.fb) {
            el.dataset.fb = '1';
            el.src = `https://i.ytimg.com/vi/${item.trailerKey}/hqdefault.jpg`;
          }
        }}
        className="w-full h-full object-cover select-none pointer-events-none"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-0 hover:opacity-100 transition-opacity flex flex-col justify-end p-2.5">
        <p className="text-[10px] sm:text-xs font-black text-zinc-100 truncate">{item.title}</p>
        <div className="flex items-center gap-2 text-[8px] sm:text-[9px] text-zinc-300 font-medium">
          <span className="flex items-center gap-0.5 text-amber-500 font-bold">
            <Star size={8} className="fill-current" />
            {item.rating?.toFixed(1) || "8.1"}
          </span>
          <span>{item.year || "2024"}</span>
        </div>
      </div>

      <AnimatePresence>
        {hovered && activeHoverId === item.id && !isTouch && (
          <motion.div
            layoutId={`cinema-hover-${item.id}`}
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1.05, y: -6 }}
            exit={{ opacity: 0, scale: 0.94, y: 5 }}
            transition={{ type: "spring", stiffness: 350, damping: 24 }}
            className="absolute z-50 bottom-[30px] -left-6 w-[200px] sm:w-[230px] rounded-xl overflow-hidden bg-neutral-950 border border-zinc-700 shadow-2xl pointer-events-auto"
          >
            <div className="relative aspect-video w-full bg-black">
              <img src={getBackdropSrc_static(item.backdropPath)} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 to-transparent" />
            </div>
            <div className="p-3 flex flex-col gap-1.5 bg-neutral-950">
              <h4 className="text-xs font-black text-zinc-100 line-clamp-1">{item.title}</h4>
              <div className="flex items-center gap-2 text-[9px] text-zinc-400 font-mono">
                <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                  <Star size={10} className="fill-current" />
                  {item.rating?.toFixed(1) || "8.1"}
                </span>
                <span>{item.year || "2024"}</span>
                <span className="border border-zinc-700 px-1 rounded text-[8px] text-zinc-300">
                  {item.mediaType === 'movie' ? "PG-13" : "TV-14"}
                </span>
              </div>
              <p className="text-[10px] text-zinc-300 line-clamp-2 leading-relaxed">{item.overview}</p>
              <div className="flex items-center justify-between gap-2 mt-1">
                <span className="text-[8px] font-extrabold text-zinc-500 tracking-wider truncate">{fallbackGenText}</span>
                <span className="text-[9px] font-black text-red-500 hover:text-red-400 flex items-center gap-0.5">
                  {t("movies.meta.moreInfo")} →
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

const MovieRow = React.memo(({ title, items, isTouch, activeHoverId, setActiveHoverId, hoverTimer, setSelectedItemId, t, isFavoriteFn }: any) => {
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = useCallback(() => {
    if (!sliderRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
  }, []);

  const handleScrollClick = useCallback((direction: "left" | "right") => {
    if (!sliderRef.current) return;
    const { clientWidth } = sliderRef.current;
    const scrollAmt = direction === "left" ? -clientWidth * 0.75 : clientWidth * 0.75;
    sliderRef.current.scrollBy({ left: scrollAmt, behavior: "smooth" });
  }, []);

  const [isVisible, setIsVisible] = useState(false);
  const rowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "200px" });
    if (rowRef.current) observer.observe(rowRef.current);
    return () => observer.disconnect();
  }, []);

  if (items.length === 0) return null;

  return (
    <div ref={rowRef} className="relative z-10 flex flex-col gap-2 py-3 px-4 sm:px-10 overflow-hidden">
      <h2 className="text-sm sm:text-lg font-bold text-zinc-100 tracking-wide uppercase px-2">{title}</h2>
      <div className="group/row relative w-full overflow-hidden">
        {canScrollLeft && !isTouch && (
          <button onClick={() => handleScrollClick("left")} className="absolute left-0 top-0 bottom-0 z-30 w-10 flex items-center justify-center bg-black/60 opacity-0 group-hover/row:opacity-100 transition-opacity text-white cursor-pointer">
            <ChevronLeft size={28} />
          </button>
        )}
        <div
          ref={sliderRef}
          onScroll={updateScrollState}
          className="nl-cinema-row flex gap-4 overflow-x-auto select-none py-4 px-2 scroll-smooth scrollbar-none snap-x snap-mandatory"
          style={MOVIE_ROW_SCROLL_STYLE}
        >
          {isVisible && items.map((item: any, index: number) => {
            const isFirst = index === 0;
            const isLast = index === items.length - 1;
            return (
              <div key={item.id} className="flex-shrink-0 snap-start" style={{ transformOrigin: isFirst ? "left" : isLast ? "right" : "center" }}>
                <MoviePosterCard 
                  item={item} 
                  isTouch={isTouch} 
                  activeHoverId={activeHoverId} 
                  setActiveHoverId={setActiveHoverId} 
                  hoverTimer={hoverTimer} 
                  setSelectedItemId={setSelectedItemId} 
                  t={t} 
                  isFavorite={isFavoriteFn?.(item.id, item.mediaType)}
                />
              </div>
            );
          })}
        </div>
        {canScrollRight && !isTouch && (
          <button onClick={() => handleScrollClick("right")} className="absolute right-0 top-0 bottom-0 z-30 w-10 flex items-center justify-center bg-black/60 opacity-0 group-hover/row:opacity-100 transition-opacity text-white cursor-pointer">
            <ChevronRight size={28} />
          </button>
        )}
      </div>
    </div>
  );
});

export function MoviesPage({ onClose, initialTab = 'movies' }: { onClose: () => void; initialTab?: 'movies' | 'series' }) {
  const { t, i18n } = useTranslation();
  const { isMobile, isTablet } = useDeviceType();
  const { setMovieActive, registerMovieBack } = useAppContext();
  const isTouch = isMobile || isTablet;
  const currentLang = normLang(i18n.resolvedLanguage || i18n.language);

  const { user } = useAuth();
  const { has, toggle } = useMovieItems();

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

  // Filtering / Search
  const [selectedGenreId, setSelectedGenreId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CinemaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Slideshow / Modal
  useDocumentMeta("movies.title", "movies.description");

  const [heroIndex, setHeroIndex] = useState(0);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [detailedItem, setDetailedItem] = useState<CinemaItem | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [selectedWatchItem, setSelectedWatchItem] = useState<CinemaItem | null>(null);
  const [activeHoverId, setActiveHoverId] = useState<number | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const detailDialogRef = useFocusTrap(selectedItemId !== null && !!detailedItem);

  useEffect(() => {
    if (selectedItemId === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedItemId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedItemId]);

  const rowProps = useMemo(() => ({
    isTouch, activeHoverId, setActiveHoverId, hoverTimer, setSelectedItemId, t,
    isFavoriteFn: (id: number, mediaType: 'movie' | 'tv') => has(id, mediaType, 'favorite')
  }), [isTouch, activeHoverId, setActiveHoverId, hoverTimer, setSelectedItemId, t, has]);

  const isOpenForAudio = Boolean(detailedItem || selectedItemId);
  const { isMuted, toggleMute } = useMoviesMusic(isOpenForAudio);

  const tmdbKey = import.meta.env.VITE_TMDB_API_KEY || PUBLIC_TMDB_KEY;
  const omdbKey = import.meta.env.VITE_OMDB_API_KEY || PUBLIC_OMDB_KEY;

  const [scrolled, setScrolled] = useState(false);
  const mainScrollRef = useRef<HTMLDivElement | null>(null);

  const handleScrollEvent = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrolled(e.currentTarget.scrollTop > 50);
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
        setDetailedItem(normalizeItem(match, mediaType, currentLang));
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
          setDetailedItem({
            ...normalized,
            rating: imdbRating !== "N/A" ? parseFloat(imdbRating) : normalized.rating || 8.1
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

  return createPortal(
    <div dir={currentLang === "ar" ? "rtl" : "ltr"} className="nl-cinema-root fixed inset-0 z-[9500] w-full h-[100dvh] bg-gradient-to-b from-[#141414] via-[#101010] to-[#0a0a0a] text-zinc-100 font-sans overflow-hidden select-none pointer-events-auto">
      <div className="absolute inset-0 z-10 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(20,20,20,1) 0%, rgba(20,20,20,0.68) 45%, rgba(20,20,20,0.88) 100%)" }} />

      {isTouch && (
        <button
          onClick={() => { selectedItemId !== null ? setSelectedItemId(null) : onClose(); }}
          className="nl-cinema-back"
          aria-label={currentLang === "ar" ? "رجوع" : "Back"}
        >
          <ChevronLeft size={22} />
        </button>
      )}

      <div ref={mainScrollRef} onScroll={handleScrollEvent} className="nl-cinema-scroll absolute inset-0 z-20 overflow-y-auto h-full w-full scrollbar-none" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
        <header className={`nl-cinema-header fixed top-0 inset-x-0 z-50 flex items-center justify-between px-4 sm:px-8 py-3.5 transition-all duration-300 ${scrolled ? "aero-glass-style" : "bg-transparent"}`}>
          <div className="flex items-center gap-4 sm:gap-8">
            <h1 className="text-lg sm:text-2xl font-black tracking-tighter text-red-600 bg-gradient-to-r from-red-600 via-rose-500 to-red-700 bg-clip-text text-transparent select-none">
              <NLLogo />
            </h1>
            <div className="flex bg-zinc-950/45 rounded-full p-1 border border-white/10 backdrop-blur-md shadow-inner scale-90 sm:scale-100">
              <button onClick={() => setActiveTab('movies')} className={`px-3 py-1 text-[11px] sm:text-xs font-black rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'movies' ? 'bg-red-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'}`}>
                <Film size={12} />
                <span>{currentLang === "ar" ? "أفلام" : "Movies"}</span>
              </button>
              <button onClick={() => setActiveTab('series')} className={`px-3 py-1 text-[11px] sm:text-xs font-black rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'series' ? 'bg-red-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'}`}>
                <Tv size={12} />
                <span>{currentLang === "ar" ? "مسلسلات" : "Series"}</span>
              </button>
            </div>

            {!isMobile && (
              <nav className="flex gap-2">
                <button onClick={() => setSelectedGenreId(null)} className={`text-[11px] font-bold px-2 py-0.5 rounded transition-colors cursor-pointer ${selectedGenreId === null ? "text-white bg-red-600/90" : "text-zinc-400 hover:text-white"}`}>
                  {t("movies.all") || "All"}
                </button>
                {activeGenres.slice(0, 5).map(g => (
                  <button key={g.id} onClick={() => setSelectedGenreId(g.id)} className={`text-[11px] font-bold px-2 py-0.5 rounded transition-colors cursor-pointer ${selectedGenreId === g.id ? "text-white bg-red-600/90" : "text-zinc-400 hover:text-white"}`}>
                    {g.name}
                  </button>
                ))}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex items-center">
              {isTouch ? (
                <div className="flex items-center gap-2">
                  <input
                    type="search"
                    placeholder={activeTab === 'movies' ? t("movies.search") || "Search..." : t("series.search") || "Search series..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    dir="auto"
                    className="w-28 sm:w-44 px-3 py-1 bg-zinc-900/95 border border-zinc-700/80 text-white rounded text-xs focus:outline-none focus:border-red-600 transition"
                  />
                </div>
              ) : (
                <div className="flex items-center">
                  <motion.div animate={{ width: searchOpen ? "200px" : "0px" }} transition={{ ease: "easeOut", duration: 0.25 }} className="overflow-hidden">
                    <input
                      type="search"
                      placeholder={activeTab === 'movies' ? t("movies.search") || "Search..." : t("series.search") || "Search..."}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="px-3 py-1 bg-zinc-900/90 border border-zinc-700 border-r-0 text-white rounded-l text-xs outline-none focus:ring-1 focus:ring-red-600 tracking-tight"
                    />
                  </motion.div>
                  <button onClick={() => setSearchOpen(!searchOpen)} className="p-1.5 rounded-r bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white cursor-pointer">
                    <Search size={14} />
                  </button>
                </div>
              )}
            </div>

            <button onClick={toggleMute} className="p-2 rounded bg-neutral-900/80 border border-zinc-800 hover:bg-neutral-800 transition text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer" style={{ width: "34px", height: "34px" }}>
              {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>

            <button onClick={onClose} className="p-2 rounded-full bg-neutral-900 hover:bg-red-600 transition text-zinc-300 hover:text-white flex items-center justify-center border border-zinc-800 hover:border-red-600 cursor-pointer" style={{ width: "34px", height: "34px" }}>
              <X size={16} />
            </button>
          </div>
        </header>

        {isMobile && activeGenres.length > 0 && (
          <div className="px-4 overflow-x-auto select-none overflow-y-hidden flex gap-2 scrollbar-none py-1" style={{ marginTop: "calc(var(--cinema-header-h) + env(safe-area-inset-top) + 8px)" }}>
            <button onClick={() => setSelectedGenreId(null)} className={`text-[10px] font-bold px-3 py-1 flex-shrink-0 rounded-full transition-colors cursor-pointer ${selectedGenreId === null ? "text-white bg-red-600" : "text-zinc-400 bg-zinc-900/80 border border-zinc-800"}`}>
              {t("movies.all") || "All"}
            </button>
            {activeGenres.map(g => (
              <button key={g.id} onClick={() => setSelectedGenreId(g.id)} className={`text-[10px] font-bold px-3 py-1 flex-shrink-0 rounded-full transition-colors cursor-pointer ${selectedGenreId === g.id ? "text-white bg-red-600" : "text-zinc-400 bg-zinc-900/80 border border-zinc-800"}`}>
                {g.name}
              </button>
            ))}
          </div>
        )}

        {searchQuery.trim() !== "" || selectedGenreId !== null ? (
          <main className="pt-24 px-4 sm:px-10 pb-20">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => { setSearchQuery(""); setSelectedGenreId(null); }} className="p-1 px-3 bg-zinc-800/80 border border-zinc-700 text-xs rounded hover:bg-zinc-700 cursor-pointer">
                ← {t("movies.back") || "Back"}
              </button>
              <div className="text-md sm:text-xl font-black">
                {selectedGenreId
                  ? `${t("movies.genres") || "Category"}: ${activeGenres.find(g => g.id === selectedGenreId)?.name || ""}`
                  : `${t("movies.search") || "Search results"}: "${searchQuery}"`}
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-6">
              {(searchQuery ? searchResults : filteredList).map((item) => (
                <div key={item.id} className="flex justify-center">
                  <MoviePosterCard item={item} {...rowProps} isFavorite={rowProps.isFavoriteFn?.(item.id, item.mediaType)} />
                </div>
              ))}
            </div>

            {(searchQuery ? searchResults : filteredList).length === 0 && !isSearching && (
              <div className="w-full py-20 text-center text-zinc-500 font-medium">
                {t("movies.noResults") || (currentLang === "ar" ? "لا توجد نتائج مطابقة." : "No matching titles found.")}
              </div>
            )}
          </main>
        ) : (
          <>
            {activeHeroItem && (
              <section className="relative flex flex-col justify-end w-full pb-8 sm:pb-16 px-6 sm:px-16" style={{ height: isMobile ? "52vh" : "78vh" }}>
                <div className="absolute inset-0 z-0">
                  <img src={getBackdropSrc_static(activeHeroItem.backdropPath)} alt="" className="w-full h-full object-cover select-none pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/30 to-black/35" />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-transparent to-transparent " />
                </div>

                <div className="relative z-10 flex flex-col max-w-xl text-zinc-100 gap-3">
                  <h2 className="text-xl sm:text-[36px] font-black leading-tight tracking-tight select-text">{localizedHeroTitle}</h2>
                  <div className="flex items-center gap-3 text-xs text-zinc-300 font-mono">
                    <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                      <Star size={11} className="fill-current" />
                      {activeHeroItem.rating?.toFixed(1) || "8.1"}
                    </span>
                    <span>{activeHeroItem.year || "2024"}</span>
                    <span className="border border-white/35 px-1 rounded text-[9px]">
                      {activeHeroItem.mediaType === 'movie' ? "PG-13" : "TV-MA"}
                    </span>
                    <span>
                      {activeHeroItem.mediaType === 'movie'
                        ? activeHeroItem.runtime ? `${activeHeroItem.runtime}${t("movies.meta.minutes")}` : `148${t("movies.meta.minutes")}`
                        : activeHeroItem.seasons ? `${activeHeroItem.seasons} ${t("movies.meta.seasons")}` : `5 ${t("movies.meta.seasons")}`}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-neutral-300 tracking-wide leading-relaxed line-clamp-2 select-text max-h-[3.6rem] overflow-hidden">{activeHeroItem.overview}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <button onClick={() => setSelectedItemId(activeHeroItem.id)} className="py-2 px-5 bg-white text-zinc-950 font-black rounded-md flex items-center gap-1.5 hover:bg-neutral-200 transition text-xs sm:text-sm cursor-pointer shadow hover:scale-105">
                      <Play size={14} className="fill-current" />
                      <span>{t("movies.meta.watchNow")}</span>
                    </button>
                    <button onClick={() => setSelectedItemId(activeHeroItem.id)} className="py-2 px-4 bg-zinc-700/60 text-zinc-100 font-bold rounded-md flex items-center gap-1.5 hover:bg-zinc-600 transition text-xs sm:text-sm cursor-pointer">
                      <Info size={14} />
                      <span>{t("movies.meta.moreInfo")}</span>
                    </button>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'movies' ? (
              globalError && trendingMovies.length === 0 ? (
                <div className="w-full py-20 flex flex-col items-center gap-4 text-center">
                  <p className="text-zinc-500 font-medium">{t("movies.meta.errorLoad")}</p>
                  <button onClick={() => window.location.reload()} className="px-5 py-2 bg-zinc-800 hover:bg-red-600 rounded-md text-white font-bold text-sm transition transition-all duration-300">
                    ↻
                  </button>
                </div>
              ) : moviesLoading ? (
                <div className="relative pb-24 -mt-4 bg-[#141414]">
                  {[1, 2, 3, 4, 5].map((idx) => (
                    <div key={idx} className="relative z-10 flex flex-col gap-2 py-3 px-4 sm:px-10 overflow-hidden">
                      <div className="h-4 sm:h-6 w-32 bg-zinc-800 animate-pulse rounded px-2" />
                      <div className="flex gap-4 overflow-x-hidden py-4 px-2">
                        {[1, 2, 3, 4, 5, 6].map((idx2) => (
                          <div key={idx2} className="relative w-[110px] sm:w-[150px] md:w-[170px] aspect-[2/3] rounded-md overflow-hidden bg-zinc-900 border border-zinc-800 animate-pulse flex-shrink-0 nl-skeleton-card" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="relative pb-24 -mt-4 bg-[#141414]">
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
                  <p className="text-zinc-500 font-medium">{t("movies.meta.errorLoad")}</p>
                  <button onClick={() => window.location.reload()} className="px-5 py-2 bg-zinc-800 hover:bg-red-600 rounded-md text-white font-bold text-sm transition transition-all duration-300">
                    ↻
                  </button>
                </div>
              ) : seriesLoading ? (
                <div className="relative pb-24 -mt-4 bg-[#141414]">
                  {[1, 2, 3, 4, 5].map((idx) => (
                    <div key={idx} className="relative z-10 flex flex-col gap-2 py-3 px-4 sm:px-10 overflow-hidden">
                      <div className="h-4 sm:h-6 w-32 bg-zinc-800 animate-pulse rounded px-2" />
                      <div className="flex gap-4 overflow-x-hidden py-4 px-2">
                        {[1, 2, 3, 4, 5, 6].map((idx2) => (
                          <div key={idx2} className="relative w-[110px] sm:w-[150px] md:w-[170px] aspect-[2/3] rounded-md overflow-hidden bg-zinc-900 border border-zinc-800 animate-pulse flex-shrink-0 nl-skeleton-card" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="relative pb-24 -mt-4 bg-[#141414]">
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

      <AnimatePresence>
        {selectedItemId !== null && detailedItem && (
          <div className="nl-detail-wrap fixed inset-0 z-[7000] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/85 backdrop-blur-sm">
            <div onClick={() => setSelectedItemId(null)} className="absolute inset-0 z-0 cursor-zoom-out" />
            {isLoadingDetails ? (
              <div className="relative z-10 flex flex-col items-center gap-3 text-red-600">
                <div className="w-12 h-12 border-4 border-t-red-600 border-zinc-800 rounded-full animate-spin" />
                <p className="text-zinc-400 text-xs font-mono">{t("movies.meta.resolving")}</p>
              </div>
            ) : (
              <motion.div
                ref={detailDialogRef}
                role="dialog"
                aria-modal="true"
                aria-label={detailedItem.title}
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.25 }}
                className="nl-detail-card relative aero-glass-style w-full max-w-3xl rounded-2xl z-10"
              >
                <div className="relative aspect-video w-full bg-black">
                  <img src={getBackdropSrc_static(detailedItem.backdropPath)} alt="" className="w-full h-full object-cover opacity-85" />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-black/30" />
                  <button onClick={() => setSelectedItemId(null)} className="absolute top-4 right-4 p-2 bg-neutral-900/80 hover:bg-red-600 transition rounded-full text-white cursor-pointer">
                    <X size={16} />
                  </button>
                </div>

                <div className="p-6 md:p-8 flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-xl sm:text-2xl font-black text-zinc-100 select-text">{detailedItem.title}</h3>
                    <button
                      onClick={() => setSelectedWatchItem(detailedItem)}
                      className="py-1.5 px-5 sm:py-2 sm:px-6 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black rounded-md flex items-center gap-1.5 border border-red-500 shadow-lg cursor-pointer transition text-xs sm:text-sm"
                    >
                      <Play size={14} className="fill-current" />
                      <span>{t("movies.meta.watchNow")}</span>
                    </button>
                  </div>

                  {user && detailedItem && (
                    <div className="flex items-center gap-2 mt-1">
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
                          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
                          'text-xs font-semibold border transition-all duration-200 cursor-pointer',
                          has(detailedItem.id, detailedItem.mediaType, 'favorite')
                            ? 'bg-red-600 border-red-500 text-white shadow-md shadow-red-900/30'
                            : 'bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:border-red-500 hover:text-red-400',
                        ].join(' ')}
                      >
                        <Heart
                          size={13}
                          strokeWidth={2}
                          fill={has(detailedItem.id, detailedItem.mediaType, 'favorite') ? 'currentColor' : 'none'}
                        />
                        <span>مفضلة</span>
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
                          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
                          'text-xs font-semibold border transition-all duration-200 cursor-pointer',
                          has(detailedItem.id, detailedItem.mediaType, 'watched')
                            ? 'bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-900/30'
                            : 'bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:border-emerald-500 hover:text-emerald-400',
                        ].join(' ')}
                      >
                        <Eye
                          size={13}
                          strokeWidth={2}
                          fill={has(detailedItem.id, detailedItem.mediaType, 'watched') ? 'currentColor' : 'none'}
                        />
                        <span>شاهدته</span>
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
                          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
                          'text-xs font-semibold border transition-all duration-200 cursor-pointer',
                          has(detailedItem.id, detailedItem.mediaType, 'watchlist')
                            ? 'bg-amber-500 border-amber-400 text-white shadow-md shadow-amber-900/30'
                            : 'bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:border-amber-500 hover:text-amber-400',
                        ].join(' ')}
                      >
                        <Bookmark
                          size={13}
                          strokeWidth={2}
                          fill={has(detailedItem.id, detailedItem.mediaType, 'watchlist') ? 'currentColor' : 'none'}
                        />
                        <span>سأشاهده</span>
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
                    <span className="flex items-center gap-0.5 text-amber-500 font-extrabold">
                      <Star size={12} className="fill-current" />
                      {detailedItem.rating?.toFixed(1) || "8.2"}
                    </span>
                    <span>{detailedItem.year || "2024"}</span>
                    <span className="border border-zinc-700 px-1.5 rounded text-[10px] text-zinc-300 font-bold">
                      {detailedItem.mediaType === 'movie' ? "PG-13" : "TV-MA"}
                    </span>
                    <span>
                      {detailedItem.mediaType === 'movie'
                        ? detailedItem.runtime ? `${detailedItem.runtime}${t("movies.meta.minutes")}` : `148${t("movies.meta.minutes")}`
                        : detailedItem.seasons ? `${detailedItem.seasons} ${t("movies.meta.seasons")}` : `5 ${t("movies.meta.seasons")}`}
                    </span>
                    {detailedItem.mediaType === 'tv' && detailedItem.episodes && (
                      <span>{detailedItem.episodes} {t("movies.meta.episodes")}</span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed select-text mt-1 max-h-32 overflow-y-auto pr-1">{detailedItem.overview}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    {detailedItem.trailerKey ? (
                      <div className="w-full aspect-video rounded-lg overflow-hidden border border-zinc-800 bg-black shadow-inner">
                        <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${detailedItem.trailerKey}?autoplay=0&muted=0`} title="Cinema Trailer" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                      </div>
                    ) : (
                      <div className="w-full aspect-video rounded-lg border border-zinc-800/60 flex items-center justify-center text-zinc-500 text-xs font-semibold bg-neutral-900/50">
                        {t("movies.meta.noTrailer")}
                      </div>
                    )}

                    <div className="flex flex-col gap-3">
                      <div>
                        <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">{t("movies.genres")}</h4>
                        <div className="flex flex-wrap gap-1">
                          {detailedItem.genreNames.map((g, i) => (
                            <span key={i} className="text-[10px] font-black px-2.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded">{g}</span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">{t("movies.cast")}</h4>
                        <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none">
                          {detailedItem.cast.slice(0, 4).map((actor, idx) => (
                            <div key={idx} className="flex flex-col items-center gap-1 text-center min-w-[55px] max-w-[65px] flex-shrink-0">
                              <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden border border-zinc-700">
                                {actor.profilePath ? (
                                  <img src={actor.profilePath.startsWith("http") ? actor.profilePath : `${TMDB_IMAGE_BASE}/w185${actor.profilePath}`} className="w-full h-full object-cover select-none pointer-events-none" alt="" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500">👤</div>
                                )}
                              </div>
                              <span className="text-[7.5px] font-medium text-zinc-400 truncate w-full">{actor.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
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
