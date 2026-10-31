'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  RotateCcw,
  CheckCircle2,
  HelpCircle,
  Clock,
  ArrowRight,
  Flame,
  Award,
} from 'lucide-react';
import { playSound } from '../../lib/soundEffects';
import { submitArcadeScore } from '../../lib/data/arcadeApi';
import ArcadeGameShell from './ArcadeGameShell';

const SCRAMBLE_VERSES = [
  {
    reference: 'Philippians 4:13',
    text: 'I can do all things through Christ who strengthens me',
    context: 'Apostle Paul’s assurance of supernatural strength in all circumstances.',
  },
  {
    reference: 'Proverbs 3:5',
    text: 'Trust in the Lord with all your heart and lean not on your own understanding',
    context: 'The golden rule of divine guidance and total reliance on God.',
  },
  {
    reference: 'Psalm 23:1',
    text: 'The Lord is my shepherd I shall not want',
    context: 'King David’s sweet psalm of peaceful provision and protection.',
  },
  {
    reference: 'Romans 8:37',
    text: 'In all these things we are more than conquerors through him who loved us',
    context: 'Unshakeable victory over tribulation, distress, and peril.',
  },
  {
    reference: 'John 3:16',
    text: 'For God so loved the world that he gave his one and only Son',
    context: 'The heartbeat of the Gospel and God’s supreme sacrifice.',
  },
  {
    reference: 'Matthew 6:33',
    text: 'Seek first the kingdom of God and his righteousness and all these things will be added to you',
    context: 'Jesus’ cure for anxiety and divine priority of the Kingdom.',
  },
  {
    reference: 'Jeremiah 29:11',
    text: 'For I know the plans I have for you plans to prosper you and not to harm you',
    context: 'God’s covenant promise of hope and a thriving future.',
  },
  {
    reference: 'Isaiah 40:31',
    text: 'Those who hope in the Lord will renew their strength they will soar on wings like eagles',
    context: 'Tireless endurance for those who wait patiently on God.',
  },
];

