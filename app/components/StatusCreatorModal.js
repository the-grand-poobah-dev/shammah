'use client';
import { useState, useRef } from 'react';
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
} from 'lucide-react';
import { createStatusUpdate } from '../lib/statusManager';
import { uploadPostMedia } from '../lib/mediaUpload';
import { supabase } from '../../lib/supabaseClient';
import { cleanDisplayName } from '../lib/postDisplay';
import Avatar from './Avatar';
import PopupSheet from './PopupSheet';

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
  if (/\.(jpg|jpeg|png|webp|gif)$/.test(name)) return 'image';
  if (/\.(mp4|webm|mov|m4v)$/.test(name)) return 'video';
  if (/\.(mp3|wav|ogg|m4a|aac)$/.test(name)) return 'audio';
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
          error: `${type === 'video' ? 'Video' : 'Audio clip'} must be 60 seconds or shorter for a 24-hour status story. (Selected: ${Math.round(duration)}s)`,
        });
      } else {
        resolve({ valid: true, duration });
      }
    };

    element.onerror = () => {
      URL.revokeObjectURL(url);
      // If metadata couldn't be loaded in background, don't falsely reject valid file
      resolve({ valid: true });
    };

    element.src = url;
  });
}

export default function StatusCreatorModal({ currentUser, onClose, onCreated }) {
  const [text, setText] = useState('');
  const [scriptureTag, setScriptureTag] = useState('');
  const [selectedBg, setSelectedBg] = useState('emerald');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState(null); // 'image' | 'video' | 'audio'
  const [previewUrl, setPreviewUrl] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef(null);
  const displayName = cleanDisplayName(currentUser?.name || currentUser?.display_name || 'You', 'You');

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');

    const detected = getMediaType(file);
    if (!detected) {
      setUploadError('Unsupported format. Please select a photo (JPG, PNG, WebP), video (MP4, WebM) or audio clip (MP3, WAV).');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const limits = STATUS_MEDIA_LIMITS[detected];
    if (file.size > limits.maxBytes) {
      setUploadError(`That ${detected} is too large. Maximum size for statuses is ${limits.maxLabel}.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const durationCheck = await checkMediaDuration(file, detected);
    if (!durationCheck.valid) {
      setUploadError(durationCheck.error);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const localObjUrl = URL.createObjectURL(file);
    setPreviewUrl(localObjUrl);
    setMediaType(detected);
    setSelectedFileName(file.name);
    setIsUploading(true);

    try {
      let authUid = currentUser?.id;
      if (!authUid || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(authUid)) {
        const { data: sessionData } = await supabase.auth.getSession();
        authUid = sessionData?.session?.user?.id;
      }

      if (authUid) {
        const uploadRes = await uploadPostMedia(file, authUid);
        setMediaUrl(uploadRes.url);
        setMediaType(uploadRes.type || detected);
      } else {
        setMediaUrl(localObjUrl);
      }
    } catch (err) {
      console.warn('Storage upload note:', err.message);
      // Provide local preview fallback if storage bucket or network issue
      setMediaUrl(localObjUrl);
      if (err.message && !err.message.includes('not signed in')) {
        setUploadError(err.message);
      }
    } finally {
      setIsUploading(false);
    }
  }

  function handleRemoveMedia() {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(previewUrl);
      } catch (_) {}
    }
    setPreviewUrl('');
    setMediaUrl('');
    setMediaType(null);
    setSelectedFileName('');
    setUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    if (!text.trim() || submitting || isUploading) return;

    setSubmitting(true);

    try {
      const newStatus = await createStatusUpdate({
        userId: currentUser?.id || 'me',
        userName: displayName,
        userAvatar: currentUser?.avatar_url || null,
        userBadge: currentUser?.badge || 'believer',
        userRole: currentUser?.role || 'member',
        userVerified: Boolean(currentUser?.badge_verified),
        text: text.trim(),
        mediaUrl: mediaUrl || null,
        mediaType: mediaType || null,
        bgStyle: selectedBg,
        scriptureTag: scriptureTag.trim() || null,
      });

      if (onCreated) onCreated(newStatus);
      onClose();
    } catch (err) {
      console.error('Failed to create status:', err);
      setUploadError(err.message || 'Failed to publish status.');
    } finally {
      setSubmitting(false);
    }
  }

  const modalTitle = (
    <div className="status-creator-title-row">
      <Sparkles size={16} className="status-creator-sparkle" />
      <h3 className="status-creator-title">Create 24-Hour Status</h3>
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
        disabled={!text.trim() || submitting || isUploading}
        onClick={handleSubmit}
      >
        {submitting ? (
          <>
            <Loader2 size={15} className="animate-spin" />
            <span>Publishing...</span>
          </>
        ) : (
          <>
            <Send size={15} />
            <span>Share 24h Status</span>
          </>
        )}
      </button>
    </div>
  );

  return (
    <PopupSheet
      open={true}
      onClose={onClose}
      title={modalTitle}
      size="md"
      footer={footerActions}
    >
      <form onSubmit={handleSubmit} className="status-creator-form">
        {/* Live Card Preview */}
        <div className={`status-creator-preview status-bg-${selectedBg}`}>
          <div className="status-creator-preview-top">
            <Avatar
              name={displayName}
              src={currentUser?.avatar_url}
              hasStatus={true}
              className="avatar-sm"
            />
            <div className="status-creator-preview-meta">
              <span className="status-preview-name">{displayName}</span>
              <span className="status-preview-duration">Visible for 24 hours</span>
            </div>
          </div>

          <textarea
            className="status-creator-textarea"
            placeholder="What is on your heart today? Share a testimony, scripture verse, or prayer thought..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={280}
            required
            autoFocus
          />

          {/* Attached Media Preview inside the preview card */}
          {previewUrl && (
            <div className="status-preview-media-container">
              {mediaType === 'video' ? (
                <video
                  src={previewUrl}
                  controls
                  playsInline
                  className="status-preview-media-video"
                />
              ) : mediaType === 'audio' ? (
                <div className="status-preview-media-audio-card">
                  <div className="status-audio-info-row">
                    <Music size={16} className="text-emerald-400 shrink-0" />
                    <span className="status-audio-filename truncate">
                      {selectedFileName || 'Audio recording'}
                    </span>
                  </div>
                  <audio src={previewUrl} controls className="status-preview-audio-player w-full" />
                </div>
              ) : (
                <img
                  src={previewUrl}
                  alt="Status media preview"
                  className="status-preview-media-image"
                />
              )}

              <button
                type="button"
                className="status-media-remove-pill"
                onClick={handleRemoveMedia}
                title="Remove media"
                aria-label="Remove media"
              >
                <X size={13} />
                <span>Remove</span>
              </button>
            </div>
          )}

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

        {/* Device Media Picker (Replaces URL field) */}
        <div className="status-input-group">
          <label className="status-field-label" htmlFor="status-media-device-input">
            Attach Media (Photo, Video, or Audio):
          </label>

          <input
            ref={fileInputRef}
            id="status-media-device-input"
            type="file"
            accept="image/*,video/*,audio/*"
            onChange={handleFileSelect}
            className="hidden"
            style={{ display: 'none' }}
          />

          {!previewUrl ? (
            <button
              type="button"
              className="status-media-picker-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="status-media-picker-icons">
                <ImagePlus size={18} className="text-emerald-400" />
                <Video size={18} className="text-amber-400" />
                <FileAudio size={18} className="text-cyan-400" />
              </div>
              <div className="status-media-picker-text">
                <span className="status-media-picker-title">Add photo / video / audio</span>
                <span className="status-media-picker-sub">
                  Photos up to 10MB · Video up to 50MB (60s) · Audio up to 5MB (60s)
                </span>
              </div>
            </button>
          ) : (
            <div className="status-attached-media-bar">
              <div className="status-attached-media-left">
                {mediaType === 'video' ? (
                  <Video size={16} className="text-amber-400" />
                ) : mediaType === 'audio' ? (
                  <Music size={16} className="text-cyan-400" />
                ) : (
                  <ImagePlus size={16} className="text-emerald-400" />
                )}
                <span className="status-attached-media-name truncate">
                  {selectedFileName || 'Attached media'}
                </span>
                {isUploading && (
                  <span className="status-uploading-pill">
                    <Loader2 size={12} className="animate-spin" />
                    <span>Uploading...</span>
                  </span>
                )}
              </div>
              <button
                type="button"
                className="status-attached-change-btn"
                onClick={handleRemoveMedia}
                title="Remove attached media"
              >
                <X size={14} />
                <span>Remove</span>
              </button>
            </div>
          )}

          {uploadError && (
            <div className="status-upload-error-row" role="alert">
              <AlertCircle size={14} className="shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>
      </form>
    </PopupSheet>
  );
}
