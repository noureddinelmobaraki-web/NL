# NL — Noureddin El Mobaraki (Nordine GB) Official Web Architecture

[![Production Deployment](https://img.shields.io/badge/Production-Live-success.svg?style=flat-square&color=A6FF2B&labelColor=111111)](https://noureddinelmobaraki-web.github.io/NL/)
[![Tech Stack](https://img.shields.io/badge/Stack-React%2019%20%7C%20Vite%206%20%7C%20TS-blue.svg?style=flat-square&color=00D1FF&labelColor=111111)](#system-architecture--tech-stack)
[![Linter](https://img.shields.io/badge/Linter-Strict%20TypeScript-brightgreen.svg?style=flat-square&color=00FF66&labelColor=111111)](#testing--quality-assurance)

This repository houses the complete visual portfolio, music distribution archive, and interactive media player core for Moroccan rap artist and independent music producer **Noureddin El Mobaraki**, known professionaly as **NL** (and **Nordine GB**). 

The application is engineered as a high-performance, single-page web environment (SPA) featuring immersive retro cassette radio simulators, an automated share-page generator, and robust search crawler indexing.

---

## 🔗 Production URL & Live Targets
The primary public deployment of this application is statically generated, optimized, and served directly at:
👉 **[https://noureddinelmobaraki-web.github.io/NL/](https://noureddinelmobaraki-web.github.io/NL/)**

---

## 🏛️ System Architecture & Tech Stack

The architecture is built on a modular client-server framework. It enables an asset-optimized static user interface while retaining local server capabilities for developer tasks and AI-driven content organizing.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT APPLICATION (SPA)                        │
├───────────────────────────────────┬────────────────────────────────────┤
│ Presentational Layer              │ Reactive state & motion animations │
│ Audio Engine & Feed Filters       │ HLS.js video player / custom views │
│ SEO / Structured Data Markup      │ LocalStorage channel caches        │
└─────────────────────────────────┬─┴────────────────────────────────────┘
                                  │ JSON payload request (limits: ~50MB)
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        EXPRESS BACKEND ENGINE                          │
├────────────────────────────────────────────────────────────────────────┤
│ • Node.js / Express Core (v5.x / tsx runtime engine)                    │
│ • Adaptive payload deserializers for large playlist mapping (50MB)     │
└────────────────────────────────────────────────────────────────────────┘
```

### Core Frontend Stack
*   **Reactive Runtime:** [React 19.x](https://react.dev) — Employs custom hooks, optimized Virtual DOM execution, and stateful hook composition.
*   **Build Bundler:** [Vite 6.x](https://vite.dev) — Fast HMR-free local bundler powered by esbuild and Rollup compilation pipelines.
*   **Strong Typing:** [TypeScript ~5.8.x](https://www.typescriptlang.org) — Enforces type-safety across all components, APIs, and playlist stream datasets.
*   **Styling Engine:** [Tailwind CSS v4](https://tailwindcss.com) — Modern compiler built for CSS-native components, optimized bundle delivery, and custom utility declarations.
*   **Transition Engine:** [Framer Motion v12.x](https://www.framer.com/motion/) — Handles physics-based interactive micro-animations and spatial transitions.
*   **Adaptive Streaming Player:** [HLS.js v1.6.x](https://github.com/video-dev/hls.js) — Facilitates client-side parsing and adaptive bitrate playback for HLS (`.m3u8`) audio and TV streams.

---

## 🦾 Automated Workflows & Build Pipelines

The project's build processes are automated via customized build pipelines in `package.json`.

```bash
"build": "node scripts/generate-share.cjs && vite build && node scripts/generate-sitemap.mjs"
```

### 1. Dedicated Multi-Channel Share Page Generation (`scripts/generate-share.cjs`)
To satisfy SEO requirements for indexing on dynamic song assets, the pre-build hook dynamically compiles 25 standalone static share layout wrappers inside `/public/share/song-[id].html`. Each page leverages custom pre-defined meta tag wrappers to support rich preview cards on social networks (WhatsApp, Facebook, Twitter).

### 2. Algorithmic Sitemap Composition (`scripts/generate-sitemap.mjs`)
The secondary post-build pipeline parses the overall application parameters and writes a comprehensive XML Sitemap output to `public/sitemap.xml` and `dist/sitemap.xml`. It completely structure-maps:
- The authoritative canonical root.
- The 25 programmatic static song share pages.
- Advanced Google Image markup (`<image:image>`) for indexing artist graphics, posters, and digital artwork.

---

## 📈 Search Engine Optimization (SEO) Architecture

This system is configured using strict search-engine optimization directives to ensure perfect discoverability:

### 1. Meta Representation
The `<head>` of `index.html` implements explicit bilingual index pointers:
- **Canonical Address:** `https://noureddinelmobaraki-web.github.io/NL/`
- **Descriptions:** Dedicated Arabic and English synopses targeting keywords, geographical parameters, and artist identities.
- **Open Graph (OG) & Twitter Spec:** Complete metadata layouts with responsive fallback images sized correctly at `1200x630px` to enhance user engagement.

### 2. Person JSON-LD Schema
Integrated directly into the site root is a rich Google Knowledge Graph schema:
```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Noureddin El Mobaraki",
  "additionalName": "Nordine GB",
  "alternateName": "NL",
  "description": "Independent Rap and Hip-Hop Music Producer and Lyricist based in Casablanca.",
  "url": "https://noureddinelmobaraki-web.github.io/NL/",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Casablanca",
    "addressCountry": "MA"
  },
  "sameAs": [
    "https://www.youtube.com/@nourdin_el_mobaraki",
    "https://music.apple.com/us/artist/nl/1535833912",
    "https://www.deezer.com/en/artist/362375722"
  ]
}
```

### 3. Static Proof Verification
*   **Google Search Console Token:** `public/googlef1f185223603a83e.html` is embedded at the site root to assert continuous domain ownership.
*   **Crawl Governance (`public/robots.txt`):** Defines strict instruction pointers for spiders:
    ```text
    User-agent: *
    Allow: /
    Allow: /sitemap.xml

    Sitemap: https://noureddinelmobaraki-web.github.io/NL/sitemap.xml
    ```

---

## 🎵 Live Digital Distribution Channels

The official distribution nodes for NL (Noureddin El Mobaraki) are compiled into the streaming registry:

| Platform | Production Distribution Target |
| :--- | :--- |
| **Spotify** | [NL on Spotify](https://open.spotify.com/artist/5nwGOyilF1p4uv35v6vb2u) |
| **Apple Music** | [NL on Apple Music](https://music.apple.com/us/artist/nl/1535833912) |
| **Deezer** | [NL on Deezer](https://www.deezer.com/en/artist/362375722) |
| **Amazon Music** | [NL on Amazon Music](https://music.amazon.fr/artists/B0025ODH90/nl) |
| **Anghami** | [NL on Anghami](https://play.anghami.com/artist/1430009) |
| **SoundCloud** | [NL on SoundCloud](https://on.soundcloud.com/Ok8zBgOjCPqjvStEA) |
| **YouTube** | [Nordine GB - YouTube](https://www.youtube.com/@nourdin_el_mobaraki) |

---

## 💻 Local Development & Engineering

### Prerequisites
*   Node.js v20.0.0 or higher.
*   npm v10.0.0 or higher.

### Command Guide

#### 1. Setup Dependencies
```bash
npm install
```

#### 2. Launch Local Environment
Boots up the TSX Express server on port 3000 mapping hot-module assets safely and mounting static assets locally:
```bash
npm run dev
```

#### 3. Run Production Build Workflow
Runs the complete production pipeline (Share Page Generation -> Vite Compilation -> XML sitemap writing):
```bash
npm run build
```

#### 4. Strict Type Audit
Checks types across all modules:
```bash
npm run lint
```

#### 5. Image Compression & Optimizer
Triggers Sharp pipelines to encode original JPG/PNG image structures to optimized, next-generation WebP formatting:
```bash
npm run optimize:images
```
