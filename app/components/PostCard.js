'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { categoryStyle, initials } from '../lib/postDisplay';
import ReactionBar from './ReactionBar';
import CommentThread from './CommentThread';

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
        if (!hasVoted) {
          return (
            <button
              key={opt.id}
              type="button"
              className="poll-option-btn"
              disabled={!canVote}
              onClick={() => onVote(opt.id)}
            >
              {opt.label}
            </button>
          );
        }
        return (
          <div key={opt.id} className={`poll-result${mine ? ' mine' : ''}`}>
            <div className="poll-result-bar" style={{ width: `${pct}%` }} />
            <span className="poll-result-label">
              {opt.label}
              {mine && ' ✓'}
            </span>
            <span className="poll-result-pct">{pct}%</span>
          </div>
        );
      })}
      <p className="poll-meta">
        {total} vote{total !== 1 ? 's' : ''} · anonymous poll
      </p>
    </div>
  );
}

export default function PostCard({ post, session, openAuth, pollOptions, pollCounts, myVote, onVote }) {
  const [commentCount, setCommentCount] = useState(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareMsg, setShareMsg] = useState('');

  const cat = categoryStyle(post.category_id);
  const authorName = (post.profiles && post.profiles.display_name) || 'Someone';

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

  async function handleShare() {
    const text = post.text_content || '';
    if (navigator.share) {
      try {
        await navigator.share({ text, title: 'Shammah' });
      } catch (err) {
        // AbortError just means the person closed the share sheet — nothing to show for that
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

  return (
    <article
      className="post-card"
      style={{ '--accent': cat.accent, '--accent-soft': cat.soft, '--accent-text': cat.text }}
    >
      <div className="post-header">
        <div className="avatar">{initials(authorName)}</div>
        <div className="post-header-text">
          <span className="post-author">{authorName}</span>
          <span className="category-chip">{cat.label}</span>
        </div>
      </div>

      <p className="post-text">{post.text_content}</p>

      {pollOptions && (
        <PollBlock options={pollOptions} counts={pollCounts} myVote={myVote} canVote={!!session} onVote={onVote} />
      )}

      {post.media_url && post.media_type === 'image' && <img className="post-media" src={post.media_url} alt="" />}

      <div className="post-actions">
        <ReactionBar targetType="post" targetId={post.id} session={session} onRequireSignIn={requireSignIn} />
        <button type="button" className="action-btn" onClick={() => setCommentsOpen((v) => !v)}>
          <span className="action-icon">💬</span>
          {commentCount != null && commentCount > 0 ? commentCount : 'Comment'}
        </button>
        <button type="button" className="action-btn" onClick={handleShare}>
          <span className="action-icon">↗</span>
          Share
        </button>
        {shareMsg && <span className="share-toast">{shareMsg}</span>}
      </div>

      {commentsOpen && (
        <CommentThread
          postId={post.id}
          session={session}
          onRequireSignIn={requireSignIn}
          onCountChange={setCommentCount}
        />
      )}
    </article>
  );
}
