/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import {
  Star,
  Film,
  Heart,
  Eye,
  Bookmark,
  Calendar,
  Globe2,
  Award,
  Users,
  Sparkles,
} from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import { EyeLoader } from "../EyeLoader";
import { ServerBranchesInline } from "../MovieSourcesModal";
import { CinemaDownloadTriggerButton } from "../../../features/cinemaDownload";
import { clockReset } from "../../../features/cinema/player/playbackClock";
import {
  TMDB_IMAGE_BASE,
  getPosterSrc_static,
  MOVIE_ROW_SCROLL_STYLE,
  type Media,
  type CastMember,
  type CinemaItem,
} from "../moviesDataClient";
import { CinemaPlayerStage } from "./CinemaPlayerStage";

interface CinemaDetailModalProps {
  selectedItemId: number | null;
  setSelectedItemId: (id: number | null, mediaType?: Media) => void;
  isWatchingInGallery: boolean;
  setIsWatchingInGallery: (v: boolean) => void;
  isLoadingDetails: boolean;
  detailedItem: CinemaItem | null;
  detailDialogRef: any;
  detailWatchTarget: any;
  detailServersOpen: boolean;
  setDetailServersOpen: (v: boolean) => void;
  startGalleryWatchSession: (idx?: number) => void;
  activeImdbId: string;
  showHeroTrailer: boolean;
  setShowHeroTrailer: (v: boolean) => void;
  setTrailerFallbackToYoutube: (v: boolean) => void;
  persistCurrentProgress: () => void;
  currentLang: string;
  t: any;
  user: any;
  has: (id: number, mediaType: "movie" | "tv", status: "favorite" | "watched" | "watchlist") => boolean;
  toggle: (id: number, mediaType: "movie" | "tv", status: "favorite" | "watched" | "watchlist", title?: string, posterPath?: string) => void | Promise<void>;
  handleSelectActor: (actor: CastMember) => void;
  playerStageProps: Omit<React.ComponentProps<typeof CinemaPlayerStage>, "detailedItem">;
}

