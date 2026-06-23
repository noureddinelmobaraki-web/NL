/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from "react";
import { Country } from "./iptvHelper";

export type TvSuggestion =
  | { kind: 'country'; code: string; name: string; flag: string; channelCount: number }
  | { kind: 'channel'; channelId: string; name: string; countryCode: string; countryName: string; logo?: string; url: string };

const DB_NAME = "nltv_search_db_v1";
const STORE_CHANNELS = "channels";
const STORE_STREAMS = "streams";
const METADATA_KEY = "nltv_meta";
const EXPIRE_MS = 24 * 3600 * 1000; // 24 hours

// Quick self-contained IndexedDB wrapper to avoid extra bundle size/dependencies
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_CHANNELS)) {
        db.createObjectStore(STORE_CHANNELS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_STREAMS)) {
        db.createObjectStore(STORE_STREAMS, { keyPath: "channel" });
      }
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveToStore(storeName: string, items: any[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    // Use put for items
    let error: any = null;
    tx.oncomplete = () => {
      if (error) reject(error);
      else resolve();
    };
    tx.onerror = () => {
      reject(tx.error);
    };
    for (const item of items) {
      try {
        store.put(item);
      } catch (e) {
        error = e;
        break;
      }
    }
  });
}

async function getMetaTime(): Promise<number> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction("meta", "readonly");
      const req = tx.objectStore("meta").get(METADATA_KEY);
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => resolve(0);
    });
  } catch {
    return 0;
  }
}

async function setMetaTime(time: number): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction("meta", "readwrite");
      const req = tx.objectStore("meta").put(time, METADATA_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {}
}

async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function normalize(s: string): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[\u064B-\u065F\u0640]/g, "") // Remove Arabic diacritics/tashkeel
    .replace(/[^\p{L}\p{N}]+/gu, " ") // Clean layout punctuation
    .trim();
}

export function fuzzyScore(query: string, target: string): number {
  const q = normalize(query);
  const t = normalize(target);
  if (!q) return 0;
  if (t === q) return 100;
  if (t.startsWith(q)) return 90; // prefix match
  if (t.includes(q)) return 70; // partial substring

  const d = levenshtein(q, t.slice(0, q.length + 2));
  const maxAllowedDistance = Math.max(1, Math.floor(q.length / 4));
  if (d <= maxAllowedDistance) {
    return 50 - d * 5;
  }
  return -1;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[m][n];
}

export function useTvSearchIndex(countries: Country[]) {
  const [channels, setChannels] = useState<any[]>([]);
  const [streams, setStreams] = useState<Record<string, string>>({});
  const [isIndexing, setIsIndexing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const initIndex = useCallback(async () => {
    if (isLoaded || isIndexing) return;
    setIsIndexing(true);

    try {
      const lastUpdate = await getMetaTime();
      const isExpired = Date.now() - lastUpdate > EXPIRE_MS;

      if (isExpired) {
        // Fetch channels & streams from iptv-org
        const [channelsRes, streamsRes] = await Promise.all([
          fetch("https://iptv-org.github.io/api/channels.json").then((r) => r.json()),
          fetch("https://iptv-org.github.io/api/streams.json").then((r) => r.json()),
        ]);

        // Filter and map safe elements
        const validStreams: Record<string, string> = {};
        for (const s of streamsRes) {
          if (s.channel && s.url) {
            validStreams[s.channel] = s.url;
          }
        }

        const safeChannels = channelsRes
          .filter((c: any) => c.name && c.country && !c.is_nsfw && !c.closed)
          .map((c: any) => ({
            id: c.id,
            name: c.name,
            country: c.country.toUpperCase(),
            logo: c.logo || "",
          }));

        // Save in DB
        await saveToStore(STORE_CHANNELS, safeChannels);
        const streamsArr = Object.entries(validStreams).map(([channel, url]) => ({ channel, url }));
        await saveToStore(STORE_STREAMS, streamsArr);
        await setMetaTime(Date.now());

        setChannels(safeChannels);
        setStreams(validStreams);
      } else {
        const storedChannels = await getAllFromStore<any>(STORE_CHANNELS);
        const storedStreamsArr = await getAllFromStore<any>(STORE_STREAMS);
        const loadedStreams: Record<string, string> = {};
        for (const s of storedStreamsArr) {
          loadedStreams[s.channel] = s.url;
        }

        setChannels(storedChannels);
        setStreams(loadedStreams);
      }
      setIsLoaded(true);
    } catch (e) {
      console.warn("Index loading exception, fallback to country search:", e);
    } finally {
      setIsIndexing(false);
    }
  }, [isLoaded, isIndexing]);

  const searchGlobal = useCallback(
    (query: string): TvSuggestion[] => {
      if (!query || !isLoaded) return [];

      const queryNormalized = normalize(query);
      if (!queryNormalized) return [];

      const matches: { score: number; suggestion: TvSuggestion }[] = [];

      // 1. Match countries
      for (const country of countries) {
        const countryNameScore = fuzzyScore(query, country.name);
        const countryCodeScore = fuzzyScore(query, country.code);
        const bestCountryScore = Math.max(countryNameScore, countryCodeScore);

        if (bestCountryScore > 0) {
          matches.push({
            score: bestCountryScore + 10, // Slight boost for countries
            suggestion: {
              kind: "country",
              code: country.code,
              name: country.name,
              flag: country.flag,
              channelCount: 0,
            },
          });
        }
      }

      // 2. Match channels (if we have stream url for them)
      for (const channel of channels) {
        const url = streams[channel.id];
        if (!url) continue;

        const chanScore = fuzzyScore(query, channel.name);
        if (chanScore > 0) {
          const matchedCountry = countries.find((c) => c.code === channel.country);
          matches.push({
            score: chanScore,
            suggestion: {
              kind: "channel",
              channelId: channel.id,
              name: channel.name,
              countryCode: channel.country,
              countryName: matchedCountry ? matchedCountry.name : channel.country,
              logo: channel.logo || undefined,
              url,
            },
          });
        }
      }

      // Sort matches descending score
      matches.sort((a, b) => b.score - a.score);

      // Return max 8 unique items
      const seen = new Set<string>();
      const result: TvSuggestion[] = [];
      for (const m of matches) {
        const key = m.suggestion.kind === "country" ? `cnt_${m.suggestion.code}` : `chn_${m.suggestion.channelId}`;
        if (!seen.has(key)) {
          seen.add(key);
          result.push(m.suggestion);
          if (result.length >= 8) break;
        }
      }

      return result;
    },
    [isLoaded, countries, channels, streams]
  );

  return {
    isIndexing,
    isLoaded,
    initIndex,
    searchGlobal,
  };
}
