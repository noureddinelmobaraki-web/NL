/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Internet Archive Games Client (Archive.org Metadata & AdvancedSearch APIs)
 * - Resolves .swf Flash games from collection:softwarelibrary_flash
 * - Resolves console ROMs from retro-pie-homebrew-collection
 * - Resolves .jsdos / .zip bundles from softwarelibrary_msdos_games
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
    if (!res.ok) return { playableUrl: null };
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
      const jsdos =
        files.find((f) => /\.jsdos$/i.test(f.name || '')) ||
        files.find((f) => /\.zip$/i.test(f.name || ''));
      if (jsdos?.name) {
        return {
          playableUrl: `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(jsdos.name)}`,
        };
      }
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

    return { playableUrl: null };
  } catch {
    return { playableUrl: null };
  }
}

export async function fetchArchiveOrgRetroCollection(
  signal?: AbortSignal,
): Promise<UnifiedGameItem[]> {
  try {
    const res = await fetch(
      'https://archive.org/metadata/retro-pie-homebrew-collection',
      { signal },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const files: ArchiveFileEntry[] = Array.isArray(data?.files)
      ? data.files
      : [];

    const items: UnifiedGameItem[] = [];
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

    return items;
  } catch {
    return [];
  }
}
