# Surgical Execution Prompt: Cinema 3-Tier Playback Hierarchy, VidLink Sync Bridge & Instant Modal/Trailer Performance

You are a Principal Systems Architect and Senior Video/Web Engineer working on the **NL** web application (React 19 + TypeScript 5.9 + Vite 6 + Tailwind CSS v4 + `framer-motion` + `hls.js` + Vitest).

Your mission is to execute a surgical, zero-regression overhaul of the Cinema playback pipeline, server priority ranking, `postMessage` clock synchronization, external timeline visibility, and Movie/Series Details & Trailer modal startup performance.

---

## Global Execution Rules

1. **Relative Paths Only**: All file paths in this specification are relative to the repository root (e.g., `src/...`, `cloudflare/...`, `scripts/...`).
2. **Surgical Edits**: Before modifying any file, open and inspect the surrounding code. Preserve all existing features (Supabase sync, CSP verification via `scripts/check-csp.mjs`, i18n keys, Liquid Glass styling, Continue Watching progress store, and Wyzie/OpenSubtitles integration).
3. **Strict Verification**: After applying all edits, run:
   - `npx tsc --noEmit`
   - `node scripts/check-csp.mjs`
   - `npx vitest run`
   Every check and test suite must pass with zero errors.

---

## Root-Cause Diagnosis Summary

1. **Tier 2 (`server-vl` / VidLink) Hijacked by `2embed` `clean-embed` in `src/services/videoExtractor.ts` & `src/components/Movies/MoviesPage.tsx`**:
   - When playback starts, `MoviesPage.tsx` sends all server URLs to the Cloudflare Worker (`fetchExtractedVideos`).
   - Modern embeds rarely expose raw `.m3u8` / `.mp4` links in static HTML, so `extractedVideos` is empty. However, `2embed.cc` (`server-1`) and `2embed.skin` (`server-2`) contain `<iframe src=".../swish?id=...">` in their static HTML.
   - `extractCleanEmbedFromScannedIframes()` in `src/services/videoExtractor.ts` converts that into `{ type: "clean-embed", directUrl: "https://2vcdn.skin/e/{id}" }`.
   - `MoviesPage.tsx` treats `clean-embed` as an extracted stream and switches to `playerRenderMode = "clean-embed"`, loading the **silent Tier 3 `2vcdn.skin` iframe** instead of falling through to `playerRenderMode = "iframe"` (which loads **Tier 2 `server-vl` / VidLink**).
2. **Speed Cache Poisoning & Weak Priority Bonus (`src/services/serverSpeedMonitor.ts`)**:
   - Cached entries in `nl_cinema_server_speed_v1` from prior sessions store `byTitle` preferences and low EWMA latencies for silent servers (`server-7`, `server-1`), and a single transient failure on `server-vl` (`failureCount > successCount`) strips its priority bonus and buries it behind silent servers.
   - Furthermore, whenever a silent fallback server loads its HTML shell in `<iframe onLoad>`, `recordServerSuccess` overwrites `state.byTitle[titleKey]` with that silent server's ID.
3. **Bridge Lifecycle & `MEDIA_DATA` Pause State Bug (`src/features/cinema/player/iframeBridge.ts` & `src/components/Movies/MoviesPage.tsx`)**:
   - `useIframePlayerBridge` only depends on `[enabled, originsKey, iframeRef]`. Because `bridgeAllowedOrigins` includes `ALL_SERVER_FRAME_ORIGINS`, `originsKey` never changes when switching servers or failing over from Tier 2 to Tier 3, so `bridge.active` and `bridge.tier` fail to reset across server transitions.
   - In `useIframePlayerBridge`, `setActive(true)` is triggered even on bare `play`/`pause` events without a finite `currentTime`.
   - When VidLink emits `MEDIA_DATA` with `{ watched, duration }`, `ev.kind` is `"media"` and `ev.paused` is `undefined`. In `MoviesPage.tsx`, `paused` only became `false` for `ev.kind === "play" || ev.kind === "timeupdate"`, leaving `playbackClock` stuck in its initial `paused: true` state when synced via `MEDIA_DATA`.
4. **External `CinemaTimeline` Visibility on Silent Servers (`src/features/cinema/player/CinemaTimeline.tsx` & `src/components/Movies/MoviesPage.tsx`)**:
   - On Tier 3 silent servers (`controlMode === "none"`), cross-origin security makes time synchronization impossible without `postMessage`. `CinemaTimeline` must return `null` whenever `mode === "none"`, and the blind `window.onBlur` manual clock auto-start must be removed so unsynced dummy progress bars and unsynced subtitle clocks never distract the user.
5. **Heavy / Sluggish Poster Click, Modal Open, Trailer & Playback Startup (`src/components/Movies/MoviesPage.tsx`, `src/components/Movies/MovieSourcesModal.tsx`, `src/services/trailerService.ts`)**:
   - **Blocked First Paint**: `MoviesPage.tsx` gates the Details Modal on `{selectedItemId !== null && detailedItem && ( ... )}` without seeding `detailedItem` from the already-loaded poster card in memory, and awaits **both** TMDB details **and** `fetchOmdbMeta()` sequentially (up to 7,000ms timeout) before calling `setDetailedItem()`.
   - **Playback Effect Abort Loop**: `useResolvedImdbSources` in `MovieSourcesModal.tsx` depends on the `item` (`detailWatchTarget`) object reference, which is recreated every time `detailedItem` updates. Worse, `MoviesPage.tsx`'s main playback `useEffect` includes `detailedItem`, `detailPlaySources`, and `activeImdbId` in its dependency array—causing background metadata or IMDb ID resolution to abort and restart the active playback session mid-flight!
   - **Subtitles Blocking Video Startup**: `MoviesPage.tsx` awaits `Promise.all([fetchExtractedVideos(...), fetchExternalSubtitles(...)])` before leaving `playerRenderMode === "extracting"`. Because `fetchExternalSubtitles` searches Wyzie + OpenSubtitles and downloads/parses the first `.srt` file (up to 9–18 seconds), the video player is stuck on `<EyeLoader />` waiting for subtitle APIs before even mounting the VidLink iframe!
   - **Trailer Double-Iframe Thrashing**: When clicking "Watch Trailer", `resolveTrailer` queries `api.imdbapi.dev` (3.5s timeout) + `WORKER_ENDPOINT/trailer/imdb` (6.0s timeout) even when `detailedItem.trailerKey` (YouTube) is already known from TMDB. Meanwhile, `MoviesPage.tsx` mounts the YouTube iframe first, then unmounts it seconds later when `resolveTrailer` returns an IMDb URL, which then often stalls for 7 seconds and falls back to YouTube again.
   - **Stacked Fullscreen Gaussian Blurs**: While the Details Modal (`backdrop-blur-xl` + `backdrop-filter: blur(26px)`) is open in preview/trailer mode, `.lg-cinema-ambient-bg` (`filter: blur(80px) saturate(165%)`) stays mounted underneath, causing severe GPU compositing frame drops during modal open/close animations.

