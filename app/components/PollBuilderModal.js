'use client';
import { useState } from 'react';
import {
  BarChart3,
  Globe,
  Users,
  Church,
  Send,
  AlertCircle,
} from 'lucide-react';
import PopupSheet from './PopupSheet';
import PollBuilderFields, { POLL_DURATION_OPTIONS } from './PollBuilderFields';
import { createPoll } from '../lib/data/pollsApi';
import { playSound } from '../lib/soundEffects';
import { awardPoints } from '../lib/badges';

const POLL_CATEGORIES = [
  { id: 'worship', label: 'Worship', accent: '#ec4899' },
  { id: 'bible-study', label: 'Bible Quiz', accent: '#f59e0b' },
  { id: 'fellowship', label: 'Church Life', accent: '#06b6d4' },
  { id: 'youth', label: 'Youth & Gen-Z', accent: '#8b5cf6' },
  { id: 'prayer', label: 'Prayer', accent: '#3b82f6' },
  { id: 'missions', label: 'Missions', accent: '#10b981' },
  { id: 'discipleship', label: 'Discipleship', accent: '#14b8a6' },
];

const VISIBILITY_CHOICES = [
  { id: 'public', label: 'Public', icon: Globe },
  { id: 'followers', label: 'Followers', icon: Users },
  { id: 'church', label: 'My Church', icon: Church },
];

