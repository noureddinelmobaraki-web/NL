# Surgical AI Studio Prompt — NL Cinema True Direct-Interaction, Multi-Server Parallel Fusion, Zero-Sandbox & Auto-Hide Controls Overhaul

> **How to use this document:** Copy the entire prompt block below into **Google AI Studio** (`gemini-2.5-pro` / Coding Agent) to overwrite the previous broken changes (`AdShield`, `sandbox`, `ManualSyncBar`, `workerBridge` on embeds) and install the clean **Multi-Server Parallel Fusion & Direct-Interaction System**.

---

```markdown
# ROLE
You are a Principal TypeScript/React + Cloudflare Workers Architect. Perform SURGICAL changes on the "NL" repository (Vite + React 19 + TypeScript, hls.js, Vitest). Touch ONLY the files listed in the CHANGESET below. Preserve all existing behavior and unit-test contracts. Emit complete, production-ready code with zero placeholders or TODOs. TypeScript must compile cleanly in strict mode (`npx tsc --noEmit`).

# ROOT-CAUSE POSTMORTEM OF THE PREVIOUS BUILD (Verified From Live Screenshots)
1. **Why `VidLink` (`server-vl`) Displayed `"Please Disable Sandbox"`**:
   - `VidLink` (`vidlink.pro`) and all other cinema embed providers actively detect the `sandbox` attribute on their `<iframe>` and refuse to play if `sandbox` is present.
   - Furthermore, `VidLink` emits an initial `PLAYER_EVENT` (`00:01`) before blocking on the sandbox check, which tricked `sandboxPolicy.ts` into marking the sandbox verdict as `"ok"` and permanently locking the player on `"Please Disable Sandbox"`.
   - **Fix**: **NEVER** set a `sandbox` attribute on the player `<iframe>` (`sandbox` must be completely omitted).

2. **Why `AdShield` Blocked All Player Interaction (No Play Click, No Timeline Scrubbing)**:
   - `VidLink` (`vidlink.pro`) and the other embed servers (`streamimdb.ru`, `2embed.cc`, `2embed.skin`, `multiembed.mov`) have **one-way** `postMessage` communication (`player → parent` only). They do **NOT** accept inbound `play`, `pause`, or `seek` `postMessage` commands from the parent window!
   - Placing `<AdShield>` (`<div className="nl-adshield">`) over the `<iframe>` intercepted 100% of user clicks, making it impossible to click the player's own Play button, scrub its timeline, or change quality/subtitles inside the iframe.
   - **Fix**: Completely remove `<AdShield>` so the user interacts directly and naturally with the embedded player. Attach a lightweight `window.blur` focus-restorer to return keyboard/fullscreen focus to the main window when an iframe is clicked.

3. **Why `Server 2` (`2embed.skin`), `Server 1`, `Server 6`, and `Server 7` Failed With `Error Code: 232011` (`This video file cannot be played`)**:
   - Setting `workerBridge: true` rewrote their iframe `src` to `https://broad-block-7bd7.nordinegb2018.workers.dev/embed?url=...`. When JWPlayer/PlayerJS inside those servers requested the `.m3u8` stream from `2vcdn.skin` / CDN, the browser sent `Origin: https://...workers.dev` instead of the server's real domain, causing a `403 Forbidden` CDN rejection (`Error Code: 232011`).
   - **Fix**: Set `workerBridge` to `undefined` on all servers in `src/config/servers.ts` so every `<iframe>` loads its native embed URL directly. Use the Cloudflare Worker strictly as a **parallel background Multi-Server Stream & Subtitle Harvester (`POST /` + `/proxy`)**!

4. **Why the Subtitle Button (`AR`), External Timeline, and `Manual subtitle clock` Cluttered the Player**:
   - Every embed server (`VidLink`, `Server 7`, `Server 1`, `Server 2`, `Server 6`) **already renders its own built-in timeline scrub bar, Play/Pause controls, and built-in Subtitles (`CC`) menu inside the iframe**.
   - Rendering our external `SubtitleOverlay`, `AR` subtitle button, `-0.5s/+0.5s` buttons, `CinemaTimeline`, and the floating `Manual subtitle clock` (`ManualSyncBar`) on top of or below an `iframe` created duplicate controls and an intrusive floating bar over the video.
   - **Fix**:
     1. Completely remove `<ManualSyncBar>`.
     2. Hide `SubtitleOverlay`, `CinemaTimeline`, and the bottom subtitle/timeline control bar whenever `playerRenderMode !== "direct"` (i.e., when playing inside an `<iframe>` server that already has its own internal controls and subtitles).
     3. Render `CinemaTimeline`, `SubtitleOverlay`, and the `CC / AR` subtitle menu **ONLY when `playerRenderMode === "direct"`** (when the Cloudflare Worker extracts a raw `.m3u8` / `.mp4` stream and plays it in our custom HTML5 `<video>` element, which has no built-in server UI).

5. **Why Top Bar & Fullscreen Buttons Failed to Auto-Hide During Playback**:
   - In `MoviesPage.tsx`, `bumpControlsVisibility` checked `if (isAnyFullscreen && !isVideoPaused && !isSubtitleMenuOpen)` before starting the 3-second hide timer. Because `isVideoPaused` (`clockState.paused`) stays `true` on iframe servers that don't emit play state, `setIsControlsVisible(false)` **never fired**, leaving the buttons permanently covering the screen! Additionally, the top bar (`lg-cinema-gallery-top-bar`) and the CSS Fullscreen minimize button (`fixed top-4 right-4`) ignored `isControlsVisible`.
   - **Fix**: Auto-hide **all** floating and top controls (`lg-cinema-gallery-top-bar`, the CSS Fullscreen exit button, and the Fullscreen bottom bar) after `2500ms` of mouse/touch/keyboard inactivity whenever `isWatchingInGallery` is active (in `iframe` mode regardless of `isVideoPaused`, and in `direct` mode when playing), and immediately reveal them on any mouse movement, touch, keypress, or when hovering near the top/bottom edge of the player.

# MULTI-SERVER PARALLEL FUSION ARCHITECTURE
When the user clicks **Watch Now**:
1. **Instant Unblocked Iframe Mount (`0ms` delay)**: The fastest server from `buildSpeedSortedQueue` mounts immediately with its clean native URL (no `sandbox`, no `AdShield`, no `/embed` rewrite). `VidLink` (`server-vl`) reports `PLAYER_EVENT` / `MEDIA_DATA` in the background to `useIframePlayerBridge` so `Continue Watching` progress (`progressStore.ts`) is saved automatically every 10s and restored via `?startAt=<seconds>`.
2. **Parallel Multi-Server Stream & Subtitle Fusion (`cloudflare/worker.js` + `videoExtractor.ts`)**: Simultaneously in the background, the Cloudflare Worker probes all 5 servers (`streamimdb.ru`, `multiembed.mov/directstream.php` VIP endpoint, `2embed.cc`, `2embed.skin`, `vidlink.pro`) in parallel:
   - Extracts any direct `.m3u8` / `.mp4` video streams while preserving the exact inner-iframe `Referer` for `/proxy`.
   - Pools and fuses subtitle tracks (`.vtt` / `.srt` from `<track>`, JSON `{file,label}`, PlayerJS `[Lang]url`, and HLS `#EXT-X-MEDIA:TYPE=SUBTITLES`) discovered across **all** probed servers (`crossServerSubtitles`) together with Wyzie/OpenSubtitles tracks.
   - If a direct `.m3u8` / `.mp4` stream is extracted within `10s` while `clockNow() < 45`, `MoviesPage.tsx` seamlessly promotes playback to the ad-free native `<video>` player (`playerRenderMode === "direct"`) with the fused subtitles and custom `CinemaTimeline` + `SubtitleOverlay`! If no direct stream is exposed, playback continues uninterrupted in the clean native `<iframe>`.

# CHANGESET
| # | File Path | Status | Action |
|---|-----------|--------|--------|
| 1 | `src/config/servers.ts` | **MODIFIED** | Removes `sandbox`, `adShield`, and `workerBridge` from `CINEMA_SERVERS` so all 5 servers load cleanly without sandbox/232011 errors. |
| 2 | `src/features/cinema/player/sandboxPolicy.ts` | **MODIFIED / NEUTRALIZED** | Neutralizes `getIframeSandbox` to always return `undefined` (prevents any lingering import or test failure while guaranteeing zero sandbox). |
| 3 | `src/features/cinema/player/AdShield.tsx` | **MODIFIED / NEUTRALIZED** | Neutralizes `AdShield` to return `null` so it never blocks clicks. |
| 4 | `src/features/cinema/player/ManualSyncBar.tsx` | **MODIFIED / NEUTRALIZED** | Neutralizes `ManualSyncBar` to return `null` so the floating manual clock badge never appears over the player. |
| 5 | `src/features/cinema/subtitles/streamSubtitles.ts` | **MODIFIED** | HLS WebVTT playlist merger, `hlsTracksToSubtitleTracks`, `dedupeCues`, `mergeStreamFirst`, and `autoRetimeCues` for `direct` `<video>` mode. |
| 6 | `src/services/serverSpeedMonitor.ts` | **MODIFIED** | Fair speed ranking with full `securityRegression.test.ts` compatibility. |
| 7 | `src/services/videoExtractor.ts` | **MODIFIED** | Cross-server subtitle fusion (`crossServerSubtitles`) + `EXTRACTION_TIMEOUT_MS = 9_000` while preserving the exact 5-key subtitle object shape for unit tests. |
| 8 | `src/services/subtitleService.ts` | **MODIFIED** | Integrates `mergeHlsVttPlaylist` and `dedupeCues` into `ensureTrackLoaded`. |
| 9 | `cloudflare/worker.js` | **MODIFIED** | Parallel Multi-Server Stream + Cross-Server Subtitle Harvester (`expandMultiServerCandidates` with `multiembed.mov/directstream.php`, `unpackDeanEdwards`, `collectSubtitles`, and `globalSubsMap` pooling). |
| 10 | `src/components/Movies/MoviesPage.tsx` | **MODIFIED** | Removes `sandbox`, `AdShield`, and `ManualSyncBar`; shows external timeline & subtitle UI **only** in `direct` `<video>` mode; auto-hides all top/fullscreen buttons on inactivity during playback with edge-hover wake sensors. |
| 11 | `src/features/cinema/player/__tests__/sandboxPolicy.test.ts` | **MODIFIED** | Updates unit test to verify `getIframeSandbox` returns `undefined` (zero-sandbox policy). |

---

## 1) `src/config/servers.ts` — MODIFIED
Replace the entire file with:

