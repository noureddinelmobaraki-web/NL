/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Instant Native API Mini-Games View
 * Renders 4 instant API-powered games inside .nl-screen:
 * 1) Lichess Daily Puzzle & Live Board (`lichess-daily`)
 * 2) NL Retro Blackjack 21 via Deck of Cards API (`blackjack-21`)
 * 3) Video Games Trivia Arcade via OpenTDB Category 15 (`gamer-trivia`)
 * 4) PokéAPI Retro Battle Arena (`poke-battle`)
 */

import { useState, useEffect, useCallback } from 'react';
import { RotateCcw, Trophy, Sparkles, Swords, Zap } from 'lucide-react';
import { GlassVectorIcon } from '../../shared/icons';
import type { MiniGameKind } from '../types/games.types';
import {
  calculateHandScore,
  drawFreshBlackjackDeck,
  fetchGamerTriviaQuestions,
  fetchLichessDailyPuzzle,
  fetchRandomPokeFighter,
  type DeckCard,
  type LichessDailyPuzzle,
  type PokeFighter,
  type TriviaQuestionItem,
} from '../services/instantApiGamesService';

export interface MiniGamesNativeViewProps {
  kind: MiniGameKind;
  onReadyStateChange: (ready: boolean) => void;
}

export function MiniGamesNativeView({
  kind,
  onReadyStateChange,
}: MiniGamesNativeViewProps) {
  useEffect(() => {
    onReadyStateChange(true);
  }, [kind, onReadyStateChange]);

  if (kind === 'lichess-daily') {
    return <LichessDailyView />;
  }
  if (kind === 'blackjack-21') {
    return <Blackjack21View />;
  }
  if (kind === 'poke-battle') {
    return <PokeBattleView />;
  }
  return <GamerTriviaView />;
}

function LichessDailyView() {
  const [puzzle, setPuzzle] = useState<LichessDailyPuzzle | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchLichessDailyPuzzle(ctrl.signal).then((p) => {
      if (!ctrl.signal.aborted) setPuzzle(p);
    });
    return () => ctrl.abort();
  }, []);

  return (
    <div className="nl-mini-game-stage">
      <div className="nl-mini-header">
        <div>
          <span className="nl-mini-kicker">LICHESS.ORG LIVE API</span>
          <h3 className="nl-mini-title">Daily Tactical Chess Puzzle</h3>
        </div>
        {puzzle && (
          <div className="nl-mini-stats">
            <span>Rating: {puzzle.rating}</span>
            <span aria-hidden="true">·</span>
            <span>Plays: {puzzle.plays.toLocaleString()}</span>
          </div>
        )}
      </div>
      <div className="nl-mini-chess-frame-wrap">
        <iframe
          src="https://lichess.org/training/frame?theme=brown&bg=dark"
          title="Lichess Daily Puzzle"
          className="nl-html5-iframe"
          allow="fullscreen"
        />
      </div>
    </div>
  );
}

