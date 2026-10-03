'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Repeat, Globe, Users, Church, Lock, MoreHorizontal, Rss, ExternalLink, Tv, DownloadCloud, Check, Eye, EyeOff, BookOpen, AlertCircle, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { categoryStyle, timeAgo } from '../lib/postDisplay';
import Avatar from './Avatar';
import MemberName from './MemberName';
import ReactionBar from './ReactionBar';
import CommentThread from './CommentThread';
import PinIcon from './PinIcon';
import RepostModal from './RepostModal';
import PostVisibilityModal from './PostVisibilityModal';
import AuthorOverviewModal from './AuthorOverviewModal';
import InstitutionProfileModal from './InstitutionProfileModal';
import PostOptionsMenu from './PostOptionsMenu';
import ReportPostModal from './ReportPostModal';
import WatermarkShareModal from './WatermarkShareModal';
import ProjectionModeModal from './ProjectionModeModal';
import ShareMenuModal from './ShareMenuModal';
import PollAnalyticsModal from './PollAnalyticsModal';
import {
  isPostReposted,
  getPostRepostCount,
  toggleRepost,
  getPostVisibility,
} from '../lib/postInteractions';
import {
  saveOfflineItem,
  isItemSavedOffline,
  canDownloadOffline,
} from '../lib/offlineSyncManager';
import { playSound } from '../lib/soundEffects';
import { Clock, TrendingUp } from 'lucide-react';

