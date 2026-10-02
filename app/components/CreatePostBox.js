'use client';
import { useState, useRef, useEffect } from 'react';
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
  Tag,
  Search,
  Globe,
  Users,
  Church,
  Lock,
} from 'lucide-react';
import Avatar from './Avatar';
import MemberName from './MemberName';
import { CATEGORY_STYLES, categoryStyle, initials } from '../lib/postDisplay';
import { VISIBILITY_OPTIONS } from '../lib/postInteractions';

const MAX_POLL_OPTIONS = 6;

// High-frequency quick select categories
const FEATURED_CATEGORIES = [
  'prayer',
  'stories',
  'worship',
  'lessons',
  'events',
  'teen',
  'kids',
  'resources',
];

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
  const [categorySearch, setCategorySearch] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [showVisMenu, setShowVisMenu] = useState(false);
  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const categoryMenuRef = useRef(null);
  const categoryTriggerRef = useRef(null);

  const headerName = profile?.display_name || session?.user?.email || 'Member';
  const cat = categoryStyle(composeCategory);

  // Close category dropdown on click outside - never on mouse leave
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        categoryMenuRef.current &&
        !categoryMenuRef.current.contains(event.target) &&
        categoryTriggerRef.current &&
        !categoryTriggerRef.current.contains(event.target)
      ) {
        setShowCategoryMenu(false);
      }
    }
    if (showCategoryMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCategoryMenu]);

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

  // Filter categories in full popover
  const filteredCategories = Object.entries(CATEGORY_STYLES).filter(([_, c]) =>
    c.label.toLowerCase().includes(categorySearch.toLowerCase().trim())
  );

  return (
    <form className="compose compose-genz" onSubmit={(e) => onSubmit(e, visibility)}>
      {/* Top Header: Avatar + Author + Admin Pin Toggle */}
      <div className="compose-header">
        <div className="compose-author-row">
          <Avatar name={headerName} src={profile?.avatar_url} className="avatar-sm" />
          <div className="compose-author-meta">
            <span className="compose-author-name">{headerName}</span>
            <span className="compose-author-sub">
              {profile?.role === 'platform_admin'
                ? 'Platform Administrator'
                : profile?.role === 'church_admin'
                  ? 'Church Administrator'
                  : 'Fellowship Community'}
            </span>
          </div>
        </div>

        <div className="compose-header-right-actions">
          {/* Post Visibility Selector */}
          <div className="compose-vis-wrap">
            <button
              type="button"
              className="compose-vis-btn"
              onClick={() => setShowVisMenu((v) => !v)}
              title="Select post visibility"
            >
              {visibility === 'followers' ? (
                <Users size={13} />
              ) : visibility === 'church' ? (
                <Church size={13} />
              ) : visibility === 'private' ? (
                <Lock size={13} />
              ) : (
                <Globe size={13} />
              )}
              <span>{VISIBILITY_OPTIONS.find((v) => v.id === visibility)?.label || 'Public'}</span>
              <ChevronDown size={11} />
            </button>

            {showVisMenu && (
              <div className="compose-vis-dropdown" role="menu">
                {VISIBILITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`compose-vis-opt-btn${visibility === opt.id ? ' active' : ''}`}
                    onClick={() => {
                      setVisibility(opt.id);
                      setShowVisMenu(false);
                    }}
                  >
                    <span className="vis-opt-icon">{opt.icon}</span>
                    <div className="vis-opt-details">
                      <strong>{opt.label}</strong>
                      <small>{opt.desc}</small>
                    </div>
                  </button>
                ))}
              </div>
            )}
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
              <span>{isPinnedAnnouncement ? 'Pinned Announcement' : 'Pin to top'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Prominent, Unmissable Category Selector Bar */}
      <div className="compose-category-bar">
        <div className="compose-cat-bar-header">
          <div className="compose-cat-bar-title-wrap">
            <Tag size={15} className="cat-bar-icon" />
            <span className="compose-cat-bar-title">Select Category for this post:</span>
            <span
              className="compose-cat-selected-badge"
              style={{
                '--accent': cat.accent,
                '--accent-soft': cat.soft,
                '--accent-text': cat.text,
              }}
            >
              <span className="cat-dot" />
              <strong>{cat.label}</strong>
            </span>
          </div>

          <button
            type="button"
            className="compose-cat-browse-all-btn"
            onClick={() => setShowCategoryMenu(true)}
            title="Browse all 16 categories"
          >
            <span>Browse all (16) ▾</span>
          </button>
        </div>

        {/* Quick-select chips with clear active visual state */}
        <div className="compose-cat-chips-scroll" role="radiogroup" aria-label="Quick Categories">
          {FEATURED_CATEGORIES.map((id) => {
            const itemStyle = categoryStyle(id);
            const isSelected = composeCategory === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                className={`compose-cat-chip${isSelected ? ' is-selected' : ''}`}
                style={{
                  '--accent': itemStyle.accent,
                  '--accent-soft': itemStyle.soft,
                  '--accent-text': itemStyle.text,
                }}
                onClick={() => setComposeCategory(id)}
              >
                <span className="cat-dot" />
                <span className="chip-label">{itemStyle.label}</span>
                {isSelected && <Check size={13} className="chip-check-icon" />}
              </button>
            );
          })}
          <button
            type="button"
            className="compose-cat-chip compose-cat-more-chip"
            onClick={() => setShowCategoryMenu(true)}
          >
            <span>+ More Categories</span>
          </button>
        </div>

        {/* Persistent, Foolproof Category Modal Dialog with Click-Outside Backdrop */}
        {showCategoryMenu && (
          <>
            <div
              className="category-modal-backdrop"
              onClick={() => setShowCategoryMenu(false)}
            />
            <div
              ref={categoryMenuRef}
              className="category-popover category-modal-sheet"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Choose post category"
            >
              <div className="category-popover-header">
                <div className="category-popover-title-row">
                  <div className="category-popover-title">
                    <Tag size={16} className="cat-popover-icon" />
                    <span>Choose Post Category</span>
                  </div>
                  <button
                    type="button"
                    className="category-popover-close"
                    onClick={() => setShowCategoryMenu(false)}
                    aria-label="Close category selector"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Instant search input */}
                <div className="category-search-box">
                  <Search size={15} className="category-search-icon" />
                  <input
                    type="text"
                    placeholder="Search all categories (e.g. prayer, worship, lessons)..."
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    className="category-search-input"
                    autoFocus
                  />
                  {categorySearch && (
                    <button
                      type="button"
                      className="category-search-clear"
                      onClick={() => setCategorySearch('')}
                      aria-label="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="category-popover-grid">
                {filteredCategories.length === 0 ? (
                  <div className="category-popover-empty">No category found matching &quot;{categorySearch}&quot;</div>
                ) : (
                  filteredCategories.map(([id, c]) => {
                    const isCurrent = composeCategory === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        className={`cat-popover-item${isCurrent ? ' active' : ''}`}
                        style={{ '--accent': c.accent, '--accent-soft': c.soft, '--accent-text': c.text }}
                        onClick={() => {
                          setComposeCategory(id);
                          setShowCategoryMenu(false);
                        }}
                      >
                        <span className="cat-dot" />
                        <span className="cat-popover-label">{c.label}</span>
                        {isCurrent && <Check size={16} className="cat-check" />}
                      </button>
                    );
                  })
                )}
              </div>

              <div className="category-popover-footer">
                <span>Select the category that best fits your post so other church members can discover it.</span>
              </div>
            </div>
          </>
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
                : composeCategory === 'stories'
                  ? 'Tell the church what God has done in your life…'
                  : composeCategory === 'worship'
                    ? 'Share a worship song, verse, or creative reflection…'
                    : composeCategory === 'lessons'
                      ? 'Share sermon notes, bible lesson, or study insight…'
                      : composeCategory === 'events'
                        ? 'Share details about an upcoming fellowship or service…'
                        : `Post into ${cat.label}… What’s on your heart today?`
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
