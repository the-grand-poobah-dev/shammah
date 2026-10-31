'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  RotateCcw,
  Sparkles,
  Trophy,
  Check,
  Ship,
} from 'lucide-react';
import { playSound } from '../../lib/soundEffects';
import { submitArcadeScore, NOAH_ANIMALS } from '../../lib/data/arcadeApi';
import ArcadeGameShell from './ArcadeGameShell';

export default function NoahArkGame({ isOpen, onClose, currentUser, bestScore = 0 }) {
  const [cards, setCards] = useState([]);
  const [flippedCards, setFlippedCards] = useState([]);
  const [matchedPairs, setMatchedPairs] = useState([]);
  const [timeLeft, setTimeLeft] = useState(45);
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isWon, setIsWon] = useState(false);
  const [gameOverDetails, setGameOverDetails] = useState(null);

  const startTimeRef = useRef(Date.now());
  const timerRef = useRef(null);

  const initDeck = useCallback(() => {
    const deck = [...NOAH_ANIMALS, ...NOAH_ANIMALS]
      .map((item, index) => ({
        uniqueId: `${item.id}-${index}`,
        animalId: item.id,
        emoji: item.emoji,
        name: item.name,
      }))
      .sort(() => Math.random() - 0.5);

    setCards(deck);
    setFlippedCards([]);
    setMatchedPairs([]);
    setTimeLeft(45);
    setScore(0);
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

  const handleGameFinishRef = useRef(handleGameFinish);
  handleGameFinishRef.current = handleGameFinish;

  // Ark Timer countdown
  useEffect(() => {
    if (!isOpen || isGameOver || isWon) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleGameFinishRef.current(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [isOpen, isGameOver, isWon]);

  async function handleGameFinish(won) {
    setIsGameOver(true);
    setIsWon(won);
    playSound(won ? 'bell' : 'reaction');
    const durationMs = Date.now() - startTimeRef.current;

    const finalScore = won
      ? Math.round(500 + timeLeft * 25)
      : Math.round(matchedPairs.length * 60);

    setScore(finalScore);

    try {
      const res = await submitArcadeScore({
        gameSlug: 'ark',
        score: finalScore,
        durationMs,
        meta: { pairs_rescued: matchedPairs.length + (won ? 1 : 0), won },
      });

      setGameOverDetails({
        title: won ? 'All Animals on the Ark!' : 'The Flood Started!',
        message: won
          ? `God remembered Noah and every creature on the ark! (Genesis 8:1) You finished with ${timeLeft}s remaining!`
          : `You loaded ${matchedPairs.length} of 6 pairs before time expired.`,
        unlockedAchievements: res.unlockedAchievements,
      });
    } catch {
      setGameOverDetails({
        title: won ? 'Victory!' : 'Time Expired',
        message: `Final Score: ${finalScore} points!`,
      });
    }
  }

  function handleCardClick(card) {
    if (flippedCards.length >= 2 || flippedCards.some((c) => c.uniqueId === card.uniqueId)) return;
    if (matchedPairs.includes(card.animalId)) return;

    playSound('click');
    const newFlipped = [...flippedCards, card];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      if (newFlipped[0].animalId === newFlipped[1].animalId) {
        playSound('reaction');
        setMatchedPairs((prev) => {
          const next = [...prev, newFlipped[0].animalId];
          if (next.length === NOAH_ANIMALS.length) {
            setTimeout(() => handleGameFinish(true), 400);
          }
          return next;
        });
        setTimeout(() => setFlippedCards([]), 400);
      } else {
        setTimeout(() => setFlippedCards([]), 850);
      }
    }
  }

  return (
    <ArcadeGameShell
      isOpen={isOpen}
      onClose={onClose}
      game={{
        slug: 'ark',
        title: 'Noah’s Ark Pair Rescue',
        icon: '🚢',
        accent: '#10b981',
      }}
      score={score || matchedPairs.length * 100}
      bestScore={bestScore}
      streak={matchedPairs.length}
      hudStats={[
        { label: 'Rain Timer', value: `${timeLeft}s`, icon: '🌧️' },
        { label: 'Ark Pairs', value: `${matchedPairs.length}/6`, icon: '🚢' },
      ]}
      isGameOver={isGameOver}
      isWon={isWon}
      gameOverDetails={gameOverDetails}
      onRestart={initDeck}
    >
      <div className="w-full max-w-xl py-2 flex flex-col items-center gap-3">
        <p className="text-xs text-slate-300 text-center">
          Find and board animal pairs two-by-two before the rain floods the land!
        </p>

        {/* 3x4 Animals Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 sm:gap-3.5 w-full p-1">
          {cards.map((card) => {
            const isFlipped =
              flippedCards.some((c) => c.uniqueId === card.uniqueId) ||
              matchedPairs.includes(card.animalId);
            const isMatched = matchedPairs.includes(card.animalId);

            return (
              <button
                key={card.uniqueId}
                type="button"
                onClick={() => handleCardClick(card)}
                className={`relative aspect-square rounded-2xl p-2 flex flex-col items-center justify-center text-center transition-all duration-300 transform select-none ${
                  isFlipped
                    ? isMatched
                      ? 'bg-emerald-950/80 border-2 border-emerald-400 scale-95 shadow-lg'
                      : 'bg-slate-800 border-2 border-amber-400 scale-100 shadow-md'
                    : 'bg-slate-900 border border-white/10 hover:border-emerald-500/50 hover:scale-[1.02]'
                }`}
              >
                {isFlipped ? (
                  <>
                    <span className="text-3xl sm:text-4xl animate-bounce">{card.emoji}</span>
                    <span className="text-[10px] font-bold text-slate-200 mt-1 font-mono">
                      {card.name}
                    </span>
                    {isMatched && (
                      <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-0.5">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                        On Ark!
                      </span>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1 text-slate-500">
                    <span className="text-2xl opacity-40">🌊</span>
                    <span className="text-[10px] font-mono tracking-widest uppercase opacity-40">
                      Ark
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