function PollBlock({
  options,
  counts,
  myVote,
  canVote,
  onVote,
  pollExpiresAt = null,
  pollDuration = null,
  revealResultsAfterVoting = false,
  onOpenAnalytics = null,
  isQuiz = false,
  quizExplanation = null,
}) {
  const [revealOnlyAfterVote, setRevealOnlyAfterVote] = useState(revealResultsAfterVoting ?? false);
  const total = options.reduce((sum, o) => sum + (counts[o.id] || 0), 0);
  const hasVoted = myVote != null;
  const hasImages = options.some((o) => o.image_url);

  // Quiz scoring calculations
  const correctOpt = options.find((o) => o.is_correct);
  const myOpt = options.find((o) => o.id === myVote);
  const isMyVoteCorrect = myOpt ? Boolean(myOpt.is_correct) : false;

  // Check if poll is expired
  const isExpired = pollExpiresAt ? new Date(pollExpiresAt).getTime() < Date.now() : false;
  const canSeeResults = !revealOnlyAfterVote || hasVoted || isExpired;

  function formatTimeRemaining(isoDate) {
    if (!isoDate) {
      if (pollDuration === '1h') return '1h remaining';
      if (pollDuration === '3d') return '3d remaining';
      if (pollDuration === '7d') return '7d remaining';
      return '24h remaining';
    }
    const diff = new Date(isoDate).getTime() - Date.now();
    if (diff <= 0) return 'Closed';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days >= 1) return `${days}d ${hours % 24}h left`;
    const minutes = Math.floor(diff / (1000 * 60));
    if (hours >= 1) return `${hours}h ${minutes % 60}m left`;
    return `${Math.max(1, minutes)}m left`;
  }

  if (hasImages) {
    return (
      <div className="poll">
        {/* Poll Header Bar: Expiration Countdown & Reveal Results Toggle */}
        <div className="poll-card-meta-bar">
          <div className="poll-status-tag-group">
            {isExpired ? (
              <span className="poll-badge-closed">
                <span>🏁 Poll Closed · Final Results</span>
              </span>
            ) : (
              <span className="poll-badge-active" title={pollExpiresAt || 'Active Poll'}>
                <Clock size={11} />
                <span>{formatTimeRemaining(pollExpiresAt)}</span>
              </span>
            )}
          </div>

          <button
            type="button"
            className={`poll-reveal-toggle-btn${revealOnlyAfterVote ? ' is-active' : ''}`}
            onClick={() => setRevealOnlyAfterVote((v) => !v)}
            title={revealOnlyAfterVote ? 'Results hidden before vote. Click to preview' : 'Results visible. Click to hide before voting'}
          >
            {revealOnlyAfterVote ? <EyeOff size={11} /> : <Eye size={11} />}
            <span>{revealOnlyAfterVote ? 'Results hidden until vote: ON' : 'Results: Revealed'}</span>
          </button>
        </div>

        <div className="poll-grid">
          {options.map((opt) => {
            const votes = counts[opt.id] || 0;
            const pct = total ? Math.round((votes / total) * 100) : 0;
            const mine = myVote === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                className={`poll-image-card${mine ? ' mine' : ''}${isExpired ? ' expired' : ''}`}
                disabled={!canVote || hasVoted || isExpired}
                onClick={() => onVote(opt.id)}
                title={isExpired ? 'Poll is closed' : `Vote for ${opt.label || ''}`}
              >
                {opt.image_url && <img src={opt.image_url} alt={opt.label || ''} />}
                <span className="poll-image-meta">
                  <span>
                    {opt.label}
                    {mine && ' ✓'}
                  </span>
                  {canSeeResults && <span>{pct}%</span>}
                </span>
              </button>
            );
          })}
        </div>
        <div className="poll-footer-row">
          <p className="poll-meta">
            {total} vote{total !== 1 ? 's' : ''} · anonymous poll
          </p>
          {onOpenAnalytics && (
            <button
              type="button"
              className="poll-analytics-btn"
              onClick={(e) => {
                e.stopPropagation();
                playSound('reaction');
                onOpenAnalytics();
              }}
              title="View voting pattern trends over time"
            >
              <TrendingUp size={12} />
              <span>Poll Analytics</span>
            </button>
          )}
          {!canSeeResults && !isExpired && (
            <span className="poll-hidden-hint">
              🔒 Results hidden until you vote
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="poll">
      {/* Poll Header Bar: Expiration Countdown & Reveal Results Toggle */}
      <div className="poll-card-meta-bar">
        <div className="poll-status-tag-group">
          {isQuiz && (
            <span className="poll-badge-quiz">
              <Sparkles size={11} />
              <span>🎯 Quiz Mode</span>
            </span>
          )}
          {isQuiz && hasVoted && (
            <span className={`poll-badge-quiz-score ${isMyVoteCorrect ? 'pass' : 'fail'}`}>
              {isMyVoteCorrect ? 'Score: 100/100 · Correct 🏆' : 'Score: 0/100 · Incorrect'}
            </span>
          )}
          {isExpired ? (
            <span className="poll-badge-closed">
              <span>🏁 Poll Closed · Final Results</span>
            </span>
          ) : (
            <span className="poll-badge-active" title={pollExpiresAt || 'Active Poll'}>
              <Clock size={11} />
              <span>{formatTimeRemaining(pollExpiresAt)}</span>
            </span>
          )}
        </div>

        <button
          type="button"
          className={`poll-reveal-toggle-btn${revealOnlyAfterVote ? ' is-active' : ''}`}
          onClick={() => setRevealOnlyAfterVote((v) => !v)}
          title={revealOnlyAfterVote ? 'Results hidden before vote. Click to preview' : 'Results visible. Click to hide before voting'}
        >
          {revealOnlyAfterVote ? <EyeOff size={11} /> : <Eye size={11} />}
          <span>{revealOnlyAfterVote ? 'Results hidden until vote: ON' : 'Results: Revealed'}</span>
        </button>
      </div>

      {options.map((opt) => {
        const votes = counts[opt.id] || 0;
        const pct = total ? Math.round((votes / total) * 100) : 0;
        const mine = myVote === opt.id;
        const isOptCorrect = Boolean(opt.is_correct);
        const quizClass = isQuiz && hasVoted
          ? isOptCorrect
            ? ' is-quiz-correct'
            : mine
              ? ' is-quiz-wrong'
              : ''
          : '';

        return (
          <button
            key={opt.id}
            type="button"
            className={`poll-option${mine ? ' mine' : ''}${isExpired ? ' expired' : ''}${quizClass}`}
            disabled={!canVote || hasVoted || isExpired}
            onClick={() => onVote(opt.id)}
            title={isExpired ? 'Poll is closed' : `Vote for ${opt.label || ''}`}
          >
            {canSeeResults && <span className="poll-bar" style={{ width: `${pct}%` }} />}
            <span className="poll-label">
              <span className={`poll-radio-indicator${mine ? ' checked' : ''}`}>
                {mine ? '✓' : ''}
              </span>
              <span>
                {opt.label}
                {mine && !isQuiz && ' (Your vote)'}
              </span>
              {isQuiz && hasVoted && isOptCorrect && (
                <span className="quiz-correct-tag">⭐ Correct Answer</span>
              )}
              {isQuiz && hasVoted && mine && !isOptCorrect && (
                <span className="quiz-wrong-tag">❌ Your Pick</span>
              )}
            </span>
            {canSeeResults && <span className="poll-pct">{pct}%</span>}
          </button>
        );
      })}

      {/* Quiz Instant Scoring and Scripture Feedback Card */}
      {isQuiz && hasVoted && (
        <div className={`poll-quiz-feedback-card ${isMyVoteCorrect ? 'correct' : 'incorrect'}`}>
          <div className="quiz-feedback-header">
            {isMyVoteCorrect ? (
              <>
                <span className="quiz-feedback-badge pass">Score: 100/100 · Correct! 🏆</span>
                <span className="quiz-feedback-msg">Praise God, you knew the scripture truth! (+100 XP)</span>
              </>
            ) : (
              <>
                <span className="quiz-feedback-badge fail">Score: 0/100 · Incorrect</span>
                <span className="quiz-feedback-msg">
                  Not quite! The correct answer was <strong>{correctOpt?.label || 'Option'}</strong>.
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
      <div className="poll-footer-row">
        <p className="poll-meta">
          {total} vote{total !== 1 ? 's' : ''} · anonymous poll
        </p>
        {onOpenAnalytics && (
          <button
            type="button"
            className="poll-analytics-btn"
            onClick={(e) => {
              e.stopPropagation();
              playSound('reaction');
              onOpenAnalytics();
            }}
            title="View voting pattern trends over time"
          >
            <TrendingUp size={12} />
            <span>Poll Analytics</span>
          </button>
        )}
        {!canSeeResults && !isExpired && (
          <span className="poll-hidden-hint">
            🔒 Results hidden until you vote
          </span>
        )}
      </div>
    </div>
  );
}

export default function PostCard({
  post,
  session,
  openAuth,
  pollOptions = null,
  pollCounts = {},
  myVote = null,
  onVote,
  isAdmin = false,
  onTogglePin,
  onSelectCategory,
  onOpenDirectMessage,
}) {
  const router = useRouter();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(null);
  const [shareMsg, setShareMsg] = useState('');
  const [textExpanded, setTextExpanded] = useState(false);
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [showVisibilityModal, setShowVisibilityModal] = useState(false);
  const [showAuthorModal, setShowAuthorModal] = useState(false);
  const [showInstitutionModal, setShowInstitutionModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showWatermarkModal, setShowWatermarkModal] = useState(false);
  const [showProjectionModal, setShowProjectionModal] = useState(false);
  const [sharePopping, setSharePopping] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showLinkCopiedToast, setShowLinkCopiedToast] = useState(false);
  const [showPollAnalytics, setShowPollAnalytics] = useState(false);
  const [isSavedOffline, setIsSavedOffline] = useState(() => (post?.id ? isItemSavedOffline(post.id) : false));
  const [reposted, setReposted] = useState(() => (post?.id ? isPostReposted(post.id, session?.user?.id) : false));
  const [repostCount, setRepostCount] = useState(() => (post?.id ? getPostRepostCount(post.id, post.reposts_count || 0) : 0));
  const [visibility, setVisibility] = useState(() => (post?.id ? getPostVisibility(post.id, post.visibility || 'public') : 'public'));

  const isPollPost = Boolean(
    (pollOptions && pollOptions.length > 0) ||
    (post?.poll_options_count && post.poll_options_count > 0) ||
    post?.media_type === 'poll'
  );

  const cat = categoryStyle(post.category_id);
  const author = post.profiles;
  const authorName = author?.name || author?.display_name || 'Member';
  const authorId = post.author_id || post.user_id;
  const isAuthor = session?.user?.id && session.user.id === authorId;

  // Repost status & visible counter
  useEffect(() => {
    if (!post?.id) return;

    function onRepostUpdated() {
      setReposted(isPostReposted(post.id, session?.user?.id));
      setRepostCount(getPostRepostCount(post.id, post.reposts_count || 0));
    }
    function onVisChanged(e) {
      if (e.detail?.postId === post.id) {
        setVisibility(e.detail.visibility);
      }
    }
    window.addEventListener('shammah:reposts-updated', onRepostUpdated);
    window.addEventListener('shammah:post-visibility-changed', onVisChanged);
    return () => {
      window.removeEventListener('shammah:reposts-updated', onRepostUpdated);
      window.removeEventListener('shammah:post-visibility-changed', onVisChanged);
    };
  }, [post.id, session?.user?.id]);

  // Load comment counts
  useEffect(() => {
    let cancelled = false;
    supabase.rpc('comment_counts', { p_post_ids: [post.id] }).then(({ data }) => {
      if (!cancelled) setCommentCount(data && data[0] ? Number(data[0].count) : 0);
    });
    return () => {
      cancelled = true;
    };
  }, [post.id]);

  function requireSignIn() {
    openAuth('signin');
  }

  function handleRepostClick() {
    if (!session) return requireSignIn();
    setShowRepostModal(true);
  }

  function handleConfirmRepost(quoteText) {
    const res = toggleRepost(
      post.id,
      post,
      {
        id: session?.user?.id,
        name: session?.user?.user_metadata?.name || session?.user?.email?.split('@')[0] || 'You',
        avatar_url: session?.user?.user_metadata?.avatar_url,
      },
      quoteText
    );
    setReposted(res.reposted);
    setRepostCount(res.count);
    playSound('reposted');
  }

  function handleShare() {
    playSound('share');
    setSharePopping(true);
    setTimeout(() => setSharePopping(false), 350);
    setShowShareMenu(true);
  }

  function handleLinkCopied() {
    playSound('bookmark');
    setShowLinkCopiedToast(true);
    setTimeout(() => {
      setShowLinkCopiedToast(false);
    }, 2000);
  }

  function handleSaveOffline() {
    const authorId = post.user_id || post.profiles?.id;
    if (isSavedOffline) {
      removeOfflineItem(post.id);
      setIsSavedOffline(false);
      playSound('offline_remove');
      setShareMsg('Removed from offline downloads');
      setTimeout(() => setShareMsg(''), 2200);
      return;
    }
    if (!canDownloadOffline(authorId, post)) {
      setShareMsg('Author has restricted offline downloads for this content.');
      setTimeout(() => setShareMsg(''), 2500);
      return;
    }
    const res = saveOfflineItem(post, post.media_type || 'post');
    if (res.success) {
      setIsSavedOffline(true);
      playSound('offline_save');
      setShareMsg('Saved offline for 30 days ✓');
    } else {
      setShareMsg(res.reason || 'Could not save offline');
    }
    setTimeout(() => setShareMsg(''), 2500);
  }

  function handleProject() {
    playSound('project');
    setShowProjectionModal(true);
  }

  // Text truncation logic for long posts (> 200 characters)
  const fullText = post.text_content || '';
  const isLongText = fullText.length > 200;
  const renderedText = isLongText && !textExpanded ? `${fullText.slice(0, 200)}...` : fullText;

  // Visibility icon helper
  const VisIcon = visibility === 'followers' ? Users : visibility === 'church' ? Church : visibility === 'private' ? Lock : Globe;

  return (
    <article
      className={`post-card${post.is_pinned ? ' is-pinned' : ''}${textExpanded ? ' is-expanded article-reading-target' : ''}`}
      data-article-title={`${authorName}'s Post`}
      style={{ '--accent': cat.accent, '--accent-soft': cat.soft, '--accent-text': cat.text }}
    >
      {post.is_pinned && (
        <div className="pinned-announcement-banner">
          <div className="pinned-badge-left">
            <span className="pinned-icon-wrapper" aria-hidden="true">
              <PinIcon className="pinned-icon" />
            </span>
            <span className="pinned-banner-text">Pinned Announcement</span>
          </div>
          {isAdmin && (
            <button
              type="button"
              className="header-pin-btn is-pinned"
              onClick={() => onTogglePin?.(post)}
              title="Unpin this announcement from the top of the feed"
              aria-label="Unpin announcement"
            >
              <PinIcon className="pin-action-icon" />
              <span>Unpin</span>
            </button>
          )}
        </div>
      )}

      {/* Post Header with Author Interaction, Category, Time, and Options Menu */}
      <div className="post-header">
        <button
          type="button"
          className="post-author-avatar-btn"
          onClick={() => setShowAuthorModal(true)}
          title={`View ${authorName}'s fellowship overview`}
          aria-label={`View profile for ${authorName}`}
        >
          <Avatar name={authorName} src={author?.avatar_url} userId={authorId} />
        </button>

        <div className="post-header-text">
          <button
            type="button"
            className="post-author-name-btn"
            onClick={() => setShowAuthorModal(true)}
            title={`View ${authorName}'s fellowship overview`}
          >
            <MemberName
              name={authorName}
              badge={author?.badge}
              verified={author?.badge_verified}
              role={author?.role}
              nameClassName="post-author"
            />
          </button>

          <div className="post-sub-badges-row">
            {/* Category Chip (Interactive) */}
            <button
              type="button"
              className="category-chip category-chip-interactive"
              onClick={(e) => {
                e.stopPropagation();
                playSound('reaction');
                if (post.category_id) {
                  if (onSelectCategory) {
                    onSelectCategory(post.category_id);
                  }
                  window.dispatchEvent(
                    new CustomEvent('shammah:select-category', { detail: post.category_id })
                  );
                  if (typeof window !== 'undefined') {
                    if (window.location.pathname === '/') {
                      const url = new URL(window.location.href);
                      url.searchParams.set('category', post.category_id);
                      url.searchParams.delete('section');
                      window.history.pushState({}, '', url.toString());
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    } else {
                      router.push(`/?category=${post.category_id}`);
                    }
                  }
                }
              }}
              title={`Filter homepage feed by ${cat.label}`}
            >
              {cat.label}
            </button>

            {/* Posting Date / Time */}
            <span
              className="post-timestamp-pill"
              title={post.created_at ? new Date(post.created_at).toLocaleString() : 'Recently posted'}
            >
              <Clock size={11} className="post-time-icon" />
              <span>{timeAgo(post.created_at)}</span>
            </span>

            {/* Church / Institution Badge */}
            {(post.church_name || post.churches?.name || author?.church_name) && (
              <button
                type="button"
                className="post-church-pill"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowInstitutionModal(true);
                }}
                title={`View ${post.church_name || post.churches?.name || author?.church_name} overview`}
              >
                <Church size={11} className="post-church-icon" />
                <span>{post.church_name || post.churches?.name || author?.church_name}</span>
              </button>
            )}
          </div>
        </div>

        {/* Top-Right Column: Post Options Menu on top, Privacy State Pill directly below it (no overlap) */}
        <div className="post-header-actions-right">
          <div className="post-header-top-controls">
            {!post.is_pinned && isAdmin && (
              <button
                type="button"
                className="header-pin-btn"
                onClick={() => onTogglePin?.(post)}
                title="Pin this announcement to top of feed"
                aria-label="Pin announcement to top"
              >
                <PinIcon className="pin-action-icon" />
                <span>Pin</span>
              </button>
            )}

            {/* Post Options Dropdown Menu for every post */}
            <PostOptionsMenu
              post={post}
              authorId={authorId}
              authorName={authorName}
              onReportClick={() => setShowReportModal(true)}
              onProjectClick={handleProject}
            />
          </div>

          {/* Privacy & Visibility State Badge on top right, opposite author name */}
          <span
            className="post-visibility-pill top-right-vis-pill"
            title={`Privacy & Visibility: ${visibility}`}
            onClick={(e) => {
              e.stopPropagation();
              if (isAuthor || isAdmin) setShowVisibilityModal(true);
            }}
          >
            <VisIcon size={11} className="post-vis-icon" />
            <span className="post-vis-label">
              {visibility === 'followers'
                ? 'Followers'
                : visibility === 'church'
                  ? 'Church'
                  : visibility === 'private'
                    ? 'Only Me'
                    : 'Public'}
            </span>
            {(isAuthor || isAdmin) && <span className="post-vis-edit-hint">▾</span>}
          </span>
        </div>
      </div>

      {/* Post Body: Truncated with "Read more..." if text > 300 characters */}
      {fullText && (
        <div className="post-text-container">
          <p className="post-text">{renderedText}</p>
          {isLongText && (
            <button
              type="button"
              className="post-read-more-btn"
              onClick={() => setTextExpanded((exp) => !exp)}
            >
              {textExpanded ? 'Show less' : 'Read more...'}
            </button>
          )}
        </div>
      )}

      {/* Poll Options (remains visible regardless of text length) */}
      {pollOptions && (
        <PollBlock
          options={pollOptions}
          counts={pollCounts}
          myVote={myVote}
          canVote={!!session}
          onVote={(optId) => {
            const isQuizPost = Boolean(post.is_quiz || post.poll_type === 'quiz' || pollOptions.some((o) => o.is_correct));
            if (isQuizPost) {
              const votedOpt = pollOptions.find((o) => o.id === optId);
              if (votedOpt?.is_correct) {
                playSound('badge');
              } else {
                playSound('reaction');
              }
            }
            onVote(optId);
          }}
          pollExpiresAt={post.poll_expires_at || post.expires_at}
          pollDuration={post.poll_duration}
          revealResultsAfterVoting={post.reveal_results_after_voting}
          onOpenAnalytics={() => setShowPollAnalytics(true)}
          isQuiz={Boolean(post.is_quiz || post.poll_type === 'quiz' || pollOptions.some((o) => o.is_correct))}
          quizExplanation={post.quiz_explanation || post.explanation}
        />
      )}

      {/* Various media shared with long text posts remain visible in the card */}
      {post.media_url && post.media_type === 'image' && (
        <img className="post-media" src={post.media_url} alt="" loading="lazy" />
      )}
      {post.media_url && (post.media_type === 'video' || post.media_type === 'reel') && (
        <video className="post-media" src={post.media_url} controls playsInline preload="metadata" />
      )}
      {post.media_url && (post.media_type === 'audio' || post.media_type === 'podcast') && (
        <div className="post-audio-wrap">
          <audio className="post-audio" src={post.media_url} controls preload="metadata" />
        </div>
      )}

      {/* RSS Source Attribution & Link */}
      {post.rss_source && (
        <div className="post-rss-attribution">
          <span className="rss-source-badge">
            <Rss size={11} className="rss-icon-orange" />
            <span>{post.rss_source}</span>
          </span>
          {post.rss_link && (
            <a
              href={post.rss_link}
              target="_blank"
              rel="noopener noreferrer"
              className="rss-source-link"
              onClick={(e) => e.stopPropagation()}
            >
              <span>Original Article</span>
              <ExternalLink size={11} />
            </a>
          )}
        </div>
      )}

      {/* Post Actions Bar with Reactions, Comments, Repost Counter, and Share */}
      <div className="post-actions">
        <ReactionBar
          targetType="post"
          targetId={post.id}
          session={session}
          onRequireSignIn={requireSignIn}
        />

        <button
          type="button"
          className="action-btn comment-btn"
          onClick={() => {
            setCommentsOpen((v) => !v);
            playSound('comment');
          }}
          title="Join Christian family comments"
          aria-label="Comments"
        >
          <span className="action-icon">💬</span>
          <span className="action-label comment-label">Comment</span>
          {commentCount != null && commentCount > 0 && (
            <span className="action-count-badge comment-count-badge">{commentCount}</span>
          )}
        </button>

        {/* Retweet / Re-share (Fellowship Repost) with Visible Counter */}
        <button
          type="button"
          className={`action-btn repost-btn${reposted ? ' is-reposted' : ''}`}
          onClick={handleRepostClick}
          title={reposted ? 'You reposted this' : 'Repost to fellowship profile'}
          aria-label="Repost"
        >
          <Repeat size={15} className={`action-icon repost-icon${reposted ? ' active' : ''}`} />
          <span className="action-label repost-label">Repost</span>
          {repostCount > 0 && <span className="action-count-badge repost-count-badge">{repostCount}</span>}
        </button>

        <button
          type="button"
          className={`action-btn share-btn${sharePopping ? ' share-btn-popping' : ''}`}
          onClick={handleShare}
          title="Share with official Shammah options"
          aria-label="Share"
        >
          <span className="action-icon">↗</span>
          <span className="action-label share-label">Share</span>
        </button>

        {/* Offline Download button (30 days) */}
        <button
          type="button"
          className={`action-btn offline-download-btn${isSavedOffline ? ' saved' : ''}`}
          onClick={handleSaveOffline}
          title={isSavedOffline ? 'Saved offline for 30 days' : 'Download for 30-day offline access'}
          aria-label="Save offline"
        >
          {isSavedOffline ? <Check size={14} className="text-emerald-400" /> : <DownloadCloud size={14} />}
          <span className="action-label offline-label">{isSavedOffline ? 'Saved' : 'Offline'}</span>
        </button>

        {isAdmin && (
          <button
            type="button"
            className={`action-btn pin-btn${post.is_pinned ? ' is-pinned' : ''}`}
            onClick={() => onTogglePin?.(post)}
            title={post.is_pinned ? 'Unpin announcement' : 'Pin to top of feed'}
            aria-label={post.is_pinned ? 'Unpin post' : 'Pin post'}
          >
            <PinIcon className="action-icon pin-action-icon" />
            <span className="action-label pin-label">{post.is_pinned ? 'Pinned' : 'Pin'}</span>
          </button>
        )}

        {shareMsg && <span className="share-toast">{shareMsg}</span>}
      </div>

      {commentsOpen && (
        <CommentThread
          postId={post.id}
          session={session}
          onRequireSignIn={requireSignIn}
          onCountChange={setCommentCount}
          postAuthorId={authorId}
          postAuthorName={authorName}
        />
      )}

      {/* Repost Confirmation & Reflection Modal */}
      {showRepostModal && (
        <RepostModal
          post={post}
          currentUser={session?.user}
          onClose={() => setShowRepostModal(false)}
          onConfirm={handleConfirmRepost}
        />
      )}

      {/* Post Privacy & Visibility Modal */}
      {showVisibilityModal && (
        <PostVisibilityModal
          postId={post.id}
          currentVisibility={visibility}
          currentUser={session?.user}
          onClose={() => setShowVisibilityModal(false)}
          onUpdated={(newVis) => setVisibility(newVis)}
        />
      )}

      {/* Author Overview Modal (Tap Avatar/Name) */}
      {showAuthorModal && (
        <AuthorOverviewModal
          author={{
            ...author,
            id: authorId,
            display_name: authorName,
            avatar_url: author?.avatar_url,
            role: author?.role,
            badge: author?.badge,
            badge_verified: author?.badge_verified,
            church_name: post.church_name || post.churches?.name || author?.church_name,
            church_id: post.church_id || author?.church_id,
          }}
          authorId={authorId}
          currentUser={session?.user}
          onClose={() => setShowAuthorModal(false)}
          onOpenDirectMessage={onOpenDirectMessage}
        />
      )}

      {/* Institution Profile Modal Toast (Tap Church) */}
      {showInstitutionModal && (
        <InstitutionProfileModal
          institution={{
            id: post.church_id || author?.church_id || 'inst-1',
            name: post.church_name || post.churches?.name || author?.church_name || 'Fellowship Church',
            categoryLabel: 'Church / Institution',
            about: 'A Christ-centered fellowship dedicated to worshipping God, preaching the gospel, and serving the community.',
            cover_url: null,
            logo_url: null,
            verified: true,
          }}
          onClose={() => setShowInstitutionModal(false)}
        />
      )}

      {/* Report Post Modal */}
      {showReportModal && (
        <ReportPostModal
          post={post}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {/* Watermarked Share Modal */}
      {showWatermarkModal && (
        <WatermarkShareModal
          contentData={{
            title: 'Fellowship Post',
            textContent: post.text_content,
            authorName,
            churchName: author?.church_name || 'Shammah Global Community',
            category: cat.text || 'Fellowship',
            mediaUrl: post.media_url,
            pollOptions,
          }}
          onClose={() => setShowWatermarkModal(false)}
        />
      )}

      {/* Projection Mode Modal */}
      {showProjectionModal && (
        <ProjectionModeModal
          type={isPollPost ? 'poll' : 'course'}
          data={{
            ...post,
            options: pollOptions,
            counts: pollCounts,
            churchName: author?.church_name || 'Shammah Fellowship',
          }}
          onClose={() => setShowProjectionModal(false)}
        />
      )}

      {/* Share Options Menu Popup */}
      {showShareMenu && (
        <ShareMenuModal
          post={post}
          onClose={() => setShowShareMenu(false)}
          onOpenWatermark={() => setShowWatermarkModal(true)}
          onLinkCopied={handleLinkCopied}
        />
      )}

      {/* Temporary Link Copied Confirmation Toast Overlay (fades out after 2 seconds) */}
      {showLinkCopiedToast && (
        <div className="link-copied-toast-overlay" role="status" aria-live="polite">
          <Check size={16} className="link-copied-toast-icon" />
          <span>Link Copied</span>
        </div>
      )}

      {/* Poll Analytics Summary View with Recharts Line Chart */}
      {showPollAnalytics && (
        <PollAnalyticsModal
          poll={post}
          pollOptions={pollOptions}
          pollCounts={pollCounts}
          onClose={() => setShowPollAnalytics(false)}
        />
      )}
    </article>
  );
}
