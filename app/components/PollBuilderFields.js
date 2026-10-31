'use client';
import React from 'react';
import { Plus, Trash2, CheckCircle2, HelpCircle, Clock, Shield } from 'lucide-react';

export const MAX_POLL_OPTIONS = 6;

export default function PollBuilderFields({
  questionText = '',
  pollOptions = ['', ''],
  setPollOptions,
  isQuizMode = false,
  setIsQuizMode,
  correctOptionIdx = 0,
  setCorrectOptionIdx,
  quizExplanation = '',
  setQuizExplanation,
  pollDuration = 3,
  setPollDuration,
  revealResultsAfterVoting = true,
  setRevealResultsAfterVoting,
}) {
  const handleOptionChange = (idx, val) => {
    const next = [...pollOptions];
    next[idx] = val;
    setPollOptions(next);
  };

  const addOption = () => {
    if (pollOptions.length < MAX_POLL_OPTIONS) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const removeOption = (idx) => {
    if (pollOptions.length > 2) {
      const next = pollOptions.filter((_, i) => i !== idx);
      setPollOptions(next);
      if (correctOptionIdx >= next.length) {
        setCorrectOptionIdx(0);
      }
    }
  };

  return (
    <div className="poll-builder-fields p-3.5 sm:p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
          Poll / Quiz Options
        </span>
        <button
          type="button"
          onClick={() => setIsQuizMode(!isQuizMode)}
          className={`px-2.5 py-1 text-xs font-semibold rounded-full border transition-colors min-h-[36px] flex items-center gap-1.5 ${
            isQuizMode
              ? 'bg-[var(--gold)]/20 border-[var(--gold)] text-[var(--gold)]'
              : 'border-[var(--border)] text-[var(--ink-muted)] hover:text-[var(--ink)]'
          }`}
        >
          <HelpCircle size={13} />
          <span>{isQuizMode ? 'Bible Quiz Mode Active' : 'Switch to Bible Quiz'}</span>
        </button>
      </div>

      {/* Options List */}
      <div className="space-y-2">
        {pollOptions.map((opt, idx) => (
          <div key={idx} className="flex items-center gap-2">
            {isQuizMode && (
              <button
                type="button"
                onClick={() => setCorrectOptionIdx(idx)}
                className={`p-2 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors ${
                  correctOptionIdx === idx
                    ? 'text-emerald-500 bg-emerald-500/10'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                }`}
                title="Mark as correct Bible answer"
                aria-label={`Mark option ${idx + 1} as correct answer`}
              >
                <CheckCircle2 size={18} />
              </button>
            )}

            <input
              type="text"
              value={opt}
              onChange={(e) => handleOptionChange(idx, e.target.value)}
              placeholder={`Option ${idx + 1}${isQuizMode && correctOptionIdx === idx ? ' (Correct Answer)' : ''}`}
              className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--teal)] min-h-[44px]"
            />

            {pollOptions.length > 2 && (
              <button
                type="button"
                onClick={() => removeOption(idx)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--ink-muted)] hover:text-red-500 transition-colors min-h-[44px] min-w-[44px]"
                aria-label={`Remove option ${idx + 1}`}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>

      {pollOptions.length < MAX_POLL_OPTIONS && (
        <button
          type="button"
          onClick={addOption}
          className="flex items-center gap-1.5 text-xs font-semibold text-[var(--teal)] hover:underline min-h-[44px]"
        >
          <Plus size={14} />
          <span>Add Option (Max {MAX_POLL_OPTIONS})</span>
        </button>
      )}

      {/* Quiz Explanation */}
      {isQuizMode && (
        <div className="pt-2">
          <label className="block text-xs font-medium text-[var(--ink-muted)] mb-1">
            Scripture Reference &amp; Explanation (revealed after vote)
          </label>
          <input
            type="text"
            value={quizExplanation}
            onChange={(e) => setQuizExplanation(e.target.value)}
            placeholder="e.g. John 3:16 - For God so loved the world..."
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] text-xs focus:outline-none focus:ring-1 focus:ring-[var(--teal)] min-h-[44px]"
          />
        </div>
      )}

      {/* Duration selector */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-xs text-[var(--ink-muted)]">
        <span className="flex items-center gap-1">
          <Clock size={13} /> Duration
        </span>
        <select
          value={pollDuration}
          onChange={(e) => setPollDuration(Number(e.target.value))}
          className="px-2 py-1 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] text-xs min-h-[36px]"
        >
          <option value={1}>24 Hours</option>
          <option value={3}>3 Days</option>
          <option value={7}>7 Days</option>
          <option value={14}>14 Days</option>
        </select>
      </div>
    </div>
  );
}
