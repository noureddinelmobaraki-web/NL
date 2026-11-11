/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Local Flash Catalog Reader & Sub-Genre Classifier
 * Preserves 100% of the 45 original Flash games in public/data/games.json
 */

import type { FlashSubGenre, UnifiedGameItem } from '../types/games.types';

export const GAMES_CDN_BASE =
  'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/games';

export function buildLocalFlashUrl(dir: string, file: string): string {
  return `${GAMES_CDN_BASE}/${encodeURIComponent(dir)}/${encodeURIComponent(file)}`;
}

const SUBGENRE_MAP: Record<string, FlashSubGenre> = {
  'streetfighter2': 'Fighting',
  'mortal-kombat': 'Fighting',
  'double-dragon': 'Fighting',
  'tribot-fighter': 'Fighting',
  'gachimuchi': 'Fighting',
  'super-mario-bros-crossover': 'Platformer',
  'super-mario-bros': 'Platformer',
  'super-rana': 'Platformer',
  'adventure-island': 'Platformer',
  'bubble-bobble-2': 'Platformer',
  'donkey-kong': 'Platformer',
  'ghosts-and-goblins': 'Platformer',
  'jet-set-willy': 'Platformer',
  'manic-miner': 'Platformer',
  'ninja-gaiden-4': 'Platformer',
  'prince-of-persia': 'Platformer',
  'rickdangerous': 'Platformer',
  'the-great-giana-sisters': 'Platformer',
  'the-nutcracker': 'Platformer',
  'contra': 'Shooter',
  'alien-splatter': 'Shooter',
  'tequila-zombies': 'Shooter',
  'zombie-world': 'Shooter',
  'zombotron-2': 'Shooter',
  'duck-hunt': 'Shooter',
  'rtype': 'Shooter',
  'xevious': 'Shooter',
  'defender': 'Shooter',
  '4x4-monster-2': 'Racing',
  'crystal-story': 'RPG',
  'the-kings-league-emb': 'RPG',
  'the-gatekeeper': 'RPG',
  'asteroids': 'Arcade',
  'centipede': 'Arcade',
  'dig-dug': 'Arcade',
  'frogger': 'Arcade',
  'galaga': 'Arcade',
  'hedgehoglaunch': 'Arcade',
  'jetpac': 'Arcade',
  'glean': 'Arcade',
  'glean2': 'Arcade',
  'utopian-mining': 'Arcade',
  'etd': 'Action',
  'ninja-virus': 'Action',
  'zos': 'Action',
};

interface RawFlashGameEntry {
  id: string;
  title: string;
  dir: string;
  swf: string;
  poster: string;
}

export async function fetchLocalFlashCatalog(
  signal?: AbortSignal,
): Promise<UnifiedGameItem[]> {
  try {
    const baseUrl = import.meta.env.BASE_URL || '/';
    const res = await fetch(`${baseUrl}data/games.json`, { signal });
    if (!res.ok) return [];
    const data = await res.json();
    const rawList: RawFlashGameEntry[] = Array.isArray(data?.games)
      ? data.games.filter(
          (g: unknown): g is RawFlashGameEntry =>
            Boolean(
              g &&
                typeof g === 'object' &&
                'id' in g &&
                'title' in g &&
                'dir' in g &&
                'swf' in g &&
                'poster' in g,
            ),
        )
      : [];

    return rawList.map((entry, idx) => {
      const subGenre = SUBGENRE_MAP[entry.id] || 'Action';
      return {
        id: entry.id,
        title: entry.title,
        posterUrl: buildLocalFlashUrl(entry.dir, entry.poster),
        bundleUrl: buildLocalFlashUrl(entry.dir, entry.swf),
        engine: 'ruffle',
        category: 'flash',
        platformBadge: 'SWF',
        subGenre,
        controlProfile: 'flash-pc',
        subtitle: `NL Flash · ${subGenre}`,
        priorityRank: 1000 - idx,
      };
    });
  } catch {
    return [];
  }
}
