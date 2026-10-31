'use client';
import React, { useState, useEffect, useRef } from 'react';
import PopupSheet from '../PopupSheet';
import { Mic, Square, Play, Trash2, Check, RefreshCw } from 'lucide-react';
import { startAudioRecording, isAudioRecordingSupported } from '../../lib/voiceRecorder';

export default function VoiceRecorderBar({ isOpen, onClose, onRecordingComplete }) {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [timer, setTimer] = useState(0);
  const recorderRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      if (recorderRef.current && recording) {
        recorderRef.current.stop();
      }
      clearInterval(intervalRef.current);
      setRecording(false);
      setAudioUrl(null);
      setAudioBlob(null);
      setTimer(0);
    }
  }, [isOpen]);

  const handleStart = async () => {
    try {
      const rec = await startAudioRecording();
      recorderRef.current = rec;
      setRecording(true);
      setTimer(0);
      intervalRef.current = setInterval(() => {
        setTimer((t) => t + 1);
      }, 1000);
    } catch (err) {
      console.error('Audio recording failed:', err);
    }
  };

  const handleStop = async () => {
    clearInterval(intervalRef.current);
    setRecording(false);
    if (recorderRef.current) {
      try {
        const { blob, url } = await recorderRef.current.stop();
        setAudioBlob(blob);
        setAudioUrl(url);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleConfirm = () => {
    if (audioBlob && onRecordingComplete) {
      const file = new File([audioBlob], `voice-note-${Date.now()}.mp3`, { type: 'audio/mpeg' });
      onRecordingComplete(file, audioUrl);
      onClose();
    }
  };

  const formatSec = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <PopupSheet open={isOpen} onClose={onClose} title="Record Voice Note / Prayer" size="sm">
      <div className="p-6 text-center space-y-5">
        <div className="text-2xl font-mono font-bold text-[var(--ink)]">
          {formatSec(timer)}
        </div>

        {audioUrl ? (
          <div className="space-y-4">
            <audio src={audioUrl} controls className="w-full" />
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setAudioUrl(null);
                  setAudioBlob(null);
                  setTimer(0);
                }}
                className="px-4 py-2.5 rounded-full border border-[var(--border)] text-sm font-medium min-h-[44px]"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="px-5 py-2.5 rounded-full bg-[var(--teal)] text-white text-sm font-semibold flex items-center gap-2 min-h-[44px]"
              >
                <Check size={16} />
                <span>Attach Audio</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={recording ? handleStop : handleStart}
              className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-xl transition-all min-h-[44px] min-w-[44px] ${
                recording ? 'bg-red-600 animate-pulse' : 'bg-[var(--teal)] hover:opacity-90'
              }`}
              aria-label={recording ? 'Stop recording' : 'Start recording'}
            >
              {recording ? <Square size={24} /> : <Mic size={28} />}
            </button>
            <p className="text-xs text-[var(--ink-muted)]">
              {recording ? 'Recording... Tap to stop' : 'Tap to start recording'}
            </p>
          </div>
        )}
      </div>
    </PopupSheet>
  );
}
