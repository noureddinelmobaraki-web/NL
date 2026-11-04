import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Loader2, Upload } from "lucide-react";
import type { ExtractedSubtitleTrack } from "../../../services/videoExtractor";
import { SUBTITLE_LANGUAGES, getLanguageLabel } from "./languages";
import { DEFAULT_SUBTITLE_PREFS, setSubtitlePrefs, useSubtitlePrefs, type SubtitleEdge } from "./subtitlePrefs";

type Tab = "tracks" | "style" | "sync" | "langs";
const COLORS = ["#ffffff", "#ffe066", "#a7f3d0", "#93c5fd", "#fca5a5"];
const EDGES: SubtitleEdge[] = ["outline", "shadow", "box", "none"];

export interface SubtitleSettingsPanelProps {
  tracks: ExtractedSubtitleTrack[];
  activeIdx: number | null;
  loadingIdx: number | null;
  isSearching: boolean;
  offsetSec: number;
  onSelect: (idx: number | null) => void;
  onOffsetChange: (next: number) => void;
  onUploadFile: (file: File) => void;
  onLanguagesChanged: (langs: string[]) => void;
}

export function SubtitleSettingsPanel(p: SubtitleSettingsPanelProps) {
  const { t } = useTranslation();
  const prefs = useSubtitlePrefs();
  const [tab, setTab] = useState<Tab>("tracks");
  const [draftLangs, setDraftLangs] = useState<string[]>(prefs.languages);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, Array<{ track: ExtractedSubtitleTrack; idx: number }>>();
    p.tracks.forEach((track, idx) => {
      const arr = map.get(track.lang) ?? [];
      arr.push({ track, idx });
      map.set(track.lang, arr);
    });
    return Array.from(map.entries());
  }, [p.tracks]);

  const row = "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] text-white/90 hover:bg-white/10 transition-colors cursor-pointer text-start";
  const chip = (on: boolean) =>
    `px-2.5 py-1 rounded-full text-[11px] font-bold border cursor-pointer ${on ? "bg-red-600/80 border-red-400 text-white" : "bg-white/5 border-white/15 text-white/75"}`;

  return (
    <div
      className="w-[min(360px,92vw)] max-h-[min(70vh,520px)] flex flex-col rounded-2xl border border-white/15 bg-black/55 backdrop-blur-2xl shadow-2xl overflow-hidden"
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-label={t("movies.subs.settings", "Subtitle settings")}
    >
      <div className="flex gap-1 p-2 border-b border-white/10">
        {(["tracks", "style", "sync", "langs"] as Tab[]).map((k) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={chip(tab === k)}>
            {t(`movies.subs.tab.${k}`, { tracks: "Tracks", style: "Style", sync: "Sync", langs: "Languages" }[k])}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {tab === "tracks" && (
          <div className="flex flex-col gap-1">
            <button type="button" className={row} onClick={() => p.onSelect(null)}>
              {p.activeIdx === null && <Check size={14} />} {t("movies.subs.off", "Subtitles off")}
            </button>
            {p.isSearching && (
              <div className="flex items-center gap-2 px-3 py-2 text-[11px] text-white/60">
                <Loader2 size={13} className="animate-spin" /> {t("movies.subs.searching", "Searching subtitles…")}
              </div>
            )}
            {!p.isSearching && groups.length === 0 && (
              <div className="px-3 py-2 text-[11px] text-white/60">{t("movies.subs.none", "No subtitles found")}</div>
            )}
            {groups.map(([lang, items]) => (
              <div key={lang} className="mt-1">
                <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white/50">
                  {getLanguageLabel(lang)} · {items.length}
                </div>
                {items.map(({ track, idx }, n) => (
                  <button key={track.id ?? idx} type="button" className={row} onClick={() => p.onSelect(idx)}>
                    <span className="w-4 shrink-0">
                      {p.loadingIdx === idx ? <Loader2 size={13} className="animate-spin" /> : p.activeIdx === idx ? <Check size={14} /> : null}
                    </span>
                    <span className="flex-1 truncate" dir="auto">{track.release || `${track.label} #${n + 1}`}</span>
                    {track.hearingImpaired && <span className="px-1.5 rounded bg-white/15 text-[9px]">CC</span>}
                    <span className="px-1.5 rounded bg-white/10 text-[9px] text-white/60">{track.provider ?? "src"}</span>
                  </button>
                ))}
              </div>
            ))}
            <button type="button" className={`${row} mt-2 border border-dashed border-white/20`} onClick={() => fileRef.current?.click()}>
              <Upload size={14} /> {t("movies.subs.upload", "Load subtitle file (.srt / .vtt)")}
            </button>
            <input
              ref={fileRef} type="file" accept=".srt,.vtt,text/vtt,application/x-subrip" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) p.onUploadFile(f); e.target.value = ""; }}
            />
          </div>
        )}

        {tab === "style" && (
          <div className="flex flex-col gap-3 p-2 text-[11px] text-white/80">
            <label className="flex flex-col gap-1">{t("movies.subs.size", "Size")} ({Math.round(prefs.fontScale * 100)}%)
              <input type="range" min={0.7} max={1.8} step={0.05} value={prefs.fontScale} onChange={(e) => setSubtitlePrefs({ fontScale: Number(e.target.value) })} className="accent-red-600" />
            </label>
            <div className="flex items-center gap-2">{t("movies.subs.color", "Color")}
              {COLORS.map((c) => (
                <button key={c} type="button" aria-label={c} onClick={() => setSubtitlePrefs({ textColor: c })}
                  className={`w-6 h-6 rounded-full border-2 ${prefs.textColor === c ? "border-red-500" : "border-white/30"}`} style={{ background: c }} />
              ))}
            </div>
            <label className="flex flex-col gap-1">{t("movies.subs.background", "Background")} ({Math.round(prefs.bgOpacity * 100)}%)
              <input type="range" min={0} max={0.9} step={0.05} value={prefs.bgOpacity} onChange={(e) => setSubtitlePrefs({ bgOpacity: Number(e.target.value) })} className="accent-red-600" />
            </label>
            <div className="flex flex-wrap gap-1.5">
              {EDGES.map((edge) => (
                <button key={edge} type="button" className={chip(prefs.edge === edge)} onClick={() => setSubtitlePrefs({ edge })}>
                  {t(`movies.subs.edge.${edge}`, edge)}
                </button>
              ))}
            </div>
            <label className="flex flex-col gap-1">{t("movies.subs.position", "Vertical position")}
              <input type="range" min={2} max={30} step={1} value={prefs.bottomPercent} onChange={(e) => setSubtitlePrefs({ bottomPercent: Number(e.target.value) })} className="accent-red-600" />
            </label>
            <button type="button" className={chip(false)} onClick={() => setSubtitlePrefs({ ...DEFAULT_SUBTITLE_PREFS, languages: prefs.languages, preferredLang: prefs.preferredLang })}>
              {t("movies.subs.reset", "Reset style")}
            </button>
          </div>
        )}

        {tab === "sync" && (
          <div className="flex flex-col gap-3 p-2 text-[11px] text-white/80">
            <div className="text-center text-lg font-black text-white" dir="ltr">
              {p.offsetSec > 0 ? "+" : ""}{p.offsetSec.toFixed(1)}s
            </div>
            <div className="grid grid-cols-3 gap-1.5" dir="ltr">
              {[-1, -0.5, -0.1, 0.1, 0.5, 1].map((d) => (
                <button key={d} type="button" className={chip(false)} onClick={() => p.onOffsetChange(Math.round((p.offsetSec + d) * 10) / 10)}>
                  {d > 0 ? `+${d}` : d}s
                </button>
              ))}
            </div>
            <button type="button" className={chip(false)} onClick={() => p.onOffsetChange(0)}>{t("movies.subs.resetSync", "Reset sync")}</button>
            <p className="text-white/55">{t("movies.subs.syncHint", "+ shows subtitles later, − shows them earlier.")}</p>
          </div>
        )}

        {tab === "langs" && (
          <div className="flex flex-col gap-3 p-2 text-[11px] text-white/80">
            <div className="flex flex-wrap gap-1.5">
              {SUBTITLE_LANGUAGES.map(({ code, label }) => {
                const on = draftLangs.includes(code);
                return (
                  <button key={code} type="button" className={chip(on)}
                    onClick={() => setDraftLangs((cur) => on ? (cur.length > 1 ? cur.filter((c) => c !== code) : cur) : cur.length < 8 ? [...cur, code] : cur)}>
                    {label}
                  </button>
                );
              })}
            </div>
            <label className="flex items-center gap-2">{t("movies.subs.preferred", "Preferred")}
              <select className="bg-black/60 border border-white/20 rounded-lg px-2 py-1" value={prefs.preferredLang}
                onChange={(e) => setSubtitlePrefs({ preferredLang: e.target.value })}>
                {draftLangs.map((c) => <option key={c} value={c}>{getLanguageLabel(c)}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={prefs.hideHearingImpaired} onChange={(e) => setSubtitlePrefs({ hideHearingImpaired: e.target.checked })} />
              {t("movies.subs.preferNonHI", "Prefer non-SDH versions")}
            </label>
            <button type="button" className="lg-cinema-primary-pill py-2 rounded-full text-white font-black"
              onClick={() => { setSubtitlePrefs({ languages: draftLangs }); p.onLanguagesChanged(draftLangs); }}>
              {t("movies.subs.apply", "Search again")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
