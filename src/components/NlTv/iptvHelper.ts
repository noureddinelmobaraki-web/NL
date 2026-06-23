/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Country {
  name: string;
  code: string; // ISO 3166-1 alpha-2 (uppercase)
  languages?: string[];
  flag: string;
}

export interface TvChannel {
  id: string;
  name: string;
  logo?: string;
  group?: string;
  url: string;
}

// Low resource caching using localStorage with TTL or in-memory
const CACHE_TTL = 3600_000 * 4; // 4 hours TTL for loaded playlists

export async function fetchCountries(): Promise<Country[]> {
  const cacheKey = "nltv_countries_v1";
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { time, data } = JSON.parse(cached);
      if (Date.now() - time < CACHE_TTL * 6) {
        return data;
      }
    }
  } catch {}

  try {
    const res = await fetch("https://iptv-org.github.io/api/countries.json");
    if (!res.ok) throw new Error("fetch failed");
    const json = await res.json();
    // Sort countries by name and filter valid structures
    const countries = json
      .filter((c: any) => c.name && c.code && c.flag)
      .map((c: any) => ({
        name: c.name,
        code: c.code.toUpperCase(),
        flag: c.flag
      }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));

    try {
      localStorage.setItem(cacheKey, JSON.stringify({ time: Date.now(), data: countries }));
    } catch {}

    return countries;
  } catch (err) {
    console.warn("Could not fetch online countries list, using offline fallback", err);
    return FALLBACK_COUNTRIES;
  }
}

export async function fetchCountryChannels(countryCode: string): Promise<TvChannel[]> {
  const code = countryCode.toLowerCase();
  const cacheKey = `nltv_channels_${code}_v1`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { time, data } = JSON.parse(cached);
      if (Date.now() - time < CACHE_TTL) {
        return data;
      }
    }
  } catch {}

  try {
    const res = await fetch(`https://iptv-org.github.io/iptv/countries/${code}.m3u`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const text = await res.text();
    const channels = parseM3u(text);
    
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ time: Date.now(), data: channels }));
    } catch {}
    
    return channels;
  } catch (err) {
    console.error(`Error loading channels for country ${countryCode}:`, err);
    throw err;
  }
}

export function parseM3u(text: string): TvChannel[] {
  const lines = text.split(/\r?\n/);
  const channels: TvChannel[] = [];
  let currentMeta: Partial<TvChannel> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith("#EXTINF")) {
      // Parse metadata from index line
      // Format: #EXTINF:-1 tvg-id="France3.fr" tvg-logo="https://..." group-title="News",France 3
      const idMatch = /tvg-id="([^"]*)"/.exec(line);
      const logoMatch = /tvg-logo="([^"]*)"/.exec(line);
      const groupMatch = /group-title="([^"]*)"/.exec(line);
      
      const lastComma = line.lastIndexOf(",");
      const name = lastComma !== -1 ? line.slice(lastComma + 1).trim() : "Unknown Channel";
      
      currentMeta = {
        id: idMatch ? idMatch[1] : `chan_${Math.random().toString(36).substr(2, 9)}`,
        name,
        logo: logoMatch ? logoMatch[1] : undefined,
        group: groupMatch ? groupMatch[1] : undefined
      };
    } else if (!line.startsWith("#") && currentMeta) {
      // This line is the URL corresponding to the previous metadata
      channels.push({
        id: currentMeta.id || `chan_${Math.random().toString(36).substr(2, 9)}`,
        name: currentMeta.name || "Unknown Channel",
        logo: currentMeta.logo,
        group: currentMeta.group,
        url: line
      });
      currentMeta = null;
    }
  }

  return channels;
}

export const FALLBACK_COUNTRIES: Country[] = [
  { "name": "Morocco", "code": "MA", "flag": "🇲🇦" },
  { "name": "Algeria", "code": "DZ", "flag": "🇩🇿" },
  { "name": "Tunisia", "code": "TN", "flag": "🇹🇳" },
  { "name": "Egypt", "code": "EG", "flag": "🇪🇬" },
  { "name": "Saudi Arabia", "code": "SA", "flag": "🇸🇦" },
  { "name": "France", "code": "FR", "flag": "🇫🇷" },
  { "name": "Spain", "code": "ES", "flag": "🇪🇸" },
  { "name": "United Kingdom", "code": "UK", "flag": "🇬🇧" },
  { "name": "United States", "code": "US", "flag": "🇺🇸" },
  { "name": "Canada", "code": "CA", "flag": "🇨🇦" },
  { "name": "Germany", "code": "DE", "flag": "🇩🇪" },
  { "name": "Italy", "code": "IT", "flag": "🇮🇹" },
  { "name": "Japan", "code": "JP", "flag": "🇯🇵" },
  { "name": "South Korea", "code": "KR", "flag": "🇰🇷" },
  { "name": "Brazil", "code": "BR", "flag": "🇧🇷" },
  { "name": "Argentina", "code": "AR", "flag": "🇦🇷" }
];
