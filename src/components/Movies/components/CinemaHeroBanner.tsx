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
  type Media,
  type CinemaItem,
} from "../moviesDataClient";

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
}: CinemaHeroBannerProps) {
  const slideshowSlidesLength = slideshowSlides.length;

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

            <CinemaDownloadTriggerButton
              item={activeHeroItem}
              currentLang={currentLang}
            />

            {slideshowSlidesLength > 1 && !heroServersOpen && (
              <div className="ms-1 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md">
                {slideshowSlides.map((slide, idx) => (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => setHeroIndex(idx)}
                    aria-label={`Slide ${idx + 1}`}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      idx === heroIndex
                        ? "w-6 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                        : "w-1.5 bg-white/40 hover:bg-white/70"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
