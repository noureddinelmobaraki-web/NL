import type React from "react";
import { useEffect } from "react";
import type { CinemaItem, Media } from "../moviesDataClient";

export interface UseCinemaDeepLinkArgs {
  selectedItemId: number | null;
  selectedMediaType: Media | null;
  detailedItem: CinemaItem | null;
  activeTab: "movies" | "series";
  setActiveTab: React.Dispatch<React.SetStateAction<"movies" | "series">>;
  selectedSeason: number;
  selectedEpisode: number;
  setSelectedItemId: (id: number | null, mediaType?: Media) => void;
  deepLinkSeRef: React.MutableRefObject<{
    itemId: number;
    s?: number;
    e?: number;
  } | null>;
}

export function useCinemaDeepLink({
  selectedItemId,
  selectedMediaType,
  detailedItem,
  activeTab,
  setActiveTab,
  selectedSeason,
  selectedEpisode,
  setSelectedItemId,
  deepLinkSeRef,
}: UseCinemaDeepLinkArgs): void {
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
  }, [deepLinkSeRef, setActiveTab, setSelectedItemId]);

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
  }, [
    selectedItemId,
    selectedMediaType,
    detailedItem?.mediaType,
    activeTab,
    selectedSeason,
    selectedEpisode,
  ]);
}