```ts
// src/config/servers.ts
// Single source of truth for Cinema (Movies & TV Series) embed servers and their CSP frame-src origins.
// IMPORTANT: Keep index.html frame-src synchronized with ALL_SERVER_FRAME_ORIGINS (verified by scripts/check-csp.mjs).

export interface ServerIds {
  imdb?: string | null;
  tmdb?: string | number | null;
}

export interface SanitizedServerIds {
  imdb: string;
  tmdb: string;
  preferred: string;
}

export interface CinemaServerConfig {
  id: string;
  label: string;
  host: string;
  origins: string[];
  supports: {
    imdb: boolean;
    tmdb: boolean;
  };
  capabilities?: {
    /** Emits verifiable postMessage timeUpdate events (iframeBridge.ts). */
    timeEvents?: boolean;
    /** Supports ?startAt=<seconds> in embed URL. */
    startAt?: boolean;
    /** Route through Cloudflare Worker /embed HTMLRewriter bridge. */
    workerBridge?: boolean;
    adShield?: boolean;
    sandbox?: string;
  };
  timeoutMs: number;
  movie: (ids: ServerIds, opts?: { startAt?: number }) => string;
  tv: (
    ids: ServerIds,
    season?: number,
    episode?: number,
    fullSeason?: boolean,
    opts?: { startAt?: number },
  ) => string;
}

const IMDB_ID_REGEX = /^tt\d+$/;
const TMDB_ID_REGEX = /^\d+$/;

export function extractValidImdbId(raw?: string | null): string {
  if (!raw) return '';
  const trimmed = String(raw).trim();
  const match = trimmed.match(/(tt\d+)/);
  const candidate = match ? match[1] : trimmed;
  return IMDB_ID_REGEX.test(candidate) ? candidate : '';
}

export function extractValidTmdbId(raw?: string | number | null): string {
  if (raw === undefined || raw === null) return '';
  const candidate = String(raw).trim();
  return TMDB_ID_REGEX.test(candidate) ? candidate : '';
}

export function sanitizeServerIds(ids: ServerIds): SanitizedServerIds {
  const imdb = extractValidImdbId(ids.imdb);
  const tmdb = extractValidTmdbId(ids.tmdb);
  const preferred = imdb || tmdb;
  return {
    imdb: imdb ? encodeURIComponent(imdb) : '',
    tmdb: tmdb ? encodeURIComponent(tmdb) : '',
    preferred: preferred ? encodeURIComponent(preferred) : '',
  };
}

function normalizeSeasonEpisode(season?: number, episode?: number): { s: string; e: string } {
  const sNum = Number.isFinite(Number(season)) && Number(season) > 0 ? Math.floor(Number(season)) : 1;
  const eNum = Number.isFinite(Number(episode)) && Number(episode) > 0 ? Math.floor(Number(episode)) : 1;
  return {
    s: encodeURIComponent(String(sNum)),
    e: encodeURIComponent(String(eNum)),
  };
}

function vidlinkQuery(opts?: { startAt?: number }): string {
  const p = new URLSearchParams({
    primaryColor: 'dc2626',
    secondaryColor: 'a2a2a2',
    iconColor: 'eefdec',
    icons: 'default',
    player: 'default',
    title: 'false',
    poster: 'true',
    autoplay: 'true',
    nextbutton: 'true',
  });
  if (opts?.startAt && opts.startAt > 5) {
    p.set('startAt', String(Math.floor(opts.startAt)));
  }
  return p.toString();
}

export const SANDBOX_STRICT = undefined;

// Ordered with VidLink (server-vl) as the default primary server (index 0), and Servers 3, 4, 5 permanently removed.
// All servers load their native embed URLs without iframe sandbox or /embed proxy rewriting so they never trigger
// "Please Disable Sandbox" or JWPlayer Error 232011.
export const CINEMA_SERVERS: CinemaServerConfig[] = [
  {
    id: 'server-vl',
    label: 'VidLink',
    host: 'vidlink.pro',
    origins: ['https://vidlink.pro', 'https://player.vidlink.pro', 'https://cloud.vidlink.pro'],
    supports: { imdb: false, tmdb: true },
    capabilities: { timeEvents: true, startAt: true },
    timeoutMs: 12000,
    movie: (ids, opts) => {
      const { tmdb } = sanitizeServerIds(ids);
      return tmdb ? `https://vidlink.pro/movie/${tmdb}?${vidlinkQuery(opts)}` : '';
    },
    tv: (ids, season = 1, episode = 1, _fullSeason = false, opts) => {
      const { tmdb } = sanitizeServerIds(ids);
      if (!tmdb) return '';
      const { s, e } = normalizeSeasonEpisode(season, episode);
      return `https://vidlink.pro/tv/${tmdb}/${s}/${e}?${vidlinkQuery(opts)}`;
    },
  },
  {
    id: 'server-7',
    label: 'Server 7',
    host: 'streamimdb.ru',
    origins: ['https://streamimdb.ru', 'https://player.imdb.su'],
    supports: { imdb: true, tmdb: true },
    timeoutMs: 12000,
    movie: (ids) => {
      const { preferred } = sanitizeServerIds(ids);
      return preferred ? `https://streamimdb.ru/embed/movie/${preferred}` : '';
    },
    tv: (ids, season = 1, episode = 1) => {
      const { preferred } = sanitizeServerIds(ids);
      if (!preferred) return '';
      const { s, e } = normalizeSeasonEpisode(season, episode);
      return `https://streamimdb.ru/embed/tv/${preferred}/${s}/${e}`;
    },
  },
  {
    id: 'server-1',
    label: 'Server 1',
    host: '2embed.cc',
    origins: ['https://www.2embed.cc', 'https://2embed.cc', 'https://2vcdn.skin'],
    supports: { imdb: true, tmdb: true },
    timeoutMs: 12000,
    movie: (ids) => {
      const { preferred } = sanitizeServerIds(ids);
      return preferred ? `https://www.2embed.cc/embed/${preferred}` : '';
    },
    tv: (ids, season = 1, episode = 1, fullSeason = false) => {
      const { preferred } = sanitizeServerIds(ids);
      if (!preferred) return '';
      if (fullSeason) {
        return `https://www.2embed.cc/embedtvfull/${preferred}`;
      }
      const { s, e } = normalizeSeasonEpisode(season, episode);
      return `https://www.2embed.cc/embedtv/${preferred}&s=${s}&e=${e}`;
    },
  },
  {
    id: 'server-2',
    label: 'Server 2',
    host: '2embed.skin',
    origins: ['https://www.2embed.skin', 'https://2embed.skin', 'https://2vcdn.skin'],
    supports: { imdb: true, tmdb: true },
    timeoutMs: 12000,
    movie: (ids) => {
      const { preferred } = sanitizeServerIds(ids);
      return preferred ? `https://www.2embed.skin/embed/${preferred}` : '';
    },
    tv: (ids, season = 1, episode = 1, fullSeason = false) => {
      const { preferred } = sanitizeServerIds(ids);
      if (!preferred) return '';
      if (fullSeason) {
        return `https://www.2embed.skin/embedtvfull/${preferred}`;
      }
      const { s, e } = normalizeSeasonEpisode(season, episode);
      return `https://www.2embed.skin/embedtv/${preferred}&s=${s}&e=${e}`;
    },
  },
  {
    id: 'server-6',
    label: 'Server 6',
    host: 'multiembed.mov',
    origins: ['https://multiembed.mov', 'https://streamingnow.mov'],
    supports: { imdb: true, tmdb: true },
    timeoutMs: 12000,
    movie: (ids) => {
      const { imdb, tmdb } = sanitizeServerIds(ids);
      if (imdb) return `https://multiembed.mov/?video_id=${imdb}`;
      if (tmdb) return `https://multiembed.mov/?video_id=${tmdb}&tmdb=1`;
      return '';
    },
    tv: (ids, season = 1, episode = 1) => {
      const { imdb, tmdb } = sanitizeServerIds(ids);
      const { s, e } = normalizeSeasonEpisode(season, episode);
      if (imdb) return `https://multiembed.mov/?video_id=${imdb}&s=${s}&e=${e}`;
      if (tmdb) return `https://multiembed.mov/?video_id=${tmdb}&tmdb=1&s=${s}&e=${e}`;
      return '';
    },
  },
];

export const ALL_SERVER_FRAME_ORIGINS: string[] = Array.from(
  new Set(CINEMA_SERVERS.flatMap((srv) => srv.origins)),
);

export const isTimeEventServer = (
  server?: { capabilities?: { timeEvents?: boolean } } | null,
): boolean => Boolean(server?.capabilities?.timeEvents);

export function toWorkerEmbedUrl(
  rawUrl: string,
  workerEndpoint: string,
  parentOrigin: string,
): string {
  if (!rawUrl || !workerEndpoint) return rawUrl;
  try {
    const base = workerEndpoint.replace(/\/+$/, '');
    const u = new URL(`${base}/embed`);
    u.searchParams.set('url', rawUrl);
    u.searchParams.set('parent', parentOrigin);
    u.searchParams.set('depth', '0');
    return u.toString();
  } catch {
    return rawUrl;
  }
}
```

---

## 2) `src/features/cinema/player/sandboxPolicy.ts` — MODIFIED / NEUTRALIZED
If `src/features/cinema/player/sandboxPolicy.ts` exists in the repo, replace its entire contents with the following zero-sandbox implementation (so no `sandbox` attribute is ever applied to any cinema iframe):

```ts
// src/features/cinema/player/sandboxPolicy.ts
import type { CinemaServerConfig } from "../../../config/servers";

export const SANDBOX_STORAGE_KEY = "nl_cinema_sandbox_v1";
export const AD_SHIELD_PREF_KEY = "nl_cinema_adshield_v1";
export const SANDBOX_PROBE_MS = 10_000;
export const SANDBOX_ESCAPE_HINT_MS = 6_000;

export type SandboxVerdict = "ok" | "refused";
type ServerLike = Pick<CinemaServerConfig, "id" | "capabilities"> | null | undefined;

/** Always returns undefined: embed servers actively block iframe[sandbox] ("Please Disable Sandbox"). */
export function getIframeSandbox(_server?: ServerLike): string | undefined {
  return undefined;
}

export function getSandboxVerdict(_serverId: string): SandboxVerdict | null {
  return null;
}

export function markSandboxVerdict(_serverId: string, _v: SandboxVerdict): void {}

export function clearSandboxVerdict(_serverId: string): void {}

export function getAdShieldEnabled(): boolean {
  return false;
}

export function setAdShieldEnabled(_enabled: boolean): void {}
```

---

## 3) `src/features/cinema/player/AdShield.tsx` — MODIFIED / NEUTRALIZED
If `src/features/cinema/player/AdShield.tsx` exists in the repo, replace its entire contents with this clean no-op component so pointer events always reach the player directly:

```tsx
// src/features/cinema/player/AdShield.tsx
export interface AdShieldProps {
  active?: boolean;
  onTogglePlay?: () => void;
  onSeekRelative?: (deltaSec: number) => void;
  onToggleFullscreen?: () => void;
  onActivity?: () => void;
  labels?: { armed: string; passThrough: string; passThroughHint: string };
  passThroughMs?: number;
}

export function AdShield(_props: AdShieldProps) {
  return null;
}
```

---

## 4) `src/features/cinema/player/ManualSyncBar.tsx` — MODIFIED / NEUTRALIZED
If `src/features/cinema/player/ManualSyncBar.tsx` exists in the repo, replace its entire contents with this clean no-op component so no floating manual subtitle clock card appears over the video player:

```tsx
// src/features/cinema/player/ManualSyncBar.tsx
export function ManualSyncBar(_props: { visible?: boolean; label?: string }) {
  return null;
}
```

---

## 5) `src/features/cinema/subtitles/streamSubtitles.ts` — MODIFIED
Ensure `src/features/cinema/subtitles/streamSubtitles.ts` contains the following complete implementation for `direct` `<video>` mode subtitle merging and 25↔23.976fps auto-retiming:

```ts
// src/features/cinema/subtitles/streamSubtitles.ts
import type { ExtractedSubtitleTrack, SubtitleCue } from "../../../services/videoExtractor";
import { getLanguageLabel, normalizeLangCode } from "./languages";

const MAX_SEGMENTS = 1500;
const CONCURRENCY = 12;

