'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart3,
  CheckCircle2,
  PlusCircle,
  Sparkles,
  Tv,
  Share2,
  Award,
  TrendingUp,
  Search,
  X,
  Trophy,
  Flame,
  Clock,
  Lock,
  EyeOff,
  Flag,
  Trash2,
  StopCircle,
  Users,
  Layers,
  BookOpen,
  HelpCircle,
  Check,
  AlertCircle,
} from 'lucide-react';
import {
  ContentLayout,
  AccentCard,
  SectionBlock,
  FilterChips,
  SortMenu,
  StatStrip,
  SkeletonLayout,
  EmptyState,
  ErrorState,
} from './layoutkit';
import Avatar from './Avatar';
import MemberName from './MemberName';
import PopupSheet from './PopupSheet';
import ProjectionModeModal from './ProjectionModeModal';
import WatermarkShareModal from './WatermarkShareModal';
import PollAnalyticsModal from './PollAnalyticsModal';
import PollBuilderModal from './PollBuilderModal';
import ReportPostModal from './ReportPostModal';
import {
  listPolls,
  castPollVote,
  closePollEarly,
  deletePoll,
  getQuizLeaderboard,
  subscribeToPollRealtime,
} from '../lib/data/pollsApi';
import { usePollCountdown } from '../lib/useNow';
import { playSound } from '../lib/soundEffects';
import { awardPoints } from '../lib/badges';

const STATUS_CHIPS = [
  { id: 'all', label: 'All Polls' },
  { id: 'live', label: 'Live' },
  { id: 'closing_soon', label: 'Closing soon' },
  { id: 'closed', label: 'Closed' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'survey', label: 'Survey' },
];

const CATEGORY_CHIPS = [
  { id: 'All', label: 'All Categories' },
  { id: 'Worship', label: 'Worship' },
  { id: 'Bible Quiz', label: 'Bible Quiz' },
  { id: 'Church Life', label: 'Church Life' },
  { id: 'Discipleship', label: 'Discipleship' },
  { id: 'Youth & Gen-Z', label: 'Youth & Gen-Z' },
  { id: 'Prayer', label: 'Prayer' },
  { id: 'Missions', label: 'Missions' },
  { id: 'Fellowship', label: 'Fellowship' },
  { id: 'Icebreaker', label: 'Icebreaker' },
];

const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest' },
  { id: 'most_votes', label: 'Most votes' },
  { id: 'ending_soon', label: 'Ending soon' },
];

/**
 * SVG Circular Countdown Ring for Live Ending-Soon Polls
 */
