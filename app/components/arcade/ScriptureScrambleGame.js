'use client';
import React, { useState } from 'react';
import PopupSheet from '../PopupSheet';
import { Sparkles, Trophy, RotateCcw, Check, ArrowRight } from 'lucide-react';
import { playSound } from '../../lib/soundEffects';

const SCRAMBLE_PUZZLES = [
  {
    reference: 'John 14:6',
    scrambled: ['WAY', 'THE', 'I', 'AM', 'TRUTH', 'THE', 'AND', 'LIFE', 'THE'],
    solution: ['I', 'AM', 'THE', 'WAY', 'THE', 'TRUTH', 'AND', 'THE', 'LIFE'],
  },
  {
    reference: 'Philippians 4:13',
    scrambled: ['ALL', 'I', 'CAN', 'THINGS', 'DO', 'THROUGH', 'CHRIST'],
    solution: ['I', 'CAN', 'DO', 'ALL', 'THINGS', 'THROUGH', 'CHRIST'],
  },
  {
    reference: 'Psalm 23:1',
    scrambled: ['IS', 'LORD', 'MY', 'THE', 'SHEPHERD'],
    solution: ['THE', 'LORD', 'IS', 'MY', 'SHEPHERD'],
  },
];

export default function ScriptureScrambleGame({ isOpen, onClose, currentUser, bestScore = 0 }) {
  const [level, setLevel] = useState(0);
  const puzzle = SCRAMBLE_PUZZLES[level % SCRAMBLE_PUZZLES.length];
  const [userTiles, setUserTiles] = useState([]);
  const [availableTiles, setAvailableTiles] = useState(() =>
    puzzle.scrambled.map((w, i) => ({ id: `${i}-${w}`, word: w }))
  );
  const [solved, setSolved] = useState(false);
  const [score, setScore] = useState(0);

  const handlePickTile = (tile) => {
    playSound('button');
    setAvailableTiles((prev) => prev.filter((t) => t.id !== tile.id));
    const nextUser = [...userTiles, tile];
    setUserTiles(nextUser);

    if (nextUser.length === puzzle.solution.length) {
      const isCorrect = nextUser.every((t, i) => t.word === puzzle.solution[i]);
      if (isCorrect) {
        playSound('reaction');
        setSolved(true);
        setScore((s) => s + 100);
      }
    }
  };

  const handleRemoveTile = (tile) => {
    playSound('button');
    setUserTiles((prev) => prev.filter((t) => t.id !== tile.id));
    setAvailableTiles((prev) => [...prev, tile]);
    setSolved(false);
  };

  const handleNextLevel = () => {
    const nextLvl = level + 1;
    const nextPuzzle = SCRAMBLE_PUZZLES[nextLvl % SCRAMBLE_PUZZLES.length];
    setLevel(nextLvl);
    setUserTiles([]);
    setAvailableTiles(nextPuzzle.scrambled.map((w, i) => ({ id: `${i}-${w}`, word: w })));
    setSolved(false);
  };

  const handleReset = () => {
    setUserTiles([]);
    setAvailableTiles(puzzle.scrambled.map((w, i) => ({ id: `${i}-${w}`, word: w })));
    setSolved(false);
  };

  return (
    <PopupSheet open={isOpen} onClose={onClose} title="Scripture Scramble" size="md">
      <div className="p-4 sm:p-5 space-y-5 text-center">
        <div className="flex items-center justify-between text-xs text-[var(--ink-muted)]">
          <span className="font-semibold text-[var(--teal)]">Verse: {puzzle.reference}</span>
          <span className="flex items-center gap-1 font-bold text-amber-500">
            <Trophy size={14} /> Score: {score}
          </span>
        </div>

        {/* Selected Answer Area */}
        <div className="min-h-[72px] p-3 rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-sunken)] flex flex-wrap items-center justify-center gap-2">
          {userTiles.length === 0 ? (
            <span className="text-xs text-[var(--ink-muted)]">
              Tap the words below to arrange the Scripture in order
            </span>
          ) : (
            userTiles.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleRemoveTile(t)}
                className="px-3 py-1.5 rounded-xl bg-[var(--teal)] text-white text-xs font-bold shadow-sm transition-transform active:scale-95 min-h-[36px]"
              >
                {t.word}
              </button>
            ))
          )}
        </div>

        {/* Solved celebration */}
        {solved && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 font-semibold text-xs flex items-center justify-center gap-2">
            <Check size={16} />
            <span>Amen! That is the living Word of God!</span>
          </div>
        )}

        {/* Word bank */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {availableTiles.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handlePickTile(t)}
              className="px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] text-xs font-bold shadow-sm hover:border-[var(--sec-color)] transition-all min-h-[44px]"
            >
              {t.word}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-[var(--border)] text-xs font-medium text-[var(--ink-muted)] min-h-[44px]"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>

          {solved && (
            <button
              type="button"
              onClick={handleNextLevel}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-[var(--teal)] text-white text-xs font-bold shadow-md min-h-[44px]"
            >
              <span>Next Scripture</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </PopupSheet>
  );
}