function Blackjack21View() {
  const [playerHand, setPlayerHand] = useState<DeckCard[]>([]);
  const [dealerHand, setDealerHand] = useState<DeckCard[]>([]);
  const [deckPool, setDeckPool] = useState<DeckCard[]>([]);
  const [phase, setPhase] = useState<'playing' | 'finished'>('playing');
  const [statusMsg, setStatusMsg] = useState('Hit or Stand to beat 21!');
  const [chips, setChips] = useState(500);

  const startRound = useCallback(async () => {
    setStatusMsg('Shuffling Deck of Cards API...');
    const cards = await drawFreshBlackjackDeck(12);
    if (cards.length < 4) {
      setStatusMsg('Could not draw cards. Try again.');
      return;
    }
    const pHand = [cards[0], cards[2]];
    const dHand = [cards[1], cards[3]];
    setPlayerHand(pHand);
    setDealerHand(dHand);
    setDeckPool(cards.slice(4));
    setPhase('playing');
    const pScore = calculateHandScore(pHand);
    if (pScore === 21) {
      setPhase('finished');
      setChips((c) => c + 75);
      setStatusMsg('BLACKJACK 21! You win +75 chips!');
    } else {
      setStatusMsg('Your turn: Hit or Stand');
    }
  }, []);

  useEffect(() => {
    startRound();
  }, [startRound]);

  const handleHit = () => {
    if (phase !== 'playing' || deckPool.length === 0) return;
    const nextCard = deckPool[0];
    const nextHand = [...playerHand, nextCard];
    setPlayerHand(nextHand);
    setDeckPool((prev) => prev.slice(1));
    const score = calculateHandScore(nextHand);
    if (score > 21) {
      setPhase('finished');
      setChips((c) => Math.max(50, c - 50));
      setStatusMsg(`Bust (${score})! Dealer wins.`);
    } else if (score === 21) {
      handleStand(nextHand);
    }
  };

  const handleStand = (customPlayerHand?: DeckCard[]) => {
    const pHand = customPlayerHand || playerHand;
    const pScore = calculateHandScore(pHand);
    const dHand = [...dealerHand];
    const pool = [...deckPool];
    while (calculateHandScore(dHand) < 17 && pool.length > 0) {
      dHand.push(pool.shift()!);
    }
    setDealerHand(dHand);
    setDeckPool(pool);
    setPhase('finished');
    const dScore = calculateHandScore(dHand);
    if (dScore > 21 || pScore > dScore) {
      setChips((c) => c + 50);
      setStatusMsg(`You win! (${pScore} vs ${dScore}) +50 chips`);
    } else if (pScore === dScore) {
      setStatusMsg(`Push Tie (${pScore} vs ${dScore})`);
    } else {
      setChips((c) => Math.max(50, c - 50));
      setStatusMsg(`Dealer wins (${dScore} vs ${pScore})`);
    }
  };

  return (
    <div className="nl-mini-game-stage nl-blackjack-felt">
      <div className="nl-mini-header">
        <div>
          <span className="nl-mini-kicker">DECK OF CARDS API · CASINO 21</span>
          <h3 className="nl-mini-title">{statusMsg}</h3>
        </div>
        <div className="nl-mini-stats">
          <Trophy size={14} /> <span>Chips: {chips}</span>
        </div>
      </div>

      <div className="nl-blackjack-zone">
        <div className="nl-hand-label">
          Dealer Hand ({phase === 'finished' ? calculateHandScore(dealerHand) : '?'})
        </div>
        <div className="nl-cards-row">
          {dealerHand.map((c, idx) => (
            <img
              key={`${c.code}_${idx}`}
              src={
                idx === 1 && phase === 'playing'
                  ? 'https://deckofcardsapi.com/static/img/back.png'
                  : c.image
              }
              alt={c.code}
              className="nl-playing-card"
              referrerPolicy="no-referrer"
            />
          ))}
        </div>
      </div>

      <div className="nl-blackjack-zone">
        <div className="nl-hand-label">
          Your Hand ({calculateHandScore(playerHand)})
        </div>
        <div className="nl-cards-row">
          {playerHand.map((c, idx) => (
            <img
              key={`${c.code}_${idx}`}
              src={c.image}
              alt={c.code}
              className="nl-playing-card"
              referrerPolicy="no-referrer"
            />
          ))}
        </div>
      </div>

      <div className="nl-mini-actions">
        {phase === 'playing' ? (
          <>
            <button type="button" className="nl-screen-btn" onClick={handleHit}>
              Hit (+Card)
            </button>
            <button
              type="button"
              className="nl-screen-btn nl-screen-btn--ghost"
              onClick={() => handleStand()}
            >
              Stand (Hold)
            </button>
          </>
        ) : (
          <button type="button" className="nl-screen-btn" onClick={startRound}>
            <RotateCcw size={15} /> Deal Next Hand
          </button>
        )}
      </div>
    </div>
  );
}

