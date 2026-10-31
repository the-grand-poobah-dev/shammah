'use client';
import React, { useState, useEffect } from 'react';
import PopupSheet from '../PopupSheet';
import { Target, Trophy, RotateCcw, Check, Shield } from 'lucide-react';
import { playSound } from '../../lib/soundEffects';

export default function DavidSlingGame({ isOpen, onClose, currentUser, bestScore = 0 }) {
  const [targetPos, setTargetPos] = useState({ x: 50, y: 30 });
  const [hits, setHits] = useState(0);
  const [shots, setShots] = useState(5);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    if (!isOpen || gameOver) return;
    const interval = setInterval(() => {
      setTargetPos({
        x: Math.floor(Math.random() * 70) + 15,
        y: Math.floor(Math.random() * 50) + 20,
      });
    }, 1500);
    return () => clearInterval(interval);
  }, [isOpen, gameOver]);

  const handleSlingshot = (e) => {
    if (gameOver || shots <= 0) return;
    playSound('button');
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    const dist = Math.hypot(clickX - targetPos.x, clickY - targetPos.y);
    const nextShots = shots - 1;
    setShots(nextShots);

    if (dist < 15) {
      playSound('reaction');
      setHits((h) => h + 1);
    }

    if (nextShots <= 0) {
      setGameOver(true);
    }
  };

  const handleRestart = () => {
    setHits(0);
    setShots(5);
    setGameOver(false);
  };

  return (
    <PopupSheet open={isOpen} onClose={onClose} title="David's Sling vs Goliath" size="md">
      <div className="p-4 sm:p-5 space-y-4 text-center">
        <div className="flex items-center justify-between text-xs text-[var(--ink-muted)]">
          <span>Stones Left: {shots} / 5</span>
          <span className="font-bold text-amber-500">Hits on Giant: {hits}</span>
        </div>

        {/* Slingshot Arena */}
        <div
          onClick={handleSlingshot}
          className="relative w-full h-64 rounded-2xl bg-gradient-to-b from-sky-950/40 to-stone-900/60 border border-[var(--border)] overflow-hidden cursor-crosshair select-none"
        >
          {/* Target (Goliath) */}
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 w-12 h-12 rounded-full bg-red-600/30 border-2 border-red-500 flex items-center justify-center text-red-500 shadow-lg"
            style={{ left: `${targetPos.x}%`, top: `${targetPos.y}%` }}
          >
            <Shield size={24} />
          </div>

          <div className="absolute bottom-2 left-0 right-0 text-[10px] text-[var(--ink-muted)] opacity-60">
            Tap anywhere to sling smooth stones in faith!
          </div>
        </div>

        {gameOver && (
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500 text-xs font-semibold flex items-center justify-center gap-2">
            <Trophy size={16} />
            <span>The battle is the Lord&apos;s! Goliath felled with {hits} hits!</span>
          </div>
        )}

        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={handleRestart}
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-[var(--teal)] text-white text-xs font-semibold min-h-[44px]"
          >
            <RotateCcw size={14} />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    </PopupSheet>
  );
}
