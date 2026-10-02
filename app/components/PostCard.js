'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Repeat, Globe, Users, Church, Lock, MoreHorizontal, Rss, ExternalLink } from 'lucide-react';
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
import PostOptionsMenu from './PostOptionsMenu';
import ReportPostModal from './ReportPostModal';
import {
  isPostReposted,
  getPostRepostCount,
  toggleRepost,
  getPostVisibility,
} from '../lib/postInteractions';
import { playSound } from '../lib/soundEffects';
import { Clock } from 'lucide-react';

function PollBlock({ options, counts, myVote, canVote, onVote }) {
  const total = options.reduce((sum, o) => sum + (counts[o.id] || 0), 0);
  const hasVoted = myVote != null;
  const hasImages = options.some((o) => o.image_url);

  if (hasImages) {
    return (
      <div className="poll">
        <div className="poll-grid">
          {options.map((opt) => {
            const votes = counts[opt.id] || 0;
            const pct = total ? Math.round((votes / total) * 100) : 0;
            const mine = myVote === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                className={`poll-image-card${mine ? ' mine' : ''}`}
                disabled={!canVote || hasVoted}
                onClick={() => onVote(opt.id)}
              >
                {opt.image_url && <img src={opt.image_url} alt={opt.label || ''} />}
                <span className="poll-image-meta">
                  <span>
                    {opt.label}
                    {mine && ' ✓'}
                  </span>
                  {hasVoted && <span>{pct}%</span>}
                </span>
              </button>
            );
          })}
        </div>
        <p className="poll-meta">
          {total} vote{total !== 1 ? 's' : ''} · anonymous poll
        </p>
      </div>
    );
  }

  return (
    <div className="poll">
      {options.map((opt) => {
        const votes = counts[opt.id] || 0;
        const pct = total ? Math.round((votes / total) * 100) : 0;
        const mine = myVote === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            className={`poll-option${mine ? ' mine' : ''}`}
            disabled={!canVote || hasVoted}
            onClick={() => onVote(opt.id)}
          >
            <span className="poll-bar" style={{ width: `${pct}%` }} />
            <span className="poll-label">
              {opt.label}
              {mine && ' ✓'}
            </span>
            {hasVoted && <span className="poll-pct">{pct}%</span>}
          </button>
        );
      })}
      <p className="poll-meta">
        {total} vote{total !== 1 ? 's' : ''} · anonymous poll
      </p>
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
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(null);
  const [shareMsg, setShareMsg] = useState('');
  const [textExpanded, setTextExpanded] = useState(false);
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [showVisibilityModal, setShowVisibilityModal] = useState(false);
  const [showAuthorModal, setShowAuthorModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [repostCount, setRepostCount] = useState(0);
  const [visibility, setVisibility] = useState('public');

  const cat = categoryStyle(post.category_id);
  const author = post.profiles;
  const authorName = author?.name || author?.display_name || 'Member';
  const authorId = post.author_id || post.user_id;
  const isAuthor = session?.user?.id && session.user.id === authorId;

  // Repost status & visible counter
  useEffect(() => {
    setReposted(isPostReposted(post.id, session?.user?.id));
    setRepostCount(getPostRepostCount(post.id, post.reposts_count || 0));
    setVisibility(getPostVisibility(post.id, post.visibility || 'public'));

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
  }, [post.id, session?.user?.id, post.reposts_count, post.visibility]);

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

  async function handleShare() {
    playSound('reaction');
    const text = post.text_content || '';
    if (navigator.share) {
      try {
        await navigator.share({ text, title: 'Shammah' });
      } catch (err) {
        if (err && err.name !== 'AbortError') setShareMsg('Could not open the share sheet.');
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setShareMsg('Copied to clipboard');
    } catch {
      setShareMsg('Could not copy — try selecting the text manually.');
    }
    setTimeout(() => setShareMsg(''), 2000);
  }

  // Text truncation logic for long posts (> 200 characters)
  const fullText = post.text_content || '';
  const isLongText = fullText.length > 200;
  const renderedText = isLongText && !textExpanded ? `${fullText.slice(0, 200)}...` : fullText;

  // Visibility icon helper
  const VisIcon = visibility === 'followers' ? Users : visibility === 'church' ? Church : visibility === 'private' ? Lock : Globe;

  return (
    <article
      className={`post-card${post.is_pinned ? ' is-pinned' : ''}`}
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
              onClick={() => {
                playSound('reaction');
                if (onSelectCategory) {
                  onSelectCategory(post.category_id);
                } else {
                  window.dispatchEvent(
                    new CustomEvent('shammah:select-category', { detail: post.category_id })
                  );
                }
              }}
              title={`View more posts in ${cat.label}`}
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

            {/* Visibility Badge */}
            <span
              className="post-visibility-pill"
              title={`Privacy & Visibility: ${visibility}`}
              onClick={() => {
                if (isAuthor || isAdmin) setShowVisibilityModal(true);
              }}
            >
              <VisIcon size={12} className="post-vis-icon" />
              <span className="post-vis-label">
                {visibility === 'followers'
                  ? 'Followers'
                  : visibility === 'church'
                    ? 'Church'
                    : visibility === 'private'
                      ? 'Private'
                      : 'Public'}
              </span>
              {(isAuthor || isAdmin) && <span className="post-vis-edit-hint">▾</span>}
            </span>
          </div>
        </div>

        <div className="post-header-actions-right">
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
          />
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
          onVote={onVote}
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
          className="action-btn"
          onClick={() => setCommentsOpen((v) => !v)}
          title="Join fellowship comments"
        >
          <span className="action-icon">💬</span>
          <span>{commentCount != null && commentCount > 0 ? commentCount : 'Comment'}</span>
        </button>

        {/* Retweet / Re-share (Fellowship Repost) with Visible Counter */}
        <button
          type="button"
          className={`action-btn repost-btn${reposted ? ' is-reposted' : ''}`}
          onClick={handleRepostClick}
          title={reposted ? 'You reposted this' : 'Repost to fellowship profile'}
        >
          <Repeat size={15} className={`action-icon repost-icon${reposted ? ' active' : ''}`} />
          <span className="repost-label-text">Repost</span>
          {repostCount > 0 && <span className="repost-count-badge">{repostCount}</span>}
        </button>

        <button type="button" className="action-btn" onClick={handleShare} title="Share post">
          <span className="action-icon">↗</span>
          <span>Share</span>
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
            <span>{post.is_pinned ? 'Pinned' : 'Pin'}</span>
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
          }}
          authorId={authorId}
          currentUser={session?.user}
          onClose={() => setShowAuthorModal(false)}
          onOpenDirectMessage={onOpenDirectMessage}
        />
      )}

      {/* Report Post Modal */}
      {showReportModal && (
        <ReportPostModal
          post={post}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </article>
  );
}
