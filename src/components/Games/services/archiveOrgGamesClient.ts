/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Internet Archive Games Client (Archive.org Metadata & AdvancedSearch APIs)
 * - Resolves .swf Flash games from softwarelibrary_flash, softwarelibrary_flash_showcase, flash_games, NewgroundsAuditorium
 * - Resolves console ROMs & embeds from retro-pie-homebrew-collection, consolelivingroom, internetarcade
 * - Resolves .jsdos / .zip bundles or https://archive.org/embed/{id}?autoplay=1 fallback for MS-DOS
 */

import type {
  ConsoleCore,
  EmulatorEngine,
  UnifiedGameItem,
} from '../types/games.types';

const ARCHIVE_IMG = (id: string) =>
  `https://archive.org/services/img/${encodeURIComponent(id)}`;

interface ArchiveFileEntry {
  name?: string;
  format?: string;
}

export async function resolveArchiveOrgBundleUrl(
  identifier: string,
  expectedEngine: EmulatorEngine,
  signal?: AbortSignal,
): Promise<{
  playableUrl: string | null;
  consoleCore?: ConsoleCore;
}> {
  try {
    const res = await fetch(
      `https://archive.org/metadata/${encodeURIComponent(identifier)}`,
      { signal },
    );
    if (!res.ok) {
      if (expectedEngine === 'js-dos' || expectedEngine === 'html5') {
        return {
          playableUrl: `https://archive.org/embed/${encodeURIComponent(identifier)}?autoplay=1`,
        };
      }
      return { playableUrl: null };
    }
    const meta = await res.json();
    const files: ArchiveFileEntry[] = Array.isArray(meta?.files)
      ? meta.files
      : [];

    if (expectedEngine === 'ruffle') {
      const swf = files.find((f) => /\.swf$/i.test(f.name || ''));
      if (swf?.name) {
        return {
          playableUrl: `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(swf.name)}`,
        };
      }
    }

    if (expectedEngine === 'js-dos') {
      const jsdos = files.find((f) => /\.jsdos$/i.test(f.name || ''));
      if (jsdos?.name) {
        return {
          playableUrl: `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(jsdos.name)}`,
        };
      }
      // Automatic Archive.org EM-DOSBox iframe fallback when no standalone .jsdos bundle exists
      return {
        playableUrl: `https://archive.org/embed/${encodeURIComponent(identifier)}?autoplay=1`,
      };
    }

    if (expectedEngine === 'nostalgist') {
      const rom = files.find((f) =>
        /\.(nes|gba|gbc|gb|sfc|smc|md|bin)$/i.test(f.name || ''),
      );
      if (rom?.name) {
        const ext = rom.name.split('.').pop()?.toLowerCase() || '';
        const core: ConsoleCore =
          ext === 'gba'
            ? 'mgba'
            : ext === 'gb' || ext === 'gbc'
              ? 'gambatte'
              : ext === 'sfc' || ext === 'smc'
                ? 'snes9x'
                : ext === 'md' || ext === 'bin'
                  ? 'genesis_plus_gx'
                  : 'fceumm';
        return {
          playableUrl: `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(rom.name)}`,
          consoleCore: core,
        };
      }
    }

    return {
      playableUrl: `https://archive.org/embed/${encodeURIComponent(identifier)}?autoplay=1`,
    };
  } catch {
    if (expectedEngine === 'js-dos') {
      return {
        playableUrl: `https://archive.org/embed/${encodeURIComponent(identifier)}?autoplay=1`,
      };
    }
    return { playableUrl: null };
  }
}

