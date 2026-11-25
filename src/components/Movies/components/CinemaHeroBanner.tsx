/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { Star } from "lucide-react";
import { ServerBranchesInline } from "../MovieSourcesModal";
import { CinemaDownloadTriggerButton } from "../../../features/cinemaDownload";
import {
  TMDB_IMAGE_BASE,
  getBackdropSrc_static,
  getPosterSrc_static,
  type Media,
  type CinemaItem,
} from "../moviesDataClient";

export type CinemaHeroMobileVariant = "fullbleed" | "portrait" | "editorial16x9";

interface CinemaHeroBannerProps {
  activeHeroItem: CinemaItem;
  isMobile: boolean;
  heroIndex: number;
  setHeroIndex: (idx: number) => void;
  currentLang: string;
  localizedHeroTitle: string;
  heroServersOpen: boolean;
  setHeroServersOpen: (open: boolean) => void;
  slideshowSlides: CinemaItem[];
  setSelectedItemId: (id: number | null, mediaType?: Media) => void;
  handleQuickWatch: (item: CinemaItem) => void;
  t: any;
  mobileVariant?: CinemaHeroMobileVariant;
  editorialSubline?: string;
}

export function CinemaHeroBanner({
  activeHeroItem,
  isMobile,
  heroIndex,
  setHeroIndex,
  currentLang,
  localizedHeroTitle,
  heroServersOpen,
  setHeroServersOpen,
  slideshowSlides,
  setSelectedItemId,
  handleQuickWatch,
  t,
  mobileVariant = "fullbleed",
  editorialSubline,
}: CinemaHeroBannerProps) {
  const slideshowSlidesLength = slideshowSlides.length;

  const handleImageFallback = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const el = e.currentTarget;
    el.removeAttribute("srcset");
    if (activeHeroItem.posterPath && !el.dataset.fb0) {
      el.dataset.fb0 = "1";
      el.src = activeHeroItem.posterPath.startsWith("http")
        ? activeHeroItem.posterPath
        : `${TMDB_IMAGE_BASE}/w780${activeHeroItem.posterPath}`;
    } else if (!el.dataset.fbTmdb && activeHeroItem.title) {
      el.dataset.fbTmdb = "1";
      const q = encodeURIComponent(
        activeHeroItem.originalTitle || activeHeroItem.title,
      );
      void fetch(
        `https://api.themoviedb.org/3/search/multi?api_key=3fd2be6f0c70a2a598f084ddfb75487c&query=${q}&include_adult=false`,
      )
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          const hit = (data?.results || []).find(
            (r: any) => r?.backdrop_path || r?.poster_path,
          );
          if (hit?.backdrop_path) {
            el.src = `${TMDB_IMAGE_BASE}/w1280${hit.backdrop_path}`;
          } else if (hit?.poster_path) {
            el.src = `${TMDB_IMAGE_BASE}/w780${hit.poster_path}`;
          } else if (!el.dataset.fbFinal) {
            el.dataset.fbFinal = "1";
            el.src =
              "https://noureddinelmobaraki-web.github.io/nl-audio-cdn/hero_bg.webp";
          }
        })
        .catch(() => {
          if (!el.dataset.fbFinal) {
            el.dataset.fbFinal = "1";
            el.src =
              "https://noureddinelmobaraki-web.github.io/nl-audio-cdn/hero_bg.webp";
          }
        });
    } else if (!el.dataset.fbFinal) {
      el.dataset.fbFinal = "1";
      el.src =
        "https://noureddinelmobaraki-web.github.io/nl-audio-cdn/hero_bg.webp";
    }
  };

  const renderCarouselDots = () =>
    slideshowSlidesLength > 1 && !heroServersOpen ? (
      <div className="ms-1 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md max-w-full overflow-x-auto no-scrollbar">
        {slideshowSlides.map((slide, idx) => (
          <button
            key={slide.id}
            type="button"
            data-compact-touch="true"
            onClick={() => setHeroIndex(idx)}
            aria-label={`Slide ${idx + 1}`}
            className={`nl-dot-btn shrink-0 h-1.5 rounded-full transition-all cursor-pointer ${
              idx === heroIndex
                ? "w-6 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                : "w-1.5 bg-white/40 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    ) : null;

  // Mobile-only Netflix / Disney+ style framed vertical portrait glass poster card (Movies & Arabic Cartoon)
  if (isMobile && mobileVariant === "portrait") {
    const portraitSrc = activeHeroItem.posterPath
      ? getPosterSrc_static(activeHeroItem.posterPath, activeHeroItem.backdropPath)
      : getBackdropSrc_static(
          activeHeroItem.backdropPath,
          activeHeroItem.trailerKey,
          activeHeroItem.posterPath,
        );

    return (
      <section className="relative w-full px-4 pt-3 pb-5 md:hidden">
        <div className="relative mx-auto w-full max-w-[380px] aspect-[3/4] rounded-3xl overflow-hidden border border-white/25 bg-slate-950/55 shadow-[0_24px_60px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.35)]">
          <img
            src={portraitSrc}
            fetchPriority={heroIndex === 0 ? "high" : undefined}
            alt={localizedHeroTitle}
            referrerPolicy="no-referrer"
            onError={handleImageFallback}
            className="w-full h-full object-cover object-top select-none pointer-events-none"
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(to top, rgba(4,6,14,0.96) 0%, rgba(4,6,14,0.72) 38%, rgba(4,6,14,0.16) 72%, rgba(4,6,14,0.08) 100%)",
            }}
          />

          <div className="absolute inset-x-0 bottom-0 z-10 p-4 flex flex-col gap-2.5 text-white">
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/30 border border-rose-300/45 text-rose-100 backdrop-blur-md">
                {activeHeroItem.mediaType === "movie"
                  ? currentLang === "ar"
                    ? "فيلم مميز"
                    : "Featured Movie"
                  : currentLang === "ar"
                    ? "مسلسل مميز"
                    : "Featured Series"}
              </span>
              {activeHeroItem.rating > 0 && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-400/20 border border-amber-300/40 text-amber-300 backdrop-blur-md tabular-nums">
                  <Star size={10} className="fill-current" />
                  {activeHeroItem.rating.toFixed(1)}
                </span>
              )}
              {activeHeroItem.year && (
                <span className="px-2 py-0.5 rounded-full text-[11px] text-white/90 font-bold bg-white/12 border border-white/20 backdrop-blur-md tabular-nums">
                  {activeHeroItem.year}
                </span>
              )}
            </div>

            <h2
              onClick={() => setSelectedItemId(activeHeroItem.id, activeHeroItem.mediaType)}
              className="text-2xl font-black leading-tight tracking-tight text-center text-balance cursor-pointer drop-shadow-[0_4px_18px_rgba(0,0,0,0.9)] line-clamp-2"
            >
              {localizedHeroTitle}
            </h2>

            <div className="flex items-center justify-center gap-2 pt-0.5 flex-wrap">
              <ServerBranchesInline
                item={activeHeroItem}
                isOpen={heroServersOpen}
                onToggle={() => handleQuickWatch(activeHeroItem)}
                onClose={() => setHeroServersOpen(false)}
                buttonLabel={
                  t("movies.meta.watchNow") ||
                  (currentLang === "ar" ? "شاهد الآن" : "Watch Now")
                }
              />

              {(!activeHeroItem.hub || activeHeroItem.hub === "movies") && (
                <CinemaDownloadTriggerButton
                  item={activeHeroItem}
                  currentLang={currentLang}
                />
              )}
            </div>
          </div>
        </div>

        {slideshowSlidesLength > 1 && !heroServersOpen && (
          <div className="mt-3 flex justify-center">{renderCarouselDots()}</div>
        )}
      </section>
    );
  }

  // Mobile-only MUBI / Criterion monochrome silver-screen 16:9 framed hero card (Classic Film Noir)
  if (isMobile && mobileVariant === "editorial16x9") {
    const metaParts = [
      editorialSubline || activeHeroItem.genreNames?.[0] || "CLASSIC NOIR",
      activeHeroItem.year || "",
      activeHeroItem.rating > 0 ? `★ ${activeHeroItem.rating.toFixed(1)}` : "",
    ].filter(Boolean);

    return (
      <section className="relative w-full px-4 pt-3 pb-5 md:hidden">
        <div className="relative w-full rounded-3xl overflow-hidden border border-zinc-200/30 bg-zinc-950/75 backdrop-blur-xl shadow-[0_22px_54px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.28)]">
          <div className="relative aspect-video w-full overflow-hidden bg-black">
            <img
              src={getBackdropSrc_static(
                activeHeroItem.backdropPath,
                activeHeroItem.trailerKey,
                activeHeroItem.posterPath,
              )}
              fetchPriority={heroIndex === 0 ? "high" : undefined}
              alt={localizedHeroTitle}
              referrerPolicy="no-referrer"
              onError={handleImageFallback}
              className="w-full h-full object-cover object-center grayscale contrast-125 select-none pointer-events-none"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/25 to-transparent pointer-events-none" />
          </div>

          <div className="p-4 pt-3 flex flex-col gap-2.5 text-zinc-100">
            <h2
              onClick={() => setSelectedItemId(activeHeroItem.id, activeHeroItem.mediaType)}
              className="text-xl font-black tracking-tight leading-snug text-white text-balance cursor-pointer line-clamp-2"
            >
              {localizedHeroTitle}
            </h2>

            {metaParts.length > 0 && (
              <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-zinc-300/85 tabular-nums truncate">
                {metaParts.join(" · ")}
              </div>
            )}

            {activeHeroItem.overview && (
              <p className="text-xs text-zinc-300/80 leading-relaxed line-clamp-2">
                {activeHeroItem.overview}
              </p>
            )}

            <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
              <ServerBranchesInline
                item={activeHeroItem}
                isOpen={heroServersOpen}
                onToggle={() => handleQuickWatch(activeHeroItem)}
                onClose={() => setHeroServersOpen(false)}
                buttonLabel={t("movies.meta.watchNow") || "Watch Now"}
              />
              {renderCarouselDots()}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className="lg-cinema-hero-stage relative flex flex-col justify-end w-full pb-12 sm:pb-16 px-6 sm:px-14"
      style={{ minHeight: isMobile ? "58vh" : "76vh" }}
    >
      <div className="lg-cinema-hero-backdrop">
        <img
          src={getBackdropSrc_static(
            activeHeroItem.backdropPath,
            activeHeroItem.trailerKey,
            activeHeroItem.posterPath,
          )}
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
          referrerPolicy="no-referrer"
          onError={handleImageFallback}
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

      <div className="relative z-10 flex flex-col max-w-3xl text-white gap-3 pt-24">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/25 border border-rose-300/40 text-rose-100 backdrop-blur-md">
            {activeHeroItem.mediaType === "movie"
              ? currentLang === "ar"
                ? "فيلم مميز"
                : "Featured Movie"
              : currentLang === "ar"
                ? "مسلسل مميز"
                : "Featured Series"}
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
          {activeHeroItem.mediaType === "movie"
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

        <div className="flex flex-col gap-2.5 mt-1.5">
          <div className="flex items-center gap-3 flex-wrap">
            <ServerBranchesInline
              item={activeHeroItem}
              isOpen={heroServersOpen}
              onToggle={() => {
                handleQuickWatch(activeHeroItem);
              }}
              onClose={() => setHeroServersOpen(false)}
              buttonLabel={
                t("movies.meta.watchNow") ||
                (currentLang === "ar" ? "شاهد الآن" : "Watch Now")
              }
            />

            {(!activeHeroItem.hub || activeHeroItem.hub === "movies") && (
              <CinemaDownloadTriggerButton
                item={activeHeroItem}
                currentLang={currentLang}
              />
            )}

            {renderCarouselDots()}
          </div>
        </div>
      </div>
    </section>
  );
}