export function isHlsPlaylistText(text: string): boolean {
  return /^\uFEFF?\s*#EXTM3U/.test(text);
}

export function stripVttHeader(raw: string): string {
  const t = raw.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  if (!/^WEBVTT/.test(t)) return t.trim();
  const idx = t.indexOf("\n\n");
  return idx === -1 ? "" : t.slice(idx + 2).trim();
}

function firstSubtitleMediaUri(text: string): string | null {
  for (const line of text.split("\n")) {
    if (!line.startsWith("#EXT-X-MEDIA:") || !/TYPE=SUBTITLES/i.test(line)) continue;
    const m = line.match(/URI="([^"]+)"/i);
    if (m) return m[1];
  }
  return null;
}

export async function mergeHlsVttPlaylist(
  playlistText: string,
  baseUrl: string,
  fetchText: (url: string) => Promise<string>,
  depth = 0,
): Promise<string> {
  const text = playlistText.replace(/\r\n?/g, "\n");
  const childUri = firstSubtitleMediaUri(text);
  if (childUri && depth < 1) {
    const childUrl = new URL(childUri, baseUrl).href;
    return mergeHlsVttPlaylist(await fetchText(childUrl), childUrl, fetchText, depth + 1);
  }
  const segs = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .slice(0, MAX_SEGMENTS)
    .map((l) => {
      try {
        return new URL(l, baseUrl).href;
      } catch {
        return "";
      }
    })
    .filter(Boolean);
  if (!segs.length) throw new Error("Empty HLS subtitle playlist");

  const parts: string[] = new Array(segs.length).fill("");
  let cursor = 0;
  const run = async () => {
    while (cursor < segs.length) {
      const i = cursor;
      cursor += 1;
      try {
        parts[i] = stripVttHeader(await fetchText(segs[i]));
      } catch {
        parts[i] = "";
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, segs.length) }, run));
  const body = parts.filter(Boolean).join("\n\n");
  if (!body.trim()) throw new Error("HLS subtitle segments empty");
  return `WEBVTT\n\n${body}\n`;
}

