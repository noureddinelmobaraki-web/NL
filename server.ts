import express from "express";
import path from "path";
import rateLimit from "express-rate-limit";

// Rate limiter: Max 3 messages per IP per 24 hours
const contactRateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 3, // 3 requests per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'rate_limited' }
});

async function startServer() {
  const app = express();

  // Security Headers Middleware
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
    }
    next();
  });

  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API Contact Route - Just for rate limiting verification per prompt
  app.post("/api/contact", contactRateLimiter, async (_req, res) => {
    return res.json({ ok: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.use('/NL', express.static(distPath));
    app.get('*all', (_req, res) => {
      // If the request is for a subpath like /NL/something, send the root index.html
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("FATAL ERROR STARTING EXPRESS SERVER:", err);
  process.exit(1);
});
