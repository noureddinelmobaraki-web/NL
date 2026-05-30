import express from "express";
import path from "path";

const DOMPurify = {
  sanitize: (str: string): string => {
    if (!str) return "";
    // Strip common HTML tags to avoid markup insertion
    const stripped = str.replace(/<[^>]*>/g, '');
    // Escape characters
    return stripped
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;");
  }
};

// Rate limiter: Max 3 messages per IP per hour
// Simplified rate limiter replacing lru-cache
const rateLimitMap = new Map<string, { count: number; expires: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(ip);
  
  if (!limit || now > limit.expires) {
    rateLimitMap.set(ip, { count: 1, expires: now + 3600000 }); // 1 hour
    return true;
  }
  
  if (limit.count >= 3) return false;
  
  limit.count += 1;
  return true;
}

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

  // API Contact Route
  app.post("/api/contact", async (req, res) => {
    const { sender_name, message } = req.body;
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const ipKey = clientIp.split(',')[0].trim();

    // 1. Origin Validation
    const origin = req.headers.origin;
    const allowedOrigin = process.env.ALLOWED_ORIGIN;
    if (allowedOrigin && origin !== allowedOrigin && process.env.NODE_ENV === "production") {
        return res.status(403).json({ error: "Forbidden: Invalid Origin" });
    }

    // 2. Rate Limiting
    if (!checkRateLimit(ipKey)) {
      return res.status(429).json({ error: "Rate limit exceeded. Try again in an hour." });
    }

    // 3. Sanitization
    const cleanName = DOMPurify.sanitize(sender_name || "مجهول");
    const cleanMessage = DOMPurify.sanitize(message);

    if (!cleanMessage || cleanMessage.trim().length < 3) {
        return res.status(400).json({ error: "Message too short or invalid" });
    }

    // 4. Send via EmailJS REST API
    try {
      const emailJsUrl = "https://api.emailjs.com/api/v1.0/email/send";
      const payload = {
        service_id: process.env.EMAILJS_SERVICE_ID,
        template_id: process.env.EMAILJS_TEMPLATE_ID,
        user_id: process.env.EMAILJS_PUBLIC_KEY,
        accessToken: process.env.EMAILJS_PRIVATE_KEY,
        template_params: {
          sender_name: cleanName,
          message: cleanMessage,
          time: new Date().toLocaleString('ar-MA', { timeZone: 'Africa/Casablanca' }),
        },
      };

      const response = await fetch(emailJsUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.status === 200) {
        return res.json({ success: true });
      } else {
        const errText = await response.text();
        throw new Error(`EmailJS responded with status ${response.status}: ${errText}`);
      }
    } catch (error: any) {
      console.error("EmailJS error:", error.message);
      return res.status(500).json({ error: "Failed to send message" });
    }
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
