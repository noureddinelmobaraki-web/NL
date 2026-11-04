# Cinema Phase 3b & Bidirectional Timeline Synchronization

This update wires the newly deployed unified Cloudflare Worker (subtitles proxy, OMDb metadata proxy, and stream extraction), removes exposed client-side Wyzie secrets from CI, surfaces rich OMDb critical ratings and box-office facts in the Cinema detail view, and introduces bidirectional synchronization between the internal gallery player and the external Liquid Glass timeline bar.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and UX choices were confirmed and incorporated into this plan:

- **Confirmed Decision 1 — Bidirectional Timeline Synchronization (`direct`, `bridged`, and `iframe` modes)**: Dragging or clicking the external progress bar below the gallery (or inside fullscreen) immediately updates the shared playback clock (`clockSeek`), dispatches standard cross-origin player command messages (`postMessage` seek/play/pause for supported embed players like VidLink/PlayerJS/JW), and updates the active embed's `startAt` resume anchor when needed so both bars and subtitles stay locked in sync. Conversely, any time/play/pause/seek event emitted inside the gallery player (`<video>` events or iframe `PLAYER_EVENT` / `MEDIA_DATA` messages) immediately updates the external timeline bar and Continue Watching progress.
- **Confirmed Decision 2 — OMDb Rich Metadata Placement**: When `rottenTomatoes`, `metascore`, `awards`, or `boxOffice` are returned by OMDb (via the Worker `/meta/omdb` route when `VITE_USE_WORKER_META=1`, or fallback direct OMDb), compact ratings (`Rotten Tomatoes`, `Metacritic`) appear in the gallery hero overlay header alongside the IMDb rating AND all four fields (`Rotten Tomatoes`, `Metacritic`, `Awards`, `Box Office`) appear in the storyline metadata facts grid below the stage—rendered strictly when real values exist.

---

## 1. Overview & Core Concept

- **What It Does**:
  1. Replaces the split Worker route snippet with the single-file `cloudflare/worker.js` reference copy (excluded from TypeScript, ESLint, and Vite bundles).
  2. Hardens `.github/workflows/deploy.yml` by removing `VITE_WYZIE_API_KEY` from client build env vars and wiring `VITE_USE_WORKER_SUBS_PROXY` and `VITE_USE_WORKER_META` from repository variables.
  3. Connects OMDb lookups to `${WORKER_ENDPOINT}meta/omdb?i=${imdbId}` when `VITE_USE_WORKER_META === "1"` (with automatic fallback to direct OMDb when the flag is off) and displays Rotten Tomatoes, Metacritic, Awards, and Box Office in Arabic, English, and French.
  4. Synchronizes the progress bar inside the gallery player and the external Liquid Glass control bar below the gallery so seeking, pausing, or playing in either place updates the other in real time.
- **Target Audience / Persona**: Cinema viewers watching movies and TV series across direct HLS/MP4 streams and embedded servers with multi-language subtitles.
- **Key Value**: Eliminates API key leakage in client bundles, keeps subtitle timing and progress bars unified across inner and outer controls, and enriches title pages with verified Rotten Tomatoes, Metacritic, Awards, and Box Office data.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  - **Bidirectional Timeline Scrubbing & Play/Pause Sync**:
    - When watching via direct HLS/MP4 or an embedded player, the external timeline bar below the gallery (and the floating fullscreen bar) provides an interactive seek slider, `-10s` / `+10s` step controls, and play/pause toggle.
    - When the internal player advances, pauses, or seeks, the external bar and `SubtitleOverlay` reflect the exact timestamp immediately.
    - When the user drags the external seek slider or clicks `-10s` / `+10s` / Play / Pause:
      - In `direct` mode, it sets `video.currentTime` and toggles `video.play()` / `video.pause()`, which immediately drives the clock.
      - In `bridged` / `iframe` mode, it updates `playbackClock` (`clockSeek` / `clockPlay` / `clockPause`), dispatches multi-protocol `postMessage` commands (`seek`, `play`, `pause` in VidLink / PlayerJS / video.js JSON formats) to the iframe `contentWindow`, and offers a one-click or debounced `startAt` reload sync when an embed server requires URL-level seeking (`?startAt=`) without losing subtitle alignment.
  - **Enriched OMDb Metadata Display**:
    - Opening any movie or TV series fetches TMDB details plus OMDb metadata (via Worker `/meta/omdb?i=tt...` when `VITE_USE_WORKER_META === "1"`, or direct OMDb fallback).
    - If `rottenTomatoes` or `metascore` exist, they render in the gallery stage header next to the IMDb star rating and in the storyline metadata section.
    - If `awards` or `boxOffice` exist, they render in the storyline metadata facts grid with localized labels (`movies.meta.rottenTomatoes`, `movies.meta.metascore`, `movies.meta.awards`, `movies.meta.boxOffice`).
