'use client';
import React, { useState } from 'react';
import PopupSheet from '../PopupSheet';
import { Trophy, CheckCircle2, XCircle, RotateCcw, ArrowRight } from 'lucide-react';
import { playSound } from '../../lib/soundEffects';
import { TRIVIA_QUESTIONS } from '../../lib/data/arcadeApi';

export default function BibleTriviaGame({ isOpen, onClose, currentUser, bestScore = 0 }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const q = TRIVIA_QUESTIONS[currentIdx] || TRIVIA_QUESTIONS[0];

  const handleSelectOption = (idx) => {
    if (selectedOpt !== null) return;
    setSelectedOpt(idx);
    if (idx === q.correct) {
      playSound('reaction');
      setScore((s) => s + 10);
    } else {
      playSound('button');
    }
  };

  const handleNext = () => {
    if (currentIdx < TRIVIA_QUESTIONS.length - 1) {
      setCurrentIdx((i) => i + 1);
      setSelectedOpt(null);
    } else {
      setShowResult(true);
    }
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setSelectedOpt(null);
    setScore(0);
    setShowResult(false);
  };

  return (
    <PopupSheet open={isOpen} onClose={onClose} title="Bible Knowledge Trivia" size="md">
      <div className="p-4 sm:p-5 space-y-4">
        {showResult ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/15 text-amber-500 flex items-center justify-center">
              <Trophy size={28} />
            </div>
            <h3 className="text-lg font-bold text-[var(--ink)]">Trivia Complete!</h3>
            <p className="text-sm text-[var(--ink-muted)]">
              Your Final Score: <strong className="text-[var(--teal)]">{score} Points</strong>
            </p>
            <button
              type="button"
              onClick={handleRestart}
              className="px-6 py-2.5 rounded-full bg-[var(--teal)] text-white text-sm font-semibold min-h-[44px]"
            >
              Play Again
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-xs text-[var(--ink-muted)]">
              <span>Question {currentIdx + 1} of {TRIVIA_QUESTIONS.length}</span>
              <span className="font-bold text-amber-500">Score: {score}</span>
            </div>

            <h3 className="text-base font-bold text-[var(--ink)] leading-snug">
              {q.question}
            </h3>

            <div className="space-y-2 pt-2">
              {q.options.map((opt, idx) => {
                const isSelected = selectedOpt === idx;
                const isCorrect = idx === q.correct;
                const showFeedback = selectedOpt !== null;

                let btnStyle = 'bg-[var(--surface-sunken)] border-[var(--border)] text-[var(--ink)]';
                if (showFeedback) {
                  if (isCorrect) {
                    btnStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-500 font-bold';
                  } else if (isSelected) {
                    btnStyle = 'bg-red-500/20 border-red-500 text-red-500';
                  }
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectOption(idx)}
                    className={`w-full p-3 rounded-xl border text-left text-sm flex items-center justify-between transition-all min-h-[44px] ${btnStyle}`}
                  >
                    <span>{opt}</span>
                    {showFeedback && isCorrect && <CheckCircle2 size={16} />}
                    {showFeedback && isSelected && !isCorrect && <XCircle size={16} />}
                  </button>
                );
              })}
            </div>

            {selectedOpt !== null && (
              <div className="pt-3 flex justify-end">
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-[var(--teal)] text-white text-sm font-semibold min-h-[44px]"
                >
                  <span>{currentIdx < TRIVIA_QUESTIONS.length - 1 ? 'Next' : 'See Results'}</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </PopupSheet>
  );
}
