'use client';
import { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Check,
  ImagePlus,
  Video,
  Music,
  X,
  Loader2,
  AlertCircle,
  FileAudio,
  Globe,
  Users,
  UserCheck,
  Lock,
  Plus,
  Trash2,
  ChevronDown,
  Camera,
  Mic,
} from 'lucide-react';
import {
  createStatusUpdate,
  getDefaultStatusAudience,
  setDefaultStatusAudience,
  STATUS_AUDIENCE_OPTIONS,
} from '../lib/statusManager';
import { uploadPostMedia } from '../lib/mediaUpload';
import { startAudioRecording, isAudioRecordingSupported } from '../lib/voiceRecorder';
import { supabase } from '../../lib/supabaseClient';
import { cleanDisplayName } from '../lib/postDisplay';
import Avatar from './Avatar';
import PopupSheet from './PopupSheet';
import MediaToolbar from './media/MediaToolbar';
import MediaPreviewFrame from './media/MediaPreviewFrame';
import CameraCaptureModal from './media/CameraCaptureModal';
import VoiceRecorderBar from './media/VoiceRecorderBar';
import GifPicker from './media/GifPicker';

const BG_THEMES = [
  { id: 'emerald', label: 'Emerald Praise', style: 'linear-gradient(135deg, #065f46, #047857, #10b981)' },
  { id: 'sunset', label: 'Sunset Worship', style: 'linear-gradient(135deg, #831843, #be185d, #f59e0b)' },
  { id: 'royal', label: 'Royal Grace', style: 'linear-gradient(135deg, #1e1b4b, #3730a3, #6366f1)' },
  { id: 'midnight', label: 'Deep Devotion', style: 'linear-gradient(135deg, #090d16, #1e293b, #334155)' },
  { id: 'gold', label: 'Golden Word', style: 'linear-gradient(135deg, #78350f, #b45309, #f59e0b)' },
  { id: 'rose', label: 'Grace & Truth', style: 'linear-gradient(135deg, #881337, #e11d48, #fb7185)' },
];

const STATUS_MEDIA_LIMITS = {
  image: { maxBytes: 10 * 1024 * 1024, maxLabel: '10 MB', maxSeconds: null },
  video: { maxBytes: 50 * 1024 * 1024, maxLabel: '50 MB', maxSeconds: 60 },
  audio: { maxBytes: 5 * 1024 * 1024, maxLabel: '5 MB', maxSeconds: 60 },
};

function getMediaType(file) {
  if (!file) return null;
  if (file.type?.startsWith('image/')) return 'image';
  if (file.type?.startsWith('video/')) return 'video';
  if (file.type?.startsWith('audio/')) return 'audio';
  const name = (file.name || '').toLowerCase();
  if (/\.(jpg|jpeg|png|webp|gif|avif)$/.test(name)) return 'image';
  if (/\.(mp4|webm|mov|m4v)$/.test(name)) return 'video';
  if (/\.(mp3|wav|ogg|m4a|aac|flac)$/.test(name)) return 'audio';
  return null;
}

function checkMediaDuration(file, type) {
  return new Promise((resolve) => {
    if (type !== 'video' && type !== 'audio') {
      return resolve({ valid: true });
    }
    if (typeof window === 'undefined') return resolve({ valid: true });

    const url = URL.createObjectURL(file);
    const element = document.createElement(type);
    element.preload = 'metadata';

    element.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      const duration = element.duration;
      if (typeof duration === 'number' && duration > 60.5) {
        resolve({
          valid: false,
          error: `${type === 'video' ? 'Video' : 'Audio clip'} must be 60s or shorter. (Selected: ${Math.round(duration)}s)`,
        });
      } else {
        resolve({ valid: true, duration });
      }
    };

    element.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ valid: true });
    };

    element.src = url;
  });
}

function formatMediaTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function createEmptySlide() {
  return {
    id: `slide-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    file: null,
    previewUrl: '',
    mediaUrl: '',
    mediaType: null,
    fileName: '',
    caption: '',
    scriptureTag: '',
    bgStyle: 'emerald',
    isUploading: false,
    uploadError: '',
  };
}

export default function StatusCreatorModal({ currentUser, onClose, onCreated }) {
  // Audience setting (defaults from localStorage, persists on change)
  const [audience, setAudience] = useState('public');
  const [audienceSheetOpen, setAudienceSheetOpen] = useState(false);

  // Bulk Media & Slides State (WhatsApp style)
  const [slides, setSlides] = useState([createEmptySlide()]);
  const [activeIdx, setActiveIdx] = useState(0);

  const [globalError, setGlobalError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [publishProgress, setPublishProgress] = useState('');

  const fileInputRef = useRef(null);
  const cameraPhotoInputRef = useRef(null);
  const cameraVideoInputRef = useRef(null);
  const cameraAudioInputRef = useRef(null);

  // Live Voice Note Recording State
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const voiceRecorderRef = useRef(null);

  // Status Media Modals
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showGifModal, setShowGifModal] = useState(false);

  const displayName = cleanDisplayName(currentUser?.name || currentUser?.display_name || 'You', 'You');

  useEffect(() => {
    const saved = getDefaultStatusAudience();
    if (saved) setAudience(saved);
  }, []);

  function handleAudienceChange(selectedId) {
    setAudience(selectedId);
    setDefaultStatusAudience(selectedId);
    setAudienceSheetOpen(false);
  }

  const currentSlide = slides[activeIdx] || slides[0];

  function updateCurrentSlide(partial) {
    setSlides((prev) => {
      const next = [...prev];
      if (next[activeIdx]) {
        next[activeIdx] = { ...next[activeIdx], ...partial };
      }
      return next;
    });
  }

  // Common file processing for file picker, camera photo/video capture, and voice note recordings
  async function processFiles(files) {
    if (!files || files.length === 0) return;
    setGlobalError('');

    const newSlides = [];
    const authUid = currentUser?.id;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const detected = getMediaType(file);

      if (!detected) {
        setGlobalError(`Unsupported format for "${file.name}". Please select photos, videos, or audio.`);
        continue;
      }

      const limits = STATUS_MEDIA_LIMITS[detected];
      if (file.size > limits.maxBytes) {
        setGlobalError(`"${file.name}" is too large. Maximum size is ${limits.maxLabel}.`);
        continue;
      }

      const durCheck = await checkMediaDuration(file, detected);
      if (!durCheck.valid) {
        setGlobalError(durCheck.error);
        continue;
      }

      const localObjUrl = URL.createObjectURL(file);
      const slideId = `slide-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`;

      newSlides.push({
        id: slideId,
        file,
        previewUrl: localObjUrl,
        mediaUrl: localObjUrl, // fallback until cloud upload completes
        mediaType: detected,
        fileName: file.name,
        caption: '',
        scriptureTag: '',
        bgStyle: BG_THEMES[i % BG_THEMES.length].id,
        isUploading: true,
        uploadError: '',
      });
    }

    if (newSlides.length === 0) return;

    // If currently on an empty slide (no media and empty caption), replace it
    setSlides((prev) => {
      const isEmptyFirst =
        prev.length === 1 && !prev[0].file && !prev[0].previewUrl && !prev[0].caption.trim();
      return isEmptyFirst ? newSlides : [...prev, ...newSlides];
    });

    // Start background uploads for each new slide
    newSlides.forEach(async (slide) => {
      try {
        let uid = authUid;
        if (!uid || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uid)) {
          const { data: sessionData } = await supabase.auth.getSession();
          uid = sessionData?.session?.user?.id;
        }

        if (uid && slide.file) {
          const res = await uploadPostMedia(slide.file, uid);
          setSlides((cur) =>
            cur.map((s) =>
              s.id === slide.id ? { ...s, mediaUrl: res.url, mediaType: res.type || s.mediaType, isUploading: false } : s
            )
          );
        } else {
          setSlides((cur) => cur.map((s) => (s.id === slide.id ? { ...s, isUploading: false } : s)));
        }
      } catch (err) {
        console.warn('Media upload warning for slide:', err.message);
        setSlides((cur) =>
          cur.map((s) => (s.id === slide.id ? { ...s, isUploading: false, uploadError: err.message } : s))
        );
      }
    });
  }

  // Handle Bulk File Selection or Live Camera Captures
  async function handleFileSelect(e) {
    const files = Array.from(e.target.files || []);
    if (e.target) e.target.value = '';
    await processFiles(files);
  }

  // Live Voice Note handlers
  async function handleStartVoiceNote() {
    setGlobalError('');
    if (!isAudioRecordingSupported()) {
      cameraAudioInputRef.current?.click();
      return;
    }

    try {
      setVoiceSeconds(0);
      setIsRecordingVoice(true);
      const recorder = await startAudioRecording({
        maxSeconds: 60, // STATUS_MEDIA_LIMITS.audio.maxSeconds
        onTimeTick: (sec) => setVoiceSeconds(sec),
      });
      voiceRecorderRef.current = recorder;
    } catch (err) {
      console.warn('Live voice recording init error:', err);
      setIsRecordingVoice(false);
      if (cameraAudioInputRef.current) {
        cameraAudioInputRef.current.click();
      } else {
        setGlobalError(err.message || 'Could not access microphone.');
      }
    }
  }

  async function handleStopVoiceNote() {
    if (!voiceRecorderRef.current) return;
    try {
      const res = await voiceRecorderRef.current.stop();
      setIsRecordingVoice(false);
      voiceRecorderRef.current = null;
      if (res?.file) {
        await processFiles([res.file]);
      }
    } catch (err) {
      console.error('Error stopping voice note:', err);
      setIsRecordingVoice(false);
      setGlobalError('Could not save voice note recording.');
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

  // Delete an individual slide (like WhatsApp status delete item)
  function handleDeleteSlide(indexToDelete, e) {
    if (e) e.stopPropagation();

    const slideToDelete = slides[indexToDelete];
    if (slideToDelete?.previewUrl && slideToDelete.previewUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(slideToDelete.previewUrl);
      } catch (_) {}
    }

    setSlides((prev) => {
      if (prev.length <= 1) {
        // Return to clean empty slide
        return [createEmptySlide()];
      }
      return prev.filter((_, idx) => idx !== indexToDelete);
    });

    setActiveIdx((prev) => {
      if (prev >= indexToDelete && prev > 0) {
        return prev - 1;
      }
      return 0;
    });
  }

  // Submit all slides sequentially
  async function handleSubmit(e) {
    if (e) e.preventDefault();
    if (submitting) return;

    // Validate that each slide has either media or text
    for (let i = 0; i < slides.length; i++) {
      const s = slides[i];
      if (!s.mediaUrl && !s.previewUrl && !s.caption.trim()) {
        setGlobalError(`Slide ${i + 1} has no text or media. Please add a thought or attach media.`);
        setActiveIdx(i);
        return;
      }
    }

    setSubmitting(true);
    setGlobalError('');

    try {
      let firstCreated = null;

      for (let i = 0; i < slides.length; i++) {
        const s = slides[i];
        setPublishProgress(`Publishing ${i + 1} of ${slides.length}...`);

        const resolvedText = s.caption.trim() || (s.mediaUrl ? '' : 'Praise God!');

        const created = await createStatusUpdate({
          userId: currentUser?.id || 'me',
          userName: displayName,
          userAvatar: currentUser?.avatar_url || null,
          userBadge: currentUser?.badge || 'believer',
          userRole: currentUser?.role || 'member',
          userVerified: Boolean(currentUser?.badge_verified),
          text: resolvedText,
          mediaUrl: s.mediaUrl || s.previewUrl || null,
          mediaType: s.mediaType || null,
          bgStyle: s.bgStyle || 'emerald',
          scriptureTag: s.scriptureTag?.trim() || null,
          visibility: audience,
        });

        if (i === 0) firstCreated = created;
      }

      if (onCreated) onCreated(firstCreated);
      onClose();
    } catch (err) {
      console.error('Failed to post status updates:', err);
      setGlobalError(err.message || 'Failed to publish status updates.');
    } finally {
      setSubmitting(false);
      setPublishProgress('');
    }
  }

  const selectedAudienceObj =
    STATUS_AUDIENCE_OPTIONS.find((opt) => opt.id === audience) || STATUS_AUDIENCE_OPTIONS[0];

  function renderAudienceIcon(iconName, size = 14) {
    switch (iconName) {
      case 'Church':
        return <Users size={size} />;
      case 'UserCheck':
        return <UserCheck size={size} />;
      case 'Lock':
        return <Lock size={size} />;
      default:
        return <Globe size={size} />;
    }
  }

  const modalTitle = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 10 }}>
      <div className="status-creator-title-row" style={{ minWidth: 0, flex: 1 }}>
        <Sparkles size={16} className="status-creator-sparkle flex-shrink-0" />
        <h3 className="status-creator-title truncate">Create 24-Hour Status</h3>
      </div>

      {/* Audience selector pill button (shows current default, opens picker) */}
      <button
        type="button"
        className="status-audience-pill"
        onClick={() => setAudienceSheetOpen(true)}
        title="Who can view your story"
        aria-label="Story audience setting"
      >
        <span className="text-teal-400 flex-shrink-0">
          {renderAudienceIcon(selectedAudienceObj.iconName, 13)}
        </span>
        <span className="truncate">{selectedAudienceObj.shortLabel}</span>
        <ChevronDown size={12} className="opacity-70 flex-shrink-0" />
      </button>
    </div>
  );

  const footerActions = (
    <div className="status-creator-actions">
      <button type="button" className="status-cancel-btn" onClick={onClose} disabled={submitting}>
        Cancel
      </button>

      <button
        type="button"
        className="status-publish-btn"
        disabled={submitting}
        onClick={handleSubmit}
      >
        {submitting ? (
          <>
            <Loader2 size={15} className="animate-spin" />
            <span>{publishProgress || 'Publishing...'}</span>
          </>
        ) : (
          <>
            <Send size={15} />
            <span>
              {slides.length > 1 ? `Share ${slides.length} Stories` : 'Share 24h Status'}
            </span>
          </>
        )}
      </button>
    </div>
  );

  return (
    <>
      <PopupSheet
        open={true}
        onClose={onClose}
        title={modalTitle}
        size="md"
        footer={footerActions}
      >
        <form onSubmit={handleSubmit} className="status-creator-form">
          {/* Active Slide Live Preview Stage */}
          <div className={`status-creator-preview status-bg-${currentSlide.bgStyle || 'emerald'}`}>
            <div className="status-creator-preview-top" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar
                  name={displayName}
                  src={currentUser?.avatar_url}
                  hasStatus={true}
                  className="avatar-sm"
                />
                <div className="status-creator-preview-meta">
                  <span className="status-preview-name">{displayName}</span>
                  <span className="status-preview-duration">
                    Visible for 24h · {selectedAudienceObj.shortLabel}
                  </span>
                </div>
              </div>

              {/* Slide Counter & Delete current slide */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {slides.length > 1 && (
                  <span className="status-bulk-counter-pill">
                    {activeIdx + 1} / {slides.length}
                  </span>
                )}
                {(slides.length > 1 || currentSlide.previewUrl) && (
                  <button
                    type="button"
                    className="status-media-remove-pill"
                    onClick={(e) => handleDeleteSlide(activeIdx, e)}
                    title="Delete this slide"
                    aria-label="Delete this slide"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>

            {/* Media Presentation or Textarea */}
            {currentSlide.previewUrl ? (
              <div className="status-preview-media-container" style={{ position: 'relative', width: '100%', minHeight: 220, borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                <MediaPreviewFrame
                  mode="status"
                  media={{
                    url: currentSlide.previewUrl,
                    type: currentSlide.mediaType,
                    name: currentSlide.fileName || 'Status media',
                  }}
                  onRemove={(e) => handleDeleteSlide(activeIdx, e)}
                />

                {/* WhatsApp-style floating caption input under the media */}
                <div className="status-caption-bar">
                  <input
                    type="text"
                    placeholder="Add a caption..."
                    value={currentSlide.caption}
                    onChange={(e) => updateCurrentSlide({ caption: e.target.value })}
                    className="status-caption-input"
                    maxLength={280}
                  />
                  {currentSlide.caption && (
                    <button
                      type="button"
                      onClick={() => updateCurrentSlide({ caption: '' })}
                      style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}
                      title="Clear caption"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Pure Text Status Mode */
              <textarea
                className="status-creator-textarea"
                placeholder="What is on your heart today? Share a testimony, scripture verse, or prayer thought..."
                value={currentSlide.caption}
                onChange={(e) => updateCurrentSlide({ caption: e.target.value })}
                rows={3}
                maxLength={280}
                required
                autoFocus
              />
            )}

            {currentSlide.scriptureTag && (
              <div className="status-preview-tag">
                <Sparkles size={12} />
                <span>{currentSlide.scriptureTag}</span>
              </div>
            )}
          </div>

          {/* WhatsApp-style Bulk Media Carousel Strip */}
          <div className="status-bulk-thumb-strip">
            {slides.map((s, idx) => {
              const isActive = idx === activeIdx;
              const hasMedia = Boolean(s.previewUrl);

              return (
                <div
                  key={s.id}
                  className={`status-bulk-thumb${isActive ? ' active' : ''}`}
                  onClick={() => setActiveIdx(idx)}
                  title={`Slide ${idx + 1}${s.caption ? `: "${s.caption.slice(0, 30)}..."` : ''}`}
                >
                  {hasMedia ? (
                    s.mediaType === 'image' ? (
                      <img src={s.previewUrl} alt="" className="status-bulk-thumb-img" />
                    ) : s.mediaType === 'video' ? (
                      <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000' }}>
                        <video src={s.previewUrl} className="status-bulk-thumb-img" muted preload="metadata" />
                        <span style={{ position: 'absolute', bottom: 3, right: 3, background: 'rgba(0,0,0,0.7)', borderRadius: 4, padding: '1px 3px', color: '#fff', fontSize: 9 }}>
                          <Video size={10} />
                        </span>
                      </div>
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#064e3b', color: '#34d399' }}>
                        <Music size={20} />
                      </div>
                    )
                  ) : (
                    <div className={`status-bg-${s.bgStyle || 'emerald'}`} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>
                      {s.caption ? s.caption.slice(0, 15) : 'Text'}
                    </div>
                  )}

                  {/* Individual slide quick delete button */}
                  {(slides.length > 1 || hasMedia) && (
                    <button
                      type="button"
                      className="status-bulk-thumb-delete"
                      onClick={(e) => handleDeleteSlide(idx, e)}
                      title="Delete this slide"
                      aria-label="Delete this slide"
                    >
                      <X size={11} strokeWidth={2.8} />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Add More Media Button (bulk import) */}
            <button
              type="button"
              className="status-bulk-add-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Add more photos or videos"
            >
              <Plus size={16} />
              <span>Add</span>
            </button>
          </div>

          {/* Theme Selector (for text styling or background tone) */}
          <div className="status-theme-picker-section">
            <span className="status-field-label">Background Style:</span>
            <div className="status-theme-chips no-scrollbar">
              {BG_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  className={`status-theme-circle${(currentSlide.bgStyle || 'emerald') === theme.id ? ' active' : ''}`}
                  style={{ background: theme.style }}
                  onClick={() => updateCurrentSlide({ bgStyle: theme.id })}
                  title={theme.label}
                  aria-label={theme.label}
                >
                  {(currentSlide.bgStyle || 'emerald') === theme.id && <Check size={14} className="theme-check-icon" />}
                </button>
              ))}
            </div>
          </div>

          {/* Scripture or Topic Tag Field for Active Slide */}
          <div className="status-input-group">
            <label className="status-field-label" htmlFor="scripture-ref-input">
              Scripture or Topic Tag (Optional):
            </label>
            <input
              id="scripture-ref-input"
              type="text"
              placeholder="e.g. Psalm 23:1, Answered Prayer, Testimony"
              value={currentSlide.scriptureTag || ''}
              onChange={(e) => updateCurrentSlide({ scriptureTag: e.target.value })}
              className="status-text-input"
              maxLength={60}
            />
          </div>

          {/* Hidden Multi-file input for bulk imports */}
          <input
            ref={fileInputRef}
            id="status-media-device-input"
            type="file"
            multiple
            accept="image/*,video/*,audio/*"
            onChange={handleFileSelect}
            className="hidden"
            style={{ display: 'none' }}
          />

          {/* Hidden Device Camera / Capture Inputs */}
          <input
            ref={cameraPhotoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <input
            ref={cameraVideoInputRef}
            type="file"
            accept="video/*"
            capture="environment"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <input
            ref={cameraAudioInputRef}
            type="file"
            accept="audio/*"
            capture
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          {/* Unified Media Toolbar for Status Creator */}
          <div className="status-media-options-group" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
            <MediaToolbar
              context="status"
              onPickFile={(file) => processFiles([file])}
              onCamera={() => setShowCameraModal(true)}
              onVoice={() => setShowVoiceModal(true)}
              onGif={() => setShowGifModal(true)}
              disabled={submitting}
            />
          </div>

          {globalError && (
            <div className="status-upload-error-row" role="alert" style={{ marginTop: 10 }}>
              <AlertCircle size={14} className="shrink-0" />
              <span>{globalError}</span>
            </div>
          )}
        </form>
      </PopupSheet>

      {/* =========================================
          PopupSheet: Story Audience / Privacy Selector
         ========================================= */}
      <PopupSheet
        open={audienceSheetOpen}
        onClose={() => setAudienceSheetOpen(false)}
        size="sm"
        title="Who can view your story?"
      >
        <div style={{ padding: '4px 2px 8px' }}>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.45 }}>
            Select who can view your 24-hour status stories. This setting will be remembered as your default until you change it.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {STATUS_AUDIENCE_OPTIONS.map((opt) => {
              const isSelected = audience === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`status-audience-row${isSelected ? ' active' : ''}`}
                  onClick={() => handleAudienceChange(opt.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        background: isSelected ? 'rgba(20, 184, 166, 0.2)' : 'var(--surface-sunken)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isSelected ? 'var(--teal, #14b8a6)' : 'var(--ink-muted)',
                        flexShrink: 0,
                      }}
                    >
                      {renderAudienceIcon(opt.iconName, 18)}
                    </div>
                    <div style={{ textAlign: 'left', minWidth: 0 }}>
                      <strong style={{ display: 'block', fontSize: 14, color: 'var(--ink)' }}>
                        {opt.label}
                      </strong>
                      <small style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                        {opt.description}
                      </small>
                    </div>
                  </div>

                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      border: isSelected ? '2px solid var(--teal, #14b8a6)' : '2px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isSelected ? 'var(--teal, #14b8a6)' : 'transparent',
                      color: '#ffffff',
                      flexShrink: 0,
                    }}
                  >
                    {isSelected && <Check size={12} strokeWidth={3} />}
                  </div>
                </button>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 12,
              padding: '8px 12px',
              borderRadius: 8,
              background: 'rgba(20, 184, 166, 0.08)',
              border: '1px solid rgba(20, 184, 166, 0.2)',
              color: 'var(--teal, #14b8a6)',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Check size={13} />
            <span>Whatever setting you choose becomes your new default automatically.</span>
          </div>
        </div>
      </PopupSheet>

      {/* Camera Capture Modal */}
      {showCameraModal && (
        <CameraCaptureModal
          mode="both"
          maxVideoSeconds={60}
          onCapture={(file) => {
            if (file) processFiles([file]);
            setShowCameraModal(false);
          }}
          onClose={() => setShowCameraModal(false)}
        />
      )}

      {/* Voice Recorder Modal */}
      <PopupSheet
        open={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        title="Record 60s Status Audio Note"
        size="sm"
      >
        <div style={{ padding: '8px 0 16px' }}>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--ink-muted)' }}>
            Record an audio testimony, devotional reflection or prayer note (up to 60s).
          </p>
          <VoiceRecorderBar
            maxSeconds={60}
            autoStart={true}
            onDone={({ file }) => {
              if (file) processFiles([file]);
              setShowVoiceModal(false);
            }}
            onCancel={() => setShowVoiceModal(false)}
          />
        </div>
      </PopupSheet>

      {/* Animated GIF Picker */}
      {showGifModal && (
        <GifPicker
          onSelect={(gif) => {
            if (!gif?.url) return;
            const newSlide = {
              id: `slide-gif-${Date.now()}`,
              file: null,
              previewUrl: gif.url,
              mediaUrl: gif.url,
              mediaType: 'gif',
              fileName: gif.media_meta?.title || 'GIF',
              caption: '',
              scriptureTag: '',
              bgStyle: 'midnight',
              isUploading: false,
              uploadError: '',
            };
            setSlides((prev) => {
              const isEmptyFirst =
                prev.length === 1 && !prev[0].file && !prev[0].previewUrl && !prev[0].caption.trim();
              return isEmptyFirst ? [newSlide] : [...prev, newSlide];
            });
            setShowGifModal(false);
          }}
          onClose={() => setShowGifModal(false)}
          userId={currentUser?.id}
        />
      )}
    </>
  );
}