export default function ScriptureScrambleGame({ isOpen, onClose, currentUser, bestScore = 0 }) {
  const [verseIndex, setVerseIndex] = useState(0);
  const [availableWords, setAvailableWords] = useState([]);
  const [selectedWords, setSelectedWords] = useState([]);
  const [score, setScore] = useState(0);
  const [roundStreak, setRoundStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameOverDetails, setGameOverDetails] = useState(null);
  const [versesCompleted, setVersesCompleted] = useState(0);

  const startTimeRef = useRef(Date.now());
  const timerRef = useRef(null);

  const currentVerse = SCRAMBLE_VERSES[verseIndex % SCRAMBLE_VERSES.length];

  // Initialize verse words
  const loadVerse = useCallback((index) => {
    const v = SCRAMBLE_VERSES[index % SCRAMBLE_VERSES.length];
    const words = v.text.split(' ').map((word, i) => ({
      id: `${word}-${i}`,
      word,
      originalIndex: i,
    }));

    // Deterministic or random shuffle
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    setAvailableWords(shuffled);
    setSelectedWords([]);
  }, []);

  const handleStartGame = useCallback(() => {
    setScore(0);
    setRoundStreak(0);
    setTimeLeft(60);
    setVersesCompleted(0);
    setIsGameOver(false);
    setGameOverDetails(null);
    setVerseIndex(0);
    startTimeRef.current = Date.now();
    loadVerse(0);
  }, [loadVerse]);

  useEffect(() => {
    if (isOpen) {
      handleStartGame();
    }
  }, [isOpen, handleStartGame]);

  const handleTimeExpiredRef = useRef(handleTimeExpired);
  handleTimeExpiredRef.current = handleTimeExpired;

  // Round countdown timer
  useEffect(() => {
    if (!isOpen || isGameOver) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeExpiredRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [isOpen, isGameOver]);

  async function handleTimeExpired() {
    playSound('bell');
    setIsGameOver(true);
    const durationMs = Date.now() - startTimeRef.current;

    try {
      const res = await submitArcadeScore({
        gameSlug: 'scramble',
        score,
        durationMs,
        meta: { verses_completed: versesCompleted },
      });

      setGameOverDetails({
        title: versesCompleted >= 3 ? 'Scripture Master!' : 'Time’s Up!',
        message: `You unscrambled ${versesCompleted} verse${versesCompleted !== 1 ? 's' : ''} with ${score} points!`,
        unlockedAchievements: res.unlockedAchievements,
      });
    } catch {
      setGameOverDetails({
        title: 'Round Complete!',
        message: `You scored ${score} points in Scripture Scramble!`,
      });
    }
  }

  // Handle selecting a word from available pool
  function handleSelectWord(item) {
    if (isGameOver) return;
    playSound('click');

    const nextSelected = [...selectedWords, item];
    const nextAvailable = availableWords.filter((w) => w.id !== item.id);

    setSelectedWords(nextSelected);
    setAvailableWords(nextAvailable);

    // If all words selected, verify answer
    if (nextAvailable.length === 0) {
      checkCompletedVerse(nextSelected);
    }
  }

  // Handle deselecting a word back to available pool
  function handleDeselectWord(item) {
    if (isGameOver) return;
    playSound('click');

    setSelectedWords((prev) => prev.filter((w) => w.id !== item.id));
    setAvailableWords((prev) => [...prev, item]);
  }

  // Check if unscrambled verse matches target
  function checkCompletedVerse(userWords) {
    const constructed = userWords.map((w) => w.word).join(' ');
    const isCorrect = constructed.toLowerCase() === currentVerse.text.toLowerCase();

    if (isCorrect) {
      playSound('reaction');
      const bonus = Math.max(10, Math.floor(timeLeft * 2));
      const pointsEarned = 150 + bonus + roundStreak * 25;

      setScore((s) => s + pointsEarned);
      setRoundStreak((st) => st + 1);
      setVersesCompleted((vc) => vc + 1);
      setTimeLeft((t) => Math.min(90, t + 15)); // bonus time!

      // Next verse animation
      setTimeout(() => {
        const nextIdx = verseIndex + 1;
        setVerseIndex(nextIdx);
        loadVerse(nextIdx);
      }, 600);
    } else {
      playSound('click');
      setRoundStreak(0);
      // Give haptic buzz if supported
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([40, 60, 40]);
      }
    }
  }

  // Hint button (reveals next correct word)
  function handleHint() {
    if (availableWords.length === 0 || isGameOver) return;
    playSound('pop');

    const nextNeededIndex = selectedWords.length;
    const targetWords = currentVerse.text.split(' ');
    const expectedWord = targetWords[nextNeededIndex];

    const matchInAvailable = availableWords.find(
      (w) => w.word.toLowerCase() === expectedWord.toLowerCase()
    );

    if (matchInAvailable) {
      setSelectedWords((prev) => [...prev, matchInAvailable]);
      setAvailableWords((prev) => prev.filter((w) => w.id !== matchInAvailable.id));
      setScore((s) => Math.max(0, s - 10)); // small penalty
    }
  }

  return (
    <ArcadeGameShell
      isOpen={isOpen}
      onClose={onClose}
      game={{
        slug: 'scramble',
        title: 'Scripture Scramble',
        icon: '🧩',
        accent: '#8b5cf6',
      }}
      score={score}
      bestScore={bestScore}
      streak={roundStreak}
      hudStats={[
        { label: 'Time', value: `${timeLeft}s`, icon: '⏱️' },
        { label: 'Solved', value: versesCompleted, icon: '📜' },
      ]}
      isGameOver={isGameOver}
      isWon={versesCompleted >= 3}
      gameOverDetails={gameOverDetails}
      onRestart={handleStartGame}
    >
      <div className="w-full max-w-2xl flex flex-col items-center justify-between gap-4 py-2">
        {/* Reference Banner */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold font-mono">
            <span>📖 {currentVerse.reference}</span>
          </div>
          <p className="text-xs text-slate-400 max-w-md mx-auto line-clamp-1">
            {currentVerse.context}
          </p>
        </div>

        {/* Selected Words Construction Slot */}
        <div
          className="w-full min-h-[96px] p-4 rounded-2xl border bg-black/40 flex flex-wrap items-center justify-center gap-2 shadow-inner transition-all"
          style={{ borderColor: 'var(--border, rgba(255,255,255,0.15))' }}
        >
          {selectedWords.length === 0 ? (
            <span className="text-xs text-slate-500 italic">
              Tap the words below in scripture order...
            </span>
          ) : (
            selectedWords.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleDeselectWord(item)}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95"
              >
                {item.word}
              </button>
            ))
          )}
        </div>

        {/* Word Pool */}
        <div className="w-full p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-wrap items-center justify-center gap-2 min-h-[110px]">
          {availableWords.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectWord(item)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-purple-900/60 text-slate-200 border border-white/10 font-medium text-xs sm:text-sm shadow transition-all hover:scale-105 active:scale-95"
            >
              {item.word}
            </button>
          ))}
        </div>

        {/* Hint & Reset Action Footer */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleHint}
            className="px-3.5 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs text-slate-300 font-semibold flex items-center gap-1.5 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Need Hint (-10 pts)</span>
          </button>
          <button
            type="button"
            onClick={() => loadVerse(verseIndex)}
            className="px-3.5 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs text-slate-300 font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Words</span>
          </button>
        </div>
      </div>
    </ArcadeGameShell>
  );
}