export function dedupeCues(cues: SubtitleCue[]): SubtitleCue[] {
  const seen = new Set<string>();
  return cues.filter((c) => {
    const k = `${Math.round(c.start * 10)}|${Math.round(c.end * 10)}|${c.text}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const FPS_FIXES = [23.976 / 25, 24 / 25];

export function autoRetimeCues(
  cues: SubtitleCue[],
  mediaDurationSec: number,
): { cues: SubtitleCue[]; factor: number } {
  if (!cues.length || !(mediaDurationSec > 600)) return { cues, factor: 1 };
  const maxEnd = cues.reduce((m, c) => Math.max(m, c.end), 0);
  if (maxEnd <= mediaDurationSec * 1.01) return { cues, factor: 1 };
  const inv = mediaDurationSec / maxEnd;
  let best = 1;
  let bestErr = Infinity;
  for (const f of FPS_FIXES) {
    if (maxEnd * f > mediaDurationSec * 1.01) continue;
    const err = Math.abs(f - inv);
    if (err < bestErr) {
      bestErr = err;
      best = f;
    }
  }
  if (best === 1 || bestErr > 0.05) return { cues, factor: 1 };
  return { cues: cues.map((c) => ({ ...c, start: c.start * best, end: c.end * best })), factor: best };
}

interface HlsSubtitleLike {
  url?: string;
  lang?: string;
  name?: string;
}

export function hlsTracksToSubtitleTracks(hls: { subtitleTracks?: HlsSubtitleLike[] }): ExtractedSubtitleTrack[] {
  const list = Array.isArray(hls.subtitleTracks) ? hls.subtitleTracks : [];
  return list
    .filter((t) => typeof t?.url === "string" && t.url)
    .map((t, i): ExtractedSubtitleTrack => {
      const lang = normalizeLangCode(t.lang || t.name);
      return {
        id: `stream:${i}:${lang}`,
        provider: "stream",
        lang,
        label: `${getLanguageLabel(lang)} · Stream`,
        release: String(t.name || "").slice(0, 120),
        remoteUrl: t.url as string,
        url: "",
        proxiedUrl: "",
        loaded: false,
      };
    });
}

export function mergeStreamFirst(
  stream: ExtractedSubtitleTrack[],
  rest: ExtractedSubtitleTrack[],
): ExtractedSubtitleTrack[] {
  const seenKeys = new Set<string>();
  const out: ExtractedSubtitleTrack[] = [];
  for (const t of [...stream, ...rest]) {
    const key = t.id || `${t.lang}:${t.remoteUrl || t.proxiedUrl || t.url}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    out.push(t);
  }
  return out;
}
```

---

## 6) `src/services/serverSpeedMonitor.ts` — MODIFIED
Replace the entire file with:

```ts
// src/services/serverSpeedMonitor.ts

export interface ServerSpeedMetric {
  serverId: string;
  ewmaLatencyMs: number;
  lastLatencyMs: number;
  successCount: number;
  failureCount: number;
  lastUpdatedAt: number;
}

interface StoredSpeedState {
  metrics: Record<string, ServerSpeedMetric>;
  byTitle: Record<string, string>;
}

const SPEED_STORAGE_KEY = "nl_cinema_server_speed_v2";
const DEFAULT_BASELINE_MS = 2600;
const FAILURE_PENALTY_MS = 4500;
const EWMA_ALPHA = 0.38;

function readStorage(): StoredSpeedState {
  try {
    const raw = localStorage.getItem(SPEED_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    const metrics =
      parsed && typeof parsed.metrics === "object" && parsed.metrics !== null
        ? { ...parsed.metrics }
        : {};
    const byTitle =
      parsed && typeof parsed.byTitle === "object" && parsed.byTitle !== null
        ? { ...parsed.byTitle }
        : {};
    return { metrics, byTitle };
  } catch {
    return { metrics: {}, byTitle: {} };
  }
}

function writeStorage(state: StoredSpeedState): void {
  try {
    localStorage.setItem(SPEED_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore private browsing / quota errors
  }
}

export function recordServerSuccess(
  serverId: string,
  durationMs: number,
  titleKey?: string,
): void {
  if (!serverId) return;
  const clampedMs = Math.max(120, Math.min(25_000, Math.round(durationMs || 1200)));
  const state = readStorage();
  const prev = state.metrics[serverId];

  const ewmaLatencyMs = prev
    ? Math.round(EWMA_ALPHA * clampedMs + (1 - EWMA_ALPHA) * prev.ewmaLatencyMs)
    : clampedMs;

  state.metrics[serverId] = {
    serverId,
    ewmaLatencyMs,
    lastLatencyMs: clampedMs,
    successCount: (prev?.successCount || 0) + 1,
    failureCount: Math.max(0, (prev?.failureCount || 0) - 1),
    lastUpdatedAt: Date.now(),
  };

  if (titleKey) {
    if (serverId === "server-vl" || state.byTitle[titleKey] !== "server-vl") {
      state.byTitle[titleKey] = serverId;
    }
  }

  writeStorage(state);
}

export function recordServerFailure(serverId: string): void {
  if (!serverId) return;
  const state = readStorage();
  const prev = state.metrics[serverId];
  const base = prev?.ewmaLatencyMs ?? DEFAULT_BASELINE_MS;
  const penalized = Math.min(30_000, Math.round(base + FAILURE_PENALTY_MS));

  state.metrics[serverId] = {
    serverId,
    ewmaLatencyMs: penalized,
    lastLatencyMs: penalized,
    successCount: prev?.successCount || 0,
    failureCount: (prev?.failureCount || 0) + 1,
    lastUpdatedAt: Date.now(),
  };

  writeStorage(state);
}

export function getServerPriorityScore(
  serverId: string,
  defaultIndex: number,
  state?: StoredSpeedState,
): number {
  const current = state || readStorage();
  const metric = current.metrics[serverId];
  if (!metric) {
    return DEFAULT_BASELINE_MS + defaultIndex * 180;
  }
  const reliabilityBonus = Math.min(600, metric.successCount * 85);
  const failurePenalty = metric.failureCount * 1400;
  return metric.ewmaLatencyMs - reliabilityBonus + failurePenalty;
}

export function sortSourcesBySpeed<
  T extends { id: string; capabilities?: { timeEvents?: boolean } },
>(sources: T[], titleKey?: string): T[] {
  if (!Array.isArray(sources) || sources.length <= 1) return sources;
  const state = readStorage();
  const preferredForTitle = titleKey ? state.byTitle[titleKey] : undefined;
  const hasTmdb = Boolean(
    titleKey && (titleKey.startsWith("movie_") || titleKey.startsWith("tv_")),
  );

  return [...sources]
    .map((src, originalIdx) => {
      let score = getServerPriorityScore(src.id, originalIdx, state);
      const metric = state.metrics[src.id];
      const hasFailed = Boolean(
        metric && metric.failureCount > metric.successCount,
      );

      const isTimeEvents =
        src.capabilities?.timeEvents === true ||
        (hasTmdb && src.id === "server-vl");

      const bucket = isTimeEvents && !hasFailed ? 0 : 1;

      if (isTimeEvents && !hasFailed) {
        score -= 5000;
      }

      if (
        preferredForTitle &&
        src.id === preferredForTitle &&
        !hasFailed
      ) {
        score -= 750;
      }
      return { src, originalIdx, bucket, score };
    })
    .sort((a, b) => {
      if (a.bucket !== b.bucket) return a.bucket - b.bucket;
      if (a.score !== b.score) return a.score - b.score;
      return a.originalIdx - b.originalIdx;
    })
    .map((entry) => entry.src);
}

export function buildSpeedSortedQueue<
  T extends { id: string; capabilities?: { timeEvents?: boolean } },
>(sources: T[], titleKey?: string): number[] {
  if (!Array.isArray(sources) || sources.length === 0) return [0];
  const sorted = sortSourcesBySpeed(sources, titleKey);
  return sorted
    .map((s) => sources.findIndex((orig) => orig.id === s.id))
    .filter((idx) => idx >= 0);
}
```

---

## 7) `src/services/videoExtractor.ts` — MODIFIED (Multi-Server Stream + Cross-Server Subtitle Fusion)
Replace the entire file with the following implementation. Notice how `fetchExtractedVideos` pools subtitles across ALL `rawResults` (`crossServerSubtitles`) so even if Server A provides the `.m3u8` stream and Server B provides the `.vtt`/`.srt` subtitle track, they are fused together automatically, while strictly preserving the 5-key subtitle object shape asserted in `src/utils/securityRegression.test.ts`:

```ts
// src/services/videoExtractor.ts

export const WORKER_ENDPOINT = "https://broad-block-7bd7.nordinegb2018.workers.dev/";

export interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

export interface ExtractedSubtitleTrack {
  id?: string;
  url: string;
  proxiedUrl: string;
  lang: string;
  label: string;
  default?: boolean;
  cues?: SubtitleCue[];
  provider?: "wyzie" | "opensubtitles" | "worker" | "local" | "stream";
  release?: string;
  hearingImpaired?: boolean;
  remoteUrl?: string;
  osFileId?: number;
  loaded?: boolean;
}

export interface ExtractedVideoStream {
  sourcePage: string;
  type: "hls" | "mp4" | "dash" | "clean-embed" | string;
  directUrl: string;
  proxiedUrl: string;
  subtitles?: ExtractedSubtitleTrack[];
}

interface RawSubtitleItem {
  url?: string;
  file?: string;
  src?: string;
  referer?: string;
  lang?: string;
  srclang?: string;
  language?: string;
  label?: string;
  name?: string;
  default?: boolean;
}

interface WorkerPageResult {
  source?: string;
  count?: number;
  iframes_scanned?: string[];
  subtitles?: Array<RawSubtitleItem | string>;
  tracks?: Array<RawSubtitleItem | string>;
  captions?: Array<RawSubtitleItem | string>;
  videos?: Array<{
    type?: string;
    directUrl?: string;
    proxiedUrl?: string;
    subtitles?: Array<RawSubtitleItem | string>;
    tracks?: Array<RawSubtitleItem | string>;
  }>;
}

interface WorkerResponsePayload {
  total_pages?: number;
  results?: WorkerPageResult | WorkerPageResult[];
}

const SESSION_EXTRACTION_CACHE = new Map<
  string,
  { timestamp: number; streams: ExtractedVideoStream[] }
>();
const CACHE_TTL_MS = 1000 * 60 * 15; // 15 minutes
export const EXTRACTION_TIMEOUT_MS = 9_000;

export function buildWorkerProxyUrl(targetUrl: string, refererUrl?: string): string {
  if (!targetUrl) return "";
  if (targetUrl.startsWith(WORKER_ENDPOINT)) return targetUrl;
  try {
    const proxyEndpoint = new URL("/proxy", WORKER_ENDPOINT);
    proxyEndpoint.searchParams.set("videoUrl", targetUrl);
    if (refererUrl) {
      proxyEndpoint.searchParams.set("referer", refererUrl);
    }
    return proxyEndpoint.toString();
  } catch {
    return targetUrl;
  }
}

export function guessLangFromLabelOrUrl(label: string, url: string): { lang: string; label: string } {
  const combined = `${label} ${url}`.toLowerCase();
  if (combined.includes("arab") || combined.includes("عرب") || /([._/-])ar([._/-]|$)/i.test(combined)) {
    return { lang: "ar", label: label || "العربية" };
  }
  if (combined.includes("eng") || /([._/-])en([._/-]|$)/i.test(combined)) {
    return { lang: "en", label: label || "English" };
  }
  if (combined.includes("fre") || combined.includes("fra") || /([._/-])fr([._/-]|$)/i.test(combined)) {
    return { lang: "fr", label: label || "Français" };
  }
  if (combined.includes("spa") || combined.includes("esp") || /([._/-])es([._/-]|$)/i.test(combined)) {
    return { lang: "es", label: label || "Español" };
  }
  return {
    lang: "en",
    label: label || "Subtitles",
  };
}

function expandRawSubtitleEntries(rawList: Array<RawSubtitleItem | string>): Array<RawSubtitleItem | string> {
  const expanded: Array<RawSubtitleItem | string> = [];
  for (const item of rawList) {
    if (typeof item === "string" && item.includes("[")) {
      const re = /\[([^\]]{1,40})\](https?:\/\/[^\s"',\]]+\.(?:vtt|srt)(?:\?[^\s"',\]]*)?)/gi;
      let matched = false;
      let m: RegExpExecArray | null;
      while ((m = re.exec(item)) !== null) {
        matched = true;
        expanded.push({ label: m[1].trim(), url: m[2].trim() });
      }
      if (!matched) expanded.push(item);
    } else {
      expanded.push(item);
    }
  }
  return expanded;
}

function extractSubtitlesFromResult(
  pageResult: WorkerPageResult,
  videoItem?: { subtitles?: Array<RawSubtitleItem | string>; tracks?: Array<RawSubtitleItem | string> },
  crossServerItems: Array<RawSubtitleItem | string> = [],
): ExtractedSubtitleTrack[] {
  const rawList: Array<RawSubtitleItem | string> = expandRawSubtitleEntries([
    ...(Array.isArray(videoItem?.subtitles) ? videoItem.subtitles : []),
    ...(Array.isArray(videoItem?.tracks) ? videoItem.tracks : []),
    ...(Array.isArray(pageResult.subtitles) ? pageResult.subtitles : []),
    ...(Array.isArray(pageResult.tracks) ? pageResult.tracks : []),
    ...(Array.isArray(pageResult.captions) ? pageResult.captions : []),
    ...crossServerItems,
  ]);

  if (Array.isArray(pageResult.videos)) {
    for (const v of pageResult.videos) {
      const candidate = v?.directUrl || v?.proxiedUrl || "";
      if (/\.(vtt|srt)(\?|#|$)/i.test(candidate)) {
        rawList.push({
          url: v.directUrl || candidate,
          label: "Subtitles",
        });
      }
    }
  }

  const seenUrls = new Set<string>();
  const tracks: ExtractedSubtitleTrack[] = [];

  for (const item of rawList) {
    if (!item) continue;
    const rawUrl =
      typeof item === "string"
        ? item
        : item.url || item.file || item.src || "";
    if (!rawUrl || typeof rawUrl !== "string") continue;
    const trimmed = rawUrl.trim();
    if (!trimmed || seenUrls.has(trimmed)) continue;
    seenUrls.add(trimmed);

    const rawLabel =
      typeof item === "object"
        ? item.label || item.name || item.language || item.lang || item.srclang || ""
        : "";
    const guessed = guessLangFromLabelOrUrl(rawLabel, trimmed);
    const langCode =
      typeof item === "object" && (item.srclang || item.lang)
        ? String(item.srclang || item.lang)
        : guessed.lang;
    const referer =
      typeof item === "object" && item.referer ? item.referer : pageResult.source;

    tracks.push({
      url: trimmed,
      proxiedUrl: buildWorkerProxyUrl(trimmed, referer),
      lang: langCode,
      label: guessed.label,
      default:
        (typeof item === "object" && Boolean(item.default)) ||
        langCode === "ar" ||
        tracks.length === 0,
    });
  }

  tracks.sort((a, b) => (a.lang === "ar" ? -1 : b.lang === "ar" ? 1 : 0));
  return tracks;
}

export async function fetchExtractedVideos(
  targetUrls: string | string[],
  signal?: AbortSignal,
): Promise<ExtractedVideoStream[]> {
  const urlsArray = (Array.isArray(targetUrls) ? targetUrls : [targetUrls]).filter(
    (u) => typeof u === "string" && u.trim().length > 0,
  );

  if (urlsArray.length === 0) {
    throw new Error("قائمة الروابط الممررة فارغة.");
  }

  const cacheKey = urlsArray.join("|");
  const cached = SESSION_EXTRACTION_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS && cached.streams.length > 0) {
    return cached.streams;
  }

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), EXTRACTION_TIMEOUT_MS);
  const onExternalAbort = () => timeoutController.abort();
  signal?.addEventListener("abort", onExternalAbort, { once: true });

  try {
    const response = await fetch(WORKER_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        urls: urlsArray,
      }),
      signal: timeoutController.signal,
    });

    if (!response.ok) {
      throw new Error(`فشل الاتصال بالـ Worker: HTTP ${response.status}`);
    }

    const data = (await response.json()) as WorkerResponsePayload;
    const rawResults = Array.isArray(data.results) ? data.results : [data.results];

    // Cross-Server Subtitle Pool: harvest subtitles from all probed servers so any server's video stream gets them
    const crossServerSubs: Array<RawSubtitleItem | string> = [];
    if (rawResults.length > 1) {
      for (const pr of rawResults) {
        if (!pr) continue;
        const pageRef = pr.source;
        for (const list of [pr.subtitles, pr.tracks, pr.captions]) {
          if (!Array.isArray(list)) continue;
          for (const it of list) {
            if (typeof it === "string") {
              crossServerSubs.push({ url: it, referer: pageRef });
            } else if (it && typeof it === "object") {
              crossServerSubs.push({ ...it, referer: it.referer || pageRef });
            }
          }
        }
      }
    }

    const extractedVideos: ExtractedVideoStream[] = [];

    for (const pageResult of rawResults) {
      if (!pageResult) continue;

      if (Array.isArray(pageResult.videos)) {
        for (const video of pageResult.videos) {
          if (!video || (!video.proxiedUrl && !video.directUrl)) continue;
          const candidateUrl = video.directUrl || video.proxiedUrl || "";
          if (/\.(vtt|srt)(\?|#|$)/i.test(candidateUrl)) continue;

          const directUrl = video.directUrl || video.proxiedUrl || "";
          const proxiedUrl =
            video.proxiedUrl ||
            buildWorkerProxyUrl(directUrl, pageResult.source) ||
            directUrl;

          extractedVideos.push({
            sourcePage: pageResult.source || "",
            type: video.type || (directUrl.toLowerCase().includes(".m3u8") ? "hls" : "mp4"),
            directUrl,
            proxiedUrl,
            subtitles: extractSubtitlesFromResult(pageResult, video, crossServerSubs),
          });
        }
      }
    }

    if (extractedVideos.length > 0) {
      SESSION_EXTRACTION_CACHE.set(cacheKey, {
        timestamp: Date.now(),
        streams: extractedVideos,
      });
    }

    return extractedVideos;
  } catch (error) {
    console.error("خطأ في استخراج الفيديو عبر الـ Worker:", error);
    throw error;
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", onExternalAbort);
  }
}
```

---

## 8) `src/services/subtitleService.ts` — MODIFIED
Ensure `ensureTrackLoaded` in `src/services/subtitleService.ts` merges HLS WebVTT playlists and deduplicates cues when loading direct stream tracks:

```ts
import { dedupeCues, isHlsPlaylistText, mergeHlsVttPlaylist } from "../features/cinema/subtitles/streamSubtitles";
```
Inside `ensureTrackLoaded`:
```ts
export function ensureTrackLoaded(track: ExtractedSubtitleTrack, signal?: AbortSignal): Promise<ExtractedSubtitleTrack> {
  if (track.loaded !== false && Array.isArray(track.cues) && track.cues.length) return Promise.resolve(track);
  const key = track.id || track.remoteUrl || track.proxiedUrl || track.url;
  const existing = INFLIGHT.get(key);
  if (existing) return existing;
  const p = (async () => {
    const src = track.remoteUrl || track.proxiedUrl || track.url;
    let text =
      track.provider === "opensubtitles" && typeof track.osFileId === "number"
        ? await downloadOpenSubtitles(track.osFileId, track.lang, signal)
        : await fetchSubtitleText(src, track.lang, signal);
    if (isHlsPlaylistText(text)) {
      text = await mergeHlsVttPlaylist(text, src, (u) => fetchSubtitleText(u, track.lang, signal));
    }
    let cues = parseSubtitleCues(text);
    if (track.provider === "stream" || track.provider === "worker" || !track.provider) {
      cues = dedupeCues(cues);
    }
    if (!cues.length) throw new Error("Subtitle has no cues");
    const blob = cuesToVttBlobUrl(cues);
    track.cues = cues;
    track.url = blob;
    track.proxiedUrl = blob;
    track.loaded = true;
    return track;
  })().finally(() => INFLIGHT.delete(key));
  INFLIGHT.set(key, p);
  return p;
}
```

---

## 9) `cloudflare/worker.js` — MODIFIED
Replace the entire contents of `cloudflare/worker.js` with:

```js
// NL Worker — broad-block-7bd7 (ملف واحد يُلصق في لوحة Cloudflare)
// Routes: / (Multi-Server Parallel Stream + Subtitle Harvester) · /embed · /proxy · /subs/search · /subs/file · /trailer/imdb · /meta/omdb · /tmdb/3/* · /health
// Secrets (اختيارية حسب المسار): WYZIE_KEY, OMDB_KEY, TMDB_KEY  | KV binding (اختياري ومستحسن): NL_CACHE
// Variable اختياري: ALLOWED_ORIGINS = "https://a.com,https://b.com"

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const DEFAULT_ALLOWED_ORIGINS = [
  "https://noureddinelmobaraki-web.github.io",
  "http://localhost:3000",
  "http://localhost:5173",
];
const MAX_PAGES = 6;
const EXTRACT_TIMEOUT_TOP_MS = 4200;
const EXTRACT_TIMEOUT_NESTED_MS = 3200;
const MAX_SUBTITLES = 24;
const SUB_URL_RE = /https?:\/\/[^\s"'<>\\]+\.(?:vtt|srt)(?:\?[^\s"'<>\\]*)?/gi;
const TRACK_TAG_RE = /<track\b[^>]*>/gi;
const JSON_TRACK_RE = /\{[^{}]{0,400}?["']?(?:file|src|url)["']?\s*:\s*["']([^"']+\.(?:vtt|srt)(?:\?[^"']*)?)["'][^{}]{0,400}?\}/gi;
const PLAYERJS_SUB_RE = /\[([^\]]{1,40})\](https?:\/\/[^\s"',\]]+\.(?:vtt|srt)(?:\?[^\s"',\]]*)?)/gi;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Expose-Headers": "*",
};

export default {
  async fetch(request, env, ctx) {
    const reqUrl = new URL(request.url);
    const workerOrigin = reqUrl.origin;
    const path = reqUrl.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { ...CORS, "Access-Control-Max-Age": "86400" } });
    }
    if (path === "/health") {
      return jsonResponse({
        ok: true,
        kvCache: Boolean(env.NL_CACHE),
        secrets: { wyzie: Boolean(env.WYZIE_KEY), omdb: Boolean(env.OMDB_KEY), tmdb: Boolean(env.TMDB_KEY) },
        time: new Date().toISOString(),
      });
    }
    if (!isAllowedCaller(request, env)) return jsonResponse({ error: "origin_not_allowed" }, 403);

    try {
      if (path === "/proxy") return await handleProxy(request, reqUrl, workerOrigin);
      if (path === "/subs/search") return await withCache(request, env, ctx, 3600, () => wyzieSearch(reqUrl, env, workerOrigin));
      if (path === "/subs/file") return await withCache(request, env, ctx, 86400, () => wyzieFile(reqUrl, env));
      if (path === "/trailer/imdb") return await withCache(request, env, ctx, 604800, () => imdbTrailer(reqUrl));
      if (path === "/meta/omdb") return await withCache(request, env, ctx, 86400, () => omdbMeta(reqUrl, env));
      if (path.startsWith("/tmdb/3/")) return await withCache(request, env, ctx, tmdbTtl(path), () => tmdbProxy(reqUrl, env));
      if (path === "/embed") return await handleEmbed(request, reqUrl, workerOrigin, env);
      return await handleExtract(request, reqUrl, workerOrigin);
    } catch (err) {
      return jsonResponse({ error: "worker_failed", detail: String((err && err.message) || err) }, 502);
    }
  },
};

