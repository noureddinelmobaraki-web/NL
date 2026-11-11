/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Open-Source Web & HTML5 Arcade Catalog + Instant Brain/Card API Games
 */

import type { UnifiedGameItem } from '../types/games.types';

export const INSTANT_BRAIN_AND_CARD_GAMES: UnifiedGameItem[] = [
  {
    id: 'mini-lichess-daily',
    title: 'Lichess Daily Chess & Tactics',
    posterUrl: 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/ico/Games.png',
    engine: 'mini-api',
    category: 'brain',
    platformBadge: 'API',
    miniGameKind: 'lichess-daily',
    controlProfile: 'direct-touch',
    subtitle: 'Lichess Live API · Daily Puzzle & Board',
    priorityRank: 520,
  },
  {
    id: 'mini-blackjack-21',
    title: 'NL Retro Blackjack 21',
    posterUrl: 'https://deckofcardsapi.com/static/img/AS.png',
    engine: 'mini-api',
    category: 'brain',
    platformBadge: 'API',
    miniGameKind: 'blackjack-21',
    controlProfile: 'direct-touch',
    subtitle: 'Deck of Cards API · Casino Table',
    priorityRank: 518,
  },
  {
    id: 'mini-gamer-trivia',
    title: 'Video Games Trivia Arcade',
    posterUrl: 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/ico/Retro.png',
    engine: 'mini-api',
    category: 'brain',
    platformBadge: 'API',
    miniGameKind: 'gamer-trivia',
    controlProfile: 'direct-touch',
    subtitle: 'OpenTDB Category 15 · High Score',
    priorityRank: 516,
  },
  {
    id: 'mini-poke-battle',
    title: 'PokéAPI Retro Battle Arena',
    posterUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
    engine: 'mini-api',
    category: 'brain',
    platformBadge: 'API',
    miniGameKind: 'poke-battle',
    controlProfile: 'direct-touch',
    subtitle: 'PokéAPI v2 · Turn-Based Duel',
    priorityRank: 514,
  },
];

export const WEB_ARCADE_GAMES: UnifiedGameItem[] = [
  {
    id: 'web-lichess-tv-arena',
    title: 'Lichess Grandmaster Live TV',
    posterUrl: 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/ico/Games.png',
    bundleUrl: 'https://lichess.org/tv/frame?theme=brown&bg=dark',
    engine: 'html5',
    category: 'web',
    platformBadge: 'WEB',
    controlProfile: 'direct-touch',
    subtitle: 'Lichess TV · Live Masters Match',
    priorityRank: 290,
  },
  {
    id: 'ia-flash-pacman',
    title: 'Pac-Man Classic Flash',
    posterUrl: 'https://archive.org/services/img/pacman_flash',
    archiveIdentifier: 'pacman_flash',
    engine: 'ruffle',
    category: 'web',
    platformBadge: 'SWF',
    controlProfile: 'flash-pc',
    subtitle: 'Archive.org Flash Library',
    priorityRank: 288,
  },
  {
    id: 'ia-flash-sonic',
    title: 'Ultimate Flash Sonic',
    posterUrl: 'https://archive.org/services/img/ultimate-flash-sonic',
    archiveIdentifier: 'ultimate-flash-sonic',
    engine: 'ruffle',
    category: 'web',
    platformBadge: 'SWF',
    controlProfile: 'flash-pc',
    subtitle: 'Archive.org Flash Library',
    priorityRank: 286,
  },
];

export function getInstantAndWebCatalog(): UnifiedGameItem[] {
  return [...INSTANT_BRAIN_AND_CARD_GAMES, ...WEB_ARCADE_GAMES];
}
