// NL Worker — broad-block-7bd7 (ملف واحد يُلصق في لوحة Cloudflare)
// Routes: / (Multi-Server Parallel Stream + Subtitle Harvester) · /embed · /proxy · /subs/search · /subs/file · /trailer/imdb · /meta/omdb · /tmdb/3/* · /health
// Secrets (اختيارية حسب المسار): WYZIE_KEY, OMDB_KEY, TMDB_KEY  | KV binding (اختياري ومستحسن): NL_CACHE
// Variable اختياري: ALLOWED_ORIGINS = "https://a.com,https://b.com"

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const DEFAULT_ALLOWED_ORIGINS = [
  "https://noureddinelmobaraki-web.github.io",
  "http://localhost:3000",
  "http://localhost:5173",
];
const MAX_PAGES = 6;
const EXTRACT_TIMEOUT_TOP_MS = 4200;
const EXTRACT_TIMEOUT_NESTED_MS = 3200;
const MAX_SUBTITLES = 24;
const SUB_URL_RE = /https?:\/\/[^\s"'<>\\]+\.(?:vtt|srt)(?:\?[^\s"'<>\\]*)?/gi;
const TRACK_TAG_RE = /<track\b[^>]*>/gi;
const JSON_TRACK_RE = /\{[^{}]{0,400}?["']?(?:file|src|url)["']?\s*:\s*["']([^"']+\.(?:vtt|srt)(?:\?[^"']*)?)["'][^{}]{0,400}?\}/gi;
const PLAYERJS_SUB_RE = /\[([^\]]{1,40})\](https?:\/\/[^\s"',\]]+\.(?:vtt|srt)(?:\?[^\s"',\]]*)?)/gi;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Expose-Headers": "*",
};

export default {
  async fetch(request, env, ctx) {
    const reqUrl = new URL(request.url);
    const workerOrigin = reqUrl.origin;
    const path = reqUrl.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { ...CORS, "Access-Control-Max-Age": "86400" } });
    }
    if (path === "/health") {
      return jsonResponse({
        ok: true,
        kvCache: Boolean(env.NL_CACHE),
        secrets: { wyzie: Boolean(env.WYZIE_KEY), omdb: Boolean(env.OMDB_KEY), tmdb: Boolean(env.TMDB_KEY) },
        time: new Date().toISOString(),
      });
    }
    if (!isAllowedCaller(request, env)) return jsonResponse({ error: "origin_not_allowed" }, 403);

    try {
      if (path === "/proxy") return await handleProxy(request, reqUrl, workerOrigin);
      if (path === "/subs/search") return await withCache(request, env, ctx, 3600, () => wyzieSearch(reqUrl, env, workerOrigin));
      if (path === "/subs/file") return await withCache(request, env, ctx, 86400, () => wyzieFile(reqUrl, env));
      if (path === "/trailer/imdb") return await withCache(request, env, ctx, 604800, () => imdbTrailer(reqUrl));
      if (path === "/meta/omdb") return await withCache(request, env, ctx, 86400, () => omdbMeta(reqUrl, env));
      if (path.startsWith("/tmdb/3/")) return await withCache(request, env, ctx, tmdbTtl(path), () => tmdbProxy(reqUrl, env));
      if (path === "/embed") return await handleEmbed(request, reqUrl, workerOrigin, env);
      return await handleExtract(request, reqUrl, workerOrigin);
    } catch (err) {
      return jsonResponse({ error: "worker_failed", detail: String((err && err.message) || err) }, 502);
    }
  },
};

/* ---------------- أمان ---------------- */

function isAllowedOriginUrl(originStr, workerOrigin, list) {
  if (!originStr) return true;
  if (originStr === workerOrigin || list.includes(originStr)) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(originStr)) return true;
  if (/^https:\/\/([a-z0-9-]+\.)*(cloudflare\.com|workers\.dev)$/i.test(originStr)) return true;
  return false;
}

function isAllowedCaller(request, env) {
  const list = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(",").map((s) => s.trim()) : DEFAULT_ALLOWED_ORIGINS;
  const workerOrigin = new URL(request.url).origin;
  const origin = request.headers.get("Origin");
  if (origin) return isAllowedOriginUrl(origin, workerOrigin, list);
  const ref = request.headers.get("Referer");
  if (ref) {
    try {
      const refOrigin = new URL(ref).origin;
      return isAllowedOriginUrl(refOrigin, workerOrigin, list);
    } catch {
      return false;
    }
  }
  return true;
}

function safeTarget(raw) {
  let u;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const h = u.hostname.toLowerCase();
  if (h === "localhost" || h === "[::1]" || h.endsWith(".local") || h.endsWith(".internal") ||
      /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h)) return null;
  return u;
}

