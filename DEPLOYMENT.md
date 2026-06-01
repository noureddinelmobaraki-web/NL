# NL — Noureddin El Mobaraki | Deployment Guide

This document describes how the project is built and deployed to GitHub Pages.

## 🌐 Production URL
👉 https://noureddinelmobaraki-web.github.io/NL/

## ⚙️ Configuration

### Base path
The `base` property in `vite.config.ts` is set to `/NL/` to match the GitHub repository name. This is required because the site is served from a subpath, not the root.

### Required environment variables (set as GitHub Secrets)
- `VITE_EMAILJS_SERVICE_ID` — EmailJS service identifier
- `VITE_EMAILJS_TEMPLATE_ID` — EmailJS template identifier
- `VITE_EMAILJS_PUBLIC_KEY` — EmailJS public key (safe for client-side)

Set them via: Repository → Settings → Secrets and variables → Actions → New repository secret.

## 🚀 Build Pipeline (automatic via GitHub Actions)

The workflow `.github/workflows/deploy.yml` runs on every push to `main`:

1. **audit** — Trivy security scan, results uploaded to GitHub Security tab.
2. **build-and-lint**:
   - `npm ci` — install dependencies from package-lock.json (deterministic)
   - `npm run lint` — TypeScript strict type-check (`tsc --noEmit`)
   - `npm run build` — runs the full build pipeline:
     a. `node scripts/verify-lrc.mjs` — validates that every song in `songs.json` has a matching LRC/SBV/SRT file in `public/lrc/`
     b. `node scripts/hash.mjs --write` — computes SHA-256 hash of inline scripts in index.html for CSP
     c. `vite build --emptyOutDir` — production bundle into `dist/`
     d. `esbuild server.ts` — bundle Express server into `dist/server.cjs` (for local production preview only — not deployed to Pages)
     e. `node scripts/generate-sitemap.mjs` — regenerate `dist/sitemap.xml` and `public/sitemap.xml` from songs.json
3. **deploy** — uploads `dist/` as a GitHub Pages artifact and deploys it.

## 🧪 Quality Pipeline (parallel via `.github/workflows/quality.yml`)

This workflow runs:
- Lint check
- Build verification
- Rollup bundle size analyzer (uploaded as artifact `rollup-stats`)
- Custom checks: `node scripts/verify-build.mjs` (bundle size budget, asset hashes, etc.)
- Lighthouse CI audit (performance ≥ 90, a11y ≥ 90, SEO ≥ 95)

## 🛠️ Local Development

```bash
# Install dependencies
npm ci

# Start dev server (Vite + HMR)
npm run dev
# → http://localhost:3000

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📂 Key Folders

- `src/` — React/TypeScript source code
- `public/` — static assets (copied as-is to `dist/`)
- `public/lrc/` — lyric files (.lrc / .sbv / .srt) referenced from songs.json
- `public/data/` — JSON data files (songs, videos, LQIP manifest)
- `scripts/` — build-time Node scripts (sitemap generator, LRC verifier, etc.)
- `dist/` — generated output (gitignored, regenerated each build)

## 🔐 Security Notes

- All inline scripts in index.html are hashed and added to the CSP `script-src` directive automatically by `scripts/hash.mjs`. **Never edit inline scripts manually without running this hash script.**
- The Express server (`server.ts`) is for local development only. It is NOT deployed — GitHub Pages serves the static `dist/` folder directly.
- `.env*` files are gitignored. Only `.env.example` is committed.

## 📡 CDN Architecture

Heavy media (audio HLS streams, hero images, etc.) is NOT served from this repository. It is hosted in a separate GitHub Pages site: `https://noureddinelmobaraki-web.github.io/nl-audio-cdn/`. This keeps the main repo small and lets the CDN evolve independently.
