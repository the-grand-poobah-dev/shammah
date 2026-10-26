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
  Bot,
  DownloadCloud,
  Clock,
  MessageCircle,
  Share2,
  Heart,
  Tv,
  Shield,
  Loader2,
} from 'lucide-react';
import PopupSheet from './PopupSheet';
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
  const [hoveredCat, setHoveredCat] = useState(null);
  const [hoveredIdent, setHoveredIdent] = useState(null);
  const [hoveredVis, setHoveredVis] = useState(null);
  const [visibility, setVisibility] = useState('public');
  const [showVisMenu, setShowVisMenu] = useState(false);
  const [categoryError, setCategoryError] = useState(false);
  const [postIdentity, setPostIdentity] = useState('real'); // real | anonymous | pseudo
  const [pseudoProfile, setPseudoProfile] = useState(() => generatePseudoIdentity());
  const [showIdentityMenu, setShowIdentityMenu] = useState(false);
  const [aiEnhancing, setAiEnhancing] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [prePolishText, setPrePolishText] = useState(null);
  const [allowOfflineDownload, setAllowOfflineDownload] = useState(true);
  const [previewTestVote, setPreviewTestVote] = useState(null);
  const [previewSimulateResults, setPreviewSimulateResults] = useState(false);
  const [pollDuration, setPollDuration] = useState('24h'); // '1h' | '24h' | '3d' | '7d'
  const [revealResultsAfterVoting, setRevealResultsAfterVoting] = useState(true);
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [correctOptionIdx, setCorrectOptionIdx] = useState(0);
  const [quizExplanation, setQuizExplanation] = useState('');

  // Keep preview vote index valid when poll options are added or removed
  useEffect(() => {
    if (previewTestVote !== null && previewTestVote >= pollOptions.length) {
      setPreviewTestVote(null);
    }
  }, [pollOptions.length, previewTestVote]);

  async function handleAiEnhance() {
    if (!composeText.trim()) return;
    setAiEnhancing(true);
    setAiError(null);
    playSound('reaction');
    try {
      const token = session?.access_token || 'authenticated-token';
      const res = await fetch('/api/gemini/enhance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: isPoll ? 'generate_poll' : 'polish_testimony',
          text: composeText,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        let msg = data.error || 'Failed to polish text';
        try {
          if (typeof msg === 'string' && (msg.startsWith('{') || msg.startsWith('['))) {
            const parsed = JSON.parse(msg);
            msg = parsed?.error?.message || parsed?.message || msg;
          }
        } catch {}
        throw new Error(msg);
      }
      if (data.enhancedText) {
        setPrePolishText(composeText);
        setComposeText(data.enhancedText);
        playSound('badge');
      }
    } catch (err) {
      console.error('Enhance error:', err);
      setAiError(err.message || 'Unable to polish text. Please try again.');
    } finally {
      setAiEnhancing(false);
    }
  }

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
            <h3 className="guest-prompt-title">Join the Christian Family</h3>
            <p className="guest-prompt-sub">Share testimonies, prayers, and connect with your Christian family.</p>
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
    const durationMs =
      pollDuration === '1m'
        ? 1000 * 60
        : pollDuration === '1h'
          ? 1000 * 60 * 60
          : pollDuration === '3d'
            ? 1000 * 60 * 60 * 24 * 3
            : pollDuration === '7d'
              ? 1000 * 60 * 60 * 24 * 7
              : 1000 * 60 * 60 * 24; // 24h default

    const pollExpiresAt = isPoll ? new Date(Date.now() + durationMs).toISOString() : null;

    onSubmit(e, visibility, {
      identityMode: postIdentity,
      pseudoName: pseudoProfile.name,
      allowOffline: allowOfflineDownload,
      pollDuration: isPoll ? pollDuration : null,
      pollExpiresAt,
      revealResultsAfterVoting: isPoll ? revealResultsAfterVoting : false,
      isQuiz: isPoll ? isQuizMode : false,
      correctOptionIdx: isPoll && isQuizMode ? correctOptionIdx : null,
      quizExplanation: isPoll && isQuizMode ? quizExplanation : '',
    });
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
              title="Click to post anonymously, with a pseudonym, or as yourself"
            >
              <MemberName
                name={currentIdentityName}
                badge={postIdentity === 'real' ? profile?.badge : null}
                verified={postIdentity === 'real' ? profile?.badge_verified : false}
                role={postIdentity === 'real' ? profile?.role : null}
                nameClassName="compose-author-name post-author"
              />
              <ChevronDown size={13} className="identity-chevron" />
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
                      : 'Community Member'}
            </span>

            {/* Identity Selector Modal using canonical PopupSheet */}
            <PopupSheet
              open={showIdentityMenu}
              onClose={() => setShowIdentityMenu(false)}
              title={
                <div className="visibility-modal-title">
                  <User size={18} className="vis-icon-shield" />
                  <span>Post Identity</span>
                </div>
              }
              size="sm"
            >
              <p className="visibility-desc">
                Choose how your name and avatar appear to others on this post:
              </p>
              <div className="visibility-options-list">
                <button
                  type="button"
                  className={`visibility-option-item${postIdentity === 'real' ? ' active' : ''}`}
                  onClick={() => {
                    setPostIdentity('real');
                    setShowIdentityMenu(false);
                    playSound('reaction');
                  }}
                >
                  <div className="vis-option-left">
                    <span className="vis-option-icon" style={{ background: 'rgba(6, 182, 212, 0.12)', color: '#0891b2' }}>
                      <User size={18} />
                    </span>
                    <div className="vis-option-text">
                      <span className="vis-option-label">Post as Yourself</span>
                      <span className="vis-option-sub">{headerName}</span>
                    </div>
                  </div>
                  {postIdentity === 'real' && <Check size={16} className="vis-check-icon" />}
                </button>

                <button
                  type="button"
                  className={`visibility-option-item${postIdentity === 'anonymous' ? ' active' : ''}`}
                  onClick={() => {
                    setPostIdentity('anonymous');
                    setShowIdentityMenu(false);
                    playSound('reaction');
                  }}
                >
                  <div className="vis-option-left">
                    <span className="vis-option-icon" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}>
                      <EyeOff size={18} />
                    </span>
                    <div className="vis-option-text">
                      <span className="vis-option-label">Post Anonymously</span>
                      <span className="vis-option-sub">Name and avatar hidden from community</span>
                    </div>
                  </div>
                  {postIdentity === 'anonymous' && <Check size={16} className="vis-check-icon" />}
                </button>

                <button
                  type="button"
                  className={`visibility-option-item${postIdentity === 'pseudo' ? ' active' : ''}`}
                  onClick={() => {
                    setPostIdentity('pseudo');
                    setShowIdentityMenu(false);
                    playSound('reaction');
                  }}
                >
                  <div className="vis-option-left">
                    <span className="vis-option-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                      <Sparkles size={18} />
                    </span>
                    <div className="vis-option-text">
                      <span className="vis-option-label">Pseudonym Protected</span>
                      <span className="vis-option-sub">{pseudoProfile.name}</span>
                    </div>
                  </div>
                  {postIdentity === 'pseudo' && <Check size={16} className="vis-check-icon" />}
                </button>
              </div>
              {postIdentity === 'pseudo' && (
                <div style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    className="ident-reroll-action-btn"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPseudoProfile(generatePseudoIdentity());
                      playSound('reaction');
                    }}
                  >
                    <RefreshCw size={13} />
                    <span>Generate New Pseudo Name</span>
                  </button>
                </div>
              )}
            </PopupSheet>
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

            {/* Post Visibility Modal using canonical PopupSheet */}
            <PopupSheet
              open={showVisMenu}
              onClose={() => setShowVisMenu(false)}
              title={
                <div className="visibility-modal-title">
                  <Shield size={18} className="vis-icon-shield" />
                  <span>Post Visibility &amp; Privacy</span>
                </div>
              }
              size="sm"
            >
              <p className="visibility-desc">
                Choose who can see this post on Shammah:
              </p>
              <div className="visibility-options-list">
                {VISIBILITY_OPTIONS.map((opt) => {
                  const OptIcon = VIS_ICONS[opt.id] || Globe;
                  const isSelected = visibility === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      className={`visibility-option-item${isSelected ? ' active' : ''}`}
                      onClick={() => {
                        setVisibility(opt.id);
                        setShowVisMenu(false);
                        playSound('reaction');
                      }}
                    >
                      <div className="vis-option-left">
                        <span className="vis-option-icon">
                          <OptIcon size={18} />
                        </span>
                        <div className="vis-option-text">
                          <span className="vis-option-label">{opt.label}</span>
                          <span className="vis-option-sub">{opt.desc}</span>
                        </div>
                      </div>
                      {isSelected && <Check size={16} className="vis-check-icon" />}
                    </button>
                  );
                })}
              </div>
            </PopupSheet>
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
                  <span className="cat-trigger-placeholder">Select a category</span>
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
              className="category-popover neon-glow-modal category-modal-sheet"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Select a category"
            >
              <div className="category-popover-header">
                <div className="category-popover-title-row">
                  <div className="category-popover-title">
                    <Tag size={16} className="cat-popover-icon" />
                    <span>Select a category</span>
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

              <div className="category-popover-grid no-scrollbar">
                {filteredCategories.length === 0 ? (
                  <div className="category-popover-empty">No category found matching &quot;{categorySearch}&quot;</div>
                ) : (
                  filteredCategories.map(([id, c]) => {
                    const isCurrent = composeCategory === id;
                    const isHovered = hoveredCat === id;
                    const isHighlighted = isCurrent || isHovered;
                    return (
                      <button
                        key={id}
                        type="button"
                        className={`cat-popover-item${isHighlighted ? ' active is-highlighted' : ''}`}
                        style={{
                          '--accent': c.accent,
                          '--item-accent': c.accent,
                          '--accent-soft': c.soft,
                          '--accent-text': c.text,
                        }}
                        onMouseEnter={() => setHoveredCat(id)}
                        onMouseLeave={() => setHoveredCat(null)}
                        onClick={() => {
                          setComposeCategory(id);
                          setCategoryError(false);
                          setShowCategoryMenu(false);
                          playSound('reaction');
                        }}
                      >
                        <span className="cat-dot" style={{ background: c.accent }} />
                        <span className="cat-popover-label">{c.label}</span>
                        {isCurrent && <Check size={16} className="cat-check" />}
                      </button>
                    );
                  })
                )}
              </div>

              <div className="category-popover-footer">
                <span>Select a category so community members can easily discover and pray over your post.</span>
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
        {/* AI Polish Undo Notification */}
        {prePolishText !== null && (
          <div className="flex items-center justify-between p-2.5 px-3 mb-2 rounded-xl border border-teal-500/30 bg-teal-500/10 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-amber-400" />
              <span className="font-semibold text-teal-300">Polished with Shammah AI</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
                onClick={() => {
                  setComposeText(prePolishText);
                  setPrePolishText(null);
                  playSound('reaction');
                }}
              >
                Undo
              </button>
              <button
                type="button"
                className="px-2.5 py-1 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 font-medium transition-colors"
                onClick={() => {
                  setPrePolishText(null);
                  playSound('badge');
                }}
              >
                Keep
              </button>
            </div>
          </div>
        )}

        {/* AI Polish Error Alert */}
        {aiError && (
          <div className="flex items-center justify-between p-2.5 px-3 mb-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs" role="alert">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="text-rose-400 flex-shrink-0" />
              <span>{aiError}</span>
            </div>
            <button
              type="button"
              className="p-1 text-rose-400 hover:text-rose-200 transition-colors"
              onClick={() => setAiError(null)}
              aria-label="Dismiss error"
            >
              <X size={13} />
            </button>
          </div>
        )}

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
                          ? 'Share details about an upcoming event or service…'
                          : `Post into ${cat?.label || 'community'}… What’s on your heart today?`
          }
          rows={3}
          maxLength={2000}
          className="compose-textarea"
        />
        <div className="compose-char-counter-row">
          <span className={`char-counter${composeText.length > 1800 ? ' warn' : ''}`}>
            {composeText.length} / 2000
          </span>
        </div>
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
            <div className="poll-builder-header-left">
              <span className="poll-builder-title">{isQuizMode ? '🎯 Church & Bible Quiz Mode' : 'Poll Options'}</span>
              <span className="poll-builder-sub">
                {isQuizMode
                  ? 'Set the correct answer by clicking "Mark Correct" on an option. Participants will receive instant scoring upon voting!'
                  : `Add 2 to ${MAX_POLL_OPTIONS} options. Photo options supported!`}
              </span>
            </div>

            {/* Poll vs Quiz Mode Toggle */}
            <div className="poll-mode-toggle-group">
              <button
                type="button"
                className={`poll-mode-tab-btn${!isQuizMode ? ' active' : ''}`}
                onClick={() => {
                  setIsQuizMode(false);
                  playSound('reaction');
                }}
                title="Community survey without right or wrong answers"
              >
                <BarChart3 size={13} />
                <span>Survey</span>
              </button>
              <button
                type="button"
                className={`poll-mode-tab-btn quiz-btn${isQuizMode ? ' active' : ''}`}
                onClick={() => {
                  setIsQuizMode(true);
                  playSound('badge');
                }}
                title="Quiz mode with correct answer, instant feedback and scoring"
              >
                <Sparkles size={13} />
                <span>Quiz Mode 🎯</span>
              </button>
            </div>
          </div>

          <div className="poll-builder-list">
            {pollOptions.map((opt, idx) => (
              <div key={idx} className={`poll-builder-option-row${isQuizMode && correctOptionIdx === idx ? ' is-correct-answer' : ''}`}>
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

                {/* Quiz Mode: Set Correct Answer Button */}
                {isQuizMode && (
                  <button
                    type="button"
                    className={`poll-correct-answer-pill${correctOptionIdx === idx ? ' selected' : ''}`}
                    onClick={() => {
                      setCorrectOptionIdx(idx);
                      playSound('badge');
                    }}
                    title={correctOptionIdx === idx ? 'Marked as the correct answer' : 'Click to mark as correct answer'}
                  >
                    {correctOptionIdx === idx ? (
                      <>
                        <Check size={12} className="text-emerald-400" />
                        <span>Correct ✓</span>
                      </>
                    ) : (
                      <span>Mark Correct</span>
                    )}
                  </button>
                )}

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

          {/* Optional Quiz Scripture Reference & Explanation */}
          {isQuizMode && (
            <div className="poll-quiz-explanation-box">
              <label className="poll-quiz-exp-label">
                <Sparkles size={13} className="text-amber-400" />
                <span>Scripture Reference &amp; Explanation (Revealed instantly to voters):</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Genesis 5:27 teaches that Methuselah lived 969 years..."
                value={quizExplanation}
                onChange={(e) => setQuizExplanation(e.target.value)}
                className="poll-quiz-exp-input"
                maxLength={200}
              />
            </div>
          )}

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

          {/* Poll Settings: Expiration Duration & Reveal Results Toggle */}
          <div className="poll-settings-panel">
            <div className="poll-setting-group">
              <label className="poll-setting-label">
                <Clock size={13} className="text-teal-400" />
                <span>Poll Duration / Expiration:</span>
              </label>
              <div className="poll-duration-pills" role="radiogroup" aria-label="Poll expiration duration">
                {[
                  { id: '1m', label: '1 Min (Test)', title: '1 Minute · Instant Closing Test' },
                  { id: '1h', label: '1 Hour', title: '1 Hour · Quick Pulse' },
                  { id: '24h', label: '24 Hours', title: '24 Hours · 1 Day (Default)' },
                  { id: '3d', label: '3 Days', title: '3 Days · Weekend Poll' },
                  { id: '7d', label: '1 Week', title: '1 Week · Full Week Survey' },
                ].map((dur) => (
                  <button
                    key={dur.id}
                    type="button"
                    role="radio"
                    aria-checked={pollDuration === dur.id}
                    className={`poll-duration-pill${pollDuration === dur.id ? ' active' : ''}`}
                    onClick={() => {
                      setPollDuration(dur.id);
                      playSound('reaction');
                    }}
                    title={dur.title}
                  >
                    {dur.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="poll-setting-toggle-row">
              <label className="poll-toggle-label" title="Keep live results private from participants until they vote">
                <input
                  type="checkbox"
                  checked={revealResultsAfterVoting}
                  onChange={(e) => {
                    setRevealResultsAfterVoting(e.target.checked);
                    playSound('reaction');
                  }}
                  className="poll-toggle-checkbox"
                />
                <div className="poll-toggle-text">
                  <div className="poll-toggle-heading">
                    <EyeOff size={13} className="text-teal-400" />
                    <strong>Reveal results only after voting</strong>
                  </div>
                  <small>Keeps live percentages and vote counts private until each member participates</small>
                </div>
              </label>
            </div>
          </div>

          {/* Dynamic Real-Time Poll Card Preview */}
          <div className="compose-poll-preview-wrapper" aria-label="Dynamic Poll Card Preview">
            <div className="poll-preview-top-bar">
              <div className="poll-preview-indicator">
                <span className="poll-preview-live-dot" />
                <span className="poll-preview-title">Dynamic Poll Card Preview</span>
                <span className="poll-preview-badge">Live Feed Look</span>
                <span className="poll-preview-duration-badge" title="Selected poll expiration">
                  <Clock size={10} />
                  <span>Closes in {pollDuration === '1m' ? '1 minute' : pollDuration === '1h' ? '1 hour' : pollDuration === '24h' ? '24 hours' : pollDuration === '3d' ? '3 days' : '1 week'}</span>
                </span>
              </div>
              <div className="poll-preview-controls">
                {previewTestVote !== null && (
                  <button
                    type="button"
                    className="poll-preview-control-btn reset"
                    onClick={() => {
                      setPreviewTestVote(null);
                      playSound('reaction');
                    }}
                    title="Clear test vote"
                  >
                    <RefreshCw size={11} />
                    <span>Reset Vote</span>
                  </button>
                )}
                <button
                  type="button"
                  className={`poll-preview-control-btn${previewSimulateResults ? ' active' : ''}`}
                  onClick={() => {
                    setPreviewSimulateResults((v) => !v);
                    playSound('reaction');
                  }}
                  title="Toggle percentage bars simulation"
                >
                  <BarChart3 size={11} />
                  <span>{previewSimulateResults ? 'Results Active' : 'Simulate Results'}</span>
                </button>
              </div>
            </div>

            <div className="poll-preview-card-frame">
              {/* Simulated Feed Post Header */}
              <div className="post-header">
                <Avatar
                  name={currentIdentityName}
                  src={currentIdentityAvatar}
                  className="avatar-sm"
                />
                <div className="post-header-text">
                  <div className="post-header-top">
                    <span className="author-name">{currentIdentityName}</span>
                    {cat && (
                      <span
                        className="cat-pill"
                        style={{
                          '--cat-accent': cat.accent,
                          '--cat-soft': cat.soft,
                          '--cat-text': cat.text,
                        }}
                      >
                        {cat.label}
                      </span>
                    )}
                    <span className="post-vis-badge">
                      <CurrentVisIcon size={11} />
                      <span>{VISIBILITY_OPTIONS.find((v) => v.id === visibility)?.label || 'Public'}</span>
                    </span>
                  </div>
                  <div className="post-header-meta">
                    <span className="post-author-role">
                      {postIdentity === 'anonymous'
                        ? 'Posting Anonymously 🕵️'
                        : postIdentity === 'pseudo'
                          ? 'Pseudonym Protected 🎲'
                          : profile?.role === 'platform_admin'
                            ? 'Platform Administrator'
                            : profile?.role === 'church_admin'
                              ? 'Church Administrator'
                              : 'Community Member'}
                    </span>
                    <span className="post-dot">·</span>
                    <span className="post-time-ago">Just now · Live Feed Preview</span>
                  </div>
                </div>
              </div>

              {/* Poll Question Content */}
              <div className="post-text-container">
                {composeText.trim() ? (
                  <p className="post-text poll-preview-question">{composeText}</p>
                ) : (
                  <p className="post-text poll-preview-question placeholder">
                    Ask your question in the text box above (e.g. &ldquo;Which scripture gives you peace during difficult trials?&rdquo;)…
                  </p>
                )}
              </div>

              {/* Dynamic Poll Options Render */}
              {pollOptions.some((o) => o.preview || o.file) ? (
                /* Grid View for Image Polls */
                <div className="poll">
                  <div className="poll-grid">
                    {pollOptions.map((opt, idx) => {
                      const isSelected = previewTestVote === idx;
                      const canSeeResults = !revealResultsAfterVoting || previewTestVote !== null || previewSimulateResults;
                      const isShownVoted = canSeeResults && (previewTestVote !== null || previewSimulateResults);
                      const totalOpts = pollOptions.length || 1;
                      const pct = isShownVoted
                        ? (previewTestVote === idx
                            ? (previewSimulateResults ? Math.round(100 / totalOpts + 20) : 100)
                            : (previewSimulateResults ? Math.max(5, Math.round(80 / (totalOpts - 1))) : 0))
                        : 0;

                      return (
                        <button
                          key={idx}
                          type="button"
                          className={`poll-image-card${isSelected ? ' mine' : ''}`}
                          onClick={() => {
                            setPreviewTestVote((prev) => (prev === idx ? null : idx));
                            playSound('reaction');
                          }}
                          title={`Click to test vote for: ${opt.label || `Option ${idx + 1}`}`}
                        >
                          {opt.preview ? (
                            <img src={opt.preview} alt={opt.label || `Option ${idx + 1}`} />
                          ) : (
                            <div className="poll-image-placeholder">
                              <ImageIcon size={22} className="opacity-40" />
                              <span>No image attached</span>
                            </div>
                          )}
                          <span className="poll-image-meta">
                            <span className="poll-img-label-text">
                              {opt.label.trim() ? opt.label : <span className="opacity-60">Option {idx + 1}</span>}
                              {isSelected && ' ✓'}
                            </span>
                            {isShownVoted && <span className="poll-img-pct">{pct}%</span>}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="poll-preview-meta-row">
                    <p className="poll-meta">
                      <span>{previewTestVote !== null || previewSimulateResults ? '1 vote recorded' : '0 votes recorded'} · anonymous poll</span>
                      <span className="poll-meta-duration-pill">⏱️ Closes in {pollDuration === '1h' ? '1 hour' : pollDuration === '24h' ? '24 hours' : pollDuration === '3d' ? '3 days' : '1 week'}</span>
                    </p>
                    <span className="poll-test-hint">
                      {revealResultsAfterVoting && previewTestVote === null && !previewSimulateResults
                        ? '🔒 Results hidden until you vote (Click option to test)'
                        : previewTestVote !== null
                          ? '✓ Results revealed after voting'
                          : 'Tap any card to test vote'}
                    </span>
                  </div>
                </div>
              ) : (
                /* List View for Text Polls */
                <div className="poll">
                  {pollOptions.map((opt, idx) => {
                    const isSelected = previewTestVote === idx;
                    const canSeeResults = !revealResultsAfterVoting || previewTestVote !== null || previewSimulateResults;
                    const isShownVoted = canSeeResults && (previewTestVote !== null || previewSimulateResults);
                    const totalOpts = pollOptions.length || 1;
                    const pct = isShownVoted
                      ? (previewTestVote === idx
                          ? (previewSimulateResults ? Math.round(100 / totalOpts + 25) : 100)
                          : (previewSimulateResults ? Math.max(5, Math.round(75 / Math.max(1, totalOpts - 1))) : 0))
                      : 0;

                    return (
                      <button
                        key={idx}
                        type="button"
                        className={`poll-option${isSelected ? ' mine' : ''}${
                          isQuizMode && previewTestVote !== null
                            ? idx === correctOptionIdx
                              ? ' is-quiz-correct'
                              : isSelected
                                ? ' is-quiz-wrong'
                                : ''
                            : ''
                        }`}
                        onClick={() => {
                          setPreviewTestVote((prev) => (prev === idx ? null : idx));
                          if (isQuizMode) {
                            if (idx === correctOptionIdx) {
                              playSound('badge');
                            } else {
                              playSound('reaction');
                            }
                          } else {
                            playSound('reaction');
                          }
                        }}
                        title={`Click to test vote for: ${opt.label || `Option ${idx + 1}`}`}
                      >
                        {isShownVoted && (
                          <span
                            className="poll-bar"
                            style={{
                              width: `${pct}%`,
                              ...(cat ? { background: `color-mix(in srgb, ${cat.accent} 22%, transparent)` } : {})
                            }}
                          />
                        )}
                        <span className="poll-label">
                          <span className={`poll-radio-indicator${isSelected ? ' checked' : ''}`}>
                            {isSelected ? <Check size={11} /> : idx + 1}
                          </span>
                          <span className="poll-label-text">
                            {opt.label.trim() ? (
                              opt.label
                            ) : (
                              <span className="poll-opt-placeholder-text">Option {idx + 1} (typing…)</span>
                            )}
                          </span>
                          {isQuizMode && previewTestVote !== null && idx === correctOptionIdx && (
                            <span className="quiz-correct-tag">⭐ Correct Answer</span>
                          )}
                          {isQuizMode && previewTestVote !== null && isSelected && idx !== correctOptionIdx && (
                            <span className="quiz-wrong-tag">❌ Your Pick</span>
                          )}
                          {!isQuizMode && isSelected && <span className="poll-voted-tag">Your Vote ✓</span>}
                        </span>
                        {isShownVoted && <span className="poll-pct">{pct}%</span>}
                      </button>
                    );
                  })}

                  {/* Instant Quiz Scoring & Explanation Feedback Banner */}
                  {isQuizMode && previewTestVote !== null && (
                    <div className={`poll-quiz-feedback-card ${previewTestVote === correctOptionIdx ? 'correct' : 'incorrect'}`}>
                      <div className="quiz-feedback-header">
                        {previewTestVote === correctOptionIdx ? (
                          <>
                            <span className="quiz-feedback-badge pass">Score: 100/100 · Correct! 🏆</span>
                            <span className="quiz-feedback-msg">Praise God, you selected the right scripture answer!</span>
                          </>
                        ) : (
                          <>
                            <span className="quiz-feedback-badge fail">Score: 0/100 · Keep Studying! ✍️</span>
                            <span className="quiz-feedback-msg">
                              Not quite! The correct answer was <strong>Option {correctOptionIdx + 1}: {pollOptions[correctOptionIdx]?.label || `Option ${correctOptionIdx + 1}`}</strong>
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
                  <div className="poll-preview-meta-row">
                    <p className="poll-meta">
                      <span>{previewTestVote !== null || previewSimulateResults ? '1 vote recorded' : '0 votes recorded'} · anonymous poll</span>
                      <span className="poll-meta-duration-pill">⏱️ Closes in {pollDuration === '1h' ? '1 hour' : pollDuration === '24h' ? '24 hours' : pollDuration === '3d' ? '3 days' : '1 week'}</span>
                    </p>
                    <span className="poll-test-hint">
                      {revealResultsAfterVoting && previewTestVote === null && !previewSimulateResults
                        ? '🔒 Results hidden until you vote (Click option to test)'
                        : previewTestVote !== null
                          ? '✓ Results revealed after voting'
                          : 'Tap an option to test interaction'}
                    </span>
                  </div>
                </div>
              )}

              {/* Feed Card Actions Mockup */}
              <div className="post-actions-preview">
                <div className="post-action-preview-pill">
                  <Heart size={12} className="text-rose-400" />
                  <span>Amen · 0</span>
                </div>
                <div className="post-action-preview-pill">
                  <MessageCircle size={12} />
                  <span>Comment · 0</span>
                </div>
                <div className="post-action-preview-pill">
                  <Share2 size={12} />
                  <span>Share</span>
                </div>
                <div className="post-action-preview-pill">
                  <Tv size={12} />
                  <span>Sanctuary Screen</span>
                </div>
              </div>
            </div>

            {/* Validation & Posting Readiness Guidance */}
            <div className="poll-preview-guidance">
              <div className="poll-preview-guidance-left">
                <Sparkles size={13} className="text-amber-400" />
                <span>
                  {pollOptions.filter((o) => o.label.trim() || o.file).length < 2 ? (
                    <strong className="text-amber-500">
                      Add at least {2 - pollOptions.filter((o) => o.label.trim() || o.file).length} more option{2 - pollOptions.filter((o) => o.label.trim() || o.file).length > 1 ? 's' : ''} to publish.
                    </strong>
                  ) : (
                    <strong className="text-emerald-500">
                      Ready to post! Members can vote anonymously once shared.
                    </strong>
                  )}
                </span>
              </div>
              <span className="poll-preview-count-pill">
                {pollOptions.filter((o) => o.label.trim() || o.file).length} valid / {pollOptions.length} total options
              </span>
            </div>
          </div>
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
        <div className="compose-tools-group" role="group" aria-label="Attachments and options">
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
            aria-pressed={isPoll}
          >
            <BarChart3 size={18} className="tool-icon tool-poll" />
            <span className="tool-label">Poll</span>
          </button>

          {/* AI Scripture & Polish Tool Button */}
          <button
            type="button"
            className={`tool-btn ai-tool-btn${aiEnhancing ? ' enhancing' : ''}${!composeText.trim() ? ' opacity-50 cursor-not-allowed' : ''}`}
            onClick={handleAiEnhance}
            disabled={aiEnhancing || !composeText.trim()}
            title={
              !composeText.trim()
                ? 'Type your message above to polish with Shammah AI'
                : 'Polish spelling, grammar & sentence flow with Shammah AI'
            }
            aria-label="AI Polish"
          >
            {aiEnhancing ? (
              <RefreshCw size={18} className="tool-icon tool-ai animate-spin" />
            ) : (
              <Bot size={18} className="tool-icon tool-ai" />
            )}
            <span className="tool-label">{aiEnhancing ? 'Refining…' : 'AI Polish'}</span>
          </button>

          {/* 30-Day Offline Download Option for Author */}
          <button
            type="button"
            className={`tool-btn${allowOfflineDownload ? ' active' : ''}`}
            onClick={() => {
              setAllowOfflineDownload((v) => !v);
              playSound('reaction');
            }}
            title={allowOfflineDownload ? '30-Day Offline Enabled (Tap to disable)' : 'Allow 30-Day Offline Download'}
            aria-label="30-day offline download"
            aria-pressed={allowOfflineDownload}
          >
            <DownloadCloud size={18} className="tool-icon tool-offline" />
            <span className="tool-label">Offline</span>
          </button>
        </div>

        {/* Post CTA */}
        <div className="compose-cta-group">
          <button
            type="submit"
            className={`compose-submit-btn${!composeCategory ? ' needs-category' : ''}`}
            disabled={isFormDisabled}
            title={!composeCategory ? 'Select a category above before posting' : 'Publish post'}
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