/* ---------------- كاش (KV إن وُجد، وإلا Cache API) ---------------- */

async function withCache(request, env, ctx, ttl, producer) {
  if (request.method !== "GET") return producer();
  const keyUrl = new URL(request.url);
  keyUrl.searchParams.sort();
  const k = keyUrl.pathname + "?" + keyUrl.searchParams.toString();

  if (env.NL_CACHE) {
    const { value, metadata } = await env.NL_CACHE.getWithMetadata(k, "arrayBuffer");
    if (value) {
      return new Response(value, {
        headers: { "Content-Type": (metadata && metadata.c) || "application/json; charset=utf-8",
                   "Cache-Control": `public, max-age=${ttl}`, "X-NL-Cache": "HIT", ...CORS },
      });
    }
  } else {
    const hit = await caches.default.match(new Request(keyUrl.toString()));
    if (hit) return hit;
  }

  const res = await producer();
  if (res.status === 200) {
    if (env.NL_CACHE) {
      const buf = await res.clone().arrayBuffer();
      const c = res.headers.get("Content-Type") || "text/plain; charset=utf-8";
      ctx.waitUntil(env.NL_CACHE.put(k, buf, { expirationTtl: Math.max(60, ttl), metadata: { c } }));
    } else {
      ctx.waitUntil(caches.default.put(new Request(keyUrl.toString()), res.clone()));
    }
  }
  return res;
}

/* ---------------- /proxy ---------------- */

async function handleProxy(request, reqUrl, workerOrigin) {
  const videoUrl = reqUrl.searchParams.get("videoUrl");
  const referer = reqUrl.searchParams.get("referer") || "";
  if (!videoUrl) return jsonResponse({ error: "المعامل videoUrl مفقود" }, 400);
  const target = safeTarget(videoUrl);
  if (!target) return jsonResponse({ error: "رابط غير مسموح" }, 400);

  const h = new Headers({ "User-Agent": UA, Accept: "*/*" });
  if (referer) {
    h.set("Referer", referer);
    try { h.set("Origin", new URL(referer).origin); } catch (e) {}
  }
  if (request.headers.has("Range")) h.set("Range", request.headers.get("Range"));

  const method = request.method === "HEAD" ? "HEAD" : "GET";
  const upstream = await fetch(target.href, { method, headers: h, redirect: "follow" });
  const ct = (upstream.headers.get("Content-Type") || "").toLowerCase();
  const isSubtitleFile = /\.(vtt|srt)(\?|$)/i.test(target.pathname) || ct.includes("text/vtt") || ct.includes("subrip");
  const looksPlaylist = !isSubtitleFile && (videoUrl.includes(".m3u8") || ct.includes("mpegurl") || ct.includes("m3u8"));
  const maybeText = !isSubtitleFile && (ct.startsWith("text/") || /\.txt(\?|$)/i.test(target.pathname));

  if (method === "GET" && upstream.ok && (looksPlaylist || maybeText)) {
    const text = await upstream.text();
    if (looksPlaylist || text.trimStart().startsWith("#EXTM3U")) {
      const base = new URL(upstream.url || target.href);
      return new Response(rewritePlaylist(text, base, workerOrigin, referer || target.origin + "/"), {
        status: 200,
        headers: { ...CORS, "Content-Type": "application/vnd.apple.mpegurl", "Cache-Control": "no-cache" },
      });
    }
    return new Response(text, { status: upstream.status, headers: cleanHeaders(upstream.headers, true) });
  }

  return new Response(method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    headers: cleanHeaders(upstream.headers, false),
  });
}

function rewritePlaylist(text, base, workerOrigin, referer) {
  const wrap = (abs) => `${workerOrigin}/proxy?videoUrl=${encodeURIComponent(abs)}&referer=${encodeURIComponent(referer)}`;
  return text.split("\n").map((line) => {
    const t = line.trim();
    if (!t) return line;
    if (t.startsWith("#")) {
      return t.replace(/URI="([^"]+)"/g, (m, uri) => {
        try { return `URI="${wrap(new URL(uri, base).href)}"`; } catch { return m; }
      });
    }
    try { return wrap(new URL(t, base).href); } catch { return line; }
  }).join("\n");
}

function cleanHeaders(src, dropLength) {
  const h = new Headers(src);
  ["set-cookie", "content-security-policy", "content-security-policy-report-only", "x-frame-options",
   "strict-transport-security", "report-to", "nel"].forEach((k) => h.delete(k));
  for (const k of [...h.keys()]) if (k.startsWith("access-control-")) h.delete(k);
  if (dropLength) { h.delete("content-length"); h.delete("content-encoding"); }
  Object.entries(CORS).forEach(([k, v]) => h.set(k, v));
  return h;
}

