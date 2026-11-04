// src/services/videoExtractor.ts

export const WORKER_ENDPOINT = "https://broad-block-7bd7.nordinegb2018.workers.dev/";

export interface ExtractedVideoStream {
  sourcePage: string;
  type: "hls" | "mp4" | "dash" | "clean-embed" | string;
  directUrl: string;
  proxiedUrl: string;
}

interface WorkerPageResult {
  source?: string;
  count?: number;
  iframes_scanned?: string[];
  videos?: Array<{
    type?: string;
    directUrl?: string;
    proxiedUrl?: string;
  }>;
}

interface WorkerResponsePayload {
  total_pages?: number;
  results?: WorkerPageResult | WorkerPageResult[];
}

/**
 * Extracts clean ad-free inner player URL (https://2vcdn.skin/e/{id}) from 2embed swish iframe URLs
 * when the Worker scans 2embed pages. Unlike 2embed's outer page, 2vcdn.skin has zero sandbox checks
 * and zero tagivi.com popup scripts, so it works 100% inside a sandboxed iframe without ads.
 */
function extractCleanEmbedFromScannedIframes(iframes?: string[]): string | null {
  if (!Array.isArray(iframes)) return null;
  for (const iframeUrl of iframes) {
    if (typeof iframeUrl !== "string") continue;
    const swishMatch = iframeUrl.match(/\/swish\?(?:[^#]*&)?id=([a-zA-Z0-9_-]+)/i);
    if (swishMatch && swishMatch[1]) {
      return `https://2vcdn.skin/e/${encodeURIComponent(swishMatch[1])}`;
    }
  }
  return null;
}

/**
 * دالة استخراج روابط الفيديو (.m3u8 / .mp4) عبر Cloudflare Worker
 * @param targetUrls - رابط الصفحة أو مصفوفة الروابط التي يتم إنشاؤها برمجياً
 * @returns مصفوفة الفيديوهات المستخرجة الجاهزة للتشغيل
 */
export async function fetchExtractedVideos(
  targetUrls: string | string[],
): Promise<ExtractedVideoStream[]> {
  const urlsArray = (Array.isArray(targetUrls) ? targetUrls : [targetUrls]).filter(
    (u) => typeof u === "string" && u.trim().length > 0,
  );

  if (urlsArray.length === 0) {
    throw new Error("قائمة الروابط الممررة فارغة.");
  }

  try {
    const response = await fetch(WORKER_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        urls: urlsArray,
      }),
    });

    if (!response.ok) {
      throw new Error(`فشل الاتصال بالـ Worker: HTTP ${response.status}`);
    }

    const data = (await response.json()) as WorkerResponsePayload;

    // توحيد شكل المخرجات سواء كان الإدخال رابطاً واحداً أو عدة روابط
    const rawResults = Array.isArray(data.results) ? data.results : [data.results];

    // تجميع كافة الفيديوهات المستخرجة في مصفوفة مسطحة وجاهزة للتشغيل
    const extractedVideos: ExtractedVideoStream[] = [];
    const cleanEmbedCandidates: ExtractedVideoStream[] = [];

    for (const pageResult of rawResults) {
      if (!pageResult) continue;

      if (Array.isArray(pageResult.videos)) {
        for (const video of pageResult.videos) {
          if (video && (video.proxiedUrl || video.directUrl)) {
            extractedVideos.push({
              sourcePage: pageResult.source || "",
              type: video.type || "hls", // 'hls' (.m3u8) | 'mp4' | 'dash'
              directUrl: video.directUrl || "", // الرابط الأصلي الخام
              proxiedUrl: video.proxiedUrl || video.directUrl || "", // الرابط المعالج عبر البروكسي (الافتراضي للتشغيل)
            });
          }
        }
      }

      // If the Worker scanned a 2embed swish iframe (e.g. streamsrcs.2embed.cc/swish?id=...),
      // extract the clean inner player (2vcdn.skin/e/{id}) which works inside sandbox with 0 popups!
      const cleanEmbedUrl = extractCleanEmbedFromScannedIframes(
        pageResult.iframes_scanned,
      );
      if (cleanEmbedUrl) {
        cleanEmbedCandidates.push({
          sourcePage: pageResult.source || "",
          type: "clean-embed",
          directUrl: cleanEmbedUrl,
          proxiedUrl: cleanEmbedUrl,
        });
      }
    }

    return [...extractedVideos, ...cleanEmbedCandidates];
  } catch (error) {
    console.error("خطأ في استخراج الفيديو عبر الـ Worker:", error);
    throw error;
  }
}