export function CinemaDetailModal({
  selectedItemId,
  setSelectedItemId,
  isWatchingInGallery,
  setIsWatchingInGallery,
  isLoadingDetails,
  detailedItem,
  detailDialogRef,
  detailWatchTarget,
  detailServersOpen,
  setDetailServersOpen,
  startGalleryWatchSession,
  activeImdbId,
  showHeroTrailer,
  setShowHeroTrailer,
  setTrailerFallbackToYoutube,
  persistCurrentProgress,
  currentLang,
  t,
  user,
  has,
  toggle,
  handleSelectActor,
  playerStageProps,
}: CinemaDetailModalProps) {
  return (
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
              <CinemaPlayerStage
                detailedItem={detailedItem}
                {...playerStageProps}
              />

              {!isWatchingInGallery && (
                <div className="p-5 sm:p-7 flex flex-col gap-5 overflow-y-auto">
                  <div className="flex flex-col gap-3 pb-4 border-b border-white/12">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2.5 flex-1">
                        {detailWatchTarget && (
                          <ServerBranchesInline
                            item={detailWatchTarget}
                            isOpen={detailServersOpen}
                            onToggle={() => {
                              setDetailServersOpen(true);
                              startGalleryWatchSession();
                            }}
                            onClose={() => setDetailServersOpen(false)}
                            buttonLabel={t("movies.meta.watchNow")}
                          />
                        )}

                        <CinemaDownloadTriggerButton
                          item={detailedItem}
                          imdbId={activeImdbId}
                          season={playerStageProps.selectedSeason}
                          episode={playerStageProps.selectedEpisode}
                          episodeTitle={
                            playerStageProps.seasonEpisodes.find(
                              (ep) => ep.episode_number === playerStageProps.selectedEpisode,
                            )?.name
                          }
                          currentLang={currentLang}
                        />

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
                          <button
                            type="button"
                            onClick={() =>
                              toggle(
                                detailedItem.id,
                                detailedItem.mediaType,
                                "favorite",
                                detailedItem.title,
                                detailedItem.posterPath,
                              )
                            }
                            aria-pressed={has(detailedItem.id, detailedItem.mediaType, "favorite")}
                            aria-label="Add to favorites"
                            className={[
                              "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full",
                              "text-xs font-bold border transition-all duration-200 cursor-pointer backdrop-blur-md",
                              has(detailedItem.id, detailedItem.mediaType, "favorite")
                                ? "bg-rose-600/40 border-rose-400/60 text-white shadow-md"
                                : "bg-white/6 border-white/15 text-white/75 hover:border-rose-400/50 hover:text-rose-200",
                            ].join(" ")}
                          >
                            <Heart
                              size={13}
                              strokeWidth={2}
                              fill={has(detailedItem.id, detailedItem.mediaType, "favorite") ? "currentColor" : "none"}
                            />
                            <span>{currentLang === "ar" ? "مفضل" : "Favorite"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              toggle(
                                detailedItem.id,
                                detailedItem.mediaType,
                                "watched",
                                detailedItem.title,
                                detailedItem.posterPath,
                              )
                            }
                            aria-pressed={has(detailedItem.id, detailedItem.mediaType, "watched")}
                            aria-label="Mark as watched"
                            className={[
                              "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full",
                              "text-xs font-bold border transition-all duration-200 cursor-pointer backdrop-blur-md",
                              has(detailedItem.id, detailedItem.mediaType, "watched")
                                ? "bg-emerald-600/40 border-emerald-400/60 text-white shadow-md"
                                : "bg-white/6 border-white/15 text-white/75 hover:border-emerald-400/50 hover:text-emerald-200",
                            ].join(" ")}
                          >
                            <Eye
                              size={13}
                              strokeWidth={2}
                              fill={has(detailedItem.id, detailedItem.mediaType, "watched") ? "currentColor" : "none"}
                            />
                            <span>{currentLang === "ar" ? "تمت مشاهدته" : "Watched"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              toggle(
                                detailedItem.id,
                                detailedItem.mediaType,
                                "watchlist",
                                detailedItem.title,
                                detailedItem.posterPath,
                              )
                            }
                            aria-pressed={has(detailedItem.id, detailedItem.mediaType, "watchlist")}
                            aria-label="Add to watchlist"
                            className={[
                              "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full",
                              "text-xs font-bold border transition-all duration-200 cursor-pointer backdrop-blur-md",
                              has(detailedItem.id, detailedItem.mediaType, "watchlist")
                                ? "bg-amber-500/40 border-amber-300/60 text-white shadow-md"
                                : "bg-white/6 border-white/15 text-white/75 hover:border-amber-400/50 hover:text-amber-200",
                            ].join(" ")}
                          >
                            <Bookmark
                              size={13}
                              strokeWidth={2}
                              fill={has(detailedItem.id, detailedItem.mediaType, "watchlist") ? "currentColor" : "none"}
                            />
                            <span>{currentLang === "ar" ? "للمشاهدة لاحقاً" : "Watchlist"}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    <div className="lg:col-span-6 flex flex-col gap-4">
                      <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/12 flex flex-col gap-2.5">
                        <h4 className="text-[11px] font-bold text-white/60 uppercase tracking-widest">
                          {currentLang === "ar" ? "القصة والملخص" : "Storyline"}
                        </h4>
                        <p className="text-xs sm:text-sm text-white/90 leading-relaxed select-text">
                          {detailedItem.overview}
                        </p>
                      </div>

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
                              {detailedItem.mediaType === "tv"
                                ? currentLang === "ar"
                                  ? "صناع العمل"
                                  : "Created By"
                                : currentLang === "ar"
                                  ? "الإخراج"
                                  : "Director"}
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
  );
}
