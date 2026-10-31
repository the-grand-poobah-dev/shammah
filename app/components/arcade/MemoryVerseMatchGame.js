'use client';
import React, { useState, useEffect } from 'react';
import PopupSheet from '../PopupSheet';
import { Trophy, RotateCcw, Check, Sparkles } from 'lucide-react';
import { playSound } from '../../lib/soundEffects';

const CARDS_DATA = [
  { id: 1, val: 'Genesis 1:1', matchId: 101 },
  { id: 101, val: 'In the beginning God created...', matchId: 1 },
  { id: 2, val: 'John 3:16', matchId: 102 },
  { id: 102, val: 'For God so loved the world...', matchId: 2 },
  { id: 3, val: 'Psalm 23:1', matchId: 103 },
  { id: 103, val: 'The Lord is my shepherd...', matchId: 3 },
  { id: 4, val: 'Romans 8:28', matchId: 104 },
  { id: 104, val: 'All things work together for good...', matchId: 4 },
];

export default function MemoryVerseMatchGame({ isOpen, onClose, currentUser, bestScore = 0 }) {
  const [cards, setCards] = useState(() => [...CARDS_DATA].sort(() => Math.random() - 0.5));
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);

  const handleCardClick = (card) => {
    if (flipped.length >= 2 || flipped.includes(card.id) || matched.includes(card.id)) return;
    playSound('button');
    const nextFlipped = [...flipped, card.id];
    setFlipped(nextFlipped);

    if (nextFlipped.length === 2) {
      setMoves((m) => m + 1);
      const [firstId, secondId] = nextFlipped;
      const firstCard = cards.find((c) => c.id === firstId);
      const secondCard = cards.find((c) => c.id === secondId);

      if (firstCard.matchId === secondCard.id) {
        playSound('reaction');
        setMatched((prev) => [...prev, firstId, secondId]);
        setFlipped([]);
      } else {
        setTimeout(() => {
          setFlipped([]);
        }, 1000);
      }
    }
  };

  const handleReset = () => {
    setCards([...CARDS_DATA].sort(() => Math.random() - 0.5));
    setFlipped([]);
    setMatched([]);
    setMoves(0);
  };

  return (
    <PopupSheet open={isOpen} onClose={onClose} title="Memory Verse Match" size="md">
      <div className="p-4 sm:p-5 space-y-4 text-center">
        <div className="flex items-center justify-between text-xs text-[var(--ink-muted)]">
          <span>Pairs: {matched.length / 2} / 4</span>
          <span>Moves: {moves}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {cards.map((card) => {
            const isFlipped = flipped.includes(card.id) || matched.includes(card.id);
            const isMatched = matched.includes(card.id);

            return (
              <button
                key={card.id}
                type="button"
                onClick={() => handleCardClick(card)}
                className={`p-3 h-24 rounded-2xl border text-xs font-semibold flex items-center justify-center transition-all min-h-[44px] ${
                  isMatched
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-500'
                    : isFlipped
                      ? 'bg-[var(--teal)]/20 border-[var(--teal)] text-[var(--teal)]'
                      : 'bg-[var(--surface-sunken)] border-[var(--border)] text-[var(--ink-muted)] hover:border-[var(--sec-color)]'
                }`}
              >
                {isFlipped ? card.val : <Sparkles size={18} className="opacity-40" />}
              </button>
            );
          })}
        </div>

        {matched.length === cards.length && (
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 text-xs font-bold flex items-center justify-center gap-2">
            <Check size={16} />
            <span>Victory! You matched all Scriptures in {moves} moves!</span>
          </div>
        )}

        <div className="flex items-center justify-center pt-2">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-5 py-2 rounded-full border border-[var(--border)] text-xs font-medium text-[var(--ink)] min-h-[44px]"
          >
            <RotateCcw size={14} />
            <span>Play Again</span>
          </button>
        </div>
      </div>
    </PopupSheet>
  );
}
