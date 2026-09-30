'use client';
import { useState, useRef } from 'react';
import {
  Image as ImageIcon,
  Video as VideoIcon,
  Mic as MicIcon,
  BarChart3,
  Pin,
  PinOff,
  X,
  Send,
  Sparkles,
  Plus,
  Trash2,
  ChevronDown,
  Check,
} from 'lucide-react';
import Avatar from './Avatar';
import MemberName from './MemberName';
import { CATEGORY_STYLES, categoryStyle, initials } from '../lib/postDisplay';

const MAX_POLL_OPTIONS = 6;

export default function CreatePostBox({
  session,
  profile,
  isAdmin,
  composeText,
  setComposeText,
  composeCategory,
  setComposeCategory,
  isPoll,
  setIsPoll,
  pollOptions,
  setPollOptions,
  mediaFile,
  setMediaFile,
  mediaPreview,
  setMediaPreview,
  mediaUploading,
  pollUploading,
  isPinnedAnnouncement,
  setIsPinnedAnnouncement,
  posting,
  postError,
  onSubmit,
  openAuth,
}) {
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const audioInputRef = useRef(null);

  const headerName = profile?.display_name || session?.user?.email || 'Member';
  const cat = categoryStyle(composeCategory);

  function handleFileSelected(file) {
    if (!file) return;
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  }

  function removeMedia() {
    setMediaFile(null);
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaPreview(null);
  }

  function addPollOption() {
    if (pollOptions.length < MAX_POLL_OPTIONS) {
      setPollOptions((prev) => [...prev, { label: '', file: null, preview: null }]);
    }
  }

  function removePollOption(index) {
    if (pollOptions.length > 2) {
      setPollOptions((prev) => prev.filter((_, i) => i !== index));
    }
  }

  function updatePollOptionLabel(index, val) {
    setPollOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, label: val } : opt))
    );
  }

  function updatePollOptionImage(index, file) {
    setPollOptions((prev) =>
      prev.map((opt, i) => {
        if (i !== index) return opt;
        if (!file) return { ...opt, file: null, preview: null };
        return { ...opt, file, preview: URL.createObjectURL(file) };
      })
    );
  }

  if (!session) {
    return (
      <div className="compose-guest-prompt">
        <div className="guest-prompt-left">
          <div className="avatar guest-avatar">🕊️</div>
          <div>
            <h3 className="guest-prompt-title">Join the fellowship</h3>
            <p className="guest-prompt-sub">Share testimonies, prayers, and connect with your church family.</p>
          </div>
        </div>
        <div className="guest-prompt-actions">
          <button type="button" className="signin-btn" onClick={() => openAuth('signin')}>
            Sign in
          </button>
          <button type="button" className="signup-btn" onClick={() => openAuth('signup')}>
            Sign up
          </button>
        </div>
      </div>
    );
  }

  const isFormDisabled =
    posting ||
    pollUploading ||
    mediaUploading ||
    (!composeText.trim() && !mediaFile) ||
    (isPoll && pollOptions.filter((o) => o.label.trim() || o.file).length < 2);

  return (
    <form className="compose compose-genz" onSubmit={onSubmit}>
      {/* Top Header: Avatar + Author + Category Selector Pill + Admin Pin Toggle */}
      <div className="compose-header">
        <div className="compose-author-row">
          <Avatar name={headerName} src={profile?.avatar_url} className="avatar-sm" />
          <div className="compose-author-meta">
            <span className="compose-author-name">{headerName}</span>
            <div className="compose-selector-wrap">
              <button
                type="button"
                className="compose-category-pill"
                style={{ '--accent': cat.accent, '--accent-soft': cat.soft, '--accent-text': cat.text }}
                onClick={() => setShowCategoryMenu((v) => !v)}
                aria-expanded={showCategoryMenu}
              >
                <span className="cat-dot" />
                <span className="cat-label">{cat.label}</span>
                <ChevronDown size={13} className={`chevron-icon${showCategoryMenu ? ' open' : ''}`} />
              </button>

              {/* Floating category menu */}
              {showCategoryMenu && (
                <div className="category-popover" onMouseLeave={() => setShowCategoryMenu(false)}>
                  <div className="category-popover-title">Post into:</div>
                  <div className="category-popover-grid">
                    {Object.entries(CATEGORY_STYLES).map(([id, c]) => (
                      <button
                        key={id}
                        type="button"
                        className={`cat-popover-item${composeCategory === id ? ' active' : ''}`}
                        style={{ '--accent': c.accent, '--accent-soft': c.soft, '--accent-text': c.text }}
                        onClick={() => {
                          setComposeCategory(id);
                          setShowCategoryMenu(false);
                        }}
                      >
                        <span className="cat-dot" />
                        <span>{c.label}</span>
                        {composeCategory === id && <Check size={13} className="cat-check" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Admin Pinned Announcement quick badge */}
        {isAdmin && (
          <button
            type="button"
            className={`compose-pin-badge${isPinnedAnnouncement ? ' active' : ''}`}
            onClick={() => setIsPinnedAnnouncement((v) => !v)}
            title={isPinnedAnnouncement ? 'Will be pinned to top of feed' : 'Click to pin as announcement'}
          >
            {isPinnedAnnouncement ? <Pin size={14} className="pin-active-svg" /> : <Pin size={14} />}
            <span>{isPinnedAnnouncement ? 'Pinned' : 'Pin to top'}</span>
          </button>
        )}
      </div>

      {/* Modern Textarea */}
      <div className="compose-input-wrapper">
        <textarea
          id="compose-box"
          value={composeText}
          onChange={(e) => setComposeText(e.target.value)}
          placeholder={
            isPoll
              ? 'Ask your question to the church community…'
              : composeCategory === 'prayer'
                ? 'Share a prayer request or praise report…'
                : composeCategory === 'testimony'
                  ? 'Tell the church what God has done in your life…'
                  : 'What’s on your heart today? Share a word, scripture or encouragement…'
          }
          rows={3}
          maxLength={2000}
          className="compose-textarea"
        />
      </div>

      {/* Media Preview (Photo / Video / Audio) */}
      {mediaPreview && (
        <div className="compose-media-preview-card">
          {mediaFile?.type?.startsWith('image/') && (
            <div className="preview-image-wrap">
              <img src={mediaPreview} alt="Preview" className="preview-image" />
              <button
                type="button"
                className="preview-remove-btn"
                onClick={removeMedia}
                aria-label="Remove image"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {mediaFile?.type?.startsWith('video/') && (
            <div className="preview-video-wrap">
              <video src={mediaPreview} controls playsInline className="preview-video" />
              <button
                type="button"
                className="preview-remove-btn"
                onClick={removeMedia}
                aria-label="Remove video"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {mediaFile?.type?.startsWith('audio/') && (
            <div className="preview-audio-wrap">
              <div className="preview-audio-info">
                <MicIcon size={20} className="preview-audio-icon" />
                <span className="preview-audio-name">{mediaFile?.name || 'Audio clip'}</span>
              </div>
              <audio src={mediaPreview} controls className="preview-audio-player" />
              <button
                type="button"
                className="preview-remove-btn"
                onClick={removeMedia}
                aria-label="Remove audio"
              >
                <X size={15} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Interactive Poll Builder */}
      {isPoll && (
        <div className="compose-poll-box">
          <div className="poll-box-header">
            <div className="poll-title-left">
              <BarChart3 size={16} className="poll-icon-badge" />
              <span className="poll-box-title">Community Poll</span>
              <span className="poll-anon-badge">🔒 Anonymous</span>
            </div>
            <button
              type="button"
              className="poll-close-btn"
              onClick={() => setIsPoll(false)}
              aria-label="Cancel poll"
            >
              <X size={14} />
            </button>
          </div>

          <div className="poll-options-list">
            {pollOptions.map((opt, i) => (
              <div className="poll-option-row-modern" key={i}>
                <span className="poll-opt-index">{i + 1}</span>

                <div className="poll-opt-input-wrap">
                  <input
                    type="text"
                    value={opt.label}
                    onChange={(e) => updatePollOptionLabel(i, e.target.value)}
                    placeholder={`Option ${i + 1}${opt.preview ? ' (caption optional)' : '...'}`}
                    maxLength={80}
                    className="poll-opt-input"
                  />
                </div>

                {/* Option photo attachment */}
                <label className="poll-opt-photo-btn" title="Add photo to option">
                  {opt.preview ? (
                    <img src={opt.preview} alt="" className="poll-opt-thumb" />
                  ) : (
                    <span className="poll-opt-photo-text">
                      <ImageIcon size={13} />
                      Photo
                    </span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => updatePollOptionImage(i, e.target.files?.[0] || null)}
                    hidden
                  />
                </label>

                {pollOptions.length > 2 && (
                  <button
                    type="button"
                    className="poll-opt-delete-btn"
                    onClick={() => removePollOption(i)}
                    aria-label="Remove option"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {pollOptions.length < MAX_POLL_OPTIONS && (
            <button type="button" className="poll-add-btn-modern" onClick={addPollOption}>
              <Plus size={14} />
              <span>Add Option</span>
            </button>
          )}
        </div>
      )}

      {/* Hidden File Inputs triggered by modern toolbar buttons */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        hidden
        onChange={(e) => {
          handleFileSelected(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        hidden
        onChange={(e) => {
          handleFileSelected(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/mpeg,audio/mp4,audio/wav,audio/ogg,audio/webm"
        hidden
        onChange={(e) => {
          handleFileSelected(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      {/* Bottom Action Bar */}
      <div className="compose-bottom-toolbar">
        <div className="compose-tools-group" role="group" aria-label="Attachments">
          <button
            type="button"
            className="tool-btn"
            onClick={() => photoInputRef.current?.click()}
            title="Attach a photo"
            aria-label="Attach photo"
          >
            <ImageIcon size={18} className="tool-icon tool-photo" />
            <span className="tool-label">Photo</span>
          </button>

          <button
            type="button"
            className="tool-btn"
            onClick={() => videoInputRef.current?.click()}
            title="Attach a video or reel"
            aria-label="Attach video"
          >
            <VideoIcon size={18} className="tool-icon tool-video" />
            <span className="tool-label">Video</span>
          </button>

          <button
            type="button"
            className="tool-btn"
            onClick={() => audioInputRef.current?.click()}
            title="Attach audio or podcast clip"
            aria-label="Attach audio"
          >
            <MicIcon size={18} className="tool-icon tool-audio" />
            <span className="tool-label">Audio</span>
          </button>

          <button
            type="button"
            className={`tool-btn${isPoll ? ' active' : ''}`}
            onClick={() => setIsPoll((v) => !v)}
            title="Create a community poll"
            aria-label="Toggle poll"
          >
            <BarChart3 size={18} className="tool-icon tool-poll" />
            <span className="tool-label">Poll</span>
          </button>
        </div>

        {/* Post CTA + Char count */}
        <div className="compose-cta-group">
          {composeText.length > 0 && (
            <span className={`char-counter${composeText.length > 1800 ? ' warn' : ''}`}>
              {composeText.length}/2000
            </span>
          )}

          <button type="submit" className="compose-submit-btn" disabled={isFormDisabled}>
            {mediaUploading || pollUploading ? (
              <span>Uploading…</span>
            ) : posting ? (
              <span>Posting…</span>
            ) : (
              <>
                <span>Post</span>
                <Send size={14} className="send-icon" />
              </>
            )}
          </button>
        </div>
      </div>

      {postError && <p className="auth-message compose-error-msg">{postError}</p>}
    </form>
  );
}
