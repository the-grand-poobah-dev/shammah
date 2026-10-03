'use client';
import { useState, useEffect } from 'react';
import {
  BarChart3,
  Sparkles,
  HelpCircle,
  Plus,
  Check,
  ShieldCheck,
  Lock,
  MessageSquare,
  Users,
} from 'lucide-react';
import {
  getIcebreakerPolls,
  getPollsForInstitution,
  getUserVotes,
  voteOnIcebreakerPoll,
  createIcebreakerPoll,
} from '../lib/icebreakerPolls';
import { playSound } from '../lib/soundEffects';

export default function IcebreakerPollsCard({
  churchId = null,
  churchName = '',
  canCreate = false,
  isStarterOrAbove = true,
  onOpenUpgrade = null,
}) {
  const [polls, setPolls] = useState([]);
  const [userVotes, setUserVotes] = useState({});
  const [creating, setCreating] = useState(false);
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState('Sunday Sermon Icebreaker');
  const [targetGroup, setTargetGroup] = useState('All Congregation');
  const [options, setOptions] = useState(['', '', '', '']);

  function reload() {
    if (churchId) {
      setPolls(getPollsForInstitution(churchId));
    } else {
      setPolls(getIcebreakerPolls());
    }
    setUserVotes(getUserVotes());
  }

  useEffect(() => {
    reload();

    function onPollsUpdate() {
      reload();
    }
    window.addEventListener('shammah:icebreaker-polls-updated', onPollsUpdate);
    return () => window.removeEventListener('shammah:icebreaker-polls-updated', onPollsUpdate);
  }, [churchId]);

  function handleVote(pollId, optionId) {
    if (userVotes[pollId]) return;
    voteOnIcebreakerPoll(pollId, optionId);
    reload();
  }

  function handleCreateSubmit(e) {
    e.preventDefault();
    if (!question.trim()) return;
    const validOptions = options.filter((o) => o.trim());
    if (validOptions.length < 2) return;

    createIcebreakerPoll({
      churchId: churchId || 'inst-general',
      churchName: churchName || 'Christian Fellowship',
      category,
      question: question.trim(),
      targetGroup,
      options: validOptions,
    });

    setCreating(false);
    setQuestion('');
    setOptions(['', '', '', '']);
    reload();
  }

  return (
    <div className="icebreaker-polls-card">
      <div className="icebreaker-head-row">
        <div>
          <div className="icebreaker-badge">
            <Sparkles size={13} />
            <span>Anonymous Sermon &amp; Fellowship Surveys</span>
          </div>
          <h3 className="icebreaker-title">Live Icebreakers &amp; Reflections</h3>
          <p className="icebreaker-desc">
            Vote 100% anonymously during sermons, Bible studies, and youth fellowships.
          </p>
        </div>

        {canCreate && (
          <div>
            {isStarterOrAbove ? (
              <button
                type="button"
                className="icebreaker-create-trigger-btn"
                onClick={() => setCreating((v) => !v)}
              >
                <Plus size={15} />
                <span>{creating ? 'Close Form' : 'New Icebreaker Poll'}</span>
              </button>
            ) : (
              <button
                type="button"
                className="icebreaker-locked-btn"
                onClick={onOpenUpgrade}
                title="Unlocked on Starter Plan (Kes 500/mo)"
              >
                <Lock size={14} />
                <span>Starter Plan Feature</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Creation Modal / Inline Drawer for Admins */}
      {creating && (
        <form className="icebreaker-creator-box" onSubmit={handleCreateSubmit}>
          <h4>Launch Anonymous Icebreaker Poll</h4>
          <p className="creator-sub">
            Ask your congregation or youth group an icebreaker or discussion reflection.
          </p>

          <label className="icebreaker-field">
            <span>Context / Category:</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="icebreaker-input"
            >
              <option>Sunday Sermon Icebreaker</option>
              <option>Youth &amp; Campus Fellowship</option>
              <option>Bible Class Discussion</option>
              <option>Kids &amp; Teens Sunday School</option>
              <option>Prayer &amp; Fasting Check-in</option>
            </select>
          </label>

          <label className="icebreaker-field">
            <span>Question / Icebreaker Prompt:</span>
            <textarea
              className="icebreaker-input"
              rows={2}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. During this season of prayer, what is your deepest spiritual request?"
              required
            />
          </label>

          <div className="icebreaker-options-editor">
            <span>Response Options (2 to 4 options):</span>
            {options.map((opt, i) => (
              <input
                key={i}
                type="text"
                className="icebreaker-input opt-input"
                placeholder={`Option ${i + 1}`}
                value={opt}
                onChange={(e) => {
                  const copy = [...options];
                  copy[i] = e.target.value;
                  setOptions(copy);
                }}
              />
            ))}
          </div>

          {/* Dynamic Real-time Icebreaker Poll Preview */}
          <div className="icebreaker-preview-box">
            <div className="poll-preview-top-bar">
              <div className="poll-preview-indicator">
                <span className="poll-preview-live-dot" />
                <span className="poll-preview-title">Dynamic Poll Preview</span>
                <span className="poll-preview-badge">Live Look</span>
              </div>
            </div>
            <div className="icebreaker-poll-item preview-mode">
              <div className="poll-item-header">
                <div className="poll-item-tags">
                  <span className="poll-category-chip">{category}</span>
                  <span className="poll-church-chip">{churchName || 'Christian Fellowship'}</span>
                  <span className="poll-target-chip">{targetGroup}</span>
                </div>
                <span className="poll-status-live">
                  <span className="live-dot" /> Live Preview
                </span>
              </div>

              <h4 className="poll-question-text">
                {question.trim() ? question : 'Your question will appear here as you type…'}
              </h4>

              <div className="poll-options-stack">
                {options.map((opt, i) => (
                  <div key={i} className="poll-option-row">
                    <div className="poll-option-content">
                      <span className="poll-option-label">
                        <span>{opt.trim() ? opt : `Option ${i + 1} (typing…)`}</span>
                      </span>
                      <span className="poll-option-stats">
                        <small>Tap to vote</small>
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="poll-item-footer">
                <span className="poll-total-votes">
                  <Users size={12} />
                  <span>0 anonymous responses</span>
                </span>
                <span className="poll-hint">Responses are 100% anonymous &amp; secure</span>
              </div>
            </div>
          </div>

          <div className="creator-actions">
            <button
              type="button"
              className="cx-btn cx-btn-ghost small"
              onClick={() => setCreating(false)}
            >
              Cancel
            </button>
            <button type="submit" className="cx-btn cx-btn-primary small">
              Launch Poll
            </button>
          </div>
        </form>
      )}

      {/* Polls Listing */}
      <div className="icebreaker-list">
        {polls.length === 0 ? (
          <div className="icebreaker-empty">
            <HelpCircle size={32} className="text-gray-400 mb-2" />
            <p>No active icebreaker polls yet.</p>
          </div>
        ) : (
          polls.map((poll) => {
            const myVote = userVotes[poll.id];
            const hasVoted = Boolean(myVote);
            const totalVotes = poll.options.reduce((sum, o) => sum + (o.votes || 0), 0);

            return (
              <div key={poll.id} className="icebreaker-poll-item">
                <div className="poll-item-header">
                  <div className="poll-item-tags">
                    <span className="poll-category-chip">{poll.category}</span>
                    <span className="poll-church-chip">{poll.churchName}</span>
                  </div>
                  <span className="poll-anon-badge" title="Identity is never shared or stored">
                    <ShieldCheck size={12} />
                    <span>100% Anonymous</span>
                  </span>
                </div>

                <h4 className="poll-question-text">{poll.question}</h4>
                <span className="poll-context-text">{poll.context}</span>

                <div className="poll-options-stack">
                  {poll.options.map((opt) => {
                    const isSelected = myVote === opt.id;
                    const percent =
                      totalVotes > 0 ? Math.round(((opt.votes || 0) / totalVotes) * 100) : 0;

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        className={`poll-option-row${isSelected ? ' selected' : ''}${hasVoted ? ' voted' : ''}`}
                        onClick={() => handleVote(poll.id, opt.id)}
                        disabled={hasVoted}
                      >
                        {/* Fill bar for results */}
                        {hasVoted && (
                          <div
                            className="poll-option-fill"
                            style={{ width: `${percent}%` }}
                          />
                        )}

                        <div className="poll-option-content">
                          <span className="poll-option-label">
                            {isSelected && <Check size={14} className="opt-check-icon" />}
                            <span>{opt.label}</span>
                          </span>

                          {hasVoted && (
                            <span className="poll-option-stats">
                              <b>{percent}%</b>
                              <small>({opt.votes || 0})</small>
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="poll-item-footer">
                  <span className="poll-total-votes">
                    <Users size={12} />
                    <span>{totalVotes.toLocaleString()} anonymous responses</span>
                  </span>
                  {!hasVoted && (
                    <span className="poll-hint">Tap any option above to cast your anonymous vote</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
