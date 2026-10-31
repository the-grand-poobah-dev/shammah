'use client';

// CameraCaptureModal provides unified in-app photo snapshot and video recording.
// Note: Camera and microphone access strictly require a secure context (HTTPS) or localhost.
// When getUserMedia is unsupported (e.g. some in-app webviews or insecure origins),
// it automatically provides a native file capture fallback.

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  Video,
  RotateCcw,
  Zap,
  ZapOff,
  Grid,
  Clock,
  X,
  Check,
  Pause,
  Play,
  Square,
  AlertCircle,
  Upload,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

/**
 * CameraCaptureModal
 *
 * @param {Object} props
 * @param {'both'|'photo'|'video'} [props.mode='both'] - Allowed capture mode
 * @param {number} [props.maxVideoSeconds=60] - Maximum video recording duration
 * @param {Function} props.onCapture - Called with captured File object
 * @param {Function} props.onClose - Called when user dismisses camera
 */
export default function CameraCaptureModal({
  mode = 'both',
  maxVideoSeconds = 60,
  onCapture,
  onClose,
}) {
  const [activeMode, setActiveMode] = useState(mode === 'video' ? 'video' : 'photo');
  const [facingMode, setFacingMode] = useState('environment'); // 'user' (front) or 'environment' (back)
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [countdownSecs, setCountdownSecs] = useState(0); // 0 = off, 3 = 3s timer
  const [countdownActive, setCountdownActive] = useState(null); // active counting number
  const [permissionError, setPermissionError] = useState(null);
  const [unsupportedFallback, setUnsupportedFallback] = useState(false);

  // Video recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordedSeconds, setRecordedSeconds] = useState(0);

  // Review state
  const [capturedFile, setCapturedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [capturedKind, setCapturedKind] = useState(null); // 'image' or 'video'

  const videoElementRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const fallbackInputRef = useRef(null);

  // 1. Initialize or switch Camera Stream
  const startCameraStream = useCallback(async () => {
    setPermissionError(null);

    if (
      typeof window === 'undefined' ||
      !navigator?.mediaDevices?.getUserMedia
    ) {
      setUnsupportedFallback(true);
      return;
    }

    // Stop existing stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        try { t.stop(); } catch {}
      });
      streamRef.current = null;
    }

    try {
      const constraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: activeMode === 'video', // Audio requested only for video mode
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoElementRef.current) {
        videoElementRef.current.srcObject = stream;
        try {
          await videoElementRef.current.play();
        } catch {
          // Required on some mobile browsers
          videoElementRef.current.muted = true;
          await videoElementRef.current.play();
        }
      }

      // Detect torch / flash capability on the video track
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack && typeof videoTrack.getCapabilities === 'function') {
        const capabilities = videoTrack.getCapabilities();
        setHasTorch(Boolean(capabilities.torch));
      } else {
        setHasTorch(false);
      }
    } catch (err) {
      console.warn('Camera getUserMedia error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionError('Camera access was denied. Please enable camera permission in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setPermissionError('No camera found on this device.');
      } else {
        setUnsupportedFallback(true);
      }
    }
  }, [facingMode, activeMode]);

  useEffect(() => {
    if (!capturedFile) {
      startCameraStream();
    }
    return () => {
      // Clean up camera stream and recording timer on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => {
          try { t.stop(); } catch {}
        });
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [startCameraStream, capturedFile]);

  // Flip Camera Front <-> Back
  const handleFlipCamera = () => {
    if (isRecording) return;
    setTorchOn(false);
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Toggle Torch/Flash
  const handleToggleTorch = async () => {
    if (!streamRef.current) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      try {
        const nextState = !torchOn;
        await videoTrack.applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setTorchOn(nextState);
      } catch (err) {
        console.warn('Torch constraint error:', err);
      }
    }
  };

  // Take Snapshot Photo
  const executePhotoCapture = () => {
    if (!videoElementRef.current) return;
    const video = videoElementRef.current;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    // Save image UNMIRRORED (natural photo representation)
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);
        setCapturedFile(file);
        setPreviewUrl(url);
        setCapturedKind('image');
      },
      'image/jpeg',
      0.92
    );
  };

  const handleCapturePhoto = () => {
    if (countdownSecs > 0) {
      let count = countdownSecs;
      setCountdownActive(count);
      const timer = setInterval(() => {
        count -= 1;
        if (count <= 0) {
          clearInterval(timer);
          setCountdownActive(null);
          executePhotoCapture();
        } else {
          setCountdownActive(count);
        }
      }, 1000);
    } else {
      executePhotoCapture();
    }
  };

  // Video Recording Flow
  const startVideoRecording = () => {
    if (!streamRef.current) return;

    recordedChunksRef.current = [];
    setRecordedSeconds(0);
    setIsRecording(true);
    setIsPaused(false);

    // MIME negotiation for video
    let mimeType = '';
    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4;codecs=avc1,mp4a.40.2',
      'video/mp4',
    ];

    for (const cand of candidates) {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(cand)) {
        mimeType = cand;
        break;
      }
    }

    let recorder;
    try {
      recorder = mimeType
        ? new MediaRecorder(streamRef.current, { mimeType })
        : new MediaRecorder(streamRef.current);
    } catch {
      recorder = new MediaRecorder(streamRef.current);
    }

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      clearInterval(recordingTimerRef.current);
      const cleanMime = (recorder.mimeType || mimeType || 'video/webm').split(';')[0];
      const ext = cleanMime.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(recordedChunksRef.current, { type: cleanMime });
      const file = new File([blob], `video_${Date.now()}.${ext}`, { type: cleanMime });
      const url = URL.createObjectURL(blob);

      setCapturedFile(file);
      setPreviewUrl(url);
      setCapturedKind('video');
      setIsRecording(false);
      setIsPaused(false);
    };

    recorder.start(500); // 500ms chunks
    mediaRecorderRef.current = recorder;

    let secs = 0;
    recordingTimerRef.current = setInterval(() => {
      secs += 1;
      setRecordedSeconds(secs);
      if (secs >= maxVideoSeconds) {
        stopVideoRecording();
      }
    }, 1000);
  };

  const pauseVideoRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  };

  const resumeVideoRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  };

  const stopVideoRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    clearInterval(recordingTimerRef.current);
  };

  // Review Actions
  const handleRetake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setCapturedFile(null);
    setPreviewUrl(null);
    setCapturedKind(null);
    setRecordedSeconds(0);
    setIsRecording(false);
    setIsPaused(false);
  };

  const handleUseCapture = () => {
    if (capturedFile && onCapture) {
      onCapture(capturedFile);
    }
    if (onClose) onClose();
  };

  // Fallback file input change
  const handleFallbackFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onCapture) {
      onCapture(file);
      if (onClose) onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl">
      {/* Hidden File Input for fallback */}
      <input
        ref={fallbackInputRef}
        type="file"
        accept={activeMode === 'video' ? 'video/*' : 'image/*'}
        capture="environment"
        onChange={handleFallbackFileChange}
        className="hidden"
      />

      <div className="relative w-full h-[100dvh] max-w-lg bg-black flex flex-col justify-between overflow-hidden sm:rounded-3xl sm:h-[90dvh] sm:border sm:border-white/10 shadow-2xl">
        {/* Top Controls Bar */}
        <div className="relative z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-md transition"
            aria-label="Close camera"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Quick Camera Settings (Flash, Timer, Grid) */}
          {!capturedFile && !permissionError && (
            <div className="flex items-center gap-2">
              {hasTorch && (
                <button
                  type="button"
                  onClick={handleToggleTorch}
                  className={`p-2 rounded-full backdrop-blur-md transition ${
                    torchOn ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-black/50 text-white'
                  }`}
                  aria-label="Toggle flash/torch"
                >
                  {torchOn ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
                </button>
              )}

              {activeMode === 'photo' && (
                <button
                  type="button"
                  onClick={() => setCountdownSecs((prev) => (prev === 0 ? 3 : 0))}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold backdrop-blur-md transition ${
                    countdownSecs > 0 ? 'bg-teal-500 text-slate-950' : 'bg-black/50 text-white'
                  }`}
                  aria-label="Toggle 3 second countdown timer"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{countdownSecs > 0 ? `${countdownSecs}s` : 'Off'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowGrid((g) => !g)}
                className={`p-2 rounded-full backdrop-blur-md transition ${
                  showGrid ? 'bg-teal-500 text-slate-950' : 'bg-black/50 text-white'
                }`}
                aria-label="Toggle composition grid"
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Review Title */}
          {capturedFile && (
            <span className="text-sm font-bold text-teal-400">Review Capture</span>
          )}
        </div>

        {/* Viewport / Preview Area */}
        <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden bg-black">
          {/* Active Live Video Stream */}
          {!capturedFile && !permissionError && !unsupportedFallback && (
            <>
              <video
                ref={videoElementRef}
                playsInline
                autoPlay
                muted
                className={`w-full h-full object-cover sm:object-contain transition-transform ${
                  facingMode === 'user' ? 'scale-x-[-1]' : ''
                }`}
              />

              {/* Composition 3x3 Grid Overlay */}
              {showGrid && (
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none z-10 border border-white/10">
                  <div className="border-r border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-b border-white/20" />
                  <div className="border-r border-white/20" />
                  <div className="border-r border-white/20" />
                  <div />
                </div>
              )}

              {/* Countdown overlay */}
              {countdownActive !== null && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-30">
                  <motion.span
                    key={countdownActive}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1.2, opacity: 1 }}
                    exit={{ scale: 1.6, opacity: 0 }}
                    className="font-black text-7xl text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]"
                  >
                    {countdownActive}
                  </motion.span>
                </div>
              )}

              {/* Video Recording Live Badge */}
              {isRecording && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600/90 text-white font-mono text-xs font-bold backdrop-blur-md shadow-lg">
                  <span className={`w-2.5 h-2.5 rounded-full bg-white ${isPaused ? '' : 'animate-ping'}`} />
                  <span>
                    {Math.floor(recordedSeconds / 60)}:
                    {recordedSeconds % 60 < 10 ? '0' : ''}
                    {recordedSeconds % 60} / {Math.floor(maxVideoSeconds / 60)}:00
                  </span>
                </div>
              )}
            </>
          )}

          {/* Captured Review Preview */}
          {capturedFile && previewUrl && (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              {capturedKind === 'image' ? (
                <img
                  src={previewUrl}
                  alt="Captured review"
                  className="w-full h-full object-contain"
                />
              ) : (
                <video
                  src={previewUrl}
                  playsInline
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              )}
            </div>
          )}

          {/* Permission Denied UI */}
          {permissionError && (
            <div className="p-6 text-center max-w-sm flex flex-col items-center gap-4 text-white">
              <div className="w-14 h-14 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold">Camera Access Required</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {permissionError}
              </p>
              <div className="flex flex-col gap-2 w-full mt-2">
                <button
                  type="button"
                  onClick={startCameraStream}
                  className="w-full py-2.5 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs hover:bg-teal-400 transition"
                >
                  Try Again
                </button>
                <button
                  type="button"
                  onClick={() => fallbackInputRef.current?.click()}
                  className="w-full py-2.5 rounded-xl bg-white/10 text-white font-bold text-xs hover:bg-white/20 transition flex items-center justify-center gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  <span>Choose from Device</span>
                </button>
              </div>
            </div>
          )}

          {/* Unsupported Webview Fallback */}
          {unsupportedFallback && !permissionError && (
            <div className="p-6 text-center max-w-sm flex flex-col items-center gap-4 text-white">
              <div className="w-14 h-14 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center">
                <Camera className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold">Take Photo or Video</h3>
              <p className="text-xs text-slate-300">
                Your browser or network environment requires native camera capture.
              </p>
              <button
                type="button"
                onClick={() => fallbackInputRef.current?.click()}
                className="w-full py-3 rounded-xl bg-teal-500 text-slate-950 font-bold text-sm hover:bg-teal-400 transition flex items-center justify-center gap-2 shadow-lg"
              >
                <Camera className="w-4 h-4" />
                <span>Open Device Camera</span>
              </button>
            </div>
          )}
        </div>

        {/* Bottom Shutter & Controls Section */}
        <div className="relative z-20 p-6 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col items-center gap-4">
          {/* Review Buttons: Retake vs Use */}
          {capturedFile ? (
            <div className="w-full flex items-center justify-between gap-4 max-w-xs">
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retake</span>
              </button>
              <button
                type="button"
                onClick={handleUseCapture}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-teal-500 text-slate-950 font-black text-sm hover:bg-teal-400 transition shadow-lg"
              >
                <Check className="w-4 h-4" />
                <span>Use Media</span>
              </button>
            </div>
          ) : (
            <>
              {/* Segmented Mode Selector (Photo | Video) */}
              {mode === 'both' && !isRecording && (
                <div className="flex items-center bg-black/60 border border-white/10 rounded-full p-1 backdrop-blur-md">
                  <button
                    type="button"
                    onClick={() => setActiveMode('photo')}
                    className={`px-4 py-1 rounded-full text-xs font-bold transition ${
                      activeMode === 'photo'
                        ? 'bg-white text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMode('video')}
                    className={`px-4 py-1 rounded-full text-xs font-bold transition ${
                      activeMode === 'video'
                        ? 'bg-red-500 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Video
                  </button>
                </div>
              )}

              {/* Shutter Row */}
              <div className="w-full flex items-center justify-around max-w-xs">
                {/* Secondary action: Native file picker fallback */}
                <button
                  type="button"
                  onClick={() => fallbackInputRef.current?.click()}
                  className="p-3 rounded-full bg-white/10 text-slate-300 hover:text-white hover:bg-white/20 transition"
                  title="Choose from gallery"
                  aria-label="Upload from gallery"
                >
                  <Upload className="w-5 h-5" />
                </button>

                {/* Primary Shutter Button */}
                {activeMode === 'photo' ? (
                  <button
                    type="button"
                    onClick={handleCapturePhoto}
                    className="w-18 h-18 rounded-full border-4 border-white p-1 hover:scale-105 active:scale-95 transition flex items-center justify-center shadow-2xl"
                    aria-label="Capture photo"
                  >
                    <div className="w-full h-full rounded-full bg-white" />
                  </button>
                ) : !isRecording ? (
                  <button
                    type="button"
                    onClick={startVideoRecording}
                    className="w-18 h-18 rounded-full border-4 border-red-500 p-1 hover:scale-105 active:scale-95 transition flex items-center justify-center shadow-2xl"
                    aria-label="Start video recording"
                  >
                    <div className="w-full h-full rounded-full bg-red-500" />
                  </button>
                ) : (
                  <div className="flex items-center gap-4">
                    {/* Pause / Resume */}
                    {isPaused ? (
                      <button
                        type="button"
                        onClick={resumeVideoRecording}
                        className="p-3.5 rounded-full bg-amber-500 text-slate-950 font-bold transition"
                        aria-label="Resume video recording"
                      >
                        <Play className="w-5 h-5 fill-current" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={pauseVideoRecording}
                        className="p-3.5 rounded-full bg-white/20 text-white transition"
                        aria-label="Pause video recording"
                      >
                        <Pause className="w-5 h-5 fill-current" />
                      </button>
                    )}

                    {/* Stop Recording */}
                    <button
                      type="button"
                      onClick={stopVideoRecording}
                      className="w-18 h-18 rounded-full border-4 border-white p-2 hover:scale-105 active:scale-95 transition flex items-center justify-center shadow-2xl"
                      aria-label="Stop video recording"
                    >
                      <div className="w-7 h-7 rounded-lg bg-red-600" />
                    </button>
                  </div>
                )}

                {/* Flip camera */}
                <button
                  type="button"
                  onClick={handleFlipCamera}
                  disabled={isRecording}
                  className={`p-3 rounded-full transition ${
                    isRecording ? 'opacity-30' : 'bg-white/10 text-slate-300 hover:text-white hover:bg-white/20'
                  }`}
                  title="Flip camera"
                  aria-label="Switch between front and back camera"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
