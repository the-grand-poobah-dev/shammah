'use client';
import { useState, useRef } from 'react';
import {
  Repeat2,
  PenLine,
  ArrowLeft,
  Check,
  Church,
  Camera,
  Video,
  Mic,
  Image as ImageIcon,
  Film,
  FileAudio,
  X,
  Music,
  Loader2,
} from 'lucide-react';
import PopupSheet from './PopupSheet';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import { uploadPostMedia } from '../lib/mediaUpload';
import { startAudioRecording, isAudioRecordingSupported } from '../lib/voiceRecorder';

export default function RepostModal({ post, currentUser, onClose, onConfirm }) {
  const [selectedOption, setSelectedOption] = useState('instant'); // 'instant' | 'thoughts'
  const [quoteText, setQuoteText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);

  // Live media capture & attachment state
  const [repostMediaFile, setRepostMediaFile] = useState(null);
  const [repostMediaPreview, setRepostMediaPreview] = useState(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceSeconds, setVoiceSeconds] = useState(0);

  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const cameraPhotoInputRef = useRef(null);
  const cameraVideoInputRef = useRef(null);
  const cameraAudioInputRef = useRef(null);
  const voiceRecorderRef = useRef(null);

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

  function handleFileSelected(file) {
    if (!file) return;
    setRepostMediaFile(file);
    const url = URL.createObjectURL(file);
    const type = file.type?.startsWith('video/')
      ? 'video'
      : file.type?.startsWith('audio/')
      ? 'audio'
      : 'image';
    setRepostMediaPreview({ url, type, name: file.name });
  }

  function handleRemoveMedia() {
    setRepostMediaFile(null);
    if (repostMediaPreview?.url && repostMediaPreview.url.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(repostMediaPreview.url);
      } catch (_) {}
    }
    setRepostMediaPreview(null);
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
        maxSeconds: 60,
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
    const trimmed = quoteText.trim();
    if (submitting || (!trimmed && !repostMediaFile)) return;
    setSubmitting(true);
    try {
      let mediaUrl = null;
      let mediaType = null;
      if (repostMediaFile) {
        setMediaUploading(true);
        const uploadRes = await uploadPostMedia(repostMediaFile, currentUser?.id);
        mediaUrl = uploadRes.url;
        mediaType = uploadRes.type;
        setMediaUploading(false);
      }
      await onConfirm({
        text: trimmed,
        mediaUrl,
        mediaType,
      });
    } catch (err) {
      console.error('Quote repost error:', err);
    } finally {
      setSubmitting(false);
      setMediaUploading(false);
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
        disabled={submitting || (selectedOption === 'thoughts' && !quoteText.trim() && !repostMediaFile)}
      >
        {mediaUploading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <PrimaryIcon size={16} />
        )}
        <span>
          {mediaUploading ? 'Uploading Media…' : submitting ? 'Sharing...' : primaryLabel}
        </span>
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

        {/* Hidden Camera & Microphone Fallback Inputs */}
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
                Add your reflection, scripture quote, photo, video, or voice note.
              </p>
            </div>
          </button>
        </div>

        {/* Step 2: Revealed textarea & media controls when 'thoughts' is chosen */}
        {selectedOption === 'thoughts' && (
          <div className="repost-thoughts-block">
            <div className="repost-thoughts-header-row">
              <button
                type="button"
                className="repost-back-btn"
                onClick={() => setSelectedOption('instant')}
                aria-label="Back to Instant Repost"
                title="Back to Instant Repost"
              >
                <ArrowLeft size={16} />
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
              placeholder="Add your spiritual reflection, prayer, or thoughts..."
              value={quoteText}
              onChange={(e) => setQuoteText(e.target.value)}
              rows={3}
              maxLength={280}
              autoFocus
            />

            {/* Active Voice Recording Status Bar */}
            {isRecordingVoice && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 10,
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  marginTop: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#ef4444',
                      display: 'inline-block',
                      animation: 'pulse 1s infinite',
                    }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#fca5a5' }}>
                    Recording Voice Note: {Math.floor(voiceSeconds / 60)}:{String(voiceSeconds % 60).padStart(2, '0')}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    type="button"
                    onClick={handleCancelVoiceNote}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      background: 'rgba(255,255,255,0.1)',
                      border: 'none',
                      color: 'var(--ink)',
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleStopVoiceNote}
                    style={{
                      padding: '3px 10px',
                      borderRadius: 6,
                      background: 'var(--teal, #14b8a6)',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Attach
                  </button>
                </div>
              </div>
            )}

            {/* Repost Media Preview */}
            {repostMediaPreview && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '6px 10px',
                  borderRadius: 10,
                  background: 'var(--surface-sunken)',
                  border: '1px solid var(--border)',
                  marginTop: 8,
                }}
              >
                {repostMediaPreview.type === 'image' && (
                  <img
                    src={repostMediaPreview.url}
                    alt="Preview"
                    style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }}
                  />
                )}
                {repostMediaPreview.type === 'video' && (
                  <video
                    src={repostMediaPreview.url}
                    style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', background: '#000' }}
                  />
                )}
                {repostMediaPreview.type === 'audio' && (
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 8,
                      background: 'var(--teal-soft)',
                      color: 'var(--teal)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Music size={20} />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0, fontSize: 12 }}>
                  <strong style={{ display: 'block', color: 'var(--ink)' }} className="truncate">
                    {repostMediaPreview.name || (repostMediaPreview.type === 'audio' ? 'Voice Note' : 'Attached Media')}
                  </strong>
                  <span style={{ color: 'var(--ink-muted)', fontSize: 11 }}>
                    {repostMediaPreview.type === 'image' ? 'Photo' : repostMediaPreview.type === 'video' ? 'Video' : 'Audio Note'} attached
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveMedia}
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '50%',
                    width: 22,
                    height: 22,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  title="Remove attachment"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Media Capture & Attachment Options for Repost */}
            <div
              className="repost-media-toolbar"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                marginTop: 8,
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                className="tool-btn"
                style={{ padding: '4px 8px', fontSize: 11.5, minHeight: 28 }}
                onClick={() => cameraPhotoInputRef.current?.click()}
                title="Take photo with camera"
                aria-label="Take photo"
              >
                <Camera size={14} className="text-emerald-400" />
                <span className="tool-label">Camera</span>
              </button>

              <button
                type="button"
                className="tool-btn"
                style={{ padding: '4px 8px', fontSize: 11.5, minHeight: 28 }}
                onClick={() => cameraVideoInputRef.current?.click()}
                title="Record video with camera"
                aria-label="Record video"
              >
                <Video size={14} className="text-amber-400" />
                <span className="tool-label">Record</span>
              </button>

              <button
                type="button"
                className={`tool-btn${isRecordingVoice ? ' active' : ''}`}
                style={{ padding: '4px 8px', fontSize: 11.5, minHeight: 28 }}
                onClick={isRecordingVoice ? handleStopVoiceNote : handleStartVoiceNote}
                title={isRecordingVoice ? 'Stop voice recording' : 'Record voice note'}
                aria-label="Voice Note"
              >
                <Mic size={14} className="text-cyan-400" />
                <span className="tool-label">{isRecordingVoice ? 'Recording…' : 'Voice Note'}</span>
              </button>

              <button
                type="button"
                className="tool-btn"
                style={{ padding: '4px 8px', fontSize: 11.5, minHeight: 28 }}
                onClick={() => photoInputRef.current?.click()}
                title="Attach photo from device"
                aria-label="Attach photo"
              >
                <ImageIcon size={14} className="text-emerald-400" />
                <span className="tool-label">Photo</span>
              </button>

              <button
                type="button"
                className="tool-btn"
                style={{ padding: '4px 8px', fontSize: 11.5, minHeight: 28 }}
                onClick={() => videoInputRef.current?.click()}
                title="Attach video from device"
                aria-label="Attach video"
              >
                <Film size={14} className="text-amber-400" />
                <span className="tool-label">Video</span>
              </button>

              <button
                type="button"
                className="tool-btn"
                style={{ padding: '4px 8px', fontSize: 11.5, minHeight: 28 }}
                onClick={() => audioInputRef.current?.click()}
                title="Attach audio clip from device"
                aria-label="Attach audio"
              >
                <FileAudio size={14} className="text-cyan-400" />
                <span className="tool-label">Audio</span>
              </button>
            </div>
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