/* ---------------- /embed (Optional HTMLRewriter Bridge) ---------------- */

const EMBED_HOST_ALLOW = /^(.*\.)?(vidlink\.pro|streamimdb\.ru|imdb\.su|2embed\.cc|2embed\.skin|2vcdn\.skin|multiembed\.mov|streamingnow\.mov|vidsrc\.[a-z]+|vidplay\.[a-z]+|filemoon\.[a-z]+|streamtape\.[a-z]+|dood\.[a-z]+|mixdrop\.[a-z]+|rabbitstream\.net|megacloud\.tv|dokicloud\.one|embed\.su)$/i;
const EMBED_AD_HOST_RE = /google|facebook|doubleclick|googlesyndication|recaptcha|popads|onclickads|acscdn|adsco|histats|exoclick|juicyads|propellerads|adsterra|clickadu|hilltopads/i;

const NL_BRIDGE_JS = `(function(){try{if(window.__nlBridge)return;window.__nlBridge=1;var WORKER=__WORKER_ORIGIN__,PARENT=__PARENT_ORIGIN__,DEPTH=__DEPTH__;var FID=Math.random().toString(36).slice(2,10);var seq=0,cur=null,lastSent=0,readySent=false,autoPlayed=false;function wrap(u){try{if(!u||typeof u!=="string")return u;var a=new URL(u,document.baseURI);if(!/^https?:$/.test(a.protocol))return u;if(a.origin===WORKER)return u;if(/google|facebook|doubleclick|googlesyndication|recaptcha/i.test(a.hostname))return u;if(DEPTH>=3)return u;return WORKER+"/embed?url="+encodeURIComponent(a.href)+"&parent="+encodeURIComponent(PARENT)+"&depth="+(DEPTH+1)+"&ref="+encodeURIComponent(document.baseURI)}catch(e){return u}}try{var desc=Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype,"src");if(desc&&desc.set){Object.defineProperty(HTMLIFrameElement.prototype,"src",{configurable:true,enumerable:desc.enumerable,get:desc.get,set:function(v){try{return desc.set.call(this,wrap(v))}catch(e){}}})}}catch(e){}var origSetAttr=null;try{origSetAttr=Element.prototype.setAttribute;Element.prototype.setAttribute=function(name,value){try{if(this&&this.tagName==="IFRAME"&&String(name).toLowerCase()==="src")value=wrap(value)}catch(e){}return origSetAttr.call(this,name,value)}}catch(e){}function post(m){try{if(window.top&&window.top!==window)window.top.postMessage(m,"*");if(window.parent&&window.parent!==window&&window.parent!==window.top)window.parent.postMessage(m,"*")}catch(e){}}function send(ev){try{if(!cur)return;var now=Date.now();if(ev==="timeupdate"&&now-lastSent<250)return;lastSent=now;var d=cur.duration;post({__nl:1,type:"NL_STATE",ev:ev,t:cur.currentTime||0,d:isFinite(d)&&d>0?d:0,paused:!!cur.paused,rate:cur.playbackRate||1,seq:++seq,fid:FID})}catch(e){}}function tryPlay(v){try{if(!v)return;var p=v.play();if(p&&p.catch)p.catch(function(){try{v.muted=true;var p2=v.play();if(p2&&p2.catch)p2.catch(function(){})}catch(x){}})}catch(e){}}function clickPlayOverlay(){try{var sels=[".vjs-big-play-button",".jw-icon-display",".jw-display-icon-container",".plyr__control--overlaid","#play",".play-button",".btn-play","[aria-label*='Play' i]"];for(var i=0;i<sels.length;i++){var el=document.querySelector(sels[i]);if(el&&typeof el.click==="function"){el.click();break}}}catch(e){}}function bind(v){try{if(!v||v===cur)return;cur=v;v.autoplay=true;v.playsInline=true;var evs=["loadedmetadata","durationchange","play","playing","pause","waiting","seeked","seeking","timeupdate","ratechange","ended"];for(var i=0;i<evs.length;i++)(function(e){try{v.addEventListener(e,function(){send(e)},true)}catch(x){}})(evs[i]);if(!readySent){readySent=true;post({__nl:1,type:"NL_READY",fid:FID})}send("loadedmetadata");if(!autoPlayed&&v.paused){autoPlayed=true;tryPlay(v)}}catch(e){}}function wrapFrameEl(f){try{if(!f||f.tagName!=="IFRAME")return;var raw=f.getAttribute("src");if(raw){var w=wrap(raw);if(w!==raw){if(origSetAttr)origSetAttr.call(f,"src",w);else f.setAttribute("src",w)}}}catch(e){}}function scan(){try{var vs=document.getElementsByTagName("video");var best=null;for(var i=0;i<vs.length;i++){var v=vs[i];if(v.readyState>0||v.src||v.currentSrc){best=v;break}if(!best)best=v}if(best)bind(best);var fs=document.getElementsByTagName("iframe");for(var j=0;j<fs.length;j++)wrapFrameEl(fs[j])}catch(e){}}try{var origPlay=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){try{if(this&&this.tagName==="VIDEO")bind(this)}catch(e){}return origPlay.apply(this,arguments)}}catch(e){}try{var mo=new MutationObserver(function(muts){try{for(var i=0;i<muts.length;i++){var added=muts[i].addedNodes;if(!added)continue;for(var k=0;k<added.length;k++){var n=added[k];if(!n||n.nodeType!==1)continue;if(n.tagName==="IFRAME")wrapFrameEl(n);else if(n.getElementsByTagName){var ifs=n.getElementsByTagName("iframe");for(var m=0;m<ifs.length;m++)wrapFrameEl(ifs[m])}}}scan()}catch(e){}});mo.observe(document.documentElement,{childList:true,subtree:true})}catch(e){}setInterval(scan,1500);scan();window.addEventListener("message",function(e){try{var d=e.data;if(typeof d==="string"){try{d=JSON.parse(d)}catch(x){return}}if(!d||d.__nl!==1)return;if(e.source!==window.parent&&e.source!==window.top&&d.type!=="NL_CMD"){post(d);return}if(d.type!=="NL_CMD")return;if(cur){try{if(d.cmd==="seek"&&typeof d.t==="number"){cur.currentTime=Math.max(0,d.t);var dur=cur.duration;post({__nl:1,type:"NL_ACK",id:d.id,t:cur.currentTime,d:isFinite(dur)&&dur>0?dur:0,paused:!!cur.paused,fid:FID})}else if(d.cmd==="play"){tryPlay(cur)}else if(d.cmd==="pause"){cur.pause()}}catch(x){}}else if(d.cmd==="play"){clickPlayOverlay()}var fs=window.frames;for(var i=0;i<fs.length;i++){try{fs[i].postMessage(d,"*")}catch(x){}}}catch(e){}})}catch(e){}})();`;

