import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Heart, Info, Play, Star, X } from "lucide-react";
import { AnimatePresence, m } from "framer-motion";
import {
  getPosterSrc_static,
  MOVIE_ROW_SCROLL_STYLE,
  TMDB_IMAGE_BASE,
  type CinemaItem,
  type Media,
} from "./moviesDataClient";

function buildDynamicSvgPosterFallback(title: string, year?: string | number): string {
  const safeTitle = (title || "NL Cinema")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .slice(0, 32);
  const safeYear = String(year || "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0f172a"/>
        <stop offset="50%" stop-color="#1e1b4b"/>
        <stop offset="100%" stop-color="#090d16"/>
      </linearGradient>
    </defs>
    <rect width="400" height="600" fill="url(#g)"/>
    <circle cx="200" cy="230" r="70" fill="rgba(56,189,248,0.12)" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
    <polygon points="185,200 185,260 235,230" fill="rgba(255,255,255,0.85)"/>
    <text x="200" y="380" text-anchor="middle" fill="#ffffff" font-family="system-ui,sans-serif" font-weight="800" font-size="22">${safeTitle}</text>
    <text x="200" y="420" text-anchor="middle" fill="#38bdf8" font-family="system-ui,sans-serif" font-weight="700" font-size="16">${safeYear}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function NLLogo() {
  return (
    <span className="nl-logo" aria-label="NL" role="img">
      NL
    </span>
  );
}

export const MoviePosterCard = React.memo(
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
            <X size={12} strokeWidth={2.5} />
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
          referrerPolicy="no-referrer"
          onError={(e) => {
            const el = e.currentTarget;
            if (item.backdropPath && item.backdropPath !== posterUrl && !el.dataset.fb0) {
              el.dataset.fb0 = "1";
              el.src = item.backdropPath.startsWith("http")
                ? item.backdropPath
                : `${TMDB_IMAGE_BASE}/w780${item.backdropPath}`;
            } else if (item.trailerKey && !el.dataset.fb) {
              el.dataset.fb = "1";
              el.src = `https://i.ytimg.com/vi/${item.trailerKey}/hqdefault.jpg`;
            } else if (!el.dataset.fbTmdb && item.title) {
              el.dataset.fbTmdb = "1";
              const q = encodeURIComponent(item.originalTitle || item.title);
              void fetch(
                `https://api.themoviedb.org/3/search/multi?api_key=3fd2be6f0c70a2a598f084ddfb75487c&query=${q}&include_adult=false`,
              )
                .then((r) => (r.ok ? r.json() : null))
                .then((data) => {
                  const hit = (data?.results || []).find(
                    (r: any) => r?.poster_path || r?.backdrop_path,
                  );
                  if (hit?.poster_path) {
                    el.src = `${TMDB_IMAGE_BASE}/w500${hit.poster_path}`;
                  } else if (hit?.backdrop_path) {
                    el.src = `${TMDB_IMAGE_BASE}/w780${hit.backdrop_path}`;
                  } else if (!el.dataset.fb2) {
                    el.dataset.fb2 = "1";
                    el.src = buildDynamicSvgPosterFallback(item.title, item.year);
                  }
                })
                .catch(() => {
                  if (!el.dataset.fb2) {
                    el.dataset.fb2 = "1";
                    el.src = buildDynamicSvgPosterFallback(item.title, item.year);
                  }
                });
            } else if (!el.dataset.fb2) {
              el.dataset.fb2 = "1";
              el.src = buildDynamicSvgPosterFallback(item.title, item.year);
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

export const MovieRow = React.memo(
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
