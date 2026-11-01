'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  Check,
  X,
  AlertCircle,
  RotateCcw,
  Volume2,
} from 'lucide-react';
import { startAudioRecording, isAudioRecordingSupported } from '../../lib/voiceRecorder';

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function VoiceRecorderBar({
  onDone,
  onCancel,
  maxSeconds = 60,
  autoStart = false,
  className = '',
}) {
  // States: 'idle' | 'recording' | 'paused' | 'review' | 'error'
  const [state, setState] = useState(autoStart ? 'starting' : 'idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [recordedSeconds, setRecordedSeconds] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordingResult, setRecordingResult] = useState(null); // { file, duration, previewUrl }

  // Review playback state
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(0);

  const recorderRef = useRef(null);
  const audioPreviewRef = useRef(null);
  const waveBarsRef = useRef(Array(24).fill(0.1));

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recorderRef.current) {
        recorderRef.current.cancel();
      }
      if (recordingResult?.previewUrl) {
        URL.revokeObjectURL(recordingResult.previewUrl);
      }
    };
  }, [recordingResult]);

  // Start recording
  const handleStartRecording = useCallback(async () => {
    if (!isAudioRecordingSupported()) {
      setErrorMsg('Microphone recording is not supported in this browser. Please try Chrome, Safari, or Edge over HTTPS.');
      setState('error');
      return;
    }

    setErrorMsg('');
    setRecordedSeconds(0);
    setAudioLevel(0);
    waveBarsRef.current = Array(24).fill(0.1);

    try {
      const recorder = await startAudioRecording({
        maxSeconds,
        onTimeTick: (sec) => {
          setRecordedSeconds(sec);
        },
        onLevel: (level) => {
          setAudioLevel(level);
          // Shift bars and push normalized height
          const bars = waveBarsRef.current.slice(1);
          const scaled = Math.max(0.12, Math.min(1.0, level * 2.2));
          bars.push(scaled);
          waveBarsRef.current = bars;
        },
      });

      recorderRef.current = recorder;
      setState('recording');
    } catch (err) {
      console.warn('[VoiceRecorderBar] Start recording failed:', err);
      setErrorMsg(err.message || 'Could not access your microphone.');
      setState('error');
    }
  }, [maxSeconds]);

  useEffect(() => {
    if (autoStart) {
      handleStartRecording();
    }
  }, [autoStart, handleStartRecording]);

  // Pause
  const handlePause = () => {
    if (recorderRef.current && state === 'recording') {
      recorderRef.current.pause();
      setState('paused');
    }
  };

  // Resume
  const handleResume = () => {
    if (recorderRef.current && state === 'paused') {
      recorderRef.current.resume();
      setState('recording');
    }
  };

  // Stop & Review
  const handleStop = async () => {
    if (!recorderRef.current) return;
    try {
      const res = await recorderRef.current.stop();
      recorderRef.current = null;
      setRecordingResult(res);
      setPreviewDuration(res.duration || recordedSeconds || 1);
      setPreviewCurrentTime(0);
      setState('review');
    } catch (err) {
      console.warn('[VoiceRecorderBar] Stop recording error:', err);
      setErrorMsg('Failed to process voice note.');
      setState('error');
    }
  };

  // Cancel / Discard
  const handleCancel = () => {
    if (recorderRef.current) {
      recorderRef.current.cancel();
      recorderRef.current = null;
    }
    if (recordingResult?.previewUrl) {
      URL.revokeObjectURL(recordingResult.previewUrl);
    }
    setRecordingResult(null);
    setRecordedSeconds(0);
    setState('idle');
    if (onCancel) onCancel();
  };

  // Retake
  const handleRetake = () => {
    if (recordingResult?.previewUrl) {
      URL.revokeObjectURL(recordingResult.previewUrl);
    }
    setRecordingResult(null);
    setRecordedSeconds(0);
    handleStartRecording();
  };

  // Review Audio Playback Controls
  const togglePlayPreview = () => {
    const audio = audioPreviewRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().then(() => setIsPlayingPreview(true)).catch(() => {});
    } else {
      audio.pause();
      setIsPlayingPreview(false);
    }
  };

  const handleAudioTimeUpdate = () => {
    const audio = audioPreviewRef.current;
    if (audio) {
      setPreviewCurrentTime(audio.currentTime);
    }
  };

  const handleAudioEnded = () => {
    setIsPlayingPreview(false);
    setPreviewCurrentTime(0);
  };

  const handleSeek = (e) => {
    const audio = audioPreviewRef.current;
    if (!audio) return;
    const target = parseFloat(e.target.value);
    audio.currentTime = target;
    setPreviewCurrentTime(target);
  };

  // Confirm / Send
  const handleConfirm = () => {
    if (!recordingResult) return;
    if (onDone) {
      onDone(recordingResult);
    }
  };

  return (
    <div className={`voice-recorder-bar ${state} ${className}`} role="region" aria-label="Voice Note Recorder">
      {/* 1. IDLE STATE */}
      {state === 'idle' && (
        <div className="vrb-idle-row">
          <button
            type="button"
            className="vrb-mic-btn"
            onClick={handleStartRecording}
            aria-label="Start recording voice note"
            title="Record voice note"
          >
            <Mic size={20} className="vrb-mic-icon" />
          </button>
          <div className="vrb-idle-text">
            <span className="vrb-idle-title">Tap to record voice note</span>
            <span className="vrb-idle-sub">Up to {formatTime(maxSeconds)}</span>
          </div>
          {onCancel && (
            <button
              type="button"
              className="vrb-action-btn vrb-cancel-btn"
              onClick={onCancel}
              aria-label="Cancel voice note"
            >
              <X size={18} />
            </button>
          )}
        </div>
      )}

      {/* 2. RECORDING OR PAUSED STATE */}
      {(state === 'recording' || state === 'paused') && (
        <div className="vrb-active-row">
          {/* Status Dot & Time */}
          <div className="vrb-status-group">
            <span className={`vrb-live-dot ${state === 'paused' ? 'is-paused' : 'is-recording'}`} />
            <span className="vrb-timer" aria-live="polite">
              {formatTime(recordedSeconds)} / {formatTime(maxSeconds)}
            </span>
          </div>

          {/* Dynamic Waveform Visualizer */}
          <div className="vrb-waveform-container" aria-hidden="true">
            {waveBarsRef.current.map((heightFactor, idx) => (
              <span
                key={idx}
                className={`vrb-waveform-bar ${state === 'paused' ? 'is-paused' : ''}`}
                style={{
                  transform: `scaleY(${heightFactor})`,
                  opacity: 0.35 + heightFactor * 0.65,
                }}
              />
            ))}
          </div>

          {/* Action Controls */}
          <div className="vrb-controls-group">
            {state === 'recording' ? (
              <button
                type="button"
                className="vrb-action-btn vrb-pause-btn"
                onClick={handlePause}
                aria-label="Pause recording"
                title="Pause"
              >
                <Pause size={18} />
              </button>
            ) : (
              <button
                type="button"
                className="vrb-action-btn vrb-resume-btn"
                onClick={handleResume}
                aria-label="Resume recording"
                title="Resume"
              >
                <Play size={18} />
              </button>
            )}

            <button
              type="button"
              className="vrb-action-btn vrb-stop-btn"
              onClick={handleStop}
              aria-label="Stop recording and review"
              title="Stop and Review"
            >
              <Square size={16} fill="currentColor" />
            </button>

            <button
              type="button"
              className="vrb-action-btn vrb-cancel-btn"
              onClick={handleCancel}
              aria-label="Discard recording"
              title="Discard"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      )}

      {/* 3. REVIEW STATE */}
      {state === 'review' && recordingResult && (
        <div className="vrb-review-row">
          <audio
            ref={audioPreviewRef}
            src={recordingResult.previewUrl}
            onTimeUpdate={handleAudioTimeUpdate}
            onEnded={handleAudioEnded}
            preload="metadata"
          />

          <button
            type="button"
            className="vrb-action-btn vrb-play-preview-btn"
            onClick={togglePlayPreview}
            aria-label={isPlayingPreview ? 'Pause preview' : 'Play preview'}
          >
            {isPlayingPreview ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
          </button>

          <div className="vrb-review-scrubber-wrap">
            <input
              type="range"
              min="0"
              max={previewDuration || 1}
              step="0.1"
              value={previewCurrentTime}
              onChange={handleSeek}
              className="vrb-scrubber-slider"
              aria-label="Preview scrub slider"
            />
            <div className="vrb-review-times">
              <span>{formatTime(previewCurrentTime)}</span>
              <span>{formatTime(previewDuration)}</span>
            </div>
          </div>

          <button
            type="button"
            className="vrb-action-btn vrb-retake-btn"
            onClick={handleRetake}
            aria-label="Retake voice note"
            title="Retake"
          >
            <RotateCcw size={17} />
          </button>

          <button
            type="button"
            className="vrb-action-btn vrb-cancel-btn"
            onClick={handleCancel}
            aria-label="Delete voice note"
            title="Delete"
          >
            <Trash2 size={17} />
          </button>

          <button
            type="button"
            className="vrb-confirm-btn"
            onClick={handleConfirm}
            aria-label="Attach voice note"
          >
            <Check size={18} />
            <span>Use</span>
          </button>
        </div>
      )}

      {/* 4. ERROR STATE */}
      {state === 'error' && (
        <div className="vrb-error-row">
          <AlertCircle size={20} className="vrb-error-icon" />
          <div className="vrb-error-text">
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            className="vrb-action-btn vrb-retry-btn"
            onClick={handleStartRecording}
            aria-label="Retry recording"
          >
            <RotateCcw size={16} />
            <span>Retry</span>
          </button>
          <button
            type="button"
            className="vrb-action-btn vrb-cancel-btn"
            onClick={handleCancel}
            aria-label="Close error"
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