export default function PollBuilderModal({
  open,
  onClose,
  session,
  currentUser,
  openAuth,
  initialMode = 'survey',
  onPollCreated,
}) {
  const [question, setQuestion] = useState('');
  const [pollType, setPollType] = useState(initialMode); // 'survey' | 'quiz' | 'icebreaker'
  const [isQuizMode, setIsQuizMode] = useState(initialMode === 'quiz');
  const [pollOptions, setPollOptions] = useState([
    { label: '', file: null, preview: null },
    { label: '', file: null, preview: null },
    { label: '', file: null, preview: null },
  ]);
  const [correctOptionIdx, setCorrectOptionIdx] = useState(0);
  const [quizExplanation, setQuizExplanation] = useState('');
  const [pollDuration, setPollDuration] = useState('24h');
  const [revealResultsAfterVoting, setRevealResultsAfterVoting] = useState(false);
  const [multiSelect, setMultiSelect] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [scheduleLater, setScheduleLater] = useState(false);
  const [startsAt, setStartsAt] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [selectedCategory, setSelectedCategory] = useState(
    initialMode === 'quiz' ? 'bible-study' : 'fellowship'
  );
  const [pollAccent, setPollAccent] = useState(
    initialMode === 'quiz' ? '#f59e0b' : '#06b6d4'
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!open) return null;

  const validOptions = pollOptions.filter((o) => (o.label || '').trim() || o.file);
  const catObj = POLL_CATEGORIES.find((c) => c.id === selectedCategory) || POLL_CATEGORIES[2];

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (!session?.user?.id) {
      if (openAuth) openAuth('signin');
      return;
    }

    if (!question.trim()) {
      setErrorMsg('Please enter a poll question.');
      return;
    }

    if (validOptions.length < 2) {
      setErrorMsg('Please provide at least 2 poll options.');
      return;
    }

    setSubmitting(true);
    try {
      const durObj =
        POLL_DURATION_OPTIONS.find((d) => d.id === pollDuration) ||
        POLL_DURATION_OPTIONS[2];
      const startTimeMs =
        scheduleLater && startsAt ? new Date(startsAt).getTime() : Date.now();
      const expiresAtIso = new Date(startTimeMs + durObj.ms).toISOString();
      const startsAtIso =
        scheduleLater && startsAt ? new Date(startsAt).toISOString() : new Date().toISOString();

      const created = await createPoll({
        user_id: session.user.id,
        church_id: currentUser?.church_id || null,
        question: question.trim(),
        poll_type: pollType,
        is_quiz: isQuizMode || pollType === 'quiz',
        quiz_explanation: isQuizMode ? quizExplanation.trim() : null,
        poll_anonymous: isAnonymous,
        poll_multi_select: !isQuizMode && multiSelect,
        hide_results_until_vote: revealResultsAfterVoting,
        poll_starts_at: startsAtIso,
        poll_expires_at: expiresAtIso,
        poll_accent: pollAccent,
        category_id: selectedCategory,
        poll_category: catObj.label,
        visibility,
        options: validOptions.map((opt, idx) => ({
          label: opt.label.trim(),
          file: opt.file || null,
          preview: opt.preview || null,
          is_correct: (isQuizMode || pollType === 'quiz') && idx === correctOptionIdx,
          position: idx,
        })),
        author_profile: {
          id: session.user.id,
          display_name: isAnonymous
            ? 'Anonymous Believer'
            : currentUser?.display_name || session.user.email?.split('@')[0] || 'Believer',
          avatar_url: isAnonymous ? null : currentUser?.avatar_url || null,
          badge: isAnonymous ? null : currentUser?.badge || 'member',
          badge_verified: isAnonymous ? false : Boolean(currentUser?.badge_verified),
          role: currentUser?.role || 'member',
          church_name: currentUser?.church_name || null,
        },
      });

      playSound('postPublished');
      awardPoints('CREATE_POLL');

      if (onPollCreated && created) {
        onPollCreated(created);
      }

      // Reset & close
      setQuestion('');
      setPollOptions([
        { label: '', file: null, preview: null },
        { label: '', file: null, preview: null },
        { label: '', file: null, preview: null },
      ]);
      setQuizExplanation('');
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to publish poll');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PopupSheet
      open={open}
      onClose={onClose}
      size="lg"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 11,
              background: `color-mix(in srgb, ${pollAccent} 18%, transparent)`,
              border: `1px solid color-mix(in srgb, ${pollAccent} 45%, transparent)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: pollAccent,
            }}
          >
            <BarChart3 size={18} />
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--ink)' }}>
              Create Community Poll or Faith Quiz
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', fontWeight: 400 }}>
              Real-time voting, Scripture quizzes, photo options &amp; countdowns
            </div>
          </div>
        </div>
      }
      footer={
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '0.76rem', color: 'var(--ink-muted)' }}>
            {validOptions.length} of {pollOptions.length} options ready
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              className="report-cancel-btn"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="signin-btn"
              disabled={submitting || !question.trim() || validOptions.length < 2}
              onClick={handleSubmit}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: pollAccent,
                borderColor: pollAccent,
                color: '#ffffff',
              }}
            >
              <Send size={14} />
              <span>{submitting ? 'Publishing…' : isQuizMode ? 'Publish Faith Quiz' : 'Publish Poll'}</span>
            </button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="poll-builder-modal-form">
        {/* Question Input */}
        <div className="poll-builder-modal-field">
          <label className="poll-builder-modal-label" htmlFor="poll-builder-question-input">
            Poll or Quiz Question
          </label>
          <textarea
            id="poll-builder-question-input"
            rows={2}
            placeholder={
              isQuizMode
                ? 'e.g., In Ephesians 6, which piece of the Armor of God represents the Word of God?'
                : 'e.g., Which worship song should our choir open with this Sunday?'
            }
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="poll-builder-question-textarea"
            maxLength={280}
            required
          />
        </div>

        {/* Category & Visibility Row */}
        <div className="poll-builder-meta-grid">
          <div className="poll-builder-modal-field">
            <span className="poll-builder-modal-label">Category</span>
            <div className="poll-builder-chip-row">
              {POLL_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`poll-builder-cat-pill${selectedCategory === c.id ? ' active' : ''}`}
                  style={{ '--chip-color': c.accent }}
                  onClick={() => {
                    setSelectedCategory(c.id);
                    setPollAccent(c.accent);
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="poll-builder-modal-field">
            <span className="poll-builder-modal-label">Visibility</span>
            <div className="poll-builder-chip-row">
              {VISIBILITY_CHOICES.map((v) => {
                const VIcon = v.icon;
                return (
                  <button
                    key={v.id}
                    type="button"
                    className={`poll-builder-vis-pill${visibility === v.id ? ' active' : ''}`}
                    onClick={() => setVisibility(v.id)}
                  >
                    <VIcon size={13} />
                    <span>{v.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="poll-builder-error-banner" role="alert">
            <AlertCircle size={15} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Shared Poll Builder Fields + Live Preview */}
        <PollBuilderFields
          questionText={question}
          pollOptions={pollOptions}
          setPollOptions={setPollOptions}
          isQuizMode={isQuizMode}
          setIsQuizMode={setIsQuizMode}
          pollType={pollType}
          setPollType={setPollType}
          correctOptionIdx={correctOptionIdx}
          setCorrectOptionIdx={setCorrectOptionIdx}
          quizExplanation={quizExplanation}
          setQuizExplanation={setQuizExplanation}
          pollDuration={pollDuration}
          setPollDuration={setPollDuration}
          revealResultsAfterVoting={revealResultsAfterVoting}
          setRevealResultsAfterVoting={setRevealResultsAfterVoting}
          multiSelect={multiSelect}
          setMultiSelect={setMultiSelect}
          isAnonymous={isAnonymous}
          setIsAnonymous={setIsAnonymous}
          scheduleLater={scheduleLater}
          setScheduleLater={setScheduleLater}
          startsAt={startsAt}
          setStartsAt={setStartsAt}
          pollAccent={pollAccent}
          setPollAccent={setPollAccent}
          composeCategory={selectedCategory}
          visibility={visibility}
          currentIdentityName={
            isAnonymous
              ? 'Anonymous Believer'
              : currentUser?.display_name || session?.user?.email?.split('@')[0] || 'Believer'
          }
          currentIdentityAvatar={isAnonymous ? null : currentUser?.avatar_url}
          authorRoleLabel={
            isAnonymous
              ? 'Anonymous Ballot 🕵️'
              : currentUser?.role === 'church_admin'
                ? 'Church Administrator'
                : 'Community Member'
          }
          showExtendedSettings={true}
        />
      </form>
    </PopupSheet>
  );
}
