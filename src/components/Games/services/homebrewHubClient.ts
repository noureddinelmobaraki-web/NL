/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Homebrew Hub Official API Client (hh3.gbdev.io)
 * Fetches playable Game Boy (GB), Game Boy Color (GBC), Game Boy Advance (GBA),
 * and NES homebrew ROMs with direct CORS-enabled download URLs.
 */

import type { ConsoleCore, UnifiedGameItem } from '../types/games.types';

const HH3_BASE = 'https://hh3.gbdev.io/api';

interface HH3File {
  filename: string;
  default?: boolean;
  playable?: boolean;
}

interface HH3Entry {
  slug: string;
  title: string;
  platform?: 'GB' | 'GBC' | 'GBA' | 'NES' | string;
  screenshots?: string[];
  files?: HH3File[];
  developer?: string;
  typetag?: string;
}

function resolveCoreForPlatform(platform?: string): {
  core: ConsoleCore;
  badge: 'GB' | 'GBC' | 'GBA' | 'NES';
} {
  const norm = (platform || 'GB').toUpperCase();
  if (norm === 'GBA') return { core: 'mgba', badge: 'GBA' };
  if (norm === 'NES') return { core: 'fceumm', badge: 'NES' };
  if (norm === 'GBC') return { core: 'gambatte', badge: 'GBC' };
  return { core: 'gambatte', badge: 'GB' };
}

function extractPlayableRomUrl(entry: HH3Entry): string | null {
  const files = Array.isArray(entry.files) ? entry.files : [];
  if (!files.length) return null;

  const playable =
    files.find((f) => f.playable && f.default) ||
    files.find((f) => f.playable) ||
    files.find((f) => /\.(gb|gbc|gba|nes)$/i.test(f.filename || ''));

  if (!playable?.filename) return null;
  return `${HH3_BASE}/entry/${encodeURIComponent(entry.slug)}/${encodeURIComponent(playable.filename)}`;
}

const CURATED_RETRO_FALLBACKS: UnifiedGameItem[] = [
  {
    id: 'hh3-tobu-tobu-girl-deluxe',
    title: 'Tobu Tobu Girl Deluxe',
    posterUrl: 'https://hh3.gbdev.io/api/entry/tobu-tobu-girl-deluxe/cover.png',
    bundleUrl: 'https://hh3.gbdev.io/api/entry/tobu-tobu-girl-deluxe/tobu-tobu-girl-deluxe.gbc',
    engine: 'nostalgist',
    category: 'retro',
    platformBadge: 'GBC',
    consoleCore: 'gambatte',
    controlProfile: 'console-pad',
    subtitle: 'Tangram Games · Arcade Platformer',
    priorityRank: 450,
  },
  {
    id: 'hh3-deadeus',
    title: 'Deadeus',
    posterUrl: 'https://hh3.gbdev.io/api/entry/deadeus/01.png',
    bundleUrl: 'https://hh3.gbdev.io/api/entry/deadeus/deadeus.gb',
    engine: 'nostalgist',
    category: 'retro',
    platformBadge: 'GB',
    consoleCore: 'gambatte',
    controlProfile: 'console-pad',
    subtitle: 'IZMA · Adventure RPG',
    priorityRank: 448,
  },
  {
    id: 'hh3-ucity',
    title: 'µCity (SimCity GB)',
    posterUrl: 'https://hh3.gbdev.io/api/entry/ucity/screenshot1.png',
    bundleUrl: 'https://hh3.gbdev.io/api/entry/ucity/ucity.gbc',
    engine: 'nostalgist',
    category: 'retro',
    platformBadge: 'GBC',
    consoleCore: 'gambatte',
    controlProfile: 'console-pad',
    subtitle: 'AntonioND · City Builder',
    priorityRank: 446,
  },
];

export async function fetchHomebrewHubGames(
  signal?: AbortSignal,
): Promise<UnifiedGameItem[]> {
  try {
    const res = await fetch(
      `${HH3_BASE}/search?typetag=game&results=30&page=1`,
      { signal },
    );
    if (!res.ok) return CURATED_RETRO_FALLBACKS;
    const data = await res.json();
    const entries: HH3Entry[] = Array.isArray(data?.entries) ? data.entries : [];

    const mapped: UnifiedGameItem[] = [];
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry?.slug || !entry?.title) continue;
      const romUrl = extractPlayableRomUrl(entry);
      if (!romUrl) continue;

      const { core, badge } = resolveCoreForPlatform(entry.platform);
      const screenshot = entry.screenshots?.[0];
      const posterUrl = screenshot
        ? `${HH3_BASE}/entry/${encodeURIComponent(entry.slug)}/${encodeURIComponent(screenshot)}`
        : 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/ico/Retro.png';

      mapped.push({
        id: `hh3-${entry.slug}`,
        title: entry.title,
        posterUrl,
        bundleUrl: romUrl,
        engine: 'nostalgist',
        category: 'retro',
        platformBadge: badge,
        consoleCore: core,
        controlProfile: 'console-pad',
        subtitle: entry.developer ? `${badge} · ${entry.developer}` : `${badge} · Homebrew Hub`,
        priorityRank: 440 - i,
      });
    }

    return mapped.length > 0 ? mapped : CURATED_RETRO_FALLBACKS;
  } catch {
    return CURATED_RETRO_FALLBACKS;
  }
}
