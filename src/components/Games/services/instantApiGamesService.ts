/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Instant API Games Data Service
 * - Lichess Daily Puzzle API (`https://lichess.org/api/puzzle/daily`)
 * - Deck of Cards API (`https://deckofcardsapi.com/api/deck/`)
 * - OpenTDB Video Games Trivia (`https://opentdb.com/api.php?amount=10&category=15&type=multiple`)
 * - PokéAPI v2 (`https://pokeapi.co/api/v2/pokemon/{id}`)
 */

export interface LichessDailyPuzzle {
  id: string;
  rating: number;
  plays: number;
  themes: string[];
  pgn: string;
}

export interface DeckCard {
  code: string;
  image: string;
  value: string;
  suit: string;
}

export interface TriviaQuestionItem {
  question: string;
  correctAnswer: string;
  options: string[];
  difficulty: string;
}

export interface PokeFighter {
  id: number;
  name: string;
  spriteFront: string;
  spriteBack: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  moves: string[];
}

function decodeHtmlEntities(input: string): string {
  if (typeof document === 'undefined') return input;
  const txt = document.createElement('textarea');
  txt.innerHTML = input;
  return txt.value;
}

export async function fetchLichessDailyPuzzle(
  signal?: AbortSignal,
): Promise<LichessDailyPuzzle | null> {
  try {
    const res = await fetch('https://lichess.org/api/puzzle/daily', { signal });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      id: data?.puzzle?.id || 'daily',
      rating: Number(data?.puzzle?.rating) || 1650,
      plays: Number(data?.puzzle?.plays) || 12400,
      themes: Array.isArray(data?.puzzle?.themes)
        ? data.puzzle.themes.slice(0, 4)
        : ['middlegame', 'tactics'],
      pgn: String(data?.game?.pgn || ''),
    };
  } catch {
    return null;
  }
}

export async function drawFreshBlackjackDeck(
  count = 10,
  signal?: AbortSignal,
): Promise<DeckCard[]> {
  try {
    const res = await fetch(
      `https://deckofcardsapi.com/api/deck/new/draw/?count=${count}`,
      { signal },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.cards) ? data.cards : [];
  } catch {
    return [];
  }
}

export function calculateHandScore(cards: DeckCard[]): number {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.value === 'ACE') {
      aces += 1;
      total += 11;
    } else if (['KING', 'QUEEN', 'JACK', '10'].includes(c.value)) {
      total += 10;
    } else {
      total += Number(c.value) || 0;
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}

export async function fetchGamerTriviaQuestions(
  signal?: AbortSignal,
): Promise<TriviaQuestionItem[]> {
  try {
    const res = await fetch(
      'https://opentdb.com/api.php?amount=10&category=15&type=multiple',
      { signal },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const results = Array.isArray(data?.results) ? data.results : [];
    return results.map((r: Record<string, unknown>) => {
      const correct = decodeHtmlEntities(String(r.correct_answer || ''));
      const incorrect = Array.isArray(r.incorrect_answers)
        ? r.incorrect_answers.map((x) => decodeHtmlEntities(String(x)))
        : [];
      const options = [...incorrect, correct].sort(() => Math.random() - 0.5);
      return {
        question: decodeHtmlEntities(String(r.question || '')),
        correctAnswer: correct,
        options,
        difficulty: String(r.difficulty || 'medium'),
      };
    });
  } catch {
    return [];
  }
}

export async function fetchRandomPokeFighter(
  id?: number,
  signal?: AbortSignal,
): Promise<PokeFighter | null> {
  const pokeId = id ?? Math.floor(Math.random() * 151) + 1;
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokeId}`, {
      signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const hpStat =
      data?.stats?.find((s: { stat?: { name?: string } }) => s.stat?.name === 'hp')
        ?.base_stat || 80;
    const atkStat =
      data?.stats?.find((s: { stat?: { name?: string } }) => s.stat?.name === 'attack')
        ?.base_stat || 65;
    const defStat =
      data?.stats?.find((s: { stat?: { name?: string } }) => s.stat?.name === 'defense')
        ?.base_stat || 60;
    const moves = Array.isArray(data?.moves)
      ? data.moves
          .slice(0, 4)
          .map((m: { move?: { name?: string } }) =>
            String(m.move?.name || 'tackle').replace(/-/g, ' '),
          )
      : ['thunderbolt', 'quick attack', 'iron tail', 'slam'];

    const maxHp = hpStat * 2;
    return {
      id: pokeId,
      name: String(data?.name || 'Pikachu').toUpperCase(),
      spriteFront:
        data?.sprites?.front_default ||
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokeId}.png`,
      spriteBack:
        data?.sprites?.back_default ||
        data?.sprites?.front_default ||
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${pokeId}.png`,
      hp: maxHp,
      maxHp,
      attack: atkStat,
      defense: defStat,
      moves: moves.length ? moves : ['tackle', 'hyper beam'],
    };
  } catch {
    return null;
  }
}
