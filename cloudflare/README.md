# NL Cloudflare Worker (`broad-block-7bd7`)

`cloudflare/worker.js` is the single-file reference copy deployed to `https://broad-block-7bd7.nordinegb2018.workers.dev/`.

## Routes
- `POST /` & `GET /?url=...` — Stream extraction
- `GET /proxy?videoUrl=...&referer=...` — HLS/MP4 stream proxy with final-URL playlist rewriting
- `GET /subs/search?id=...&language=...` — Wyzie subtitle search proxy (strips API key from download URLs)
- `GET /subs/file?url=...` — Raw ArrayBuffer subtitle proxy (preserves `windows-1256` and UTF-8 bytes)
- `GET /trailer/imdb?id=tt...` — IMDb trailer `vi...` resolver
- `GET /meta/omdb?i=tt...` — OMDb metadata proxy (IMDb rating, Rotten Tomatoes, Metascore, Awards, Box Office)
- `GET /tmdb/3/*` — Optional cached TMDB proxy
- `GET /health` — Diagnostic status endpoint

## Worker Secrets & Bindings
- Secrets: `WYZIE_KEY`, `OMDB_KEY`, `TMDB_KEY`
- Optional KV namespace binding: `NL_CACHE`
- Optional Variable: `ALLOWED_ORIGINS`

## GitHub Actions Variables (`vars`)
- `VITE_USE_WORKER_SUBS_PROXY=1`
- `VITE_USE_WORKER_META=1`
