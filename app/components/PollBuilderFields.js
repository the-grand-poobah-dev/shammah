'use client';
import { useState, useEffect } from 'react';
import {
  BarChart3,
  Sparkles,
  Image as ImageIcon,
  Check,
  X,
  Trash2,
  Plus,
  Clock,
  EyeOff,
  RefreshCw,
  Calendar,
  Layers,
  Palette,
  Heart,
  MessageCircle,
  Share2,
  Tv,
  Globe,
  Users,
  Church,
  Lock,
} from 'lucide-react';
import Avatar from './Avatar';
import { categoryStyle } from '../lib/postDisplay';
import { VISIBILITY_OPTIONS } from '../lib/postInteractions';
import { playSound } from '../lib/soundEffects';

export const MAX_POLL_OPTIONS = 6;

export const POLL_DURATION_OPTIONS = [
  { id: '1m', label: '1 Min (Test)', title: '1 Minute · Instant Closing Test', ms: 60 * 1000 },
  { id: '1h', label: '1 Hour', title: '1 Hour · Quick Pulse', ms: 3600 * 1000 },
  { id: '24h', label: '24 Hours', title: '24 Hours · 1 Day (Default)', ms: 24 * 3600 * 1000 },
  { id: '3d', label: '3 Days', title: '3 Days · Weekend Poll', ms: 3 * 24 * 3600 * 1000 },
  { id: '7d', label: '1 Week', title: '1 Week · Full Week Survey', ms: 7 * 24 * 3600 * 1000 },
];

export const POLL_ACCENT_SWATCHES = [
  { id: 'cyan', color: '#06b6d4', label: 'Cyan' },
  { id: 'amber', color: '#f59e0b', label: 'Gold' },
  { id: 'emerald', color: '#10b981', label: 'Emerald' },
  { id: 'purple', color: '#8b5cf6', label: 'Purple' },
  { id: 'pink', color: '#ec4899', label: 'Rose' },
  { id: 'blue', color: '#3b82f6', label: 'Royal' },
];

const VIS_ICONS = {
  public: Globe,
  followers: Users,
  church: Church,
  private: Lock,
};

/**
 * Shared Poll Builder Fields & Live Card Preview
 * Single source of truth used by both CreatePostBox and PollBuilderModal.
 */
