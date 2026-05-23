import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import DOMPurify from "isomorphic-dompurify";
import { GoogleGenAI, Type } from "@google/genai";

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
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

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
    if (!checkRateLimit(ipKey)) {
      return res.status(429).json({ error: "Rate limit exceeded. Try again in an hour." });
    }

    // 3. Turnstile Verification
    if (!turnstile_token && process.env.NODE_ENV === "production") {
        return res.status(400).json({ error: "Captcha token missing" });
    }
    
    if (turnstile_token) {
        try {
            const verifyResponse = await fetch(
                "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({
                        secret: process.env.TURNSTILE_SECRET_KEY || "",
                        response: turnstile_token,
                        remoteip: ipKey,
                    }),
                }
            );
            const verifyData = await verifyResponse.json() as any;
            if (!verifyData.success) {
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

  // Gemini AI Stream Organizer Route
  app.post("/api/gemini/organize", async (req, res) => {
    const { streams } = req.body;
    if (!Array.isArray(streams)) {
      return res.status(400).json({ error: "Invalid streams payload." });
    }

    if (streams.length === 0) {
      return res.json({ streams: [] });
    }

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured on the server. Please check your settings.");
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `You are an expert IPTV and Radio metadata organizer. Match and categorize these streams correctly based on your knowledge.
For each stream:
1. Classify 'category' strictly as one of:
   - 'music_channels' (for television/video broadcasts and live news/sports channels)
   - 'radio' (for AM/FM live radio stations)
   - 'music_audio' (for continuous internet audio music streams or theme radio playlists)
2. Identify a beautiful, clean country or genre 'group' label (e.g. 'Morocco', 'Egypt', 'France', 'News', 'Quran', 'Sports', 'Music', etc.). Prefer standard clean labels (Arabic or English is fine in standard form like 'القرآن الكريم', 'المغرب', 'الأخبار').
3. Standardize and beautify the stream 'name' (e.g. clear spelling, remove clutter, use uppercase/proper translation where nice).

Do NOT change the stream 'id' under any condition. Return the updated list mapping each original ID to its new category, group, and name.

Streams data to classify:
${JSON.stringify(streams.map(s => ({ id: s.id, name: s.name, category: s.category, group: s.group, url: s.url })))}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            required: ["streams"],
            properties: {
              streams: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  required: ["id", "category", "group", "name"],
                  properties: {
                    id: { type: Type.STRING },
                    category: { type: Type.STRING },
                    group: { type: Type.STRING },
                    name: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("Empty response from Gemini model.");
      }

      const parsed = JSON.parse(text.trim());
      if (parsed && Array.isArray(parsed.streams)) {
        const organized = streams.map(original => {
          const geminiUpdate = parsed.streams.find((g: any) => g.id === original.id);
          if (geminiUpdate) {
            return {
              ...original,
              name: geminiUpdate.name || original.name,
              category: (geminiUpdate.category === 'radio' || geminiUpdate.category === 'music_channels' || geminiUpdate.category === 'music_audio') ? geminiUpdate.category : original.category,
              group: geminiUpdate.group || original.group || 'Other'
            };
          }
          return original;
        });

        return res.json({ streams: organized });
      } else {
        throw new Error("Gemini returned invalid response format.");
      }
    } catch (err: any) {
      console.error("Gemini IPTV Organize Error:", err);
      return res.status(500).json({ error: err.message || "Failed to organize playlists via AI." });
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
    app.use('/NL', express.static(distPath));
    app.use('/nradio', express.static(distPath));
    app.get('*all', (_req, res) => {
      // If the request is for a subpath like /NL/something, send the root index.html
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
