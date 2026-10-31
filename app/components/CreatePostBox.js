'use client';
import { useState, useRef, useEffect } from 'react';
import {
  Image as ImageIcon,
  Video as VideoIcon,
  Mic as MicIcon,
  Camera,
  Film,
  FileAudio,
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
  MapPin,
  Smile,
  UserCheck,
} from 'lucide-react';
import PopupSheet from './PopupSheet';
import Avatar from './Avatar';
import MemberName from './MemberName';
import LocationPicker from './LocationPicker';
import PollBuilderFields, { MAX_POLL_OPTIONS } from './PollBuilderFields';
import MediaToolbar from './media/MediaToolbar';
import MediaPreviewFrame from './media/MediaPreviewFrame';
import CameraCaptureModal from './media/CameraCaptureModal';
import VoiceRecorderBar from './media/VoiceRecorderBar';
import GifPicker from './media/GifPicker';
import ReelCreatorModal from './ReelCreatorModal';
import LiveHostModal from './LiveHostModal';
import LiveNotConfiguredSheet from './LiveNotConfiguredSheet';
import { checkLiveConfig } from '../lib/live/liveApi';
import { CATEGORY_STYLES, categoryStyle, initials } from '../lib/postDisplay';
import { VISIBILITY_OPTIONS } from '../lib/postInteractions';
import { playSound } from '../lib/soundEffects';
import { generatePseudoIdentity, ANONYMOUS_IDENTITY } from '../lib/anonymousManager';
import { startAudioRecording, isAudioRecordingSupported } from '../lib/voiceRecorder';
import {
  FEELINGS_LIST,
  formatFeelingString,
  fetchEligibleTagMembers,
} from '../lib/mentions';

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

  // Location, Feeling & Member Tagging state
  const [location, setLocation] = useState(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [feeling, setFeeling] = useState(null);
  const [customFeelingText, setCustomFeelingText] = useState('');
  const [showFeelingModal, setShowFeelingModal] = useState(false);
  const [taggedUsers, setTaggedUsers] = useState([]);
  const [showTagModal, setShowTagModal] = useState(false);
  const [eligibleMembers, setEligibleMembers] = useState([]);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [tagSearch, setTagSearch] = useState('');

  // Universal Media Toolbar modal states
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showGifModal, setShowGifModal] = useState(false);
  const [showReelModal, setShowReelModal] = useState(false);
  const [showLiveHostModal, setShowLiveHostModal] = useState(false);
  const [showLiveUnconfiguredSheet, setShowLiveUnconfiguredSheet] = useState(false);

  async function handleLiveButtonClick() {
    if (!session?.user) {
      if (openAuth) openAuth('signin');
      else window.dispatchEvent(new CustomEvent('shammah:open-auth', { detail: 'signin' }));
      return;
    }
    try {
      const config = await checkLiveConfig();
      if (!config.configured) {
        setShowLiveUnconfiguredSheet(true);
      } else {
        setShowLiveHostModal(true);
      }
    } catch {
      setShowLiveUnconfiguredSheet(true);
    }
  }

  async function loadEligibleMembers() {
    if (!session?.user?.id) return;
    setLoadingEligible(true);
    try {
      const list = await fetchEligibleTagMembers(session.user.id);
      setEligibleMembers(list);
    } catch (err) {
      console.error('Failed to load eligible members for tagging:', err);
    } finally {
      setLoadingEligible(false);
    }
  }

  const filteredEligibleMembers = eligibleMembers.filter((m) =>
    (m.display_name || '').toLowerCase().includes(tagSearch.toLowerCase().trim())
  );

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
  const cameraPhotoInputRef = useRef(null);
  const cameraVideoInputRef = useRef(null);
  const cameraAudioInputRef = useRef(null);
  const voiceRecorderRef = useRef(null);
  const categoryTriggerRef = useRef(null);
  const visMenuRef = useRef(null);
  const identityMenuRef = useRef(null);

  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceSeconds, setVoiceSeconds] = useState(0);

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

  function handleFileSelected(file) {
    if (!file) return;
    setMediaFile(file);
    if (mediaPreview?.url?.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(mediaPreview.url);
      } catch (_) {}
    }
    const url = URL.createObjectURL(file);
    const mime = file.type || '';
    const name = file.name || '';
    const isVid = mime.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(name);
    const isAud = mime.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac)$/i.test(name);
    setMediaPreview({
      url,
      type: isVid ? 'video' : isAud ? 'audio' : 'image',
      file,
      name: file.name,
    });
  }

  function handleRemoveMedia() {
    if (mediaPreview?.url?.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(mediaPreview.url);
      } catch (_) {}
    }
    setMediaFile(null);
    setMediaPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
    if (audioInputRef.current) audioInputRef.current.value = '';
    if (cameraPhotoInputRef.current) cameraPhotoInputRef.current.value = '';
    if (cameraVideoInputRef.current) cameraVideoInputRef.current.value = '';
    if (cameraAudioInputRef.current) cameraAudioInputRef.current.value = '';
  }

  async function handleStartVoiceNote() {
    if (!isAudioRecordingSupported()) {
      cameraAudioInputRef.current?.click();
      return;
    }
    try {
      setVoiceSeconds(0);
      setIsRecordingVoice(true);
      const recorder = await startAudioRecording({
        maxSeconds: 120,
        onTimeTick: (sec) => setVoiceSeconds(sec),
      });
      voiceRecorderRef.current = recorder;
    } catch (err) {
      console.warn('Voice record init failed:', err);
      setIsRecordingVoice(false);
      cameraAudioInputRef.current?.click();
    }
  }

  async function handleStopVoiceNote() {
    if (!voiceRecorderRef.current) return;
    try {
      const res = await voiceRecorderRef.current.stop();
      setIsRecordingVoice(false);
      voiceRecorderRef.current = null;
      if (res?.file) {
        handleFileSelected(res.file);
      }
    } catch (err) {
      console.error('Error stopping voice note:', err);
      setIsRecordingVoice(false);
    }
  }

  function handleCancelVoiceNote() {
    if (voiceRecorderRef.current) {
      voiceRecorderRef.current.cancel();
      voiceRecorderRef.current = null;
    }
    setIsRecordingVoice(false);
    setVoiceSeconds(0);
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
      location,
      feeling: feeling ? formatFeelingString(feeling) : null,
      taggedUsers,
    });
    // Reset selected metadata
    setLocation(null);
    setFeeling(null);
    setCustomFeelingText('');
    setTaggedUsers([]);
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

        {/* Category Selector Modal using canonical PopupSheet */}
        <PopupSheet
          open={showCategoryMenu}
          onClose={() => setShowCategoryMenu(false)}
          size="md"
          title={
            <div className="category-popover-title">
              <Tag size={16} className="cat-popover-icon" />
              <span>Select a category</span>
            </div>
          }
          footer={
            <div className="category-popover-footer" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
              <span>Select a category so community members can easily discover and pray over your post.</span>
            </div>
          }
        >
          {/* Instant search input */}
          <div className="category-search-box" style={{ marginBottom: 12 }}>
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

          <div className="category-popover-grid no-scrollbar" style={{ maxHeight: 'none', paddingRight: 0 }}>
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
        </PopupSheet>
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

        {/* Selected Location, Feeling & Tagged Members metadata chips */}
        {(location || feeling || taggedUsers.length > 0) && (
          <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-white/10">
            {feeling && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-amber-500/30 bg-amber-500/10 text-amber-300">
                <span>feeling {formatFeelingString(feeling)}</span>
                <button
                  type="button"
                  className="p-0.5 hover:text-white transition-colors"
                  onClick={() => setFeeling(null)}
                  title="Remove feeling"
                  aria-label="Remove feeling"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {location && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-rose-500/30 bg-rose-500/10 text-rose-300">
                <MapPin size={12} className="text-rose-400" />
                <span>{location.label}</span>
                <button
                  type="button"
                  className="p-0.5 hover:text-white transition-colors"
                  onClick={() => setLocation(null)}
                  title="Remove location"
                  aria-label="Remove location"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {taggedUsers.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-teal-500/30 bg-teal-500/10 text-teal-300">
                <Tag size={12} className="text-teal-400" />
                <span>
                  with {taggedUsers[0].display_name}
                  {taggedUsers.length > 1 ? ` +${taggedUsers.length - 1}` : ''}
                </span>
                <button
                  type="button"
                  className="p-0.5 hover:text-white transition-colors"
                  onClick={() => setTaggedUsers([])}
                  title="Remove tagged members"
                  aria-label="Remove tags"
                >
                  <X size={12} />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Media Preview Frame with Contain & Blurred Letterbox */}
      {mediaPreview && (
        <MediaPreviewFrame
          mode="composer"
          media={mediaPreview}
          onRemove={handleRemoveMedia}
        />
      )}

      {/* Poll Creation Builder (shared single source of truth) */}
      {isPoll && (
        <PollBuilderFields
          questionText={composeText}
          pollOptions={pollOptions}
          setPollOptions={setPollOptions}
          isQuizMode={isQuizMode}
          setIsQuizMode={setIsQuizMode}
          correctOptionIdx={correctOptionIdx}
          setCorrectOptionIdx={setCorrectOptionIdx}
          quizExplanation={quizExplanation}
          setQuizExplanation={setQuizExplanation}
          pollDuration={pollDuration}
          setPollDuration={setPollDuration}
          revealResultsAfterVoting={revealResultsAfterVoting}
          setRevealResultsAfterVoting={setRevealResultsAfterVoting}
          composeCategory={composeCategory}
          visibility={visibility}
          currentIdentityName={currentIdentityName}
          currentIdentityAvatar={currentIdentityAvatar}
          authorRoleLabel={
            postIdentity === 'anonymous'
              ? 'Posting Anonymously 🕵️'
              : postIdentity === 'pseudo'
                ? 'Pseudonym Protected 🎲'
                : profile?.role === 'platform_admin'
                  ? 'Platform Administrator'
                  : profile?.role === 'church_admin'
                    ? 'Church Administrator'
                    : 'Community Member'
          }
          showExtendedSettings={false}
        />
      )}

      {/* Hidden File Inputs */}
      {/* Hidden File Picker Inputs */}
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

      {/* Hidden Live Camera & Microphone Fallback Inputs */}
      <input
        ref={cameraPhotoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          handleFileSelected(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <input
        ref={cameraVideoInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        hidden
        onChange={(e) => {
          handleFileSelected(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <input
        ref={cameraAudioInputRef}
        type="file"
        accept="audio/*"
        capture
        hidden
        onChange={(e) => {
          handleFileSelected(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      {/* Active Live Voice Recording Status Bar */}
      {isRecordingVoice && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderRadius: 12,
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            marginBottom: 10,
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#ef4444',
                display: 'inline-block',
                animation: 'pulse 1s infinite',
              }}
            />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#fca5a5' }}>
              Recording Voice Note: {Math.floor(voiceSeconds / 60)}:{String(voiceSeconds % 60).padStart(2, '0')}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              onClick={handleCancelVoiceNote}
              style={{
                padding: '4px 10px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: 'var(--ink)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleStopVoiceNote}
              style={{
                padding: '4px 12px',
                borderRadius: 8,
                background: 'var(--teal, #14b8a6)',
                border: 'none',
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Done &amp; Attach
            </button>
          </div>
        </div>
      )}

      {/* Bottom Action Bar with Universal MediaToolbar */}
      <div className="compose-bottom-toolbar">
        <MediaToolbar
          context="post"
          onPickFile={handleFileSelected}
          onCamera={() => setShowCameraModal(true)}
          onVoice={() => setShowVoiceModal(true)}
          onGif={() => setShowGifModal(true)}
          onReel={() => setShowReelModal(true)}
          onLive={handleLiveButtonClick}
          disabled={posting || mediaUploading || pollUploading}
          extraActions={
            <>
              {/* Poll Builder Button */}
              <button
                type="button"
                className={`media-tool-btn tool-poll${isPoll ? ' active' : ''}`}
                onClick={() => setIsPoll((v) => !v)}
                title="Create a community poll"
                aria-label="Toggle poll"
                aria-pressed={isPoll}
              >
                <span className="media-tool-icon-wrap icon-accent-amber">
                  <BarChart3 size={19} strokeWidth={2.2} />
                </span>
                <span className="media-tool-label">Poll</span>
              </button>

              {/* AI Scripture & Polish Tool Button */}
              <button
                type="button"
                className={`media-tool-btn ai-tool-btn${aiEnhancing ? ' enhancing' : ''}${!composeText.trim() ? ' opacity-50 cursor-not-allowed' : ''}`}
                onClick={handleAiEnhance}
                disabled={aiEnhancing || !composeText.trim()}
                title={
                  !composeText.trim()
                    ? 'Type your message above to polish with Shammah AI'
                    : 'Polish spelling, grammar & sentence flow with Shammah AI'
                }
                aria-label="AI Polish"
              >
                <span className="media-tool-icon-wrap icon-accent-cyan">
                  {aiEnhancing ? (
                    <RefreshCw size={19} className="animate-spin" />
                  ) : (
                    <Bot size={19} strokeWidth={2.2} />
                  )}
                </span>
                <span className="media-tool-label">{aiEnhancing ? 'Refining…' : 'AI Polish'}</span>
              </button>

              {/* Location Picker */}
              <button
                type="button"
                className={`media-tool-btn${location ? ' active' : ''}`}
                onClick={() => setShowLocationModal(true)}
                title={location ? `Location: ${location.label}` : 'Add church or city location'}
                aria-label="Add location"
              >
                <span className="media-tool-icon-wrap icon-accent-rose">
                  <MapPin size={19} strokeWidth={2.2} />
                </span>
                <span className="media-tool-label">{location ? 'Located' : 'Location'}</span>
              </button>

              {/* Feeling / Mood */}
              <button
                type="button"
                className={`media-tool-btn${feeling ? ' active' : ''}`}
                onClick={() => setShowFeelingModal(true)}
                title={feeling ? `Feeling: ${formatFeelingString(feeling)}` : 'Add feeling or devotion mood'}
                aria-label="Add feeling"
              >
                <span className="media-tool-icon-wrap icon-accent-amber">
                  <Smile size={19} strokeWidth={2.2} />
                </span>
                <span className="media-tool-label">Feeling</span>
              </button>

              {/* Tag People */}
              <button
                type="button"
                className={`media-tool-btn${taggedUsers.length > 0 ? ' active' : ''}`}
                onClick={() => {
                  setShowTagModal(true);
                  loadEligibleMembers();
                }}
                title={taggedUsers.length > 0 ? `${taggedUsers.length} members tagged` : 'Tag fellow members'}
                aria-label="Tag members"
              >
                <span className="media-tool-icon-wrap icon-accent-emerald">
                  <Tag size={19} strokeWidth={2.2} />
                </span>
                <span className="media-tool-label">{taggedUsers.length > 0 ? `${taggedUsers.length} Tagged` : 'Tag'}</span>
              </button>

              {/* 30-Day Offline Download Option for Author */}
              <button
                type="button"
                className={`media-tool-btn${allowOfflineDownload ? ' active' : ''}`}
                onClick={() => {
                  setAllowOfflineDownload((v) => !v);
                  playSound('reaction');
                }}
                title={allowOfflineDownload ? '30-Day Offline Enabled (Tap to disable)' : 'Allow 30-Day Offline Download'}
                aria-label="30-day offline download"
                aria-pressed={allowOfflineDownload}
              >
                <span className="media-tool-icon-wrap icon-accent-indigo">
                  <DownloadCloud size={19} strokeWidth={2.2} />
                </span>
                <span className="media-tool-label">Offline</span>
              </button>
            </>
          }
        />

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

      {/* Location Picker Modal using canonical PopupSheet */}
      <PopupSheet
        open={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        title={
          <div className="visibility-modal-title">
            <MapPin size={18} className="text-rose-400" />
            <span>Add Location</span>
          </div>
        }
        size="sm"
      >
        <div style={{ padding: '4px 0 16px' }}>
          <p className="visibility-desc" style={{ marginBottom: 14 }}>
            Share where you are fellowshipping, praying, or gathering with your church community.
          </p>
          <LocationPicker
            value={location}
            onChange={(loc) => {
              setLocation(loc);
              if (loc) {
                playSound('reaction');
              }
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
            {location && (
              <button
                type="button"
                className="st-btn st-btn-ghost"
                style={{ fontSize: 13, padding: '6px 14px' }}
                onClick={() => {
                  setLocation(null);
                  setShowLocationModal(false);
                }}
              >
                Remove
              </button>
            )}
            <button
              type="button"
              className="st-btn st-btn-primary"
              style={{ fontSize: 13, padding: '6px 18px' }}
              onClick={() => setShowLocationModal(false)}
            >
              Done
            </button>
          </div>
        </div>
      </PopupSheet>

      {/* Feeling Selector Modal using canonical PopupSheet */}
      <PopupSheet
        open={showFeelingModal}
        onClose={() => setShowFeelingModal(false)}
        title={
          <div className="visibility-modal-title">
            <Smile size={18} className="text-amber-400" />
            <span>How are you feeling?</span>
          </div>
        }
        size="md"
      >
        <div style={{ padding: '4px 0 16px' }}>
          <p className="visibility-desc" style={{ marginBottom: 14 }}>
            Express your spiritual mood, praise, or devotional reflection with the church.
          </p>

          {/* Curated Feelings Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
              gap: 8,
              maxHeight: '260px',
              overflowY: 'auto',
              marginBottom: 16,
              paddingRight: 4,
            }}
          >
            {FEELINGS_LIST.map((f) => {
              const isSelected = feeling?.id === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  className={`st-btn ${isSelected ? 'st-btn-primary' : 'st-btn-ghost'}`}
                  style={{
                    fontSize: 13,
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    borderRadius: 12,
                  }}
                  onClick={() => {
                    if (isSelected) {
                      setFeeling(null);
                    } else {
                      setFeeling(f);
                      setCustomFeelingText('');
                      playSound('reaction');
                    }
                  }}
                >
                  <span style={{ fontSize: 16 }}>{f.emoji}</span>
                  <span>{f.label}</span>
                </button>
              );
            })}
          </div>

          {/* Custom feeling / mood input */}
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 12, color: 'var(--ink-muted)', display: 'block', marginBottom: 6 }}>
              Or write a custom feeling:
            </label>
            <input
              type="text"
              className="st-input"
              placeholder="e.g. Resting in God's Grace 🕊️"
              value={customFeelingText}
              maxLength={50}
              onChange={(e) => {
                setCustomFeelingText(e.target.value);
                if (e.target.value.trim()) {
                  setFeeling({ label: e.target.value.trim(), emoji: '' });
                } else {
                  setFeeling(null);
                }
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
            {feeling && (
              <button
                type="button"
                className="st-btn st-btn-ghost"
                style={{ fontSize: 13, padding: '6px 14px' }}
                onClick={() => {
                  setFeeling(null);
                  setCustomFeelingText('');
                  setShowFeelingModal(false);
                }}
              >
                Clear
              </button>
            )}
            <button
              type="button"
              className="st-btn st-btn-primary"
              style={{ fontSize: 13, padding: '6px 18px' }}
              onClick={() => setShowFeelingModal(false)}
            >
              Done
            </button>
          </div>
        </div>
      </PopupSheet>

      {/* Tag People Modal using canonical PopupSheet */}
      <PopupSheet
        open={showTagModal}
        onClose={() => setShowTagModal(false)}
        title={
          <div className="visibility-modal-title">
            <Tag size={18} className="text-teal-400" />
            <span>Tag People</span>
          </div>
        }
        size="md"
      >
        <div style={{ padding: '4px 0 16px' }}>
          <p className="visibility-desc" style={{ marginBottom: 12 }}>
            Tag believers you follow or who follow you. Tagged members will be mentioned on your post.
          </p>

          {/* Search Box */}
          <div className="category-search-box" style={{ marginBottom: 12 }}>
            <Search size={15} className="category-search-icon" />
            <input
              type="text"
              placeholder="Search followers & following…"
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
              className="category-search-input"
            />
            {tagSearch && (
              <button
                type="button"
                className="category-search-clear"
                onClick={() => setTagSearch('')}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Member List */}
          <div
            style={{
              maxHeight: '300px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              paddingRight: 4,
            }}
          >
            {loadingEligible ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink-muted)', fontSize: 13 }}>
                Loading your connections…
              </div>
            ) : filteredEligibleMembers.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink-muted)', fontSize: 13 }}>
                {tagSearch ? 'No matching members found.' : 'You have no connections to tag yet. Follow members in the community first!'}
              </div>
            ) : (
              filteredEligibleMembers.map((m) => {
                const isSelected = taggedUsers.some((u) => u.id === m.id);
                const isBlocked = !m.allowed;

                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={isBlocked}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: 12,
                      background: isSelected ? 'rgba(6, 182, 212, 0.12)' : 'var(--surface-sunken)',
                      border: isSelected ? '1px solid var(--teal)' : '1px solid var(--border)',
                      cursor: isBlocked ? 'not-allowed' : 'pointer',
                      opacity: isBlocked ? 0.5 : 1,
                      textAlign: 'left',
                    }}
                    onClick={() => {
                      if (isBlocked) return;
                      playSound('reaction');
                      if (isSelected) {
                        setTaggedUsers((prev) => prev.filter((u) => u.id !== m.id));
                      } else {
                        setTaggedUsers((prev) => [...prev, m]);
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={m.display_name} src={m.avatar_url} size={32} />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <strong style={{ fontSize: 13, color: 'var(--ink)' }}>{m.display_name}</strong>
                          {m.badge_verified && <span style={{ color: '#06b6d4', fontSize: 11 }}>✓</span>}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>
                          {isBlocked ? (
                            <span style={{ color: '#ef4444' }}>{m.reason}</span>
                          ) : m.requiresReview ? (
                            <span style={{ color: '#f59e0b' }}>Requires review before appearing</span>
                          ) : (
                            <span>Direct tag</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      {isSelected ? (
                        <span style={{ color: 'var(--teal)', fontWeight: 700, fontSize: 16 }}>✓</span>
                      ) : !isBlocked ? (
                        <span style={{ color: 'var(--ink-muted)', fontSize: 14 }}>+</span>
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
              {taggedUsers.length} member{taggedUsers.length === 1 ? '' : 's'} selected
            </span>
            <button
              type="button"
              className="st-btn st-btn-primary"
              style={{ fontSize: 13, padding: '6px 18px' }}
              onClick={() => setShowTagModal(false)}
            >
              Done
            </button>
          </div>
        </div>
      </PopupSheet>

      {/* Camera Capture Modal */}
      {showCameraModal && (
        <CameraCaptureModal
          mode="both"
          onCapture={(file) => {
            handleFileSelected(file);
            setShowCameraModal(false);
          }}
          onClose={() => setShowCameraModal(false)}
        />
      )}

      {/* Voice Recorder Bar Modal */}
      <PopupSheet
        open={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        title="Record Voice Note or Prayer"
        size="sm"
      >
        <div style={{ padding: '8px 0 16px' }}>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--ink-muted)' }}>
            Speak from your heart. Spoken prayers and voice testimonies can be up to 5 minutes long.
          </p>
          <VoiceRecorderBar
            maxSeconds={300}
            autoStart={true}
            onDone={({ file, duration, previewUrl }) => {
              handleFileSelected(file);
              setShowVoiceModal(false);
            }}
            onCancel={() => setShowVoiceModal(false)}
          />
        </div>
      </PopupSheet>

      {/* Animated GIF Picker Modal */}
      {showGifModal && (
        <GifPicker
          onSelect={(gif) => {
            setMediaFile(null);
            setMediaPreview({
              url: gif.url,
              type: 'gif',
              meta: gif.media_meta,
              name: gif.media_meta?.title || 'Christian GIF',
            });
            setShowGifModal(false);
          }}
          onClose={() => setShowGifModal(false)}
          userId={session?.user?.id}
        />
      )}

      {/* Gospel Reel Creator Modal */}
      {showReelModal && (
        <ReelCreatorModal
          isOpen={showReelModal}
          onClose={() => setShowReelModal(false)}
          session={session}
          profile={profile}
          onCreated={() => {
            setShowReelModal(false);
          }}
        />
      )}

      {/* Live Host Broadcast Modal */}
      {showLiveHostModal && (
        <LiveHostModal
          isOpen={showLiveHostModal}
          onClose={() => setShowLiveHostModal(false)}
          session={session}
          profile={profile}
          onStreamCreated={(stream) => {
            setShowLiveHostModal(false);
          }}
        />
      )}

      {/* Friendly Unconfigured Live Sheet */}
      {showLiveUnconfiguredSheet && (
        <LiveNotConfiguredSheet
          isOpen={showLiveUnconfiguredSheet}
          onClose={() => setShowLiveUnconfiguredSheet(false)}
        />
      )}
    </form>
  );
}
