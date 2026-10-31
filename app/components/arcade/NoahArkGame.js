'use client';
import React, { useState } from 'react';
import PopupSheet from '../PopupSheet';
import { Ship, Trophy, RotateCcw, Check, Sparkles } from 'lucide-react';
import { playSound } from '../../lib/soundEffects';
import { NOAH_ANIMALS } from '../../lib/data/arcadeApi';

export default function NoahArkGame({ isOpen, onClose, currentUser, bestScore = 0 }) {
  const [boardAnimals, setBoardAnimals] = useState([]);
  const [available, setAvailable] = useState(() => NOAH_ANIMALS || [
    { id: 'lion', name: 'Lion', pairCount: 0 },
    { id: 'dove', name: 'Dove', pairCount: 0 },
    { id: 'sheep', name: 'Sheep', pairCount: 0 },
    { id: 'deer', name: 'Deer', pairCount: 0 },
  ]);

  const handleBoardAnimal = (animal) => {
    playSound('button');
    setAvailable((prev) =>
      prev.map((a) => {
        if (a.id === animal.id && a.pairCount < 2) {
          const nextCount = a.pairCount + 1;
          if (nextCount === 2) {
            playSound('reaction');
          }
          return { ...a, pairCount: nextCount };
        }
        return a;
      })
    );
  };

  const allPaired = available.every((a) => a.pairCount === 2);

  const handleReset = () => {
    setAvailable((NOAH_ANIMALS || []).map((a) => ({ ...a, pairCount: 0 })));
  };

  return (
    <PopupSheet open={isOpen} onClose={onClose} title="Noah's Ark: Two by Two" size="md">
      <div className="p-4 sm:p-5 space-y-4 text-center">
        <p className="text-xs text-[var(--ink-muted)]">
          Board pairs of each living creature two by two into the Ark of Salvation!
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {available.map((animal) => (
            <button
              key={animal.id}
              type="button"
              disabled={animal.pairCount >= 2}
              onClick={() => handleBoardAnimal(animal)}
              className={`p-3.5 rounded-2xl border text-center transition-all min-h-[44px] ${
                animal.pairCount === 2
                  ? 'bg-emerald-500/15 border-emerald-500 text-emerald-500'
                  : 'bg-[var(--surface-sunken)] border-[var(--border)] text-[var(--ink)] hover:border-[var(--sec-color)]'
              }`}
            >
              <div className="text-xl mb-1">{animal.emoji || '🐾'}</div>
              <div className="text-xs font-bold">{animal.name}</div>
              <div className="text-[10px] text-[var(--ink-muted)] mt-1">
                {animal.pairCount === 2 ? 'Paired (2/2) ✓' : `${animal.pairCount}/2 Boarded`}
              </div>
            </button>
          ))}
        </div>

        {allPaired && (
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 text-xs font-bold flex items-center justify-center gap-2">
            <Check size={16} />
            <span>The Ark is safely loaded! The Covenant rainbow shines!</span>
          </div>
        )}

        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-full border border-[var(--border)] text-xs font-medium text-[var(--ink)] min-h-[44px]"
          >
            <RotateCcw size={14} />
            <span>Reset Animals</span>
          </button>
        </div>
      </div>
    </PopupSheet>
  );
}
