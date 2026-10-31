'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  Film,
  Camera,
  Music,
  BookOpen,
  Sparkles,
  Loader2,
  AlertCircle,
  Check,
} from 'lucide-react';
import { playSound } from '../../lib/soundEffects';
import { uploadPostMedia } from '../../lib/mediaUpload';
import { submitChallengeEntry } from '../../lib/data/challengesApi';

const PRESET_SAMPLE_MEDIA = [
  { url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600', label: 'Worship / CU Youth' },
  { url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600', label: 'Acoustic Guitar' },
  { url: 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=600', label: 'Acts of Kindness' },
  { url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600', label: 'Sunday Fit & Praise' },
];

export default function ChallengeSubmitModal({
  isOpen,
  onClose,
  challenge,
  currentUser,
  onSubmitted,
}) {
  const [mediaUrl, setMediaUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [scripture, setScripture] = useState('');
  const [hashtag, setHashtag] = useState(challenge?.tag || '#FaithChallenge');
  const [audioTitle, setAudioTitle] = useState('Original Praise Sound');

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef(null);

  if (!isOpen || !challenge) return null;

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    setUploading(true);
    setUploadProgress(20);

    try {
      const res = await uploadPostMedia(file, currentUser?.id || 'guest-user');
      setUploadProgress(100);
      if (res?.url) {
        setMediaUrl(res.url);
      }
      playSound('reaction');
    } catch (err) {
      // In local preview where storage bucket might not be active, generate preview object URL
      const localUrl = URL.createObjectURL(file);
      setMediaUrl(localUrl);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (!mediaUrl.trim()) {
      setErrorMsg('Please select a photo or video for your challenge submission.');
      return;
    }
    if (!caption.trim()) {
      setErrorMsg('Please write a caption or testimony for your entry.');
      return;
    }

    setSubmitting(true);
    playSound('reaction');

    try {
      const res = await submitChallengeEntry({
        challengeId: challenge.id,
        mediaUrl: mediaUrl.trim(),
        caption: caption.trim(),
        hashtag: hashtag.trim(),
        scripture: scripture.trim() || null,
        audioTitle: audioTitle.trim() || 'Original Praise Sound',
      });

      playSound('postPublished');
      if (onSubmitted) onSubmitted(res);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Submission failed. Please check connection.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="author-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{ zIndex: 100 }}
    >
      <div
        className="inst-profile-modal-card neon-glow-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '540px',
          width: '92%',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'color-mix(in srgb, var(--teal) 8%, var(--surface))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} style={{ color: challenge.accent || '#8b5cf6' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--ink)' }}>
                Submit Challenge Video / Post
              </h3>
              <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                {challenge.title}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="topbar-toggle-btn"
            style={{ width: 32, height: 32, borderRadius: '50%' }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', maxHeight: '78dvh', overflowY: 'auto' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Media Upload / Preview Viewport */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '6px' }}>
                Challenge Video or Photo *
              </label>

              {mediaUrl ? (
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: 220,
                    borderRadius: '14px',
                    overflow: 'hidden',
                    background: '#000',
                    border: '1px solid var(--border)',
                  }}
                >
                  <img
                    src={mediaUrl}
                    alt="Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', bottom: 10, left: 10, right: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(0,0,0,0.7)', color: '#fff' }}>
                      {scripture || 'Scripture Verified'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setMediaUrl('')}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: 'rgba(239, 68, 68, 0.85)',
                        color: '#fff',
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Change Media
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: '24px',
                    borderRadius: '14px',
                    border: '2px dashed var(--border)',
                    background: 'var(--surface-sunken)',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  <UploadCloud size={32} style={{ color: 'var(--teal)', margin: '0 auto 8px' }} />
                  <span style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
                    {uploading ? 'Processing file...' : 'Upload Video or Photo'}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '4px', display: 'block' }}>
                    MP4, WebM, JPG, PNG or GIF up to 50MB
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*,image/*"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                </div>
              )}

              {/* Sample preset picker */}
              {!mediaUrl && (
                <div style={{ marginTop: '10px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--ink-muted)', display: 'block', marginBottom: '6px' }}>
                    Or test with a sample faith clip:
                  </span>
                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {PRESET_SAMPLE_MEDIA.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setMediaUrl(item.url);
                          playSound('reaction');
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 10px',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--ink)',
                          fontSize: '11px',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                        }}
                      >
                        <Film size={12} />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Caption */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '6px' }}>
                Caption / Testimony *
              </label>
              <textarea
                rows={3}
                placeholder="Share your encouragement, reflection, or testimony for this challenge..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--ink)',
                  fontSize: '13px',
                  outline: 'none',
                  resize: 'none',
                }}
              />
            </div>

            {/* Scripture Verse Tag */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '6px' }}>
                  Scripture (e.g. Romans 8:37)
                </label>
                <div style={{ position: 'relative' }}>
                  <BookOpen size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-muted)' }} />
                  <input
                    type="text"
                    placeholder="Romans 8:37"
                    value={scripture}
                    onChange={(e) => setScripture(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px 8px 30px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--ink)',
                      fontSize: '12px',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '6px' }}>
                  Challenge Hashtag
                </label>
                <input
                  type="text"
                  placeholder="#ScriptureIn60s"
                  value={hashtag}
                  onChange={(e) => setHashtag(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    fontSize: '12px',
                  }}
                />
              </div>
            </div>

            {/* Sound / Music Track title */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '6px' }}>
                Audio / Praise Sound
              </label>
              <div style={{ position: 'relative' }}>
                <Music size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-muted)' }} />
                <input
                  type="text"
                  placeholder="Original Audio or Praise Title"
                  value={audioTitle}
                  onChange={(e) => setAudioTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px 8px 30px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    fontSize: '12px',
                  }}
                />
              </div>
            </div>

            {errorMsg && (
              <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                marginTop: '10px',
                padding: '13px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '14px',
                border: 'none',
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(139, 92, 246, 0.4)',
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="spin" />
                  <span>Publishing Entry...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Publish to Challenge Feed</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
