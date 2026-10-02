'use client';
import { useState } from 'react';
import { X, Sparkles, Image as ImageIcon, Send, Check } from 'lucide-react';
import { createStatusUpdate } from '../lib/statusManager';
import Avatar from './Avatar';

const BG_THEMES = [
  { id: 'emerald', label: 'Emerald Praise', style: 'linear-gradient(135deg, #065f46, #047857, #10b981)' },
  { id: 'sunset', label: 'Sunset Worship', style: 'linear-gradient(135deg, #831843, #be185d, #f59e0b)' },
  { id: 'royal', label: 'Royal Grace', style: 'linear-gradient(135deg, #1e1b4b, #3730a3, #6366f1)' },
  { id: 'midnight', label: 'Deep Devotion', style: 'linear-gradient(135deg, #090d16, #1e293b, #334155)' },
  { id: 'gold', label: 'Golden Word', style: 'linear-gradient(135deg, #78350f, #b45309, #f59e0b)' },
  { id: 'rose', label: 'Grace & Truth', style: 'linear-gradient(135deg, #881337, #e11d48, #fb7185)' },
];

export default function StatusCreatorModal({ currentUser, onClose, onCreated }) {
  const [text, setText] = useState('');
  const [scriptureTag, setScriptureTag] = useState('');
  const [selectedBg, setSelectedBg] = useState('emerald');
  const [mediaUrl, setMediaUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;

    setSubmitting(true);

    const newStatus = createStatusUpdate({
      userId: currentUser?.id || 'me',
      userName: currentUser?.name || 'Member',
      userAvatar: currentUser?.avatar_url || null,
      userBadge: currentUser?.badge || 'believer',
      userRole: currentUser?.role || 'member',
      userVerified: Boolean(currentUser?.badge_verified),
      text: text.trim(),
      mediaUrl: mediaUrl.trim() || null,
      bgStyle: selectedBg,
      scriptureTag: scriptureTag.trim() || null,
    });

    setSubmitting(false);
    if (onCreated) onCreated(newStatus);
    onClose();
  }

  return (
    <div className="status-creator-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="status-creator-card" onClick={(e) => e.stopPropagation()}>
        <div className="status-creator-header">
          <div className="status-creator-title-row">
            <Sparkles size={16} className="status-creator-sparkle" />
            <h3 className="status-creator-title">Create 24-Hour Status</h3>
          </div>
          <button
            type="button"
            className="status-creator-close-btn"
            onClick={onClose}
            aria-label="Close status creator"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="status-creator-form">
          {/* Live Card Preview */}
          <div className={`status-creator-preview status-bg-${selectedBg}`}>
            <div className="status-creator-preview-top">
              <Avatar
                name={currentUser?.name || 'You'}
                src={currentUser?.avatar_url}
                hasStatus={true}
                className="avatar-sm"
              />
              <div className="status-creator-preview-meta">
                <span className="status-preview-name">{currentUser?.name || 'You'}</span>
                <span className="status-preview-duration">Visible for 24 hours</span>
              </div>
            </div>

            <textarea
              className="status-creator-textarea"
              placeholder="What is on your heart today? Share a testimony, scripture verse, or prayer thought..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              maxLength={280}
              required
              autoFocus
            />

            {scriptureTag && (
              <div className="status-preview-tag">
                <Sparkles size={12} />
                <span>{scriptureTag}</span>
              </div>
            )}
          </div>

          {/* Theme Selector */}
          <div className="status-theme-picker-section">
            <span className="status-field-label">Background Theme:</span>
            <div className="status-theme-chips no-scrollbar">
              {BG_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  className={`status-theme-circle${selectedBg === theme.id ? ' active' : ''}`}
                  style={{ background: theme.style }}
                  onClick={() => setSelectedBg(theme.id)}
                  title={theme.label}
                  aria-label={theme.label}
                >
                  {selectedBg === theme.id && <Check size={14} className="theme-check-icon" />}
                </button>
              ))}
            </div>
          </div>

          {/* Scripture Reference Field */}
          <div className="status-input-group">
            <label className="status-field-label" htmlFor="scripture-ref-input">
              Scripture or Topic Tag (Optional):
            </label>
            <input
              id="scripture-ref-input"
              type="text"
              placeholder="e.g. Psalm 23:1, Answered Prayer, Praise Report"
              value={scriptureTag}
              onChange={(e) => setScriptureTag(e.target.value)}
              className="status-text-input"
              maxLength={60}
            />
          </div>

          {/* Optional Media URL Field */}
          <div className="status-input-group">
            <label className="status-field-label" htmlFor="media-url-input">
              <span className="label-with-icon">
                <ImageIcon size={14} />
                <span>Image or Photo URL (Optional):</span>
              </span>
            </label>
            <input
              id="media-url-input"
              type="url"
              placeholder="https://..."
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              className="status-text-input"
            />
          </div>

          <div className="status-creator-actions">
            <button type="button" className="status-cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="status-publish-btn"
              disabled={!text.trim() || submitting}
            >
              <Send size={15} />
              <span>Share 24h Status</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
