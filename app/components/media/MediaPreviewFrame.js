'use client';

import { useState, useRef, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Music,
  Film,
  Sparkles,
  Crop,
  RefreshCw,
} from 'lucide-react';

/**
 * MediaPreviewFrame
 *
 * Responsive, letterboxed media preview frame that preserves full media content.
 * Never blindly crops: displays media with object-fit: contain while filling letterbox
 * gaps with a blurred, dimmed backdrop copy of the media.
 *
 * @param {Object} props
 * @param {'composer'|'comment'|'status'} [props.mode='composer'] - Sizing context
 * @param {Object} props.media - Media descriptor { url, type, file, meta, name, duration }
 * @param {number} [props.aspect] - Optional aspect ratio override
 * @param {Function} [props.onRemove] - Triggered when user clicks X to delete media
 * @param {Function} [props.onEdit] - Optional callback for crop/edit
 * @param {Function} [props.onReplace] - Optional callback to pick replacement media
 * @param {string} [props.className=''] - Additional classes
 */
export default function MediaPreviewFrame({
  mode = 'composer',
  media,
  aspect,
  onRemove,
  onEdit,
  onReplace,
  className = '',
}) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(media?.duration || media?.meta?.duration || 0);
  const audioRef = useRef(null);
  const videoRef = useRef(null);

  if (!media || !media.url) return null;

  const type = media.type || 'image';
  const url = media.url;
  const isVideo = type === 'video';
  const isAudio = type === 'audio';
  const isImageOrGif = type === 'image' || type === 'gif';

  // Format seconds into m:ss
  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const toggleAudioPlay = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  return (
    <div
      className={`shammah-media-preview-frame mode-${mode} type-${type} ${className}`}
      data-aspect={aspect || media.meta?.aspect || ''}
    >
      {/* Action Controls Overlay */}
      <div className="preview-frame-controls">
        {onEdit && isImageOrGif && (
          <button
            type="button"
            className="preview-control-btn control-edit"
            onClick={onEdit}
            title="Crop or edit image"
            aria-label="Crop image"
          >
            <Crop size={16} />
          </button>
        )}

        {onReplace && (
          <button
            type="button"
            className="preview-control-btn control-replace"
            onClick={onReplace}
            title="Replace media"
            aria-label="Replace media"
          >
            <RefreshCw size={15} />
          </button>
        )}

        {onRemove && (
          <button
            type="button"
            className="preview-control-btn control-remove"
            onClick={onRemove}
            title="Remove media"
            aria-label="Remove media"
          >
            <X size={17} strokeWidth={2.4} />
          </button>
        )}
      </div>

      {/* 1. Image / GIF Rendering */}
      {isImageOrGif && (
        <div className="preview-stage-container">
          {/* Blurred letterbox backdrop */}
          <div
            className="preview-backdrop-blur"
            style={{ backgroundImage: `url(${url})` }}
            aria-hidden="true"
          />
          {/* Foreground uncropped content */}
          <img
            src={url}
            alt={media.name || 'Media attachment preview'}
            className="preview-foreground-media img-contain"
            loading="lazy"
          />
          {type === 'gif' && (
            <span className="preview-gif-badge" aria-label="Animated GIF">
              GIF
            </span>
          )}
        </div>
      )}

      {/* 2. Video Rendering */}
      {isVideo && (
        <div className="preview-stage-container">
          {/* Blurred background copy */}
          <div className="preview-backdrop-blur video-blur-fallback" aria-hidden="true">
            <video
              src={url}
              muted
              playsInline
              preload="metadata"
              className="preview-backdrop-video"
            />
          </div>
          {/* Foreground uncropped video */}
          <video
            ref={videoRef}
            src={url}
            controls
            playsInline
            preload="metadata"
            className="preview-foreground-media video-contain"
          />
        </div>
      )}

      {/* 3. Audio Recording / Voice Waveform Card */}
      {isAudio && (
        <div className="preview-audio-card">
          <audio
            ref={audioRef}
            src={url}
            preload="metadata"
            onTimeUpdate={() => {
              if (audioRef.current) {
                setAudioCurrentTime(audioRef.current.currentTime);
              }
            }}
            onLoadedMetadata={() => {
              if (audioRef.current && audioRef.current.duration) {
                setAudioDuration(audioRef.current.duration);
              }
            }}
            onEnded={() => {
              setIsPlayingAudio(false);
              setAudioCurrentTime(0);
            }}
          />

          <div className="audio-card-left">
            <button
              type="button"
              className="audio-play-round-btn"
              onClick={toggleAudioPlay}
              aria-label={isPlayingAudio ? 'Pause audio' : 'Play audio'}
            >
              {isPlayingAudio ? (
                <Pause size={18} className="fill-current" />
              ) : (
                <Play size={18} className="fill-current ml-0.5" />
              )}
            </button>
          </div>

          <div className="audio-card-center">
            <div className="audio-card-title-row">
              <span className="audio-card-title truncate">
                {media.name || (media.file?.name) || 'Voice Recording'}
              </span>
              <span className="audio-card-time">
                {formatTime(audioCurrentTime)} / {formatTime(audioDuration)}
              </span>
            </div>

            {/* Visualizer Waveform Bar Strip */}
            <div className="audio-waveform-strip">
              {[40, 65, 30, 85, 95, 50, 70, 45, 90, 60, 80, 40, 100, 75, 55, 85, 35, 70].map((h, i) => {
                const progressPct = audioDuration > 0 ? (audioCurrentTime / audioDuration) * 100 : 0;
                const barPct = (i / 18) * 100;
                const isPlayed = barPct <= progressPct;
                return (
                  <span
                    key={i}
                    className={`waveform-bar${isPlayed ? ' active' : ''}`}
                    style={{ height: `${h}%` }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
