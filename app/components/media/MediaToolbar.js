'use client';

import { useRef, useState } from 'react';
import {
  ImagePlus,
  Camera,
  Mic,
  Film,
  Clapperboard,
  Radio,
  ChevronDown,
} from 'lucide-react';

/**
 * MediaToolbar
 *
 * Universal, icon-first media toolbar across Post Composer, Comment Threads, and Status Updates.
 *
 * @param {Object} props
 * @param {'post'|'comment'|'status'} [props.context='post'] - Layout and feature context
 * @param {Function} [props.onPickFile] - Triggered when a photo or video file is chosen (file => void)
 * @param {Function} [props.onCamera] - Triggered to launch CameraCaptureModal
 * @param {Function} [props.onVoice] - Triggered to start voice recording
 * @param {Function} [props.onGif] - Triggered to launch GifPicker
 * @param {Function} [props.onReel] - Triggered to launch ReelCreatorModal (post only)
 * @param {Function} [props.onLive] - Triggered to launch Live Stream Setup (post only)
 * @param {boolean} [props.disabled=false] - Disables interaction during upload or submission
 * @param {string} [props.className=''] - Additional class names
 * @param {React.ReactNode} [props.extraActions] - Additional context-specific action buttons (e.g. Poll, Location)
 */
export default function MediaToolbar({
  context = 'post',
  onPickFile,
  onCamera,
  onVoice,
  onGif,
  onReel,
  onLive,
  disabled = false,
  className = '',
  extraActions = null,
}) {
  const fileInputRef = useRef(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const isPost = context === 'post';
  const isComment = context === 'comment';
  const isStatus = context === 'status';

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onPickFile) {
      onPickFile(file);
    }
    // Reset so the same file can be picked again if removed
    e.target.value = '';
  };

  const handlePickClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  return (
    <div
      className={`shammah-media-toolbar context-${context} ${className}`}
      role="toolbar"
      aria-label="Media attachments and creation options"
    >
      {/* Hidden Unified File Input for Photo & Video */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        tabIndex={-1}
        className="shammah-sr-hidden-input"
        onChange={handleFileChange}
        disabled={disabled}
      />

      <div className="shammah-media-toolbar-items">
        {/* 1. Photo/Video (Unified) */}
        <button
          type="button"
          className="media-tool-btn tool-photo-video"
          onClick={handlePickClick}
          disabled={disabled}
          title="Attach photo or video"
          aria-label="Attach photo or video"
        >
          <span className="media-tool-icon-wrap icon-accent-emerald">
            <ImagePlus size={19} strokeWidth={2.2} />
          </span>
          <span className="media-tool-label">Media</span>
        </button>

        {/* 2. Camera (Snapshot or Video clip) */}
        {onCamera && (
          <button
            type="button"
            className="media-tool-btn tool-camera"
            onClick={onCamera}
            disabled={disabled}
            title="Take photo or record video"
            aria-label="Take photo or record video"
          >
            <span className="media-tool-icon-wrap icon-accent-amber">
              <Camera size={19} strokeWidth={2.2} />
            </span>
            <span className="media-tool-label">Camera</span>
          </button>
        )}

        {/* 3. Voice Recording */}
        {onVoice && (
          <button
            type="button"
            className="media-tool-btn tool-voice"
            onClick={onVoice}
            disabled={disabled}
            title={
              isPost
                ? 'Record voice note or spoken prayer (up to 5m)'
                : 'Record voice note (up to 60s)'
            }
            aria-label="Record voice note"
          >
            <span className="media-tool-icon-wrap icon-accent-cyan">
              <Mic size={19} strokeWidth={2.2} />
            </span>
            <span className="media-tool-label">Voice</span>
          </button>
        )}

        {/* 4. GIF Picker */}
        {onGif && (
          <button
            type="button"
            className="media-tool-btn tool-gif"
            onClick={onGif}
            disabled={disabled}
            title="Search and insert GIF"
            aria-label="Search and insert GIF"
          >
            <span className="media-tool-icon-wrap icon-accent-fuchsia">
              <Film size={19} strokeWidth={2.2} />
            </span>
            <span className="media-tool-label">GIF</span>
          </button>
        )}

        {/* 5. Short Reel (Post Context Only) */}
        {isPost && onReel && (
          <button
            type="button"
            className="media-tool-btn tool-reel"
            onClick={onReel}
            disabled={disabled}
            title="Create a short vertical Gospel Reel"
            aria-label="Create Gospel Reel"
          >
            <span className="media-tool-icon-wrap icon-accent-indigo">
              <Clapperboard size={19} strokeWidth={2.2} />
            </span>
            <span className="media-tool-label">Reel</span>
          </button>
        )}

        {/* 6. Live Stream Setup (Post Context Only) */}
        {isPost && onLive && (
          <button
            type="button"
            className="media-tool-btn tool-live"
            onClick={onLive}
            disabled={disabled}
            title="Go live or host a sanctuary prayer room"
            aria-label="Go live broadcast"
          >
            <span className="media-tool-icon-wrap icon-accent-rose">
              <span className="media-live-pulsing-dot" />
              <Radio size={19} strokeWidth={2.2} />
            </span>
            <span className="media-tool-label">Live</span>
          </button>
        )}

        {/* Context-specific Extra Actions (e.g. Poll, Location, Feeling, Offline toggle) */}
        {extraActions}
      </div>
    </div>
  );
}
