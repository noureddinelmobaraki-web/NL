import React, { useEffect, useState } from "react";
import { Calendar, MapPin, X } from "lucide-react";
import { AnimatePresence, m } from "framer-motion";
import { tmdbLang } from "../../utils/lang";
import {
  fetchWithCache,
  getPosterSrc_static,
  MOVIE_ROW_SCROLL_STYLE,
  TMDB_BASE_URL,
  TMDB_IMAGE_BASE,
  type ActorDetails,
  type CastMember,
  type Media,
} from "./moviesDataClient";

export interface ActorProfileModalProps {
  selectedActor: CastMember | null;
  isWatchingInGallery: boolean;
  tmdbKey: string;
  currentLang: string;
  onClose: () => void;
  onSelectWork: (id: number, mediaType: Media) => void;
}

export const ActorProfileModal: React.FC<ActorProfileModalProps> = ({
  selectedActor,
  isWatchingInGallery,
  tmdbKey,
  currentLang,
  onClose,
  onSelectWork,
}) => {
  const [actorDetails, setActorDetails] = useState<ActorDetails | null>(null);
  const [loadingActor, setLoadingActor] = useState(false);

  useEffect(() => {
    if (!selectedActor) {
      setActorDetails(null);
      setLoadingActor(false);
      return;
    }

    if (!selectedActor.id || !tmdbKey) {
      setActorDetails({
        id: selectedActor.id || 0,
        name: selectedActor.name,
        character: selectedActor.character,
        profilePath: selectedActor.profilePath,
        biography:
          currentLang === "ar"
            ? "نبذة الممثل غير متوفرة حالياً في الوضع غير المتصل."
            : "Actor biography currently unavailable.",
        knownWorks: [],
      });
      setLoadingActor(false);
      return;
    }

    let cancelled = false;
    setLoadingActor(true);

    (async () => {
      try {
        const langParam = `&language=${tmdbLang(currentLang)}`;
        const personData = await fetchWithCache(
          `${TMDB_BASE_URL}/person/${selectedActor.id}?api_key=${tmdbKey}${langParam}&append_to_response=combined_credits`,
        );

        let bio = personData?.biography || "";
        if (!bio.trim() && currentLang !== "en") {
          try {
            const enPerson = await fetchWithCache(
              `${TMDB_BASE_URL}/person/${selectedActor.id}?api_key=${tmdbKey}&language=en-US`,
            );
            bio = enPerson?.biography || "";
          } catch {}
        }

        const rawCredits: any[] = personData?.combined_credits?.cast || [];
        const uniqueCreditsMap = new Map<number, any>();
        rawCredits.forEach((c) => {
          if (
            c &&
            c.id &&
            (c.media_type === "movie" || c.media_type === "tv") &&
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
            mediaType: (c.media_type === "tv" ? "tv" : "movie") as Media,
            title: c.title || c.name || "Untitled",
            posterPath: c.poster_path || c.backdrop_path || "",
            year: String(c.release_date || c.first_air_date || "").split("-")[0],
            rating: typeof c.vote_average === "number" ? c.vote_average : 7.5,
          }));

        if (cancelled) return;
        setActorDetails({
          id: selectedActor.id!,
          name: personData?.name || selectedActor.name,
          character: selectedActor.character,
          profilePath: personData?.profile_path || selectedActor.profilePath,
          biography:
            bio.trim() ||
            (currentLang === "ar"
              ? "لا تتوفر سيرة ذاتية مفصلة لهذا الممثل في قاعدة البيانات حالياً."
              : "Detailed biography is not available for this actor yet."),
          birthday: personData?.birthday || undefined,
          placeOfBirth: personData?.place_of_birth || undefined,
          knownForDepartment: personData?.known_for_department || undefined,
          knownWorks: topCredits,
        });
      } catch {
        if (cancelled) return;
        setActorDetails({
          id: selectedActor.id!,
          name: selectedActor.name,
          character: selectedActor.character,
          profilePath: selectedActor.profilePath,
          biography:
            currentLang === "ar"
              ? "تعذر تحميل تفاصيل الممثل الإضافية."
              : "Could not load additional actor details.",
          knownWorks: [],
        });
      } finally {
        if (!cancelled) {
          setLoadingActor(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedActor, tmdbKey, currentLang]);

  return (
    <AnimatePresence>
      {!isWatchingInGallery && selectedActor && (
        <div className="fixed inset-0 z-[10150] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xl select-none">
          <div
            className="absolute inset-0 cursor-zoom-out"
            onClick={onClose}
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
                  {actorDetails?.profilePath || selectedActor.profilePath ? (
                    <img
                      src={
                        (
                          actorDetails?.profilePath || selectedActor.profilePath
                        ).startsWith("http")
                          ? actorDetails?.profilePath ||
                            selectedActor.profilePath
                          : `${TMDB_IMAGE_BASE}/h632${
                              actorDetails?.profilePath ||
                              selectedActor.profilePath
                            }`
                      }
                      alt={selectedActor.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">
                      👤
                    </div>
                  )}
                  <span className="nl-poster__sheen" />
                </div>

                <div className="flex flex-col gap-1.5 text-center sm:text-start min-w-0">
                  <span className="inline-flex self-center sm:self-start items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/25 border border-rose-300/40 text-rose-200">
                    {actorDetails?.knownForDepartment ||
                      (currentLang === "ar" ? "ممثل" : "Acting")}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-white select-text">
                    {actorDetails?.name || selectedActor.name}
                  </h3>
                  {selectedActor.character && (
                    <p className="text-xs font-bold text-amber-300">
                      {currentLang === "ar"
                        ? `الدور: ${selectedActor.character}`
                        : `Role: ${selectedActor.character}`}
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
                onClick={onClose}
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
                  {currentLang === "ar"
                    ? "جاري جلب معلومات الممثل..."
                    : "Loading actor profile..."}
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
                {actorDetails?.knownWorks &&
                  actorDetails.knownWorks.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <h4 className="text-[10px] font-bold text-white/60 uppercase tracking-widest">
                        {currentLang === "ar"
                          ? "أشهر الأعمال (اضغط للفتح)"
                          : "Known For (Click to Open)"}
                      </h4>
                      <div
                        className="flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-none"
                        style={MOVIE_ROW_SCROLL_STYLE}
                      >
                        {actorDetails.knownWorks.map((work) => (
                          <button
                            key={`${work.mediaType}-${work.id}`}
                            type="button"
                            onClick={() => onSelectWork(work.id, work.mediaType)}
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
                              <p className="text-[9.5px] font-bold text-white truncate">
                                {work.title}
                              </p>
                              <p className="text-[8px] text-white/65">
                                {work.year}
                              </p>
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
  );
};