function cleanEmbedHeaders(src, parentOrigin, workerOrigin) {
  const h = cleanHeaders(src, true);
  h.set("Content-Security-Policy", `frame-ancestors 'self' ${parentOrigin} ${workerOrigin};`);
  return h;
}

async function handleEmbed(request, reqUrl, workerOrigin, env) {
  const rawUrl = reqUrl.searchParams.get("url") || "";
  const parentOrigin = reqUrl.searchParams.get("parent") || "";
  const refParam = reqUrl.searchParams.get("ref") || "";
  const depth = parseInt(reqUrl.searchParams.get("depth") || "0", 10);
  if (!Number.isFinite(depth) || depth < 0 || depth > 3) {
    return jsonResponse({ error: "bad_depth" }, 400);
  }
  const allowedList = env.ALLOWED_ORIGINS
    ? env.ALLOWED_ORIGINS.split(",").map((s) => s.trim())
    : DEFAULT_ALLOWED_ORIGINS;
  if (!parentOrigin || !isAllowedOriginUrl(parentOrigin, workerOrigin, allowedList)) {
    return jsonResponse({ error: "bad_parent" }, 403);
  }
  const target = safeTarget(rawUrl);
  if (!target) {
    return jsonResponse({ error: "host_not_allowed" }, 403);
  }
  if (depth === 0) {
    if (!EMBED_HOST_ALLOW.test(target.hostname)) {
      return jsonResponse({ error: "host_not_allowed" }, 403);
    }
  } else {
    if (target.protocol !== "https:") {
      return jsonResponse({ error: "host_not_allowed" }, 403);
    }
    const reqRef = request.headers.get("Referer") || "";
    let refOrigin = "";
    try { refOrigin = new URL(reqRef).origin; } catch {}
    if (refOrigin !== workerOrigin) {
      return jsonResponse({ error: "host_not_allowed" }, 403);
    }
  }

  let upstreamReferer = target.origin + "/";
  if (depth >= 1 && refParam) {
    const validRef = safeTarget(refParam);
    if (validRef) upstreamReferer = validRef.href;
  }

  let upstream;
  try {
    upstream = await fetch(target.href, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Referer: upstreamReferer,
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    return Response.redirect(target.href, 302);
  }

  if (!upstream.ok || upstream.status === 403 || upstream.status === 503) {
    return Response.redirect(target.href, 302);
  }

  const ct = (upstream.headers.get("Content-Type") || "").toLowerCase();
  if (!ct.includes("text/html")) {
    return Response.redirect(target.href, 302);
  }

  const finalBaseHref = new URL(upstream.url || target.href).href;
  const bridgeScript = NL_BRIDGE_JS
    .replace(/__WORKER_ORIGIN__/g, JSON.stringify(workerOrigin))
    .replace(/__PARENT_ORIGIN__/g, JSON.stringify(parentOrigin))
    .replace(/__DEPTH__/g, String(depth));

  const rewriter = new HTMLRewriter()
    .on("head", {
      element(el) {
        el.prepend(
          `<base href="${finalBaseHref.replace(/"/g, "&quot;")}"><script>${bridgeScript}</script>`,
          { html: true },
        );
      },
    })
    .on("iframe[src]", {
      element(el) {
        if (depth >= 3) return;
        const srcAttr = el.getAttribute("src");
        if (!srcAttr) return;
        try {
          const abs = new URL(srcAttr, finalBaseHref);
          if (
            abs.protocol === "https:" &&
            abs.origin !== workerOrigin &&
            safeTarget(abs.href) &&
            !EMBED_AD_HOST_RE.test(abs.hostname)
          ) {
            const wrapped = `${workerOrigin}/embed?url=${encodeURIComponent(abs.href)}&parent=${encodeURIComponent(parentOrigin)}&depth=${depth + 1}&ref=${encodeURIComponent(finalBaseHref)}`;
            el.setAttribute("src", wrapped);
          }
        } catch {}
      },
    });

  return rewriter.transform(
    new Response(upstream.body, {
      status: upstream.status,
      headers: cleanEmbedHeaders(upstream.headers, parentOrigin, workerOrigin),
    }),
  );
}

/* ---------------- / (Multi-Server Parallel Harvester: Video + Cross-Server Subtitles) ---------------- */

function unpackDeanEdwards(html) {
  const unpackedChunks = [];
  const packerRe = /eval\(function\(p,a,c,k,e,[dr]\)\{[\s\S]*?\}\(\s*'((?:\\.|[^'])*)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'((?:\\.|[^'])*)'\.split\('\|'\)/g;
  let m;
  while ((m = packerRe.exec(html)) !== null) {
    try {
      let p = m[1].replace(/\\'/g, "'").replace(/\\\\/g, "\\");
      const a = parseInt(m[2], 10);
      let c = parseInt(m[3], 10);
      const k = m[4].split("|");
      if (!a || !c || k.length === 0) continue;
      const encodeBase = (num) => {
        const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        if (num < a) return num < 36 ? num.toString(36) : chars[num];
        return encodeBase(Math.floor(num / a)) + (num % a < 36 ? (num % a).toString(36) : chars[num % a]);
      };
      while (c--) {
        if (k[c]) {
          const token = encodeBase(c);
          p = p.replace(new RegExp("\\b" + token + "\\b", "g"), k[c]);
        }
      }
      unpackedChunks.push(p);
    } catch {}
  }
  return unpackedChunks.join("\n");
}