---

## Step-by-Step Surgical Modifications

### 1. `src/config/servers.ts`

Verify and ensure that `CINEMA_SERVERS` defines `server-vl` (VidLink) at index `0` with `capabilities: { timeEvents: true, startAt: true }`, and that no server sets `workerBridge: true` (Tier 2 and Tier 3 embeds must load their raw URLs directly without broken Worker `/embed` proxying). Also ensure `vidlink.pro` origins include `https://vidlink.pro`, `https://player.vidlink.pro`, and `https://cloud.vidlink.pro` (matching `index.html` CSP `frame-src`).

Confirm `CINEMA_SERVERS[0]` in `src/config/servers.ts` matches:

```ts
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
```

---

### 2. `src/services/serverSpeedMonitor.ts`

Update `src/services/serverSpeedMonitor.ts` so that:
1. `SPEED_STORAGE_KEY` is bumped to `"nl_cinema_server_speed_v2"` to clear stale silent-server preferences from earlier builds.
2. `recordServerSuccess` only overwrites `state.byTitle[titleKey]` if `serverId === "server-vl"` or if `state.byTitle[titleKey]` is not currently set to `"server-vl"`, preventing a fallback silent server's fast HTML shell load from displacing `server-vl` on future plays.
3. `sortSourcesBySpeed` enforces a strict two-bucket hierarchy:
   - **Bucket 0 (Tier 2 — Time-Reporting Servers)**: Any source with `src.capabilities?.timeEvents === true` (or `src.id === "server-vl"` when `hasTmdb` is true), provided it has not accumulated 2+ net consecutive failures (`(metric?.failureCount ?? 0) - (metric?.successCount ?? 0) < 2`).
   - **Bucket 1 (Tier 3 — Silent Fallback Servers)**: All silent third-party embeds (`server-7`, `server-1`, `server-2`, `server-6`), plus any Tier 2 server that has repeatedly failed (`failureCount - successCount >= 2`).
   - Sorting compares `bucket` first (`a.bucket - b.bucket`), then `score` (`a.score - b.score`), then `originalIdx` (`a.originalIdx - b.originalIdx`).

#### Exact replacement for `src/services/serverSpeedMonitor.ts`:

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
    // Do not let a fallback silent server overwrite a working Tier 2 (server-vl) preference
    if (serverId === "server-vl" || state.byTitle[titleKey] !== "server-vl") {
      state.byTitle[titleKey] = serverId;
    }
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
 * - Bucket 0 (Tier 2): Sources with `capabilities.timeEvents === true` (e.g. VidLink `server-vl`),
 *   unless the server has failed repeatedly (`failureCount > successCount`).
 * - Bucket 1 (Tier 3): Silent third-party fallback embeds, ordered by EWMA speed and reliability.
 */
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

      // Strict Tier Bucket: healthy timeEvents servers ALWAYS stay in bucket 0 ahead of silent embeds
      const bucket = isTimeEvents && !hasFailed ? 0 : 1;

      if (isTimeEvents && !hasFailed) {
        score -= 5000;
      }

      // Boost the title's remembered server within its tier bucket unless it has failed
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

### 3. `src/services/videoExtractor.ts`

In `src/services/videoExtractor.ts`:
1. **Remove `clean-embed` (`2vcdn.skin`) synthesis from `fetchExtractedVideos`**:
   - Tier 1 is strictly for **direct video streams** (`.m3u8` / `.mp4` / `.mpd`) that can be played in our native HTML5 `<video>` element (`playerRenderMode === "direct"`).
   - Extracting `https://2vcdn.skin/e/{id}` from `2embed`'s `iframes_scanned` and returning it from `fetchExtractedVideos` caused `MoviesPage.tsx` to treat `2embed`'s inner silent iframe as an extracted video stream and bypass **Tier 2 (`server-vl` / VidLink)**!
   - By returning only real direct video streams (`extractedVideos`), whenever Tier 1 finds no direct `.m3u8`/`.mp4` stream (`videos.length === 0`), `MoviesPage.tsx` immediately proceeds to Tier 2 (`playerRenderMode === "iframe"` with `server-vl`).
2. **Reduce extraction timeout from `11_500` ms to `4_500` ms**:
   - Waiting 11.5 seconds for Worker scraping before falling back to Tier 2 (`VidLink`) stalls playback startup. A `4_500` ms ceiling ensures fast failover to Tier 2 when no direct stream is available.

#### Surgical diff in `src/services/videoExtractor.ts`:

- Change the timeout in `fetchExtractedVideos`:
```ts
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), 4_500);
```
- In `fetchExtractedVideos`, do NOT push `clean-embed` iframe candidates into the returned array (keep only `extractedVideos`):
```ts
    const extractedVideos: ExtractedVideoStream[] = [];

    for (const pageResult of rawResults) {
      if (!pageResult) continue;

      if (Array.isArray(pageResult.videos)) {
        for (const video of pageResult.videos) {
          if (!video || (!video.proxiedUrl && !video.directUrl)) continue;
          const candidateUrl = video.directUrl || video.proxiedUrl || "";
          // Skip subtitle files mixed into videos array (handled by extractSubtitlesFromResult)
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
```
*(You may also remove the now-unused `extractCleanEmbedFromScannedIframes` helper so `eslint` reports zero unused-function warnings.)*

---

### 4. `src/features/cinema/player/iframeBridge.ts`

In `src/features/cinema/player/iframeBridge.ts`:
1. **Ensure `MEDIA_DATA` sets `paused: false` when `currentTime` is finite**:
   - In `parsePlayerMessage`, when `d.type === "MEDIA_DATA"` yields a finite `prog.currentTime`, set `paused: false` so `clockReport` in `MoviesPage.tsx` transitions the clock out of `paused: true` and interpolates time smoothly between VidLink `MEDIA_DATA` ticks.
