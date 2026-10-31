'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  RotateCcw,
  Volume2,
  VolumeX,
  Pause,
  Play,
  Trophy,
  Flame,
  Sparkles,
  Share2,
  Check,
  AlertCircle,
  Award,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { playSound } from '../../lib/soundEffects';

export default function ArcadeGameShell({
  isOpen,
  onClose,
  game,
  score = 0,
  bestScore = 0,
  streak = 0,
  hudStats = [],
  isGameOver = false,
  isWon = false,
  gameOverDetails = null,
  onRestart,
  onPauseChange,
  children,
}) {
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Auto-pause when browser tab is hidden
  useEffect(() => {
    function handleVisibility() {
      if (document.hidden && !isGameOver) {
        setIsPaused(true);
        if (onPauseChange) onPauseChange(true);
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isGameOver, onPauseChange]);

  // Keyboard shortcut controls: Esc to pause, M to toggle mute
  useEffect(() => {
    function handleKeyDown(e) {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        if (!isGameOver) {
          setIsPaused((p) => {
            const next = !p;
            if (onPauseChange) onPauseChange(next);
            return next;
          });
        }
      } else if (e.key === 'm' || e.key === 'M') {
        setIsMuted((m) => !m);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isGameOver, onPauseChange]);

  if (!isOpen || !game) return null;

  const accent = game.accent || '#f59e0b';

  function togglePause() {
    playSound('click');
    const next = !isPaused;
    setIsPaused(next);
    if (onPauseChange) onPauseChange(next);
  }

  function handleShareResult() {
    playSound('postPublished');
    const shareText = `🎮 Faith Champions Arcade — ${game.title}!\n🏆 I just scored ${score} Points! (Streak: ${streak}🔥)\nCan you beat my high score on Shammah?`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95 backdrop-blur-md text-white select-none animate-fadeIn overflow-hidden"
      style={{
        height: '100dvh',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      role="dialog"
      aria-modal="true"
      aria-label={game.title}
    >
      {/* Top HUD Bar */}
      <header
        className="w-full h-14 sm:h-16 px-3 sm:px-6 flex items-center justify-between border-b flex-shrink-0 z-20"
        style={{
          background: 'var(--surface, #0f172a)',
          borderColor: 'var(--border, rgba(255,255,255,0.1))',
        }}
      >
        {/* Game Title & Icon */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-lg shadow-sm"
            style={{ background: `${accent}25`, border: `1px solid ${accent}50` }}
          >
            <span>{game.icon || '🎮'}</span>
          </div>
          <div className="hidden xs:block">
            <h2 className="text-xs sm:text-sm font-bold tracking-tight truncate max-w-[140px] sm:max-w-xs">
              {game.title}
            </h2>
            <span className="text-[10px] text-slate-400 block font-mono">
              High Score: {bestScore}
            </span>
          </div>
        </div>

        {/* Center Live Stats / Score HUD */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/40 border border-white/10 shadow-inner">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-xs sm:text-sm font-black text-amber-300 font-mono tracking-wider">
              {score}
            </span>
          </div>

          {streak > 1 && (
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-red-500/15 border border-red-500/30 text-amber-300 text-xs font-bold animate-pulse">
              <Flame className="w-3.5 h-3.5 fill-red-500 text-red-500" />
              <span>{streak}x</span>
            </div>
          )}

          {/* Dynamic Game-Specific HUD chips (lives, stones left, timer, pairs) */}
          {hudStats.map((stat, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-xs font-bold font-mono"
            >
              {stat.icon && <span>{stat.icon}</span>}
              <span className="text-slate-300 text-[11px] hidden md:inline">{stat.label}:</span>
              <strong className="text-white">{stat.value}</strong>
            </div>
          ))}
        </div>

        {/* Right Action Controls: Mute, Pause, Restart, Exit */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsMuted((m) => !m)}
            aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors text-slate-300"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {!isGameOver && (
            <button
              type="button"
              onClick={togglePause}
              aria-label={isPaused ? 'Resume game' : 'Pause game'}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors text-slate-300"
            >
              {isPaused ? <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" /> : <Pause className="w-4 h-4" />}
            </button>
          )}

          <button
            type="button"
            onClick={onRestart}
            aria-label="Restart game"
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors text-slate-300"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (score > 50 && !isGameOver) {
                setShowExitConfirm(true);
              } else {
                onClose();
              }
            }}
            aria-label="Exit game"
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-red-500/20 text-slate-300 hover:text-red-400 transition-colors ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Game Screen Viewport */}
      <main className="relative flex-1 w-full overflow-hidden flex flex-col items-center justify-center p-2 sm:p-4">
        {children}

        {/* Pause Overlay Sheet */}
        {isPaused && !isGameOver && (
          <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
            <div className="w-full max-w-sm rounded-2xl p-6 bg-slate-900 border border-white/10 text-center space-y-4 shadow-2xl">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <Pause className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Game Paused</h3>
                <p className="text-xs text-slate-400 mt-1">Take a breath, meditate on God’s grace, and jump back in!</p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={togglePause}
                  className="w-full py-2.5 rounded-xl font-bold text-xs text-white shadow-lg flex items-center justify-center gap-2"
                  style={{ background: `linear-gradient(135deg, ${accent}, #10b981)` }}
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Resume Game</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPaused(false);
                    onRestart();
                  }}
                  className="w-full py-2.5 rounded-xl font-bold text-xs border border-white/10 hover:bg-white/5 text-slate-300 flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Restart Round</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl font-bold text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  Quit to Arcade Hub
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Exit Confirmation Dialog */}
        {showExitConfirm && (
          <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
            <div className="w-full max-w-sm rounded-2xl p-6 bg-slate-900 border border-white/15 text-center space-y-4 shadow-2xl">
              <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
              <div>
                <h3 className="text-base font-bold text-white">Leave Active Game?</h3>
                <p className="text-xs text-slate-400 mt-1">
                  You have <strong>{score} points</strong> in progress. Leaving now will submit your current round score.
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 font-bold text-xs hover:bg-white/5"
                >
                  Keep Playing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowExitConfirm(false);
                    onClose();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 font-bold text-xs text-white"
                >
                  Confirm Exit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results Sheet / Game Over Screen */}
        {isGameOver && (
          <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn overflow-y-auto">
            <div
              className="w-full max-w-md rounded-3xl p-6 sm:p-8 border shadow-2xl text-center space-y-5 animate-scaleUp"
              style={{
                background: 'var(--surface, #0f172a)',
                borderColor: isWon ? '#10b98150' : `${accent}50`,
              }}
            >
              {/* Crown / Trophy Celebration */}
              <div
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl flex items-center justify-center text-3xl sm:text-4xl mx-auto shadow-xl"
                style={{
                  background: isWon
                    ? 'linear-gradient(135deg, #10b981, #059669)'
                    : `linear-gradient(135deg, ${accent}, #ef4444)`,
                }}
              >
                <span>{isWon ? '👑' : '🏆'}</span>
              </div>

              <div>
                <span
                  className="px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white"
                  style={{ background: isWon ? '#10b981' : accent }}
                >
                  {isWon ? 'Victory in Christ!' : 'Round Completed'}
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-white mt-1.5">
                  {gameOverDetails?.title || (isWon ? 'Well Done, Champion!' : 'Glorious Effort!')}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xs mx-auto leading-relaxed">
                  {gameOverDetails?.message || 'Every moment in the Word strengthens your spiritual foundation.'}
                </p>
              </div>

              {/* Score Display Box */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 grid grid-cols-2 gap-3 divide-x divide-white/10">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Final Score</span>
                  <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono mt-0.5">
                    {score}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Best Score</span>
                  <div className="text-2xl sm:text-3xl font-black text-white font-mono mt-0.5">
                    {Math.max(score, bestScore)}
                  </div>
                </div>
              </div>

              {/* Unlocked Achievements Toast */}
              {gameOverDetails?.unlockedAchievements?.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2.5 text-left text-xs text-amber-300">
                  <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <div>
                    <strong className="block text-white font-bold">New Achievement Unlocked!</strong>
                    <span>You earned badges in the Faith Champions Hall!</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={onRestart}
                  className="w-full py-3 rounded-2xl font-black text-sm text-white shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95"
                  style={{ background: `linear-gradient(135deg, ${accent}, #10b981)` }}
                >
                  <RotateCcw className="w-4 h-4 stroke-[2.5]" />
                  <span>Play Again</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleShareResult}
                    className="flex-1 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 font-bold text-xs flex items-center justify-center gap-1.5 text-slate-200 transition-colors"
                  >
                    {copiedShare ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                    <span>{copiedShare ? 'Copied!' : 'Share Score'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 font-bold text-xs text-slate-200 transition-colors"
                  >
                    Return to Hub
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
