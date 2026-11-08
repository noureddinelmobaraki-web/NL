import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'node:path';
import { createCinemaDownloadBridgeMiddleware } from './src/features/cinemaDownload/serverBridgeMiddleware';

async function startServer() {
  process.env.CINEMA_BRIDGE_MOUNTED = '1';
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '25mb' }));
  app.use(createCinemaDownloadBridgeMiddleware());

  // ===========================================================================
  // Cinema Torrent Download & Multi-Indexer Discovery Endpoint
  // ===========================================================================

  app.get('/api/cinema-download/discover', async (req, res) => {
    const imdbId = String(req.query.imdbId || '').trim();
    const mediaType = String(req.query.mediaType || 'movie');
    const title = String(req.query.title || '').trim();
    const season = Number(req.query.season || 1);
    const episode = Number(req.query.episode || 1);

    const candidates: Array<{
      infoHash: string;
      rawTitle: string;
      sizeBytes: number;
      seeders: number;
      leechers: number;
      qualityHint?: string;
      sourceLabel: string;
      webSeeds?: string[];
      directTorrentUrl?: string;
    }> = [];

    const tasks: Promise<void>[] = [];

    if (mediaType === 'movie' && (imdbId.startsWith('tt') || title)) {
      tasks.push(
        (async () => {
          const mirrors = [
            'https://movies-api.accel.li/api/v2',
            'https://yts.gg/api/v2',
            'https://yts.mx/api/v2',
          ];
          const queryTerm = imdbId.startsWith('tt') ? imdbId : title;
          for (const base of mirrors) {
            try {
              const r = await fetch(
                `${base}/list_movies.json?query_term=${encodeURIComponent(queryTerm)}&with_rt_ratings=true&limit=10`,
                { signal: AbortSignal.timeout(4500) },
              );
              if (!r.ok) continue;
              const data = await r.json();
              const movies = data?.data?.movies || [];
              if (!Array.isArray(movies) || movies.length === 0) continue;
              for (const m of movies) {
                for (const tor of m?.torrents || []) {
                  if (!tor?.hash) continue;
                  const codecTag =
                    tor.video_codec === 'x265' ? 'x265.10bit' : tor.video_codec || 'x264';
                  candidates.push({
                    infoHash: String(tor.hash).toLowerCase(),
                    rawTitle: `${m.title_long || m.title || title}.${tor.quality}.${(tor.type || 'WEB').toUpperCase()}.${codecTag}-YTS.GG.mp4`,
                    sizeBytes: Number(tor.size_bytes) || 1.8 * 1024 * 1024 * 1024,
                    seeders: Number(tor.seeds) || 35,
                    leechers: Number(tor.peers) || 8,
                    qualityHint: tor.quality,
                    sourceLabel: `YTS.GG (${(tor.type || 'WEB').toUpperCase()} ${codecTag})`,
                    directTorrentUrl: tor.url || undefined,
                  });
                }
              }
              break;
            } catch {}
          }
        })(),
      );
    }

    if (imdbId.startsWith('tt')) {
      tasks.push(
        (async () => {
          try {
            const stremioPath =
              mediaType === 'tv'
                ? `series/${imdbId}:${season}:${episode}.json`
                : `movie/${imdbId}.json`;
            const r = await fetch(`https://torrentio.strem.fun/sort=seeders/${stremioPath}`, {
              signal: AbortSignal.timeout(5000),
            });
            if (!r.ok) return;
            const data = await r.json();
            for (const s of (data?.streams || []).slice(0, 14)) {
              if (!s?.infoHash) continue;
              const rawDesc = String(s.title || s.name || title).replace(/\n/g, ' ');
              const seedMatch = rawDesc.match(/👤\s*(\d+)/);
              const sizeMatch = rawDesc.match(/💾\s*([\d.]+)\s*(GB|MB)/i);
              let sizeBytes = 1.9 * 1024 * 1024 * 1024;
              if (sizeMatch) {
                const val = parseFloat(sizeMatch[1]);
                const unit = sizeMatch[2].toUpperCase();
                sizeBytes = Math.round(
                  val * (unit === 'GB' ? 1024 * 1024 * 1024 : 1024 * 1024),
                );
              }
              candidates.push({
                infoHash: String(s.infoHash).toLowerCase(),
                rawTitle: rawDesc,
                sizeBytes,
                seeders: seedMatch ? parseInt(seedMatch[1], 10) : 25,
                leechers: 5,
                sourceLabel: 'Torrentio DHT',
                webSeeds: Array.isArray(s.sources)
                  ? s.sources.filter((src: string) => src.startsWith('http'))
                  : [],
              });
            }
          } catch {}
        })(),
      );
    }

    await Promise.allSettled(tasks);
    res.json({ imdbId, candidates });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get(/.*/, (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