2. **Support all VidLink `PLAYER_EVENT` shapes and origins**:
   - In `parsePlayerMessage`, when `d.type === "PLAYER_EVENT"`:
     - Extract `payload = (d.data && typeof d.data === "object") ? d.data : d`.
     - Parse `currentTime = num(payload.currentTime ?? payload.time ?? payload.watched)` and `duration = num(payload.duration)`.
     - Set `paused` from `typeof payload.paused === "boolean" ? payload.paused : (kind === "pause" || kind === "ended" ? true : kind === "play" || kind === "timeupdate" ? false : undefined)`.
   - In `isOriginAllowed` and `isAllowedOrigin`, allow any `vidlink.*` / `*.vidlink.*` hostname (`/(^|\.)vidlink\.[a-z]+$/i`) in addition to the explicit `allowedOrigins` list so VidLink CDN/player subdomains are never rejected.
3. **Reset Bridge State on `sessionKey` Change & Only Activate on Sync-Capable Events**:
   - Add `sessionKey?: string` to `useIframePlayerBridge` options and include `sessionKey` in the `useEffect` dependency array (`[enabled, originsKey, iframeRef, sessionKey]`). When the user switches servers, episodes, or titles, `active` and `tier` immediately reset to `false` and `null`.
   - Only call `setActive(true)` when `isSyncCapableEvent(ev)` is `true` (i.e. `typeof ev.currentTime === "number" && Number.isFinite(ev.currentTime)`). Track `hasSyncedRef` inside the effect so bare `play`/`pause`/`ended` events only forward to `onEventRef` after at least one sync-capable timestamp has been received from that iframe.

#### Exact updates in `src/features/cinema/player/iframeBridge.ts`:

```ts
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
```

And in `isOriginAllowed`:
```ts
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
```

