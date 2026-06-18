import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Search, Volume2, VolumeX, Play, Info, ChevronLeft, ChevronRight, Star, Film, Tv } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { useAppContext } from "../../context/AppContext";
import { useDeviceType } from "../../hooks/useDeviceType";
import { useMoviesMusic } from "./useMoviesMusic";
import { FALLBACK_MOVIES, FALLBACK_GENRES } from "./CuratedFallback";
import { FALLBACK_SERIES, FALLBACK_SERIES_GENRES } from "../Series/CuratedFallback";
import { CinemaBackButton } from "./CinemaBackButton";
import { fetchWithCache } from "./tmdbCache";
import "../../styles/components/cinema.css";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";
const PLAYBACK_BASE = import.meta.env.VITE_PLAYBACK_BASE_URL || "";

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

const pick = (v: any, lang: string): string =>
  typeof v === 'string' ? v : (v?.[lang] || v?.en || '');

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
  return {
    id: raw.id,
    mediaType,
    title: pick(isTv ? (raw.name ?? raw.title) : (raw.title ?? raw.name), lang),
    overview: pick(raw.overview, lang),
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

// ===== MODULE SCOPE COMPONENTS (React.memo) =====

type CardProps = {
  item: CinemaItem;
  isTouch: boolean;
  isActiveHover: boolean;
  onHover: (id: number | null) => void;
  onSelect: (id: number) => void;
  getPosterSrc: (p?: string | null) => string;
  getBackdropSrc: (p?: string | null) => string;
  moreLabel: string;
};

const MoviePosterCard = React.memo(function MoviePosterCard({
  item, isTouch, isActiveHover, onHover, onSelect, getPosterSrc, getBackdropSrc, moreLabel,
}: CardProps) {
  const [hovered, setHovered] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isActiveHover) {
      setHovered(false);
    }
  }, [isActiveHover]);

  useEffect(() => {
    return () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    };
  }, []);

  const handleMouseEnter = () => {
    if (isTouch) return;
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setHovered(true);
    onHover(item.id);
  };

  const handleMouseLeave = () => {
    if (isTouch) return;
    hoverTimer.current = setTimeout(() => {
      setHovered(false);
      onHover(null);
    }, 350);
  };

  const fallbackGenText = item.genreNames.slice(0, 2).join(" · ") || "Drama";

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => onSelect(item.id)}
      className="relative aspect-[2/3] rounded-md overflow-hidden bg-neutral-900 border border-zinc-800 hover:border-red-600 cursor-pointer select-none transition shadow hover:shadow-red-900/50 hover:shadow-lg active:scale-95 flex-shrink-0 snap-start nl-poster-card"
    >
      <img
        src={getPosterSrc(item.posterPath)}
        alt=""
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
        {hovered && isActiveHover && !isTouch && (
          <motion.div
            layoutId={`cinema-hover-${item.id}`}
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1.05, y: -6 }}
            exit={{ opacity: 0, scale: 0.94, y: 5 }}
            transition={{ type: "spring", stiffness: 350, damping: 24 }}
            className="absolute z-50 bottom-[30px] -left-6 w-[200px] sm:w-[230px] rounded-xl overflow-hidden bg-neutral-950 border border-zinc-700 shadow-2xl pointer-events-auto"
          >
            <div className="relative aspect-video w-full bg-black">
              <img src={getBackdropSrc(item.backdropPath)} alt="" className="w-full h-full object-cover" />
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
                <span 
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(item.id);
                  }}
                  className="text-[9px] font-black text-red-500 hover:text-red-400 flex items-center gap-0.5"
                >
                  {moreLabel} →
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

type RowProps = {
  title: string;
  items: CinemaItem[];
  isTouch: boolean;
  isRTL: boolean;
  card: (item: CinemaItem) => React.ReactNode;
};

