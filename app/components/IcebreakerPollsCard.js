'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Plus,
  Check,
  Users,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Send,
} from 'lucide-react';
import PopupSheet from './PopupSheet';
import {
  DEFAULT_ICEBREAKER_POLLS,
  fetchIcebreakerPollsFromDb,
  voteInIcebreakerPoll,
  createIcebreakerPoll,
  deleteIcebreakerPoll,
} from '../lib/icebreakerPolls';
import { playSound } from '../lib/soundEffects';
import { awardPoints } from '../lib/badges';

export default function IcebreakerPollsCard({ session, profile, openAuth }) {
  const [polls, setPolls] = useState(DEFAULT_ICEBREAKER_POLLS);
  const [votes, setVotes] = useState({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create form state
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState('Icebreaker');
  const [options, setOptions] = useState(['', '', '']);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadFromServer = useCallback(async () => {
    const list = await fetchIcebreakerPollsFromDb(session?.user?.id || null);
    if (Array.isArray(list) && list.length > 0) {
      setPolls(list);
      const myMap = {};
      list.forEach((p) => {
        if (p.myVote) myMap[p.id] = p.myVote;
      });
      setVotes(myMap);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    loadFromServer();
  }, [loadFromServer]);

  if (!polls.length) return null;

  const currentPoll = polls[activeIndex] || polls[0];
  const myOptionId = votes[currentPoll.id] || currentPoll.myVote;
  const totalVotes = currentPoll.options.reduce((sum, o) => sum + (o.votes || 0), 0);

  async function handleVote(optionId) {
    if (!session?.user?.id) {
      if (openAuth) openAuth('signin');
      return;
    }
    if (myOptionId) return; // Already voted

    // Optimistic update
    const prevPolls = polls;
    const prevVotes = votes;
    setVotes((prev) => ({ ...prev, [currentPoll.id]: optionId }));
    setPolls((prev) =>
      prev.map((p) =>
        p.id === currentPoll.id
          ? {
              ...p,
              options: p.options.map((o) =>
                o.id === optionId ? { ...o, votes: (o.votes || 0) + 1 } : o
              ),
            }
          : p
      )
    );
    playSound('reaction');

    try {
      const res = await voteInIcebreakerPoll(currentPoll.id, optionId, session.user.id);
      if (res?.polls) setPolls(res.polls);
      if (res?.votes) setVotes((prev) => ({ ...prev, ...res.votes }));
      awardPoints('VOTE_POLL');
    } catch {
      setPolls(prevPolls);
      setVotes(prevVotes);
    }
  }

  function handleOptionChange(idx, val) {
    setOptions((prev) => prev.map((o, i) => (i === idx ? val : o)));
  }

  function addOptionSlot() {
    if (options.length < 4) setOptions((prev) => [...prev, '']);
  }

  function removeOptionSlot(idx) {
    if (options.length > 2) setOptions((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleCreateSubmit(e) {
    e.preventDefault();
    if (!session?.user?.id) {
      if (openAuth) openAuth('signin');
      return;
    }
    const cleanOpts = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || cleanOpts.length < 2) return;

    setSubmitting(true);
    try {
      const authorName = profile?.display_name || session?.user?.email?.split('@')[0] || 'Believer';
      const created = await createIcebreakerPoll({
        question,
        category,
        options: cleanOpts,
        authorName,
        isAnonymous,
        userId: session.user.id,
      });

      if (created) {
        await loadFromServer();
        setActiveIndex(0);
        setShowCreateModal(false);
        setQuestion('');
        setOptions(['', '', '']);
        setIsAnonymous(false);
        playSound('postPublished');
        awardPoints('CREATE_POLL');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteCurrent() {
    if (!session?.user?.id) return;
    const updated = await deleteIcebreakerPoll(currentPoll.id, session.user.id);
    setPolls(updated);
    setActiveIndex(0);
  }

  return (
    <div className="icebreaker-polls-card">
      <div className="icebreaker-header">
        <div className="icebreaker-title-row">
          <span className="icebreaker-badge-icon">
            <Sparkles size={15} />
          </span>
          <div>
            <div className="icebreaker-title-wrap">
              <h4>Daily Fellowship Icebreakers</h4>
              <span className="icebreaker-pill">{currentPoll.category}</span>
            </div>
            <p>Quick community check-ins, faith reflections &amp; warm fellowship</p>
          </div>
        </div>

        <div className="icebreaker-header-actions">
          <div className="icebreaker-Step-nav">
            <button
              type="button"
              className="icebreaker-nav-btn"
              onClick={() => setActiveIndex((prev) => (prev - 1 + polls.length) % polls.length)}
              title="Previous icebreaker"
              aria-label="Previous icebreaker"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="icebreaker-step-indicator">
              {activeIndex + 1} / {polls.length}
            </span>
            <button
              type="button"
              className="icebreaker-nav-btn"
              onClick={() => setActiveIndex((prev) => (prev + 1) % polls.length)}
              title="Next icebreaker"
              aria-label="Next icebreaker"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          <button
            type="button"
            className="icebreaker-ask-btn"
            onClick={() => {
              if (!session) {
                openAuth?.('signin');
                return;
              }
              setShowCreateModal(true);
            }}
          >
            <Plus size={14} />
            <span>Ask One</span>
          </button>
        </div>
      </div>

      {/* Active Icebreaker Poll Body */}
      <div className="icebreaker-body">
        <div className="icebreaker-question-row">
          <span className="icebreaker-emoji">{currentPoll.emoji || '🕊️'}</span>
          <div className="icebreaker-question-text">
            <h5>{currentPoll.question}</h5>
            <span className="icebreaker-author-tag">
              {currentPoll.isAnonymous ? (
                <>
                  <EyeOff size={11} /> Anonymous Member
                </>
              ) : (
                <>Asked by {currentPoll.authorName}</>
              )}
              {' · '}
              <Users size={11} /> {totalVotes} {totalVotes === 1 ? 'response' : 'responses'}
            </span>
          </div>
        </div>

        <div className="icebreaker-options-grid">
          {currentPoll.options.map((opt) => {
            const isSelected = myOptionId === opt.id;
            const pct = totalVotes > 0 ? Math.round(((opt.votes || 0) / totalVotes) * 100) : 0;

            return (
              <button
                key={opt.id}
                type="button"
                className={`icebreaker-opt-btn${isSelected ? ' selected' : ''}${myOptionId ? ' voted' : ''}`}
                onClick={() => handleVote(opt.id)}
              >
                {myOptionId && (
                  <span
                    className="icebreaker-opt-bar"
                    style={{ width: `${pct}%` }}
                  />
                )}
                <span className="icebreaker-opt-label">
                  {isSelected && <Check size={14} className="icebreaker-check" />}
                  <span>{opt.label}</span>
                </span>
                {myOptionId && (
                  <span className="icebreaker-opt-pct">{pct}%</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="icebreaker-footer">
          <span className="icebreaker-footer-hint">
            {myOptionId
              ? '✨ Thank you for sharing with the church family!'
              : 'Tap any option to share your response'}
          </span>
          {String(currentPoll.id).startsWith('poll-') && (
            <button
              type="button"
              className="icebreaker-delete-btn"
              onClick={handleDeleteCurrent}
              title="Remove custom icebreaker"
            >
              <Trash2 size={12} /> Remove
            </button>
          )}
        </div>
      </div>

      {/* Create New Icebreaker Modal via PopupSheet */}
      <PopupSheet
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={18} className="text-amber-400" />
            <span>Ask a Fellowship Icebreaker</span>
          </div>
        }
        size="md"
      >
        <form className="icebreaker-create-form" onSubmit={handleCreateSubmit}>
          <label className="icebreaker-field-label">
            Your Icebreaker Question
            <input
              type="text"
              placeholder="e.g., What song has been on repeat in your spirit this week?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={140}
              required
            />
          </label>

          <div className="icebreaker-category-pills">
            {['Icebreaker', 'Morning Devotion', 'Sunday Fellowship', 'Youth Check-In', 'Gratitude'].map((cat) => (
              <button
                key={cat}
                type="button"
                className={`icebreaker-cat-chip${category === cat ? ' active' : ''}`}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="icebreaker-options-inputs">
            <span className="icebreaker-field-title">Poll Options (2 to 4 choices)</span>
            {options.map((opt, idx) => (
              <div key={idx} className="icebreaker-opt-input-row">
                <input
                  type="text"
                  placeholder={`Option ${idx + 1}`}
                  value={opt}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  maxLength={70}
                  required={idx < 2}
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    className="icebreaker-remove-opt"
                    onClick={() => removeOptionSlot(idx)}
                    aria-label="Remove option"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            {options.length < 4 && (
              <button type="button" className="icebreaker-add-opt-btn" onClick={addOptionSlot}>
                <Plus size={13} /> Add Choice
              </button>
            )}
          </div>

          <label className="icebreaker-anon-toggle">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
            />
            <EyeOff size={14} />
            <span>Post this icebreaker anonymously</span>
          </label>

          <div className="icebreaker-modal-actions">
            <button
              type="button"
              className="report-cancel-btn"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </button>
            <button type="submit" className="signin-btn" disabled={submitting}>
              <Send size={14} />
              <span>{submitting ? 'Publishing…' : 'Publish Icebreaker'}</span>
            </button>
          </div>
        </form>
      </PopupSheet>
    </div>
  );
}
