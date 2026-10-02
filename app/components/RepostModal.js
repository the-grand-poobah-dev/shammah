'use client';
import { useState } from 'react';
import { Repeat, X, Send } from 'lucide-react';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';

export default function RepostModal({ post, currentUser, onClose, onConfirm }) {
  const [quoteText, setQuoteText] = useState('');

  function handleInstantRepost() {
    onConfirm(null);
    onClose();
  }

  function handleQuoteRepost(e) {
    e.preventDefault();
    onConfirm(quoteText.trim());
    onClose();
  }

  const authorName = post.profiles?.name || post.author_name || 'Member';

  return (
    <div className="repost-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="repost-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="repost-modal-header">
          <div className="repost-modal-title">
            <Repeat size={18} className="repost-icon-gold" />
            <h3>Fellowship Repost</h3>
          </div>
          <button type="button" className="repost-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleQuoteRepost} className="repost-form">
          <textarea
            className="repost-textarea"
            placeholder="Add your spiritual reflection, prayer or testimony (optional)..."
            value={quoteText}
            onChange={(e) => setQuoteText(e.target.value)}
            rows={3}
            maxLength={280}
            autoFocus
          />

          {/* Embedded Post Preview */}
          <div className="repost-original-preview">
            <div className="repost-original-author-row">
              <Avatar
                name={authorName}
                src={post.profiles?.avatar_url || post.author_avatar}
                className="avatar-xs"
              />
              <span className="repost-author-name">{authorName}</span>
              {post.profiles?.badge_verified && (
                <VerifiedBadge badge={post.profiles?.badge} size={13} />
              )}
            </div>
            <p className="repost-preview-text">
              {post.text_content ? post.text_content.slice(0, 140) + (post.text_content.length > 140 ? '...' : '') : ''}
            </p>
          </div>

          <div className="repost-actions-row">
            <button
              type="button"
              className="repost-instant-btn"
              onClick={handleInstantRepost}
            >
              <Repeat size={15} />
              <span>Instant Repost</span>
            </button>

            <button
              type="submit"
              className="repost-quote-btn"
              disabled={!quoteText.trim()}
            >
              <Send size={15} />
              <span>Repost with Thoughts</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