const MovieRow = React.memo(function MovieRow({ title, items, isTouch, isRTL, card }: RowProps) {
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const rowRef = useRef<HTMLDivElement | null>(null);

  const updateScrollState = () => {
    if (!sliderRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
    if (isRTL) {
      const absScroll = Math.abs(scrollLeft);
      setCanScrollLeft(absScroll > 6);
      setCanScrollRight(absScroll + clientWidth < scrollWidth - 6);
    } else {
      setCanScrollLeft(scrollLeft > 6);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
    }
  };

  const handleScrollClick = (direction: "left" | "right") => {
    if (!sliderRef.current) return;
    const { clientWidth } = sliderRef.current;
    const scrollAmt = direction === "left" ? -clientWidth * 0.75 : clientWidth * 0.75;
    const adjustedAmt = isRTL ? -scrollAmt : scrollAmt;
    sliderRef.current.scrollBy({ left: adjustedAmt, behavior: "smooth" });
  };

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
          <button 
            onClick={() => handleScrollClick("left")} 
            className="absolute left-0 top-0 bottom-0 z-30 w-10 flex items-center justify-center bg-black/60 opacity-0 group-hover/row:opacity-100 transition-opacity text-white cursor-pointer animate-fade-in"
          >
            <ChevronLeft size={28} />
          </button>
        )}
        <div
          ref={sliderRef}
          onScroll={updateScrollState}
          className="flex gap-4 overflow-x-auto select-none py-4 px-2 scroll-smooth scrollbar-none snap-x snap-mandatory nl-row-scroller"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none", scrollSnapType: "x mandatory" }}
        >
          {isVisible && items.map((item) => (
            <React.Fragment key={item.id}>
              {card(item)}
            </React.Fragment>
          ))}
        </div>
        {canScrollRight && !isTouch && (
          <button 
            onClick={() => handleScrollClick("right")} 
            className="absolute right-0 top-0 bottom-0 z-30 w-10 flex items-center justify-center bg-black/60 opacity-0 group-hover/row:opacity-100 transition-opacity text-white cursor-pointer animate-fade-in"
          >
            <ChevronRight size={28} />
          </button>
        )}
      </div>
    </div>
  );
});

// ===== MAIN PAGE ENTRY =====

