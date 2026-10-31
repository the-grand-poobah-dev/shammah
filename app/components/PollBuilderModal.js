'use client';
import React, { useState } from 'react';
import PopupSheet from './PopupSheet';
import PollBuilderFields from './PollBuilderFields';
import { supabase } from '../lib/supabaseClient';
import { playSound } from '../lib/soundEffects';

export default function PollBuilderModal({
  open,
  onClose,
  session,
  currentUser,
  openAuth,
  onPollCreated,
}) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [correctOptionIdx, setCorrectOptionIdx] = useState(0);
  const [quizExplanation, setQuizExplanation] = useState('');
  const [pollDuration, setPollDuration] = useState(3);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!session?.user?.id) {
      if (openAuth) openAuth();
      return;
    }
    const cleanQuestion = question.trim();
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!cleanQuestion || cleanOptions.length < 2) return;

    setBusy(true);
    try {
      playSound('button');
      const expiresAt = new Date(Date.now() + pollDuration * 24 * 60 * 60 * 1000).toISOString();

      const { data: postData, error: postErr } = await supabase
        .from('posts')
        .insert({
          author_id: session.user.id,
          content: cleanQuestion,
          category: 'Polls',
          is_poll: true,
        })
        .select()
        .single();

      if (postErr) throw postErr;

      const { error: pollErr } = await supabase.from('polls').insert({
        post_id: postData.id,
        options: cleanOptions,
        expires_at: expiresAt,
        is_quiz: isQuizMode,
        correct_option_idx: isQuizMode ? correctOptionIdx : null,
        quiz_explanation: isQuizMode ? quizExplanation.trim() : null,
      });

      if (pollErr) throw pollErr;

      playSound('reaction');
      if (onPollCreated) onPollCreated();
      onClose();
    } catch (err) {
      console.error('Failed to create poll:', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PopupSheet open={open} onClose={onClose} title="Create Community Faith Poll" size="md">
      <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[var(--ink-muted)] mb-1">
            Question or Reflection Prompt
          </label>
          <textarea
            rows={2}
            required
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question to the faith community..."
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] text-[var(--ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)] resize-none"
          />
        </div>

        <PollBuilderFields
          questionText={question}
          pollOptions={options}
          setPollOptions={setOptions}
          isQuizMode={isQuizMode}
          setIsQuizMode={setIsQuizMode}
          correctOptionIdx={correctOptionIdx}
          setCorrectOptionIdx={setCorrectOptionIdx}
          quizExplanation={quizExplanation}
          setQuizExplanation={setQuizExplanation}
          pollDuration={pollDuration}
          setPollDuration={setPollDuration}
        />

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full border border-[var(--border)] text-sm text-[var(--ink-muted)] hover:text-[var(--ink)] min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !question.trim() || options.filter((o) => o.trim()).length < 2}
            className="px-5 py-2 rounded-full bg-[var(--teal)] text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 min-h-[44px]"
          >
            {busy ? 'Publishing...' : 'Publish Poll'}
          </button>
        </div>
      </form>
    </PopupSheet>
  );
}
