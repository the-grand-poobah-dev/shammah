'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  RotateCcw,
  Sparkles,
  Trophy,
  Flame,
  Check,
  BookOpen,
} from 'lucide-react';
import { playSound } from '../../lib/soundEffects';
import { submitArcadeScore } from '../../lib/data/arcadeApi';
import ArcadeGameShell from './ArcadeGameShell';

const VERSE_PAIRS = [
  {
    id: 'john316',
    ref: 'John 3:16',
    text: 'For God so loved the world that He gave His one and only Son',
    accent: '#f59e0b',
  },
  {
    id: 'phil413',
    ref: 'Philippians 4:13',
    text: 'I can do all things through Christ who strengthens me',
    accent: '#0ea5e9',
  },
  {
    id: 'rom828',
    ref: 'Romans 8:28',
    text: 'All things work together for good to those who love God',
    accent: '#10b981',
  },
  {
    id: 'psalm23',
    ref: 'Psalm 23:1',
    text: 'The Lord is my shepherd, I lack nothing',
    accent: '#8b5cf6',
  },
  {
    id: 'prov35',
    ref: 'Proverbs 3:5',
    text: 'Trust in the Lord with all your heart, lean not on your own understanding',
    accent: '#ec4899',
  },
  {
    id: 'isa4031',
    ref: 'Isaiah 40:31',
    text: 'Those who hope in the Lord will renew their strength and soar like eagles',
    accent: '#ef4444',
  },
];

export default function MemoryVerseMatchGame({ isOpen, onClose, currentUser, bestScore = 0 }) {
  const [cards, setCards] = useState([]);
  const [flippedCards, setFlippedCards] = useState([]);
  const [matchedIds, setMatchedIds] = useState([]);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isWon, setIsWon] = useState(false);
  const [gameOverDetails, setGameOverDetails] = useState(null);

  const startTimeRef = useRef(Date.now());
  const timerRef = useRef(null);

  const initDeck = useCallback(() => {
    const deck = [];
    VERSE_PAIRS.forEach((item) => {
      deck.push({
        uniqueId: `${item.id}-ref`,
        pairId: item.id,
        type: 'ref',
        label: item.ref,
        accent: item.accent,
      });
      deck.push({
        uniqueId: `${item.id}-text`,
        pairId: item.id,
        type: 'text',
        label: item.text,
        accent: item.accent,
      });
    });

    const shuffled = deck.sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setFlippedCards([]);
    setMatchedIds([]);
    setMoves(0);
    setScore(0);
    setTimeLeft(60);
    setIsGameOver(false);
    setIsWon(false);
    setGameOverDetails(null);
    startTimeRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (isOpen) {
      initDeck();
    }
  }, [isOpen, initDeck]);

  const handleGameOverRef = useRef(handleGameOver);
  handleGameOverRef.current = handleGameOver;

  // Timer countdown
  useEffect(() => {
    if (!isOpen || isGameOver || isWon) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleGameOverRef.current(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [isOpen, isGameOver, isWon]);

  async function handleGameOver(won) {
    setIsGameOver(true);
    setIsWon(won);
    playSound(won ? 'reaction' : 'bell');
    const durationMs = Date.now() - startTimeRef.current;

    const finalScore = won
      ? Math.max(100, Math.round(500 + timeLeft * 15 - moves * 5))
      : Math.round(matchedIds.length * 50);

    setScore(finalScore);

    try {
      const res = await submitArcadeScore({
        gameSlug: 'match',
        score: finalScore,
        durationMs,
        meta: { moves, pairs_matched: matchedIds.length + (won ? 1 : 0) },
      });

      setGameOverDetails({
        title: won ? 'Memory Master!' : 'Time’s Up!',
        message: won
          ? `All 6 scripture pairs matched in ${moves} moves with ${timeLeft}s remaining!`
          : `Matched ${matchedIds.length} of 6 pairs before time expired.`,
        unlockedAchievements: res.unlockedAchievements,
      });
    } catch {
      setGameOverDetails({
        title: won ? 'Victory!' : 'Round Over',
        message: `Final score: ${finalScore} points!`,
      });
    }
  }

  function handleCardClick(card) {
    if (flippedCards.length >= 2) return;
    if (flippedCards.some((c) => c.uniqueId === card.uniqueId)) return;
    if (matchedIds.includes(card.pairId)) return;

    playSound('click');
    const newFlipped = [...flippedCards, card];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);

      if (newFlipped[0].pairId === newFlipped[1].pairId) {
        // Matched!
        playSound('reaction');
        setMatchedIds((prev) => {
          const next = [...prev, newFlipped[0].pairId];
          if (next.length === VERSE_PAIRS.length) {
            setTimeout(() => handleGameOver(true), 400);
          }
          return next;
        });
        setTimeout(() => setFlippedCards([]), 400);
      } else {
        // Not a match
        setTimeout(() => setFlippedCards([]), 850);
      }
    }
  }

  return (
    <ArcadeGameShell
      isOpen={isOpen}
      onClose={onClose}
      game={{
        slug: 'match',
        title: 'Memory Verse Match',
        icon: '📖',
        accent: '#ec4899',
      }}
      score={score || matchedIds.length * 100}
      bestScore={bestScore}
      streak={matchedIds.length}
      hudStats={[
        { label: 'Time', value: `${timeLeft}s`, icon: '⏱️' },
        { label: 'Pairs', value: `${matchedIds.length}/6`, icon: '🤝' },
        { label: 'Moves', value: moves, icon: '🔄' },
      ]}
      isGameOver={isGameOver}
      isWon={isWon}
      gameOverDetails={gameOverDetails}
      onRestart={initDeck}
    >
      <div className="w-full max-w-2xl py-2 flex flex-col items-center gap-3">
        <p className="text-xs text-slate-300 text-center">
          Flip cards to match the Bible book & chapter reference with its holy verse!
        </p>

        {/* 3x4 Card Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 sm:gap-3 w-full max-h-[70dvh] overflow-y-auto p-1">
          {cards.map((card) => {
            const isFlipped =
              flippedCards.some((c) => c.uniqueId === card.uniqueId) ||
              matchedIds.includes(card.pairId);
            const isMatched = matchedIds.includes(card.pairId);

            return (
              <button
                key={card.uniqueId}
                type="button"
                onClick={() => handleCardClick(card)}
                className={`relative aspect-[3/4] sm:aspect-square rounded-2xl p-2.5 flex flex-col items-center justify-center text-center transition-all duration-300 transform select-none ${
                  isFlipped
                    ? isMatched
                      ? 'bg-emerald-950/80 border-2 border-emerald-400 shadow-lg scale-95'
                      : 'bg-slate-800 border-2 border-amber-400 shadow-md scale-100'
                    : 'bg-slate-900 border border-white/10 hover:border-pink-500/50 hover:scale-[1.02]'
                }`}
              >
                {isFlipped ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    {card.type === 'ref' ? (
                      <>
                        <span className="text-xl mb-1">📜</span>
                        <strong className="text-xs sm:text-sm font-black text-amber-300 font-mono">
                          {card.label}
                        </strong>
                      </>
                    ) : (
                      <p className="text-[10px] sm:text-[11px] leading-snug font-medium text-slate-200 line-clamp-4">
                        {card.label}
                      </p>
                    )}
                    {isMatched && (
                      <span className="mt-1 text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
                        <Check className="w-3 h-3 stroke-[3]" />
                        Matched!
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1 text-slate-500">
                    <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 opacity-40 text-pink-400" />
                    <span className="text-[10px] font-mono tracking-widest uppercase opacity-40">
                      Verse
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </ArcadeGameShell>
  );
}