function tagAttr(tag, name) {
  const m = tag.match(new RegExp(name + "\\s*=\\s*[\"']([^\"']*)[\"']", "i"));
  return m ? m[1] : "";
}

function labelFromBlock(block) {
  const m = block.match(/["']?(?:label|name|language|lang)["']?\s*:\s*["']([^"']{1,40})["']/i);
  return m ? m[1] : "";
}

function collectSubtitles(html, decodedHtml, baseUrl, out) {
  let m;
  TRACK_TAG_RE.lastIndex = 0;
  while ((m = TRACK_TAG_RE.exec(html)) !== null) {
    const tag = m[0];
    const kind = tagAttr(tag, "kind").toLowerCase();
    if (kind && kind !== "subtitles" && kind !== "captions") continue;
    const src = tagAttr(tag, "src");
    if (!src) continue;
    try {
      const abs = new URL(src, baseUrl).href;
      if (!out.has(abs)) {
        out.set(abs, {
          url: abs,
          lang: tagAttr(tag, "srclang"),
          label: tagAttr(tag, "label"),
          default: /\bdefault\b/i.test(tag),
          referer: baseUrl,
        });
      }
    } catch (e) {}
  }

  PLAYERJS_SUB_RE.lastIndex = 0;
  while ((m = PLAYERJS_SUB_RE.exec(decodedHtml)) !== null) {
    try {
      const abs = new URL(m[2].replace(/\\\//g, "/"), baseUrl).href;
      if (!out.has(abs)) {
        out.set(abs, { url: abs, lang: "", label: m[1].trim(), referer: baseUrl });
      }
    } catch (e) {}
  }

  JSON_TRACK_RE.lastIndex = 0;
  while ((m = JSON_TRACK_RE.exec(decodedHtml)) !== null) {
    try {
      const abs = new URL(m[1].replace(/\\\//g, "/"), baseUrl).href;
      if (!out.has(abs)) {
        out.set(abs, { url: abs, lang: "", label: labelFromBlock(m[0]), referer: baseUrl });
      }
    } catch (e) {}
  }

  for (const raw of decodedHtml.match(SUB_URL_RE) || []) {
    const u = raw.replace(/\\\//g, "/");
    if (!out.has(u)) out.set(u, { url: u, lang: "", label: "", referer: baseUrl });
  }
}

function expandMultiServerCandidates(urls) {
  const expanded = [];
  const seen = new Set();
  for (const raw of urls) {
    if (typeof raw !== "string" || !safeTarget(raw)) continue;
    if (!seen.has(raw)) {
      seen.add(raw);
      expanded.push(raw);
    }
    // Automatically add SuperEmbed VIP directstream.php endpoint when multiembed.mov is in the list
    try {
      const u = new URL(raw);
      if (u.hostname.includes("multiembed.mov") && u.pathname === "/") {
        const vipUrl = `https://multiembed.mov/directstream.php${u.search}`;
        if (!seen.has(vipUrl)) {
          seen.add(vipUrl);
          expanded.push(vipUrl);
        }
      }
    } catch {}
  }
  return expanded.slice(0, MAX_PAGES);
}

async function handleExtract(request, reqUrl, workerOrigin) {
  let targetUrls = [];
  if (request.method === "POST") {
    try {
      const body = await request.json();
      if (Array.isArray(body.urls)) targetUrls = body.urls;
      else if (body.url) targetUrls = [body.url];
    } catch (e) {
      return jsonResponse({ error: "صيغة JSON غير صالحة في طلب POST" }, 400);
    }
  } else {
    const single = reqUrl.searchParams.get("url");
    const multi = reqUrl.searchParams.get("urls");
    if (single) targetUrls.push(single);
    if (multi) targetUrls.push(...multi.split(",").map((u) => u.trim()).filter(Boolean));
  }
  targetUrls = expandMultiServerCandidates(targetUrls);

  if (targetUrls.length === 0) {
    return jsonResponse({
      usage: {
        single_url: `${workerOrigin}/?url=https://example.com/page`,
        multiple_urls_get: `${workerOrigin}/?urls=https://site1.com,https://site2.com`,
        multiple_urls_post: `POST ${workerOrigin}/ with JSON body: { "urls": ["https://site1.com"] }`,
        direct_proxy: `${workerOrigin}/proxy?videoUrl=https://cdn.site.com/video.m3u8&referer=https://site.com`,
      },
    }, 400);
  }

  const allResults = await Promise.all(targetUrls.map((u) => extractFromPage(u, workerOrigin)));

  // Cross-Server Subtitle Fusion: pool subtitles discovered from ANY server and attach them to all extracted streams
  const globalSubsMap = new Map();
  for (const res of allResults) {
    for (const s of res.subtitles || []) {
      if (s && s.url && !globalSubsMap.has(s.url)) {
        globalSubsMap.set(s.url, s);
      }
    }
  }
  const pooledSubs = Array.from(globalSubsMap.values()).slice(0, MAX_SUBTITLES);
  for (const res of allResults) {
    if (Array.isArray(res.videos) && res.videos.length > 0 && pooledSubs.length > 0) {
      const localUrls = new Set((res.subtitles || []).map((s) => s.url));
      res.subtitles = [
        ...(res.subtitles || []),
        ...pooledSubs.filter((s) => !localUrls.has(s.url)),
      ];
    }
  }

  return jsonResponse({ total_pages: allResults.length, results: allResults.length === 1 ? allResults[0] : allResults });
}

async function extractFromPage(targetUrl, workerOrigin, depth = 0) {
  const extractedLinks = new Set();
  const linkReferer = new Map();
  const discoveredIframes = new Set();
  const subtitles = new Map();
  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Referer: new URL(targetUrl).origin + "/",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(depth === 0 ? EXTRACT_TIMEOUT_TOP_MS : EXTRACT_TIMEOUT_NESTED_MS),
    });
    if (!response.ok) return { source: targetUrl, error: `HTTP ${response.status}`, videos: [], subtitles: [] };
    const finalPageUrl = response.url || targetUrl;
    const html = await response.text();

    let decodedHtml = html;
    try { decodedHtml += "\n" + decodeURIComponent(html); } catch (e) {}
    const unpacked = unpackDeanEdwards(html);
    if (unpacked) decodedHtml += "\n" + unpacked;
    for (const b64 of html.match(/aHR0c[A-Za-z0-9+/=]{15,}/g) || []) {
      try { decodedHtml += "\n" + atob(b64); } catch (e) {}
    }
    for (const raw of decodedHtml.match(/https?:\/\/[^\s"'<>\\`]+\.(?:m3u8|mp4|mpd)(?:\?[^\s"'<>\\`]*)?/gi) || []) {
      const clean = raw.replace(/\\\//g, "/");
      extractedLinks.add(clean);
      if (!linkReferer.has(clean)) linkReferer.set(clean, finalPageUrl);
    }
    const relativeRegex = /(?:src|file|url|source|stream)\s*[:=]\s*["']([^"']+\.(?:m3u8|mp4|mpd)(?:\?[^"']*)?)["']/gi;
    let m;
    while ((m = relativeRegex.exec(decodedHtml)) !== null) {
      try {
        const abs = new URL(m[1].replace(/\\\//g, "/"), finalPageUrl).href;
        extractedLinks.add(abs);
        if (!linkReferer.has(abs)) linkReferer.set(abs, finalPageUrl);
      } catch (e) {}
    }
    collectSubtitles(html, decodedHtml, finalPageUrl, subtitles);

    if (depth === 0) {
      const iframeRegex = /<iframe[^>]+src=["']([^"']+)["']/gi;
      let im;
      while ((im = iframeRegex.exec(html)) !== null) {
        try {
          const src = new URL(im[1], finalPageUrl).href;
          if (safeTarget(src) && !EMBED_AD_HOST_RE.test(new URL(src).hostname)) discoveredIframes.add(src);
        } catch (e) {}
      }
      const list = Array.from(discoveredIframes).slice(0, 3);
      const sub = await Promise.all(list.map((u) => extractFromPage(u, workerOrigin, depth + 1)));
      sub.forEach((r) => {
        (r.videos || []).forEach((v) => {
          extractedLinks.add(v.directUrl);
          if (!linkReferer.has(v.directUrl)) linkReferer.set(v.directUrl, r.source);
        });
        (r.subtitles || []).forEach((s) => {
          if (!subtitles.has(s.url)) subtitles.set(s.url, s);
        });
      });
    }

    const videos = Array.from(extractedLinks).map((videoUrl) => {
      const ref = linkReferer.get(videoUrl) || finalPageUrl;
      return {
        type: videoUrl.includes(".m3u8") ? "hls" : videoUrl.includes(".mpd") ? "dash" : "mp4",
        directUrl: videoUrl,
        proxiedUrl: `${workerOrigin}/proxy?videoUrl=${encodeURIComponent(videoUrl)}&referer=${encodeURIComponent(ref)}`,
      };
    });
    const subs = Array.from(subtitles.values()).slice(0, MAX_SUBTITLES).map((s) => ({
      url: s.url,
      lang: s.lang || "",
      label: s.label || "",
      default: Boolean(s.default),
      referer: s.referer || finalPageUrl,
    }));
    return {
      source: targetUrl,
      count: videos.length,
      iframes_scanned: Array.from(discoveredIframes).slice(0, 3),
      videos,
      subtitles: subs,
    };
  } catch (error) {
    return { source: targetUrl, error: error.message, videos: [], subtitles: [] };
  }
}

/* ---------------- الترجمة (Wyzie) ---------------- */

async function wyzieSearch(url, env, workerOrigin) {
  if (!env.WYZIE_KEY) return jsonResponse({ error: "missing_key" }, 500);
  const up = new URL("https://sub.wyzie.io/search");
  for (const k of ["id", "language", "season", "episode", "format", "source"]) {
    const v = url.searchParams.get(k);
    if (v) up.searchParams.set(k, v.slice(0, 200));
  }
  if (!/^(tt\d{5,10}|\d{1,9})$/.test(up.searchParams.get("id") || "")) return jsonResponse({ error: "bad_id" }, 400);
  up.searchParams.set("key", env.WYZIE_KEY);
  const r = await fetch(up.toString(), { headers: { Accept: "application/json" } });
  if (r.status === 404) return jsonResponse([], 200, 1800);
  if (!r.ok) return jsonResponse({ error: `wyzie_${r.status}` }, 502);
  const data = await r.json();
  const list = Array.isArray(data) ? data : data.subtitles || data.results || [];
  return jsonResponse(list.map((item) => {
    if (!item || typeof item.url !== "string") return item;
    try {
      const u = new URL(item.url);
      u.searchParams.delete("key");
      const prox = new URL("/subs/file", workerOrigin);
      prox.searchParams.set("url", u.toString());
      return { ...item, url: prox.toString() };
    } catch { return item; }
  }), 200, 3600);
}

async function wyzieFile(url, env) {
  let u;
  try { u = new URL(url.searchParams.get("url") || ""); } catch { return jsonResponse({ error: "bad_url" }, 400); }
  if (u.protocol !== "https:" || !(u.hostname === "sub.wyzie.io" || u.hostname.endsWith(".wyzie.io"))) {
    return jsonResponse({ error: "host_not_allowed" }, 403);
  }
  if (env.WYZIE_KEY) u.searchParams.set("key", env.WYZIE_KEY);
  const r = await fetch(u.toString());
  if (!r.ok) return jsonResponse({ error: `wyzie_${r.status}` }, 502);
  return new Response(await r.arrayBuffer(), {
    status: 200,
    headers: { "Content-Type": r.headers.get("Content-Type") || "text/plain; charset=utf-8",
               "Cache-Control": "public, max-age=86400", ...CORS },
  });
}

/* ---------------- تريلر IMDb (غير رسمي) ---------------- */

async function imdbTrailer(url) {
  const id = url.searchParams.get("id") || "";
  if (!/^tt\d{5,10}$/.test(id)) return jsonResponse({ error: "bad_id" }, 400);
  const r = await fetch(`https://www.imdb.com/title/${id}/`, {
    headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml", "Accept-Language": "en-US,en;q=0.9" },
    signal: AbortSignal.timeout(8000),
  });
  if (r.status === 202 || !r.ok) return jsonResponse({ error: `imdb_${r.status}` }, 502);
  const html = await r.text();
  const match = html.match(/\/video\/(vi\d{6,12})/);
  if (!match) return jsonResponse({ error: "no_video" }, 404);
  return jsonResponse({ source: "imdb", videoId: match[1], embedUrl: `https://www.imdb.com/video/embed/${match[1]}/` }, 200, 604800);
}

/* ---------------- معلومات إضافية (OMDb) ---------------- */

async function omdbMeta(url, env) {
  if (!env.OMDB_KEY) return jsonResponse({ error: "missing_key" }, 500);
  const id = url.searchParams.get("i") || "";
  if (!/^tt\d{5,10}$/.test(id)) return jsonResponse({ error: "bad_id" }, 400);
  const r = await fetch(`https://www.omdbapi.com/?i=${id}&plot=short&apikey=${env.OMDB_KEY}`);
  if (!r.ok) return jsonResponse({ error: `omdb_${r.status}` }, 502);
  const d = await r.json();
  if (d.Response === "False") return jsonResponse({ error: "not_found" }, 404);
  const val = (v) => (v && v !== "N/A" ? v : undefined);
  const rt = (d.Ratings || []).find((x) => x.Source === "Rotten Tomatoes");
  return jsonResponse({
    imdbId: id, imdbRating: val(d.imdbRating), imdbVotes: val(d.imdbVotes), metascore: val(d.Metascore),
    rottenTomatoes: val(rt && rt.Value), rated: val(d.Rated), runtime: val(d.Runtime), awards: val(d.Awards),
    boxOffice: val(d.BoxOffice), director: val(d.Director), writer: val(d.Writer), actors: val(d.Actors),
    language: val(d.Language), country: val(d.Country),
  }, 200, 86400);
}

/* ---------------- TMDB proxy (اختياري) ---------------- */

function tmdbTtl(path) {
  if (/\/search\//.test(path)) return 600;
  if (/trending|now_playing|popular|upcoming|airing|on_the_air/.test(path)) return 1800;
  return 21600;
}

async function tmdbProxy(url, env) {
  if (!env.TMDB_KEY) return jsonResponse({ error: "missing_key" }, 500);
  if (!/^\/tmdb\/3\/[A-Za-z0-9_\-\/]+$/.test(url.pathname)) return jsonResponse({ error: "bad_path" }, 400);
  const up = new URL("https://api.themoviedb.org" + url.pathname.slice(5));
  url.searchParams.forEach((v, k) => { if (k !== "api_key") up.searchParams.set(k, v.slice(0, 300)); });
  up.searchParams.set("api_key", env.TMDB_KEY);
  const r = await fetch(up.toString(), { headers: { Accept: "application/json" } });
  return new Response(await r.text(), {
    status: r.ok ? 200 : r.status,
    headers: { "Content-Type": "application/json; charset=utf-8",
               "Cache-Control": r.ok ? `public, max-age=${tmdbTtl(url.pathname)}` : "no-store", ...CORS },
  });
}

/* ---------------- مساعد ---------------- */

function jsonResponse(data, status = 200, maxAge = 0) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json;charset=UTF-8",
               "Cache-Control": maxAge ? `public, max-age=${maxAge}` : "no-store", ...CORS },
  });
}
