/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * MS-DOS Classics Catalog Client (DOS.Zone CDN & Archive.org MS-DOS Bundles)
 */

import type { UnifiedGameItem } from '../types/games.types';

export const CURATED_DOS_CLASSICS: UnifiedGameItem[] = [
  {
    id: 'dos-doom-shareware',
    title: 'DOOM (1993 Shareware)',
    posterUrl: 'https://archive.org/services/img/DoomsharewareEpisode',
    bundleUrl: 'https://cdn.dos.zone/custom/dos/doom.jsdos',
    engine: 'js-dos',
    category: 'dos',
    platformBadge: 'DOS',
    controlProfile: 'flash-pc',
    subtitle: 'id Software · 1993 FPS',
    priorityRank: 320,
  },
  {
    id: 'dos-wolfenstein-3d',
    title: 'Wolfenstein 3D',
    posterUrl: 'https://archive.org/services/img/Wolfenstein3d',
    bundleUrl: 'https://cdn.dos.zone/original/2X/a/ac888d1660aa253f0ed53bd6c962c894125aaa19.jsdos',
    engine: 'js-dos',
    category: 'dos',
    platformBadge: 'DOS',
    controlProfile: 'flash-pc',
    subtitle: 'id Software · 1992 Action',
    priorityRank: 318,
  },
  {
    id: 'dos-prince-of-persia-1990',
    title: 'Prince of Persia (MS-DOS)',
    posterUrl: 'https://archive.org/services/img/msdos_Prince_of_Persia_1990',
    bundleUrl: 'https://cdn.dos.zone/original/2X/1/1179a728e0dc5db2a32287654d3ef25f00478e9d.jsdos',
    engine: 'js-dos',
    category: 'dos',
    platformBadge: 'DOS',
    controlProfile: 'flash-pc',
    subtitle: 'Brøderbund · 1990 Platformer',
    priorityRank: 316,
  },
  {
    id: 'dos-digger-remastered',
    title: 'Digger Classic (DOS)',
    posterUrl: 'https://archive.org/services/img/msdos_Digger_1983',
    bundleUrl: 'https://cdn.dos.zone/original/2X/7/74ef961262c5ff7fb09f968ff4d42402b4b1ab28.jsdos',
    engine: 'js-dos',
    category: 'dos',
    platformBadge: 'DOS',
    controlProfile: 'flash-pc',
    subtitle: 'Windmill Software · Arcade',
    priorityRank: 314,
  },
  {
    id: 'dos-mortal-kombat-dos',
    title: 'Mortal Kombat (MS-DOS)',
    posterUrl: 'https://archive.org/services/img/msdos_Mortal_Kombat_1993',
    bundleUrl: 'https://cdn.dos.zone/custom/dos/mk.jsdos',
    engine: 'js-dos',
    category: 'dos',
    platformBadge: 'DOS',
    controlProfile: 'flash-pc',
    subtitle: 'Midway · 1993 Fighting',
    priorityRank: 312,
  },
];

export async function fetchDosClassicsCatalog(): Promise<UnifiedGameItem[]> {
  return CURATED_DOS_CLASSICS;
}
