'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  RotateCcw,
  Target,
  Trophy,
  Flame,
  Award,
} from 'lucide-react';
import { playSound } from '../../lib/soundEffects';
import { submitArcadeScore } from '../../lib/data/arcadeApi';
import ArcadeGameShell from './ArcadeGameShell';

export default function DavidSlingGame({ isOpen, onClose, currentUser, bestScore = 0 }) {
  const [slingAngle, setSlingAngle] = useState(45);
  const [slingPower, setSlingPower] = useState(70);
  const [davidScore, setDavidScore] = useState(0);
  const [davidStonesLeft, setDavidStonesLeft] = useState(5);
  const [goliathHitMessage, setGoliathHitMessage] = useState('');
  const [isThrowing, setIsThrowing] = useState(false);
  const [stonePosition, setStonePosition] = useState({ x: 40, y: 180 });
  const [goliathHits, setGoliathHits] = useState(0);

  const [isGameOver, setIsGameOver] = useState(false);
  const [isWon, setIsWon] = useState(false);
  const [gameOverDetails, setGameOverDetails] = useState(null);

  const startTimeRef = useRef(Date.now());

  function handleReset() {
    setDavidStonesLeft(5);
    setDavidScore(0);
    setGoliathHits(0);
    setGoliathHitMessage('');
    setIsThrowing(false);
    setStonePosition({ x: 40, y: 180 });
    setIsGameOver(false);
    setIsWon(false);
    setGameOverDetails(null);
    startTimeRef.current = Date.now();
  }

  useEffect(() => {
    if (isOpen) {
      handleReset();
    }
  }, [isOpen]);

  async function finishGame(finalScore, hitCount) {
    setIsGameOver(true);
    const won = hitCount > 0;
    setIsWon(won);
    playSound(won ? 'reaction' : 'bell');
    const durationMs = Date.now() - startTimeRef.current;

    try {
      const res = await submitArcadeScore({
        gameSlug: 'david',
        score: finalScore,
        durationMs,
        meta: { goliath_down: won, stones_left: 0, hits: hitCount },
      });

      setGameOverDetails({
        title: won ? 'Goliath Has Fallen!' : 'Valiant Effort!',
        message: won
          ? `You defeated the champion of the Philistines in the name of the Lord of Hosts! (1 Samuel 17:45)`
          : `Goliath withstood your stones. Return to the brook, gather 5 smooth stones, and try again!`,
        unlockedAchievements: res.unlockedAchievements,
      });
    } catch {
      setGameOverDetails({
        title: won ? 'Victory!' : 'Out of Stones',
        message: `Final score: ${finalScore} points!`,
      });
    }
  }

  function handleThrowStone() {
    if (isThrowing || davidStonesLeft <= 0 || isGameOver) return;
    setIsThrowing(true);
    playSound('reaction');

    const targetX = 260 + Math.sin(Date.now() / 300) * 40;
    // Calculate if hit: slingAngle between 35 and 58, power between 60 and 88
    const isHit = slingAngle >= 35 && slingAngle <= 58 && slingPower >= 60 && slingPower <= 88;

    let progress = 0;
    const anim = setInterval(() => {
      progress += 0.08;
      const curX = 40 + (targetX - 40) * progress;
      const curY = 180 - Math.sin(progress * Math.PI) * 110 * (slingPower / 70);
      setStonePosition({ x: curX, y: curY });

      if (progress >= 1) {
        clearInterval(anim);
        setIsThrowing(false);
        const stonesRemaining = davidStonesLeft - 1;
        setDavidStonesLeft(stonesRemaining);

        let newScore = davidScore;
        let newHits = goliathHits;

        if (isHit) {
          playSound('reaction');
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([30, 50, 30]);
          }
          newScore += 250;
          newHits += 1;
          setDavidScore(newScore);
          setGoliathHits(newHits);
          setGoliathHitMessage('🎯 DIRECT HIT! Goliath falls! In the name of the Lord of Hosts! (1 Sam 17:45)');
        } else {
          setGoliathHitMessage('💨 Missed! Adjust your sling angle and power for the next stone!');
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(60);
          }
        }

        setTimeout(() => {
          setStonePosition({ x: 40, y: 180 });
          if (stonesRemaining <= 0) {
            finishGame(newScore, newHits);
          }
        }, 1200);
      }
    }, 30);
  }

  return (
    <ArcadeGameShell
      isOpen={isOpen}
      onClose={onClose}
      game={{
        slug: 'david',
        title: 'David vs Goliath Sling',
        icon: '🎯',
        accent: '#0ea5e9',
      }}
      score={davidScore}
      bestScore={bestScore}
      streak={goliathHits}
      hudStats={[
        { label: 'Stones', value: davidStonesLeft, icon: '🪨' },
        { label: 'Hits', value: goliathHits, icon: '🎯' },
      ]}
      isGameOver={isGameOver}
      isWon={isWon}
      gameOverDetails={gameOverDetails}
      onRestart={handleReset}
    >
      <div className="w-full max-w-xl py-2 flex flex-col items-center gap-4">
        {/* Arena Card */}
        <div className="relative w-full h-56 sm:h-64 rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-b from-sky-950 via-slate-900 to-amber-950/40 shadow-inner">
          <div className="absolute bottom-0 inset-x-0 h-16 bg-amber-900/40 border-t border-amber-800/40" />

          {/* Young David */}
          <div className="absolute bottom-6 left-6 flex flex-col items-center">
            <span className="text-3xl sm:text-4xl">👦</span>
            <span className="text-[10px] font-bold text-amber-300 font-mono">David</span>
            <div
              className="w-10 h-0.5 bg-amber-400 origin-left mt-1"
              style={{ transform: `rotate(-${slingAngle}deg)` }}
            />
          </div>

          {/* Flying Stone */}
          {isThrowing && (
            <div
              className="absolute text-xl pointer-events-none transition-transform"
              style={{
                left: `${stonePosition.x}px`,
                top: `${stonePosition.y}px`,
              }}
            >
              🪨
            </div>
          )}

          {/* Goliath */}
          <div className="absolute bottom-6 right-8 flex flex-col items-center">
            <div className="relative">
              <span className="text-4xl sm:text-5xl">🛡️ 👹</span>
              <div className="absolute inset-0 rounded-full border-2 border-red-500/40 animate-ping pointer-events-none" />
            </div>
            <span className="text-[10px] font-bold text-red-400 font-mono mt-1">
              Goliath (9ft 9in)
            </span>
          </div>
        </div>

        {/* Status Banner */}
        {goliathHitMessage && (
          <div
            className={`w-full p-2.5 rounded-2xl text-xs text-center font-bold border animate-fadeIn ${
              goliathHitMessage.includes('HIT')
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-red-500/20 text-red-300 border-red-500/30'
            }`}
          >
            {goliathHitMessage}
          </div>
        )}

        {/* Controls Slider Box */}
        <div className="w-full p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="space-y-1 block text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Angle (Elevation):</span>
                <strong className="text-sky-400 font-mono">{slingAngle}°</strong>
              </div>
              <input
                type="range"
                min="15"
                max="80"
                value={slingAngle}
                disabled={isThrowing || davidStonesLeft <= 0}
                onChange={(e) => setSlingAngle(Number(e.target.value))}
                className="w-full accent-sky-400"
              />
              <span className="text-[10px] text-slate-500">Optimal: 40° - 55°</span>
            </label>

            <label className="space-y-1 block text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Sling Power:</span>
                <strong className="text-sky-400 font-mono">{slingPower}%</strong>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                value={slingPower}
                disabled={isThrowing || davidStonesLeft <= 0}
                onChange={(e) => setSlingPower(Number(e.target.value))}
                className="w-full accent-sky-400"
              />
              <span className="text-[10px] text-slate-500">Optimal: 65% - 85%</span>
            </label>
          </div>

          <button
            type="button"
            disabled={isThrowing || davidStonesLeft <= 0}
            onClick={handleThrowStone}
            className="w-full py-3 rounded-2xl font-black text-xs sm:text-sm text-white shadow-xl flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>
              {davidStonesLeft > 0
                ? `Launch Stone #${6 - davidStonesLeft} in Faith!`
                : 'Out of Stones! Restart Above'}
            </span>
          </button>
        </div>
      </div>
    </ArcadeGameShell>
  );
}
