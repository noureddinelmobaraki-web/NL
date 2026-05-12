import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import DOMPurify from "isomorphic-dompurify";
import { LRUCache } from "lru-cache";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// Rate limiter: Max 3 messages per IP per hour
const rateLimiter = new LRUCache<string, number>({
  max: 1000,
  ttl: 1000 * 60 * 60, // 1 hour
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Contact Route
  app.post("/api/contact", async (req, res) => {
    const { sender_name, message, turnstile_token } = req.body;
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const ipKey = clientIp.split(',')[0].trim();

    // 1. Origin Validation
    const origin = req.headers.origin;
    const allowedOrigin = process.env.ALLOWED_ORIGIN;
    if (allowedOrigin && origin !== allowedOrigin && process.env.NODE_ENV === "production") {
        return res.status(403).json({ error: "Forbidden: Invalid Origin" });
    }

    // 2. Rate Limiting
    const currentCount = rateLimiter.get(ipKey) || 0;
    if (currentCount >= 3) {
      return res.status(429).json({ error: "Rate limit exceeded. Try again in an hour." });
    }

    // 3. Turnstile Verification
    if (!turnstile_token && process.env.NODE_ENV === "production") {
        return res.status(400).json({ error: "Captcha token missing" });
    }
    
    if (turnstile_token) {
        try {
            const verifyResponse = await axios.post(
                "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                new URLSearchParams({
                    secret: process.env.TURNSTILE_SECRET_KEY || "",
                    response: turnstile_token,
                    remoteip: ipKey,
                }).toString()
            );
            if (!verifyResponse.data.success) {
                return res.status(400).json({ error: "Captcha verification failed" });
            }
        } catch (err) {
            console.error("Turnstile error:", err);
            return res.status(500).json({ error: "Failed to verify captcha" });
        }
    }

    // 4. Sanitization
    const cleanName = DOMPurify.sanitize(sender_name || "مجهول");
    const cleanMessage = DOMPurify.sanitize(message);

    if (!cleanMessage || cleanMessage.trim().length < 3) {
        return res.status(400).json({ error: "Message too short or invalid" });
    }

    // 5. Send via EmailJS REST API
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

      const response = await axios.post(emailJsUrl, payload);

      if (response.status === 200) {
        rateLimiter.set(ipKey, currentCount + 1);
        return res.json({ success: true });
      } else {
        throw new Error(`EmailJS responded with status ${response.status}`);
      }
    } catch (error: any) {
      console.error("EmailJS error:", error.response?.data || error.message);
      return res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
