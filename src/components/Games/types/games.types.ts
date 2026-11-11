/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Unified Type Definitions for Multi-Engine Games Hub
 */

export type EmulatorEngine =
  | 'ruffle'
  | 'nostalgist'
  | 'js-dos'
  | 'html5'
  | 'mini-api';

export type GameCategory =
  | 'all'
  | 'flash'
  | 'retro'
  | 'dos'
  | 'web'
  | 'brain'
  | 'favorites';

export type FlashSubGenre =
  | 'All'
  | 'Action'
  | 'Platformer'
  | 'Arcade'
  | 'Shooter'
  | 'Fighting'
  | 'Racing'
  | 'RPG';

export type ConsoleCore =
  | 'fceumm' // NES
  | 'mgba' // GBA
  | 'gambatte' // GB / GBC
  | 'snes9x' // SNES
  | 'genesis_plus_gx'; // Sega Genesis / Mega Drive

export type ControlProfile = 'flash-pc' | 'console-pad' | 'direct-touch';

export type MiniGameKind = 'lichess-daily' | 'blackjack-21' | 'gamer-trivia' | 'poke-battle';

export interface UnifiedGameItem {
  id: string;
  title: string;
  posterUrl: string;
  engine: EmulatorEngine;
  category: Exclude<GameCategory, 'all' | 'favorites'>;
  platformBadge: 'SWF' | 'NES' | 'GBA' | 'GB' | 'GBC' | 'GEN' | 'DOS' | 'WEB' | 'API';
  subGenre?: FlashSubGenre | string;
  /** Direct playable URL (.swf, .gb, .gba, .nes, .jsdos, or iframe URL) if already known */
  bundleUrl?: string;
  /** Archive.org identifier for dynamic metadata resolution */
  archiveIdentifier?: string;
  /** Emulator core for RetroArch Nostalgist */
  consoleCore?: ConsoleCore;
  /** Default touch control profile */
  controlProfile: ControlProfile;
  /** Mini-game identifier when engine === 'mini-api' */
  miniGameKind?: MiniGameKind;
  /** Author / Developer / Year info */
  subtitle?: string;
  /** Priority boost so NL Flash games appear first in 'all' */
  priorityRank?: number;
}

export interface ResolvedGameBundle {
  playableUrl: string;
  engine: EmulatorEngine;
  consoleCore?: ConsoleCore;
  miniGameKind?: MiniGameKind;
  controlProfile: ControlProfile;
}

export interface GamesUserPrefs {
  favorites: string[];
  recentIds: string[];
  triviaHighScore: number;
  blackjackChips: number;
}
