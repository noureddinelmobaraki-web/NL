# Surgical Fix for Movies Page Playback Pipeline & Timeline Synchronization

## Summary of Completed Work

### 1. Server Configuration & Tier 2 Priority (`src/config/servers.ts`)
- Confirmed `server-vl` (VidLink) as primary server at index `0` with `{ timeEvents: true, startAt: true }`.
- Verified raw embed URL loading without `workerBridge: true`.
- Allowlisted all VidLink domains (`https://vidlink.pro`, `https://player.vidlink.pro`, `https://cloud.vidlink.pro`) in CSP.

### 2. Speed Monitor & Priority Inversion Protection (`src/services/serverSpeedMonitor.ts`)
- Upgraded cache storage key to `nl_cinema_server_speed_v2` to discard stale legacy timings.
- Implemented strict two-bucket sorting: Bucket 0 (Tier 2 time-reporting servers) always precedes Bucket 1 (Tier 3 silent embeds).
- Prevented silent fallback servers from overwriting `server-vl` in `byTitle` preferences.

### 3. Tier 1 Stream Extraction Streamlining (`src/services/videoExtractor.ts`)
- Restricted Tier 1 extraction strictly to direct `.m3u8` / `.mp4` streams.
- Removed `clean-embed` promotion logic that previously hijacked playback with silent `2vcdn.skin` embeds.
- Tightened extraction timeout to 4,500ms for fast fallback.

### 4. Player Bridge & Clock Synchronization (`src/features/cinema/player/iframeBridge.ts`)
- Added `sessionKey` to cleanly reset active bridge state when switching servers or episodes.
- Required a finite, positive `currentTime` before transitioning `active = true` to avoid stuck initial clocks.
- Normalized `MEDIA_DATA` events to set `paused: false` when valid playback timestamps are received.
- Supported `*.vidlink.*` wildcard origin matching under browser Site Isolation.

### 5. Timeline Display Guarding (`src/features/cinema/player/CinemaTimeline.tsx`)
- Enforced `if (mode === "none") return null;` so external timeline never renders on silent Tier 3 servers.
- Stripped dummy "Not synced — manual" UI and blind time counters.

### 6. Modal Memoization & IMDb Cache (`src/components/Movies/MovieSourcesModal.tsx`)
- Added `localStorage` caching (`nl_imdb_id_cache_v1`) for resolved IMDb IDs.
- Memoized `sources` and effect triggers strictly on primitive values to prevent mid-flight playback aborts.

### 7. Instant 0ms Trailer Resolution (`src/services/trailerService.ts`)
- Returns `{ kind: "youtube", key }` immediately at 0ms whenever TMDB provides a valid YouTube key.
- Constrained IMDb fallback scraping to tight timeouts only when no YouTube key is present.

### 8. Instant Modal Open & Smooth Playback (`src/components/Movies/MoviesPage.tsx`)
- Added `findPreloadedCinemaItem` to synchronously seed `detailedItem` on poster click (0ms open).
- Transitioned OMDb enrichment to background non-blocking execution with LRU + `localStorage` cache (`nl_omdb_v1_`).
- Decoupled external subtitle fetching into a non-blocking background effect so video starts playing immediately.
- Keyed video extraction strictly on primitive media session IDs.
- Unmounted `.lg-cinema-ambient-bg` when modal is open to eliminate GPU blur compositing stutter.
- Removed blind window `onBlur` auto-clocking on silent servers.

### 9. Verification & Quality Gates
- `node scripts/check-csp.mjs`: PASSED (all 13 server origins verified).
- `npx vitest run src/utils/securityRegression.test.ts src/features/cinema/player/__tests__/`: PASSED (19 of 19 tests).
- `npx tsc --noEmit`: PASSED with 0 errors.
- `compile_applet`: PASSED.
- `lint_applet`: PASSED with 0 errors.
