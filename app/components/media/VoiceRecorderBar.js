'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Pause,
  Play,
  Square,
  Trash2,
  Send,
  X,
  AlertCircle,
  Volume2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { startAudioRecording, isAudioRecordingSupported } from '../../lib/voiceRecorder';

/**
 * Format seconds into mm:ss display
 */
function formatDuration(sec = 0) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/**
 * VoiceRecorderBar component
 *
 * @param {Object} props
 * @param {Function} props.onDone - Called with { file: File, duration: number, previewUrl: string }
 * @param {Function} props.onCancel - Called when user cancels or closes voice recording
 * @param {number} [props.maxSeconds=60] - Maximum duration (60 for comments, 300 for posts)
 * @param {boolean} [props.autoStart=false] - Whether to immediately request mic on mount
 */
export default function VoiceRecorderBar({
  onDone,
  onCancel,
  maxSeconds = 60,
  autoStart = false,
}) {
  // States: 'idle' | 'starting' | 'recording' | 'paused' | 'review' | 'error'
  const [recordState, setRecordState] = useState('idle');
  const [seconds, setSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [audioLevel, setAudioLevel] = useState(0.1);
  const [waveformBars, setWaveformBars] = useState([12, 16, 20, 14, 18, 24, 16, 12]);

  // Review state
  const [reviewData, setReviewData] = useState(null); // { file, duration, previewUrl }
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);

  const recorderRef = useRef(null);
  const audioPreviewRef = useRef(null);

  // Initialize recording
  const handleStart = async () => {
    setErrorMessage('');
    setRecordState('starting');
    setSeconds(0);

    try {
      const rec = await startAudioRecording({
        maxSeconds,
        onTimeTick: (t) => setSeconds(t),
        onLevel: (level) => {
          setAudioLevel(level);
          // Dynamically compute animated waveform bars based on live frequency energy
          setWaveformBars((prev) => {
            const nextHeight = Math.max(8, Math.min(36, Math.round(level * 40 + Math.random() * 8)));
            return [...prev.slice(1), nextHeight];
          });
        },
      });

      recorderRef.current = rec;
      setRecordState('recording');
    } catch (err) {
      console.warn('Voice recording error:', err);
      setErrorMessage(err.message || 'Microphone access failed.');
      setRecordState('error');
    }
  };

  useEffect(() => {
    if (autoStart) {
      handleStart();
    }
    return () => {
      if (recorderRef.current) {
        recorderRef.current.cancel();
      }
      if (reviewData?.previewUrl) {
        URL.revokeObjectURL(reviewData.previewUrl);
      }
    };
  }, []);

  const handlePause = () => {
    if (recorderRef.current && recordState === 'recording') {
      recorderRef.current.pause();
      setRecordState('paused');
    }
  };

  const handleResume = () => {
    if (recorderRef.current && recordState === 'paused') {
      recorderRef.current.resume();
      setRecordState('recording');
    }
  };

  const handleStopAndReview = async () => {
    if (!recorderRef.current) return;
    try {
      const result = await recorderRef.current.stop();
      setReviewData(result);
      setRecordState('review');
    } catch (err) {
      setErrorMessage('Failed to finalize voice note.');
      setRecordState('error');
    }
  };

  const handleCancel = () => {
    if (recorderRef.current) {
      recorderRef.current.cancel();
    }
    if (reviewData?.previewUrl) {
      URL.revokeObjectURL(reviewData.previewUrl);
    }
    if (onCancel) onCancel();
  };

  const handleDelete = () => {
    if (reviewData?.previewUrl) {
      URL.revokeObjectURL(reviewData.previewUrl);
    }
    setReviewData(null);
    setSeconds(0);
    setRecordState('idle');
  };

  const handleSend = () => {
    if (reviewData && onDone) {
      onDone(reviewData);
    }
  };

  const togglePlayPreview = () => {
    if (!audioPreviewRef.current) return;
    if (isPlayingPreview) {
      audioPreviewRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioPreviewRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  const handleSeek = (e) => {
    if (!audioPreviewRef.current) return;
    const target = parseFloat(e.target.value);
    audioPreviewRef.current.currentTime = target;
    setPlaybackTime(target);
  };

  return (
    <div className="w-full bg-slate-900/95 border border-white/10 rounded-2xl p-3 shadow-xl backdrop-blur-md transition-all">
      <AnimatePresence mode="wait">
        {/* IDLE STATE */}
        {recordState === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
              <span>Record a voice note (up to {formatDuration(maxSeconds)})</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition"
                aria-label="Cancel recording"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleStart}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs hover:bg-teal-400 transition shadow-md"
              >
                <Mic className="w-4 h-4" />
                <span>Start Recording</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* STARTING / REQUESTING MIC */}
        {recordState === 'starting' && (
          <motion.div
            key="starting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-between p-1 text-xs text-slate-300"
          >
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
              <span>Requesting microphone permission...</span>
            </div>
            <button
              type="button"
              onClick={handleCancel}
              className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* RECORDING & PAUSED STATES */}
        {(recordState === 'recording' || recordState === 'paused') && (
          <motion.div
            key="recording"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap"
          >
            {/* Live Indicator & Timer */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-3 h-3 rounded-full ${
                    recordState === 'recording'
                      ? 'bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.6)]'
                      : 'bg-amber-400'
                  }`}
                />
                <span className="font-mono text-sm font-bold text-white tracking-wider">
                  {formatDuration(seconds)}
                </span>
                <span className="text-[11px] text-slate-400">/ {formatDuration(maxSeconds)}</span>
              </div>

              {/* Animated Waveform Visualizer */}
              <div className="flex items-center gap-1 h-8 px-2 py-1 bg-black/40 rounded-lg border border-white/5">
                {waveformBars.map((height, idx) => (
                  <motion.div
                    key={idx}
                    animate={{
                      height: recordState === 'recording' ? `${height}px` : '8px',
                    }}
                    transition={{ duration: 0.1 }}
                    className="w-1 rounded-full bg-teal-400/90"
                    style={{ minHeight: '6px' }}
                  />
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 ml-auto">
              {recordState === 'recording' ? (
                <button
                  type="button"
                  onClick={handlePause}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
                  title="Pause recording"
                  aria-label="Pause recording"
                >
                  <Pause className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleResume}
                  className="p-2 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition"
                  title="Resume recording"
                  aria-label="Resume recording"
                >
                  <Play className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={handleStopAndReview}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs hover:bg-teal-400 transition shadow-md"
                title="Finish recording"
                aria-label="Finish recording"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Done</span>
              </button>

              <button
                type="button"
                onClick={handleCancel}
                className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-red-400 transition"
                title="Discard recording"
                aria-label="Discard recording"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* REVIEW STATE (PLAYBACK PREVIEW) */}
        {recordState === 'review' && reviewData && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap"
          >
            {/* Audio element */}
            <audio
              ref={audioPreviewRef}
              src={reviewData.previewUrl}
              onTimeUpdate={() => {
                if (audioPreviewRef.current) {
                  setPlaybackTime(audioPreviewRef.current.currentTime);
                }
              }}
              onEnded={() => {
                setIsPlayingPreview(false);
                setPlaybackTime(0);
              }}
            />

            {/* Play/Pause & Scrubber */}
            <div className="flex items-center gap-3 flex-1 min-w-[180px]">
              <button
                type="button"
                onClick={togglePlayPreview}
                className="p-2 rounded-xl bg-teal-500 text-slate-950 font-bold hover:bg-teal-400 transition shadow-sm"
                aria-label={isPlayingPreview ? 'Pause preview' : 'Play preview'}
              >
                {isPlayingPreview ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>

              <div className="flex flex-col flex-1">
                <input
                  type="range"
                  min="0"
                  max={reviewData.duration || 1}
                  step="0.1"
                  value={playbackTime}
                  onChange={handleSeek}
                  className="w-full accent-teal-400 cursor-pointer h-1.5 bg-white/20 rounded-lg"
                  aria-label="Seek voice note preview"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                  <span>{formatDuration(playbackTime)}</span>
                  <span>{formatDuration(reviewData.duration)}</span>
                </div>
              </div>
            </div>

            {/* Review actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-red-500/20 text-slate-400 hover:text-red-300 text-xs transition"
                title="Re-record"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Delete</span>
              </button>

              <button
                type="button"
                onClick={handleSend}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs hover:bg-teal-400 transition shadow-md"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Attach</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* ERROR STATE */}
        {recordState === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-between gap-3 text-xs text-red-300"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleStart}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
