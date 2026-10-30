/**
 * MediaUploadModal - Reusable Creator Upload Flow Component
 * 
 * Props:
 *  - isOpen {boolean}: Whether modal is open.
 *  - onClose {Function}: Dismiss callback.
 *  - defaultKind {'video'|'audio'}: Initial media tab.
 *  - onSuccess {Function}: Callback invoked with newly created media_items row.
 *  - sessionUser {Object}: Current logged-in user object.
 * 
 * Non-negotiables:
 *  - Rendered in document.body portal with backdrop blur and Esc/backdrop dismiss.
 *  - Drag & drop zone with auto thumbnail extraction (video) & duration metadata.
 *  - Real progress bar via uploadMediaItem.
 *  - Tags adder, category selector, visibility, series, and ACCENT_PALETTE picker.
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  UploadCloud,
  Film,
  Headphones,
  Check,
  AlertCircle,
  Loader2,
  Clock,
  Sparkles,
  Tag,
  Eye,
  Building,
} from 'lucide-react';

import {
  uploadMediaItem,
  generateVideoThumbnail,
  getMediaDuration,
  detectMediaType,
} from '../lib/mediaUpload';
import { createMedia } from '../lib/data/mediaApi';
import { ACCENT_PALETTE } from './layoutkit/palette';

const CATEGORIES = [
  'General',
  'Sermon',
  'Theology',
  'Worship',
  'Prayer',
  'Youth',
  'Leadership',
  'Missions',
  'Family',
];

export default function MediaUploadModal({
  isOpen,
  onClose,
  defaultKind = 'video',
  onSuccess,
  sessionUser,
}) {
  const [mounted, setMounted] = useState(false);
  const [kind, setKind] = useState(defaultKind);
  const [file, setFile] = useState(null);
  const [thumbBlob, setThumbBlob] = useState(null);
  const [thumbPreviewUrl, setThumbPreviewUrl] = useState('');
  const [duration, setDuration] = useState(0);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Sermon');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [seriesTitle, setSeriesTitle] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [accent, setAccent] = useState(ACCENT_PALETTE[0]);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);
  const customThumbInputRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update initial kind if prop changes
  useEffect(() => {
    if (defaultKind) setKind(defaultKind);
  }, [defaultKind]);

  // Lock body scroll and register Escape listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isUploading) {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isUploading, onClose]);

  // Clean up object URLs on unmount or file reset
  useEffect(() => {
    return () => {
      if (thumbPreviewUrl && thumbPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(thumbPreviewUrl);
      }
    };
  }, [thumbPreviewUrl]);

  if (!isOpen || !mounted) return null;

  const handleFileSelect = async (selectedFile) => {
    if (!selectedFile) return;
    setErrorMsg('');

    const detected = detectMediaType(selectedFile);
    if (!detected || (detected !== 'video' && detected !== 'audio')) {
      setErrorMsg('Please select a valid video (MP4, WebM) or audio file (MP3, WAV, M4A).');
      return;
    }

    setKind(detected);
    setFile(selectedFile);

    // Default title from filename if empty
    if (!title) {
      const cleanName = selectedFile.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      setTitle(cleanName);
    }

    // Auto extract duration
    try {
      const dur = await getMediaDuration(selectedFile);
      setDuration(dur);
    } catch {
      setDuration(0);
    }

    // If video, auto generate thumbnail
    if (detected === 'video') {
      try {
        const blob = await generateVideoThumbnail(selectedFile);
        if (blob) {
          setThumbBlob(blob);
          const preview = URL.createObjectURL(blob);
          setThumbPreviewUrl(preview);
        }
      } catch (err) {
        console.warn('Auto thumbnail generation fallback:', err);
      }
    }
  };

  const handleCustomThumbSelect = (imgFile) => {
    if (!imgFile) return;
    setThumbBlob(imgFile);
    const url = URL.createObjectURL(imgFile);
    setThumbPreviewUrl(url);
  };

  const handleAddTag = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      const clean = tagInput.trim().replace(/^#/, '');
      if (!tags.includes(clean) && tags.length < 8) {
        setTags([...tags, clean]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg('Please select a video or audio file to upload.');
      return;
    }
    if (!title.trim()) {
      setErrorMsg('Please provide a title for the sermon or broadcast.');
      return;
    }

    const userId = sessionUser?.id;
    if (!userId) {
      setErrorMsg('Please sign in to publish media to the church community.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(5);
    setErrorMsg('');

    try {
      // 1. Upload main media file
      const mediaResult = await uploadMediaItem(file, userId, {
        kind,
        onProgress: (pct) => setUploadProgress(Math.min(85, pct)),
      });

      // 2. Upload thumbnail if available
      let finalThumbUrl = null;
      if (thumbBlob) {
        setUploadProgress(88);
        const thumbResult = await uploadMediaItem(thumbBlob, userId, {
          kind: 'image',
          bucket: 'thumbnails',
        });
        finalThumbUrl = thumbResult.url;
      }

      setUploadProgress(95);

      // 3. Insert database record
      const payload = {
        kind,
        title: title.trim(),
        description: description.trim() || null,
        media_url: mediaResult.url,
        thumb_url: finalThumbUrl,
        duration_seconds: duration,
        category,
        tags,
        series_id: null,
        visibility,
        accent,
        church_id: sessionUser?.church_id || null,
        status: 'published',
      };

      const { data, error } = await createMedia(payload);

      if (error) {
        throw new Error(error.message || 'Failed to save media metadata.');
      }

      setUploadProgress(100);

      // Notify window listeners
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('shammah:media-published', { detail: data })
        );
      }

      if (onSuccess) {
        onSuccess(data);
      }

      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Upload failed. Please check your network and try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const formatDuration = (secs) => {
    if (!secs) return '0:00';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return createPortal(
    <div
      className="shammah-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.76)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isUploading) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-upload-title"
    >
      <div
        className="shammah-modal-panel"
        style={{
          width: '100%',
          maxWidth: '580px',
          maxHeight: '90dvh',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '18px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.35)',
        }}
      >
        {/* Modal Header */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'color-mix(in srgb, var(--teal) 15%, var(--surface))',
                color: 'var(--teal)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {kind === 'video' ? <Film size={18} /> : <Headphones size={18} />}
            </div>
            <h2 id="media-upload-title" style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
              Publish {kind === 'video' ? 'Video Sermon' : 'Audio Podcast'}
            </h2>
          </div>

          <button
            type="button"
            className="topbar-toggle-btn"
            onClick={onClose}
            disabled={isUploading}
            aria-label="Close upload dialog"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '999px',
              border: 'none',
              background: 'transparent',
              color: 'var(--ink-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </header>

        {/* Modal Body / Scroll area */}
        <div
          style={{
            padding: '18px 20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            flex: 1,
          }}
        >
          {errorMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'color-mix(in srgb, #ef4444 14%, var(--surface))',
                border: '1px solid color-mix(in srgb, #ef4444 30%, transparent)',
                color: '#ef4444',
                fontSize: '13px',
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* File Dropzone */}
          {!file ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                if (e.dataTransfer.files?.[0]) {
                  handleFileSelect(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragOver ? 'var(--teal)' : 'var(--border)'}`,
                borderRadius: '14px',
                padding: '32px 20px',
                textAlign: 'center',
                background: isDragOver
                  ? 'color-mix(in srgb, var(--teal) 10%, var(--surface))'
                  : 'color-mix(in srgb, var(--ink) 3%, var(--surface))',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime,audio/mpeg,audio/wav,audio/m4a,audio/aac"
                style={{ display: 'none' }}
                onChange={(e) => handleFileSelect(e.target.files?.[0])}
              />
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '999px',
                  background: 'color-mix(in srgb, var(--teal) 14%, var(--surface))',
                  color: 'var(--teal)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}
              >
                <UploadCloud size={26} />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 4px', color: 'var(--ink)' }}>
                Drag & drop your sermon {kind} here
              </h3>
              <p style={{ fontSize: '12.5px', color: 'var(--ink-muted)', margin: 0 }}>
                or click to browse files. Max 100MB for video, 50MB for audio.
              </p>
            </div>
          ) : (
            /* Selected File Preview Strip */
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                borderRadius: '12px',
                background: 'color-mix(in srgb, var(--teal) 8%, var(--surface))',
                border: '1px solid color-mix(in srgb, var(--teal) 22%, transparent)',
              }}
            >
              {thumbPreviewUrl ? (
                <img
                  src={thumbPreviewUrl}
                  alt="Thumbnail"
                  style={{ width: '80px', height: '48px', objectFit: 'cover', borderRadius: '6px' }}
                />
              ) : (
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '8px',
                    background: 'var(--teal)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {kind === 'video' ? <Film size={20} /> : <Headphones size={20} />}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    fontSize: '13.5px',
                    fontWeight: 600,
                    color: 'var(--ink)',
                    display: 'block',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {file.name}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                  {(file.size / (1024 * 1024)).toFixed(1)} MB • {formatDuration(duration)}
                </span>
              </div>
              {!isUploading && (
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setThumbBlob(null);
                    setThumbPreviewUrl('');
                  }}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--ink-muted)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                  }}
                >
                  Change
                </button>
              )}
            </div>
          )}

          {/* Metadata Form */}
          <form id="media-upload-form" onSubmit={handlePublish} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Title */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--ink)', marginBottom: '5px' }}>
                Title <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Walking in the Fullness of Grace"
                required
                disabled={isUploading}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--ink)',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Description */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--ink)', marginBottom: '5px' }}>
                Description / Sermon Notes
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Add key scripture references, main themes or sermon summary..."
                disabled={isUploading}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--ink)',
                  fontSize: '13.5px',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Category & Visibility Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--ink)', marginBottom: '5px' }}>
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={isUploading}
                  style={{
                    width: '100%',
                    padding: '9px 10px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    fontSize: '13.5px',
                  }}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--ink)', marginBottom: '5px' }}>
                  Visibility
                </label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                  disabled={isUploading}
                  style={{
                    width: '100%',
                    padding: '9px 10px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    fontSize: '13.5px',
                  }}
                >
                  <option value="public">Public (Everyone)</option>
                  <option value="followers">Followers Only</option>
                  <option value="church">My Church Community</option>
                  <option value="private">Private (Only Me)</option>
                </select>
              </div>
            </div>

            {/* Custom Thumbnail Picker */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--ink)' }}>
                  Cover Artwork / Thumbnail
                </label>
                <button
                  type="button"
                  onClick={() => customThumbInputRef.current?.click()}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--teal)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Upload Custom Image
                </button>
                <input
                  ref={customThumbInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={(e) => handleCustomThumbSelect(e.target.files?.[0])}
                />
              </div>
              {thumbPreviewUrl ? (
                <div style={{ position: 'relative', width: '100%', height: '120px', borderRadius: '10px', overflow: 'hidden' }}>
                  <img src={thumbPreviewUrl} alt="Thumbnail preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '6px',
                      right: '8px',
                      background: 'rgba(0,0,0,0.7)',
                      color: '#ffffff',
                      fontSize: '11px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    Preview
                  </span>
                </div>
              ) : (
                <div
                  onClick={() => customThumbInputRef.current?.click()}
                  style={{
                    padding: '16px',
                    textAlign: 'center',
                    border: '1px dashed var(--border)',
                    borderRadius: '10px',
                    color: 'var(--ink-muted)',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  No custom artwork selected. Video thumbnail will be extracted automatically.
                </div>
              )}
            </div>

            {/* Tags Adder */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--ink)', marginBottom: '5px' }}>
                Tags (Press Enter to add)
              </label>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 10px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                }}
              >
                {tags.map((t) => (
                  <span
                    key={t}
                    onClick={() => handleRemoveTag(t)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: 'color-mix(in srgb, var(--teal) 14%, var(--surface))',
                      color: 'var(--teal)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    title="Click to remove tag"
                  >
                    #{t} <X size={12} />
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder={tags.length < 8 ? 'Add tag (e.g. grace, prayer)...' : 'Max tags reached'}
                  disabled={isUploading || tags.length >= 8}
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    color: 'var(--ink)',
                    fontSize: '13px',
                    flex: 1,
                    minWidth: '120px',
                  }}
                />
              </div>
            </div>

            {/* Accent Color Palette Picker */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                Card Accent Theme
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {ACCENT_PALETTE.map((hex) => {
                  const isSelected = accent === hex;
                  return (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setAccent(hex)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '999px',
                        background: hex,
                        border: isSelected ? '3px solid var(--surface)' : '2px solid transparent',
                        outline: isSelected ? `2px solid ${hex}` : 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        transition: 'transform 0.15s ease',
                        transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                      }}
                      aria-label={`Select accent ${hex}`}
                    >
                      {isSelected && <Check size={14} strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Progress bar when uploading */}
            {isUploading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--ink-muted)' }}>
                  <span>Uploading to media library...</span>
                  <span style={{ fontWeight: 600, color: 'var(--teal)' }}>{uploadProgress}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', borderRadius: '999px', background: 'var(--border)', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${uploadProgress}%`,
                      height: '100%',
                      background: 'var(--teal)',
                      transition: 'width 0.2s ease',
                    }}
                  />
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Modal Footer */}
        <footer
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
            padding: '14px 20px',
            borderTop: '1px solid var(--border)',
            flexShrink: 0,
            background: 'color-mix(in srgb, var(--ink) 2%, var(--surface))',
          }}
        >
          <button
            type="button"
            className="filter-chip"
            onClick={onClose}
            disabled={isUploading}
            style={{ minHeight: '40px', padding: '0 16px' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="media-upload-form"
            className="signup-btn"
            disabled={!file || !title.trim() || isUploading}
            style={{
              minHeight: '40px',
              padding: '0 22px',
              background: 'var(--teal)',
              borderColor: 'var(--teal)',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {isUploading && <Loader2 size={15} className="spin-animate" />}
            <span>{isUploading ? 'Publishing...' : 'Publish Media'}</span>
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