function PollCountdownRing({ startsAt, expiresAt, closedAt, accent = '#06b6d4', size = 44 }) {
  const countdown = usePollCountdown(closedAt || expiresAt);
  const strokeWidth = 3.5;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;

  const isClosed = Boolean(closedAt || (countdown.hasExpiration && countdown.isExpired));

  let progress = 0.65;
  if (isClosed) {
    progress = 0;
  } else if (expiresAt) {
    const endMs = new Date(expiresAt).getTime();
    const startMs = startsAt ? new Date(startsAt).getTime() : endMs - 24 * 3600 * 1000;
    const totalSpan = Math.max(60 * 1000, endMs - startMs);
    const remMs = Math.max(0, (countdown.secondsRemaining || 0) * 1000);
    progress = Math.min(1, Math.max(0.04, remMs / totalSpan));
  }

  const dashOffset = circumference * (1 - progress);
  const shortLabel = isClosed
    ? 'Closed'
    : (countdown.label || 'Live').replace(' left', '');

  return (
    <div
      className="poll-countdown-ring-wrap"
      title={isClosed ? 'Poll Closed' : countdown.label || 'Active Poll'}
      aria-label={isClosed ? 'Poll Closed' : `Time remaining: ${countdown.label || 'Live'}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="poll-countdown-ring-svg">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(148, 163, 184, 0.18)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isClosed ? '#64748b' : accent}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <span className="poll-countdown-ring-text">{shortLabel}</span>
    </div>
  );
}

/**
 * Interactive Poll / Quiz / Icebreaker Card supporting all Layout Kit variants
 */
function InteractivePollCard({
  poll,
  variant = 'standard', // 'rail' | 'spotlight' | 'magazine' | 'tile' | 'list-rich' | 'compact'
  session,
  currentUser,
  canModerate,
  onVote,
  onOpenAnalytics,
  onOpenShare,
  onOpenProjection,
  onOpenReport,
  onRequestCloseEarly,
  onRequestDelete,
  votingOptionKey,
}) {
  const countdown = usePollCountdown(poll.poll_closed_at || poll.poll_expires_at);
  const isClosed = Boolean(
    poll.poll_closed_at || (countdown.hasExpiration && countdown.isExpired)
  );
  const isQuiz = Boolean(poll.is_quiz || poll.poll_type === 'quiz');
  const isIcebreaker = poll.poll_type === 'icebreaker';
  const accent =
    poll.poll_accent ||
    (isQuiz ? '#f59e0b' : isIcebreaker ? '#10b981' : '#06b6d4');

  const myVotes = Array.isArray(poll.my_votes) ? poll.my_votes : [];
  const hasVoted = myVotes.length > 0;
  const totalVotes = Number(poll.total_votes || 0);

  // Results visibility: visible if poll is closed, user has voted, or hide_results_until_vote is false
  const showResults = isClosed || hasVoted || !poll.hide_results_until_vote;

  // Determine winning option(s)
  const maxVotes = useMemo(() => {
    if (!poll.options || poll.options.length === 0) return 0;
    return Math.max(...poll.options.map((o) => Number(poll.counts?.[o.id] ?? o.vote_count ?? 0)));
  }, [poll.options, poll.counts]);

  const winnerOption = useMemo(() => {
    if (maxVotes <= 0) return null;
    return (poll.options || []).find(
      (o) => Number(poll.counts?.[o.id] ?? o.vote_count ?? 0) === maxVotes
    );
  }, [poll.options, poll.counts, maxVotes]);

  const correctOption = useMemo(
    () => (poll.options || []).find((o) => o.is_correct) || null,
    [poll.options]
  );

  const isOwnerOrMod = Boolean(
    session?.user?.id &&
      (poll.author_id === session.user.id || canModerate)
  );

  const hasOptionImages = (poll.options || []).some((o) => o.image_url);

  // Compact row variant (used in My Polls & My Votes)
  if (variant === 'compact') {
    return (
      <AccentCard accent={accent} variant="minimal" className="poll-hub-compact-card">
        <div className="poll-hub-compact-row">
          <div className="poll-hub-compact-left">
            <span
              className="poll-hub-type-dot"
              style={{ background: accent }}
              title={isQuiz ? 'Faith Quiz' : isIcebreaker ? 'Icebreaker' : 'Survey'}
            />
            <div className="poll-hub-compact-info">
              <div className="poll-hub-compact-title">{poll.text_content}</div>
              <div className="poll-hub-compact-sub">
                <span>{poll.poll_category || 'Community'}</span>
                <span>·</span>
                <span>{totalVotes} votes</span>
                <span>·</span>
                <span>{isClosed ? 'Closed' : countdown.label || 'Live'}</span>
                {hasVoted && (
                  <>
                    <span>·</span>
                    <span style={{ color: '#34d399', fontWeight: 700 }}>Voted ✓</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="poll-hub-compact-actions">
            <button
              type="button"
              className="poll-hub-icon-action"
              onClick={() => onOpenAnalytics(poll)}
              title="View Poll Analytics"
              aria-label="View Poll Analytics"
            >
              <BarChart3 size={15} />
            </button>
            <button
              type="button"
              className="poll-hub-icon-action"
              onClick={() => onOpenShare(poll)}
              title="Share as watermarked image"
              aria-label="Share poll card"
            >
              <Share2 size={15} />
            </button>
            {isOwnerOrMod && !isClosed && (
              <button
                type="button"
                className="poll-hub-icon-action warn"
                onClick={() => onRequestCloseEarly(poll)}
                title="Close poll early"
                aria-label="Close poll early"
              >
                <StopCircle size={15} />
              </button>
            )}
            {isOwnerOrMod && (
              <button
                type="button"
                className="poll-hub-icon-action danger"
                onClick={() => onRequestDelete(poll)}
                title="Delete poll"
                aria-label="Delete poll"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>
      </AccentCard>
    );
  }

  return (
    <AccentCard
      accent={accent}
      variant={variant === 'spotlight' ? 'neon' : variant === 'rail' ? 'edge' : 'wash'}
      className={`poll-hub-card poll-hub-card--${variant}`}
    >
      {/* Top Header: Author / Type Badge / Countdown Ring */}
      <div className="poll-hub-card__header">
        <div className="poll-hub-card__author">
          <Avatar
            name={poll.poll_anonymous ? 'Anonymous' : poll.profiles?.display_name || 'Church Ministry'}
            src={poll.poll_anonymous ? null : poll.profiles?.avatar_url}
            size={32}
          />
          <div className="poll-hub-card__author-meta">
            <div className="poll-hub-card__author-line">
              {poll.poll_anonymous ? (
                <span className="poll-hub-anon-name">
                  <EyeOff size={12} /> Anonymous Ballot
                </span>
              ) : (
                <MemberName
                  name={poll.profiles?.display_name || 'Church Ministry'}
                  badge={poll.profiles?.badge}
                  verified={poll.profiles?.badge_verified}
                  role={poll.profiles?.role}
                />
              )}
            </div>
            <div className="poll-hub-card__badges-row">
              <span
                className="poll-hub-type-pill"
                style={{
                  '--pill-color': accent,
                }}
              >
                {isQuiz ? '🎯 Faith Quiz' : isIcebreaker ? '🕊️ Icebreaker' : '📊 Survey'}
              </span>
              {poll.poll_category && (
                <span className="poll-hub-cat-pill">{poll.poll_category}</span>
              )}
              {poll.poll_multi_select && !isQuiz && (
                <span className="poll-hub-cat-pill" title="Multiple selections allowed">
                  <Layers size={10} /> Multi-select
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Countdown Ring or Status Pill */}
        <div className="poll-hub-card__timer">
          {variant === 'rail' || (!isClosed && countdown.hasExpiration) ? (
            <PollCountdownRing
              startsAt={poll.poll_starts_at || poll.created_at}
              expiresAt={poll.poll_expires_at}
              closedAt={poll.poll_closed_at}
              accent={accent}
              size={variant === 'rail' ? 46 : 42}
            />
          ) : (
            <span className={`poll-hub-status-badge ${isClosed ? 'is-closed' : 'is-live'}`}>
              {isClosed ? (
                <>
                  <Lock size={11} /> Closed
                </>
              ) : (
                <>
                  <Clock size={11} /> Live
                </>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Question Title */}
      <h3 className="poll-hub-card__question">{poll.text_content}</h3>

      {/* Winner Banner on Closed Polls */}
      {isClosed && winnerOption && totalVotes > 0 && (
        <div className="poll-hub-winner-banner">
          <Trophy size={15} className="text-amber-400 flex-shrink-0" />
          <div className="poll-hub-winner-banner__text">
            <span>{isQuiz ? 'Correct Answer:' : 'Winning Choice:'}</span>{' '}
            <strong>{(isQuiz && correctOption ? correctOption : winnerOption).label}</strong>
          </div>
          <span className="poll-hub-winner-banner__pct">
            {Math.round(
              ((Number(
                poll.counts?.[(isQuiz && correctOption ? correctOption : winnerOption).id] ??
                  (isQuiz && correctOption ? correctOption : winnerOption).vote_count ??
                  0
              )) /
                Math.max(1, totalVotes)) *
                100
            )}
            %
          </span>
        </div>
      )}

      {/* Options List or Photo Grid */}
      <div className={hasOptionImages ? 'poll-hub-photo-grid' : 'poll-hub-options-list'}>
        {(poll.options || []).map((opt, idx) => {
          const votes = Number(poll.counts?.[opt.id] ?? opt.vote_count ?? 0);
          const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          const isSelected = myVotes.includes(opt.id);
          const isWinner =
            showResults &&
            totalVotes > 0 &&
            votes === maxVotes &&
            (!isQuiz || opt.is_correct);
          const isQuizCorrect = isQuiz && (hasVoted || isClosed) && opt.is_correct;
          const isQuizWrong = isQuiz && hasVoted && isSelected && !opt.is_correct;
          const isVotingThis = votingOptionKey === `${poll.id}:${opt.id}`;

          return (
            <button
              key={opt.id || idx}
              type="button"
              disabled={isClosed || isVotingThis || (hasVoted && !poll.poll_multi_select)}
              className={`poll-hub-option-btn${hasOptionImages ? ' has-image' : ''}${
                isSelected ? ' is-selected' : ''
              }${isWinner ? ' is-winner' : ''}${isQuizCorrect ? ' is-quiz-correct' : ''}${
                isQuizWrong ? ' is-quiz-wrong' : ''
              }`}
              style={{ '--opt-accent': accent }}
              onClick={() => onVote(poll, opt)}
              aria-label={`Vote for ${opt.label}${showResults ? ` (${pct}%)` : ''}`}
            >
              {/* Option Photo if present */}
              {opt.image_url && (
                <div className="poll-hub-option-img-wrap">
                  <img src={opt.image_url} alt={opt.label} loading="lazy" />
                </div>
              )}

              <div className="poll-hub-option-row-inner">
                {/* Animated Percentage Fill Bar */}
                {showResults && (
                  <span
                    className="poll-hub-option-bar"
                    style={{
                      width: `${pct}%`,
                    }}
                  />
                )}

                <span className="poll-hub-option-left">
                  <span className={`poll-hub-option-check${isSelected ? ' checked' : ''}`}>
                    {isSelected ? <Check size={12} /> : idx + 1}
                  </span>
                  <span className="poll-hub-option-label">{opt.label}</span>

                  {isQuizCorrect && (
                    <span className="poll-hub-inline-tag correct">✓ Correct</span>
                  )}
                  {isQuizWrong && (
                    <span className="poll-hub-inline-tag wrong">✕ Your Pick</span>
                  )}
                  {!isQuiz && isWinner && isClosed && (
                    <span className="poll-hub-inline-tag winner">
                      <Trophy size={10} /> Winner
                    </span>
                  )}
                </span>

                {showResults ? (
                  <span className="poll-hub-option-right">
                    <strong className="poll-hub-option-pct">{pct}%</strong>
                    <small className="poll-hub-option-votes">{votes}</small>
                  </span>
                ) : (
                  <span className="poll-hub-option-right locked">
                    <Lock size={11} /> Vote to reveal
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Quiz Instant Explanation & Points Reveal */}
      {isQuiz && (hasVoted || isClosed) && (
        <div
          className={`poll-hub-quiz-explanation ${
            hasVoted && correctOption && myVotes.includes(correctOption.id)
              ? 'is-correct'
              : 'is-info'
          }`}
        >
          <div className="poll-hub-quiz-explanation__top">
            {hasVoted ? (
              correctOption && myVotes.includes(correctOption.id) ? (
                <span className="poll-hub-quiz-score pass">
                  🏆 +100 Points Earned · Correct Answer!
                </span>
              ) : (
                <span className="poll-hub-quiz-score retry">
                  ✍️ +10 Participation Points · Correct Answer: {correctOption?.label || 'Option'}
                </span>
              )
            ) : (
              <span className="poll-hub-quiz-score closed">
                📖 Scripture Explanation
              </span>
            )}
          </div>
          {poll.quiz_explanation && (
            <p className="poll-hub-quiz-explanation__body">{poll.quiz_explanation}</p>
          )}
        </div>
      )}

      {/* Hidden-until-vote Notice */}
      {!showResults && poll.hide_results_until_vote && (
        <div className="poll-hub-hidden-hint">
          <EyeOff size={12} />
          <span>Results are hidden until you cast your ballot</span>
        </div>
      )}

      {/* Card Footer: Total Votes + Voter Avatars + Action Bar */}
      <div className="poll-hub-card__footer">
        <div className="poll-hub-card__voters">
          {!poll.poll_anonymous && Array.isArray(poll.voters) && poll.voters.length > 0 && (
            <div className="poll-hub-avatar-stack" aria-label="Recent voters">
              {poll.voters.slice(0, 4).map((v, i) => (
                <span key={v.id || i} className="poll-hub-avatar-stack__item" title={v.display_name}>
                  <Avatar name={v.display_name || 'Voter'} src={v.avatar_url} size={22} />
                </span>
              ))}
            </div>
          )}
          <span className="poll-hub-vote-count-label">
            <Users size={12} />
            <strong>{totalVotes.toLocaleString()}</strong> {totalVotes === 1 ? 'vote' : 'votes'}
            {poll.poll_anonymous && ' · Anonymous'}
          </span>
        </div>

        <div className="poll-hub-card__actions">
          <button
            type="button"
            className="poll-hub-action-btn"
            onClick={() => onOpenAnalytics(poll)}
            title="Live Analytics & CSV Export"
            aria-label="Open poll analytics"
          >
            <BarChart3 size={14} />
            <span>Insights</span>
          </button>

          <button
            type="button"
            className="poll-hub-action-btn"
            onClick={() => onOpenShare(poll)}
            title="Share as watermarked card"
            aria-label="Share poll as image"
          >
            <Share2 size={14} />
            <span>Share</span>
          </button>

          <button
            type="button"
            className="poll-hub-action-btn"
            onClick={() => onOpenProjection(poll)}
            title="Project to Sanctuary Screen"
            aria-label="Project poll to screen"
          >
            <Tv size={14} />
          </button>

          {isOwnerOrMod && !isClosed && (
            <button
              type="button"
              className="poll-hub-action-btn warn"
              onClick={() => onRequestCloseEarly(poll)}
              title="Close poll early"
              aria-label="Close poll early"
            >
              <StopCircle size={14} />
            </button>
          )}

          {isOwnerOrMod ? (
            <button
              type="button"
              className="poll-hub-action-btn danger"
              onClick={() => onRequestDelete(poll)}
              title="Delete poll"
              aria-label="Delete poll"
            >
              <Trash2 size={14} />
            </button>
          ) : (
            <button
              type="button"
              className="poll-hub-action-btn"
              onClick={() => onOpenReport(poll)}
              title="Report poll"
              aria-label="Report poll"
            >
              <Flag size={13} />
            </button>
          )}
        </div>
      </div>
    </AccentCard>
  );
}

export default function PollsView({
  session,
  currentUser,
  openAuth,
}) {
  const [polls, setPolls] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search, Filter & Sort state
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [myTabMode, setMyTabMode] = useState('my_votes'); // 'my_votes' | 'my_polls'

  // Modals & Action states
  const [builderModalOpen, setBuilderModalOpen] = useState(false);
  const [builderInitialMode, setBuilderInitialMode] = useState('survey');
  const [analyticsPoll, setAnalyticsPoll] = useState(null);
  const [shareModalData, setShareModalData] = useState(null);
  const [projectionData, setProjectionData] = useState(null);
  const [reportingPoll, setReportingPoll] = useState(null);
  const [confirmClosePoll, setConfirmClosePoll] = useState(null);
  const [confirmDeletePoll, setConfirmDeletePoll] = useState(null);
  const [votingOptionKey, setVotingOptionKey] = useState(null);
  const [voteFeedbackBanner, setVoteFeedbackBanner] = useState(null);

  // Debounce search input (250ms)
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput.trim().toLowerCase());
    }, 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const canModerate = useMemo(() => {
    const role = currentUser?.role;
    const badge = currentUser?.badge;
    return Boolean(
      role === 'platform_admin' ||
        role === 'church_admin' ||
        (currentUser?.badge_verified &&
          ['pastor', 'elder', 'bishop', 'reverend', 'apostle'].includes(badge))
    );
  }, [currentUser]);

  const fetchAllData = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      const [pollsList, lbList] = await Promise.all([
        listPolls({ userId: session?.user?.id || null }),
        getQuizLeaderboard(8),
      ]);
      setPolls(pollsList);
      setLeaderboard(lbList);
    } catch (err) {
      if (!silent) {
        setError(err.message || 'Unable to load community polls');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchAllData(false);
  }, [fetchAllData]);

  // Subscribe to Supabase Realtime updates on poll_votes, quiz_scores, posts
  useEffect(() => {
    const unsubscribe = subscribeToPollRealtime(() => {
      fetchAllData(true);
    });
    return () => unsubscribe();
  }, [fetchAllData]);

  // Handle One-Tap Voting with Optimistic Update + Server Validation + Rollback
  async function handleCastVote(poll, option) {
    if (!session?.user?.id) {
      if (openAuth) openAuth('signin');
      return;
    }

    const key = `${poll.id}:${option.id}`;
    if (votingOptionKey) return;

    const nowMs = Date.now();
    if (
      poll.poll_closed_at ||
      (poll.poll_expires_at && new Date(poll.poll_expires_at).getTime() <= nowMs)
    ) {
      setVoteFeedbackBanner({
        type: 'error',
        text: 'This poll has already closed and expired.',
      });
      return;
    }

    const existingVotes = Array.isArray(poll.my_votes) ? poll.my_votes : [];
    const isMulti = Boolean(poll.poll_multi_select) && !poll.is_quiz;
    if (!isMulti && existingVotes.length > 0) {
      setVoteFeedbackBanner({
        type: 'error',
        text: 'You have already voted in this poll.',
      });
      return;
    }

    // Save snapshot for rollback
    const previousPolls = polls;
    setVotingOptionKey(key);
    setVoteFeedbackBanner(null);

    // Optimistic update
    const alreadySelected = existingVotes.includes(option.id);
    const nextMyVotes = isMulti
      ? alreadySelected
        ? existingVotes.filter((id) => id !== option.id)
        : [...existingVotes, option.id]
      : [option.id];
    const delta = alreadySelected ? -1 : 1;

    setPolls((prev) =>
      prev.map((p) => {
        if (p.id !== poll.id) return p;
        const currentCount = Number(p.counts?.[option.id] ?? option.vote_count ?? 0);
        const nextCount = Math.max(0, currentCount + delta);
        const nextCounts = { ...(p.counts || {}), [option.id]: nextCount };
        const nextOptions = (p.options || []).map((o) =>
          o.id === option.id ? { ...o, vote_count: nextCount } : o
        );
        return {
          ...p,
          my_votes: nextMyVotes,
          counts: nextCounts,
          options: nextOptions,
          total_votes: Math.max(0, Number(p.total_votes || 0) + delta),
        };
      })
    );

    const isQuiz = Boolean(poll.is_quiz || poll.poll_type === 'quiz');
    playSound(isQuiz && option.is_correct ? 'badge' : 'reaction');

    try {
      const result = await castPollVote({
        pollId: poll.id,
        optionId: option.id,
        userId: session.user.id,
        voterName: currentUser?.display_name || session.user.email?.split('@')[0] || 'Member',
        voterAvatar: currentUser?.avatar_url || null,
        voterBadge: currentUser?.badge || 'member',
        voterVerified: Boolean(currentUser?.badge_verified),
      });

      awardPoints('VOTE_POLL');

      // Reconcile exact server counts
      if (result && result.ok) {
        setPolls((prev) =>
          prev.map((p) => {
            if (p.id !== poll.id) return p;
            const syncedCounts = result.counts || p.counts;
            const syncedOptions = (p.options || []).map((o) => ({
              ...o,
              vote_count:
                syncedCounts?.[o.id] !== undefined
                  ? Number(syncedCounts[o.id])
                  : o.vote_count,
            }));
            return {
              ...p,
              counts: syncedCounts,
              options: syncedOptions,
              total_votes:
                result.total_votes !== undefined ? Number(result.total_votes) : p.total_votes,
              my_votes: Array.isArray(result.my_votes) ? result.my_votes : nextMyVotes,
            };
          })
        );

        if (result.is_quiz) {
          getQuizLeaderboard(8).then(setLeaderboard).catch(() => {});
        }
      }
    } catch (err) {
      // Rollback optimistic state
      setPolls(previousPolls);
      setVoteFeedbackBanner({
        type: 'error',
        text: err.message || 'Vote could not be recorded.',
      });
    } finally {
      setVotingOptionKey(null);
    }
  }

  async function handleConfirmCloseEarly() {
    if (!confirmClosePoll || !session?.user?.id) return;
    const targetId = confirmClosePoll.id;
    const nowIso = new Date().toISOString();
    setConfirmClosePoll(null);

    const prev = polls;
    setPolls((list) =>
      list.map((p) =>
        p.id === targetId ? { ...p, poll_closed_at: nowIso, poll_expires_at: nowIso } : p
      )
    );

    try {
      await closePollEarly({ pollId: targetId, userId: session.user.id });
    } catch {
      setPolls(prev);
    }
  }

  async function handleConfirmDelete() {
    if (!confirmDeletePoll || !session?.user?.id) return;
    const targetId = confirmDeletePoll.id;
    setConfirmDeletePoll(null);

    const prev = polls;
    setPolls((list) => list.filter((p) => p.id !== targetId));

    try {
      await deletePoll({ pollId: targetId, userId: session.user.id });
    } catch {
      setPolls(prev);
    }
  }

  function handleOpenShare(poll) {
    const topOpt = (poll.options || []).reduce(
      (best, cur) =>
        Number(poll.counts?.[cur.id] ?? cur.vote_count ?? 0) >
        Number(poll.counts?.[best?.id] ?? best?.vote_count ?? -1)
          ? cur
          : best,
      null
    );
    const total = Number(poll.total_votes || 0);
    const topPct =
      topOpt && total > 0
        ? Math.round((Number(poll.counts?.[topOpt.id] ?? topOpt.vote_count ?? 0) / total) * 100)
        : 0;

    setShareModalData({
      title: poll.profiles?.display_name || 'Shammah Poll',
      subtitle: `${poll.poll_category || 'Community Poll'} · ${total} Votes`,
      text: `${poll.text_content}${
        topOpt && total > 0 ? `\n\nLeading Choice: "${topOpt.label}" (${topPct}%)` : ''
      }`,
      categoryLabel: poll.is_quiz ? 'Faith Quiz' : 'Community Poll',
    });
  }

  function handleOpenProjection(poll) {
    setProjectionData({
      type: 'poll',
      title: poll.text_content,
      subtitle: `${poll.profiles?.display_name || 'Church Poll'} · ${poll.total_votes || 0} Total Votes`,
      options: (poll.options || []).map((o) => ({
        ...o,
        votes: Number(poll.counts?.[o.id] ?? o.vote_count ?? 0),
      })),
      counts: poll.counts || {},
      totalVotes: poll.total_votes || 0,
    });
  }

  // Classify polls by status & search/filter
  const nowMs = Date.now();

  const isPollClosed = useCallback(
    (p) =>
      Boolean(
        p.poll_closed_at ||
          (p.poll_expires_at && new Date(p.poll_expires_at).getTime() <= nowMs)
      ),
    [nowMs]
  );

  const isPollClosingSoon = useCallback(
    (p) => {
      if (isPollClosed(p) || !p.poll_expires_at) return false;
      const diffHours = (new Date(p.poll_expires_at).getTime() - nowMs) / (3600 * 1000);
      return diffHours > 0 && diffHours <= 12;
    },
    [isPollClosed, nowMs]
  );

  const filteredPolls = useMemo(() => {
    return polls
      .filter((p) => {
        if (debouncedSearch) {
          const qMatch = (p.text_content || '').toLowerCase().includes(debouncedSearch);
          const optMatch = (p.options || []).some((o) =>
            (o.label || '').toLowerCase().includes(debouncedSearch)
          );
          const catMatch = (p.poll_category || '').toLowerCase().includes(debouncedSearch);
          if (!qMatch && !optMatch && !catMatch) return false;
        }

        if (categoryFilter !== 'All') {
          const cat = (p.poll_category || p.category_id || '').toLowerCase();
          if (cat !== categoryFilter.toLowerCase()) return false;
        }

        const closed = isPollClosed(p);
        if (statusFilter === 'live' && closed) return false;
        if (statusFilter === 'closing_soon' && !isPollClosingSoon(p)) return false;
        if (statusFilter === 'closed' && !closed) return false;
        if (statusFilter === 'quiz' && !(p.is_quiz || p.poll_type === 'quiz')) return false;
        if (
          statusFilter === 'survey' &&
          (p.is_quiz || p.poll_type === 'quiz' || p.poll_type === 'icebreaker')
        ) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'most_votes') {
          return Number(b.total_votes || 0) - Number(a.total_votes || 0);
        }
        if (sortBy === 'ending_soon') {
          const aExp = a.poll_expires_at ? new Date(a.poll_expires_at).getTime() : Infinity;
          const bExp = b.poll_expires_at ? new Date(b.poll_expires_at).getTime() : Infinity;
          return aExp - bExp;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [polls, debouncedSearch, categoryFilter, statusFilter, sortBy, isPollClosed, isPollClosingSoon]);

  // Dedicated Section Blocks
  const liveEndingSoonPolls = useMemo(
    () =>
      filteredPolls
        .filter((p) => !isPollClosed(p) && p.poll_expires_at)
        .sort(
          (a, b) =>
            new Date(a.poll_expires_at).getTime() - new Date(b.poll_expires_at).getTime()
        )
        .slice(0, 6),
    [filteredPolls, isPollClosed]
  );

  const featuredQuiz = useMemo(
    () =>
      filteredPolls.find((p) => !isPollClosed(p) && (p.is_quiz || p.poll_type === 'quiz')) ||
      filteredPolls.find((p) => p.is_quiz || p.poll_type === 'quiz') ||
      null,
    [filteredPolls, isPollClosed]
  );

  const communitySurveys = useMemo(
    () =>
      filteredPolls.filter(
        (p) =>
          !isPollClosed(p) &&
          !p.is_quiz &&
          p.poll_type !== 'quiz' &&
          p.poll_type !== 'icebreaker'
      ),
    [filteredPolls, isPollClosed]
  );

  const faithQuizzes = useMemo(
    () =>
      filteredPolls.filter(
        (p) => !isPollClosed(p) && (p.is_quiz || p.poll_type === 'quiz')
      ),
    [filteredPolls, isPollClosed]
  );

  const icebreakerPolls = useMemo(
    () => filteredPolls.filter((p) => p.poll_type === 'icebreaker'),
    [filteredPolls]
  );

  const closedResultsPolls = useMemo(
    () => filteredPolls.filter((p) => isPollClosed(p)),
    [filteredPolls, isPollClosed]
  );

  const myVotedPolls = useMemo(
    () => polls.filter((p) => Array.isArray(p.my_votes) && p.my_votes.length > 0),
    [polls]
  );

  const myCreatedPolls = useMemo(
    () =>
      session?.user?.id
        ? polls.filter((p) => p.author_id === session.user.id)
        : [],
    [polls, session?.user?.id]
  );

  // KPI Stat Strip
  const statsItems = useMemo(() => {
    const totalBallots = polls.reduce((s, p) => s + Number(p.total_votes || 0), 0);
    const liveCount = polls.filter((p) => !isPollClosed(p)).length;
    const quizCount = polls.filter((p) => p.is_quiz || p.poll_type === 'quiz').length;
    return [
      { label: 'Active Polls', value: liveCount, icon: Flame, accent: '#06b6d4' },
      { label: 'Total Votes Cast', value: totalBallots.toLocaleString(), icon: TrendingUp, accent: '#10b981' },
      { label: 'Faith Quizzes', value: quizCount, icon: Award, accent: '#f59e0b' },
      { label: 'My Participation', value: myVotedPolls.length, icon: CheckCircle2, accent: '#8b5cf6' },
    ];
  }, [polls, isPollClosed, myVotedPolls.length]);

  const sharedCardProps = {
    session,
    currentUser,
    canModerate,
    onVote: handleCastVote,
    onOpenAnalytics: (p) => setAnalyticsPoll(p),
    onOpenShare: handleOpenShare,
    onOpenProjection: handleOpenProjection,
    onOpenReport: (p) => setReportingPoll(p),
    onRequestCloseEarly: (p) => setConfirmClosePoll(p),
    onRequestDelete: (p) => setConfirmDeletePoll(p),
    votingOptionKey,
  };

  return (
    <div className="polls-hub-page">
      {/* Hero Banner with Create Poll & Quiz Icon Buttons */}
      <header className="polls-hub-hero">
        <div className="polls-hub-hero__left">
          <div className="polls-hub-hero__icon">
            <BarChart3 size={26} />
          </div>
          <div>
            <div className="polls-hub-hero__eyebrow">
              <Sparkles size={13} />
              <span>Voice of the Congregation · Live Ballots &amp; Trivia</span>
            </div>
            <h1 className="polls-hub-hero__title">Community Polls &amp; Faith Quizzes</h1>
            <p className="polls-hub-hero__subtitle">
              Vote in church decisions, test your Scripture knowledge, and watch real-time results unfold.
            </p>
          </div>
        </div>

        <div className="polls-hub-hero__actions">
          <button
            type="button"
            className="polls-hub-create-btn quiz"
            onClick={() => {
              if (!session?.user?.id) {
                if (openAuth) openAuth('signin');
                return;
              }
              setBuilderInitialMode('quiz');
              setBuilderModalOpen(true);
            }}
            aria-label="Create a Faith Quiz"
          >
            <HelpCircle size={16} />
            <span>New Quiz</span>
          </button>

          <button
            type="button"
            className="polls-hub-create-btn primary"
            onClick={() => {
              if (!session?.user?.id) {
                if (openAuth) openAuth('signin');
                return;
              }
              setBuilderInitialMode('survey');
              setBuilderModalOpen(true);
            }}
            aria-label="Create a Community Poll"
          >
            <PlusCircle size={16} />
            <span>Create Poll</span>
          </button>
        </div>
      </header>

      {/* Stat Strip */}
      <StatStrip items={statsItems} className="polls-hub-stats" />

      {/* Search, Status Chips, Category Chips & Sort Bar */}
      <div className="polls-hub-controls-card">
        <div className="polls-hub-search-sort-row">
          <div className="polls-hub-search-box">
            <Search size={16} className="polls-hub-search-icon" />
            <input
              type="text"
              placeholder="Search polls, Bible quizzes, options, or topics…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="polls-hub-search-input"
              aria-label="Search polls"
            />
            {searchInput && (
              <button
                type="button"
                className="polls-hub-search-clear"
                onClick={() => setSearchInput('')}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <SortMenu
            options={SORT_OPTIONS}
            value={sortBy}
            onChange={setSortBy}
            label="Sort polls"
          />
        </div>

        <FilterChips
          options={STATUS_CHIPS.map((c) => ({
            ...c,
            count:
              c.id === 'all'
                ? polls.length
                : c.id === 'live'
                  ? polls.filter((p) => !isPollClosed(p)).length
                  : c.id === 'closing_soon'
                    ? polls.filter((p) => isPollClosingSoon(p)).length
                    : c.id === 'closed'
                      ? polls.filter((p) => isPollClosed(p)).length
                      : c.id === 'quiz'
                        ? polls.filter((p) => p.is_quiz || p.poll_type === 'quiz').length
                        : polls.filter(
                            (p) =>
                              !p.is_quiz &&
                              p.poll_type !== 'quiz' &&
                              p.poll_type !== 'icebreaker'
                          ).length,
          }))}
          value={statusFilter}
          onChange={setStatusFilter}
        />

        <FilterChips
          options={CATEGORY_CHIPS}
          value={categoryFilter}
          onChange={setCategoryFilter}
          className="polls-hub-category-chips"
        />
      </div>

      {/* Feedback Banner if vote rejected */}
      {voteFeedbackBanner && (
        <div className="polls-hub-feedback-banner" role="alert">
          <AlertCircle size={16} />
          <span>{voteFeedbackBanner.text}</span>
          <button
            type="button"
            onClick={() => setVoteFeedbackBanner(null)}
            aria-label="Dismiss notice"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Loading & Error States */}
      {loading ? (
        <div className="polls-hub-skeletons">
          <SkeletonLayout layout="rail" count={3} />
          <SkeletonLayout layout="spotlight" count={1} />
          <SkeletonLayout layout="magazine-x2" count={4} />
        </div>
      ) : error ? (
        <ErrorState
          title="Could not load polls"
          message={error}
          onRetry={() => fetchAllData(false)}
        />
      ) : filteredPolls.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No polls match your filters"
          hint="Try clearing your search or create a new poll for the church community."
          action={
            <button
              type="button"
              className="polls-hub-create-btn primary"
              onClick={() => {
                setStatusFilter('all');
                setCategoryFilter('All');
                setSearchInput('');
              }}
            >
              Reset Filters
            </button>
          }
        />
      ) : (
        <div className="polls-hub-sections">
          {/* 1. LIVE NOW · ENDING SOON (Rail with Countdown Rings) */}
          {liveEndingSoonPolls.length > 0 && statusFilter !== 'closed' && (
            <SectionBlock
              title="Live Now · Ending Soon"
              subtitle="Cast your vote before the countdown ring reaches zero"
              icon={Flame}
              accent="#ec4899"
              count={liveEndingSoonPolls.length}
            >
              <ContentLayout
                layout="rail"
                railCardWidth="310px"
                items={liveEndingSoonPolls}
                renderItem={(poll) => (
                  <InteractivePollCard
                    key={poll.id}
                    poll={poll}
                    variant="rail"
                    {...sharedCardProps}
                  />
                )}
              />
            </SectionBlock>
          )}

          {/* 2. FEATURED QUIZ (Spotlight) */}
          {featuredQuiz && statusFilter !== 'survey' && statusFilter !== 'closed' && (
            <SectionBlock
              title="Featured Scripture Quiz"
              subtitle="Test your Bible knowledge, see the Scripture explanation, and earn leaderboard points"
              icon={Award}
              accent="#f59e0b"
            >
              <ContentLayout
                layout="spotlight"
                items={[featuredQuiz]}
                renderItem={(poll) => (
                  <InteractivePollCard
                    key={poll.id}
                    poll={poll}
                    variant="spotlight"
                    {...sharedCardProps}
                  />
                )}
              />
            </SectionBlock>
          )}

          {/* 3. COMMUNITY SURVEYS (Magazine-x2) */}
          {communitySurveys.length > 0 && statusFilter !== 'quiz' && statusFilter !== 'closed' && (
            <SectionBlock
              title="Community Surveys"
              subtitle="Shape worship nights, service times, and ministry outreach"
              icon={BarChart3}
              accent="#06b6d4"
              count={communitySurveys.length}
            >
              <ContentLayout
                layout="magazine-x2"
                items={communitySurveys}
                renderItem={(poll) => (
                  <InteractivePollCard
                    key={poll.id}
                    poll={poll}
                    variant="magazine"
                    {...sharedCardProps}
                  />
                )}
              />
            </SectionBlock>
          )}

          {/* 4. FAITH QUIZZES (Magazine-flat) + WEEKLY QUIZ LEADERBOARD */}
          {faithQuizzes.length > 0 && statusFilter !== 'survey' && statusFilter !== 'closed' && (
            <SectionBlock
              title="Faith & Bible Quizzes"
              subtitle="Answer correctly for +100 pts or +10 participation pts"
              icon={BookOpen}
              accent="#f59e0b"
              count={faithQuizzes.length}
            >
              <ContentLayout
                layout="magazine-flat"
                items={faithQuizzes}
                renderItem={(poll) => (
                  <InteractivePollCard
                    key={poll.id}
                    poll={poll}
                    variant="magazine"
                    {...sharedCardProps}
                  />
                )}
              />
            </SectionBlock>
          )}

          {/* WEEKLY QUIZ LEADERBOARD */}
          {leaderboard.length > 0 && statusFilter !== 'survey' && (
            <SectionBlock
              title="Weekly Faith Quiz Leaderboard"
              subtitle="Top Scripture scholars over the last 7 days"
              icon={Trophy}
              accent="#f59e0b"
              count={leaderboard.length}
            >
              <div className="polls-hub-leaderboard-grid">
                {leaderboard.map((entry, idx) => {
                  const rank = idx + 1;
                  const medal =
                    rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
                  return (
                    <div
                      key={entry.user_id || idx}
                      className={`polls-hub-leaderboard-row${rank <= 3 ? ` rank-${rank}` : ''}`}
                    >
                      <span className="polls-hub-leaderboard-rank">{medal}</span>
                      <Avatar
                        name={entry.display_name}
                        src={entry.avatar_url}
                        size={34}
                      />
                      <div className="polls-hub-leaderboard-user">
                        <MemberName
                          name={entry.display_name}
                          badge={entry.badge}
                          verified={entry.badge_verified}
                          role={entry.role}
                        />
                        <span className="polls-hub-leaderboard-meta">
                          {entry.correct_count}/{entry.quizzes_taken} correct · {entry.accuracy_pct}% accuracy
                        </span>
                      </div>
                      <div className="polls-hub-leaderboard-score">
                        <strong>{entry.total_score}</strong>
                        <small>pts</small>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionBlock>
          )}

          {/* 5. FELLOWSHIP ICEBREAKERS (Tiles) */}
          {icebreakerPolls.length > 0 && statusFilter !== 'quiz' && statusFilter !== 'closed' && (
            <SectionBlock
              title="Fellowship Icebreakers"
              subtitle="Warm check-ins and quick Sunday reflections"
              icon={Sparkles}
              accent="#10b981"
              count={icebreakerPolls.length}
            >
              <ContentLayout
                layout="tiles"
                items={icebreakerPolls}
                renderItem={(poll) => (
                  <InteractivePollCard
                    key={poll.id}
                    poll={poll}
                    variant="tile"
                    {...sharedCardProps}
                  />
                )}
              />
            </SectionBlock>
          )}

          {/* 6. RESULTS & CLOSED POLLS (List-rich with Winner Badge) */}
          {closedResultsPolls.length > 0 && statusFilter !== 'live' && statusFilter !== 'closing_soon' && (
            <SectionBlock
              title="Results & Closed Polls"
              subtitle="Final locked outcomes and winning choices from completed ballots"
              icon={Trophy}
              accent="#8b5cf6"
              count={closedResultsPolls.length}
            >
              <ContentLayout
                layout="list-rich"
                items={closedResultsPolls}
                renderItem={(poll) => (
                  <InteractivePollCard
                    key={poll.id}
                    poll={poll}
                    variant="list-rich"
                    {...sharedCardProps}
                  />
                )}
              />
            </SectionBlock>
          )}

          {/* 7. MY POLLS & MY VOTES (Compact) */}
          <SectionBlock
            title="My Polls & My Votes"
            subtitle="Quick access to polls you created or voted in"
            icon={CheckCircle2}
            accent="#06b6d4"
            action={
              <div className="polls-hub-my-tabs">
                <button
                  type="button"
                  className={`polls-hub-my-tab${myTabMode === 'my_votes' ? ' active' : ''}`}
                  onClick={() => setMyTabMode('my_votes')}
                >
                  My Votes ({myVotedPolls.length})
                </button>
                <button
                  type="button"
                  className={`polls-hub-my-tab${myTabMode === 'my_polls' ? ' active' : ''}`}
                  onClick={() => setMyTabMode('my_polls')}
                >
                  My Polls ({myCreatedPolls.length})
                </button>
              </div>
            }
          >
            {myTabMode === 'my_votes' ? (
              myVotedPolls.length > 0 ? (
                <ContentLayout
                  layout="compact"
                  items={myVotedPolls}
                  renderItem={(poll) => (
                    <InteractivePollCard
                      key={poll.id}
                      poll={poll}
                      variant="compact"
                      {...sharedCardProps}
                    />
                  )}
                />
              ) : (
                <EmptyState
                  icon={CheckCircle2}
                  title="You haven't voted yet"
                  hint="Tap any option on a live poll or quiz above to record your first ballot."
                />
              )
            ) : myCreatedPolls.length > 0 ? (
              <ContentLayout
                layout="compact"
                items={myCreatedPolls}
                renderItem={(poll) => (
                  <InteractivePollCard
                    key={poll.id}
                    poll={poll}
                    variant="compact"
                    {...sharedCardProps}
                  />
                )}
              />
            ) : (
              <EmptyState
                icon={PlusCircle}
                title="You haven't created a poll yet"
                hint="Start a survey, Bible quiz, or fellowship icebreaker for the community."
                action={
                  <button
                    type="button"
                    className="polls-hub-create-btn primary"
                    onClick={() => {
                      if (!session?.user?.id) {
                        if (openAuth) openAuth('signin');
                        return;
                      }
                      setBuilderInitialMode('survey');
                      setBuilderModalOpen(true);
                    }}
                  >
                    <PlusCircle size={15} />
                    <span>Create Your First Poll</span>
                  </button>
                }
              />
            )}
          </SectionBlock>
        </div>
      )}

      {/* Poll Builder Modal */}
      <PollBuilderModal
        open={builderModalOpen}
        onClose={() => setBuilderModalOpen(false)}
        session={session}
        currentUser={currentUser}
        openAuth={openAuth}
        initialMode={builderInitialMode}
        onPollCreated={(newPoll) => {
          setPolls((prev) => [newPoll, ...prev.filter((p) => p.id !== newPoll.id)]);
        }}
      />

      {/* Poll Analytics Modal */}
      {analyticsPoll && (
        <PollAnalyticsModal
          post={analyticsPoll}
          options={analyticsPoll.options || []}
          counts={analyticsPoll.counts || {}}
          onClose={() => setAnalyticsPoll(null)}
        />
      )}

      {/* Watermark Share Modal */}
      {shareModalData && (
        <WatermarkShareModal
          item={shareModalData}
          onClose={() => setShareModalData(null)}
        />
      )}

      {/* Sanctuary Screen Projection Modal */}
      {projectionData && (
        <ProjectionModeModal
          data={projectionData}
          onClose={() => setProjectionData(null)}
        />
      )}

      {/* Report Poll Modal */}
      {reportingPoll && (
        <ReportPostModal
          post={reportingPoll}
          onClose={() => setReportingPoll(null)}
        />
      )}

      {/* Confirm Close Early PopupSheet */}
      <PopupSheet
        open={Boolean(confirmClosePoll)}
        onClose={() => setConfirmClosePoll(null)}
        size="sm"
        title="Close Poll Early?"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, width: '100%' }}>
            <button
              type="button"
              className="report-cancel-btn"
              onClick={() => setConfirmClosePoll(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="report-submit-btn"
              onClick={handleConfirmCloseEarly}
            >
              Close Poll Now
            </button>
          </div>
        }
      >
        <p style={{ fontSize: '0.88rem', color: 'var(--ink-muted)', lineHeight: 1.5 }}>
          Closing this poll early will immediately lock the current results and prevent any further ballots from being cast.
        </p>
      </PopupSheet>

      {/* Confirm Delete Poll PopupSheet */}
      <PopupSheet
        open={Boolean(confirmDeletePoll)}
        onClose={() => setConfirmDeletePoll(null)}
        size="sm"
        title="Delete Poll?"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, width: '100%' }}>
            <button
              type="button"
              className="report-cancel-btn"
              onClick={() => setConfirmDeletePoll(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="report-submit-btn"
              onClick={handleConfirmDelete}
            >
              Delete Permanently
            </button>
          </div>
        }
      >
        <p style={{ fontSize: '0.88rem', color: 'var(--ink-muted)', lineHeight: 1.5 }}>
          Are you sure you want to permanently delete this poll and all of its recorded votes?
        </p>
      </PopupSheet>
    </div>
  );
}
