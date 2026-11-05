// src/services/videoExtractor.ts

export const WORKER_ENDPOINT = "https://broad-block-7bd7.nordinegb2018.workers.dev/";

export interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

export interface ExtractedSubtitleTrack {
  id?: string;
  url: string;
  proxiedUrl: string;
  lang: string;
  label: string;
  default?: boolean;
  cues?: SubtitleCue[];
  provider?: "wyzie" | "opensubtitles" | "worker" | "local" | "stream";
  release?: string;
  hearingImpaired?: boolean;
  remoteUrl?: string;
  osFileId?: number;
  loaded?: boolean;
}

export interface ExtractedVideoStream {
  sourcePage: string;
  type: "hls" | "mp4" | "dash" | "clean-embed" | string;
  directUrl: string;
  proxiedUrl: string;
  subtitles?: ExtractedSubtitleTrack[];
}

interface RawSubtitleItem {
  url?: string;
  file?: string;
  src?: string;
  referer?: string;
  lang?: string;
  srclang?: string;
  language?: string;
  label?: string;
  name?: string;
  default?: boolean;
}

interface WorkerPageResult {
  source?: string;
  count?: number;
  iframes_scanned?: string[];
  subtitles?: Array<RawSubtitleItem | string>;
  tracks?: Array<RawSubtitleItem | string>;
  captions?: Array<RawSubtitleItem | string>;
  videos?: Array<{
    type?: string;
    directUrl?: string;
    proxiedUrl?: string;
    subtitles?: Array<RawSubtitleItem | string>;
    tracks?: Array<RawSubtitleItem | string>;
  }>;
}

interface WorkerResponsePayload {
  total_pages?: number;
  results?: WorkerPageResult | WorkerPageResult[];
}

const SESSION_EXTRACTION_CACHE = new Map<
  string,
  { timestamp: number; streams: ExtractedVideoStream[] }
>();
const CACHE_TTL_MS = 1000 * 60 * 15; // 15 minutes
export const EXTRACTION_TIMEOUT_MS = 9_000;

export function buildWorkerProxyUrl(targetUrl: string, refererUrl?: string): string {
  if (!targetUrl) return "";
  if (targetUrl.startsWith(WORKER_ENDPOINT)) return targetUrl;
  try {
    const proxyEndpoint = new URL("/proxy", WORKER_ENDPOINT);
    proxyEndpoint.searchParams.set("videoUrl", targetUrl);
    if (refererUrl) {
      proxyEndpoint.searchParams.set("referer", refererUrl);
    }
    return proxyEndpoint.toString();
  } catch {
    return targetUrl;
  }
}

export function guessLangFromLabelOrUrl(label: string, url: string): { lang: string; label: string } {
  const combined = `${label} ${url}`.toLowerCase();
  if (combined.includes("arab") || combined.includes("عرب") || /([._/-])ar([._/-]|$)/i.test(combined)) {
    return { lang: "ar", label: label || "العربية" };
  }
  if (combined.includes("eng") || /([._/-])en([._/-]|$)/i.test(combined)) {
    return { lang: "en", label: label || "English" };
  }
  if (combined.includes("fre") || combined.includes("fra") || /([._/-])fr([._/-]|$)/i.test(combined)) {
    return { lang: "fr", label: label || "Français" };
  }
  if (combined.includes("spa") || combined.includes("esp") || /([._/-])es([._/-]|$)/i.test(combined)) {
    return { lang: "es", label: label || "Español" };
  }
  return {
    lang: "en",
    label: label || "Subtitles",
  };
}

