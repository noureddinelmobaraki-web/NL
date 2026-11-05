# Ultimate Surgical AI Studio Prompt — NL Cinema Ad-Free Playback, Parallel Hot-Upgrade, Speed Racing, Worker Bridge & Synchronized Subtitles

> **How to use this document:** Copy the entire prompt below into **Google AI Studio** (`gemini-2.5-pro` / Coding Agent) with your repository files. It merges the strongest engineering mechanisms from both architectural analyses into one unified, conflict-free specification with **100% complete code** for every new and modified file, exact variable names from the 5,392-line `MoviesPage.tsx`, and 100% backward compatibility with all existing Vitest tests (`src/utils/securityRegression.test.ts`, `iframeBridge.test.ts`, `syncController.test.ts`) and `scripts/check-csp.mjs`.

````
# ROLE
You are a Principal TypeScript/React + Cloudflare Workers Systems Architect. Perform SURGICAL changes on the "NL" repository (Vite + React 19 + TypeScript, hls.js, Vitest). Touch ONLY the files listed in the CHANGESET below. Do not rename, reformat, or refactor unrelated code. Preserve all existing behavior and unit-test contracts unless this specification explicitly extends them. Never emit placeholders, `// ...rest unchanged` inside NEW files, or TODOs. TypeScript must compile cleanly in strict mode (`npx tsc --noEmit`).

# CONTEXT (Cinema Module Only)
The Cinema page (`src/components/Movies/MoviesPage.tsx`) supports three playback tiers:
- **Tier 1 (`playerRenderMode === "direct"`)**: Native HTML5 `<video>` + `hls.js` fed by `.m3u8` / `.mp4` streams and companion subtitles extracted via the Cloudflare Worker (`cloudflare/worker.js` `POST /` + `GET /proxy`). Zero ads, 100% native clock & subtitle sync.
- **Tier 2 (`controlMode === "bridged"`)**: Embedded iframe players that report live playback clock events (`currentTime`, `duration`, `paused`, `rate`) to `playbackClock.ts` via `postMessage` (`iframeBridge.ts` + `syncController.ts`), either natively (`PLAYER_EVENT` / `MEDIA_DATA` from `server-vl` VidLink) or via the Cloudflare Worker `/embed` `HTMLRewriter` bridge (`__nl: 1` `NL_STATE` / `NL_ACK` / `NL_SUBS` from `server-7`, `server-1`, `server-2`, `server-6`).
- **Tier 3 (`controlMode === "none"`)**: Fallback unbridged iframe when both Tier 1 extraction and Tier 2 bridge sync are unavailable, supported by `ManualSyncBar.tsx` so the user can still drive the subtitle clock manually.

# ROOT CAUSES (Verified Against Repository Source Code)
1. **RC1 — Extraction Timeout Mismatch & Blocking Startup**: `videoExtractor.fetchExtractedVideos` aborts after `4500ms`, whereas `cloudflare/worker.js` `extractFromPage` waits up to `10_000ms` per page plus nested iframes. Worse, `MoviesPage.tsx` blocks mounting the iframe while `playerRenderMode === "extracting"`, causing a 4.5s stall followed by Tier 1 failure.
2. **RC2 — Unfair Server Monopoly (`server-vl`)**: `src/config/servers.ts` only sets `capabilities: { timeEvents: true, startAt: true }` on `server-vl` (VidLink) and leaves `workerBridge` unset on `server-7`, `server-1`, `server-2`, and `server-6`. `serverSpeedMonitor.ts` locks `server-vl` into Bucket 0 (`score -= 5000`) and refuses to overwrite `state.byTitle[titleKey]` if it equals `"server-vl"`, while `MoviesPage.tsx` records server success on raw `<iframe onLoad>` before media playback or sync actually starts.
3. **RC3 — Unblocked Popup Ads & Click Hijacking**: Popups in cross-origin iframes (`VidLink`, `2embed`, `multiembed`, `streamimdb`) trigger when user pointer clicks reach the iframe (granting transient user activation) and because the `<iframe>` lacks a popup-blocking `sandbox` attribute. Additionally, `NL_BRIDGE_JS` in `cloudflare/worker.js` only posted to `window.parent` instead of `window.top` (dropping messages from depth 2–3 nested iframes) and did not neutralize `window.open` or sniff runtime subtitle fetches.
4. **RC4 — Missing Worker Companion Subtitles & Nested Referer 403s**: `extractFromPage` in `cloudflare/worker.js` never returns `subtitles: []` (nor unpacks `eval(function(p,a,c,k,e,d)...)` or PlayerJS `[Lang]url` subtitle strings), and overwrites nested-iframe video URLs with the top page as `Referer` instead of the inner iframe URL—causing `403 Forbidden` on `/proxy`.
5. **RC5 — Ignored HLS Manifest Subtitles & PAL/NTSC Drift**: `hls.js` `subtitleTracks` (`#EXT-X-MEDIA:TYPE=SUBTITLES`) and segmented WebVTT playlists are not merged into `SubtitleOverlay`, and 25fps PAL subtitles are not automatically retimed when playing on a 23.976fps movie stream.

# GOALS & ACCEPTANCE CRITERIA
- **G1 (Zero-Popup Multi-Layer Defense)**:
  1. `AdShield.tsx` places a transparent pointer-capturing shield over ad-heavy iframes so pointer clicks never grant transient user activation inside the iframe; single click toggles play/pause via `syncControllerRef`, double-click/tap toggles fullscreen or seeks `±10s`, with an 8-second pass-through toggle button (`nl-adshield__toggle`).
  2. `sandboxPolicy.ts` applies `SANDBOX_STRICT = 'allow-scripts allow-same-origin allow-forms allow-presentation'` (no `allow-popups`, no `allow-top-navigation`) with a `10_000ms` sync probe: if a server refuses to run sandboxed, it records `"refused"` in `localStorage` for 7 days and remounts unsandboxed on the **same** server (with `AdShield` still armed) without triggering a false failover.
  3. `cloudflare/worker.js` `/embed` injects `NL_POPUP_GUARD_JS` + a spoofed `window.open` mock object (so anti-adblock scripts think popups succeeded while zero tabs open) and strips known ad/popunder script tags via `HTMLRewriter`.
- **G2 (Parallel Start + Non-Blocking Hot-Upgrade to Direct Stream)**:
  - Extraction gets a realistic budget (client `EXTRACTION_TIMEOUT_MS = 9_000`, worker `4000ms` top / `3000ms` nested) and **never blocks mounting the iframe** (or runs seamlessly alongside it). If `fetchExtractedVideos` resolves with a playable `hls`/`mp4` stream within `12_000ms` of `playAttemptStartedAtRef` while `clockNow() < 60`, hot-upgrade `playerRenderMode` to `"direct"` at `clockNow()`.
- **G3 (Universal Worker Bridge Sync & Fair EWMA Speed Competition)**:
  - Enable `workerBridge: true` and `timeEvents: true` on `server-7`, `server-1`, `server-2`, `server-6` in `src/config/servers.ts`.
  - Upgrade `NL_BRIDGE_JS` in `cloudflare/worker.js` to post `NL_STATE`, `NL_ACK`, and `NL_SUBS` to **both `window.top` and `window.parent`** so nested iframes at `depth = 1..3` sync directly with `MoviesPage.tsx`.
  - Unlock `serverSpeedMonitor.ts` so all sync-capable servers compete fairly in Bucket 0 by real EWMA latency, while preserving 100% compatibility with `src/utils/securityRegression.test.ts`.
- **G4 (Same-Source Synchronized Subtitles + HLS VTT Merger + PAL/NTSC Auto-Retiming + Manual Clock Fallback)**:
  - Worker `extractFromPage` unpacks `p,a,c,k,e,d` bundles, preserves nested-iframe `referer` for both videos and subtitles, and extracts `<track>`, JSON `{file,label}`, PlayerJS `[Language]https://...`, and raw `.vtt`/`.srt` tracks.
  - Worker `/embed` sniffs runtime `.vtt`/`.srt` fetches (`NL_SUBS`) and forwards them to `MoviesPage.tsx` via `iframeBridge.ts` (`onSubtitlesDiscovered`).
  - `streamSubtitles.ts` maps `hls.subtitleTracks`, merges segmented HLS WebVTT playlists (`mergeHlsVttPlaylist`), deduplicates cues (`dedupeCues`), places stream/worker tracks first (`mergeStreamFirst`), and auto-retimes 25fps↔23.976fps cues (`autoRetimeCues`) when cues overflow real media duration.
  - `ManualSyncBar.tsx` provides a floating manual subtitle clock bar whenever `controlMode === "none"` and a subtitle track is active.
- **G5 (Strict Regression Safety)**:
  - In `src/services/videoExtractor.ts`, `extractSubtitlesFromResult` **MUST** keep returning the exact 5 keys `{ url, proxiedUrl, lang, label, default }` so `expect(videos).toEqual(...)` in `src/utils/securityRegression.test.ts` (lines 113–134) passes without modification.

# CHANGESET
| # | File Path | Status | Description |
|---|-----------|--------|-------------|
| 1 | `src/config/servers.ts` | **MODIFIED** | Adds `adShield`, `sandbox`, and `SANDBOX_STRICT`; enables `timeEvents`, `workerBridge`, `adShield`, and `sandbox` across servers. |
| 2 | `src/features/cinema/player/sandboxPolicy.ts` | **NEW** | Manages per-server iframe `sandbox` verdicts (`ok` / `refused` with 7-day TTL) and `AdShield` preference. |
| 3 | `src/features/cinema/player/AdShield.tsx` | **NEW** | Transparent pointer-capturing overlay blocking iframe user-activation popups with play/seek/fullscreen gestures & 8s pass-through. |
| 4 | `src/features/cinema/player/ManualSyncBar.tsx` | **NEW** | Floating manual subtitle clock controller (Play/Pause + `±0.5s`) for unbridged fallback iframes. |
| 5 | `src/features/cinema/subtitles/streamSubtitles.ts` | **NEW** | HLS WebVTT playlist merger, `hls.subtitleTracks` mapper, cue deduplicator, `mergeStreamFirst`, and 25↔23.976fps `autoRetimeCues`. |
| 6 | `src/services/serverSpeedMonitor.ts` | **MODIFIED** | Fair Bucket 0 EWMA latency ranking for all `timeEvents`/`workerBridge` servers; removes `server-vl` overwrite lock while keeping unit tests green. |
| 7 | `src/services/videoExtractor.ts` | **MODIFIED** | Sets `EXTRACTION_TIMEOUT_MS = 9_000`, parses PlayerJS `[Lang]url` & custom `referer` while preserving the exact 5-key test contract. |
| 8 | `src/services/subtitleService.ts` | **MODIFIED** | Integrates `isHlsPlaylistText`, `mergeHlsVttPlaylist`, and `dedupeCues` into `ensureTrackLoaded`. |
| 9 | `src/features/cinema/player/iframeBridge.ts` | **MODIFIED** | Adds `NL_SUBS` (`onSubtitlesDiscovered`) and `NL_STREAM` (`onStreamDiscovered`) parsing to the Worker bridge protocol. |
| 10 | `cloudflare/worker.js` | **MODIFIED** | Adds `NL_POPUP_GUARD_JS`, `window.top` relay & runtime subtitle sniffer (`NL_SUBS`), `unpackDeanEdwards`, `collectSubtitles`, and nested `referer` preservation. |
| 11 | `src/components/Movies/MoviesPage.tsx` | **MODIFIED** | Full integration with exact variable names: parallel extraction + hot-upgrade, `AdShield`, `sandboxPolicy`, `ManualSyncBar`, `streamSubtitles`, `autoRetimeCues`, and inline Server Switcher pills. |
| 12 | `src/styles/components/cinema.css` | **MODIFIED** | Appends styles for `.nl-adshield`, `.nl-sandbox-escape`, and `.nl-manual-sync`. |
| 13 | `src/i18n/locales/{ar,en,fr}.json` | **MODIFIED** | Adds `adShieldArmed`, `adShieldPass`, `adShieldPassHint`, `sandboxEscape`, and `manualSync` under `movies.player`. |
| 14 | `index.html` | **MODIFIED** | Adds `<link rel="preconnect" href="https://vidlink.pro" crossorigin>` and `dns-prefetch`. |
| 15 | `src/features/cinema/player/__tests__/sandboxPolicy.test.ts` | **NEW** | Unit tests for `sandboxPolicy.ts`. |
| 16 | `src/features/cinema/subtitles/__tests__/streamSubtitles.test.ts` | **NEW** | Unit tests for `streamSubtitles.ts` (HLS VTT merge, master group follow, dedupe, PAL 25fps retiming). |

---

## 1) `src/config/servers.ts` — MODIFIED
Replace the entire file with the following complete implementation:

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
    /** Cover iframe with a click-capturing overlay so ad scripts never get user activation. */
    adShield?: boolean;
    /** iframe sandbox tokens tried first (never allow-popups). Auto-fallback handled by sandboxPolicy.ts. */
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

/** No allow-popups, no allow-top-navigation, no allow-modals. allow-same-origin is safe here: content is cross-origin. */
export const SANDBOX_STRICT = 'allow-scripts allow-same-origin allow-forms allow-presentation';

