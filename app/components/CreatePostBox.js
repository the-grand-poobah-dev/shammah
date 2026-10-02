'use client';
import { useState, useRef, useEffect } from 'react';
import {
  Image as ImageIcon,
  Video as VideoIcon,
  Mic as MicIcon,
  BarChart3,
  Pin,
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
  AlertCircle,
  EyeOff,
  User,
  RefreshCw,
} from 'lucide-react';
import Avatar from './Avatar';
import MemberName from './MemberName';
import { CATEGORY_STYLES, categoryStyle, initials } from '../lib/postDisplay';
import { VISIBILITY_OPTIONS } from '../lib/postInteractions';
import { playSound } from '../lib/soundEffects';
import { generatePseudoIdentity, ANONYMOUS_IDENTITY } from '../lib/anonymousManager';

const MAX_POLL_OPTIONS = 6;

const VIS_ICONS = {
  public: Globe,
  followers: Users,
  church: Church,
  private: Lock,
};

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
  const [categoryError, setCategoryError] = useState(false);
  const [postIdentity, setPostIdentity] = useState('real'); // real | anonymous | pseudo
  const [pseudoProfile, setPseudoProfile] = useState(() => generatePseudoIdentity());
  const [showIdentityMenu, setShowIdentityMenu] = useState(false);

  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const categoryMenuRef = useRef(null);
  const categoryTriggerRef = useRef(null);
  const visMenuRef = useRef(null);
  const identityMenuRef = useRef(null);

  const headerName = profile?.display_name || session?.user?.email || 'Member';
  const cat = composeCategory ? categoryStyle(composeCategory) : null;

  // Active identity displayed
  const currentIdentityName =
    postIdentity === 'anonymous'
      ? ANONYMOUS_IDENTITY.name
      : postIdentity === 'pseudo'
        ? pseudoProfile.name
        : headerName;

  const currentIdentityAvatar =
    postIdentity === 'anonymous' || postIdentity === 'pseudo'
      ? null
      : profile?.avatar_url;

  // Close category dropdown on click outside
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
      if (visMenuRef.current && !visMenuRef.current.contains(event.target)) {
        setShowVisMenu(false);
      }
      if (identityMenuRef.current && !identityMenuRef.current.contains(event.target)) {
        setShowIdentityMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  function handleFileSelected(file) {
    if (!file) return;
    setMediaFile(file);
    const url = URL.createObjectURL(file);
    setMediaPreview({
      url,
      type: file.type.startsWith('video/')
        ? 'video'
        : file.type.startsWith('audio/')
          ? 'audio'
          : 'image',
    });
  }

  function handleRemoveMedia() {
    setMediaFile(null);
    setMediaPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
    if (audioInputRef.current) audioInputRef.current.value = '';
  }

  function handleAddPollOption() {
    if (pollOptions.length >= MAX_POLL_OPTIONS) return;
    setPollOptions((prev) => [...prev, { label: '', file: null, preview: null }]);
  }

  function handleRemovePollOption(index) {
    if (pollOptions.length <= 2) return;
    setPollOptions((prev) => prev.filter((_, i) => i !== index));
  }

  function handlePollOptionLabelChange(index, value) {
    setPollOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, label: value } : opt))
    );
  }

  function handlePollOptionPhotoChange(index, file) {
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
    !composeCategory ||
    (!composeText.trim() && !mediaFile) ||
    (isPoll && pollOptions.filter((o) => o.label.trim() || o.file).length < 2);

  // Filter categories in popover dropdown (excluding FAQ as requested)
  const filteredCategories = Object.entries(CATEGORY_STYLES).filter(
    ([id, c]) =>
      id !== 'faq' && c.label.toLowerCase().includes(categorySearch.toLowerCase().trim())
  );

  function handleFormSubmit(e) {
    e.preventDefault();
    if (!composeCategory) {
      setCategoryError(true);
      setShowCategoryMenu(true);
      return;
    }
    setCategoryError(false);
    onSubmit(e, visibility, { identityMode: postIdentity, pseudoName: pseudoProfile.name });
  }

  const CurrentVisIcon = VIS_ICONS[visibility] || Globe;

  return (
    <form className="compose compose-genz" onSubmit={handleFormSubmit}>
      {/* Top Header: Avatar + Author + Privacy Selector + Admin Pin Toggle */}
      <div className="compose-header">
        <div className="compose-author-row" ref={identityMenuRef}>
          <Avatar name={currentIdentityName} src={currentIdentityAvatar} className="avatar-sm" />
          <div className="compose-author-meta">
            <button
              type="button"
              className="compose-identity-toggle-btn"
              onClick={() => setShowIdentityMenu((v) => !v)}
              title="Click to post anonymously or with an auto-generated pseudo name"
            >
              <span className="compose-author-name">{currentIdentityName}</span>
              <ChevronDown size={12} className="identity-chevron" />
            </button>
            <span className="compose-author-sub">
              {postIdentity === 'anonymous'
                ? 'Posting Anonymously 🕵️'
                : postIdentity === 'pseudo'
                  ? 'Pseudonym Protected 🎲'
                  : profile?.role === 'platform_admin'
                    ? 'Platform Administrator'
                    : profile?.role === 'church_admin'
                      ? 'Church Administrator'
                      : 'Fellowship Community'}
            </span>

            {/* Identity Dropdown Menu */}
            {showIdentityMenu && (
              <div className="compose-identity-dropdown" role="menu">
                <button
                  type="button"
                  className={`ident-opt-btn${postIdentity === 'real' ? ' active' : ''}`}
                  onClick={() => {
                    setPostIdentity('real');
                    setShowIdentityMenu(false);
                    playSound('reaction');
                  }}
                >
                  <User size={15} />
                  <div className="ident-opt-text">
                    <strong>Post as Yourself</strong>
                    <small>{headerName}</small>
                  </div>
                  {postIdentity === 'real' && <Check size={14} className="ident-opt-check" />}
                </button>

                <button
                  type="button"
                  className={`ident-opt-btn${postIdentity === 'anonymous' ? ' active' : ''}`}
                  onClick={() => {
                    setPostIdentity('anonymous');
                    setShowIdentityMenu(false);
                    playSound('reaction');
                  }}
                >
                  <EyeOff size={15} />
                  <div className="ident-opt-text">
                    <strong>Post Anonymously</strong>
                    <small>Name and avatar hidden from fellowship</small>
                  </div>
                  {postIdentity === 'anonymous' && <Check size={14} className="ident-opt-check" />}
                </button>

                <button
                  type="button"
                  className={`ident-opt-btn${postIdentity === 'pseudo' ? ' active' : ''}`}
                  onClick={() => {
                    setPostIdentity('pseudo');
                    setShowIdentityMenu(false);
                    playSound('reaction');
                  }}
                >
                  <Sparkles size={15} />
                  <div className="ident-opt-text">
                    <strong>Auto Pseudo Name</strong>
                    <small>{pseudoProfile.name}</small>
                  </div>
                  {postIdentity === 'pseudo' && <Check size={14} className="ident-opt-check" />}
                </button>

                {postIdentity === 'pseudo' && (
                  <button
                    type="button"
                    className="ident-reroll-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPseudoProfile(generatePseudoIdentity());
                      playSound('reaction');
                    }}
                  >
                    <RefreshCw size={12} />
                    <span>Generate New Pseudo Name</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="compose-header-right-actions">
          {/* Post Visibility Selector - Styled to match our Neon Glass UI */}
          <div className="compose-vis-wrap" ref={visMenuRef}>
            <button
              type="button"
              className="compose-vis-btn"
              onClick={() => setShowVisMenu((v) => !v)}
              title="Change post privacy & visibility"
              aria-label="Post visibility options"
            >
              <CurrentVisIcon size={13} className="vis-current-icon" />
              <span>{VISIBILITY_OPTIONS.find((v) => v.id === visibility)?.label || 'Public'}</span>
              <ChevronDown size={11} className="vis-chevron" />
            </button>

            {showVisMenu && (
              <div className="compose-vis-dropdown" role="menu">
                {VISIBILITY_OPTIONS.map((opt) => {
                  const OptIcon = VIS_ICONS[opt.id] || Globe;
                  const isActive = visibility === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      className={`compose-vis-opt-btn${isActive ? ' active' : ''}`}
                      onClick={() => {
                        setVisibility(opt.id);
                        setShowVisMenu(false);
                        playSound('reaction');
                      }}
                    >
                      <span className="vis-opt-icon">
                        <OptIcon size={15} />
                      </span>
                      <div className="vis-opt-details">
                        <strong>{opt.label}</strong>
                        <small>{opt.desc}</small>
                      </div>
                      {isActive && <Check size={14} className="vis-opt-check" />}
                    </button>
                  );
                })}
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
              <Pin size={14} className={isPinnedAnnouncement ? 'pin-active-svg' : ''} />
              <span>{isPinnedAnnouncement ? 'Pinned Announcement' : 'Pin to top'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Dropdown Selector Bar - Only on Dropdown as requested */}
      <div className="compose-category-bar">
        <div className="compose-cat-dropdown-row">
          <div className="compose-cat-prompt-wrap">
            <Tag size={15} className="cat-bar-icon" />
            <span className="compose-cat-bar-title">Post Category:</span>
          </div>

          <div className="compose-cat-trigger-wrap">
            <button
              type="button"
              ref={categoryTriggerRef}
              className={`compose-cat-dropdown-trigger${!composeCategory ? ' required-highlight' : ' selected'}`}
              onClick={() => setShowCategoryMenu((v) => !v)}
              style={
                composeCategory && cat
                  ? {
                      '--cat-accent': cat.accent,
                      '--cat-soft': cat.soft,
                      '--cat-text': cat.text,
                    }
                  : undefined
              }
              aria-label="Select Category"
            >
              {composeCategory && cat ? (
                <>
                  <span className="cat-dot" />
                  <strong className="cat-trigger-label">{cat.label}</strong>
                  <span className="cat-change-hint">Change ▾</span>
                </>
              ) : (
                <>
                  <AlertCircle size={14} className="cat-alert-icon" />
                  <span className="cat-trigger-placeholder">Select a category (Required to post)</span>
                  <ChevronDown size={14} className="cat-chevron" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dropdown Menu Popover */}
        {showCategoryMenu && (
          <>
            <div className="category-modal-backdrop" onClick={() => setShowCategoryMenu(false)} />
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
                    <span>Select Post Category (Required)</span>
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
                    placeholder="Search categories (e.g. prayer, worship, lessons)..."
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
                          setCategoryError(false);
                          setShowCategoryMenu(false);
                          playSound('reaction');
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
                <span>Select a category so fellowship members can easily discover and pray over your post.</span>
              </div>
            </div>
          </>
        )}
      </div>

      {categoryError && (
        <div className="compose-category-warning">
          <AlertCircle size={14} />
          <span>Please select a category above from the dropdown before publishing your post.</span>
        </div>
      )}

      {/* Modern Textarea */}
      <div className="compose-input-wrapper">
        <textarea
          id="compose-box"
          value={composeText}
          onChange={(e) => setComposeText(e.target.value)}
          placeholder={
            isPoll
              ? 'Ask your question to the church community…'
              : !composeCategory
                ? 'Select a category above, then share what is on your heart today…'
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
                          : `Post into ${cat?.label || 'fellowship'}… What’s on your heart today?`
          }
          rows={3}
          maxLength={2000}
          className="compose-textarea"
        />
      </div>

      {/* Media Preview (Photo / Video / Audio) */}
      {mediaPreview && (
        <div className="compose-media-preview-container">
          {mediaPreview.type === 'image' && (
            <div className="media-preview-box">
              <img src={mediaPreview.url} alt="Upload preview" className="media-preview-img" />
              <button
                type="button"
                className="media-preview-remove"
                onClick={handleRemoveMedia}
                title="Remove photo"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {mediaPreview.type === 'video' && (
            <div className="media-preview-box">
              <video src={mediaPreview.url} controls className="media-preview-video" />
              <button
                type="button"
                className="media-preview-remove"
                onClick={handleRemoveMedia}
                title="Remove video"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {mediaPreview.type === 'audio' && (
            <div className="media-preview-audio-box">
              <div className="audio-preview-icon">
                <MicIcon size={20} />
              </div>
              <div className="audio-preview-details">
                <span className="audio-preview-title">{mediaFile?.name || 'Audio Recording'}</span>
                <audio src={mediaPreview.url} controls className="audio-preview-player" />
              </div>
              <button
                type="button"
                className="media-preview-remove"
                onClick={handleRemoveMedia}
                title="Remove audio"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Poll Creation Builder */}
      {isPoll && (
        <div className="compose-poll-builder">
          <div className="poll-builder-header">
            <span className="poll-builder-title">Poll Options</span>
            <span className="poll-builder-sub">Add 2 to {MAX_POLL_OPTIONS} options. Photo options supported!</span>
          </div>

          <div className="poll-builder-list">
            {pollOptions.map((opt, idx) => (
              <div key={idx} className="poll-builder-option-row">
                <span className="poll-opt-index">{idx + 1}</span>
                <input
                  type="text"
                  placeholder={`Option ${idx + 1}`}
                  value={opt.label}
                  onChange={(e) => handlePollOptionLabelChange(idx, e.target.value)}
                  className="poll-opt-input"
                  maxLength={80}
                />

                {/* Option photo button */}
                <label className="poll-opt-photo-btn" title="Add photo to this option">
                  <ImageIcon size={14} />
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handlePollOptionPhotoChange(idx, f);
                    }}
                  />
                </label>

                {opt.preview && (
                  <div className="poll-opt-preview-thumb">
                    <img src={opt.preview} alt="Option thumbnail" />
                    <button
                      type="button"
                      onClick={() => handlePollOptionPhotoChange(idx, null)}
                      className="thumb-remove-btn"
                    >
                      <X size={10} />
                    </button>
                  </div>
                )}

                {pollOptions.length > 2 && (
                  <button
                    type="button"
                    className="poll-opt-remove-btn"
                    onClick={() => handleRemovePollOption(idx)}
                    title="Remove option"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {pollOptions.length < MAX_POLL_OPTIONS && (
            <button
              type="button"
              className="poll-add-option-btn"
              onClick={handleAddPollOption}
            >
              <Plus size={14} />
              <span>Add Option</span>
            </button>
          )}
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
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

          <button
            type="submit"
            className={`compose-submit-btn${!composeCategory ? ' needs-category' : ''}`}
            disabled={isFormDisabled}
            title={!composeCategory ? 'Select a category above before posting' : 'Post to fellowship'}
          >
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
