// src/services/videoExtractor.ts

export const WORKER_ENDPOINT = "https://broad-block-7bd7.nordinegb2018.workers.dev/";

export interface ExtractedVideoStream {
  sourcePage: string;
  type: "hls" | "mp4" | "dash" | string;
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
    for (const pageResult of rawResults) {
      if (pageResult && Array.isArray(pageResult.videos)) {
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
    }

    return extractedVideos;
  } catch (error) {
    console.error("خطأ في استخراج الفيديو عبر الـ Worker:", error);
    throw error;
  }
}