/* ---------------- أمان ---------------- */

function isAllowedOriginUrl(originStr, workerOrigin, list) {
  if (!originStr) return true;
  if (originStr === workerOrigin || list.includes(originStr)) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(originStr)) return true;
  if (/^https:\/\/([a-z0-9-]+\.)*(cloudflare\.com|workers\.dev)$/i.test(originStr)) return true;
  return false;
}

function isAllowedCaller(request, env) {
  const list = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(",").map((s) => s.trim()) : DEFAULT_ALLOWED_ORIGINS;
  const workerOrigin = new URL(request.url).origin;
  const origin = request.headers.get("Origin");
  if (origin) return isAllowedOriginUrl(origin, workerOrigin, list);
  const ref = request.headers.get("Referer");
  if (ref) {
    try {
      const refOrigin = new URL(ref).origin;
      return isAllowedOriginUrl(refOrigin, workerOrigin, list);
    } catch {
      return false;
    }
  }
  return true;
}

function safeTarget(raw) {
  let u;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const h = u.hostname.toLowerCase();
  if (h === "localhost" || h === "[::1]" || h.endsWith(".local") || h.endsWith(".internal") ||
      /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h)) return null;
  return u;
}

/* ---------------- كاش (KV إن وُجد، وإلا Cache API) ---------------- */

async function withCache(request, env, ctx, ttl, producer) {
  if (request.method !== "GET") return producer();
  const keyUrl = new URL(request.url);
  keyUrl.searchParams.sort();
  const k = keyUrl.pathname + "?" + keyUrl.searchParams.toString();

  if (env.NL_CACHE) {
    const { value, metadata } = await env.NL_CACHE.getWithMetadata(k, "arrayBuffer");
    if (value) {
      return new Response(value, {
        headers: { "Content-Type": (metadata && metadata.c) || "application/json; charset=utf-8",
                   "Cache-Control": `public, max-age=${ttl}`, "X-NL-Cache": "HIT", ...CORS },
      });
    }
  } else {
    const hit = await caches.default.match(new Request(keyUrl.toString()));
    if (hit) return hit;
  }

  const res = await producer();
  if (res.status === 200) {
    if (env.NL_CACHE) {
      const buf = await res.clone().arrayBuffer();
      const c = res.headers.get("Content-Type") || "text/plain; charset=utf-8";
      ctx.waitUntil(env.NL_CACHE.put(k, buf, { expirationTtl: Math.max(60, ttl), metadata: { c } }));
    } else {
      ctx.waitUntil(caches.default.put(new Request(keyUrl.toString()), res.clone()));
    }
  }
  return res;
}

/* ---------------- /proxy ---------------- */

async function handleProxy(request, reqUrl, workerOrigin) {
  const videoUrl = reqUrl.searchParams.get("videoUrl");
  const referer = reqUrl.searchParams.get("referer") || "";
  if (!videoUrl) return jsonResponse({ error: "المعامل videoUrl مفقود" }, 400);
  const target = safeTarget(videoUrl);
  if (!target) return jsonResponse({ error: "رابط غير مسموح" }, 400);

  const h = new Headers({ "User-Agent": UA, Accept: "*/*" });
  if (referer) {
    h.set("Referer", referer);
    try { h.set("Origin", new URL(referer).origin); } catch (e) {}
  }
  if (request.headers.has("Range")) h.set("Range", request.headers.get("Range"));

  const method = request.method === "HEAD" ? "HEAD" : "GET";
  const upstream = await fetch(target.href, { method, headers: h, redirect: "follow" });
  const ct = (upstream.headers.get("Content-Type") || "").toLowerCase();
  const isSubtitleFile = /\.(vtt|srt)(\?|$)/i.test(target.pathname) || ct.includes("text/vtt") || ct.includes("subrip");
  const looksPlaylist = !isSubtitleFile && (videoUrl.includes(".m3u8") || ct.includes("mpegurl") || ct.includes("m3u8"));
  const maybeText = !isSubtitleFile && (ct.startsWith("text/") || /\.txt(\?|$)/i.test(target.pathname));

  if (method === "GET" && upstream.ok && (looksPlaylist || maybeText)) {
    const text = await upstream.text();
    if (looksPlaylist || text.trimStart().startsWith("#EXTM3U")) {
      const base = new URL(upstream.url || target.href);
      return new Response(rewritePlaylist(text, base, workerOrigin, referer || target.origin + "/"), {
        status: 200,
        headers: { ...CORS, "Content-Type": "application/vnd.apple.mpegurl", "Cache-Control": "no-cache" },
      });
    }
    return new Response(text, { status: upstream.status, headers: cleanHeaders(upstream.headers, true) });
  }

  return new Response(method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    headers: cleanHeaders(upstream.headers, false),
  });
}

function rewritePlaylist(text, base, workerOrigin, referer) {
  const wrap = (abs) => `${workerOrigin}/proxy?videoUrl=${encodeURIComponent(abs)}&referer=${encodeURIComponent(referer)}`;
  return text.split("\n").map((line) => {
    const t = line.trim();
    if (!t) return line;
    if (t.startsWith("#")) {
      return t.replace(/URI="([^"]+)"/g, (m, uri) => {
        try { return `URI="${wrap(new URL(uri, base).href)}"`; } catch { return m; }
      });
    }
    try { return wrap(new URL(t, base).href); } catch { return line; }
  }).join("\n");
}

function cleanHeaders(src, dropLength) {
  const h = new Headers(src);
  ["set-cookie", "content-security-policy", "content-security-policy-report-only", "x-frame-options",
   "strict-transport-security", "report-to", "nel"].forEach((k) => h.delete(k));
  for (const k of [...h.keys()]) if (k.startsWith("access-control-")) h.delete(k);
  if (dropLength) { h.delete("content-length"); h.delete("content-encoding"); }
  Object.entries(CORS).forEach(([k, v]) => h.set(k, v));
  return h;
}

/* ---------------- /embed (Optional HTMLRewriter Bridge) ---------------- */

const EMBED_HOST_ALLOW = /^(.*\.)?(vidlink\.pro|streamimdb\.ru|imdb\.su|2embed\.cc|2embed\.skin|2vcdn\.skin|multiembed\.mov|streamingnow\.mov|vidsrc\.[a-z]+|vidplay\.[a-z]+|filemoon\.[a-z]+|streamtape\.[a-z]+|dood\.[a-z]+|mixdrop\.[a-z]+|rabbitstream\.net|megacloud\.tv|dokicloud\.one|embed\.su)$/i;
const EMBED_AD_HOST_RE = /google|facebook|doubleclick|googlesyndication|recaptcha|popads|onclickads|acscdn|adsco|histats|exoclick|juicyads|propellerads|adsterra|clickadu|hilltopads/i;