function expandRawSubtitleEntries(rawList: Array<RawSubtitleItem | string>): Array<RawSubtitleItem | string> {
  const expanded: Array<RawSubtitleItem | string> = [];
  for (const item of rawList) {
    if (typeof item === "string" && item.includes("[")) {
      const re = /\[([^\]]{1,40})\](https?:\/\/[^\s"',\]]+\.(?:vtt|srt)(?:\?[^\s"',\]]*)?)/gi;
      let matched = false;
      let m: RegExpExecArray | null;
      while ((m = re.exec(item)) !== null) {
        matched = true;
        expanded.push({ label: m[1].trim(), url: m[2].trim() });
      }
      if (!matched) expanded.push(item);
    } else {
      expanded.push(item);
    }
  }
  return expanded;
}

function extractSubtitlesFromResult(
  pageResult: WorkerPageResult,
  videoItem?: { subtitles?: Array<RawSubtitleItem | string>; tracks?: Array<RawSubtitleItem | string> },
): ExtractedSubtitleTrack[] {
  const rawList: Array<RawSubtitleItem | string> = expandRawSubtitleEntries([
    ...(Array.isArray(videoItem?.subtitles) ? videoItem.subtitles : []),
    ...(Array.isArray(videoItem?.tracks) ? videoItem.tracks : []),
    ...(Array.isArray(pageResult.subtitles) ? pageResult.subtitles : []),
    ...(Array.isArray(pageResult.tracks) ? pageResult.tracks : []),
    ...(Array.isArray(pageResult.captions) ? pageResult.captions : []),
  ]);

  if (Array.isArray(pageResult.videos)) {
    for (const v of pageResult.videos) {
      const candidate = v?.directUrl || v?.proxiedUrl || "";
      if (/\.(vtt|srt)(\?|#|$)/i.test(candidate)) {
        rawList.push({
          url: v.directUrl || candidate,
          label: "Subtitles",
        });
      }
    }
  }

  const seenUrls = new Set<string>();
  const tracks: ExtractedSubtitleTrack[] = [];

  for (const item of rawList) {
    if (!item) continue;
    const rawUrl =
      typeof item === "string"
        ? item
        : item.url || item.file || item.src || "";
    if (!rawUrl || typeof rawUrl !== "string") continue;
    const trimmed = rawUrl.trim();
    if (!trimmed || seenUrls.has(trimmed)) continue;
    seenUrls.add(trimmed);

    const rawLabel =
      typeof item === "object"
        ? item.label || item.name || item.language || item.lang || item.srclang || ""
        : "";
    const guessed = guessLangFromLabelOrUrl(rawLabel, trimmed);
    const langCode =
      typeof item === "object" && (item.srclang || item.lang)
        ? String(item.srclang || item.lang)
        : guessed.lang;
    const referer =
      typeof item === "object" && item.referer ? item.referer : pageResult.source;

    tracks.push({
      url: trimmed,
      proxiedUrl: buildWorkerProxyUrl(trimmed, referer),
      lang: langCode,
      label: guessed.label,
      default:
        (typeof item === "object" && Boolean(item.default)) ||
        langCode === "ar" ||
        tracks.length === 0,
    });
  }

  tracks.sort((a, b) => (a.lang === "ar" ? -1 : b.lang === "ar" ? 1 : 0));
  return tracks;
}

/**
 * دالة استخراج روابط الفيديو (.m3u8 / .mp4) والترجمات عبر Cloudflare Worker
 */
export async function fetchExtractedVideos(
  targetUrls: string | string[],
  signal?: AbortSignal,
): Promise<ExtractedVideoStream[]> {
  const urlsArray = (Array.isArray(targetUrls) ? targetUrls : [targetUrls]).filter(
    (u) => typeof u === "string" && u.trim().length > 0,
  );

  if (urlsArray.length === 0) {
    throw new Error("قائمة الروابط الممررة فارغة.");
  }

  const cacheKey = urlsArray.join("|");
  const cached = SESSION_EXTRACTION_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS && cached.streams.length > 0) {
    return cached.streams;
  }

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), EXTRACTION_TIMEOUT_MS);
  const onExternalAbort = () => timeoutController.abort();
  signal?.addEventListener("abort", onExternalAbort, { once: true });

  try {
    const response = await fetch(WORKER_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        urls: urlsArray,
      }),
      signal: timeoutController.signal,
    });

    if (!response.ok) {
      throw new Error(`فشل الاتصال بالـ Worker: HTTP ${response.status}`);
    }

    const data = (await response.json()) as WorkerResponsePayload;
    const rawResults = Array.isArray(data.results) ? data.results : [data.results];
    const extractedVideos: ExtractedVideoStream[] = [];

    for (const pageResult of rawResults) {
      if (!pageResult) continue;

      if (Array.isArray(pageResult.videos)) {
        for (const video of pageResult.videos) {
          if (!video || (!video.proxiedUrl && !video.directUrl)) continue;
          const candidateUrl = video.directUrl || video.proxiedUrl || "";
          if (/\.(vtt|srt)(\?|#|$)/i.test(candidateUrl)) continue;

          const directUrl = video.directUrl || video.proxiedUrl || "";
          const proxiedUrl =
            video.proxiedUrl ||
            buildWorkerProxyUrl(directUrl, pageResult.source) ||
            directUrl;

          extractedVideos.push({
            sourcePage: pageResult.source || "",
            type: video.type || (directUrl.toLowerCase().includes(".m3u8") ? "hls" : "mp4"),
            directUrl,
            proxiedUrl,
            subtitles: extractSubtitlesFromResult(pageResult, video),
          });
        }
      }
    }

    if (extractedVideos.length > 0) {
      SESSION_EXTRACTION_CACHE.set(cacheKey, {
        timestamp: Date.now(),
        streams: extractedVideos,
      });
    }

    return extractedVideos;
  } catch (error) {
    console.error("خطأ في استخراج الفيديو عبر الـ Worker:", error);
    throw error;
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", onExternalAbort);
  }
}