- **Visual Identity & Theme**:
  - Preserves the project's **Liquid Glass** cinema aesthetic (`#05070e` deep obsidian canvas, translucent `rgba(255,255,255,0.06)` glass surfaces, hairline `rgba(255,255,255,0.12)` borders, and `#dc2626` cinema red focal accent).
  - Tabular numerals (`tabular-nums`) on all timestamps (`01:10 / 1:42:00`), percentages (`94%`), and scores (`82/100`) to prevent horizontal jitter during playback.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Unified Bidirectional Timeline Controller (`CinemaTimeline` + `iframeBridge`)**
  - *Chosen Approach*: Upgrade `CinemaTimeline` so all active modes (`direct`, `bridged`, and `none`/embed) expose an interactive range slider and `-10s` / `+10s` / Play-Pause controls bound to a unified seek/play/pause handler. Extend `iframeBridge` with `sendIframePlayerCommand(iframe, command, value)` supporting PlayerJS (`{ api: "seek", set: sec }`), VidLink/generic JSON (`{ type: "PLAYER_COMMAND", command: "seek", currentTime: sec }`, `{ event: "command", func: "seekTo", args: [sec, true] }`), plus optional URL `startAt` re-anchoring when `capabilities.startAt` is supported.
  - *Why*: Previously, `server-vl` forced `controlMode = "bridged"` statically via `capabilities.timeEvents` even before a `postMessage` arrived, rendering a read-only `<div>` bar that could neither be scrubbed by the user nor stay aligned if the user scrubbed inside the iframe. Making the timeline interactive and bidirectional ensures any change on one side updates the other.
- **Decision 2: Zero-Secret Client Bundles via Worker Proxy Flags**
  - *Chosen Approach*: Remove `VITE_WYZIE_API_KEY` from `.github/workflows/deploy.yml` and read `VITE_USE_WORKER_SUBS_PROXY` and `VITE_USE_WORKER_META` from GitHub Actions `vars`.
  - *Why*: Vite statically inlines `VITE_*` variables into client JS chunks. Keeping `WYZIE_KEY` and `OMDB_KEY` inside Cloudflare Worker secrets protects the keys while allowing the frontend to toggle proxy routing via non-sensitive boolean flags (`"1"`).

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Synchronization Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        Cinema Stage (Inside Gallery)                     │
│  ┌──────────────────────────────┐    ┌────────────────────────────────┐  │
│  │  Direct <video> (HLS / MP4)  │    │  Embedded <iframe> (VidLink…)  │  │
│  └──────┬───────────────▲───────┘    └──────┬─────────────────▲───────┘  │
└─────────┼───────────────┼───────────────────┼─────────────────┼──────────┘
          │ timeupdate /  │ video.currentTime │ postMessage     │ postMessage
          │ play / pause  │ .play() / .pause()│ PLAYER_EVENT    │ seek / play /
          ▼               │                   ▼                 │ pause + startAt
┌─────────────────────────┴─────────────────────────────────────┴──────────┐
│                 Shared Playback Clock & Command Bus                      │
│   clockSync / clockSoftSync / clockSeek / clockPlay / clockPause         │
└─────────┬─────────────────────────────────────────────────────▲──────────┘
          │ useClockTime(200) / rAF                             │ onSeek /
          ▼                                                     │ onTogglePlay
┌───────────────────────────────────────────────────────────────┴──────────┐
│     External & Fullscreen Liquid Glass Bar + SubtitleOverlay + Progress  │
│  [Play/Pause] [-10s] [+10s]  01:10 ●━━━━━━━━━━━━━━━ 1:42:00  [CC] [Full] │
└──────────────────────────────────────────────────────────────────────────┘
```

### Data Model & State
- **OMDb Enriched Metadata (`CinemaItem`)**:
  - Extend `CinemaItem` with optional fields: `rottenTomatoes?: string`, `metascore?: string`, `awards?: string`, `boxOffice?: string`, `imdbVotes?: string`, `rated?: string`.
  - Create a helper `fetchOmdbMetadata(imdbId: string, omdbKey?: string, signal?: AbortSignal)` that queries `${WORKER_ENDPOINT}meta/omdb?i=${imdbId}` when `import.meta.env.VITE_USE_WORKER_META === "1"` and falls back to `https://www.omdbapi.com/?i=${imdbId}&apikey=${omdbKey}` when the flag is off.
- **Worker Reference & Build Exclusions**:
  - Replace `cloudflare/nl-routes.js` with the complete single-file `cloudflare/worker.js` reference copy.
  - Ensure `cloudflare` is excluded in `tsconfig.json` (`"exclude": ["node_modules", "dist", "public", "cloudflare"]`) so `tsc`, ESLint, and Vite ignore it completely.
- **CSP & Endpoint Verification**:
  - Verify `WORKER_ENDPOINT` in `src/services/videoExtractor.ts` ends with `"/"` (`https://broad-block-7bd7.nordinegb2018.workers.dev/`) and `https://broad-block-7bd7.nordinegb2018.workers.dev` is present in `connect-src` in `index.html`.