export default function PollBuilderFields({
  questionText = '',
  pollOptions = [],
  setPollOptions,
  isQuizMode = false,
  setIsQuizMode,
  pollType = 'survey', // 'survey' | 'quiz' | 'icebreaker'
  setPollType,
  correctOptionIdx = 0,
  setCorrectOptionIdx,
  quizExplanation = '',
  setQuizExplanation,
  pollDuration = '24h',
  setPollDuration,
  revealResultsAfterVoting = true,
  setRevealResultsAfterVoting,
  multiSelect = false,
  setMultiSelect,
  isAnonymous = false,
  setIsAnonymous,
  scheduleLater = false,
  setScheduleLater,
  startsAt = '',
  setStartsAt,
  pollAccent = '#06b6d4',
  setPollAccent,
  composeCategory = 'fellowship',
  visibility = 'public',
  currentIdentityName = 'Member',
  currentIdentityAvatar = null,
  authorRoleLabel = 'Community Member',
  showExtendedSettings = false,
}) {
  const [previewTestVote, setPreviewTestVote] = useState(null);
  const [previewSimulateResults, setPreviewSimulateResults] = useState(false);

  const cat = composeCategory ? categoryStyle(composeCategory) : null;
  const CurrentVisIcon = VIS_ICONS[visibility] || Globe;

  useEffect(() => {
    if (previewTestVote !== null && previewTestVote >= pollOptions.length) {
      setPreviewTestVote(null);
    }
  }, [pollOptions.length, previewTestVote]);

  function handleAddPollOption() {
    if (pollOptions.length >= MAX_POLL_OPTIONS) return;
    setPollOptions((prev) => [...prev, { label: '', file: null, preview: null }]);
  }

  function handleRemovePollOption(index) {
    if (pollOptions.length <= 2) return;
    setPollOptions((prev) => prev.filter((_, i) => i !== index));
    if (correctOptionIdx >= index && correctOptionIdx > 0) {
      setCorrectOptionIdx((c) => Math.max(0, c - 1));
    }
  }

  function handlePollOptionLabelChange(index, value) {
    setPollOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, label: value } : opt))
    );
  }

  function handlePollOptionPhotoChange(index, file) {
    setPollOptions((prev) =>
      prev.map((opt, i) => {
        if (i !== index) return opt;
        if (!file) return { ...opt, file: null, preview: null };
        return { ...opt, file, preview: URL.createObjectURL(file) };
      })
    );
  }

  function selectMode(mode) {
    if (setPollType) setPollType(mode);
    if (setIsQuizMode) setIsQuizMode(mode === 'quiz');
    if (mode === 'quiz' && setMultiSelect) setMultiSelect(false);
    playSound(mode === 'quiz' ? 'badge' : 'reaction');
  }

  const effectiveMode = pollType || (isQuizMode ? 'quiz' : 'survey');

  return (
    <div className="compose-poll-builder" style={{ '--sec-color': pollAccent }}>
      <div className="poll-builder-header">
        <div className="poll-builder-header-left">
          <span className="poll-builder-title">
            {effectiveMode === 'quiz'
              ? '🎯 Church & Bible Quiz Mode'
              : effectiveMode === 'icebreaker'
                ? '🕊️ Fellowship Icebreaker Poll'
                : '📊 Community Survey Options'}
          </span>
          <span className="poll-builder-sub">
            {effectiveMode === 'quiz'
              ? 'Mark the correct answer below. Voters earn instant points and see your Scripture explanation!'
              : `Add 2 to ${MAX_POLL_OPTIONS} options. Per-option photos supported!`}
          </span>
        </div>

        {/* Mode Toggle: Survey | Quiz | Icebreaker */}
        <div className="poll-mode-toggle-group" role="tablist" aria-label="Poll type">
          <button
            type="button"
            role="tab"
            aria-selected={effectiveMode === 'survey'}
            className={`poll-mode-tab-btn${effectiveMode === 'survey' ? ' active' : ''}`}
            onClick={() => selectMode('survey')}
          >
            <BarChart3 size={13} />
            <span>Survey</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={effectiveMode === 'quiz'}
            className={`poll-mode-tab-btn quiz-btn${effectiveMode === 'quiz' ? ' active' : ''}`}
            onClick={() => selectMode('quiz')}
          >
            <Sparkles size={13} />
            <span>Quiz 🎯</span>
          </button>
          {setPollType && (
            <button
              type="button"
              role="tab"
              aria-selected={effectiveMode === 'icebreaker'}
              className={`poll-mode-tab-btn${effectiveMode === 'icebreaker' ? ' active' : ''}`}
              onClick={() => selectMode('icebreaker')}
            >
              <span>🕊️ Icebreaker</span>
            </button>
          )}
        </div>
      </div>

      {/* Options List */}
      <div className="poll-builder-list">
        {pollOptions.map((opt, idx) => (
          <div
            key={idx}
            className={`poll-builder-option-row${isQuizMode && correctOptionIdx === idx ? ' is-correct-answer' : ''}`}
          >
            <span className="poll-opt-index">{idx + 1}</span>
            <input
              type="text"
              placeholder={`Option ${idx + 1}`}
              value={opt.label}
              onChange={(e) => handlePollOptionLabelChange(idx, e.target.value)}
              className="poll-opt-input"
              maxLength={90}
            />

            {/* Option photo upload */}
            <label className="poll-opt-photo-btn" title="Attach photo to this option" aria-label={`Attach photo for option ${idx + 1}`}>
              <ImageIcon size={14} />
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handlePollOptionPhotoChange(idx, f);
                }}
              />
            </label>

            {/* Quiz Mode: Mark Correct Answer */}
            {isQuizMode && (
              <button
                type="button"
                className={`poll-correct-answer-pill${correctOptionIdx === idx ? ' selected' : ''}`}
                onClick={() => {
                  setCorrectOptionIdx(idx);
                  playSound('badge');
                }}
                title={correctOptionIdx === idx ? 'Marked as the correct answer' : 'Mark as correct answer'}
              >
                {correctOptionIdx === idx ? (
                  <>
                    <Check size={12} className="text-emerald-400" />
                    <span>Correct ✓</span>
                  </>
                ) : (
                  <span>Mark Correct</span>
                )}
              </button>
            )}

            {opt.preview && (
              <div className="poll-opt-preview-thumb">
                <img src={opt.preview} alt={`Option ${idx + 1} preview`} />
                <button
                  type="button"
                  onClick={() => handlePollOptionPhotoChange(idx, null)}
                  className="thumb-remove-btn"
                  aria-label="Remove option photo"
                >
                  <X size={10} />
                </button>
              </div>
            )}

            {pollOptions.length > 2 && (
              <button
                type="button"
                className="poll-opt-remove-btn"
                onClick={() => handleRemovePollOption(idx)}
                title="Remove option"
                aria-label={`Remove option ${idx + 1}`}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Quiz Scripture Explanation */}
      {isQuizMode && (
        <div className="poll-quiz-explanation-box">
          <label className="poll-quiz-exp-label">
            <Sparkles size={13} className="text-amber-400" />
            <span>Scripture Reference &amp; Explanation (Revealed after answering):</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Ephesians 6:17 teaches that the Sword of the Spirit is the Word of God..."
            value={quizExplanation}
            onChange={(e) => setQuizExplanation(e.target.value)}
            className="poll-quiz-exp-input"
            maxLength={240}
          />
        </div>
      )}

      {pollOptions.length < MAX_POLL_OPTIONS && (
        <button
          type="button"
          className="poll-add-option-btn"
          onClick={handleAddPollOption}
        >
          <Plus size={14} />
          <span>Add Option ({pollOptions.length}/{MAX_POLL_OPTIONS})</span>
        </button>
      )}

      {/* Poll Settings Panel */}
      <div className="poll-settings-panel">
        <div className="poll-setting-group">
          <label className="poll-setting-label">
            <Clock size={13} className="text-teal-400" />
            <span>Poll Duration / Expiration:</span>
          </label>
          <div className="poll-duration-pills" role="radiogroup" aria-label="Poll expiration duration">
            {POLL_DURATION_OPTIONS.map((dur) => (
              <button
                key={dur.id}
                type="button"
                role="radio"
                aria-checked={pollDuration === dur.id}
                className={`poll-duration-pill${pollDuration === dur.id ? ' active' : ''}`}
                onClick={() => {
                  setPollDuration(dur.id);
                  playSound('reaction');
                }}
                title={dur.title}
              >
                {dur.label}
              </button>
            ))}
          </div>
        </div>

        {/* Extended Builder Controls (Accent Color, Scheduling, Multi-select, Anonymity) */}
        {showExtendedSettings && (
          <div className="poll-extended-settings-grid">
            {setPollAccent && (
              <div className="poll-setting-group">
                <label className="poll-setting-label">
                  <Palette size={13} style={{ color: pollAccent }} />
                  <span>Card Accent Colour:</span>
                </label>
                <div className="poll-accent-swatches">
                  {POLL_ACCENT_SWATCHES.map((sw) => (
                    <button
                      key={sw.id}
                      type="button"
                      className={`poll-accent-swatch${pollAccent === sw.color ? ' active' : ''}`}
                      style={{ '--swatch-color': sw.color }}
                      onClick={() => setPollAccent(sw.color)}
                      aria-label={`Accent colour ${sw.label}`}
                      title={sw.label}
                    >
                      <span className="poll-accent-swatch__dot" />
                      <span>{sw.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {setScheduleLater && (
              <div className="poll-setting-toggle-row">
                <label className="poll-toggle-label">
                  <input
                    type="checkbox"
                    checked={scheduleLater}
                    onChange={(e) => setScheduleLater(e.target.checked)}
                    className="poll-toggle-checkbox"
                  />
                  <div className="poll-toggle-text">
                    <div className="poll-toggle-heading">
                      <Calendar size={13} className="text-cyan-400" />
                      <strong>Schedule poll to start later</strong>
                    </div>
                    <small>Set a future opening date and time for Sunday service or youth night</small>
                  </div>
                </label>
                {scheduleLater && setStartsAt && (
                  <input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="poll-schedule-datetime-input"
                  />
                )}
              </div>
            )}

            {!isQuizMode && setMultiSelect && (
              <div className="poll-setting-toggle-row">
                <label className="poll-toggle-label">
                  <input
                    type="checkbox"
                    checked={multiSelect}
                    onChange={(e) => setMultiSelect(e.target.checked)}
                    className="poll-toggle-checkbox"
                  />
                  <div className="poll-toggle-text">
                    <div className="poll-toggle-heading">
                      <Layers size={13} className="text-purple-400" />
                      <strong>Allow multiple choices (Multi-select)</strong>
                    </div>
                    <small>Members can select more than one option when voting</small>
                  </div>
                </label>
              </div>
            )}

            {setIsAnonymous && (
              <div className="poll-setting-toggle-row">
                <label className="poll-toggle-label">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="poll-toggle-checkbox"
                  />
                  <div className="poll-toggle-text">
                    <div className="poll-toggle-heading">
                      <EyeOff size={13} className="text-amber-400" />
                      <strong>Anonymous ballot &amp; voter privacy</strong>
                    </div>
                    <small>Hide voter avatars so members can vote with complete privacy</small>
                  </div>
                </label>
              </div>
            )}
          </div>
        )}

        <div className="poll-setting-toggle-row">
          <label className="poll-toggle-label" title="Keep live results private from participants until they vote">
            <input
              type="checkbox"
              checked={revealResultsAfterVoting}
              onChange={(e) => {
                setRevealResultsAfterVoting(e.target.checked);
                playSound('reaction');
              }}
              className="poll-toggle-checkbox"
            />
            <div className="poll-toggle-text">
              <div className="poll-toggle-heading">
                <EyeOff size={13} className="text-teal-400" />
                <strong>Hide results until member votes</strong>
              </div>
              <small>Keeps live percentages and vote counts hidden until each member casts their ballot</small>
            </div>
          </label>
        </div>
      </div>

      {/* Dynamic Real-Time Poll Card Preview */}
      <div className="compose-poll-preview-wrapper" aria-label="Dynamic Poll Card Preview">
        <div className="poll-preview-top-bar">
          <div className="poll-preview-indicator">
            <span className="poll-preview-live-dot" />
            <span className="poll-preview-title">Live Card Preview</span>
            <span className="poll-preview-badge" style={{ borderColor: pollAccent, color: pollAccent }}>
              {effectiveMode === 'quiz' ? 'Quiz Card' : effectiveMode === 'icebreaker' ? 'Icebreaker' : 'Survey Card'}
            </span>
            <span className="poll-preview-duration-badge">
              <Clock size={10} />
              <span>
                Closes in{' '}
                {pollDuration === '1m'
                  ? '1 min'
                  : pollDuration === '1h'
                    ? '1 hour'
                    : pollDuration === '24h'
                      ? '24 hours'
                      : pollDuration === '3d'
                        ? '3 days'
                        : '1 week'}
              </span>
            </span>
          </div>
          <div className="poll-preview-controls">
            {previewTestVote !== null && (
              <button
                type="button"
                className="poll-preview-control-btn reset"
                onClick={() => {
                  setPreviewTestVote(null);
                  playSound('reaction');
                }}
              >
                <RefreshCw size={11} />
                <span>Reset Vote</span>
              </button>
            )}
            <button
              type="button"
              className={`poll-preview-control-btn${previewSimulateResults ? ' active' : ''}`}
              onClick={() => {
                setPreviewSimulateResults((v) => !v);
                playSound('reaction');
              }}
            >
              <BarChart3 size={11} />
              <span>{previewSimulateResults ? 'Results Active' : 'Simulate Results'}</span>
            </button>
          </div>
        </div>

        <div className="poll-preview-card-frame" style={{ borderColor: `color-mix(in srgb, ${pollAccent} 38%, var(--border))` }}>
          <div className="post-header">
            <Avatar name={currentIdentityName} src={currentIdentityAvatar} className="avatar-sm" />
            <div className="post-header-text">
              <div className="post-header-top">
                <span className="author-name">{currentIdentityName}</span>
                {cat && (
                  <span
                    className="cat-pill"
                    style={{
                      '--cat-accent': cat.accent,
                      '--cat-soft': cat.soft,
                      '--cat-text': cat.text,
                    }}
                  >
                    {cat.label}
                  </span>
                )}
                <span className="post-vis-badge">
                  <CurrentVisIcon size={11} />
                  <span>{VISIBILITY_OPTIONS.find((v) => v.id === visibility)?.label || 'Public'}</span>
                </span>
              </div>
              <div className="post-header-meta">
                <span className="post-author-role">{authorRoleLabel}</span>
                <span className="post-dot">·</span>
                <span className="post-time-ago">
                  {scheduleLater && startsAt ? `Scheduled · ${new Date(startsAt).toLocaleString()}` : 'Just now · Live Preview'}
                </span>
              </div>
            </div>
          </div>

          <div className="post-text-container">
            {questionText.trim() ? (
              <p className="post-text poll-preview-question">{questionText}</p>
            ) : (
              <p className="post-text poll-preview-question placeholder">
                Type your poll question above (e.g. &ldquo;Which worship song should open our Friday vigil?&rdquo;)…
              </p>
            )}
          </div>

          {pollOptions.some((o) => o.preview || o.file) ? (
            <div className="poll">
              <div className="poll-grid">
                {pollOptions.map((opt, idx) => {
                  const isSelected = previewTestVote === idx;
                  const canSeeResults = !revealResultsAfterVoting || previewTestVote !== null || previewSimulateResults;
                  const isShownVoted = canSeeResults && (previewTestVote !== null || previewSimulateResults);
                  const totalOpts = pollOptions.length || 1;
                  const pct = isShownVoted
                    ? previewTestVote === idx
                      ? previewSimulateResults
                        ? Math.round(100 / totalOpts + 20)
                        : 100
                      : previewSimulateResults
                        ? Math.max(5, Math.round(80 / Math.max(1, totalOpts - 1)))
                        : 0
                    : 0;

                  return (
                    <button
                      key={idx}
                      type="button"
                      className={`poll-image-card${isSelected ? ' mine' : ''}`}
                      onClick={() => {
                        setPreviewTestVote((prev) => (prev === idx ? null : idx));
                        playSound('reaction');
                      }}
                    >
                      {opt.preview ? (
                        <img src={opt.preview} alt={opt.label || `Option ${idx + 1}`} />
                      ) : (
                        <div className="poll-image-placeholder">
                          <ImageIcon size={22} className="opacity-40" />
                          <span>No image attached</span>
                        </div>
                      )}
                      <span className="poll-image-meta">
                        <span className="poll-img-label-text">
                          {opt.label.trim() ? opt.label : <span className="opacity-60">Option {idx + 1}</span>}
                          {isSelected && ' ✓'}
                        </span>
                        {isShownVoted && <span className="poll-img-pct">{pct}%</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="poll">
              {pollOptions.map((opt, idx) => {
                const isSelected = previewTestVote === idx;
                const canSeeResults = !revealResultsAfterVoting || previewTestVote !== null || previewSimulateResults;
                const isShownVoted = canSeeResults && (previewTestVote !== null || previewSimulateResults);
                const totalOpts = pollOptions.length || 1;
                const pct = isShownVoted
                  ? previewTestVote === idx
                    ? previewSimulateResults
                      ? Math.round(100 / totalOpts + 25)
                      : 100
                    : previewSimulateResults
                      ? Math.max(5, Math.round(75 / Math.max(1, totalOpts - 1)))
                      : 0
                  : 0;

                return (
                  <button
                    key={idx}
                    type="button"
                    className={`poll-option${isSelected ? ' mine' : ''}${
                      isQuizMode && previewTestVote !== null
                        ? idx === correctOptionIdx
                          ? ' is-quiz-correct'
                          : isSelected
                            ? ' is-quiz-wrong'
                            : ''
                        : ''
                    }`}
                    onClick={() => {
                      setPreviewTestVote((prev) => (prev === idx ? null : idx));
                      playSound(isQuizMode && idx === correctOptionIdx ? 'badge' : 'reaction');
                    }}
                  >
                    {isShownVoted && (
                      <span
                        className="poll-bar"
                        style={{
                          width: `${pct}%`,
                          background: `color-mix(in srgb, ${pollAccent} 24%, transparent)`,
                        }}
                      />
                    )}
                    <span className="poll-label">
                      <span className={`poll-radio-indicator${isSelected ? ' checked' : ''}`}>
                        {isSelected ? <Check size={11} /> : idx + 1}
                      </span>
                      <span className="poll-label-text">
                        {opt.label.trim() ? (
                          opt.label
                        ) : (
                          <span className="poll-opt-placeholder-text">Option {idx + 1} (typing…)</span>
                        )}
                      </span>
                      {isQuizMode && previewTestVote !== null && idx === correctOptionIdx && (
                        <span className="quiz-correct-tag">⭐ Correct Answer</span>
                      )}
                      {isQuizMode && previewTestVote !== null && isSelected && idx !== correctOptionIdx && (
                        <span className="quiz-wrong-tag">❌ Your Pick</span>
                      )}
                      {!isQuizMode && isSelected && <span className="poll-voted-tag">Your Vote ✓</span>}
                    </span>
                    {isShownVoted && <span className="poll-pct">{pct}%</span>}
                  </button>
                );
              })}

              {isQuizMode && previewTestVote !== null && (
                <div className={`poll-quiz-feedback-card ${previewTestVote === correctOptionIdx ? 'correct' : 'incorrect'}`}>
                  <div className="quiz-feedback-header">
                    {previewTestVote === correctOptionIdx ? (
                      <>
                        <span className="quiz-feedback-badge pass">+100 pts · Correct! 🏆</span>
                        <span className="quiz-feedback-msg">Praise God, you selected the right Scripture answer!</span>
                      </>
                    ) : (
                      <>
                        <span className="quiz-feedback-badge fail">+10 pts · Keep Studying! ✍️</span>
                        <span className="quiz-feedback-msg">
                          The correct answer is <strong>Option {correctOptionIdx + 1}: {pollOptions[correctOptionIdx]?.label || `Option ${correctOptionIdx + 1}`}</strong>
                        </span>
                      </>
                    )}
                  </div>
                  {quizExplanation && (
                    <div className="quiz-feedback-scripture">
                      <strong>📖 Scripture Note:</strong> {quizExplanation}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="post-actions-preview" style={{ marginTop: 10 }}>
            <div className="post-action-preview-pill">
              <Heart size={12} className="text-rose-400" />
              <span>Amen</span>
            </div>
            <div className="post-action-preview-pill">
              <MessageCircle size={12} />
              <span>Discuss</span>
            </div>
            <div className="post-action-preview-pill">
              <Share2 size={12} />
              <span>Share Card</span>
            </div>
            <div className="post-action-preview-pill">
              <Tv size={12} />
              <span>Sanctuary Screen</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