export function MoviesPage({ onClose, initialTab = 'movies' }: { onClose: () => void; initialTab?: 'movies' | 'series' }) {
  const { t, i18n } = useTranslation();
  const { isMobile, isTablet } = useDeviceType();
  const { setMovieActive, registerMovieBack } = useAppContext();
  const isTouch = isMobile || isTablet;
  const currentLang = i18n.resolvedLanguage || i18n.language || "en";

  const [activeTab, setActiveTab] = useState<'movies' | 'series'>(initialTab);

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
  const [heroIndex, setHeroIndex] = useState(0);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [detailedItem, setDetailedItem] = useState<CinemaItem | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [activeHoverId, setActiveHoverId] = useState<number | null>(null);

  const isOpenForAudio = Boolean(detailedItem || selectedItemId);
  const { isMuted, toggleMute } = useMoviesMusic(isOpenForAudio);

  const tmdbKey = import.meta.env.VITE_TMDB_API_KEY || "";
  const omdbKey = import.meta.env.VITE_OMDB_API_KEY || "";

  const [scrolled, setScrolled] = useState(false);
  const mainScrollRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);

  const handleScrollEvent = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrolled(e.currentTarget.scrollTop > 50);
  }, []);

  // Measure Header Height for mobile spacing
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      document.documentElement.style.setProperty('--cinema-header-h', el.offsetHeight + 'px');
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Accessibility Focus Trap and Escape listener
  const lastActiveElement = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (selectedItemId === null || !detailedItem) return;

    lastActiveElement.current = document.activeElement as HTMLElement;
    setTimeout(() => {
      const focusable = modalRef.current?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex="0"]');
      if (focusable && focusable.length > 0) {
        focusable[0].focus();
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedItemId(null);
        setDetailedItem(null);
        return;
      }

      if (e.key === "Tab") {
        if (!modalRef.current) return;
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex="0"]'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (lastActiveElement.current) {
        lastActiveElement.current.focus();
      }
    };
  }, [selectedItemId, detailedItem]);

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

  // Load Movies with AbortController
  useEffect(() => {
    const ac = new AbortController();
    if (!tmdbKey) {
      setTrendingMovies(FALLBACK_MOVIES.map(r => normalizeItem(r, 'movie', currentLang)));
      setTopRatedMovies([...FALLBACK_MOVIES].reverse().map(r => normalizeItem(r, 'movie', currentLang)));
      setPopularMovies(FALLBACK_MOVIES.map(r => normalizeItem(r, 'movie', currentLang)));
      setActionMovies(FALLBACK_MOVIES.filter(m => m.genres.includes("Action")).map(r => normalizeItem(r, 'movie', currentLang)));
      setHorrorMovies(FALLBACK_MOVIES.filter(m => m.genres.includes("Horror")).map(r => normalizeItem(r, 'movie', currentLang)));
      setDramaMovies(FALLBACK_MOVIES.filter(m => m.genres.includes("Drama")).map(r => normalizeItem(r, 'movie', currentLang)));
      setSciFiMovies(FALLBACK_MOVIES.filter(m => m.genres.includes("Sci-Fi")).map(r => normalizeItem(r, 'movie', currentLang)));
      setMovieGenres(FALLBACK_GENRES.map(g => ({ id: g.id, name: g.name[currentLang as "en" | "ar" | "fr"] || g.name.en })));
      return;
    }

    const loadMovies = async () => {
      try {
        const langParam = `&language=${currentLang}`;
        const genresRes = await fetchWithCache(`${TMDB_BASE_URL}/genre/movie/list?api_key=${tmdbKey}${langParam}`, ac.signal);
        if (genresRes?.genres) setMovieGenres(genresRes.genres);

        const trendingRes = await fetchWithCache(`${TMDB_BASE_URL}/trending/movie/week?api_key=${tmdbKey}${langParam}`, ac.signal);
        if (trendingRes?.results) setTrendingMovies(trendingRes.results.map((r: any) => normalizeItem(r, 'movie', currentLang)));

        const ratedRes = await fetchWithCache(`${TMDB_BASE_URL}/movie/top_rated?api_key=${tmdbKey}${langParam}`, ac.signal);
        if (ratedRes?.results) setTopRatedMovies(ratedRes.results.map((r: any) => normalizeItem(r, 'movie', currentLang)));

        const popRes = await fetchWithCache(`${TMDB_BASE_URL}/movie/popular?api_key=${tmdbKey}${langParam}`, ac.signal);
        if (popRes?.results) setPopularMovies(popRes.results.map((r: any) => normalizeItem(r, 'movie', currentLang)));

        const actionRes = await fetchWithCache(`${TMDB_BASE_URL}/discover/movie?api_key=${tmdbKey}${langParam}&with_genres=28`, ac.signal);
        if (actionRes?.results) setActionMovies(actionRes.results.map((r: any) => normalizeItem(r, 'movie', currentLang)));

        const horrorRes = await fetchWithCache(`${TMDB_BASE_URL}/discover/movie?api_key=${tmdbKey}${langParam}&with_genres=27`, ac.signal);
        if (horrorRes?.results) setHorrorMovies(horrorRes.results.map((r: any) => normalizeItem(r, 'movie', currentLang)));

        const dramaRes = await fetchWithCache(`${TMDB_BASE_URL}/discover/movie?api_key=${tmdbKey}${langParam}&with_genres=18`, ac.signal);
        if (dramaRes?.results) setDramaMovies(dramaRes.results.map((r: any) => normalizeItem(r, 'movie', currentLang)));

        const scifiRes = await fetchWithCache(`${TMDB_BASE_URL}/discover/movie?api_key=${tmdbKey}${langParam}&with_genres=878`, ac.signal);
        if (scifiRes?.results) setSciFiMovies(scifiRes.results.map((r: any) => normalizeItem(r, 'movie', currentLang)));
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error("Failed to fetch TMDB Live movies:", err);
        }
      }
    };
    loadMovies();
    return () => { ac.abort(); };
  }, [tmdbKey, currentLang]);

  // Load Series with AbortController
  useEffect(() => {
    const ac = new AbortController();
    if (!tmdbKey) {
      setTrendingSeries(FALLBACK_SERIES.map(r => normalizeItem(r, 'tv', currentLang)));
      setTopRatedSeries([...FALLBACK_SERIES].reverse().map(r => normalizeItem(r, 'tv', currentLang)));
      setPopularSeries(FALLBACK_SERIES.map(r => normalizeItem(r, 'tv', currentLang)));
      setActionSeries(FALLBACK_SERIES.filter(s => s.genres.includes("Action") || s.genres.includes("Sci-Fi")).map(r => normalizeItem(r, 'tv', currentLang)));
      setMysterySeries(FALLBACK_SERIES.filter(s => s.genres.includes("Mystery")).map(r => normalizeItem(r, 'tv', currentLang)));
      setDramaSeries(FALLBACK_SERIES.filter(s => s.genres.includes("Drama")).map(r => normalizeItem(r, 'tv', currentLang)));
      setAnimationSeries(FALLBACK_SERIES.filter(s => s.genres.includes("Animation")).map(r => normalizeItem(r, 'tv', currentLang)));
      setSeriesGenres(FALLBACK_SERIES_GENRES.map(g => ({ id: g.id, name: g.name[currentLang as "en" | "ar" | "fr"] || g.name.en })));
      return;
    }

    const loadSeries = async () => {
      try {
        const langParam = `&language=${currentLang}`;
        const genresRes = await fetchWithCache(`${TMDB_BASE_URL}/genre/tv/list?api_key=${tmdbKey}${langParam}`, ac.signal);
        if (genresRes?.genres) setSeriesGenres(genresRes.genres);

        const trendingRes = await fetchWithCache(`${TMDB_BASE_URL}/trending/tv/week?api_key=${tmdbKey}${langParam}`, ac.signal);
        if (trendingRes?.results) setTrendingSeries(trendingRes.results.map((r: any) => normalizeItem(r, 'tv', currentLang)));

        const ratedRes = await fetchWithCache(`${TMDB_BASE_URL}/tv/top_rated?api_key=${tmdbKey}${langParam}`, ac.signal);
        if (ratedRes?.results) setTopRatedSeries(ratedRes.results.map((r: any) => normalizeItem(r, 'tv', currentLang)));

        const popRes = await fetchWithCache(`${TMDB_BASE_URL}/tv/popular?api_key=${tmdbKey}${langParam}`, ac.signal);
        if (popRes?.results) setPopularSeries(popRes.results.map((r: any) => normalizeItem(r, 'tv', currentLang)));

        const actionRes = await fetchWithCache(`${TMDB_BASE_URL}/discover/tv?api_key=${tmdbKey}${langParam}&with_genres=10759`, ac.signal);
        if (actionRes?.results) setActionSeries(actionRes.results.map((r: any) => normalizeItem(r, 'tv', currentLang)));

        const mysteryRes = await fetchWithCache(`${TMDB_BASE_URL}/discover/tv?api_key=${tmdbKey}${langParam}&with_genres=9648`, ac.signal);
        if (mysteryRes?.results) setMysterySeries(mysteryRes.results.map((r: any) => normalizeItem(r, 'tv', currentLang)));

        const dramaRes = await fetchWithCache(`${TMDB_BASE_URL}/discover/tv?api_key=${tmdbKey}${langParam}&with_genres=18`, ac.signal);
        if (dramaRes?.results) setDramaSeries(dramaRes.results.map((r: any) => normalizeItem(r, 'tv', currentLang)));

        const animeRes = await fetchWithCache(`${TMDB_BASE_URL}/discover/tv?api_key=${tmdbKey}${langParam}&with_genres=16`, ac.signal);
        if (animeRes?.results) setAnimationSeries(animeRes.results.map((r: any) => normalizeItem(r, 'tv', currentLang)));
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error("Failed to fetch TMDB Live series:", err);
        }
      }
    };
    loadSeries();
    return () => { ac.abort(); };
  }, [tmdbKey, currentLang]);

  // Search Debounce with AbortController
  useEffect(() => {
    if (!searchQuery.trim()) {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }

    const ac = new AbortController();
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
          `${TMDB_BASE_URL}/${endpoint}?api_key=${tmdbKey}&language=${currentLang}&query=${encodeURIComponent(searchQuery)}`,
          ac.signal
        );
        const results = (searchData?.results || []).map((r: any) => normalizeItem(r, mediaType, currentLang));
        setSearchResults(results);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error("Failed search operation:", err);
        }
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => {
      clearTimeout(delayDebounce);
      ac.abort();
    };
  }, [searchQuery, activeTab, tmdbKey, currentLang]);

  // Details Modal Loader with AbortController
  useEffect(() => {
    if (selectedItemId === null) return;
    const ac = new AbortController();
    setIsLoadingDetails(true);

    const isTv = activeTab === 'series';
    const mediaType: Media = isTv ? 'tv' : 'movie';

    if (!tmdbKey) {
      const list = isTv ? FALLBACK_SERIES : FALLBACK_MOVIES;
      const match = list.find(m => m.id === selectedItemId);
      if (match) {
        setDetailedItem(normalizeItem(match, mediaType, currentLang));
        setIsLoadingDetails(false);
      }
      return;
    }

    const loadDetails = async () => {
      try {
        const langParam = `&language=${currentLang}`;
        const detailType = isTv ? 'tv' : 'movie';
        const detailsAppend = isTv ? 'videos,credits,similar,external_ids' : 'videos,credits,similar,release_dates';

        const detail = await fetchWithCache(
          `${TMDB_BASE_URL}/${detailType}/${selectedItemId}?api_key=${tmdbKey}${langParam}&append_to_response=${detailsAppend}`,
          ac.signal
        );

        let imdbRating = "N/A";
        const imdbId = isTv ? detail.external_ids?.imdb_id : detail.imdb_id;

        if (imdbId && omdbKey) {
          try {
            const omdb = await fetch(`${window.location.protocol}//www.omdbapi.com/?i=${imdbId}&apikey=${omdbKey}`, { signal: ac.signal }).then(r => r.json());
            if (omdb && omdb.imdbRating && omdb.imdbRating !== "N/A") {
              imdbRating = omdb.imdbRating;
            }
          } catch (omdbErr) {
            console.warn("Could not fetch ratings from OMDB API:", omdbErr);
          }
        }

        const normalized = normalizeItem(detail, mediaType, currentLang);
        setDetailedItem({
          ...normalized,
          rating: imdbRating !== "N/A" ? parseFloat(imdbRating) : normalized.rating || 8.1
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error("Failed loading exact item details:", err);
        }
      } finally {
        setIsLoadingDetails(false);
      }
    };

    loadDetails();
    return () => { ac.abort(); };
  }, [selectedItemId, activeTab, tmdbKey, currentLang, omdbKey]);

  const activeGenres = activeTab === 'movies' ? movieGenres : seriesGenres;
  const activeFallbackSelected = activeTab === 'movies' ? FALLBACK_MOVIES : FALLBACK_SERIES;
  const activeLiveTrending = activeTab === 'movies' ? trendingMovies : trendingSeries;

  const slideshowSlides = useMemo(() => {
    if (activeLiveTrending.length > 0) return activeLiveTrending.slice(0, 5);
    return activeFallbackSelected.map(r => normalizeItem(r, activeTab === 'movies' ? 'movie' : 'tv', currentLang));
  }, [activeLiveTrending, activeFallbackSelected, activeTab, currentLang]);

  useEffect(() => {
    if (slideshowSlides.length <= 1) return;
    const interval = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % slideshowSlides.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [slideshowSlides]);

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

  const getBackdropSrc = useCallback((path: string | null | undefined) => {
    if (!path) return "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1600";
    if (path.startsWith("http")) return path;
    return `${TMDB_IMAGE_BASE}/original${path}`;
  }, []);

  const getPosterSrc = useCallback((path: string | null | undefined) => {
    if (!path) return "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500";
    if (path.startsWith("http")) return path;
    return `${TMDB_IMAGE_BASE}/w342${path}`;
  }, []);

  const renderCard = useCallback((item: CinemaItem) => (
    <MoviePosterCard
      item={item}
      isTouch={isTouch}
      isActiveHover={activeHoverId === item.id}
      onHover={setActiveHoverId}
      onSelect={setSelectedItemId}
      getPosterSrc={getPosterSrc}
      getBackdropSrc={getBackdropSrc}
      moreLabel={t("movies.more") || "More Details"}
    />
  ), [isTouch, activeHoverId, getPosterSrc, getBackdropSrc, t]);

  const handlePlay = useCallback((item: CinemaItem) => {
    if (!PLAYBACK_BASE) return;
    const url = `${PLAYBACK_BASE}?type=${item.mediaType}&id=${item.id}&imdb=${item.imdbId || ""}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const handleBack = useCallback(() => {
    if (selectedItemId !== null) {
      setSelectedItemId(null);
      setDetailedItem(null);
      return;
    }
    if (searchQuery.trim() || selectedGenreId !== null) {
      setSearchQuery("");
      setSelectedGenreId(null);
      return;
    }
    onClose();
  }, [selectedItemId, searchQuery, selectedGenreId, onClose]);

  const localizedHeroTitle = activeHeroItem ? activeHeroItem.title : "";

  return createPortal(
    <div dir={currentLang === "ar" ? "rtl" : "ltr"} className="fixed inset-0 z-[6000] w-full bg-[#141414] text-zinc-100 font-sans overflow-hidden select-none nl-cinema-root">
      <video className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0" src="https://noureddinelmobaraki-web.github.io/nl-audio-cdn/MOVIESBG_web.webm" autoPlay loop muted playsInline preload="auto" style={{ filter: "brightness(0.28)" }} />
      <div className="absolute inset-0 z-10 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(20,20,20,1) 0%, rgba(20,20,20,0.68) 45%, rgba(20,20,20,0.88) 100%)" }} />

      {isTouch && <CinemaBackButton isRTL={currentLang === "ar"} onBack={handleBack} />}

      <div ref={mainScrollRef} onScroll={handleScrollEvent} className="absolute inset-0 z-20 overflow-y-auto h-full w-full scrollbar-none nl-cinema-scroll" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
        <header ref={headerRef} className={`fixed top-0 inset-x-0 z-50 flex items-center justify-between transition-all duration-300 nl-cinema-header ${scrolled ? "bg-[#141414]/92 backdrop-blur-xl border-b border-zinc-800/40 shadow-xl" : "bg-transparent"}`}>
          <div className="flex items-center gap-4 sm:gap-8 animate-fade-in">
            <h1 className="text-lg sm:text-2xl font-black tracking-tighter text-red-600 bg-gradient-to-r from-red-600 via-rose-500 to-red-700 bg-clip-text text-transparent select-none">
              {t("movies.title") || (currentLang === "ar" ? "سينما NL" : "CINEMA")}
            </h1>
            <div className="flex bg-zinc-950/90 rounded-full p-1 border border-zinc-800/60 shadow-inner scale-90 sm:scale-100">
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
                <div className="flex items-center gap-2 relative">
                  <input
                    type="search"
                    placeholder={activeTab === 'movies' ? t("movies.search") || "Search..." : t("series.search") || "Search series..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    dir="auto"
                    className="w-28 sm:w-44 focus:w-40 sm:focus:w-60 px-3 py-1 bg-zinc-900/95 border border-zinc-700/80 text-white rounded text-xs focus:outline-none focus:border-red-600 transition-all duration-300"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                    >
                      <X size={12} />
                    </button>
                  )}
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

            <button onClick={toggleMute} className="p-2 rounded bg-neutral-900/80 border border-zinc-850 hover:bg-neutral-800 transition text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer" style={{ width: "34px", height: "34px" }}>
              {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>

            <button onClick={onClose} className="p-2 rounded-full bg-neutral-900 hover:bg-red-600 transition text-zinc-300 hover:text-white flex items-center justify-center border border-zinc-850 hover:border-red-600 cursor-pointer" style={{ width: "34px", height: "34px" }}>
              <X size={16} />
            </button>
          </div>
        </header>

        {isMobile && activeGenres.length > 0 && (
          <div className="px-4 overflow-x-auto select-none overflow-y-hidden flex gap-2 scrollbar-none py-1" style={{ marginTop: 'calc(var(--cinema-header-h, 74px) + 8px)' }}>
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
          <main className="pt-24 px-4 sm:px-10 pb-20 animate-fade-in">
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
                  <MoviePosterCard 
                    item={item} 
                    isTouch={isTouch} 
                    isActiveHover={activeHoverId === item.id} 
                    onHover={setActiveHoverId} 
                    onSelect={setSelectedItemId} 
                    getPosterSrc={getPosterSrc} 
                    getBackdropSrc={getBackdropSrc} 
                    moreLabel={t("movies.more") || "More Details"} 
                  />
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
              <section className="relative flex flex-col justify-end w-full pb-8 sm:pb-16 px-6 sm:px-16 nl-cinema-hero animate-fade-in">
                <div className="absolute inset-0 z-0">
                  <img src={getBackdropSrc(activeHeroItem.backdropPath)} alt="" className="w-full h-full object-cover select-none pointer-events-none" />
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
                        ? activeHeroItem.runtime ? `${activeHeroItem.runtime}m` : "148m"
                        : activeHeroItem.seasons ? `${activeHeroItem.seasons} ${currentLang === "ar" ? "مواسم" : "Seasons"}` : `5 ${currentLang === "ar" ? "مواسم" : "Seasons"}`}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-neutral-303 tracking-wide leading-relaxed line-clamp-2 select-text max-h-[3.6rem] overflow-hidden">{activeHeroItem.overview}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <button 
                      onClick={() => handlePlay(activeHeroItem)} 
                      disabled={!PLAYBACK_BASE}
                      title={!PLAYBACK_BASE ? (currentLang === "ar" ? "التشغيل قيد الإعداد" : "Playback coming soon") : ""}
                      className={`py-2 px-5 font-black rounded-md flex items-center gap-1.5 transition text-xs sm:text-sm cursor-pointer shadow hover:scale-105 ${
                        !PLAYBACK_BASE 
                          ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/80" 
                          : "bg-white text-zinc-950 hover:bg-neutral-200"
                      }`}
                    >
                      <Play size={14} className="fill-current" />
                      <span>{t("movies.play") || (currentLang === "ar" ? "تشغيل" : "Watch Now")}</span>
                    </button>
                    <button onClick={() => setSelectedItemId(activeHeroItem.id)} className="py-2 px-4 bg-zinc-700/60 text-zinc-100 font-bold rounded-md flex items-center gap-1.5 hover:bg-zinc-650 transition text-xs sm:text-sm cursor-pointer">
                      <Info size={14} />
                      <span>{t("movies.more") || (currentLang === "ar" ? "تفاصيل" : "More Info")}</span>
                    </button>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'movies' ? (
              <div className="relative pb-24 -mt-4 bg-[#141414]">
                <MovieRow title={currentLang === "ar" ? "الأفلام الرائجة" : "Trending Movies"} items={trendingMovies} isTouch={isTouch} isRTL={currentLang === "ar"} card={renderCard} />
                <MovieRow title={currentLang === "ar" ? "الأعلى تقييماً" : "Top Rated Movies"} items={topRatedMovies} isTouch={isTouch} isRTL={currentLang === "ar"} card={renderCard} />
                <MovieRow title={currentLang === "ar" ? "أفلام الأكشن والإثارة" : "Action & Thriller"} items={actionMovies} isTouch={isTouch} isRTL={currentLang === "ar"} card={renderCard} />
                <MovieRow title={currentLang === "ar" ? "سينما الرعب والإثارة" : "Horror & Suspense"} items={horrorMovies} isTouch={isTouch} isRTL={currentLang === "ar"} card={renderCard} />
                <MovieRow title={currentLang === "ar" ? "الأفلام الأكثر شعبية" : "Most Popular"} items={popularMovies} isTouch={isTouch} isRTL={currentLang === "ar"} card={renderCard} />
                <MovieRow title={currentLang === "ar" ? "أفلام الدراما" : "Drama Movies"} items={dramaMovies} isTouch={isTouch} isRTL={currentLang === "ar"} card={renderCard} />
                <MovieRow title={currentLang === "ar" ? "الخيال العلمي والفنتازيا" : "Sci-Fi & Fantasy"} items={sciFiMovies} isTouch={isTouch} isRTL={currentLang === "ar"} card={renderCard} />
              </div>
            ) : (
              <div className="relative pb-24 -mt-4 bg-[#141414]">
                <MovieRow title={currentLang === "ar" ? "المسلسلات الرائجة" : "Trending Series"} items={trendingSeries} isTouch={isTouch} isRTL={currentLang === "ar"} card={renderCard} />
                <MovieRow title={currentLang === "ar" ? "الأعلاء تقييماً" : "Top Rated Shows"} items={topRatedSeries} isTouch={isTouch} isRTL={currentLang === "ar"} card={renderCard} />
                <MovieRow title={currentLang === "ar" ? "المسلسلات الأكثر شعبية" : "Most Popular Shows"} items={popularSeries} isTouch={isTouch} isRTL={currentLang === "ar"} card={renderCard} />
                <MovieRow title={currentLang === "ar" ? "الحركة والمغامرة" : "Action & Adventure"} items={actionSeries} isTouch={isTouch} isRTL={currentLang === "ar"} card={renderCard} />
                <MovieRow title={currentLang === "ar" ? "الألغاز والغموض" : "Mystery & Thriller"} items={mysterySeries} isTouch={isTouch} isRTL={currentLang === "ar"} card={renderCard} />
                <MovieRow title={currentLang === "ar" ? "مسلسلات الدراما الراقية" : "Drama Shows"} items={dramaSeries} isTouch={isTouch} isRTL={currentLang === "ar"} card={renderCard} />
                <MovieRow title={currentLang === "ar" ? "أفضل مسلسلات الأنميشن" : "Animation & Anime"} items={animationSeries} isTouch={isTouch} isRTL={currentLang === "ar"} card={renderCard} />
              </div>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {selectedItemId !== null && detailedItem && (
          <div className="fixed inset-0 z-[7000] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/85 backdrop-blur-sm">
            <div onClick={() => { setSelectedItemId(null); setDetailedItem(null); }} className="absolute inset-0 z-0 cursor-zoom-out" />
            {isLoadingDetails ? (
              <div className="relative z-10 flex flex-col items-center gap-3 text-red-600">
                <div className="w-12 h-12 border-4 border-t-red-600 border-zinc-800 rounded-full animate-spin" />
                <p className="text-zinc-400 text-xs font-mono">Resolving details...</p>
              </div>
            ) : (
              <motion.div 
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="detailed-modal-title"
                initial={{ opacity: 0, scale: 0.95, y: 15 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.95, y: 15 }} 
                transition={{ duration: 0.25 }} 
                className="relative bg-neutral-950 w-full max-w-3xl rounded-xl shadow-2xl border border-zinc-800 overflow-hidden z-10 nl-cinema-modal"
              >
                <div className="relative aspect-video w-full bg-black">
                  <img src={getBackdropSrc(detailedItem.backdropPath)} alt="" className="w-full h-full object-cover opacity-85" />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-black/30" />
                  <button onClick={() => { setSelectedItemId(null); setDetailedItem(null); }} className="absolute top-4 right-4 p-2 bg-neutral-900/80 hover:bg-red-600 transition rounded-full text-white cursor-pointer z-50">
                    <X size={16} />
                  </button>
                </div>

                <div className="p-6 md:p-8 flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-4">
                    <h3 id="detailed-modal-title" className="text-xl sm:text-2xl font-black text-zinc-100 select-text">{detailedItem.title}</h3>
                    
                    <button
                      onClick={() => handlePlay(detailedItem)}
                      disabled={!PLAYBACK_BASE}
                      title={!PLAYBACK_BASE ? (currentLang === "ar" ? "التشغيل قيد الإعداد" : "Playback coming soon") : ""}
                      className={`py-1.5 px-5 sm:py-2 sm:px-6 text-white font-black rounded-md flex items-center gap-1.5 border shadow-lg cursor-pointer transition text-xs sm:text-sm ${
                        !PLAYBACK_BASE 
                          ? 'opacity-40 bg-zinc-800 border-zinc-700 cursor-not-allowed' 
                          : 'bg-red-600 hover:bg-red-700 active:scale-95 border-red-500'
                      }`}
                    >
                      <Play size={14} className="fill-current" />
                      <span>{t("movies.play") || (currentLang === "ar" ? "مشاهدة الآن" : "Watch Now")}</span>
                    </button>
                  </div>

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
                        ? detailedItem.runtime ? `${detailedItem.runtime}m` : "148m"
                        : detailedItem.seasons ? `${detailedItem.seasons} ${currentLang === "ar" ? "مواسم" : "Seasons"}` : `5 Seasons`}
                    </span>
                    {detailedItem.mediaType === 'tv' && detailedItem.episodes && (
                      <span>{detailedItem.episodes} {currentLang === "ar" ? "حلقات" : "episodes"}</span>
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
                        {currentLang === "ar" ? "الإعلان الرسمي غير متوفر" : "No Trailer Available"}
                      </div>
                    )}

                    <div className="flex flex-col gap-3">
                      <div>
                        <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">{t("movies.genres") || (currentLang === "ar" ? "التصنيفات" : "Genres")}</h4>
                        <div className="flex flex-wrap gap-1">
                          {detailedItem.genreNames.map((g, i) => (
                            <span key={i} className="text-[10px] font-black px-2.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded">{g}</span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">{t("movies.cast") || (currentLang === "ar" ? "طاقم العمل" : "Top Cast")}</h4>
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
    </div>,
    document.body
  );
}
