import { useSyncExternalStore, type CSSProperties } from "react";

export type SubtitleEdge = "outline" | "shadow" | "box" | "none";
export interface SubtitlePrefs {
  languages: string[];
  preferredLang: string;
  fontScale: number;
  textColor: string;
  bgOpacity: number;
  edge: SubtitleEdge;
  bottomPercent: number;
  fontWeight: 500 | 700 | 900;
  hideHearingImpaired: boolean;
}

export const DEFAULT_SUBTITLE_PREFS: SubtitlePrefs = {
  languages: ["ar", "en", "fr"],
  preferredLang: "ar",
  fontScale: 1,
  textColor: "#ffffff",
  bgOpacity: 0,
  edge: "outline",
  bottomPercent: 9,
  fontWeight: 700,
  hideHearingImpaired: true,
};

const KEY = "nl_subtitle_prefs_v1";
const load = (): SubtitlePrefs => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_SUBTITLE_PREFS, ...JSON.parse(raw) } : DEFAULT_SUBTITLE_PREFS;
  } catch {
    return DEFAULT_SUBTITLE_PREFS;
  }
};

let prefs: SubtitlePrefs = load();
const listeners = new Set<() => void>();

export const getSubtitlePrefs = () => prefs;
export function setSubtitlePrefs(patch: Partial<SubtitlePrefs>): void {
  prefs = { ...prefs, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* private mode */ }
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => { listeners.delete(l); };
};
export const useSubtitlePrefs = () => useSyncExternalStore(subscribe, getSubtitlePrefs, getSubtitlePrefs);

export function buildSubtitleTextStyle(p: SubtitlePrefs): CSSProperties {
  const outline =
    "-1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000, 0 0 8px rgba(0,0,0,.85)";
  const shadow = "0 2px 6px rgba(0,0,0,.95), 0 0 2px rgba(0,0,0,.9)";
  const bg = p.edge === "box" ? Math.max(p.bgOpacity, 0.55) : p.bgOpacity;
  return {
    color: p.textColor,
    fontWeight: p.fontWeight,
    fontSize: `calc(clamp(15px, 3.1cqw, 44px) * ${p.fontScale})`,
    lineHeight: 1.35,
    textShadow: p.edge === "outline" ? outline : p.edge === "shadow" ? shadow : "none",
    background: bg > 0 ? `rgba(0,0,0,${bg})` : "transparent",
    unicodeBidi: "plaintext",
  };
}
