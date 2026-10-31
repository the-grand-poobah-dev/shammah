'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Trophy,
  Flame,
  CheckCircle2,
  XCircle,
  ChevronRight,
  RotateCcw,
  BookOpen,
  Clock,
  Sparkles,
} from 'lucide-react';
import { playSound } from '../../lib/soundEffects';
import { getArcadeQuestions, submitArcadeScore } from '../../lib/data/arcadeApi';
import ArcadeGameShell from './ArcadeGameShell';

export default function BibleTriviaGame({ isOpen, onClose, currentUser, bestScore = 0 }) {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [tier, setTier] = useState('all'); // all | kids | teens | youth
  const [questionTimeLeft, setQuestionTimeLeft] = useState(15);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameOverDetails, setGameOverDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  const timerRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  const currentQ = questions[currentIndex] || null;

  const loadQuestions = useCallback(async (difficulty) => {
    setLoading(true);
    try {
      const list = await getArcadeQuestions({ difficulty, limit: 10 });
      setQuestions(list || []);
      setCurrentIndex(0);
      setSelectedOption(null);
      setIsAnswered(false);
      setScore(0);
      setStreak(0);
      setQuestionTimeLeft(15);
      setIsGameOver(false);
      setGameOverDetails(null);
      startTimeRef.current = Date.now();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadQuestions(tier);
    }
  }, [isOpen, tier, loadQuestions]);

  // Per-question 15s timer
  useEffect(() => {
    if (!isOpen || isGameOver || isAnswered || loading || !currentQ) return;

    timerRef.current = setInterval(() => {
      setQuestionTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [isOpen, isGameOver, isAnswered, loading, currentQ]);

  function handleTimeExpired() {
    setIsAnswered(true);
    setSelectedOption(-1); // timed out
    playSound('click');
    setStreak(0);
  }

  function handleSelectOption(idx) {
    if (isAnswered || isGameOver) return;
    setIsAnswered(true);
    setSelectedOption(idx);

    if (idx === currentQ.correct_index) {
      playSound('reaction');
      const timeBonus = Math.max(0, questionTimeLeft * 10);
      const pointsEarned = 100 + timeBonus + streak * 25;
      setScore((s) => s + pointsEarned);
      setStreak((st) => st + 1);
    } else {
      playSound('click');
      setStreak(0);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([40, 60, 40]);
      }
    }
  }

  async function handleNextQuestion() {
    if (currentIndex + 1 >= questions.length) {
      // Quiz completed!
      setIsGameOver(true);
      playSound('bell');
      const durationMs = Date.now() - startTimeRef.current;

      try {
        const res = await submitArcadeScore({
          gameSlug: 'trivia',
          score,
          durationMs,
          meta: { correct_count: Math.round(score / 100), total: questions.length },
        });

        setGameOverDetails({
          title: score >= 600 ? 'Bible Champion! 🏆' : 'Great Job!',
          message: `You completed all ${questions.length} questions and scored ${score} points!`,
          unlockedAchievements: res.unlockedAchievements,
        });
      } catch {
        setGameOverDetails({
          title: 'Quiz Complete!',
          message: `Your final score: ${score} points!`,
        });
      }
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setQuestionTimeLeft(15);
    }
  }

  return (
    <ArcadeGameShell
      isOpen={isOpen}
      onClose={onClose}
      game={{
        slug: 'trivia',
        title: 'Bible Champions Trivia',
        icon: '🏆',
        accent: '#f59e0b',
      }}
      score={score}
      bestScore={bestScore}
      streak={streak}
      hudStats={[
        { label: 'Timer', value: `${questionTimeLeft}s`, icon: '⏱️' },
        { label: 'Question', value: `${currentIndex + 1}/${questions.length || 10}`, icon: '❓' },
      ]}
      isGameOver={isGameOver}
      isWon={score >= 500}
      gameOverDetails={gameOverDetails}
      onRestart={() => loadQuestions(tier)}
    >
      <div className="w-full max-w-xl py-2 flex flex-col items-center justify-between gap-4">
        {/* Tier Selector Chips */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/40 border border-white/10 text-xs">
          {[
            { id: 'all', label: 'All Books' },
            { id: 'kids', label: '👶 Kids' },
            { id: 'teens', label: '⚡ Teens' },
            { id: 'youth', label: '📖 Youth/Adults' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTier(t.id)}
              className={`px-3 py-1 rounded-xl font-bold transition-all ${
                tier === t.id
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400 animate-pulse">
            Loading inspiring Bible questions...
          </div>
        ) : !currentQ ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No questions available for this tier.
          </div>
        ) : (
          <div className="w-full space-y-4">
            {/* Progress line */}
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>

            {/* Question Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-white/10 shadow-lg text-center space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300">
                {currentQ.category || 'Scripture Knowledge'}
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
                {currentQ.question}
              </h3>
            </div>

            {/* Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {currentQ.options?.map((opt, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = isAnswered && idx === currentQ.correct_index;
                const isWrong = isAnswered && isSelected && idx !== currentQ.correct_index;

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isAnswered}
                    onClick={() => handleSelectOption(idx)}
                    className={`p-3 sm:p-3.5 rounded-2xl border text-left flex items-center justify-between gap-2.5 transition-all active:scale-95 ${
                      isCorrect
                        ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200 font-bold shadow-lg'
                        : isWrong
                        ? 'bg-red-600/30 border-red-400 text-red-200'
                        : isSelected
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                        : 'bg-white/[0.03] border-white/10 hover:border-amber-400/50 hover:bg-white/[0.06] text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center text-xs font-mono font-bold text-amber-300 flex-shrink-0">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="text-xs sm:text-sm font-medium leading-snug">{opt}</span>
                    </div>

                    {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                    {isWrong && <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Scripture reference explanation & Next Button */}
            {isAnswered && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
                <div className="text-xs space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-amber-400 font-mono">
                    📖 Scripture Reference
                  </span>
                  <p className="text-slate-200 italic">{currentQ.reference}</p>
                </div>
                <button
                  type="button"
                  onClick={handleNextQuestion}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 font-bold text-xs text-slate-950 flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 flex-shrink-0"
                >
                  <span>{currentIndex + 1 >= questions.length ? 'View Final Results' : 'Next Question'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </ArcadeGameShell>
  );
}