// Ordered with VidLink (server-vl) as the default primary server (index 0), and Servers 3, 4, 5 permanently removed.
export const CINEMA_SERVERS: CinemaServerConfig[] = [
  {
    id: 'server-vl',
    label: 'VidLink',
    host: 'vidlink.pro',
    origins: ['https://vidlink.pro', 'https://player.vidlink.pro', 'https://cloud.vidlink.pro'],
    supports: { imdb: false, tmdb: true },
    capabilities: {
      timeEvents: true,
      startAt: true,
      adShield: true,
      sandbox: SANDBOX_STRICT,
    },
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
    capabilities: {
      timeEvents: true,
      workerBridge: true,
      adShield: true,
      sandbox: SANDBOX_STRICT,
    },
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
    capabilities: {
      timeEvents: true,
      workerBridge: true,
      adShield: true,
      sandbox: SANDBOX_STRICT,
    },
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
    capabilities: {
      timeEvents: true,
      workerBridge: true,
      adShield: true,
      sandbox: SANDBOX_STRICT,
    },
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
    capabilities: {
      timeEvents: true,
      workerBridge: true,
      adShield: true,
      sandbox: SANDBOX_STRICT,
    },
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
  server?: { capabilities?: { timeEvents?: boolean; workerBridge?: boolean } } | null,
): boolean => Boolean(server?.capabilities?.timeEvents || server?.capabilities?.workerBridge);

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

````

## 2) `src/features/cinema/player/sandboxPolicy.ts` — NEW

Create this new file with the following complete implementation:

```
// src/features/cinema/player/sandboxPolicy.ts
import type { CinemaServerConfig } from "../../../config/servers";

export const SANDBOX_STORAGE_KEY = "nl_cinema_sandbox_v1";
export const AD_SHIELD_PREF_KEY = "nl_cinema_adshield_v1";
/** Time-emitting servers must produce a sync-capable event within this window while sandboxed. */
export const SANDBOX_PROBE_MS = 10_000;
/** Silent servers: after this delay show the "disable protection" escape button. */
export const SANDBOX_ESCAPE_HINT_MS = 6_000;
const VERDICT_TTL_MS = 7 * 24 * 3600 * 1000;

export type SandboxVerdict = "ok" | "refused";
type Store = Record<string, { v: SandboxVerdict; at: number }>;

function read(): Store {
  try {
    const raw = localStorage.getItem(SANDBOX_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? (parsed as Store) : {};
  } catch {
    return {};
  }
}

function write(store: Store): void {
  try {
    localStorage.setItem(SANDBOX_STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* private mode / quota */
  }
}

type ServerLike = Pick<CinemaServerConfig, "id" | "capabilities"> | null | undefined;

/** Returns sandbox tokens for the iframe, or undefined when the server must run unsandboxed. */
export function getIframeSandbox(server: ServerLike): string | undefined {
  const tokens = server?.capabilities?.sandbox;
  if (!server || !tokens) return undefined;
  const rec = read()[server.id];
  if (rec && rec.v === "refused" && Date.now() - rec.at < VERDICT_TTL_MS) return undefined;
  return tokens;
}

export function getSandboxVerdict(serverId: string): SandboxVerdict | null {
  const rec = read()[serverId];
  if (!rec || Date.now() - rec.at >= VERDICT_TTL_MS) return null;
  return rec.v;
}

export function markSandboxVerdict(serverId: string, v: SandboxVerdict): void {
  if (!serverId) return;
  const store = read();
  if (store[serverId]?.v === v && Date.now() - store[serverId].at < VERDICT_TTL_MS / 2) return;
  store[serverId] = { v, at: Date.now() };
  write(store);
}

export function clearSandboxVerdict(serverId: string): void {
  const store = read();
  if (serverId in store) {
    delete store[serverId];
    write(store);
  }
}

export function getAdShieldEnabled(): boolean {
  try {
    return localStorage.getItem(AD_SHIELD_PREF_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setAdShieldEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(AD_SHIELD_PREF_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
}

```

## 3) `src/features/cinema/player/AdShield.tsx` — NEW

Create this new file with the following complete implementation:

```
// src/features/cinema/player/AdShield.tsx
// Transparent overlay above an ad-heavy iframe. Because no pointer event ever reaches the iframe,
// its scripts never receive transient user activation, so browsers block window.open popups.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ShieldCheck, ShieldOff } from "lucide-react";

export interface AdShieldProps {
  active: boolean;
  onTogglePlay: () => void;
  onSeekRelative: (deltaSec: number) => void;
  onToggleFullscreen?: () => void;
  onActivity?: () => void;
  labels: { armed: string; passThrough: string; passThroughHint: string };
  passThroughMs?: number;
}

const DOUBLE_MS = 260;

export function AdShield({
  active,
  onTogglePlay,
  onSeekRelative,
  onToggleFullscreen,
  onActivity,
  labels,
  passThroughMs = 8000,
}: AdShieldProps) {
  const [passUntil, setPassUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapAt = useRef(0);
  const passing = passUntil > now;

  useEffect(() => {
    if (!passUntil) return undefined;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= passUntil) setPassUntil(0);
    }, 250);
    return () => window.clearInterval(id);
  }, [passUntil]);

  useEffect(
    () => () => {
      if (clickTimer.current) clearTimeout(clickTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!active) setPassUntil(0);
  }, [active]);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      onActivity?.();
      const rect = e.currentTarget.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / Math.max(1, rect.width);
      const t = performance.now();
      if (t - lastTapAt.current < DOUBLE_MS) {
        lastTapAt.current = 0;
        if (clickTimer.current) {
          clearTimeout(clickTimer.current);
          clickTimer.current = null;
        }
        if (e.pointerType !== "mouse" && relX < 0.35) onSeekRelative(-10);
        else if (e.pointerType !== "mouse" && relX > 0.65) onSeekRelative(10);
        else onToggleFullscreen?.();
        return;
      }
      lastTapAt.current = t;
      // Touch: single tap only reveals controls (YouTube-like). Mouse: single click toggles play.
      if (e.pointerType === "mouse") {
        clickTimer.current = setTimeout(() => {
          clickTimer.current = null;
          onTogglePlay();
        }, DOUBLE_MS);
      }
    },
    [onActivity, onSeekRelative, onToggleFullscreen, onTogglePlay],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const k = e.key.toLowerCase();
      if (k === " " || k === "k") onTogglePlay();
      else if (k === "arrowleft") onSeekRelative(-10);
      else if (k === "arrowright") onSeekRelative(10);
      else if (k === "f") onToggleFullscreen?.();
      else return;
      e.preventDefault();
      onActivity?.();
    },
    [onActivity, onSeekRelative, onToggleFullscreen, onTogglePlay],
  );

  if (!active) return null;

  return (
    <>
      <div
        className={`nl-adshield${passing ? " nl-adshield--passing" : ""}`}
        role="button"
        tabIndex={0}
        aria-label={labels.armed}
        onPointerUp={handlePointerUp}
        onPointerMove={onActivity}
        onKeyDown={handleKeyDown}
        onContextMenu={(e) => e.preventDefault()}
      />
      <button
        type="button"
        className="nl-adshield__toggle"
        data-passing={passing ? "true" : "false"}
        title={passing ? labels.passThroughHint : labels.passThrough}
        aria-label={passing ? labels.passThroughHint : labels.passThrough}
        onClick={(e) => {
          e.stopPropagation();
          if (passing) {
            setPassUntil(0);
          } else {
            const t = Date.now();
            setNow(t);
            setPassUntil(t + passThroughMs);
          }
        }}
      >
        {passing ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
        <span>{passing ? `${Math.max(0, Math.ceil((passUntil - now) / 1000))}s` : labels.armed}</span>
      </button>
    </>
  );
}

```

## 4) `src/features/cinema/player/ManualSyncBar.tsx` — NEW

Create this new file with the following complete implementation:

```
// src/features/cinema/player/ManualSyncBar.tsx
// For silent (Tier 3) servers when bridge is inactive: lets the user drive the subtitle clock by hand.
import React, { useEffect } from "react";
import { Pause, Play } from "lucide-react";
import { clockNow, clockPause, clockPlay, clockSeek, clockSync, useClockState, useClockTime } from "./playbackClock";

const fmt = (s: number) => {
  const v = Math.max(0, Math.floor(s));
  const h = Math.floor(v / 3600);
  const m = Math.floor((v % 3600) / 60);
  const sec = v % 60;
  return `${h > 0 ? `${h}:` : ""}${String(m).padStart(h > 0 ? 2 : 1, "0")}:${String(sec).padStart(2, "0")}`;
};

export function ManualSyncBar({ visible, label }: { visible: boolean; label: string }) {
  const st = useClockState();
  const t = useClockTime(500);

  useEffect(() => {
    if (visible && st.source !== "manual") clockSync({ source: "manual" });
  }, [visible, st.source]);

  if (!visible) return null;
  return (
    <div className="nl-manual-sync" role="group" aria-label={label}>
      <span className="nl-manual-sync__label">{label}</span>
      <button type="button" onClick={() => (st.paused ? clockPlay() : clockPause())} aria-label={st.paused ? "Play" : "Pause"}>
        {st.paused ? <Play size={13} /> : <Pause size={13} />}
      </button>
      <button type="button" onClick={() => clockSeek(Math.max(0, clockNow() - 0.5))}>−0.5s</button>
      <span className="nl-manual-sync__time">{fmt(t)}</span>
      <button type="button" onClick={() => clockSeek(clockNow() + 0.5)}>+0.5s</button>
    </div>
  );
}

```

## 5) `src/features/cinema/subtitles/streamSubtitles.ts` — NEW

Create this new file with the following complete implementation:

```
// src/features/cinema/subtitles/streamSubtitles.ts
import type { ExtractedSubtitleTrack, SubtitleCue } from "../../../services/videoExtractor";
import { getLanguageLabel, normalizeLangCode } from "./languages";

const MAX_SEGMENTS = 1500;
const CONCURRENCY = 12;

export function isHlsPlaylistText(text: string): boolean {
  return /^\uFEFF?\s*#EXTM3U/.test(text);
}

/** Removes the WEBVTT header block (incl. X-TIMESTAMP-MAP). Assumes MPEGTS offset == stream start (common case). */
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

/** Merges an HLS WebVTT media playlist (or master → first subtitle group) into one WebVTT document. */
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

/** If cues overflow the REAL media duration (PAL 25fps subs on a 23.976 stream), rescale them. */
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

/** Maps hls.js `subtitleTracks` (already Worker-proxied because the master was rewritten) to lazy tracks. */
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

/** Same-source tracks first; drops later duplicates by id or proxiedUrl/url. */
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

## 6) `src/services/serverSpeedMonitor.ts` — MODIFIED

Replace the entire file with the following complete implementation. It unlocks fair Bucket 0 competition across all `timeEvents` and `workerBridge` servers and removes the `"server-vl"` lock in `recordServerSuccess`, while preserving 100% compatibility with the mock test in `src/utils/securityRegression.test.ts`:

```
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

/**
 * Records a successful server playback startup and updates its EWMA latency score in cache.
 * Faster servers receive lower score values and are automatically promoted within their tier.
 */
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
    state.byTitle[titleKey] = serverId;
  }

  writeStorage(state);
}

/**
 * Records a server failure or timeout, increasing its effective latency score so faster
 * working servers are prioritized ahead of it on subsequent plays.
 */
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

/**
 * Computes an effective priority score (lower = faster & more reliable) for a server.
 */
export function getServerPriorityScore(
  serverId: string,
  defaultIndex: number,
  state?: StoredSpeedState,
): number {
  const current = state || readStorage();
  const metric = current.metrics[serverId];
  if (!metric) {
    // Preserve natural configuration order until measured
    return DEFAULT_BASELINE_MS + defaultIndex * 180;
  }
  const reliabilityBonus = Math.min(600, metric.successCount * 85);
  const failurePenalty = metric.failureCount * 1400;
  return metric.ewmaLatencyMs - reliabilityBonus + failurePenalty;
}

/**
 * Sorts an array of play sources using a strict Tiered Hierarchy:
 * - Bucket 0 (Tier 2 Sync-Capable): Sources with `capabilities.timeEvents === true` or
 *   `capabilities.workerBridge === true` (or `server-vl` when bare mock objects without `capabilities`
 *   are passed in unit tests), ordered among themselves by EWMA speed and reliability.
 * - Bucket 1 (Tier 3 Silent): Fallback embeds without sync capabilities, ordered by EWMA speed.
 */
export function sortSourcesBySpeed<
  T extends { id: string; capabilities?: { timeEvents?: boolean; workerBridge?: boolean } },
