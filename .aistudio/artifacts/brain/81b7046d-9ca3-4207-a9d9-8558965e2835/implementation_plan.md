# Surgical Fix for Movies Page Video Progress Bar Synchronization

Resolves two-way timeline synchronization failures and Turnstile-induced infinite spinners on the Movies page by loading closed third-party embeds directly, enabling wildcard subdomain origin matching (`*.vidlink.pro`), replacing cross-origin `frames.length` traversal with a Site-Isolation-safe origin/source check, and prioritizing VidLink (`server-vl`) whenever a TMDB ID is available.

## User Review & Critical Decisions

> [!IMPORTANT]
> All requirements are explicitly specified in the engineering brief:
> - **Direct Embed Loading for Turnstile Servers**: `workerBridge: true` is removed from `server-7`, `server-1`, `server-2`, and `server-6` so their embeds load directly without triggering Cloudflare Turnstile blocks on `workers.dev`.
> - **Site-Isolation-Safe `postMessage` Validation**: `isFromFrame` and `isOriginAllowed` in `iframeBridge` will support `*.vidlink.pro` wildcard subdomains and accept verified `PLAYER_EVENT`, `MEDIA_DATA`, and `__nl === 1` player payloads from allowlisted origins when cross-origin frame hierarchy inspection is restricted by browser Site Isolation.
> - **VidLink Priority**: When a movie or series has a valid TMDB ID, `server-vl` (VidLink) is prioritized at index `0` unless it has recorded recent failures.

## 1. Overview & Core Concept

- **What It Does**: Eliminates the 8-second black spinner on Turnstile-protected embed servers and restores real-time `PLAYER_EVENT` / `MEDIA_DATA` progress synchronization with VidLink (`*.vidlink.pro`) and direct `<video>` streams in Chrome/Brave Site Isolation environments.
- **Target Audience / Persona**: Viewers watching movies and TV series on the Movies page who expect instant playback startup, accurate timeline progress, and responsive two-way seeking.
- **Key Value**: Immediate iframe playback without proxy challenge failures, combined with reliable `postMessage` reception from nested or subdomained VidLink player frames.

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Title Selection & Playback Start**: When a user opens a title with a TMDB ID and clicks Watch Now, `server-vl` (VidLink) is selected as priority 0 (unless it previously failed), providing native `PLAYER_EVENT` two-way sync and `?startAt=` support.
  2. **In-Player & External Scrubbing**: Events from `vidlink.pro`, `player.vidlink.pro`, `cloud.vidlink.pro`, or any `*.vidlink.pro` subdomain pass origin and source validation under Chrome/Brave Site Isolation, immediately transitioning the external `CinemaTimeline` out of `"Not synced — manual"` mode into active bridged sync.
  3. **Fallback Embeds**: If failover advances to Server 7, Server 1, Server 2, or Server 6, the raw embed URL loads directly in the iframe without routing through the Worker `/embed` proxy or waiting on an 8-second watchdog.
- **Visual Identity & Theme**: Preserves the existing Liquid Glass cinema stage and control bar styling without any visual regressions.

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Disable Worker `/embed` Proxy on Turnstile-Protected Servers**
  - *Chosen Approach*: Remove `workerBridge: true` from `server-7`, `server-1`, `server-2`, and `server-6`, and only call `toWorkerEmbedUrl` when `srvCaps?.workerBridge === true`.
  - *Why*: Upstream CDNs (`nextgencloudfabric.com`, etc.) enforce Cloudflare Turnstile against `workers.dev` IPs, causing proxied embeds to hang. Loading them directly restores instant playback.
- **Decision 2: Site-Isolation-Safe Source & Wildcard Origin Verification**
  - *Chosen Approach*: Add `isOriginAllowed(origin, allowedOrigins)` supporting exact matches and wildcard subdomains (`https://*.vidlink.pro` / `.vidlink.pro`), and update `isFromFrame` to check `source === root`, then `source.parent === window || source.top === window` in a `try/catch`, and finally fall back to accepting validated player messages (`PLAYER_EVENT`, `MEDIA_DATA`, `__nl === 1`) from allowlisted origins.
  - *Why*: Modern browsers with Site Isolation throw `DOMException` or return `0` when inspecting cross-origin `win.frames.length`, which previously caused legitimate messages from nested VidLink player frames to be rejected with `REJECT:source`.

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         MoviesPage & Server Queue                        │
│  • TMDB ID present ──► Prioritize `server-vl` (VidLink) at index 0       │
│  • `activeIframeUrl` ──► Raw URL unless `srvCaps?.workerBridge === true` │
│  • `bridgeAllowedOrigins` ──► ALL_SERVER_FRAME_ORIGINS + `*.vidlink.pro` │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │ postMessage
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                       iframeBridge (Message Gate)                        │
│  1. `isOriginAllowed(e.origin, allowedOrigins)`                          │
│     ├─ Exact origin match OR wildcard subdomain (`*.vidlink.pro`)        │
│  2. `parsePlayerMessage(e.data)`                                         │
│     ├─ Extracts `PLAYER_EVENT`, `MEDIA_DATA`, or `__nl === 1`            │
│  3. `isFromFrame(e.source, root, e.origin, allowedOrigins, e.data)`      │
│     ├─ `source === root`                                                 │
│     ├─ `try { source.parent === window || source.top === window }`       │
│     └─ Fallback: allowlisted origin + valid player payload               │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │ BridgeEvent
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                  syncController & playbackClock ◄──► CinemaTimeline      │
└──────────────────────────────────────────────────────────────────────────┘
```

- **Server Configuration & CSP Alignment**:
  - Expand `server-vl` origins to `['https://vidlink.pro', 'https://player.vidlink.pro', 'https://cloud.vidlink.pro']` and keep `index.html` `frame-src` synchronized so `scripts/check-csp.mjs` passes.
  - Ensure `sortSourcesBySpeed` and `startGalleryWatchSession` place `server-vl` at index `0` whenever a TMDB ID is present and `server-vl` has not recorded a failure override.