const NL_BRIDGE_JS = `(function(){try{if(window.__nlBridge)return;window.__nlBridge=1;var WORKER=__WORKER_ORIGIN__,PARENT=__PARENT_ORIGIN__,DEPTH=__DEPTH__;var FID=Math.random().toString(36).slice(2,10);var seq=0,cur=null,lastSent=0,readySent=false;function wrap(u){try{if(!u||typeof u!=="string")return u;var a=new URL(u,document.baseURI);if(!/^https?:$/.test(a.protocol))return u;if(a.origin===WORKER)return u;if(/google|facebook|doubleclick|googlesyndication|recaptcha/i.test(a.hostname))return u;if(DEPTH>=3)return u;return WORKER+"/embed?url="+encodeURIComponent(a.href)+"&parent="+encodeURIComponent(PARENT)+"&depth="+(DEPTH+1)+"&ref="+encodeURIComponent(document.baseURI)}catch(e){return u}}try{var desc=Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype,"src");if(desc&&desc.set){Object.defineProperty(HTMLIFrameElement.prototype,"src",{configurable:true,enumerable:desc.enumerable,get:desc.get,set:function(v){try{return desc.set.call(this,wrap(v))}catch(e){}}})}}catch(e){}var origSetAttr=null;try{origSetAttr=Element.prototype.setAttribute;Element.prototype.setAttribute=function(name,value){try{if(this&&this.tagName==="IFRAME"&&String(name).toLowerCase()==="src")value=wrap(value)}catch(e){}return origSetAttr.call(this,name,value)}}catch(e){}function post(m){try{if(window.top&&window.top!==window)window.top.postMessage(m,"*");if(window.parent&&window.parent!==window&&window.parent!==window.top)window.parent.postMessage(m,"*")}catch(e){}}function send(ev){try{if(!cur)return;var now=Date.now();if(ev==="timeupdate"&&now-lastSent<250)return;lastSent=now;var d=cur.duration;post({__nl:1,type:"NL_STATE",ev:ev,t:cur.currentTime||0,d:isFinite(d)&&d>0?d:0,paused:!!cur.paused,rate:cur.playbackRate||1,seq:++seq,fid:FID})}catch(e){}}function bind(v){try{if(!v||v===cur)return;cur=v;var evs=["loadedmetadata","durationchange","play","playing","pause","waiting","seeked","seeking","timeupdate","ratechange","ended"];for(var i=0;i<evs.length;i++)(function(e){try{v.addEventListener(e,function(){send(e)},true)}catch(x){}})(evs[i]);if(!readySent){readySent=true;post({__nl:1,type:"NL_READY",fid:FID})}send("loadedmetadata")}catch(e){}}function wrapFrameEl(f){try{if(!f||f.tagName!=="IFRAME")return;var raw=f.getAttribute("src");if(raw){var w=wrap(raw);if(w!==raw){if(origSetAttr)origSetAttr.call(f,"src",w);else f.setAttribute("src",w)}}}catch(e){}}function scan(){try{var vs=document.getElementsByTagName("video");var best=null;for(var i=0;i<vs.length;i++){var v=vs[i];if(v.readyState>0||v.src||v.currentSrc){best=v;break}if(!best)best=v}if(best)bind(best);var fs=document.getElementsByTagName("iframe");for(var j=0;j<fs.length;j++)wrapFrameEl(fs[j])}catch(e){}}try{var origPlay=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){try{if(this&&this.tagName==="VIDEO")bind(this)}catch(e){}return origPlay.apply(this,arguments)}}catch(e){}try{var mo=new MutationObserver(function(muts){try{for(var i=0;i<muts.length;i++){var added=muts[i].addedNodes;if(!added)continue;for(var k=0;k<added.length;k++){var n=added[k];if(!n||n.nodeType!==1)continue;if(n.tagName==="IFRAME")wrapFrameEl(n);else if(n.getElementsByTagName){var ifs=n.getElementsByTagName("iframe");for(var m=0;m<ifs.length;m++)wrapFrameEl(ifs[m])}}}scan()}catch(e){}});mo.observe(document.documentElement,{childList:true,subtree:true})}catch(e){}setInterval(scan,1500);scan();window.addEventListener("message",function(e){try{var d=e.data;if(typeof d==="string"){try{d=JSON.parse(d)}catch(x){return}}if(!d||d.__nl!==1)return;if(e.source!==window.parent&&e.source!==window.top&&d.type!=="NL_CMD"){post(d);return}if(d.type!=="NL_CMD")return;if(cur){try{if(d.cmd==="seek"&&typeof d.t==="number"){cur.currentTime=Math.max(0,d.t);var dur=cur.duration;post({__nl:1,type:"NL_ACK",id:d.id,t:cur.currentTime,d:isFinite(dur)&&dur>0?dur:0,paused:!!cur.paused,fid:FID})}else if(d.cmd==="play"){var p=cur.play();if(p&&p.catch)p.catch(function(){})}else if(d.cmd==="pause"){cur.pause()}}catch(x){}}var fs=window.frames;for(var i=0;i<fs.length;i++){try{fs[i].postMessage(d,"*")}catch(x){}}}catch(e){}})}catch(e){}})();`;

function cleanEmbedHeaders(src, parentOrigin, workerOrigin) {
  const h = cleanHeaders(src, true);
  h.set("Content-Security-Policy", `frame-ancestors 'self' ${parentOrigin} ${workerOrigin};`);
  return h;
}

async function handleEmbed(request, reqUrl, workerOrigin, env) {
  const rawUrl = reqUrl.searchParams.get("url") || "";
  const parentOrigin = reqUrl.searchParams.get("parent") || "";
  const refParam = reqUrl.searchParams.get("ref") || "";
  const depth = parseInt(reqUrl.searchParams.get("depth") || "0", 10);
  if (!Number.isFinite(depth) || depth < 0 || depth > 3) {
    return jsonResponse({ error: "bad_depth" }, 400);
  }
  const allowedList = env.ALLOWED_ORIGINS
    ? env.ALLOWED_ORIGINS.split(",").map((s) => s.trim())
    : DEFAULT_ALLOWED_ORIGINS;
  if (!parentOrigin || !isAllowedOriginUrl(parentOrigin, workerOrigin, allowedList)) {
    return jsonResponse({ error: "bad_parent" }, 403);
  }
  const target = safeTarget(rawUrl);
  if (!target) {
    return jsonResponse({ error: "host_not_allowed" }, 403);
  }
  if (depth === 0) {
    if (!EMBED_HOST_ALLOW.test(target.hostname)) {
      return jsonResponse({ error: "host_not_allowed" }, 403);
    }
  } else {
    if (target.protocol !== "https:") {
      return jsonResponse({ error: "host_not_allowed" }, 403);
    }
    const reqRef = request.headers.get("Referer") || "";
    let refOrigin = "";
    try { refOrigin = new URL(reqRef).origin; } catch {}
    if (refOrigin !== workerOrigin) {
      return jsonResponse({ error: "host_not_allowed" }, 403);
    }
  }

  let upstreamReferer = target.origin + "/";
  if (depth >= 1 && refParam) {
    const validRef = safeTarget(refParam);
    if (validRef) upstreamReferer = validRef.href;
  }

  let upstream;
  try {
    upstream = await fetch(target.href, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Referer: upstreamReferer,
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    return Response.redirect(target.href, 302);
  }

  if (!upstream.ok || upstream.status === 403 || upstream.status === 503) {
    return Response.redirect(target.href, 302);
  }

  const ct = (upstream.headers.get("Content-Type") || "").toLowerCase();
  if (!ct.includes("text/html")) {
    return Response.redirect(target.href, 302);
  }

  const finalBaseHref = new URL(upstream.url || target.href).href;
  const bridgeScript = NL_BRIDGE_JS
    .replace(/__WORKER_ORIGIN__/g, JSON.stringify(workerOrigin))
    .replace(/__PARENT_ORIGIN__/g, JSON.stringify(parentOrigin))
    .replace(/__DEPTH__/g, String(depth));

  const rewriter = new HTMLRewriter()
    .on("head", {
      element(el) {
        el.prepend(
          `<base href="${finalBaseHref.replace(/"/g, "&quot;")}"><script>${bridgeScript}</script>`,
          { html: true },
        );
      },
    })
    .on("iframe[src]", {
      element(el) {
        if (depth >= 3) return;
        const srcAttr = el.getAttribute("src");
        if (!srcAttr) return;
        try {
          const abs = new URL(srcAttr, finalBaseHref);
          if (
            abs.protocol === "https:" &&
            abs.origin !== workerOrigin &&
            safeTarget(abs.href) &&
            !EMBED_AD_HOST_RE.test(abs.hostname)
          ) {
            const wrapped = `${workerOrigin}/embed?url=${encodeURIComponent(abs.href)}&parent=${encodeURIComponent(parentOrigin)}&depth=${depth + 1}&ref=${encodeURIComponent(finalBaseHref)}`;
            el.setAttribute("src", wrapped);
          }
        } catch {}
      },
    });

  return rewriter.transform(
    new Response(upstream.body, {
      status: upstream.status,
      headers: cleanEmbedHeaders(upstream.headers, parentOrigin, workerOrigin),
    }),
  );
}

/* ---------------- / (Multi-Server Parallel Harvester: Video + Cross-Server Subtitles) ---------------- */

function unpackDeanEdwards(html) {
  const unpackedChunks = [];
  const packerRe = /eval\(function\(p,a,c,k,e,[dr]\)\{[\s\S]*?\}\(\s*'((?:\\.|[^'])*)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'((?:\\.|[^'])*)'\.split\('\|'\)/g;
  let m;
  while ((m = packerRe.exec(html)) !== null) {
    try {
      let p = m[1].replace(/\\'/g, "'").replace(/\\\\/g, "\\");
      const a = parseInt(m[2], 10);
      let c = parseInt(m[3], 10);
      const k = m[4].split("|");
      if (!a || !c || k.length === 0) continue;
      const encodeBase = (num) => {
        const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        if (num < a) return num < 36 ? num.toString(36) : chars[num];
        return encodeBase(Math.floor(num / a)) + (num % a < 36 ? (num % a).toString(36) : chars[num % a]);
      };
      while (c--) {
        if (k[c]) {
          const token = encodeBase(c);
          p = p.replace(new RegExp("\\b" + token + "\\b", "g"), k[c]);
        }
      }
      unpackedChunks.push(p);
    } catch {}
  }
  return unpackedChunks.join("\n");
}

function tagAttr(tag, name) {
  const m = tag.match(new RegExp(name + "\\s*=\\s*[\"']([^\"']*)[\"']", "i"));
  return m ? m[1] : "";
}

