export type LyricsLine = { t: number; text: string };

export type LyricsResult = {
  lines: LyricsLine[];
  synced: boolean;
} | null;

const cache = new Map<string, LyricsResult>();
const inFlight = new Map<string, Promise<LyricsResult>>();
const LRU_MAX = 400;

function updateLRU(id: string, result: LyricsResult) {
  if (cache.has(id)) {
    cache.delete(id);
  }
  cache.set(id, result);
  if (cache.size > LRU_MAX) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
}

export function getCachedLyrics(id: string): LyricsResult | undefined {
  if (cache.has(id)) {
    const val = cache.get(id);
    // Refresh LRU
    cache.delete(id);
    cache.set(id, val as LyricsResult);
    return val;
  }
  return undefined;
}

function parseSyncedLyrics(lrc: string): LyricsLine[] {
  const lines = lrc.split('\n');
  const result: LyricsLine[] = [];
  const timePattern = /\[(\d{2,}):(\d{2})(?:\.(\d{2,3})|:(\d{2}))?\]/g;
  
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    
    const matches = [];
    let match;
    while ((match = timePattern.exec(line)) !== null) {
      matches.push({
        min: parseInt(match[1], 10),
        sec: parseInt(match[2], 10),
        ms: match[3] ? parseInt(match[3], 10) : (match[4] ? parseInt(match[4], 10) * 10 : 0)
      });
    }
    
    let cleanText = line.replace(timePattern, '').trim();
    cleanText = cleanText.replace(/<\d{2,}:\d{2}\.\d{2,3}>/g, '').trim();
    
    if (matches.length > 0) {
      for (const m of matches) {
        const totalSec = m.min * 60 + m.sec + m.ms / 1000;
        result.push({ t: totalSec, text: cleanText || '• • •' });
      }
    }
  }
  return result.sort((a, b) => a.t - b.t);
}

function parsePlainLyrics(plain: string): LyricsLine[] {
  return plain.split('\n').map(text => ({ t: 0, text: text.trim() })).filter(l => l.text);
}

export async function fetchLyrics(track: { id: string; title: string; artist?: string; album?: string; durationSec?: number }): Promise<LyricsResult> {
  const cached = getCachedLyrics(track.id);
  if (cached !== undefined) return cached;
  
  if (inFlight.has(track.id)) {
    return inFlight.get(track.id)!;
  }
  
  const promise = (async () => {
    try {
      const artist = track.artist && track.artist !== 'Unknown artist' && track.artist !== 'Unknown Artist' ? track.artist : '';
      
      let data = null;
      
      const g = new URL('https://lrclib.net/api/get');
      g.searchParams.set('track_name', track.title);
      if (artist) g.searchParams.set('artist_name', artist);
      if (track.album) g.searchParams.set('album_name', track.album);
      if (track.durationSec) g.searchParams.set('duration', String(Math.round(track.durationSec)));
      
      try {
        const res = await fetch(g.toString());
        if (res.ok) {
          const j = await res.json();
          if (j?.syncedLyrics || j?.plainLyrics) data = j;
        }
      } catch {}
      
      if (!data) {
        const s = new URL('https://lrclib.net/api/search');
        s.searchParams.set('track_name', track.title);
        if (artist) s.searchParams.set('artist_name', artist);
        
        try {
          const res = await fetch(s.toString());
          if (res.ok) {
            const arr = await res.json();
            const hit = Array.isArray(arr) ? (arr.find((x: any) => x.syncedLyrics) || arr[0]) : null;
            if (hit && (hit.syncedLyrics || hit.plainLyrics)) data = hit;
          }
        } catch {}
      }
      
      let result: LyricsResult = null;
      if (data) {
        if (data.syncedLyrics) {
          result = { lines: parseSyncedLyrics(data.syncedLyrics), synced: true };
        } else if (data.plainLyrics) {
          result = { lines: parsePlainLyrics(data.plainLyrics), synced: false };
        }
      }
      
      updateLRU(track.id, result);
      return result;
    } catch (e) {
      console.warn('Failed to fetch lyrics', e);
      updateLRU(track.id, null);
      return null;
    } finally {
      inFlight.delete(track.id);
    }
  })();
  
  inFlight.set(track.id, promise);
  return promise;
}

const prefetchQueue: { id: string; title: string; artist?: string; album?: string; durationSec?: number }[] = [];
let prefetching = false;

async function processPrefetch() {
  if (prefetching || prefetchQueue.length === 0) return;
  prefetching = true;
  
  while (prefetchQueue.length > 0) {
    const batch = prefetchQueue.splice(0, 3); // Max concurrency 3
    await Promise.all(batch.map(track => fetchLyrics(track)));
    await new Promise(r => setTimeout(r, 100)); // Small delay
  }
  
  prefetching = false;
}

export function prefetchLyrics(track: { id: string; title: string; artist?: string; album?: string; durationSec?: number }) {
  if (cache.has(track.id) || inFlight.has(track.id) || prefetchQueue.some(t => t.id === track.id)) return;
  prefetchQueue.push(track);
  
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(() => processPrefetch());
  } else {
    setTimeout(() => processPrefetch(), 500);
  }
}

export function prefetchMany(tracks: { id: string; title: string; artist?: string; album?: string; durationSec?: number }[]) {
  for (const t of tracks) {
    if (!cache.has(t.id) && !inFlight.has(t.id) && !prefetchQueue.some(q => q.id === t.id)) {
      prefetchQueue.push(t);
    }
  }
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(() => processPrefetch());
  } else {
    setTimeout(() => processPrefetch(), 500);
  }
}
