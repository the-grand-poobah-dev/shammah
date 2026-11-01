'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Video,
  RotateCcw,
  RefreshCw,
  Zap,
  ZapOff,
  Grid,
  Clock,
  Check,
  X,
  Play,
  Pause,
  Square,
  AlertCircle,
  Upload,
} from 'lucide-react';

/**
 * CameraCaptureModal
 * 
 * Hardware-accelerated camera and video recording modal.
 * Note: Camera and microphone hardware access strictly requires a secure context
 * (HTTPS) or localhost according to the W3C Media Capture and Streams standard.
 * In unsupported environments or in-app webviews, an automatic fallback to native
 * <input type="file" capture> is provided.
 */

function formatDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function CameraCaptureModal({
  mode = 'both', // 'both' | 'photo' | 'video'
  maxVideoSeconds = 60,
  onCapture,
  onClose,
}) {
  const [activeMode, setActiveMode] = useState(mode === 'video' ? 'video' : 'photo');
  const [facingMode, setFacingMode] = useState('user'); // 'user' | 'environment'
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [countdownEnabled, setCountdownEnabled] = useState(false);
  const [countdownValue, setCountdownValue] = useState(null);

  // States: 'initializing' | 'live' | 'recording' | 'paused' | 'review' | 'permission_denied' | 'unsupported'
  const [viewState, setViewState] = useState('initializing');
  const [deniedReason, setDeniedReason] = useState('');

  // Video recording state
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [isPausedRecording, setIsPausedRecording] = useState(false);

  // Review state
  const [capturedFile, setCapturedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [captureMeta, setCaptureMeta] = useState(null);

  const videoElementRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordTimerRef = useRef(null);
  const fallbackInputRef = useRef(null);

  // Stop all active tracks
  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch (_) {}
      });
      streamRef.current = null;
    }
  }, []);

  // Initialize or restart camera stream
  const initCamera = useCallback(async () => {
    if (typeof window === 'undefined') return;

    if (!navigator?.mediaDevices?.getUserMedia) {
      setViewState('unsupported');
      return;
    }

    stopTracks();
    setViewState('initializing');
    setTorchOn(false);
    setHasTorch(false);

    const wantsAudio = activeMode === 'video' || mode === 'video' || mode === 'both';

    const constraints = {
      video: {
        facingMode,
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: wantsAudio
        ? {
            echoCancellation: true,
            noiseSuppression: true,
          }
        : false,
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoElementRef.current) {
        videoElementRef.current.srcObject = stream;
        videoElementRef.current.playsInline = true;
        videoElementRef.current.muted = true;
        await videoElementRef.current.play().catch(() => {});
      }

      // Check for torch capability on rear camera
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack?.getCapabilities) {
        const capabilities = videoTrack.getCapabilities();
        if ('torch' in capabilities) {
          setHasTorch(true);
        }
      }

      setViewState('live');
    } catch (err) {
      console.warn('[CameraCaptureModal] Camera init error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setDeniedReason('Camera or microphone permission was denied. Please allow camera access in your browser site settings.');
        setViewState('permission_denied');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setDeniedReason('No camera hardware found on this device.');
        setViewState('unsupported');
      } else {
        setDeniedReason(err.message || 'Could not start camera feed.');
        setViewState('permission_denied');
      }
    }
  }, [facingMode, activeMode, mode, stopTracks]);

  // Launch stream on mount and when facingMode changes
  useEffect(() => {
    initCamera();
    return () => {
      stopTracks();
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [initCamera, stopTracks]);

  // Toggle Torch/Flashlight
  const handleToggleTorch = async () => {
    if (!streamRef.current) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;

    try {
      const nextTorch = !torchOn;
      await videoTrack.applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch (err) {
      console.warn('Torch constraint error:', err);
    }
  };

  // Flip Camera (Front / Back)
  const handleFlipCamera = () => {
    if (viewState === 'recording') return;
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Run optional 3-second countdown
  const runCountdown = () => {
    return new Promise((resolve) => {
      if (!countdownEnabled) return resolve();
      setCountdownValue(3);
      let count = 3;
      const interval = setInterval(() => {
        count -= 1;
        if (count > 0) {
          setCountdownValue(count);
        } else {
          clearInterval(interval);
          setCountdownValue(null);
          resolve();
        }
      }, 1000);
    });
  };

  // Snap Photo
  const handleTakePhoto = async () => {
    if (viewState !== 'live' || !videoElementRef.current) return;

    await runCountdown();

    const video = videoElementRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Note: unmirrored saved output (natural scene)
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const fileName = `photo_${Date.now()}.jpg`;
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);

        stopTracks();
        setCapturedFile(file);
        setPreviewUrl(url);
        setCaptureMeta({
          type: 'image',
          width,
          height,
          aspect: Number((width / height).toFixed(3)),
          previewUrl: url,
        });
        setViewState('review');
      },
      'image/jpeg',
      0.92
    );
  };

  // Start Video Recording
  const handleStartRecording = async () => {
    if (viewState !== 'live' || !streamRef.current) return;

    await runCountdown();

    recordedChunksRef.current = [];
    setRecordSeconds(0);
    setIsPausedRecording(false);

    // MIME negotiation for video recorder
    let mimeType = 'video/webm;codecs=vp8,opus';
    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4;codecs=avc1,mp4a.40.2',
      'video/mp4',
    ];

    for (const cand of candidates) {
      if (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(cand)) {
        mimeType = cand;
        break;
      }
    }

    let recorder;
    try {
      recorder = new MediaRecorder(streamRef.current, { mimeType });
    } catch {
      recorder = new MediaRecorder(streamRef.current);
    }

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      const cleanMime = (recorder.mimeType || mimeType || 'video/webm').split(';')[0];
      const ext = cleanMime.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(recordedChunksRef.current, { type: cleanMime });
      const fileName = `video_${Date.now()}.${ext}`;
      const file = new File([blob], fileName, { type: cleanMime });
      const url = URL.createObjectURL(blob);

      const video = videoElementRef.current;
      const width = video?.videoWidth || 1280;
      const height = video?.videoHeight || 720;

      stopTracks();
      setCapturedFile(file);
      setPreviewUrl(url);
      setCaptureMeta({
        type: 'video',
        width,
        height,
        duration: recordSeconds,
        aspect: Number((width / height).toFixed(3)),
        previewUrl: url,
      });
      setViewState('review');
    };

    mediaRecorderRef.current = recorder;
    recorder.start(250);
    setViewState('recording');

    // Timer loop with auto-stop at maxVideoSeconds
    recordTimerRef.current = setInterval(() => {
      setRecordSeconds((prev) => {
        const next = prev + 1;
        if (next >= maxVideoSeconds) {
          handleStopRecording();
        }
        return next;
      });
    }, 1000);
  };

  // Pause / Resume Video Recording
  const handleTogglePauseRecording = () => {
    const rec = mediaRecorderRef.current;
    if (!rec) return;

    if (rec.state === 'recording') {
      rec.pause();
      setIsPausedRecording(true);
      setViewState('paused');
    } else if (rec.state === 'paused') {
      rec.resume();
      setIsPausedRecording(false);
      setViewState('recording');
    }
  };

  // Stop Recording
  const handleStopRecording = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== 'inactive') {
      try {
        rec.stop();
      } catch (_) {}
    }
  };

  // Retake Capture
  const handleRetake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setCapturedFile(null);
    setPreviewUrl('');
    setCaptureMeta(null);
    setRecordSeconds(0);
    initCamera();
  };

  // Confirm and Use Capture
  const handleUseCapture = () => {
    if (!capturedFile) return;
    if (onCapture) {
      onCapture(capturedFile, captureMeta);
    }
    handleClose();
  };

  // Fallback native input handler
  const handleFallbackFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const url = URL.createObjectURL(file);

    setCapturedFile(file);
    setPreviewUrl(url);
    setCaptureMeta({
      type: isVideo ? 'video' : 'image',
      previewUrl: url,
    });
    setViewState('review');
  };

  // Close modal
  const handleClose = () => {
    stopTracks();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (onClose) onClose();
  };

  // Progress ring percentage for video mode
  const recordProgressPercent = Math.min(100, (recordSeconds / (maxVideoSeconds || 60)) * 100);

  return (
    <div className="camera-modal-backdrop" role="dialog" aria-modal="true" aria-label="Camera Capture">
      <div className="camera-modal-content">
        {/* Top Floating Action Bar */}
        <div className="camera-topbar">
          <button
            type="button"
            className="camera-icon-btn camera-close-btn"
            onClick={handleClose}
            aria-label="Close camera"
          >
            <X size={20} />
          </button>

          {/* Mode Switcher Segmented Pill (if mode === 'both' and not recording/review) */}
          {mode === 'both' && (viewState === 'live' || viewState === 'initializing') && (
            <div className="camera-mode-pill" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeMode === 'photo'}
                className={`camera-mode-tab ${activeMode === 'photo' ? 'is-active' : ''}`}
                onClick={() => setActiveMode('photo')}
              >
                Photo
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeMode === 'video'}
                className={`camera-mode-tab ${activeMode === 'video' ? 'is-active' : ''}`}
                onClick={() => setActiveMode('video')}
              >
                Video
              </button>
            </div>
          )}

          {/* Top Quick Tools: Torch, Grid, Timer */}
          {(viewState === 'live' || viewState === 'recording' || viewState === 'paused') && (
            <div className="camera-tools-group">
              {hasTorch && (
                <button
                  type="button"
                  className={`camera-icon-btn ${torchOn ? 'is-active' : ''}`}
                  onClick={handleToggleTorch}
                  aria-label={torchOn ? 'Turn off torch' : 'Turn on torch'}
                  title="Flashlight / Torch"
                >
                  {torchOn ? <Zap size={18} fill="currentColor" /> : <ZapOff size={18} />}
                </button>
              )}

              <button
                type="button"
                className={`camera-icon-btn ${showGrid ? 'is-active' : ''}`}
                onClick={() => setShowGrid((p) => !p)}
                aria-label={showGrid ? 'Hide grid' : 'Show 3x3 grid'}
                title="Rule of Thirds Grid"
              >
                <Grid size={18} />
              </button>

              <button
                type="button"
                className={`camera-icon-btn ${countdownEnabled ? 'is-active' : ''}`}
                onClick={() => setCountdownEnabled((p) => !p)}
                aria-label={countdownEnabled ? 'Disable 3s countdown' : 'Enable 3s countdown'}
                title="3-Second Timer"
              >
                <Clock size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Viewport Area */}
        <div className="camera-viewport-wrap">
          {/* 1. Live Camera Stream */}
          {(viewState === 'live' || viewState === 'recording' || viewState === 'paused' || viewState === 'initializing') && (
            <div className={`camera-video-container ${facingMode === 'user' ? 'mirror-preview' : ''}`}>
              <video
                ref={videoElementRef}
                autoPlay
                playsInline
                muted
                className="camera-video-feed"
              />

              {/* 3x3 Grid Overlay */}
              {showGrid && (
                <div className="camera-grid-overlay" aria-hidden="true">
                  <div className="camera-grid-line v-1" />
                  <div className="camera-grid-line v-2" />
                  <div className="camera-grid-line h-1" />
                  <div className="camera-grid-line h-2" />
                </div>
              )}

              {/* Countdown Overlay */}
              {countdownValue !== null && (
                <div className="camera-countdown-overlay" aria-live="assertive">
                  <span className="camera-countdown-number">{countdownValue}</span>
                </div>
              )}

              {/* Recording Indicator & Timer */}
              {(viewState === 'recording' || viewState === 'paused') && (
                <div className="camera-recording-pill">
                  <span className={`camera-recording-dot ${viewState === 'paused' ? 'is-paused' : ''}`} />
                  <span className="camera-recording-time">
                    {formatDuration(recordSeconds)} / {formatDuration(maxVideoSeconds)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 2. Review Captured Media Screen */}
          {viewState === 'review' && (
            <div className="camera-review-container">
              {captureMeta?.type === 'video' ? (
                <video
                  src={previewUrl}
                  controls
                  autoPlay
                  playsInline
                  loop
                  className="camera-review-media"
                />
              ) : (
                <img
                  src={previewUrl}
                  alt="Captured snapshot"
                  className="camera-review-media"
                />
              )}
            </div>
          )}

          {/* 3. Permission Denied Screen */}
          {viewState === 'permission_denied' && (
            <div className="camera-permission-sheet">
              <AlertCircle size={44} className="camera-permission-icon" />
              <h3 className="camera-permission-title">Camera Access Denied</h3>
              <p className="camera-permission-desc">
                {deniedReason || 'Please allow camera and microphone permissions in your browser or device settings.'}
              </p>
              <div className="camera-permission-actions">
                <button
                  type="button"
                  className="camera-btn-primary"
                  onClick={initCamera}
                >
                  <RefreshCw size={16} />
                  <span>Try Again</span>
                </button>
                <button
                  type="button"
                  className="camera-btn-secondary"
                  onClick={() => fallbackInputRef.current?.click()}
                >
                  <Upload size={16} />
                  <span>Choose from Device</span>
                </button>
              </div>
            </div>
          )}

          {/* 4. Unsupported Browser Screen */}
          {viewState === 'unsupported' && (
            <div className="camera-permission-sheet">
              <Camera size={44} className="camera-permission-icon" />
              <h3 className="camera-permission-title">Camera Not Available</h3>
              <p className="camera-permission-desc">
                In-browser live camera stream is not supported in this environment or requires HTTPS. You can still snap or upload using your device&apos;s camera app.
              </p>
              <div className="camera-permission-actions">
                <button
                  type="button"
                  className="camera-btn-primary"
                  onClick={() => fallbackInputRef.current?.click()}
                >
                  <Camera size={16} />
                  <span>Open Device Camera</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Hidden Fallback Input */}
        <input
          ref={fallbackInputRef}
          type="file"
          accept={activeMode === 'video' ? 'video/*' : 'image/*,video/*'}
          capture="environment"
          style={{ display: 'none' }}
          onChange={handleFallbackFile}
        />

        {/* Bottom Shutter & Controls Bar */}
        <div className="camera-bottom-bar">
          {viewState === 'review' ? (
            /* Review Actions */
            <div className="camera-review-actions-row">
              <button
                type="button"
                className="camera-retake-btn"
                onClick={handleRetake}
              >
                <RotateCcw size={18} />
                <span>Retake</span>
              </button>
              <button
                type="button"
                className="camera-use-btn"
                onClick={handleUseCapture}
              >
                <Check size={18} />
                <span>Use {captureMeta?.type === 'video' ? 'Video' : 'Photo'}</span>
              </button>
            </div>
          ) : (
            /* Live Camera Controls */
            <div className="camera-shutter-row">
              {/* Left slot: Pause/Resume if recording, or empty */}
              <div className="camera-shutter-side-slot">
                {(viewState === 'recording' || viewState === 'paused') && (
                  <button
                    type="button"
                    className="camera-icon-btn camera-pause-btn"
                    onClick={handleTogglePauseRecording}
                    aria-label={viewState === 'paused' ? 'Resume recording' : 'Pause recording'}
                  >
                    {viewState === 'paused' ? <Play size={20} fill="currentColor" /> : <Pause size={20} />}
                  </button>
                )}
              </div>

              {/* Main Shutter Button */}
              <div className="camera-shutter-wrapper">
                {activeMode === 'photo' ? (
                  /* Photo Shutter */
                  <button
                    type="button"
                    className="camera-shutter-btn photo-shutter"
                    onClick={handleTakePhoto}
                    aria-label="Take photo"
                  >
                    <span className="camera-shutter-inner" />
                  </button>
                ) : (
                  /* Video Shutter with circular progress ring */
                  <div className="camera-video-shutter-container">
                    <svg className="camera-progress-ring" viewBox="0 0 88 88">
                      <circle
                        className="camera-progress-track"
                        cx="44"
                        cy="44"
                        r="38"
                      />
                      <circle
                        className="camera-progress-fill"
                        cx="44"
                        cy="44"
                        r="38"
                        style={{
                          strokeDasharray: 238.76,
                          strokeDashoffset: 238.76 - (238.76 * recordProgressPercent) / 100,
                        }}
                      />
                    </svg>
                    <button
                      type="button"
                      className={`camera-shutter-btn video-shutter ${viewState === 'recording' ? 'is-recording' : ''}`}
                      onClick={viewState === 'recording' || viewState === 'paused' ? handleStopRecording : handleStartRecording}
                      aria-label={viewState === 'recording' ? 'Stop recording video' : 'Start recording video'}
                    >
                      {viewState === 'recording' || viewState === 'paused' ? (
                        <Square size={22} fill="currentColor" className="camera-shutter-stop-icon" />
                      ) : (
                        <span className="camera-shutter-video-inner" />
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Right slot: Flip Camera */}
              <div className="camera-shutter-side-slot">
                {viewState !== 'recording' && viewState !== 'paused' && (
                  <button
                    type="button"
                    className="camera-icon-btn camera-flip-btn"
                    onClick={handleFlipCamera}
                    aria-label="Flip camera front/back"
                    title="Flip Camera"
                  >
                    <RefreshCw size={20} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