export async function fetchArchiveOrgRetroCollection(
  signal?: AbortSignal,
): Promise<UnifiedGameItem[]> {
  try {
    const [homebrewRes, arcadeSearchRes] = await Promise.allSettled([
      fetch('https://archive.org/metadata/retro-pie-homebrew-collection', {
        signal,
      }),
      fetch(
        'https://archive.org/advancedsearch.php?q=(collection:(consolelivingroom)+OR+collection:(internetarcade))+AND+mediatype:(software)&fl[]=identifier,title,creator&sort[]=downloads+desc&rows=18&page=1&output=json',
        { signal },
      ),
    ]);

    const items: UnifiedGameItem[] = [];

    if (homebrewRes.status === 'fulfilled' && homebrewRes.value.ok) {
      const data = await homebrewRes.value.json();
      const files: ArchiveFileEntry[] = Array.isArray(data?.files)
        ? data.files
        : [];

      for (const file of files) {
        const name = file.name || '';
        if (!/\.(nes|gba|gb|gbc|md|sfc)$/i.test(name)) continue;
        const ext = name.split('.').pop()?.toLowerCase() || 'nes';
        const baseTitle = name
          .replace(/^.*\//, '')
          .replace(/\.[a-z0-9]+$/i, '')
          .replace(/[_-]+/g, ' ')
          .trim();
        if (!baseTitle) continue;

        const core: ConsoleCore =
          ext === 'gba'
            ? 'mgba'
            : ext === 'gb' || ext === 'gbc'
              ? 'gambatte'
              : ext === 'sfc'
                ? 'snes9x'
                : ext === 'md'
                  ? 'genesis_plus_gx'
                  : 'fceumm';

        const badge =
          ext === 'gba'
            ? 'GBA'
            : ext === 'gbc'
              ? 'GBC'
              : ext === 'gb'
                ? 'GB'
                : ext === 'md'
                  ? 'GEN'
                  : 'NES';

        items.push({
          id: `ia-retropie-${baseTitle.toLowerCase().replace(/\s+/g, '-')}`,
          title: baseTitle,
          posterUrl: ARCHIVE_IMG('retro-pie-homebrew-collection'),
          bundleUrl: `https://archive.org/download/retro-pie-homebrew-collection/${encodeURIComponent(name)}`,
          engine: 'nostalgist',
          category: 'retro',
          platformBadge: badge,
          consoleCore: core,
          controlProfile: 'console-pad',
          subtitle: `${badge} · Archive Homebrew`,
          priorityRank: 350 - items.length,
        });
        if (items.length >= 16) break;
      }
    }

    if (arcadeSearchRes.status === 'fulfilled' && arcadeSearchRes.value.ok) {
      const arcadeData = await arcadeSearchRes.value.json();
      const docs: any[] = Array.isArray(arcadeData?.response?.docs)
        ? arcadeData.response.docs
        : [];
      docs.forEach((doc, idx) => {
        if (!doc?.identifier || !doc?.title) return;
        items.push({
          id: `ia-arcade-${doc.identifier}`,
          title: String(doc.title),
          posterUrl: ARCHIVE_IMG(String(doc.identifier)),
          bundleUrl: `https://archive.org/embed/${encodeURIComponent(doc.identifier)}?autoplay=1`,
          engine: 'html5',
          category: 'retro',
          platformBadge: 'NES',
          controlProfile: 'console-pad',
          subtitle: doc.creator
            ? `${doc.creator} · Internet Arcade`
            : 'Console Living Room · Archive',
          priorityRank: 325 - idx,
        });
      });
    }

    return items;
  } catch {
    return [];
  }
}

export async function fetchArchiveOrgPopularFlashGames(
  signal?: AbortSignal,
  page = 1,
): Promise<UnifiedGameItem[]> {
  try {
    const searchUrl = `https://archive.org/advancedsearch.php?q=(collection:(softwarelibrary_flash)+OR+collection:(softwarelibrary_flash_showcase)+OR+identifier:(NewgroundsAuditorium))+AND+mediatype:(software)&fl[]=identifier,title,creator&sort[]=downloads+desc&rows=36&page=${page}&output=json`;
    const [searchRes, flashBundleRes] = await Promise.allSettled([
      fetch(searchUrl, { signal }),
      page === 1
        ? fetch('https://archive.org/metadata/flash_games', { signal })
        : Promise.resolve(null),
    ]);

    const results: UnifiedGameItem[] = [];

    if (searchRes.status === 'fulfilled' && searchRes.value?.ok) {
      const data = await searchRes.value.json();
      const docs = Array.isArray(data?.response?.docs) ? data.response.docs : [];
      for (let i = 0; i < docs.length; i++) {
        const d = docs[i];
        if (!d?.identifier || !d?.title) continue;
        results.push({
          id: `ia-swf-${d.identifier}`,
          title: String(d.title),
          posterUrl: ARCHIVE_IMG(String(d.identifier)),
          archiveIdentifier: String(d.identifier),
          engine: 'ruffle',
          category: 'flash',
          platformBadge: 'SWF',
          subGenre: 'Arcade',
          controlProfile: 'flash-pc',
          subtitle: d.creator
            ? `${d.creator} · Flashpoint / Archive`
            : 'Archive.org Flash Classic',
          priorityRank: 400 - i,
        });
      }
    }

    // Multi-SWF extraction from identifier:flash_games
    if (
      flashBundleRes.status === 'fulfilled' &&
      flashBundleRes.value &&
      flashBundleRes.value.ok
    ) {
      const bundleMeta = await flashBundleRes.value.json();
      const files: ArchiveFileEntry[] = Array.isArray(bundleMeta?.files)
        ? bundleMeta.files
        : [];
      let count = 0;
      for (const f of files) {
        const name = f.name || '';
        if (!/\.swf$/i.test(name)) continue;
        const cleanTitle = name
          .replace(/^.*\//, '')
          .replace(/\.swf$/i, '')
          .replace(/[_-]+/g, ' ')
          .trim();
        if (!cleanTitle) continue;
        results.push({
          id: `ia-flashbundle-${cleanTitle.toLowerCase().replace(/\s+/g, '-')}`,
          title: cleanTitle,
          posterUrl: ARCHIVE_IMG('flash_games'),
          bundleUrl: `https://archive.org/download/flash_games/${encodeURIComponent(name)}`,
          engine: 'ruffle',
          category: 'flash',
          platformBadge: 'SWF',
          subGenre: 'Action',
          controlProfile: 'flash-pc',
          subtitle: 'Flash Games Vault · SWF',
          priorityRank: 360 - count,
        });
        count += 1;
        if (count >= 18) break;
      }
    }

    return results;
  } catch {
    return [];
  }
}