>(sources: T[], titleKey?: string): T[] {
  if (!Array.isArray(sources) || sources.length <= 1) return sources;
  const state = readStorage();
  const preferredForTitle = titleKey ? state.byTitle[titleKey] : undefined;
  const hasTmdb = Boolean(
    titleKey && (titleKey.startsWith("movie_") || titleKey.startsWith("tv_")),
  );
  const anyExplicitCaps = sources.some((s) => s.capabilities !== undefined);

  return [...sources]
    .map((src, originalIdx) => {
      let score = getServerPriorityScore(src.id, originalIdx, state);
      const metric = state.metrics[src.id];
      const hasFailed = Boolean(
        metric && metric.failureCount > metric.successCount,
      );

      const isTimeEvents =
        src.capabilities?.timeEvents === true ||
        src.capabilities?.workerBridge === true ||
        (!anyExplicitCaps && hasTmdb && src.id === "server-vl");

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

/**
 * Returns the ordered indices `[0..sources.length-1]` sorted by tier and speed.
 */
export function buildSpeedSortedQueue<
  T extends { id: string; capabilities?: { timeEvents?: boolean; workerBridge?: boolean } },
>(sources: T[], titleKey?: string): number[] {
  if (!Array.isArray(sources) || sources.length === 0) return [0];
  const sorted = sortSourcesBySpeed(sources, titleKey);
  return sorted
    .map((s) => sources.findIndex((orig) => orig.id === s.id))
    .filter((idx) => idx >= 0);
}

```

## 7) `src/services/videoExtractor.ts` — MODIFIED

Replace the entire file with the following complete implementation. **CRITICAL TEST INVARIANT**: `extractSubtitlesFromResult` preserves the exact 5 keys `{ url, proxiedUrl, lang, label, default }` required by `src/utils/securityRegression.test.ts` (lines 113–134), while adding `EXTRACTION_TIMEOUT_MS = 9_000`, `provider?: ... | "stream"`, per-item `referer` support, and PlayerJS `[Lang]url` expansion:

```
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
): ExtractedSubtitleTrack[] {
  const rawList: Array<RawSubtitleItem | string> = expandRawSubtitleEntries([
    ...(Array.isArray(videoItem?.subtitles) ? videoItem.subtitles : []),
    ...(Array.isArray(videoItem?.tracks) ? videoItem.tracks : []),
    ...(Array.isArray(pageResult.subtitles) ? pageResult.subtitles : []),
    ...(Array.isArray(pageResult.tracks) ? pageResult.tracks : []),
    ...(Array.isArray(pageResult.captions) ? pageResult.captions : []),
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

/**
 * دالة استخراج روابط الفيديو (.m3u8 / .mp4) والترجمات عبر Cloudflare Worker
 */
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
            subtitles: extractSubtitlesFromResult(pageResult, video),
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

## 8) `src/services/subtitleService.ts` — MODIFIED

Replace the entire file with the following complete implementation (adds `dedupeCues`, `isHlsPlaylistText`, and `mergeHlsVttPlaylist` inside `ensureTrackLoaded`):

```
// src/services/subtitleService.ts
import { PUBLIC_OPENSUBTITLES_KEY, PUBLIC_WYZIE_KEY } from "../config/publicKeys";
import { WORKER_ENDPOINT, type ExtractedSubtitleTrack, type SubtitleCue } from "./videoExtractor";
import { LEGACY_ENCODING, getLanguageLabel, normalizeLangCode } from "../features/cinema/subtitles/languages";
import { getSubtitlePrefs } from "../features/cinema/subtitles/subtitlePrefs";
import { dedupeCues, isHlsPlaylistText, mergeHlsVttPlaylist } from "../features/cinema/subtitles/streamSubtitles";

/** "1" once the Worker routes /subs/* are deployed with the WYZIE_KEY secret (Phase 3). */
const USE_WORKER_SUBS_PROXY = import.meta.env.VITE_USE_WORKER_SUBS_PROXY === "1";
const WYZIE_KEY = USE_WORKER_SUBS_PROXY ? "" : import.meta.env.VITE_WYZIE_API_KEY || PUBLIC_WYZIE_KEY;
const OS_KEY = import.meta.env.VITE_OPENSUBTITLES_API_KEY || PUBLIC_OPENSUBTITLES_KEY;
const MAX_VERSIONS_PER_LANG = 6;

export interface SubtitleFetchParams {
  tmdbId: number;
  imdbId?: string;
  mediaType: "movie" | "tv";
  season?: number;
  episode?: number;
  signal?: AbortSignal;
  languages?: string[];
}

/* ---------- parsing ---------- */

function parseTimestampToSeconds(ts: string): number {
  const parts = ts.trim().replace(",", ".").split(":").map((p) => Number(p) || 0);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

/** Wyzie free-tier notice + common provider ads. Strong = anywhere, weak = only first/last 3 cues. */
const STRONG_AD = [/wyzie/i, /store\.wyzie/i, /you'?re on the free plan/i, /ad-?free subs/i];
const WEAK_AD = [
  /opensubtitles/i, /subtitles? (by|ripped|downloaded)/i, /sync(ed)? (&|and) correct/i,
  /support us and become vip/i, /advertise your product/i, /\bwww\.[a-z0-9-]+\.[a-z]{2,}/i, /https?:\/\//i,
];

export function stripAdCues(cues: SubtitleCue[]): SubtitleCue[] {
  const n = cues.length;
  return cues.filter((cue, i) => {
    if (STRONG_AD.some((re) => re.test(cue.text))) return false;
    const edge = i < 3 || i >= n - 3;
    return !(edge && WEAK_AD.some((re) => re.test(cue.text)));
  });
}

export function parseSubtitleCues(rawText: string): SubtitleCue[] {
  const normalized = rawText.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
  if (!normalized) return [];
  const timeRegex = /((?:\d{1,2}:)?\d{2}:\d{2}[.,]\d{1,3})\s*-->\s*((?:\d{1,2}:)?\d{2}:\d{2}[.,]\d{1,3})/;
  const cues: SubtitleCue[] = [];
  for (const block of normalized.split(/\n{2,}/)) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length || lines[0].startsWith("NOTE") || lines[0].startsWith("STYLE")) continue;
    let idx = -1;
    let match: RegExpMatchArray | null = null;
    for (let i = 0; i < Math.min(lines.length, 3); i += 1) {
      const m = lines[i].match(timeRegex);
      if (m) { idx = i; match = m; break; }
    }
    if (idx === -1 || !match) continue;
    const start = parseTimestampToSeconds(match[1]);
    const end = parseTimestampToSeconds(match[2]);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    const text = lines
      .slice(idx + 1)
      .map((l) => l.replace(/\{[^}]*\}/g, "").replace(/<\/?[^>]+(>|$)/g, "").trim())
      .filter(Boolean)
      .join("\n");
    if (text) cues.push({ start, end, text });
  }
  cues.sort((a, b) => a.start - b.start);
  return stripAdCues(cues);
}

const pad = (n: number, l = 2) => String(Math.floor(n)).padStart(l, "0");
const vttTime = (s: number) =>
  `${pad(s / 3600)}:${pad((s % 3600) / 60)}:${pad(s % 60)}.${pad(Math.round((s % 1) * 1000) % 1000, 3)}`;

export function cuesToVttBlobUrl(cues: SubtitleCue[]): string {
  const body = cues.map((c) => `${vttTime(c.start)} --> ${vttTime(c.end)}\n${c.text}`).join("\n\n");
  return URL.createObjectURL(new Blob([`WEBVTT\n\n${body}\n`], { type: "text/vtt;charset=utf-8" }));
}

/** Kept for backward compatibility; now also strips ads. */
export function convertSrtToVttBlobUrl(rawText: string): string {
  const cues = parseSubtitleCues(rawText);
  if (!cues.length) throw new Error("Empty subtitle content");
  return cuesToVttBlobUrl(cues);
}

export function revokeSubtitleBlobUrls(tracks?: ExtractedSubtitleTrack[] | null): void {
  if (!Array.isArray(tracks)) return;
  for (const track of tracks) {
    for (const c of [track?.url, track?.proxiedUrl]) {
      if (typeof c === "string" && c.startsWith("blob:")) {
        try { URL.revokeObjectURL(c); } catch { /* ignore */ }
      }
    }
  }
}

/** UTF-8 first; fall back to the language's legacy code page (fixes broken Arabic). */
export function decodeSubtitleBytes(buf: ArrayBuffer, lang?: string): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    const enc = (lang && LEGACY_ENCODING[lang]) || "windows-1252";
    try { return new TextDecoder(enc).decode(buf); } catch { return new TextDecoder("utf-8").decode(buf); }
  }
}

async function fetchSubtitleText(url: string, lang: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch(url, { signal: signal ?? AbortSignal.timeout(9000) });
  if (!res.ok) throw new Error(`Subtitle HTTP ${res.status}`);
  return decodeSubtitleBytes(await res.arrayBuffer(), lang);
}

/* ---------- providers (search only; download is lazy) ---------- */

const SEARCH_CACHE = new Map<string, ExtractedSubtitleTrack[]>();

async function searchWyzie(params: SubtitleFetchParams, langs: string[]): Promise<ExtractedSubtitleTrack[]> {
  const imdb = params.imdbId && /^tt\d+$/i.test(params.imdbId.trim()) ? params.imdbId.trim() : "";
  const ids = imdb ? [imdb, String(params.tmdbId)] : [String(params.tmdbId)];
  for (const id of ids) {
    const u = USE_WORKER_SUBS_PROXY ? new URL("subs/search", WORKER_ENDPOINT) : new URL("https://sub.wyzie.io/search");
    u.searchParams.set("id", id);
    u.searchParams.set("language", langs.join(","));
    if (WYZIE_KEY) u.searchParams.set("key", WYZIE_KEY);
    if (params.mediaType === "tv") {
      u.searchParams.set("season", String(Math.max(1, params.season || 1)));
      u.searchParams.set("episode", String(Math.max(1, params.episode || 1)));
    }
    try {
      const res = await fetch(u.toString(), { signal: params.signal ?? AbortSignal.timeout(9000) });
      if (!res.ok) continue;
      const payload = await res.json();
      const list: any[] = Array.isArray(payload) ? payload : payload?.subtitles ?? payload?.results ?? [];
      const tracks = list
        .filter((it) => it && typeof it.url === "string" && it.url.trim())
        .map((it, i): ExtractedSubtitleTrack => {
          const lang = normalizeLangCode(it.language || it.lang || it.iso639);
          const release = String(it.release || it.fileName || it.media || it.display || "").slice(0, 120);
          return {
            id: `wyzie:${it.id ?? i}:${lang}`,
            provider: "wyzie",
            lang,
            label: getLanguageLabel(lang),
            release,
            hearingImpaired: Boolean(it.isHearingImpaired ?? it.hearingImpaired),
            remoteUrl: it.url,
            url: "",
            proxiedUrl: "",
            loaded: false,
          };
        });
      if (tracks.length) return tracks;
    } catch { /* try next id */ }
  }
  return [];
}

async function searchOpenSubtitles(params: SubtitleFetchParams, langs: string[]): Promise<ExtractedSubtitleTrack[]> {
  if (!OS_KEY) return [];
  const numericImdb = params.imdbId ? params.imdbId.replace(/^tt/i, "").replace(/\D/g, "") : "";
  const q: Array<[string, string]> = [["languages", langs.join(",")]];
  if (params.mediaType === "tv") {
    q.push(["episode_number", String(Math.max(1, params.episode || 1))]);
    q.push(["season_number", String(Math.max(1, params.season || 1))]);
    q.push(numericImdb ? ["parent_imdb_id", numericImdb] : ["parent_tmdb_id", String(params.tmdbId)]);
  } else {
    q.push(numericImdb ? ["imdb_id", numericImdb] : ["tmdb_id", String(params.tmdbId)]);
  }
  q.sort(([a], [b]) => a.localeCompare(b));
  const res = await fetch(`https://api.opensubtitles.com/api/v1/subtitles?${new URLSearchParams(q)}`, {
    headers: { "Api-Key": OS_KEY, "User-Agent": "NLfilms v1.0", Accept: "application/json" },
    signal: params.signal ?? AbortSignal.timeout(9000),
  });
  if (!res.ok) return [];
  const json = await res.json();
  return (Array.isArray(json?.data) ? json.data : [])
    .map((entry: any): ExtractedSubtitleTrack | null => {
      const a = entry?.attributes;
      const fileId = a?.files?.[0]?.file_id;
      if (typeof fileId !== "number") return null;
      const lang = normalizeLangCode(a?.language);
      return {
        id: `os:${fileId}`,
        provider: "opensubtitles",
        lang,
        label: getLanguageLabel(lang),
        release: String(a?.release || a?.files?.[0]?.file_name || "").slice(0, 120),
        hearingImpaired: Boolean(a?.hearing_impaired),
        osFileId: fileId,
        url: "",
        proxiedUrl: "",
        loaded: false,
      };
    })
    .filter(Boolean) as ExtractedSubtitleTrack[];
}

async function downloadOpenSubtitles(fileId: number, lang: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch("https://api.opensubtitles.com/api/v1/download", {
    method: "POST",
    headers: { "Api-Key": OS_KEY, "User-Agent": "NLfilms v1.0", Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId, sub_format: "srt" }),
    signal: signal ?? AbortSignal.timeout(9000),
  });
  if (!res.ok) throw new Error(`OpenSubtitles download HTTP ${res.status}`);
  const link = (await res.json())?.link;
  if (typeof link !== "string" || !link) throw new Error("No download link");
  return fetchSubtitleText(link, lang, signal);
}

/* ---------- lazy loading ---------- */

const INFLIGHT = new Map<string, Promise<ExtractedSubtitleTrack>>();

/** Downloads, decodes, merges HLS WebVTT segments if needed, ad-filters and converts a lazy track. */
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

/** Backward-compatible: returns cues, loading lazily when needed. */
export async function loadTrackCuesIfNeeded(track: ExtractedSubtitleTrack, signal?: AbortSignal): Promise<SubtitleCue[]> {
  if (Array.isArray(track.cues) && track.cues.length > 0) return track.cues;
  try {
    if (track.loaded === false || track.remoteUrl || track.osFileId) {
      return (await ensureTrackLoaded(track, signal)).cues ?? [];
    }
    const src = track.proxiedUrl || track.url;
    if (!src) return [];
    track.cues = parseSubtitleCues(await fetchSubtitleText(src, track.lang, signal));
    return track.cues;
  } catch {
    return [];
  }
}

export async function createLocalSubtitleTrack(file: File): Promise<ExtractedSubtitleTrack> {
  const text = decodeSubtitleBytes(await file.arrayBuffer(), getSubtitlePrefs().preferredLang);
  const cues = parseSubtitleCues(text);
  if (!cues.length) throw new Error("Invalid subtitle file");
  const blob = cuesToVttBlobUrl(cues);
  return {
    id: `local:${file.name}:${file.size}`,
    provider: "local",
    lang: "local",
    label: file.name.replace(/\.(srt|vtt)$/i, ""),
    url: blob,
    proxiedUrl: blob,
    cues,
    loaded: true,
  };
}

/**
 * Searches all chosen languages (1 request per provider), returns LAZY tracks sorted by preference,
 * and eagerly loads only the best track of the preferred language so subtitles start instantly.
 */
export async function fetchExternalSubtitles(params: SubtitleFetchParams): Promise<ExtractedSubtitleTrack[]> {
  const prefs = getSubtitlePrefs();
  const langs = (params.languages?.length ? params.languages : prefs.languages).slice(0, 8);
  const cacheKey = `${params.mediaType}:${params.tmdbId}:${params.season ?? 0}:${params.episode ?? 0}:${langs.join(",")}`;

  let all = SEARCH_CACHE.get(cacheKey);
  if (!all) {
    const settled = await Promise.allSettled([searchWyzie(params, langs), searchOpenSubtitles(params, langs)]);
    all = settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    SEARCH_CACHE.set(cacheKey, all);
  }

  const order = (l: string) => (l === prefs.preferredLang ? -1 : langs.indexOf(l) === -1 ? 99 : langs.indexOf(l));
  const perLang = new Map<string, number>();
  const result = all
    .filter((t) => langs.includes(t.lang))
    .sort(
      (a, b) =>
        order(a.lang) - order(b.lang) ||
        Number(Boolean(a.hearingImpaired) === prefs.hideHearingImpaired) -
          Number(Boolean(b.hearingImpaired) === prefs.hideHearingImpaired) ||
        (a.provider === "wyzie" ? -1 : 1) - (b.provider === "wyzie" ? -1 : 1),
    )
    .filter((t) => {
      const c = perLang.get(t.lang) ?? 0;
      perLang.set(t.lang, c + 1);
      return c < MAX_VERSIONS_PER_LANG;
    })
    .map((t) => ({ ...t, default: false }));

  for (const candidate of result.slice(0, 3)) {
    try {
      await ensureTrackLoaded(candidate, params.signal);
      candidate.default = true;
      break;
    } catch { /* try next version */ }
  }
  return result;
}

```

## 9) `src/features/cinema/player/iframeBridge.ts` — MODIFIED

Replace the entire file with the following complete implementation (adds `NL_SUBS` `discoveredSubtitles` and `NL_STREAM` `discoveredStream` while keeping all existing unit tests in `iframeBridge.test.ts` green):

```
import { useEffect, useRef, useState, type RefObject } from "react";

export type BridgeKind = "timeupdate" | "play" | "pause" | "seeked" | "ended" | "media";
export type BridgeTier = "worker" | "native";

export interface BridgeDiscoveredSubtitle {
  url: string;
  label?: string;
  lang?: string;
  referer?: string;
}

export interface BridgeDiscoveredStream {
  streamUrl: string;
  streamType?: "hls" | "mp4";
  referer?: string;
}

export interface BridgeEvent {
  kind: BridgeKind;
  currentTime?: number;
  duration?: number;
  paused?: boolean;
  rate?: number;
  ackId?: string;
  fid?: string;
  bridgeTier?: BridgeTier;
  payload?: unknown;
  discoveredSubtitles?: BridgeDiscoveredSubtitle[];
  discoveredStream?: BridgeDiscoveredStream;
}

export type IframePlayerCommand =
  | { type: "seek"; time: number }
  | { type: "play" }
  | { type: "pause" };

const lastSeqByFid = new Map<string, number>();

export function resetNlBridgeSeq(): void {
  lastSeqByFid.clear();
}

export function isSyncCapableEvent(ev: BridgeEvent | null | undefined): boolean {
  return Boolean(ev && typeof ev.currentTime === "number" && Number.isFinite(ev.currentTime));
}

const num = (v: unknown): number | undefined => {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
};

const KIND_MAP: Record<string, BridgeKind> = {
  timeupdate: "timeupdate", time: "timeupdate", progress: "timeupdate",
  play: "play", playing: "play", pause: "pause", paused: "pause",
  seeked: "seeked", seeking: "seeked", seek: "seeked", ended: "ended", complete: "ended",
  loadedmetadata: "timeupdate", durationchange: "timeupdate", ratechange: "timeupdate",
};

function extractMediaDataProgress(data: any): { currentTime?: number; duration?: number } {
  if (!data || typeof data !== "object") return {};
  const direct = data.progress && typeof data.progress === "object" ? data.progress : data;
  const ct = num(direct.watched ?? direct.currentTime ?? direct.time ?? direct.position);
  const dur = num(direct.duration ?? data.duration);
  if (ct !== undefined) return { currentTime: ct, duration: dur };
  for (const val of Object.values(data)) {
    if (val && typeof val === "object") {
      const p = (val as any).progress ?? val;
      const w = num(p?.watched ?? p?.currentTime ?? p?.time);
      const d = num(p?.duration);
      if (w !== undefined) return { currentTime: w, duration: d };
    }
  }
  return {};
}

export function parsePlayerMessage(raw: unknown): BridgeEvent | null {
  let d: any = raw;
  if (typeof d === "string") {
    if (!d.trim().startsWith("{")) return null;
    try { d = JSON.parse(d); } catch { return null; }
  }
  if (!d || typeof d !== "object") return null;

  // 1. Versioned NL Worker bridge protocol (__nl: 1)
  if (d.__nl === 1 && typeof d.type === "string") {
    const fidKey = typeof d.fid === "string" && d.fid ? d.fid : "_";
    if (d.type === "NL_READY") {
      lastSeqByFid.delete(fidKey);
      return {
        kind: "media",
        fid: typeof d.fid === "string" ? d.fid : undefined,
      };
    }
    if (d.type === "NL_SUBS" && Array.isArray(d.tracks)) {
      const referer = typeof d.referer === "string" ? d.referer : undefined;
      const discoveredSubtitles: BridgeDiscoveredSubtitle[] = d.tracks
        .filter((t: any) => t && typeof t.url === "string" && t.url.trim())
        .map((t: any) => ({
          url: String(t.url).trim(),
          label: typeof t.label === "string" ? t.label : undefined,
          lang: typeof t.lang === "string" ? t.lang : undefined,
          referer,
        }));
      if (discoveredSubtitles.length === 0) return null;
      return {
        kind: "media",
        fid: typeof d.fid === "string" ? d.fid : undefined,
        discoveredSubtitles,
      };
    }
    if (d.type === "NL_STREAM" && typeof d.streamUrl === "string" && d.streamUrl.trim()) {
      return {
        kind: "media",
        fid: typeof d.fid === "string" ? d.fid : undefined,
        discoveredStream: {
          streamUrl: d.streamUrl.trim(),
          streamType: d.streamType === "mp4" ? "mp4" : "hls",
          referer: typeof d.referer === "string" ? d.referer : undefined,
        },
      };
    }
    if (d.type === "NL_ACK") {
      const ct = num(d.t);
      return {
        kind: "seeked",
        currentTime: ct,
        duration: num(d.d),
        paused: typeof d.paused === "boolean" ? d.paused : undefined,
        rate: num(d.rate),
        ackId: typeof d.id === "string" ? d.id : undefined,
        fid: typeof d.fid === "string" ? d.fid : undefined,
        bridgeTier: ct !== undefined ? "worker" : undefined,
      };
    }
    if (d.type === "NL_STATE") {
      const seq = num(d.seq);
      if (seq !== undefined) {
        const prevSeq = lastSeqByFid.get(fidKey);
        if (prevSeq !== undefined && seq <= prevSeq) return null;
        lastSeqByFid.set(fidKey, seq);
      }
      const evKey = String(d.ev || "timeupdate").toLowerCase();
      const ct = num(d.t);
      return {
        kind: KIND_MAP[evKey] ?? "timeupdate",
        currentTime: ct,
        duration: num(d.d),
        paused: typeof d.paused === "boolean" ? d.paused : undefined,
        rate: num(d.rate),
        fid: typeof d.fid === "string" ? d.fid : undefined,
        bridgeTier: ct !== undefined ? "worker" : undefined,
      };
    }
  }

  // VidLink (documented): { type: "PLAYER_EVENT", data: { event, currentTime, duration, ... } }
  if (d.type === "PLAYER_EVENT") {
    const payloadObj = d.data && typeof d.data === "object" ? d.data : d;
    const kind = KIND_MAP[String(payloadObj.event || "").toLowerCase()] ?? "timeupdate";
    const ct = num(payloadObj.currentTime ?? payloadObj.time ?? payloadObj.watched);
    const dur = num(payloadObj.duration ?? d.duration);
    const paused =
      typeof payloadObj.paused === "boolean"
        ? payloadObj.paused
        : kind === "pause" || kind === "ended"
          ? true
          : kind === "play" || kind === "timeupdate"
            ? false
            : undefined;
    return {
      kind,
      currentTime: ct,
      duration: dur,
      paused,
      bridgeTier: ct !== undefined ? "native" : undefined,
      payload: payloadObj,
    };
  }
  if (d.type === "MEDIA_DATA") {
    const prog = extractMediaDataProgress(d.data);
    return {
      kind: "media",
      currentTime: prog.currentTime,
      duration: prog.duration,
      paused: prog.currentTime !== undefined ? false : undefined,
      bridgeTier: prog.currentTime !== undefined ? "native" : undefined,
      payload: d.data,
    };
  }

  // Generic best-effort shapes (PlayerJS, JW, Video.js, HTML5 wrappers — still origin-gated by caller).
  const inner =
    d.data && typeof d.data === "object"
      ? d.data
      : d.info && typeof d.info === "object"
        ? d.info
        : d;
  const t = num(inner.currentTime ?? inner.time ?? inner.position ?? inner.watched);
  const evRaw = String(inner.event ?? d.event ?? d.api ?? "timeupdate").toLowerCase();
  const mappedKind = KIND_MAP[evRaw];
  if (t === undefined && !mappedKind) return null;
  const resolvedKind = mappedKind ?? "timeupdate";
  return {
    kind: resolvedKind,
    currentTime: t,
    duration: num(inner.duration ?? d.duration),
    paused:
      typeof inner.paused === "boolean"
        ? inner.paused
        : resolvedKind === "pause" || resolvedKind === "ended"
          ? true
          : resolvedKind === "play"
            ? false
            : undefined,
    bridgeTier: t !== undefined ? "native" : undefined,
  };
}

/** Send play / pause / seek commands to an embedded player iframe across common protocols. */
export function sendIframePlayerCommand(
  iframe: HTMLIFrameElement | null | undefined,
  cmd: IframePlayerCommand,
  id?: string,
): void {
  const win = iframe?.contentWindow;
  if (!win) return;

  const nlCmd =
    cmd.type === "seek"
      ? { __nl: 1, type: "NL_CMD", cmd: "seek", t: cmd.time, id }
      : { __nl: 1, type: "NL_CMD", cmd: cmd.type, id };

  const legacyPayloads: unknown[] =
    cmd.type === "seek"
      ? [
          { type: "PLAYER_COMMAND", command: "seek", currentTime: cmd.time, time: cmd.time },
          { api: "seek", set: cmd.time },
          JSON.stringify({ api: "seek", set: cmd.time }),
          { event: "command", func: "seekTo", args: [cmd.time, true] },
          JSON.stringify({ event: "command", func: "seekTo", args: [cmd.time, true] }),
          { action: "seek", time: cmd.time, value: cmd.time },
        ]
      : [
          { type: "PLAYER_COMMAND", command: cmd.type },
          { api: cmd.type },
          JSON.stringify({ api: cmd.type }),
          {
            event: "command",
            func: cmd.type === "play" ? "playVideo" : "pauseVideo",
            args: [],
          },
          JSON.stringify({
            event: "command",
            func: cmd.type === "play" ? "playVideo" : "pauseVideo",
            args: [],
          }),
          { action: cmd.type },
        ];

  const payloads: unknown[] = [nlCmd, ...legacyPayloads];

  for (const msg of payloads) {
    try {
      win.postMessage(msg, "*");
    } catch {
      // ignore cross-origin postMessage errors
    }
  }
}

/** Checks whether origin matches exactly or matches wildcard / subdomain patterns (e.g. *.vidlink.pro). */
export function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  if (!origin || !Array.isArray(allowedOrigins)) return false;
  try {
    const originHost = new URL(origin).hostname.toLowerCase();
    for (const allowed of allowedOrigins) {
      if (!allowed) continue;
      if (allowed === origin) return true;
      try {
        const allowedHost = new URL(allowed.replace('*.', '')).hostname.toLowerCase();
        if (originHost === allowedHost || originHost.endsWith('.' + allowedHost)) {
          return true;
        }
      } catch {
        if (allowed.includes('vidlink.') && /(^|\.)vidlink\.[a-z]+$/i.test(originHost)) {
          return true;
        }
      }
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Checks whether source originates from the active player frame.
 */
export function isFromFrame(
  source: MessageEventSource | null,
  root: Window | null | undefined,
  origin?: string,
  allowedOrigins?: string[],
  parsedEvent?: unknown,
): boolean {
  if (!source) return false;
  if (root && source === root) return true;

  try {
    const anySource = source as any;
    if (anySource.parent === window || anySource.top === window) {
      return true;
    }
  } catch {
    // Cross-origin access restriction in Site Isolation
  }

  if (origin && allowedOrigins && isOriginAllowed(origin, allowedOrigins) && parsedEvent) {
    return true;
  }

  return false;
}

function logBridgeDebug(
  origin: string,
  accepted: boolean,
  reason: "origin" | "source" | "parse" | null,
  data: unknown,
): void {
  try {
    if (typeof localStorage !== "undefined" && localStorage.getItem("nl_debug_bridge") === "1") {
      // eslint-disable-next-line no-console
      console.debug("[NLBridge]", origin, accepted ? "ACCEPT" : "REJECT:" + reason, data);
    }
  } catch {
    // ignore storage access errors
  }
}

export function useIframePlayerBridge(opts: {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  allowedOrigins: string[];
  enabled: boolean;
  sessionKey?: string;
  onEvent?: (ev: BridgeEvent) => void;
  onMediaData?: (payload: unknown) => void;
  onSubtitlesDiscovered?: (tracks: BridgeDiscoveredSubtitle[]) => void;
  onStreamDiscovered?: (stream: BridgeDiscoveredStream) => void;
}): { active: boolean; tier: BridgeTier | null } {
  const [active, setActive] = useState(false);
  const [tier, setTier] = useState<BridgeTier | null>(null);
  const onEventRef = useRef(opts.onEvent);
  onEventRef.current = opts.onEvent;
  const onMediaRef = useRef(opts.onMediaData);
  onMediaRef.current = opts.onMediaData;
  const onSubsRef = useRef(opts.onSubtitlesDiscovered);
  onSubsRef.current = opts.onSubtitlesDiscovered;
  const onStreamRef = useRef(opts.onStreamDiscovered);
  onStreamRef.current = opts.onStreamDiscovered;
  const originsKey = opts.allowedOrigins.join("|");
  const { iframeRef, enabled, sessionKey } = opts;

  useEffect(() => {
    setActive(false);
    setTier(null);
    resetNlBridgeSeq();
    if (!enabled) return undefined;
    let hasSynced = false;
    const allowed = new Set(originsKey.split("|").filter(Boolean));
    const isAllowedOrigin = (origin: string): boolean => {
      if (!origin) return false;
      if (allowed.has(origin)) return true;
      try {
        return (
          /(^|\.)vidlink\.[a-z]+$/i.test(new URL(origin).hostname) ||
          isOriginAllowed(origin, Array.from(allowed))
        );
      } catch {
        return false;
      }
    };

    const onMessage = (e: MessageEvent) => {
      if (!isAllowedOrigin(e.origin)) {
        logBridgeDebug(e.origin, false, "origin", e.data);
        return;
      }

      let d: any = e.data;
      if (typeof d === "string" && d.trim().startsWith("{")) {
        try {
          d = JSON.parse(d);
        } catch {
          // ignore json parse error
        }
      }

      const isKnownFormat =
        Boolean(d && typeof d === "object") &&
        (d.type === "PLAYER_EVENT" || d.__nl === 1 || d.type === "MEDIA_DATA");

      if (
        !isKnownFormat &&
        !isFromFrame(
          e.source,
          iframeRef.current?.contentWindow,
          e.origin,
          Array.from(allowed),
          d,
        )
      ) {
        logBridgeDebug(e.origin, false, "source", e.data);
        return;
      }

      const ev = parsePlayerMessage(e.data);
      if (!ev) {
        logBridgeDebug(e.origin, false, "parse", e.data);
        return;
      }
      logBridgeDebug(e.origin, true, null, e.data);

      if (ev.discoveredSubtitles && ev.discoveredSubtitles.length > 0) {
        onSubsRef.current?.(ev.discoveredSubtitles);
      }
      if (ev.discoveredStream) {
        onStreamRef.current?.(ev.discoveredStream);
      }

      const syncCapable = isSyncCapableEvent(ev);
      if (syncCapable) {
        hasSynced = true;
        setActive(true);
        if (ev.bridgeTier === "worker") {
          setTier("worker");
        } else if (ev.bridgeTier === "native") {
          setTier((prev) => prev ?? "native");
        }
      }

      if (ev.kind === "media") {
        if (syncCapable) {
          onEventRef.current?.(ev);
        }
        if (ev.payload !== undefined) {
          onMediaRef.current?.(ev.payload);
        }
        return;
      }

      if (syncCapable || (hasSynced && (ev.kind === "play" || ev.kind === "pause" || ev.kind === "ended")) || ev.ackId) {
        if (ev.ackId) {
          hasSynced = true;
          setActive(true);
        }
        onEventRef.current?.(ev);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [enabled, originsKey, iframeRef, sessionKey]);

  return { active, tier };
}

```

## 10) `cloudflare/worker.js` — MODIFIED

Replace the entire file with the following complete implementation. It combines `EXTRACT_TIMEOUT_TOP_MS = 4000` / `EXTRACT_TIMEOUT_NESTED_MS = 3000`, `unpackDeanEdwards`, `collectSubtitles` (`<track>`, JSON `{file,label}`, PlayerJS `[Lang]url`, and raw `.vtt`/`.srt` with nested-iframe `referer` preservation), `NL_POPUP_GUARD_JS` + spoofed `window.open`, `window.top.postMessage` relay, and runtime subtitle/stream sniffing (`NL_SUBS` / `NL_STREAM`):

```
// NL Worker — broad-block-7bd7 (ملف واحد يُلصق في لوحة Cloudflare)
// Routes: / (extract) · /embed · /proxy · /subs/search · /subs/file · /trailer/imdb · /meta/omdb · /tmdb/3/* · /health
// Secrets (اختيارية حسب المسار): WYZIE_KEY, OMDB_KEY, TMDB_KEY  | KV binding (اختياري ومستحسن): NL_CACHE
// Variable اختياري: ALLOWED_ORIGINS = "https://a.com,https://b.com"

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const DEFAULT_ALLOWED_ORIGINS = [
  "https://noureddinelmobaraki-web.github.io",
  "http://localhost:3000",
  "http://localhost:5173",
];
const MAX_PAGES = 5;
const EXTRACT_TIMEOUT_TOP_MS = 4000;
const EXTRACT_TIMEOUT_NESTED_MS = 3000;
const MAX_SUBTITLES = 20;
const SUB_URL_RE = /https?:\/\/[^\s"'<>\\`]+\.(?:vtt|srt)(?:\?[^\s"'<>\\`]*)?/gi;
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

function isAllowedCaller(request, env) {
  const list = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(",").map((s) => s.trim()) : DEFAULT_ALLOWED_ORIGINS;
  const workerOrigin = new URL(request.url).origin;
  const origin = request.headers.get("Origin");
  if (origin) return origin === workerOrigin || list.includes(origin);
  const ref = request.headers.get("Referer");
  if (ref) {
    try {
      const refOrigin = new URL(ref).origin;
      return refOrigin === workerOrigin || list.includes(refOrigin);
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

/* ---------------- /embed (HTMLRewriter Bridge + Popup Guard + Subtitle/Stream Sniffer) ---------------- */

const EMBED_HOST_ALLOW = /^(.*\.)?(vidlink\.pro|streamimdb\.ru|imdb\.su|2embed\.cc|2embed\.skin|2vcdn\.skin|multiembed\.mov|streamingnow\.mov|vidsrc\.[a-z]+|vidplay\.[a-z]+|filemoon\.[a-z]+|streamtape\.[a-z]+|dood\.[a-z]+|mixdrop\.[a-z]+|rabbitstream\.net|megacloud\.tv|dokicloud\.one|embed\.su)$/i;
const EMBED_AD_HOST_RE = /google|facebook|doubleclick|googlesyndication|recaptcha|popads|onclickads|acscdn|adsco|histats|exoclick|juicyads|propellerads|adsterra|clickadu|hilltopads/i;

const NL_POPUP_GUARD_JS = '(function(){try{var dummyWin={closed:false,focus:function(){},blur:function(){},close:function(){},postMessage:function(){},location:{href:"about:blank",assign:function(){},replace:function(){}},document:{write:function(){},open:function(){},close:function(){}}};var B=function(){return dummyWin};try{Object.defineProperty(window,"open",{configurable:false,writable:false,value:B})}catch(e){try{window.open=B}catch(x){}}var H="";try{H=new URL(document.baseURI).hostname}catch(e){}function bad(a){try{if(!a||!a.getAttribute("href"))return false;if(a.target&&a.target!=="_self")return true;var u=new URL(a.href,document.baseURI);if(!/^https?:$/.test(u.protocol))return false;return u.hostname!==H&&u.hostname!==location.hostname}catch(e){return false}}function g(e){try{var n=e.target;while(n&&n.nodeType===1&&n.tagName!=="A")n=n.parentNode;if(n&&n.tagName==="A"&&bad(n)){e.preventDefault();e.stopImmediatePropagation()}}catch(x){}}window.addEventListener("click",g,true);window.addEventListener("auxclick",g,true);try{var oc=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(bad(this))return;return oc.apply(this,arguments)}}catch(e){}try{var os=HTMLFormElement.prototype.submit;HTMLFormElement.prototype.submit=function(){if(this.target&&this.target!=="_self")return;return os.apply(this,arguments)}}catch(e){}}catch(e){}})();';

const NL_BRIDGE_JS = `(function(){try{if(window.__nlBridge)return;window.__nlBridge=1;var WORKER=__WORKER_ORIGIN__,PARENT=__PARENT_ORIGIN__,DEPTH=__DEPTH__;var FID=Math.random().toString(36).slice(2,10);var seq=0,cur=null,lastSent=0,readySent=false;var seenSubs={},seenStreams={};function wrap(u){try{if(!u||typeof u!=="string")return u;var a=new URL(u,document.baseURI);if(!/^https?:$/.test(a.protocol))return u;if(a.origin===WORKER)return u;if(/google|facebook|doubleclick|googlesyndication|recaptcha|popads|onclickads|acscdn|adsco|histats|exoclick|juicyads|adsterra/i.test(a.hostname))return"about:blank";if(DEPTH>=3)return u;return WORKER+"/embed?url="+encodeURIComponent(a.href)+"&parent="+encodeURIComponent(PARENT)+"&depth="+(DEPTH+1)+"&ref="+encodeURIComponent(document.baseURI)}catch(e){return u}}try{var desc=Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype,"src");if(desc&&desc.set){Object.defineProperty(HTMLIFrameElement.prototype,"src",{configurable:true,enumerable:desc.enumerable,get:desc.get,set:function(v){try{return desc.set.call(this,wrap(v))}catch(e){}}})}}catch(e){}var origSetAttr=null;try{origSetAttr=Element.prototype.setAttribute;Element.prototype.setAttribute=function(name,value){try{if(this&&this.tagName==="IFRAME"&&String(name).toLowerCase()==="src")value=wrap(value)}catch(e){}return origSetAttr.call(this,name,value)}}catch(e){}function post(m){try{if(window.top&&window.top!==window)window.top.postMessage(m,"*");if(window.parent&&window.parent!==window&&window.parent!==window.top)window.parent.postMessage(m,"*")}catch(e){}}function reportSub(rawUrl,label,lang){try{if(!rawUrl||typeof rawUrl!=="string")return;var abs=new URL(rawUrl,document.baseURI).href;if(!/\\.(vtt|srt)(\\?|#|$)/i.test(abs)||seenSubs[abs])return;seenSubs[abs]=1;post({__nl:1,type:"NL_SUBS",fid:FID,referer:document.baseURI,tracks:[{url:abs,label:label||"",lang:lang||""}]})}catch(e){}}function reportStream(rawUrl){try{if(!rawUrl||typeof rawUrl!=="string")return;var abs=new URL(rawUrl,document.baseURI).href;if(!/\\.(m3u8|mp4)(\\?|#|$)/i.test(abs)||seenStreams[abs])return;seenStreams[abs]=1;post({__nl:1,type:"NL_STREAM",fid:FID,streamUrl:abs,referer:document.baseURI,streamType:/\\.m3u8/i.test(abs)?"hls":"mp4"})}catch(e){}}function inspectTextForSubs(txt){try{if(!txt||typeof txt!=="string"||txt.length>500000)return;var plRe=/\\[([^\\]]{1,32})\\](https?:\\/\\/[^\\s"',\\]]+\\.(?:vtt|srt)(?:\\?[^\\s"',\\]]*)?)/gi,pm;while((pm=plRe.exec(txt))!==null)reportSub(pm[2],pm[1],pm[1]);var subRe=/https?:\\/\\/[^\\s"'<>\\\\`]+\\.(?:vtt|srt)(?:\\?[^\\s"'<>\\\\`]*)?/gi,sm;while((sm=subRe.exec(txt))!==null)reportSub(sm[0].replace(/\\\\\\//g,"/"),"","")}catch(e){}}try{var origFetch=window.fetch;if(origFetch){window.fetch=function(input){var u=typeof input==="string"?input:(input&&input.url)||"";if(u){reportSub(u,"","");reportStream(u)}var p=origFetch.apply(this,arguments);try{p.then(function(r){try{var ct=(r.headers&&r.headers.get("content-type"))||"";if(ct.indexOf("json")!==-1||ct.indexOf("text")!==-1){r.clone().text().then(inspectTextForSubs).catch(function(){})}}catch(x){}}).catch(function(){})}catch(x){}return p}}}catch(e){}try{var origOpen=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u){try{if(typeof u==="string"){reportSub(u,"","");reportStream(u);this.addEventListener("load",function(){try{if(typeof this.responseText==="string")inspectTextForSubs(this.responseText)}catch(x){}})}}catch(x){}return origOpen.apply(this,arguments)}}catch(e){}function send(ev){try{if(!cur)return;var now=Date.now();if(ev==="timeupdate"&&now-lastSent<250)return;lastSent=now;var d=cur.duration;post({__nl:1,type:"NL_STATE",ev:ev,t:cur.currentTime||0,d:isFinite(d)&&d>0?d:0,paused:!!cur.paused,rate:cur.playbackRate||1,seq:++seq,fid:FID})}catch(e){}}function bind(v){try{if(!v||v===cur)return;cur=v;var evs=["loadedmetadata","durationchange","play","playing","pause","waiting","seeked","seeking","timeupdate","ratechange","ended"];for(var i=0;i<evs.length;i++)(function(e){try{v.addEventListener(e,function(){send(e)},true)}catch(x){}})(evs[i]);if(!readySent){readySent=true;post({__nl:1,type:"NL_READY",fid:FID})}send("loadedmetadata");if(v.currentSrc||v.src)reportStream(v.currentSrc||v.src)}catch(e){}}function wrapFrameEl(f){try{if(!f||f.tagName!=="IFRAME")return;var raw=f.getAttribute("src");if(raw){var w=wrap(raw);if(w!==raw){if(origSetAttr)origSetAttr.call(f,"src",w);else f.setAttribute("src",w)}}}catch(e){}}function scan(){try{var vs=document.getElementsByTagName("video");var best=null;for(var i=0;i<vs.length;i++){var v=vs[i];if(v.readyState>0||v.src||v.currentSrc){best=v;break}if(!best)best=v}if(best)bind(best);var trs=document.getElementsByTagName("track");for(var t=0;t<trs.length;t++){var tr=trs[t];reportSub(tr.src||tr.getAttribute("src"),tr.label||tr.getAttribute("label"),tr.srclang||tr.getAttribute("srclang"))}var fs=document.getElementsByTagName("iframe");for(var j=0;j<fs.length;j++)wrapFrameEl(fs[j])}catch(e){}}try{var origPlay=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){try{if(this&&this.tagName==="VIDEO")bind(this)}catch(e){}return origPlay.apply(this,arguments)}}catch(e){}try{var mo=new MutationObserver(function(muts){try{for(var i=0;i<muts.length;i++){var added=muts[i].addedNodes;if(!added)continue;for(var k=0;k<added.length;k++){var n=added[k];if(!n||n.nodeType!==1)continue;if(n.tagName==="IFRAME")wrapFrameEl(n);else if(n.getElementsByTagName){var ifs=n.getElementsByTagName("iframe");for(var m=0;m<ifs.length;m++)wrapFrameEl(ifs[m])}}}scan()}catch(e){}});mo.observe(document.documentElement,{childList:true,subtree:true})}catch(e){}setInterval(scan,1500);scan();window.addEventListener("message",function(e){try{var d=e.data;if(typeof d==="string"){try{d=JSON.parse(d)}catch(x){return}}if(!d||d.__nl!==1)return;if(e.source!==window.parent&&e.source!==window.top&&d.type!=="NL_CMD"){post(d);return}if(d.type!=="NL_CMD")return;if(cur){try{if(d.cmd==="seek"&&typeof d.t==="number"){cur.currentTime=Math.max(0,d.t);var dur=cur.duration;post({__nl:1,type:"NL_ACK",id:d.id,t:cur.currentTime,d:isFinite(dur)&&dur>0?dur:0,paused:!!cur.paused,fid:FID})}else if(d.cmd==="play"){var p=cur.play();if(p&&p.catch)p.catch(function(){})}else if(d.cmd==="pause"){cur.pause()}}catch(x){}}var fs=window.frames;for(var i=0;i<fs.length;i++){try{fs[i].postMessage(d,"*")}catch(x){}}}catch(e){}})}catch(e){}})();`;

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
  if (!parentOrigin || !allowedList.includes(parentOrigin)) {
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

  try {
    const cloneBody = upstream.clone().body;
    if (cloneBody) {
      const reader = cloneBody.getReader();
      const decoder = new TextDecoder();
      let bytesRead = 0;
      let headChunk = "";
      while (bytesRead < 4096) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        bytesRead += value.byteLength;
        headChunk += decoder.decode(value, { stream: true });
      }
      try { await reader.cancel(); } catch {}
      if (/cf-chl|challenge-platform/i.test(headChunk)) {
        return Response.redirect(target.href, 302);
      }
    }
  } catch {
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
          `<base href="${finalBaseHref.replace(/"/g, "&quot;")}"><script>${NL_POPUP_GUARD_JS}${bridgeScript}</script>`,
          { html: true },
        );
      },
    })
    .on("script[src]", {
      element(el) {
        const s = el.getAttribute("src") || "";
        if (/popads|onclickads|acscdn|adsco|histats|exoclick|juicyads|propellerads|adsterra|clickadu|disable-devtool/i.test(s)) {
          el.remove();
        }
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

/* ---------------- / (استخراج الفيديو + الترجمات المرفقة المتزامنة) ---------------- */

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
  targetUrls = targetUrls.filter((u) => typeof u === "string" && safeTarget(u)).slice(0, MAX_PAGES);

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
      signal: AbortSignal.timeout(depth === 0 ? EXTRACT_TIMEOUT_TOP_MS : EXTRACT_TIMEOUT_NESTED_MS),
    });
    if (!response.ok) return { source: targetUrl, error: `HTTP ${response.status}`, videos: [], subtitles: [] };
    const html = await response.text();

    let decodedHtml = html;
    try { decodedHtml += "\n" + decodeURIComponent(html); } catch (e) {}
    const unpacked = unpackDeanEdwards(html);
    if (unpacked) decodedHtml += "\n" + unpacked;
    for (const b64 of html.match(/aHR0c[A-Za-z0-9+/=]{15,}/g) || []) {
      try { decodedHtml += "\n" + atob(b64); } catch (e) {}
    }
    for (const raw of decodedHtml.match(/https?:\/\/[^\s"'<>\\`]+\.(?:m3u8|mp4|mpd)(?:\?[^\s"'<>\\`]*)?/gi) || []) {
      extractedLinks.add(raw.replace(/\\\//g, "/"));
    }
    const relativeRegex = /(?:src|file|url|source|stream)\s*[:=]\s*["']([^"']+\.(?:m3u8|mp4|mpd)(?:\?[^"']*)?)["']/gi;
    let m;
    while ((m = relativeRegex.exec(decodedHtml)) !== null) {
      try { extractedLinks.add(new URL(m[1].replace(/\\\//g, "/"), targetUrl).href); } catch (e) {}
    }
    collectSubtitles(html, decodedHtml, targetUrl, subtitles);

    if (depth === 0) {
      const iframeRegex = /<iframe[^>]+src=["']([^"']+)["']/gi;
      let im;
      while ((im = iframeRegex.exec(html)) !== null) {
        try {
          const src = new URL(im[1], targetUrl).href;
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
      const ref = linkReferer.get(videoUrl) || targetUrl;
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
      referer: s.referer || targetUrl,
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

## 11) `src/components/Movies/MoviesPage.tsx` — MODIFIED (Exact Surgical Replacements With Real Variable Names)

Apply the following 8 exact code block replacements to `src/components/Movies/MoviesPage.tsx`:

### 11.1) Imports (`lines 51–112`)

Replace:

```
import {
  WORKER_ENDPOINT,
  fetchExtractedVideos,
  type ExtractedSubtitleTrack,
  type ExtractedVideoStream,
  type SubtitleCue,
} from "../../services/videoExtractor";

```

With:

```
import {
  WORKER_ENDPOINT,
  buildWorkerProxyUrl,
  fetchExtractedVideos,
  guessLangFromLabelOrUrl,
  type ExtractedSubtitleTrack,
  type ExtractedVideoStream,
  type SubtitleCue,
} from "../../services/videoExtractor";
import { AdShield } from "../../features/cinema/player/AdShield";
import { ManualSyncBar } from "../../features/cinema/player/ManualSyncBar";
import {
  SANDBOX_ESCAPE_HINT_MS,
  SANDBOX_PROBE_MS,
  getAdShieldEnabled,
  getIframeSandbox,
  markSandboxVerdict,
} from "../../features/cinema/player/sandboxPolicy";
import {
  autoRetimeCues,
  hlsTracksToSubtitleTracks,
  mergeStreamFirst,
} from "../../features/cinema/subtitles/streamSubtitles";

```

### 11.2) Player State & Refs (`lines 1100–1168`)

Replace:

```
  const [extractedStreams, setExtractedStreams] = useState<ExtractedVideoStream[]>([]);
  const [externalSubtitles, setExternalSubtitles] = useState<ExtractedSubtitleTrack[]>([]);
  const externalSubtitlesRef = useRef<ExtractedSubtitleTrack[]>([]);

```

With:

```
  const [extractedStreams, setExtractedStreams] = useState<ExtractedVideoStream[]>([]);
  const [externalSubtitles, setExternalSubtitles] = useState<ExtractedSubtitleTrack[]>([]);
  const externalSubtitlesRef = useRef<ExtractedSubtitleTrack[]>([]);
  const [workerBridgeSubtitles, setWorkerBridgeSubtitles] = useState<ExtractedSubtitleTrack[]>([]);
  const [adShieldEnabled] = useState<boolean>(() => getAdShieldEnabled());
  const [sandboxNonce, setSandboxNonce] = useState(0);
  const [showSandboxEscape, setShowSandboxEscape] = useState(false);
  const bridgeActiveRef = useRef(false);
  const retimedTrackIdsRef = useRef<Set<string>>(new Set());

```

And inside `clearExternalSubtitleBlobs` (`lines 1161–1167`), also reset `setWorkerBridgeSubtitles([])` and `retimedTrackIdsRef.current.clear()`:

```
  const clearExternalSubtitleBlobs = useCallback(() => {
    if (externalSubtitlesRef.current.length > 0) {
      revokeSubtitleBlobUrls(externalSubtitlesRef.current);
      externalSubtitlesRef.current = [];
    }
    setExternalSubtitles([]);
    setWorkerBridgeSubtitles([]);
    retimedTrackIdsRef.current.clear();
  }, []);

```

### 11.3) `iframeSandbox` & `shieldActive` Derived Values (`around line 1223`)

Immediately below `const activeGallerySource = detailPlaySources[activeGalleryServerIdx] || detailPlaySources[0] || null;`, add:

```
  const iframeSandbox = useMemo(
    () => getIframeSandbox(activeGallerySource),
    [activeGallerySource?.id, sandboxNonce],
  );
  const shieldActive =
    (playerRenderMode === "iframe" || playerRenderMode === "clean-embed") &&
    adShieldEnabled &&
    Boolean((activeGallerySource?.capabilities as CinemaServerConfig["capabilities"])?.adShield);

```

### 11.4) Fair Speed Queue in `startGalleryWatchSession` (`lines 1377–1401`)

Replace:

```
  const startGalleryWatchSession = useCallback(
    (explicitServerIdx?: number) => {
      const speedOrdered = buildSpeedSortedQueue(
        detailPlaySources,
        detailItemStorageKey,
      );
      let ordered = speedOrdered.length > 0 ? speedOrdered : [0, 1, 2, 3];

      // Ensure sources with capabilities?.timeEvents === true are placed before sources without timeEvents
      if (typeof explicitServerIdx !== "number") {
        const timeEventIndices = ordered.filter(
          (idx) => detailPlaySources[idx]?.capabilities?.timeEvents === true,
        );
        const silentIndices = ordered.filter(
          (idx) => detailPlaySources[idx]?.capabilities?.timeEvents !== true,
        );
        ordered = [...timeEventIndices, ...silentIndices];
      }

      if (typeof explicitServerIdx === "number" && explicitServerIdx >= 0) {
        const total = detailPlaySources.length || 4;
        const startIdx = explicitServerIdx % Math.max(1, total);
        ordered = [startIdx, ...ordered.filter((i) => i !== startIdx)];
      }

```

With:

```
  const startGalleryWatchSession = useCallback(
    (explicitServerIdx?: number) => {
      const speedOrdered = buildSpeedSortedQueue(
        detailPlaySources,
        detailItemStorageKey,
      );
      let ordered = speedOrdered.length > 0 ? speedOrdered : [0, 1, 2, 3, 4];

      if (typeof explicitServerIdx === "number" && explicitServerIdx >= 0) {
        const total = detailPlaySources.length || 5;
        const startIdx = explicitServerIdx % Math.max(1, total);
        ordered = [startIdx, ...ordered.filter((i) => i !== startIdx)];
      }

```

### 11.5) Parallel Iframe Mount + Hot-Upgrade to Direct Stream (`lines 1531–1620`)

Replace the entire Tier 1 extraction `useEffect` (`lines 1531–1620`) with the following non-blocking parallel implementation that mounts `"iframe"` immediately (0ms delay) and hot-upgrades to `"direct"` if a playable `.m3u8` / `.mp4` stream resolves within `12_000ms` while `clockNow() < 60`:

```
  // Tier 1 Parallel Direct Stream Extraction (.m3u8 / .mp4) with Hot-Upgrade -> Never blocks mounting the iframe
  useEffect(() => {
    if (!isWatchingInGallery || !activeGallerySource || allServersFailed) {
      return undefined;
    }

    const extractionSessionKey = `${detailItemStorageKey}_s${selectedSeason}_e${selectedEpisode}`;
    playAttemptStartedAtRef.current = performance.now();
    loadedCurrentAttemptRef.current = false;
    setIsPlayerLoading(true);
    setUseDirectUrlFallback(false);

    // Mount iframe immediately so playback starts without waiting on Worker extraction
    setPlayerRenderMode((prev) => (prev === "direct" ? "direct" : "iframe"));

    if (checkedExtractionKeyRef.current === extractionSessionKey) {
      return undefined;
    }

    let cancelled = false;
    const abortController = new AbortController();
    const currentToken = ++attemptTokenRef.current;

    const orderedSources: PlaySource[] = [
      activeGallerySource,
      ...detailPlaySourcesRef.current.filter((s) => s.id !== activeGallerySource.id),
    ].filter((s): s is PlaySource => Boolean(s && s.url));
    const generatedTargetUrl = orderedSources.map((s) => s.url);

    async function loadAndHotUpgradeVideo() {
      checkedExtractionKeyRef.current = extractionSessionKey;
      if (generatedTargetUrl.length === 0) return;

      try {
        const videos = await fetchExtractedVideos(
          generatedTargetUrl,
          abortController.signal,
        ).catch(() => [] as ExtractedVideoStream[]);

        if (cancelled || attemptTokenRef.current !== currentToken) {
          return;
        }

        // Merge any Worker-extracted companion subtitle tracks immediately (even if staying in iframe mode!)
        const companionSubs = videos.flatMap((v) => v.subtitles || []).map((s, i) => ({
          ...s,
          id: s.id || `worker:${i}:${s.lang}`,
          provider: s.provider || ("worker" as const),
          remoteUrl: s.proxiedUrl || s.url,
          loaded: false,
          label: s.label.includes("·") ? s.label : `${s.label} · Source`,
        }));
        if (companionSubs.length > 0) {
          setWorkerBridgeSubtitles((prev) => mergeStreamFirst(companionSubs, prev));
        }

        const directStreams = videos.filter(
          (v) => v.type === "hls" || v.type === "mp4",
        );

        if (directStreams.length === 0) {
          return;
        }

        const elapsedSinceStart = performance.now() - playAttemptStartedAtRef.current;
        if (elapsedSinceStart <= 12_000 && clockNow() < 60) {
          setExtractedStreams(directStreams);
          setActiveExtractedIdx(0);
          setUseDirectUrlFallback(false);
          playAttemptStartedAtRef.current = performance.now();
          setPlayerRenderMode("direct");
        }
      } catch {
        // Stay on active iframe smoothly
      }
    }

    void loadAndHotUpgradeVideo();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [
    isWatchingInGallery,
    activeGallerySource?.id,
    activeGallerySource?.url,
    allServersFailed,
    detailItemStorageKey,
    selectedSeason,
    selectedEpisode,
  ]);

```

### 11.6) HLS Manifest Subtitle Extraction (`lines 1700–1713`)

Inside `playHlsStream`, in `hls.on(Hls.Events.MANIFEST_PARSED, () => { ... })`, replace:

```
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          const elapsedMs = Math.max(
            120,
            performance.now() - playAttemptStartedAtRef.current,
          );
          recordServerSuccess(
            resolveServerIdForStream(selectedVideo),
            elapsedMs,
            detailItemStorageKey,
          );
          setIsPlayerLoading(false);
          void videoElement.play().catch(() => {});
        });

```

With:

```
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          hls.subtitleDisplay = false;
          hls.subtitleTrack = -1;
          const streamTracks = hlsTracksToSubtitleTracks(hls);
          if (streamTracks.length > 0) {
            setExternalSubtitles((prev) => {
              const next = mergeStreamFirst(streamTracks, prev);
              externalSubtitlesRef.current = next;
              return next;
            });
          }
          const elapsedMs = Math.max(
            120,
            performance.now() - playAttemptStartedAtRef.current,
          );
          recordServerSuccess(
            resolveServerIdForStream(selectedVideo),
            elapsedMs,
            detailItemStorageKey,
          );
          setIsPlayerLoading(false);
          const resumeSec = clockNow();
          if (resumeSec > 5) {
            try {
              videoElement.currentTime = resumeSec;
            } catch {}
          }
          void videoElement.play().catch(() => {});
        });

```

### 11.7) Stream-First Subtitle Merging, Auto-Retiming (`25↔23.976fps`), `useIframePlayerBridge`, & Sandbox Probe (`lines 1858–2186`)

1. Replace `activeSubtitlesList` (`lines 1859–1888`) with:

```
  // Unified subtitle list across ALL player modes (direct, clean-embed, iframe)
  // Stream & Worker-extracted companion tracks are listed FIRST via mergeStreamFirst.
  const activeSubtitlesList = useMemo<ExtractedSubtitleTrack[]>(() => {
    if (!isWatchingInGallery) return [];
    const rawStreamSubs =
      extractedStreams[activeExtractedIdx]?.subtitles ||
      extractedStreams[0]?.subtitles ||
      [];
    const normalizedStreamSubs: ExtractedSubtitleTrack[] = rawStreamSubs.map((s, i) => ({
      ...s,
      id: s.id || `worker:stream:${i}:${s.lang}`,
      provider: s.provider || "worker",
      remoteUrl: s.remoteUrl || s.proxiedUrl || s.url,
      loaded: s.loaded ?? false,
      label: s.label.includes("·") ? s.label : `${s.label} · Source`,
    }));
    const sameSourceSubs = mergeStreamFirst(workerBridgeSubtitles, normalizedStreamSubs);
    const merged = mergeStreamFirst(sameSourceSubs, externalSubtitles).map((t) => ({
      ...t,
      default: false,
    }));
    merged.sort((a, b) => {
      const aSame = a.provider === "stream" || a.provider === "worker" ? 0 : 1;
      const bSame = b.provider === "stream" || b.provider === "worker" ? 0 : 1;
      if (a.lang === "ar" && b.lang !== "ar") return -1;
      if (b.lang === "ar" && a.lang !== "ar") return 1;
      return aSame - bSame;
    });
    if (merged.length > 0) {
      const arSameIdx = merged.findIndex(
        (s) => s.lang === "ar" && (s.provider === "stream" || s.provider === "worker"),
      );
      const arIdx = arSameIdx >= 0 ? arSameIdx : merged.findIndex((s) => s.lang === "ar");
      const defIdx = arIdx >= 0 ? arIdx : 0;
      merged[defIdx] = { ...merged[defIdx], default: true };
    }
    return merged;
  }, [
    isWatchingInGallery,
    workerBridgeSubtitles,
    extractedStreams,
    activeExtractedIdx,
    externalSubtitles,
  ]);

```

2. Right after the `useEffect` that lazy-loads `activeTrackCues` (`around line 1939`), add the PAL/NTSC `autoRetimeCues` effect:

```
  // Automatic 25fps <-> 23.976fps subtitle retiming when cues overflow real media duration
  useEffect(() => {
    if (
      !isWatchingInGallery ||
      activeSubtitleIdx === null ||
      activeTrackCues.length === 0 ||
      clockState.duration <= 600 ||
      clockState.durationIsEstimated ||
      (clockState.source !== "video" && clockState.source !== "bridge")
    ) {
      return;
    }
    const activeTrack = activeSubtitlesList[activeSubtitleIdx];
    const trackKey = activeTrack?.id || activeTrack?.url || String(activeSubtitleIdx);
    if (retimedTrackIdsRef.current.has(trackKey)) return;
    const { cues: retimed, factor } = autoRetimeCues(activeTrackCues, clockState.duration);
    retimedTrackIdsRef.current.add(trackKey);
    if (factor !== 1) {
      setActiveTrackCues(retimed);
    }
  }, [
    isWatchingInGallery,
    activeSubtitleIdx,
    activeSubtitlesList,
    activeTrackCues,
    clockState.duration,
    clockState.durationIsEstimated,
    clockState.source,
  ]);

```

3. Replace `useIframePlayerBridge` (`lines 2087–2128`) and add the Sandbox Probe effect directly below it:

```
  // Origin-allowlisted postMessage bridge for iframe / clean-embed players
  const bridge = useIframePlayerBridge({
    enabled:
      isWatchingInGallery &&
      (playerRenderMode === "iframe" || playerRenderMode === "clean-embed"),
    iframeRef: playerIframeRef,
    allowedOrigins: bridgeAllowedOrigins,
    sessionKey: `${activeGallerySource?.id ?? ""}:${activeIframeUrl}:${sandboxNonce}:${iframeSandbox ?? "none"}`,
    onEvent: (ev) => {
      if (typeof ev.currentTime === "number" && Number.isFinite(ev.currentTime)) {
        if (!gotTimeSinceLoadRef.current) {
          gotTimeSinceLoadRef.current = true;
          if (activeGallerySource) {
            const syncElapsedMs = Math.max(
              150,
              performance.now() - playAttemptStartedAtRef.current,
            );
            recordServerSuccess(
              activeGallerySource.id,
              syncElapsedMs,
              detailItemStorageKey,
            );
          }
        }
      }
      const decision = syncControllerRef.current
        ? syncControllerRef.current.onReport(ev)
        : "accept";
      if (decision === "ignore") return;
      if (ev.currentTime !== undefined) {
        const paused =
          ev.paused !== undefined
            ? ev.paused
            : ev.kind === "pause" || ev.kind === "ended"
              ? true
              : ev.kind === "play" || ev.kind === "timeupdate" || ev.kind === "media"
                ? false
                : undefined;
        clockReport(
          ev.currentTime,
          {
            duration: ev.duration,
            paused,
            rate: ev.rate,
            source: "bridge",
          },
          ev.kind === "timeupdate" ? 0.35 : 0,
        );
      } else if (ev.kind === "play" || ev.kind === "pause" || ev.kind === "ended") {
        clockSync({ paused: ev.kind !== "play", source: "bridge" });
      }
    },
    onMediaData: () => {
      persistCurrentProgress();
    },
    onSubtitlesDiscovered: (discovered) => {
      setWorkerBridgeSubtitles((prev) => {
        const added: ExtractedSubtitleTrack[] = discovered
          .filter((d) => Boolean(d.url))
          .map((item, idx) => {
            const guessed = guessLangFromLabelOrUrl(item.label || item.lang || "", item.url);
            const proxied = buildWorkerProxyUrl(
              item.url,
              item.referer || activeGallerySource?.url,
            );
            return {
              id: `worker:live:${idx}:${guessed.lang}:${item.url}`,
              provider: "worker",
              url: item.url,
              proxiedUrl: proxied,
              remoteUrl: proxied,
              lang: guessed.lang,
              label: `${guessed.label} · Source`,
              loaded: false,
            };
          });
        return added.length > 0 ? mergeStreamFirst(added, prev) : prev;
      });
    },
  });

  useEffect(() => {
    bridgeActiveRef.current = bridge.active;
    if (bridge.active && activeGallerySource && iframeSandbox) {
      markSandboxVerdict(activeGallerySource.id, "ok");
      setShowSandboxEscape(false);
    }
  }, [bridge.active, activeGallerySource, iframeSandbox]);

  // Sandbox probe effect: auto-remount unsandboxed on the SAME server if sandbox blocks timeEvents
  useEffect(() => {
    setShowSandboxEscape(false);
    if (
      !isWatchingInGallery ||
      (playerRenderMode !== "iframe" && playerRenderMode !== "clean-embed") ||
      !activeGallerySource ||
      !iframeSandbox
    ) {
      return undefined;
    }
    const isEventServer = Boolean(
      activeGallerySource.capabilities?.timeEvents ||
        activeGallerySource.capabilities?.workerBridge,
    );
    const timer = window.setTimeout(() => {
      if (isEventServer) {
        if (!bridgeActiveRef.current) {
          markSandboxVerdict(activeGallerySource.id, "refused");
          playAttemptStartedAtRef.current = performance.now();
          loadedCurrentAttemptRef.current = false;
          setSandboxNonce((n) => n + 1);
        }
      } else {
        setShowSandboxEscape(true);
      }
    }, isEventServer ? SANDBOX_PROBE_MS : SANDBOX_ESCAPE_HINT_MS);
    return () => window.clearTimeout(timer);
  }, [
    isWatchingInGallery,
    playerRenderMode,
    activeGallerySource,
    iframeSandbox,
    sandboxNonce,
  ]);

```

### 11.8) Theater Top Bar Server Switcher + `<iframe sandbox={iframeSandbox}>` + `<AdShield>` + `<ManualSyncBar>` (`lines 3937–4195`)

1. In the theater top bar (`around line 3946`, right after the TV `S1:E1` badge), add the inline Server Switcher pills:

```
                        {isWatchingInGallery && detailPlaySources.length > 1 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            {detailPlaySources.map((srv, idx) => {
                              const isCurrent = idx === activeGalleryServerIdx;
                              return (
                                <button
                                  key={srv.id}
                                  type="button"
                                  onClick={() => {
                                    if (idx !== activeGalleryServerIdx) {
                                      setWorkerBridgeSubtitles([]);
                                      startGalleryWatchSession(idx);
                                    }
                                  }}
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border transition-all cursor-pointer whitespace-nowrap ${
                                    isCurrent
                                      ? "bg-red-600/85 border-red-400 text-white shadow"
                                      : "bg-white/8 border-white/15 text-white/70 hover:text-white hover:bg-white/15"
                                  }`}
                                >
                                  {srv.label}
                                </button>
                              );
                            })}
                          </div>
                        )}

```

2. Replace the player `<iframe ... />` block (`lines 4136–4175`) with the sandboxed iframe + `<AdShield>` + `<ManualSyncBar>` + escape button:

```
                        {!allServersFailed &&
                          (playerRenderMode === "iframe" ||
                            playerRenderMode === "clean-embed") && (
                            <>
                              <iframe
                                ref={playerIframeRef}
                                key={`${activeGallerySource.id}-${activeIframeUrl}-${sandboxNonce}-${iframeSandbox ? "sb" : "nosb"}`}
                                className="w-full h-full border-0 bg-black block"
                                src={activeIframeUrl}
                                sandbox={iframeSandbox}
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
                              <AdShield
                                active={shieldActive}
                                onTogglePlay={() => syncControllerRef.current?.userTogglePlay()}
                                onSeekRelative={(d) =>
                                  syncControllerRef.current?.userSeek(Math.max(0, clockNow() + d))
                                }
                                onToggleFullscreen={handleToggleGalleryFullscreen}
                                onActivity={bumpControlsVisibility}
                                labels={{
                                  armed: t("movies.player.adShieldArmed", "Ad shield"),
                                  passThrough: t(
                                    "movies.player.adShieldPass",
                                    "Click-through for 8s (ads may open)",
                                  ),
                                  passThroughHint: t(
                                    "movies.player.adShieldPassHint",
                                    "Tap to re-arm the shield",
                                  ),
                                }}
                              />
                              {showSandboxEscape && activeGallerySource && (
                                <button
                                  type="button"
                                  className="nl-sandbox-escape"
                                  onClick={() => {
                                    markSandboxVerdict(activeGallerySource.id, "refused");
                                    setShowSandboxEscape(false);
                                    playAttemptStartedAtRef.current = performance.now();
                                    loadedCurrentAttemptRef.current = false;
                                    setSandboxNonce((n) => n + 1);
                                  }}
                                >
                                  {t(
                                    "movies.player.sandboxEscape",
                                    "Player not loading? Disable protection",
                                  )}
                                </button>
                              )}
                              <ManualSyncBar
                                visible={
                                  !bridge.active &&
                                  activeSubtitleIdx !== null &&
                                  activeTrackCues.length > 0
                                }
                                label={t("movies.player.manualSync", "Manual subtitle clock")}
                              />
                            </>
                          )}

```

## 12) `src/styles/components/cinema.css` — MODIFIED (Append to End of File)

Append the following CSS rules to the end of `src/styles/components/cinema.css`:

```
.nl-adshield{position:absolute;inset:0;z-index:5;background:transparent;cursor:pointer;outline:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.nl-adshield--passing{pointer-events:none}
.nl-adshield__toggle{position:absolute;top:12px;inset-inline-start:12px;z-index:7;display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:800;color:#fff;background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.22);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);cursor:pointer}
.nl-adshield__toggle[data-passing="true"]{background:rgba(220,38,38,.78)}
.nl-sandbox-escape{position:absolute;top:12px;inset-inline-end:12px;z-index:7;padding:6px 12px;border-radius:999px;font-size:11px;font-weight:800;color:#fff;background:rgba(0,0,0,.65);border:1px solid rgba(255,255,255,.25);cursor:pointer}
.nl-manual-sync{position:absolute;bottom:72px;left:50%;transform:translateX(-50%);z-index:9;display:flex;align-items:center;gap:8px;padding:6px 12px;border-radius:999px;background:rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.2);color:#fff;font-size:11px;font-weight:700;backdrop-filter:blur(8px)}
.nl-manual-sync button{padding:2px 8px;border-radius:999px;background:rgba(255,255,255,.12);color:#fff;cursor:pointer}
.nl-manual-sync__time{font-variant-numeric:tabular-nums;min-width:56px;text-align:center}

```

## 13) `src/i18n/locales/{ar,en,fr}.json` — MODIFIED

Merge the following 5 keys into the existing `"movies": { "player": { ... } }` object in each locale file without removing any existing keys:

* **`src/i18n/locales/en.json`** (`movies.player`):

```
      "adShieldArmed": "Ad shield",
      "adShieldPass": "Click-through for 8s (ads may open)",
      "adShieldPassHint": "Tap to re-arm the shield",
      "sandboxEscape": "Player not loading? Disable protection",
      "manualSync": "Manual subtitle clock"

```

* **`src/i18n/locales/ar.json`** (`movies.player`):

```
      "adShieldArmed": "درع الإعلانات",
      "adShieldPass": "تمرير النقر لمدة 8 ثوانٍ (قد تظهر إعلانات)",
      "adShieldPassHint": "اضغط لإعادة تفعيل الدرع",
      "sandboxEscape": "المشغل لا يعمل؟ عطّل الحماية",
      "manualSync": "ساعة الترجمة اليدوية"

```

* **`src/i18n/locales/fr.json`** (`movies.player`):

```
      "adShieldArmed": "Bouclier anti-pub",
      "adShieldPass": "Clic traversant 8 s (pubs possibles)",
      "adShieldPassHint": "Touchez pour réactiver le bouclier",
      "sandboxEscape": "Le lecteur ne charge pas ? Désactiver la protection",
      "manualSync": "Horloge manuelle des sous-titres"

```

## 14) `index.html` — MODIFIED

Inside `<head>`, immediately after `<link rel="preconnect" href="https://api.themoviedb.org" crossorigin>`, add:

```
    <link rel="preconnect" href="https://vidlink.pro" crossorigin>
    <link rel="dns-prefetch" href="https://vidlink.pro">

```

Do NOT modify the `Content-Security-Policy` meta tag.

## 15) `src/features/cinema/player/__tests__/sandboxPolicy.test.ts` — NEW

Create this new unit test file:

```
import { beforeEach, describe, expect, it } from "vitest";
import { SANDBOX_STRICT } from "../../../../config/servers";
import {
  getIframeSandbox,
  getSandboxVerdict,
  markSandboxVerdict,
  SANDBOX_STORAGE_KEY,
} from "../sandboxPolicy";

const srv = { id: "server-vl", capabilities: { timeEvents: true, sandbox: SANDBOX_STRICT } };

describe("sandboxPolicy", () => {
  beforeEach(() => localStorage.removeItem(SANDBOX_STORAGE_KEY));
  it("returns strict tokens without allow-popups by default", () => {
    const sb = getIframeSandbox(srv);
    expect(sb).toBe(SANDBOX_STRICT);
    expect(sb).not.toMatch(/allow-popups|allow-top-navigation/);
  });
  it("drops sandbox after a refused verdict", () => {
    markSandboxVerdict("server-vl", "refused");
    expect(getSandboxVerdict("server-vl")).toBe("refused");
    expect(getIframeSandbox(srv)).toBeUndefined();
  });
  it("returns undefined for servers without sandbox capability", () => {
    expect(getIframeSandbox({ id: "x", capabilities: {} })).toBeUndefined();
  });
});

```

## 16) `src/features/cinema/subtitles/__tests__/streamSubtitles.test.ts` — NEW

Create this new unit test file:

```
import { describe, expect, it } from "vitest";
import {
  autoRetimeCues,
  dedupeCues,
  hlsTracksToSubtitleTracks,
  mergeHlsVttPlaylist,
  stripVttHeader,
} from "../streamSubtitles";

describe("streamSubtitles", () => {
  it("strips WEBVTT header incl. X-TIMESTAMP-MAP", () => {
    const seg = "WEBVTT\nX-TIMESTAMP-MAP=MPEGTS:900000,LOCAL:00:00:00.000\n\n00:00:01.000 --> 00:00:02.000\nHi";
    expect(stripVttHeader(seg)).toBe("00:00:01.000 --> 00:00:02.000\nHi");
  });
  it("merges a media playlist", async () => {
    const pl = "#EXTM3U\n#EXTINF:6,\nhttps://w.dev/a.vtt\n#EXTINF:6,\nhttps://w.dev/b.vtt\n#EXT-X-ENDLIST";
    const files: Record<string, string> = {
      "https://w.dev/a.vtt": "WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nA",
      "https://w.dev/b.vtt": "WEBVTT\n\n00:00:07.000 --> 00:00:08.000\nB",
    };
    const out = await mergeHlsVttPlaylist(pl, "https://w.dev/p.m3u8", async (u) => files[u]);
    expect(out.startsWith("WEBVTT")).toBe(true);
    expect(out).toContain("\nA");
    expect(out).toContain("\nB");
  });
  it("follows master → subtitle group", async () => {
    const master = '#EXTM3U\n#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="s",LANGUAGE="en",NAME="English",URI="https://w.dev/subs.m3u8"\n#EXT-X-STREAM-INF:BANDWIDTH=1\nv.m3u8';
    const files: Record<string, string> = {
      "https://w.dev/subs.m3u8": "#EXTM3U\n#EXTINF:6,\nhttps://w.dev/a.vtt",
      "https://w.dev/a.vtt": "WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nA",
    };
    const out = await mergeHlsVttPlaylist(master, "https://w.dev/m.m3u8", async (u) => files[u]);
    expect(out).toContain("\nA");
  });
  it("dedupes overlapping segment cues", () => {
    const c = { start: 1, end: 2, text: "x" };
    expect(dedupeCues([c, { ...c }])).toHaveLength(1);
  });
  it("retimes PAL subtitles that overflow duration", () => {
    const dur = 6000;
    const cues = [{ start: 10, end: 12, text: "a" }, { start: 6200, end: 6230, text: "b" }];
    const r = autoRetimeCues(cues, dur);
    expect(r.factor).toBeCloseTo(23.976 / 25, 4);
    expect(r.cues[1].end).toBeLessThanOrEqual(dur * 1.01);
  });
  it("leaves fitting subtitles untouched", () => {
    const r = autoRetimeCues([{ start: 10, end: 5000, text: "a" }], 6000);
    expect(r.factor).toBe(1);
  });
  it("maps hls subtitleTracks to lazy stream tracks", () => {
    const t = hlsTracksToSubtitleTracks({ subtitleTracks: [{ url: "https://w.dev/s.m3u8", lang: "ara", name: "Arabic" }] });
    expect(t[0]).toMatchObject({ provider: "stream", lang: "ar", loaded: false, remoteUrl: "https://w.dev/s.m3u8" });
  });
});

```

# VERIFICATION

Run and ensure all checks pass with zero errors:

1. `npx tsc --noEmit` → 0 errors.

2. `npx vitest run` → all tests pass (including `securityRegression.test.ts`, `iframeBridge.test.ts`, `syncController.test.ts`, `sandboxPolicy.test.ts`, `streamSubtitles.test.ts`).

3. `node scripts/check-csp.mjs` → passes.

4. `npm run build` → succeeds.

```

```
