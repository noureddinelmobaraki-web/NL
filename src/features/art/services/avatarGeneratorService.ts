/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Avatar & Identity Lab Generator Service:
 * - DiceBear v9 API (9 artistic styles: pixel-art, adventurer, lorelei, bottts, avataaars, notionists, fun-emoji, identicon, shapes)
 * - RoboHash API (sets 1..4: Robots, Monsters, 3D Mecha Heads, Cyber Cats)
 * - Waifu.pics SFW Anime Art API
 */

import type { AvatarConfigState, DiceBearStyleId } from '../types/art.types';

export const DICEBEAR_STYLES: Array<{
  id: DiceBearStyleId;
  label: string;
  badge: string;
}> = [
  { id: 'pixel-art', label: 'Pixel Art', badge: '8-Bit Retro' },
  { id: 'adventurer', label: 'Adventurer', badge: 'RPG Hero' },
  { id: 'lorelei', label: 'Lorelei', badge: 'Modern Portrait' },
  { id: 'bottts', label: 'Bottts', badge: 'Cyber Robot' },
  { id: 'avataaars', label: 'Avataaars', badge: 'Cartoon Studio' },
  { id: 'notionists', label: 'Notionists', badge: 'Minimal Ink' },
  { id: 'fun-emoji', label: 'Fun Emoji', badge: 'Expressive' },
  { id: 'identicon', label: 'Identicon', badge: 'Geometric' },
  { id: 'shapes', label: 'Shapes', badge: 'Abstract Art' },
];

export const ROBOHASH_SETS: Array<{
  id: 'set1' | 'set2' | 'set3' | 'set4';
  label: string;
}> = [
  { id: 'set1', label: 'Classic Robots' },
  { id: 'set2', label: 'Retro Monsters' },
  { id: 'set3', label: '3D Mecha Heads' },
  { id: 'set4', label: 'Cyber Kittens' },
];

export function buildAvatarImageUrl(config: AvatarConfigState): string {
  const cleanSeed = encodeURIComponent(config.seed.trim() || 'Nordine-NL');
  const cleanBg = config.backgroundColor.replace(/^#/, '');

  if (config.engine === 'robohash') {
    return `https://robohash.org/${cleanSeed}.png?set=${config.robohashSet}&size=400x400`;
  }

  const u = new URL(`https://api.dicebear.com/9.x/${config.dicebearStyle}/svg`);
  u.searchParams.set('seed', config.seed.trim() || 'Nordine-NL');
  if (cleanBg && cleanBg !== 'transparent') {
    u.searchParams.set('backgroundColor', cleanBg);
  }
  if (config.radius > 0) {
    u.searchParams.set('radius', String(config.radius));
  }
  return u.toString();
}

export async function fetchRandomWaifuPortrait(
  category: 'waifu' | 'neko' | 'shinobu' | 'megumin' = 'waifu',
  signal?: AbortSignal,
): Promise<string | null> {
  try {
    const res = await fetch(`https://api.waifu.pics/sfw/${category}`, {
      signal: signal ?? AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { url?: string };
    return typeof json?.url === 'string' ? json.url : null;
  } catch {
    return null;
  }
}