function GamerTriviaView() {
  const [questions, setQuestions] = useState<TriviaQuestionItem[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTrivia = useCallback(() => {
    setLoading(true);
    setIndex(0);
    setScore(0);
    setSelectedOpt(null);
    fetchGamerTriviaQuestions().then((q) => {
      setQuestions(q);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    loadTrivia();
  }, [loadTrivia]);

  const current = questions[index];

  const handlePick = (opt: string) => {
    if (selectedOpt) return;
    setSelectedOpt(opt);
    if (opt === current?.correctAnswer) {
      setScore((s) => s + 100);
    }
    setTimeout(() => {
      setSelectedOpt(null);
      setIndex((i) => i + 1);
    }, 1100);
  };

  return (
    <div className="nl-mini-game-stage">
      <div className="nl-mini-header">
        <div>
          <span className="nl-mini-kicker">OPENTDB CATEGORY 15 · VIDEO GAMES</span>
          <h3 className="nl-mini-title">Gamer Trivia Challenge</h3>
        </div>
        <div className="nl-mini-stats">
          <Sparkles size={14} /> <span>Score: {score}</span>
        </div>
      </div>

      {loading ? (
        <div className="nl-mini-center">Loading 10 Video Game Questions...</div>
      ) : !current ? (
        <div className="nl-mini-center">
          <h4>Final Score: {score} / 1000</h4>
          <button type="button" className="nl-screen-btn" onClick={loadTrivia}>
            <RotateCcw size={15} /> Play New Round
          </button>
        </div>
      ) : (
        <div className="nl-trivia-card">
          <div className="nl-trivia-progress">
            Question {index + 1} of {questions.length} · {current.difficulty}
          </div>
          <p className="nl-trivia-q">{current.question}</p>
          <div className="nl-trivia-grid">
            {current.options.map((opt) => {
              const isCorrect = selectedOpt && opt === current.correctAnswer;
              const isWrong =
                selectedOpt === opt && opt !== current.correctAnswer;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handlePick(opt)}
                  className={`nl-trivia-opt${isCorrect ? ' is-correct' : ''}${isWrong ? ' is-wrong' : ''}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function PokeBattleView() {
  const [hero, setHero] = useState<PokeFighter | null>(null);
  const [rival, setRival] = useState<PokeFighter | null>(null);
  const [log, setLog] = useState('Wild Pokémon appeared! Choose a move.');

  const startDuel = useCallback(async () => {
    setLog('Summoning Generation I fighters from PokéAPI...');
    const [p1, p2] = await Promise.all([
      fetchRandomPokeFighter(),
      fetchRandomPokeFighter(),
    ]);
    setHero(p1);
    setRival(p2);
    if (p1 && p2) {
      setLog(`Go ${p1.name}! Wild ${p2.name} wants to battle!`);
    }
  }, []);

  useEffect(() => {
    startDuel();
  }, [startDuel]);

  const executeMove = (moveName: string) => {
    if (!hero || !rival || hero.hp <= 0 || rival.hp <= 0) return;
    const dmgToRival = Math.max(
      12,
      Math.round((hero.attack / Math.max(30, rival.defense)) * 22 + Math.random() * 10),
    );
    const nextRivalHp = Math.max(0, rival.hp - dmgToRival);
    setRival({ ...rival, hp: nextRivalHp });

    if (nextRivalHp <= 0) {
      setLog(`${hero.name} used ${moveName.toUpperCase()}! ${rival.name} fainted! Victory!`);
      return;
    }

    const rivalMove =
      rival.moves[Math.floor(Math.random() * rival.moves.length)] || 'tackle';
    const dmgToHero = Math.max(
      10,
      Math.round((rival.attack / Math.max(30, hero.defense)) * 18 + Math.random() * 8),
    );
    const nextHeroHp = Math.max(0, hero.hp - dmgToHero);
    setHero({ ...hero, hp: nextHeroHp });

    if (nextHeroHp <= 0) {
      setLog(`${rival.name} countered with ${rivalMove.toUpperCase()}! ${hero.name} fainted!`);
    } else {
      setLog(
        `${hero.name} used ${moveName} (-${dmgToRival} HP) · ${rival.name} used ${rivalMove} (-${dmgToHero} HP)`,
      );
    }
  };

  return (
    <div className="nl-mini-game-stage">
      <div className="nl-mini-header">
        <div>
          <span className="nl-mini-kicker">POKÉAPI V2 · RETRO ARENA</span>
          <h3 className="nl-mini-title">{log}</h3>
        </div>
        <button type="button" className="nl-screen-btn" onClick={startDuel}>
          <Swords size={14} /> New Duel
        </button>
      </div>

      {hero && rival && (
        <div className="nl-poke-arena">
          <div className="nl-poke-fighter">
            <img
              src={hero.spriteFront}
              alt={hero.name}
              className="nl-poke-sprite"
              referrerPolicy="no-referrer"
            />
            <div className="nl-poke-name">{hero.name}</div>
            <div className="nl-poke-hp">
              HP: {hero.hp} / {hero.maxHp}
            </div>
          </div>

          <div className="nl-poke-vs">VS</div>

          <div className="nl-poke-fighter">
            <img
              src={rival.spriteFront}
              alt={rival.name}
              className="nl-poke-sprite"
              referrerPolicy="no-referrer"
            />
            <div className="nl-poke-name">{rival.name}</div>
            <div className="nl-poke-hp">
              HP: {rival.hp} / {rival.maxHp}
            </div>
          </div>
        </div>
      )}

      {hero && rival && hero.hp > 0 && rival.hp > 0 && (
        <div className="nl-trivia-grid">
          {hero.moves.map((mv) => (
            <button
              key={mv}
              type="button"
              className="nl-trivia-opt flex items-center justify-center gap-1.5"
              onClick={() => executeMove(mv)}
            >
              <GlassVectorIcon icon={Zap} theme="comedy" size={14} badge={false} />
              <span>{mv.toUpperCase()}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
