'use client';
import { useState } from 'react';
import { Repeat2, PenLine, ArrowLeft, Check, Church } from 'lucide-react';
import PopupSheet from './PopupSheet';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';

export default function RepostModal({ post, currentUser, onClose, onConfirm }) {
  const [selectedOption, setSelectedOption] = useState('instant'); // 'instant' | 'thoughts'
  const [quoteText, setQuoteText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const authorName =
    post?.profiles?.display_name ||
    post?.profiles?.name ||
    post?.author_name ||
    'Member';
  const authorAvatar = post?.profiles?.avatar_url || post?.author_avatar;
  const isVerified = Boolean(post?.profiles?.badge_verified);
  const churchName = post?.church_name || post?.churches?.name || post?.profiles?.church_name;
  const snippet = post?.text_content
    ? post.text_content.slice(0, 160) + (post.text_content.length > 160 ? '...' : '')
    : post?.title || '';

  async function handleInstantRepost() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onConfirm(null);
    } finally {
      setSubmitting(false);
      onClose();
    }
  }

  async function handleQuoteRepost(e) {
    if (e) e.preventDefault();
    if (submitting || !quoteText.trim()) return;
    setSubmitting(true);
    try {
      await onConfirm(quoteText.trim());
    } finally {
      setSubmitting(false);
      onClose();
    }
  }

  const primaryLabel = selectedOption === 'thoughts' ? 'Repost with Thoughts' : 'Instant Repost';
  const PrimaryIcon = selectedOption === 'thoughts' ? PenLine : Repeat2;

  const footerActions = (
    <div className="repost-footer-actions">
      <button
        type="button"
        className="repost-cancel-btn"
        onClick={onClose}
        disabled={submitting}
      >
        Cancel
      </button>

      <button
        type="button"
        className="repost-primary-btn"
        onClick={selectedOption === 'thoughts' ? handleQuoteRepost : handleInstantRepost}
        disabled={submitting || (selectedOption === 'thoughts' && !quoteText.trim())}
      >
        <PrimaryIcon size={16} />
        <span>{submitting ? 'Sharing...' : primaryLabel}</span>
      </button>
    </div>
  );

  return (
    <PopupSheet
      open={true}
      onClose={onClose}
      title="Repost"
      size="md"
      footer={footerActions}
    >
      <div className="repost-dialog-content">
        {/* Step 1: Option Cards */}
        <div className="repost-options-grid" role="radiogroup" aria-label="Repost options">
          <button
            type="button"
            role="radio"
            aria-checked={selectedOption === 'instant'}
            className={`repost-option-card${selectedOption === 'instant' ? ' is-active' : ''}`}
            onClick={() => setSelectedOption('instant')}
          >
            <div className="repost-option-icon-wrap">
              <Repeat2 size={20} className="repost-option-icon" />
            </div>
            <div className="repost-option-text-col">
              <div className="repost-option-title-row">
                <span className="repost-option-title">Instant Repost</span>
                <span className={`repost-radio-indicator${selectedOption === 'instant' ? ' is-checked' : ''}`}>
                  {selectedOption === 'instant' && <Check size={12} strokeWidth={3} />}
                </span>
              </div>
              <p className="repost-option-desc">
                Share this directly to your followers and fellowship feed.
              </p>
            </div>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={selectedOption === 'thoughts'}
            className={`repost-option-card${selectedOption === 'thoughts' ? ' is-active' : ''}`}
            onClick={() => setSelectedOption('thoughts')}
          >
            <div className="repost-option-icon-wrap">
              <PenLine size={20} className="repost-option-icon" />
            </div>
            <div className="repost-option-text-col">
              <div className="repost-option-title-row">
                <span className="repost-option-title">Repost with Thoughts</span>
                <span className={`repost-radio-indicator${selectedOption === 'thoughts' ? ' is-checked' : ''}`}>
                  {selectedOption === 'thoughts' && <Check size={12} strokeWidth={3} />}
                </span>
              </div>
              <p className="repost-option-desc">
                Add your reflection, scripture quote or prayer before sharing.
              </p>
            </div>
          </button>
        </div>

        {/* Step 2: Revealed textarea when 'thoughts' is chosen */}
        {selectedOption === 'thoughts' && (
          <div className="repost-thoughts-block">
            <div className="repost-thoughts-header-row">
              <button
                type="button"
                className="repost-back-btn"
                onClick={() => setSelectedOption('instant')}
                aria-label="Back to Instant Repost"
                title="Switch back to Instant Repost"
              >
                <ArrowLeft size={15} />
                <span>Instant</span>
              </button>
              <label htmlFor="repost-quote-input" className="repost-thoughts-label">
                Your Reflection
              </label>
              <span className={`repost-char-count${quoteText.length > 250 ? ' is-nearing-limit' : ''}`}>
                {quoteText.length}/280
              </span>
            </div>

            <textarea
              id="repost-quote-input"
              className="repost-textarea"
              placeholder="Add your spiritual reflection, prayer or testimony..."
              value={quoteText}
              onChange={(e) => setQuoteText(e.target.value)}
              rows={3}
              maxLength={280}
              autoFocus
            />
          </div>
        )}

        {/* Step 3: Embedded Original Post Preview */}
        <div className="repost-preview-card">
          <div className="repost-preview-author-row">
            <Avatar name={authorName} src={authorAvatar} className="avatar-xs" />
            <span className="repost-preview-author-name">{authorName}</span>
            {isVerified && <VerifiedBadge badge={post?.profiles?.badge} size={13} />}
            {churchName && (
              <span className="repost-preview-church-pill">
                <Church size={10} />
                <span>{churchName}</span>
              </span>
            )}
          </div>
          {snippet && <p className="repost-preview-text">{snippet}</p>}
          {post?.media_url && post?.media_type === 'image' && (
            <div className="repost-preview-img-chip">
              <img src={post.media_url} alt="" className="repost-preview-thumb" />
            </div>
          )}
        </div>
      </div>
    </PopupSheet>
  );
}