And in `useIframePlayerBridge`:
```ts
export function useIframePlayerBridge(opts: {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  allowedOrigins: string[];
  enabled: boolean;
  sessionKey?: string;
  onEvent?: (ev: BridgeEvent) => void;
  onMediaData?: (payload: unknown) => void;
}): { active: boolean; tier: BridgeTier | null } {
  const [active, setActive] = useState(false);
  const [tier, setTier] = useState<BridgeTier | null>(null);
  const onEventRef = useRef(opts.onEvent);
  onEventRef.current = opts.onEvent;
  const onMediaRef = useRef(opts.onMediaData);
  onMediaRef.current = opts.onMediaData;
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

---

### 5. `src/features/cinema/player/CinemaTimeline.tsx`

Enforce at the component boundary that `CinemaTimeline` renders **nothing (`return null`)** when `mode === "none"` (Tier 3 silent servers). Remove the unused `Timer` icon import and the dead `mode === "none"` UI elements (`"Not synced — manual"` badge and amber slider variant).

#### Exact replacement for `src/features/cinema/player/CinemaTimeline.tsx`:

```tsx
import React, { useState } from "react";
import { Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { clockPause, clockPlay, clockSeek, useClockState, useClockTime } from "./playbackClock";

export type PlayerControlMode = "direct" | "bridged" | "none";

export const formatClock = (s: number): string => {
  const v = Number.isFinite(s) && s > 0 ? s : 0;
  const h = Math.floor(v / 3600);
  const m = String(Math.floor((v % 3600) / 60)).padStart(2, "0");
  const sec = String(Math.floor(v % 60)).padStart(2, "0");
  return h ? `${h}:${m}:${sec}` : `${m}:${sec}`;
};

const pill = "lg-cinema-action-pill h-8 px-3 rounded-full text-[11px] font-bold text-white flex items-center gap-1 cursor-pointer";

export const CinemaTimeline = React.memo(function CinemaTimeline({
  mode,
  videoRef,
  fallbackDurationSec = 0,
  hasSubtitles: _hasSubtitles,
  onUserSeek,
  onUserTogglePlay,
}: {
  mode: PlayerControlMode;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  fallbackDurationSec?: number;
  hasSubtitles: boolean;
  onUserSeek?: (targetSec: number) => void;
  onUserTogglePlay?: () => void;
}) {
  const { t } = useTranslation();
  const liveTime = useClockTime(200);
  const clock = useClockState();
  const [scrubTime, setScrubTime] = useState<number | null>(null);

  if (mode === "none") {
    return null;
  }

  const time = scrubTime !== null ? scrubTime : liveTime;
  const duration = clock.duration || fallbackDurationSec || 7200;
  const displayDuration = clock.duration || fallbackDurationSec;
  const isEstimated = clock.durationIsEstimated || (!clock.duration && fallbackDurationSec > 0);

  const commitSeek = (nextSec: number) => {
    const clamped = Math.max(0, Math.min(duration, nextSec));
    if (mode === "direct") {
      clockSeek(clamped);
      const el = videoRef.current;
      if (el) el.currentTime = clamped;
      return;
    }
    if (onUserSeek) {
      onUserSeek(clamped);
    } else {
      clockSeek(clamped);
    }
  };

  const handleTogglePlay = () => {
    if (mode === "direct") {
      const v = videoRef.current;
      if (!v) return;
      if (v.paused) {
        clockPlay();
        void v.play().catch(() => {});
      } else {
        clockPause();
        v.pause();
      }
      return;
    }
    if (onUserTogglePlay) {
      onUserTogglePlay();
      return;
    }
    if (clock.paused) {
      clockPlay();
    } else {
      clockPause();
    }
  };

  const commitScrub = () => {
    if (scrubTime === null) return;
    const finalTime = scrubTime;
    setScrubTime(null);
    commitSeek(finalTime);
  };

  return (
    <div className="flex flex-col gap-1.5 w-full" dir="ltr">
      <div className="flex items-center gap-2 text-[10px] font-bold text-white/85 tabular-nums">
        <span className="min-w-[36px]">{formatClock(time)}</span>
        <input
          type="range"
          min={0}
          max={duration}
          step={0.5}
          value={Math.min(time, duration)}
          onChange={(e) => {
            const next = Number(e.target.value);
            setScrubTime(next);
          }}
          onMouseUp={commitScrub}
          onTouchEnd={commitScrub}
          onPointerUp={commitScrub}
          onKeyUp={commitScrub}
          className="flex-1 cursor-pointer accent-red-600"
          aria-label={t("movies.player.seek", "Seek")}
        />
        <span className="min-w-[36px] text-end">
          {displayDuration > 0
            ? `${isEstimated ? "~" : ""}${formatClock(displayDuration)}`
            : "--:--"}
        </span>
        {mode === "bridged" && (
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] whitespace-nowrap">
            {t("movies.player.synced", "Synced with player")}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className={pill}
          onClick={handleTogglePlay}
          aria-label={
            clock.paused
              ? t("movies.player.play", "Play")
              : t("movies.player.pause", "Pause")
          }
        >
          {clock.paused ? <Play size={13} /> : <Pause size={13} />}
        </button>
        <button
          type="button"
          className={pill}
          onClick={() => commitSeek(time - 10)}
        >
          <RotateCcw size={12} /> 10s
        </button>
        <button
          type="button"
          className={pill}
          onClick={() => commitSeek(time + 10)}
        >
          <RotateCw size={12} /> 10s
        </button>
      </div>
    </div>
  );
});
```

---

### 6. `src/components/Movies/MovieSourcesModal.tsx`

In `src/components/Movies/MovieSourcesModal.tsx`, optimize `useResolvedImdbSources` so that:
1. It caches resolved IMDb IDs in both `IMDB_MEMORY_CACHE` and `localStorage` (`nl_imdb_id_cache_v1`).
2. Its `useEffect` and `useMemo` depend on **primitive properties** (`itemId = item?.id`, `mediaType = item?.mediaType`, `rawImdbId = item?.imdbId`, `season = item?.season`, `episode = item?.episode`, `fullSeason = item?.fullSeason`, `startAt = item?.startAt`) rather than the `item` object reference!
   - Previously, whenever `detailedItem` was updated in `MoviesPage.tsx` (e.g., when OMDb or TMDB details arrived), `detailWatchTarget` got a new object reference, which re-ran `useResolvedImdbSources`'s effect AND created a new `detailPlaySources` array reference, aborting and restarting the active video playback effect!

#### Exact replacement for `useResolvedImdbSources` in `src/components/Movies/MovieSourcesModal.tsx`:

```tsx
const IMDB_STORAGE_KEY = 'nl_imdb_id_cache_v1';

function readCachedImdbId(cacheKey: string): string {
  if (IMDB_MEMORY_CACHE[cacheKey]) return IMDB_MEMORY_CACHE[cacheKey];
  try {
    const raw = localStorage.getItem(IMDB_STORAGE_KEY);
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    const val = typeof parsed?.[cacheKey] === 'string' ? extractImdbId(parsed[cacheKey]) : '';
    if (val) IMDB_MEMORY_CACHE[cacheKey] = val;
    return val;
  } catch {
    return '';
  }
}

function writeCachedImdbId(cacheKey: string, imdbId: string): void {
  if (!cacheKey || !imdbId) return;
  IMDB_MEMORY_CACHE[cacheKey] = imdbId;
  try {
    const raw = localStorage.getItem(IMDB_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[cacheKey] = imdbId;
    localStorage.setItem(IMDB_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore storage quota errors
  }
}

export function useResolvedImdbSources(
  item: CinemaWatchTarget | null,
  enabled: boolean,
) {
  const itemId = item?.id;
  const mediaType = item?.mediaType;
  const rawImdbId = item?.imdbId;
  const season = item?.season;
  const episode = item?.episode;
  const fullSeason = item?.fullSeason;
  const startAt = item?.startAt;

  const [resolvedImdbId, setResolvedImdbId] = useState<string>('');
  const [resolving, setResolving] = useState<boolean>(false);

  useEffect(() => {
    if (!enabled || !itemId || !mediaType) {
      setResolvedImdbId('');
      setResolving(false);
      return;
    }

    const cacheKey = `${mediaType}_${itemId}`;
    const direct = extractImdbId(rawImdbId);
    if (direct) {
      writeCachedImdbId(cacheKey, direct);
      setResolvedImdbId(direct);
      setResolving(false);
      return;
    }

    const cached = readCachedImdbId(cacheKey);
    if (cached) {
      setResolvedImdbId(cached);
      setResolving(false);
      return;
    }

    let cancelled = false;
    setResolving(true);
    const tmdbKey = import.meta.env.VITE_TMDB_API_KEY || PUBLIC_TMDB_KEY;

    const resolveRemote = async () => {
      try {
        if (!tmdbKey) {
          if (!cancelled) setResolving(false);
          return;
        }
        const endpoint =
          mediaType === 'tv'
            ? `${TMDB_BASE_URL}/tv/${itemId}/external_ids?api_key=${tmdbKey}`
            : `${TMDB_BASE_URL}/movie/${itemId}/external_ids?api_key=${tmdbKey}`;

        const res = await fetch(endpoint, { signal: AbortSignal.timeout(4500) });
        if (!res.ok) throw new Error('Failed to resolve IMDb ID');
        const data = await res.json();
        const found = extractImdbId(
          data?.imdb_id || data?.external_ids?.imdb_id || '',
        );
        if (found) {
          writeCachedImdbId(cacheKey, found);
        }
        if (!cancelled) {
          setResolvedImdbId(found);
        }
      } catch {
        if (!cancelled) setResolvedImdbId('');
      } finally {
        if (!cancelled) setResolving(false);
      }
    };

    void resolveRemote();
    return () => {
      cancelled = true;
    };
  }, [enabled, itemId, mediaType, rawImdbId]);

  const effectiveImdbId = resolvedImdbId || extractImdbId(rawImdbId);

  const sources = useMemo(() => {
    if (!itemId || !mediaType) return [];
    return buildSources({
      id: itemId,
      mediaType,
      imdbId: effectiveImdbId || undefined,
      season,
      episode,
      fullSeason,
      startAt,
    });
  }, [itemId, mediaType, effectiveImdbId, season, episode, fullSeason, startAt]);

  return { sources, resolving, resolvedImdbId: effectiveImdbId };
}
```

---

### 7. `src/services/trailerService.ts`

In `src/services/trailerService.ts`, eliminate the 9.5-second trailer resolution delay and iframe thrashing when a YouTube trailer key is already known from TMDB:
- If `opts.youtubeKey` is non-empty, return `{ kind: "youtube", key: opts.youtubeKey.trim() }` immediately!
- Only query `fromImdbApiDev` / `fromWorker` when `opts.youtubeKey` is missing/empty and a valid `imdbId` is available, with tighter timeouts (`2500ms` and `3500ms`).

#### Exact replacement for `resolveTrailer` in `src/services/trailerService.ts`:

```ts
export async function resolveTrailer(opts: {
  imdbId?: string;
  youtubeKey?: string;
  signal?: AbortSignal;
}): Promise<TrailerSource | null> {
  const ytKey = (opts.youtubeKey || "").trim();
  if (ytKey) {
    return { kind: "youtube", key: ytKey };
  }
  const imdbId = (opts.imdbId || "").trim();
  if (/^tt\d{5,10}$/.test(imdbId)) {
    const c = readCache()[imdbId];
    let vi: string | null;
    if (c && Date.now() - c.t < (c.v ? HIT_TTL : MISS_TTL)) {
      vi = c.v;
    } else {
      vi = (await fromImdbApiDev(imdbId, opts.signal)) ?? (await fromWorker(imdbId, opts.signal));
      if (!opts.signal?.aborted) writeCache(imdbId, vi);
    }
    if (vi) return { kind: "imdb", videoId: vi, embedUrl: `https://www.imdb.com/video/embed/${vi}/` };
  }
  return null;
}
```

---

### 8. `src/components/Movies/MoviesPage.tsx`

Apply the following surgical fixes in `src/components/Movies/MoviesPage.tsx`:

#### 8.1 Cache `fetchOmdbMeta` in Memory + `localStorage` & Tighten Timeout (`3500ms`)
Above `fetchOmdbMeta` (around line 206), add an OMDb cache so repeated opens of a title never re-fetch OMDb, and cap the timeout to `3500ms`:

```ts
const OMDB_CACHE: Record<string, OmdbEnrichedMeta | null> = {};
const OMDB_STORAGE_PREFIX = "nl_omdb_v1_";
```
Inside `fetchOmdbMeta(imdbId: string, omdbKey?: string)`:
- Check `if (imdbId in OMDB_CACHE) return OMDB_CACHE[imdbId];` and `localStorage.getItem(OMDB_STORAGE_PREFIX + cleanId)` at the top.
- Save successful results into `OMDB_CACHE[cleanId]` and `localStorage` before returning, and use `AbortSignal.timeout(3500)`.

#### 8.2 Instantaneous Poster Click -> Seed `detailedItem` Synchronously (0ms Modal Open) + Non-Blocking OMDb Enrichment
Look at `setSelectedItemId` (around line 974) and the Details Modal Loader `useEffect` (around lines 2935–3017):
1. When `setSelectedItemId(id, mediaType)` is called with a non-null `id`, immediately look up the item across already-loaded lists in memory (`trendingMovies`, `topRatedMovies`, `popularMovies`, `actionMovies`, `horrorMovies`, `dramaMovies`, `sciFiMovies`, `topMovies`, `trendingSeries`, `topRatedSeries`, `popularSeries`, `actionSeries`, `mysterySeries`, `dramaSeries`, `animationSeries`, `topSeries`, `searchResults`, `slideshowSlides`, `FALLBACK_MOVIES`, `FALLBACK_SERIES`)!
2. If found in memory and `detailedItem?.id !== id`:
   - Synchronously call `setDetailedItem(foundItem)` and `setIsLoadingDetails(false)` so the modal renders **instantly on the very first click frame** with the backdrop, poster, title, rating, overview, and "Watch Now" button ready!
   - Then, in the Details Modal Loader `useEffect`, fetch the full TMDB `detail` (`append_to_response=videos,credits,similar,...`) in the background without blocking the modal UI with `<EyeLoader />` (only set `setIsLoadingDetails(true)` when `detailedItem` is `null` or `detailedItem.id !== selectedItemId`, e.g., on a cold deep-link)!
3. In `loadDetails()`, **do NOT `await fetchOmdbMeta(...)` before calling `setDetailedItem(normalized)`**:
   - As soon as `fetchWithCache` for TMDB `detail` resolves, immediately construct `normalized = normalizeItem(detail, mediaType, currentLang)` and call `setDetailedItem(normalized)` and `setIsLoadingDetails(false)`!
   - Then, if `imdbId` is present, invoke `void fetchOmdbMeta(imdbId, omdbKey).then((omdb) => { ... })` asynchronously to patch `rating`, `certification`, `rottenTomatoes`, `metascore`, `awards`, and `boxOffice` into `detailedItem` if `!cancelled`.

####Exact replacement for `setSelectedItemId` and the Details Modal Loader `useEffect` in `src/components/Movies/MoviesPage.tsx`:

```tsx
  const findPreloadedCinemaItem = useCallback(
    (id: number, mediaType?: Media | null): CinemaItem | null => {
      const targetType: Media = mediaType ?? (activeTab === "series" ? "tv" : "movie");
      const pools: CinemaItem[][] =
        targetType === "tv"
          ? [
              trendingSeries,
              topRatedSeries,
              popularSeries,
              actionSeries,
              mysterySeries,
              dramaSeries,
              animationSeries,
              topSeries,
              searchResults,
            ]
          : [
              trendingMovies,
              topRatedMovies,
              popularMovies,
              actionMovies,
              horrorMovies,
              dramaMovies,
              sciFiMovies,
              topMovies,
              searchResults,
            ];
      for (const list of pools) {
        const match = list.find((it) => it.id === id && it.mediaType === targetType);
        if (match) return match;
      }
      const fbList = targetType === "tv" ? FALLBACK_SERIES : FALLBACK_MOVIES;
      const fbMatch = fbList.find((it: any) => it.id === id);
      return fbMatch ? normalizeItem(fbMatch, targetType, currentLang) : null;
    },
    [
      activeTab,
      currentLang,
      trendingSeries,
      topRatedSeries,
      popularSeries,
      actionSeries,
      mysterySeries,
      dramaSeries,
      animationSeries,
      topSeries,
      trendingMovies,
      topRatedMovies,
      popularMovies,
      actionMovies,
      horrorMovies,
      dramaMovies,
      sciFiMovies,
      topMovies,
      searchResults,
    ],
  );

  const setSelectedItemId = useCallback(
    (id: number | null, mediaType?: Media) => {
      if (id === null) {
        setSelectedMediaType(null);
        setSelectedItemIdState(null);
        return;
      }
      const effType: Media = mediaType ?? (activeTab === "series" ? "tv" : "movie");
      setSelectedMediaType(effType);
      setSelectedItemIdState(id);
      const preloaded = findPreloadedCinemaItem(id, effType);
      if (preloaded) {
        setDetailedItem((prev) => (prev && prev.id === id && prev.mediaType === effType ? prev : preloaded));
        setIsLoadingDetails(false);
      } else {
        setDetailedItem((prev) => (prev && prev.id === id && prev.mediaType === effType ? prev : null));
        setIsLoadingDetails(true);
      }
    },
    [activeTab, findPreloadedCinemaItem],
  );
```

And update the Details Modal Loader `useEffect` (around line 2935):

```tsx
  // Details Modal Loader (Instant seed + non-blocking TMDB & OMDb enrichment)
  useEffect(() => {
    if (selectedItemId === null) return;
    let cancelled = false;

    const mediaType: Media = selectedMediaType ?? (activeTab === 'series' ? 'tv' : 'movie');
    const isTv = mediaType === 'tv';

    const seeded = findPreloadedCinemaItem(selectedItemId, mediaType);
    if (seeded) {
      setDetailedItem((prev) => (prev && prev.id === selectedItemId && prev.mediaType === mediaType ? prev : seeded));
      setIsLoadingDetails(false);
    } else {
      setIsLoadingDetails(true);
    }

    if (!tmdbKey) {
      if (!cancelled && seeded) {
        if (isTv && preselectedProgressItemIdRef.current !== seeded.id) {
          preselectedProgressItemIdRef.current = seeded.id;
          const saved = getProgress('tv', seeded.id);
          if (saved?.season && saved.season > 0) setSelectedSeason(saved.season);
          if (saved?.episode && saved.episode > 0) setSelectedEpisode(saved.episode);
        }
        logPlay({
          item_type: seeded.mediaType === 'tv' ? 'series' : 'movie',
          item_id: String(seeded.id),
          media_type: seeded.mediaType,
          title: seeded.title || null,
        });
        setIsLoadingDetails(false);
      }
      return;
    }

    const loadDetails = async () => {
      try {
        const langParam = `&language=${tmdbLang(currentLang)}`;
        const detailType = isTv ? 'tv' : 'movie';
        const detailsAppend = isTv ? 'videos,credits,similar,external_ids' : 'videos,credits,similar,release_dates';

        const detail = await fetchWithCache(
          `${TMDB_BASE_URL}/${detailType}/${selectedItemId}?api_key=${tmdbKey}${langParam}&include_video_language=${currentLang},en,null&append_to_response=${detailsAppend}`
        );

        if (cancelled || !detail) return;

        const normalized = normalizeItem(detail, mediaType, currentLang);
        setDetailedItem((prev) => {
          if (prev && prev.id === normalized.id && prev.mediaType === normalized.mediaType) {
            return {
              ...normalized,
              rottenTomatoes: prev.rottenTomatoes,
              metascore: prev.metascore,
              awards: prev.awards,
              boxOffice: prev.boxOffice,
            };
          }
          return normalized;
        });
        setIsLoadingDetails(false);

        if (isTv && preselectedProgressItemIdRef.current !== normalized.id) {
          preselectedProgressItemIdRef.current = normalized.id;
          const saved = getProgress('tv', normalized.id);
          if (saved?.season && saved.season > 0) setSelectedSeason(saved.season);
          if (saved?.episode && saved.episode > 0) setSelectedEpisode(saved.episode);
        }
        logPlay({
          item_type: normalized.mediaType === 'tv' ? 'series' : 'movie',
          item_id: String(normalized.id),
          media_type: normalized.mediaType,
          title: normalized.title || null,
        });

        // Non-blocking OMDb metadata enrichment in the background
        const imdbId = isTv ? detail.external_ids?.imdb_id : detail.imdb_id;
        if (imdbId) {
          void fetchOmdbMeta(imdbId, omdbKey).then((omdb) => {
            if (cancelled || !omdb) return;
            const parsedImdbRating = omdb.imdbRating ? parseFloat(omdb.imdbRating) : NaN;
            setDetailedItem((prev) => {
              if (!prev || prev.id !== normalized.id || prev.mediaType !== normalized.mediaType) {
                return prev;
              }
              return {
                ...prev,
                rating:
                  Number.isFinite(parsedImdbRating) && parsedImdbRating > 0
                    ? parsedImdbRating
                    : prev.rating,
                certification: prev.certification || omdb.rated,
                rottenTomatoes: omdb.rottenTomatoes,
                metascore: omdb.metascore,
                awards: omdb.awards,
                boxOffice: omdb.boxOffice,
              };
            });
          });
        }
      } catch (err) {
        console.error("Failed loading exact item details:", err);
      } finally {
        if (!cancelled) setIsLoadingDetails(false);
      }
    };

    void loadDetails();
    return () => { cancelled = true; };
  }, [selectedItemId, selectedMediaType, activeTab, tmdbKey, currentLang, omdbKey, findPreloadedCinemaItem]);
```

#### 8.3 Decouple Subtitle Fetching from Tier 1 Stream Extraction & Prevent Mid-Playback Effect Restarts
Replace the combined extraction + subtitle `useEffect` (lines 1372–1519) with **two decoupled, stable effects**:

1. **Effect A — Non-Blocking External Subtitles Loader** (runs in parallel in the background whenever a movie/episode watch session is active, without blocking video or iframe rendering):
   - Keyed by `[isWatchingInGallery, detailedItem?.id, detailedItem?.mediaType, activeImdbId, selectedSeason, selectedEpisode]`.
2. **Effect B — Tier 1 Direct Stream Extraction -> Tier 2 (`VidLink`) Iframe Transition**:
   - Keyed ONLY by `[isWatchingInGallery, activeGallerySource?.id, activeGallerySource?.url, allServersFailed]` so background OMDb/TMDB/IMDb metadata updates NEVER abort or restart an active playback session!
   - Uses a `checkedDirectExtractionKeyRef` (`${detailItemStorageKey}_${selectedSeason}_${selectedEpisode}`) so the Cloudflare Worker extraction probe runs **at most once per movie/episode**, and if the user fails over from one iframe server to the next, it switches directly to `playerRenderMode = "iframe"` without re-running the Worker scrape.
   - Only enters `playerRenderMode = "direct"` when `directStreams` (`v.type === "hls" || v.type === "mp4"`) is non-empty; otherwise transitions immediately to `playerRenderMode = "iframe"` (which loads **Tier 2 `server-vl` / VidLink**).

#### Exact replacement for lines 1372–1519 in `src/components/Movies/MoviesPage.tsx`:

```tsx
  const checkedExtractionKeyRef = useRef<string>("");
  const detailPlaySourcesRef = useRef<PlaySource[]>(detailPlaySources);
  detailPlaySourcesRef.current = detailPlaySources;

  // Background External Subtitles Loader (Decoupled so subtitle APIs NEVER block video/iframe startup)
  useEffect(() => {
    if (!isWatchingInGallery || !detailedItem) {
      return undefined;
    }
    let cancelled = false;
    const abortController = new AbortController();
    setIsLoadingSubtitles(true);

    void fetchExternalSubtitles({
      tmdbId: detailedItem.id,
      imdbId: activeImdbId || undefined,
      mediaType: detailedItem.mediaType,
      season: detailedItem.mediaType === "tv" ? selectedSeason : undefined,
      episode: detailedItem.mediaType === "tv" ? selectedEpisode : undefined,
      signal: abortController.signal,
    })
      .catch(() => [] as ExtractedSubtitleTrack[])
      .then((extSubs) => {
        if (cancelled) {
          revokeSubtitleBlobUrls(extSubs);
          return;
        }
        if (externalSubtitlesRef.current.length > 0) {
          revokeSubtitleBlobUrls(externalSubtitlesRef.current);
        }
        externalSubtitlesRef.current = extSubs;
        setExternalSubtitles(extSubs);
        setIsLoadingSubtitles(false);
      });

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [
    isWatchingInGallery,
    detailedItem?.id,
    detailedItem?.mediaType,
    activeImdbId,
    selectedSeason,
    selectedEpisode,
  ]);

  // Tier 1 Direct Stream Extraction (.m3u8 / .mp4) -> Tier 2 (VidLink) / Tier 3 Iframe Fallback
  useEffect(() => {
    if (!isWatchingInGallery || !activeGallerySource || allServersFailed) {
      return undefined;
    }

    const extractionSessionKey = `${detailItemStorageKey}_s${selectedSeason}_e${selectedEpisode}`;
    // If we already probed Tier 1 direct extraction for this title/episode (e.g. during iframe failover),
    // go straight to iframe mode without stalling on another Worker scrape.
    if (checkedExtractionKeyRef.current === extractionSessionKey) {
      playAttemptStartedAtRef.current = performance.now();
      setIsPlayerLoading(true);
      setPlayerRenderMode("iframe");
      return undefined;
    }

    let cancelled = false;
    const abortController = new AbortController();
    const currentToken = ++attemptTokenRef.current;
    playAttemptStartedAtRef.current = performance.now();
    loadedCurrentAttemptRef.current = false;
    setIsPlayerLoading(true);
    setPlayerRenderMode("extracting");
    setUseDirectUrlFallback(false);

    const orderedSources: PlaySource[] = [
      activeGallerySource,
      ...detailPlaySourcesRef.current.filter((s) => s.id !== activeGallerySource.id),
    ].filter((s): s is PlaySource => Boolean(s && s.url));
    const generatedTargetUrl = orderedSources.map((s) => s.url);

    async function loadAndPlayVideo() {
      checkedExtractionKeyRef.current = extractionSessionKey;
      if (generatedTargetUrl.length === 0) {
        if (!cancelled && attemptTokenRef.current === currentToken) {
          setPlayerRenderMode("iframe");
        }
        return;
      }

      try {
        const videos = await fetchExtractedVideos(
          generatedTargetUrl,
          abortController.signal,
        ).catch(() => [] as ExtractedVideoStream[]);

        if (cancelled || attemptTokenRef.current !== currentToken) {
          return;
        }

        // Tier 1 ONLY accepts true direct streams (.m3u8 / .mp4) playable in HTML5 <video>
        const directStreams = videos.filter(
          (v) => v.type === "hls" || v.type === "mp4",
        );

        if (directStreams.length === 0) {
          setExtractedStreams([]);
          playAttemptStartedAtRef.current = performance.now();
          setPlayerRenderMode("iframe");
          return;
        }

        setExtractedStreams(directStreams);
        setActiveExtractedIdx(0);
        setUseDirectUrlFallback(false);
        playAttemptStartedAtRef.current = performance.now();
        setPlayerRenderMode("direct");
      } catch {
        if (cancelled || attemptTokenRef.current !== currentToken) return;
        setExtractedStreams([]);
        playAttemptStartedAtRef.current = performance.now();
        setPlayerRenderMode("iframe");
      }
    }

    void loadAndPlayVideo();

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

Also in `startGalleryWatchSession` (around line 1304), reset `checkedExtractionKeyRef.current = "";` so an explicit "Watch Now" or Retry click performs a fresh Tier 1 check.

And update `activeSubtitlesList` (around line 1758) so that when `streamSubs` and `externalSubtitles` both exist, they are cleanly merged with Arabic (`lang === "ar"`) prioritized:

```tsx
  const activeSubtitlesList = useMemo<ExtractedSubtitleTrack[]>(() => {
    if (!isWatchingInGallery) return [];
    const streamSubs =
      extractedStreams[activeExtractedIdx]?.subtitles ||
      extractedStreams[0]?.subtitles ||
      [];
    if (streamSubs.length === 0) return externalSubtitles;
    if (externalSubtitles.length === 0) return streamSubs;
    const combined = [...streamSubs, ...externalSubtitles];
    const seen = new Set<string>();
    const deduped: ExtractedSubtitleTrack[] = [];
    for (const sub of combined) {
      const key = sub.id ?? `${sub.lang}:${sub.proxiedUrl || sub.url}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push({ ...sub, default: false });
    }
    deduped.sort((a, b) => (a.lang === "ar" && b.lang !== "ar" ? -1 : b.lang === "ar" && a.lang !== "ar" ? 1 : 0));
    if (deduped.length > 0) {
      const arIdx = deduped.findIndex((s) => s.lang === "ar");
      const defIdx = arIdx >= 0 ? arIdx : 0;
      deduped[defIdx] = { ...deduped[defIdx], default: true };
    }
    return deduped;
  }, [
    isWatchingInGallery,
    extractedStreams,
    activeExtractedIdx,
    externalSubtitles,
  ]);
```

#### 8.4 Pass `sessionKey={activeIframeUrl}` to `useIframePlayerBridge`, Handle `MEDIA_DATA` Playback Clock State, and Remove Blind Manual Clock Auto-Start
In `src/components/Movies/MoviesPage.tsx` (around lines 1969–2115):
1. Pass `sessionKey: activeIframeUrl` to `useIframePlayerBridge`.
2. In `onEvent(ev)`, treat `ev.kind === "media"` (`MEDIA_DATA`) with finite `ev.currentTime` as `paused: false` (unless `ev.paused` is explicitly boolean).
3. Remove the `window.addEventListener("blur", onBlur)` manual clock auto-start effect so silent Tier 3 servers never run an unsynced blind clock.

```tsx
  // Origin-allowlisted postMessage bridge for iframe / clean-embed players
  const bridge = useIframePlayerBridge({
    enabled:
      isWatchingInGallery &&
      (playerRenderMode === "iframe" || playerRenderMode === "clean-embed"),
    iframeRef: playerIframeRef,
    allowedOrigins: bridgeAllowedOrigins,
    sessionKey: activeIframeUrl,
    onEvent: (ev) => {
      if (typeof ev.currentTime === "number" && Number.isFinite(ev.currentTime)) {
        gotTimeSinceLoadRef.current = true;
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
  });
```

#### 8.5 Eliminate Stacked GPU Blur Lag & Render Modal Shell Immediately on Click
In `src/components/Movies/MoviesPage.tsx`:
1. Around line 3095, unmount `.lg-cinema-ambient-bg` (`filter: blur(80px)`) whenever `selectedItemId !== null` (not only when `isCinemaFocusActive` is true) so the browser never composites a full-screen 80px Gaussian blur behind the modal's `backdrop-blur-xl` + `backdrop-filter: blur(26px)`:
```tsx
      {!isCinemaFocusActive && selectedItemId === null && ambientBackdropUrl && (
        <div
          className="lg-cinema-ambient-bg"
          style={{ backgroundImage: `url(${ambientBackdropUrl})` }}
          aria-hidden="true"
        />
      )}
```
2. Around line 3723, change the modal condition from `{selectedItemId !== null && detailedItem && (` to `{selectedItemId !== null && (` and check `{isLoadingDetails || !detailedItem ? (<div className="relative z-10 flex items-center justify-center p-8"><EyeLoader /></div>) : ( ... )}` so even cold deep-links immediately show the modal overlay on click.

---

### 9. `src/utils/securityRegression.test.ts`

Update the outdated server count/order test in `src/utils/securityRegression.test.ts` (lines 36–64 and 113–124) so it matches the 5-server architecture (`server-vl` at index 0 as Tier 2 primary, followed by Tier 3 fallback servers `server-7`, `server-1`, `server-2`, `server-6`) and verifies the Tier 2 > Tier 3 priority sorting in `sortSourcesBySpeed`:

```ts
  it('sets VidLink (server-vl) as default primary Tier 2 server (index 0), keeps Tier 3 fallbacks (7, 1, 2, 6), and builds valid movie and TV URLs', () => {
    expect(CINEMA_SERVERS).toHaveLength(5);
    expect(CINEMA_SERVERS.map((s) => s.id)).toEqual([
      'server-vl',
      'server-7',
      'server-1',
      'server-2',
      'server-6',
    ]);
    const defaultServer = CINEMA_SERVERS[0];
    expect(defaultServer.id).toBe('server-vl');
    expect(defaultServer.capabilities?.timeEvents).toBe(true);
    expect(defaultServer.movie({ imdb: 'tt0111161', tmdb: 278 })).toContain(
      'https://vidlink.pro/movie/278?',
    );
    expect(defaultServer.tv({ imdb: 'tt3107288', tmdb: 60735 }, 1, 1, false)).toContain(
      'https://vidlink.pro/tv/60735/1/1?',
    );

    const server7 = CINEMA_SERVERS[1];
    expect(server7.id).toBe('server-7');
    expect(server7.movie({ imdb: 'tt0111161', tmdb: 278 })).toBe(
      'https://streamimdb.ru/embed/movie/tt0111161',
    );
    expect(server7.tv({ imdb: 'tt3107288', tmdb: 60735 }, 1, 1, false)).toBe(
      'https://streamimdb.ru/embed/tv/tt3107288/1/1',
    );

    const server1 = CINEMA_SERVERS[2];
    expect(server1.movie({ imdb: 'tt0111161', tmdb: 278 })).toBe(
      'https://www.2embed.cc/embed/tt0111161',
    );
    expect(server1.movie({ tmdb: 278 })).toBe(
      'https://www.2embed.cc/embed/278',
    );
    expect(server1.tv({ imdb: 'tt3107288', tmdb: 60735 }, 1, 1, false)).toBe(
      'https://www.2embed.cc/embedtv/tt3107288&s=1&e=1',
    );
    expect(server1.tv({ tmdb: 60735 }, 1, 1, false)).toBe(
      'https://www.2embed.cc/embedtv/60735&s=1&e=1',
    );
    expect(server1.tv({ imdb: 'tt3107288', tmdb: 60735 }, 1, 1, true)).toBe(
      'https://www.2embed.cc/embedtvfull/tt3107288',
    );
  });

  it('prioritizes Tier 2 timeEvents servers (server-vl) ahead of silent servers, and sorts silent servers by speed', () => {
    const mockSources = [
      { id: 'server-vl', capabilities: { timeEvents: true } },
      { id: 'server-7' },
      { id: 'server-1' },
      { id: 'server-2' },
      { id: 'server-6' },
    ];
    recordServerFailure('server-7');
    recordServerSuccess('server-2', 420, 'movie_278');
    const sorted = sortSourcesBySpeed(mockSources, 'movie_278');
    // Tier 2 (server-vl) stays at index 0 ahead of silent servers
    expect(sorted[0].id).toBe('server-vl');
    // Fastest working silent server (server-2) is first among Tier 3 fallbacks
    expect(sorted[1].id).toBe('server-2');
    expect(sorted[sorted.length - 1].id).toBe('server-7');
  });
```

---

## Final Verification Checklist for the Agent

Run the following commands in sequence and confirm zero errors:
1. `npx tsc --noEmit`
2. `node scripts/check-csp.mjs`
3. `npx vitest run`
4. `npm run lint`