function labelFromBlock(block) {
  const m = block.match(/["']?(?:label|name|language|lang)["']?\s*:\s*["']([^"']{1,40})["']/i);
  return m ? m[1] : "";
}

function collectSubtitles(html, decodedHtml, baseUrl, out) {
  let m;
  TRACK_TAG_RE.lastIndex = 0;
  while ((m = TRACK_TAG_RE.exec(html)) !== null) {
    const tag = m[0];
    const kind = tagAttr(tag, "kind").toLowerCase();
    if (kind && kind !== "subtitles" && kind !== "captions") continue;
    const src = tagAttr(tag, "src");
    if (!src) continue;
    try {
      const abs = new URL(src, baseUrl).href;
      if (!out.has(abs)) {
        out.set(abs, {
          url: abs,
          lang: tagAttr(tag, "srclang"),
          label: tagAttr(tag, "label"),
          default: /\bdefault\b/i.test(tag),
          referer: baseUrl,
        });
      }
    } catch (e) {}
  }

  PLAYERJS_SUB_RE.lastIndex = 0;
  while ((m = PLAYERJS_SUB_RE.exec(decodedHtml)) !== null) {
    try {
      const abs = new URL(m[2].replace(/\\\//g, "/"), baseUrl).href;
      if (!out.has(abs)) {
        out.set(abs, { url: abs, lang: "", label: m[1].trim(), referer: baseUrl });
      }
    } catch (e) {}
  }

  JSON_TRACK_RE.lastIndex = 0;
  while ((m = JSON_TRACK_RE.exec(decodedHtml)) !== null) {
    try {
      const abs = new URL(m[1].replace(/\\\//g, "/"), baseUrl).href;
      if (!out.has(abs)) {
        out.set(abs, { url: abs, lang: "", label: labelFromBlock(m[0]), referer: baseUrl });
      }
    } catch (e) {}
  }

  for (const raw of decodedHtml.match(SUB_URL_RE) || []) {
    const u = raw.replace(/\\\//g, "/");
    if (!out.has(u)) out.set(u, { url: u, lang: "", label: "", referer: baseUrl });
  }
}

function expandMultiServerCandidates(urls) {
  const expanded = [];
  const seen = new Set();
  for (const raw of urls) {
    if (typeof raw !== "string" || !safeTarget(raw)) continue;
    if (!seen.has(raw)) {
      seen.add(raw);
      expanded.push(raw);
    }
    // Automatically add SuperEmbed VIP directstream.php endpoint when multiembed.mov is in the list
    try {
      const u = new URL(raw);
      if (u.hostname.includes("multiembed.mov") && u.pathname === "/") {
        const vipUrl = `https://multiembed.mov/directstream.php${u.search}`;
        if (!seen.has(vipUrl)) {
          seen.add(vipUrl);
          expanded.push(vipUrl);
        }
      }
    } catch {}
  }
  return expanded.slice(0, MAX_PAGES);
}

async function handleExtract(request, reqUrl, workerOrigin) {
  let targetUrls = [];
  if (request.method === "POST") {
    try {
      const body = await request.json();
      if (Array.isArray(body.urls)) targetUrls = body.urls;
      else if (body.url) targetUrls = [body.url];
    } catch (e) {
      return jsonResponse({ error: "صيغة JSON غير صالحة في طلب POST" }, 400);
    }
  } else {
    const single = reqUrl.searchParams.get("url");
    const multi = reqUrl.searchParams.get("urls");
    if (single) targetUrls.push(single);
    if (multi) targetUrls.push(...multi.split(",").map((u) => u.trim()).filter(Boolean));
  }
  targetUrls = expandMultiServerCandidates(targetUrls);

  if (targetUrls.length === 0) {
    return jsonResponse({
      usage: {
        single_url: `${workerOrigin}/?url=https://example.com/page`,
        multiple_urls_get: `${workerOrigin}/?urls=https://site1.com,https://site2.com`,
        multiple_urls_post: `POST ${workerOrigin}/ with JSON body: { "urls": ["https://site1.com"] }`,
        direct_proxy: `${workerOrigin}/proxy?videoUrl=https://cdn.site.com/video.m3u8&referer=https://site.com`,
      },
    }, 400);
  }

  const allResults = await Promise.all(targetUrls.map((u) => extractFromPage(u, workerOrigin)));

  // Cross-Server Subtitle Fusion: pool subtitles discovered from ANY server and attach them to all extracted streams
  const globalSubsMap = new Map();
  for (const res of allResults) {
    for (const s of res.subtitles || []) {
      if (s && s.url && !globalSubsMap.has(s.url)) {
        globalSubsMap.set(s.url, s);
      }
    }
  }
  const pooledSubs = Array.from(globalSubsMap.values()).slice(0, MAX_SUBTITLES);
  for (const res of allResults) {
    if (Array.isArray(res.videos) && res.videos.length > 0 && pooledSubs.length > 0) {
      const localUrls = new Set((res.subtitles || []).map((s) => s.url));
      res.subtitles = [
        ...(res.subtitles || []),
        ...pooledSubs.filter((s) => !localUrls.has(s.url)),
      ];
    }
  }

  return jsonResponse({ total_pages: allResults.length, results: allResults.length === 1 ? allResults[0] : allResults });
}

async function extractFromPage(targetUrl, workerOrigin, depth = 0) {
  const extractedLinks = new Set();
  const linkReferer = new Map();
  const discoveredIframes = new Set();
  const subtitles = new Map();
  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Referer: new URL(targetUrl).origin + "/",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(depth === 0 ? EXTRACT_TIMEOUT_TOP_MS : EXTRACT_TIMEOUT_NESTED_MS),
    });
    if (!response.ok) return { source: targetUrl, error: `HTTP ${response.status}`, videos: [], subtitles: [] };
    const finalPageUrl = response.url || targetUrl;
    const html = await response.text();

    let decodedHtml = html;
    try { decodedHtml += "\n" + decodeURIComponent(html); } catch (e) {}
    const unpacked = unpackDeanEdwards(html);
    if (unpacked) decodedHtml += "\n" + unpacked;
    for (const b64 of html.match(/aHR0c[A-Za-z0-9+/=]{15,}/g) || []) {
      try { decodedHtml += "\n" + atob(b64); } catch (e) {}
    }
    for (const raw of decodedHtml.match(/https?:\/\/[^\s"'<>\\`]+\.(?:m3u8|mp4|mpd)(?:\?[^\s"'<>\\`]*)?/gi) || []) {
      const clean = raw.replace(/\\\//g, "/");
      extractedLinks.add(clean);
      if (!linkReferer.has(clean)) linkReferer.set(clean, finalPageUrl);
    }
    const relativeRegex = /(?:src|file|url|source|stream)\s*[:=]\s*["']([^"']+\.(?:m3u8|mp4|mpd)(?:\?[^"']*)?)["']/gi;
    let m;
    while ((m = relativeRegex.exec(decodedHtml)) !== null) {
      try {
        const abs = new URL(m[1].replace(/\\\//g, "/"), finalPageUrl).href;
        extractedLinks.add(abs);
        if (!linkReferer.has(abs)) linkReferer.set(abs, finalPageUrl);
      } catch (e) {}
    }
    collectSubtitles(html, decodedHtml, finalPageUrl, subtitles);

    if (depth === 0) {
      const iframeRegex = /<iframe[^>]+src=["']([^"']+)["']/gi;
      let im;
      while ((im = iframeRegex.exec(html)) !== null) {
        try {
          const src = new URL(im[1], finalPageUrl).href;
          if (safeTarget(src) && !EMBED_AD_HOST_RE.test(new URL(src).hostname)) discoveredIframes.add(src);
        } catch (e) {}
      }
      const list = Array.from(discoveredIframes).slice(0, 3);
      const sub = await Promise.all(list.map((u) => extractFromPage(u, workerOrigin, depth + 1)));
      sub.forEach((r) => {
        (r.videos || []).forEach((v) => {
          extractedLinks.add(v.directUrl);
          if (!linkReferer.has(v.directUrl)) linkReferer.set(v.directUrl, r.source);
        });
        (r.subtitles || []).forEach((s) => {
          if (!subtitles.has(s.url)) subtitles.set(s.url, s);
        });
      });
    }

    const videos = Array.from(extractedLinks).map((videoUrl) => {
      const ref = linkReferer.get(videoUrl) || finalPageUrl;
      return {
        type: videoUrl.includes(".m3u8") ? "hls" : videoUrl.includes(".mpd") ? "dash" : "mp4",
        directUrl: videoUrl,
        proxiedUrl: `${workerOrigin}/proxy?videoUrl=${encodeURIComponent(videoUrl)}&referer=${encodeURIComponent(ref)}`,
      };
    });
    const subs = Array.from(subtitles.values()).slice(0, MAX_SUBTITLES).map((s) => ({
      url: s.url,
      lang: s.lang || "",
      label: s.label || "",
      default: Boolean(s.default),
      referer: s.referer || finalPageUrl,
    }));
    return {
      source: targetUrl,
      count: videos.length,
      iframes_scanned: Array.from(discoveredIframes).slice(0, 3),
      videos,
      subtitles: subs,
    };
  } catch (error) {
    return { source: targetUrl, error: error.message, videos: [], subtitles: [] };
  }
}

/* ---------------- الترجمة (Wyzie) ---------------- */

async function wyzieSearch(url, env, workerOrigin) {
  if (!env.WYZIE_KEY) return jsonResponse({ error: "missing_key" }, 500);
  const up = new URL("https://sub.wyzie.io/search");
  for (const k of ["id", "language", "season", "episode", "format", "source"]) {
    const v = url.searchParams.get(k);
    if (v) up.searchParams.set(k, v.slice(0, 200));
  }
  if (!/^(tt\d{5,10}|\d{1,9})$/.test(up.searchParams.get("id") || "")) return jsonResponse({ error: "bad_id" }, 400);
  up.searchParams.set("key", env.WYZIE_KEY);
  const r = await fetch(up.toString(), { headers: { Accept: "application/json" } });
  if (r.status === 404) return jsonResponse([], 200, 1800);
  if (!r.ok) return jsonResponse({ error: `wyzie_${r.status}` }, 502);
  const data = await r.json();
  const list = Array.isArray(data) ? data : data.subtitles || data.results || [];
  return jsonResponse(list.map((item) => {
    if (!item || typeof item.url !== "string") return item;
    try {
      const u = new URL(item.url);
      u.searchParams.delete("key");
      const prox = new URL("/subs/file", workerOrigin);
      prox.searchParams.set("url", u.toString());
      return { ...item, url: prox.toString() };
    } catch { return item; }
  }), 200, 3600);
}

async function wyzieFile(url, env) {
  let u;
  try { u = new URL(url.searchParams.get("url") || ""); } catch { return jsonResponse({ error: "bad_url" }, 400); }
  if (u.protocol !== "https:" || !(u.hostname === "sub.wyzie.io" || u.hostname.endsWith(".wyzie.io"))) {
    return jsonResponse({ error: "host_not_allowed" }, 403);
  }
  if (env.WYZIE_KEY) u.searchParams.set("key", env.WYZIE_KEY);
  const r = await fetch(u.toString());
  if (!r.ok) return jsonResponse({ error: `wyzie_${r.status}` }, 502);
  return new Response(await r.arrayBuffer(), {
    status: 200,
    headers: { "Content-Type": r.headers.get("Content-Type") || "text/plain; charset=utf-8",
               "Cache-Control": "public, max-age=86400", ...CORS },
  });
}

/* ---------------- تريلر IMDb (غير رسمي) ---------------- */

async function imdbTrailer(url) {
  const id = url.searchParams.get("id") || "";
  if (!/^tt\d{5,10}$/.test(id)) return jsonResponse({ error: "bad_id" }, 400);
  const r = await fetch(`https://www.imdb.com/title/${id}/`, {
    headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml", "Accept-Language": "en-US,en;q=0.9" },
    signal: AbortSignal.timeout(8000),
  });
  if (r.status === 202 || !r.ok) return jsonResponse({ error: `imdb_${r.status}` }, 502);
  const html = await r.text();
  const match = html.match(/\/video\/(vi\d{6,12})/);
  if (!match) return jsonResponse({ error: "no_video" }, 404);
  return jsonResponse({ source: "imdb", videoId: match[1], embedUrl: `https://www.imdb.com/video/embed/${match[1]}/` }, 200, 604800);
}

/* ---------------- معلومات إضافية (OMDb) ---------------- */

async function omdbMeta(url, env) {
  if (!env.OMDB_KEY) return jsonResponse({ error: "missing_key" }, 500);
  const id = url.searchParams.get("i") || "";
  if (!/^tt\d{5,10}$/.test(id)) return jsonResponse({ error: "bad_id" }, 400);
  const r = await fetch(`https://www.omdbapi.com/?i=${id}&plot=short&apikey=${env.OMDB_KEY}`);
  if (!r.ok) return jsonResponse({ error: `omdb_${r.status}` }, 502);
  const d = await r.json();
  if (d.Response === "False") return jsonResponse({ error: "not_found" }, 404);
  const val = (v) => (v && v !== "N/A" ? v : undefined);
  const rt = (d.Ratings || []).find((x) => x.Source === "Rotten Tomatoes");
  return jsonResponse({
    imdbId: id, imdbRating: val(d.imdbRating), imdbVotes: val(d.imdbVotes), metascore: val(d.Metascore),
    rottenTomatoes: val(rt && rt.Value), rated: val(d.Rated), runtime: val(d.Runtime), awards: val(d.Awards),
    boxOffice: val(d.BoxOffice), director: val(d.Director), writer: val(d.Writer), actors: val(d.Actors),
    language: val(d.Language), country: val(d.Country),
  }, 200, 86400);
}

/* ---------------- TMDB proxy (اختياري) ---------------- */

function tmdbTtl(path) {
  if (/\/search\//.test(path)) return 600;
  if (/trending|now_playing|popular|upcoming|airing|on_the_air/.test(path)) return 1800;
  return 21600;
}

async function tmdbProxy(url, env) {
  if (!env.TMDB_KEY) return jsonResponse({ error: "missing_key" }, 500);
  if (!/^\/tmdb\/3\/[A-Za-z0-9_\-\/]+$/.test(url.pathname)) return jsonResponse({ error: "bad_path" }, 400);
  const up = new URL("https://api.themoviedb.org" + url.pathname.slice(5));
  url.searchParams.forEach((v, k) => { if (k !== "api_key") up.searchParams.set(k, v.slice(0, 300)); });
  up.searchParams.set("api_key", env.TMDB_KEY);
  const r = await fetch(up.toString(), { headers: { Accept: "application/json" } });
  return new Response(await r.text(), {
    status: r.ok ? 200 : r.status,
    headers: { "Content-Type": "application/json; charset=utf-8",
               "Cache-Control": r.ok ? `public, max-age=${tmdbTtl(url.pathname)}` : "no-store", ...CORS },
  });
}

/* ---------------- مساعد ---------------- */

function jsonResponse(data, status = 200, maxAge = 0) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json;charset=UTF-8",
               "Cache-Control": maxAge ? `public, max-age=${maxAge}` : "no-store", ...CORS },
  });
}
```

---

## 10) `src/components/Movies/MoviesPage.tsx` — MODIFIED (Exact Surgical Replacements)
Apply the following surgical updates to `src/components/Movies/MoviesPage.tsx`:

### 10.1) Remove Unused `AdShield` / `ManualSyncBar` / `sandboxPolicy` Imports & Keep `streamSubtitles`
In the imports section of `src/components/Movies/MoviesPage.tsx`:
- Remove any imports of `AdShield`, `ManualSyncBar`, or `sandboxPolicy`.
- Keep:
```ts
import {
  autoRetimeCues,
  hlsTracksToSubtitleTracks,
  mergeStreamFirst,
} from "../../features/cinema/subtitles/streamSubtitles";
```

### 10.2) Auto-Hide Controls After 2.5s of Inactivity Across ALL Modes (`isWatchingInGallery`)
Locate `bumpControlsVisibility` and its `useEffect` (around `lines 2236–2268`).
Previously, `bumpControlsVisibility` only hid controls when `isAnyFullscreen && !isVideoPaused && !isSubtitleMenuOpen` — which meant in `iframe` mode (where `isVideoPaused` is `true` on servers that don't emit play state) or in Theater mode, the controls **never auto-hid**!
Replace `bumpControlsVisibility` and its `useEffect` with:

```ts
  const isAnyFullscreen = isCssFullscreen || isNativeFullscreen;

  const bumpControlsVisibility = useCallback(() => {
    setIsControlsVisible(true);
    if (controlsHideTimerRef.current) {
      clearTimeout(controlsHideTimerRef.current);
      controlsHideTimerRef.current = null;
    }
    const shouldAutoHide =
      isWatchingInGallery &&
      !isSubtitleMenuOpen &&
      (playerRenderMode !== "direct" || !isVideoPaused);
    if (shouldAutoHide) {
      controlsHideTimerRef.current = setTimeout(() => {
        setIsControlsVisible(false);
      }, 2500);
    }
  }, [isWatchingInGallery, isSubtitleMenuOpen, playerRenderMode, isVideoPaused]);

  useEffect(() => {
    if (!isWatchingInGallery || isSubtitleMenuOpen) {
      setIsControlsVisible(true);
      if (controlsHideTimerRef.current) {
        clearTimeout(controlsHideTimerRef.current);
        controlsHideTimerRef.current = null;
      }
      return undefined;
    }
    bumpControlsVisibility();
    const onGlobalActivity = () => bumpControlsVisibility();
    window.addEventListener("mousemove", onGlobalActivity, { passive: true });
    window.addEventListener("touchstart", onGlobalActivity, { passive: true });
    window.addEventListener("keydown", onGlobalActivity);
    return () => {
      window.removeEventListener("mousemove", onGlobalActivity);
      window.removeEventListener("touchstart", onGlobalActivity);
      window.removeEventListener("keydown", onGlobalActivity);
      if (controlsHideTimerRef.current) {
        clearTimeout(controlsHideTimerRef.current);
        controlsHideTimerRef.current = null;
      }
    };
  }, [isWatchingInGallery, isSubtitleMenuOpen, playerRenderMode, isVideoPaused, bumpControlsVisibility]);
```

### 10.3) Auto-Hide the Top Control Bar (`lg-cinema-gallery-top-bar`) During Playback When Inactive
Locate the Top Control Bar (`lg-cinema-gallery-top-bar`, around `line 3875`). Update its `className` so that when `isWatchingInGallery && !isControlsVisible`, it smoothly fades out and does not cover or distract from the video, reappearing immediately on mouse move or touch:

```tsx
                  {((isWatchingInGallery && Boolean(activeGallerySource)) ||
                    (showHeroTrailer && Boolean(activeImdbId || detailedItem.trailerKey))) && (
                    <div
                      onMouseMove={bumpControlsVisibility}
                      onTouchStart={bumpControlsVisibility}
                      className={`lg-cinema-gallery-top-bar flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-2xl transition-all duration-300 ${
                        isWatchingInGallery
                          ? "lg-cinema-gallery-top-bar--playing"
                          : ""
                      } ${
                        isWatchingInGallery && !isControlsVisible
                          ? "opacity-0 pointer-events-none"
                          : "opacity-100"
                      }`}
                      dir="ltr"
                    >
```

### 10.4) Auto-Hide the CSS Fullscreen Exit Button & Clean Unblocked `<iframe />` (Zero Sandbox, Zero AdShield, Zero ManualSyncBar) + Only Show `SubtitleOverlay` in `direct` Mode
Inside `<div ref={galleryStageRef} ...>` (around `lines 4020–4200`):
1. Update the `isCssFullscreen` exit button so it also hides when `!isControlsVisible`:
```tsx
                    {isCssFullscreen && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsCssFullscreen(false);
                        }}
                        className={`lg-cinema-icon-pill fixed top-4 right-4 z-[10600] !w-10 !h-10 transition-opacity duration-300 ${
                          isControlsVisible
                            ? "opacity-100"
                            : "opacity-0 pointer-events-none"
                        }`}
                        aria-label={t("movies.player.exitFullscreen")}
                        title={t("movies.player.exitFullscreen")}
                      >
                        <Minimize2 size={16} />
                      </button>
                    )}
```
2. Add thin edge-hover wake strips when `!isControlsVisible` so moving the mouse to the top or bottom edge of a cross-origin `<iframe>` immediately wakes the controls without blocking anything in the player:
```tsx
                    {isWatchingInGallery && !isControlsVisible && (
                      <>
                        <div
                          onMouseEnter={bumpControlsVisibility}
                          onMouseMove={bumpControlsVisibility}
                          onTouchStart={bumpControlsVisibility}
                          className="absolute top-0 inset-x-0 h-5 z-30"
                        />
                        <div
                          onMouseEnter={bumpControlsVisibility}
                          onMouseMove={bumpControlsVisibility}
                          onTouchStart={bumpControlsVisibility}
                          className="absolute bottom-0 inset-x-0 h-4 z-30"
                        />
                      </>
                    )}
```
3. Ensure the player `<iframe ... />` has **NO `sandbox` attribute**, **NO `<AdShield />`**, and **NO `<ManualSyncBar />`**:
```tsx
                        {!allServersFailed &&
                          (playerRenderMode === "iframe" ||
                            playerRenderMode === "clean-embed") && (
                            <iframe
                              ref={playerIframeRef}
                              key={`${activeGallerySource.id}-${activeIframeUrl}`}
                              className="w-full h-full border-0 bg-black block"
                              src={activeIframeUrl}
                              title={`${detailedItem.title} - ${activeGallerySource.label}`}
                              width="100%"
                              height="100%"
                              frameBorder="0"
                              scrolling="no"
                              referrerPolicy="origin"
                              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                              allowFullScreen
                              onLoad={() => {
                                loadedCurrentAttemptRef.current = true;
                                const elapsedMs = Math.max(
                                  120,
                                  performance.now() - playAttemptStartedAtRef.current,
                                );
                                const currentStream =
                                  extractedStreams[activeExtractedIdx] ||
                                  extractedStreams[0];
                                const activeServerId =
                                  playerRenderMode === "clean-embed"
                                    ? resolveServerIdForStream(currentStream)
                                    : activeGallerySource.id;
                                recordServerSuccess(
                                  activeServerId,
                                  elapsedMs,
                                  detailItemStorageKey,
                                );
                                setIsPlayerLoading(false);
                                gotTimeSinceLoadRef.current = false;
                                setIframeLoadStamp(Date.now());
                              }}
                            />
                          )}
```
4. Render `<SubtitleOverlay />`, the Fullscreen bottom controls bar (`lg-cinema-player-controls--fullscreen`), and the External bottom controls bar (`lg-cinema-player-controls`) **ONLY when `playerRenderMode === "direct"`** (because `iframe` servers already have their own built-in subtitles and timeline bar inside the stage!):
- For `<SubtitleOverlay />` (around `line 4187`):
```tsx
                        {/* Live Cinema Subtitle Overlay (Rendered ONLY in direct <video> mode; iframe servers have built-in subtitles) */}
                        {!allServersFailed &&
                          playerRenderMode === "direct" &&
                          activeSubtitleIdx !== null && (
                            <SubtitleOverlay
                              cues={activeTrackCues}
                              offsetSec={subtitleOffsetSec}
                              liftPx={isControlsVisible ? 56 : 0}
                            />
                          )}
```
- For the Fullscreen bottom controls bar (`around line 4415`):
```tsx
                    {isAnyFullscreen &&
                      isWatchingInGallery &&
                      playerRenderMode === "direct" &&
                      !allServersFailed && (
```
- For the External bottom controls bar below the stage (`around line 4574`):
```tsx
                  {!isAnyFullscreen &&
                    isWatchingInGallery &&
                    playerRenderMode === "direct" &&
                    !allServersFailed && (
```

---

## 11) `src/features/cinema/player/__tests__/sandboxPolicy.test.ts` — MODIFIED
If `src/features/cinema/player/__tests__/sandboxPolicy.test.ts` exists in the repository, replace its contents with:

```ts
import { describe, expect, it } from "vitest";
import { getIframeSandbox } from "../sandboxPolicy";

describe("sandboxPolicy (zero-sandbox enforcement)", () => {
  it("always returns undefined so embed servers never trigger 'Please Disable Sandbox'", () => {
    expect(getIframeSandbox({ id: "server-vl", capabilities: { timeEvents: true } })).toBeUndefined();
    expect(getIframeSandbox({ id: "server-7", capabilities: {} })).toBeUndefined();
    expect(getIframeSandbox(null)).toBeUndefined();
  });
});
```

# VERIFICATION
Run and verify all checks pass with 0 errors:
1. `npx tsc --noEmit` → 0 errors.
2. `npx vitest run` → all tests pass (`securityRegression.test.ts`, `iframeBridge.test.ts`, `syncController.test.ts`, `sandboxPolicy.test.ts`, `streamSubtitles.test.ts`).
3. `node scripts/check-csp.mjs` → passes.
4. `npm run build` → succeeds.
```
