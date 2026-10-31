'use client';

import { useState } from 'react';
import {
  Mic,
  Camera,
  Video,
  Image as ImageIcon,
  Sparkles,
  Play,
  RotateCcw,
  CheckCircle,
  FileAudio,
  Film,
} from 'lucide-react';
import VoiceRecorderBar from '../components/media/VoiceRecorderBar';
import CameraCaptureModal from '../components/media/CameraCaptureModal';
import GifPicker from '../components/media/GifPicker';

export default function MediaLabClient() {
  // Voice test state
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [voiceMaxSecs, setVoiceMaxSecs] = useState(60);
  const [recordedAudio, setRecordedAudio] = useState(null);

  // Camera test state
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState('both');
  const [capturedMedia, setCapturedMedia] = useState(null);

  // GIF test state
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [selectedGif, setSelectedGif] = useState(null);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b border-white/10 pb-5">
          <div className="flex items-center gap-2 text-teal-400 text-xs font-black uppercase tracking-widest mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Developer Sandbox</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Media Lab</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Test VoiceRecorderBar, CameraCaptureModal, and GifPicker in complete isolation.
          </p>
        </div>

        {/* 1. VOICE RECORDER SECTION */}
        <div className="bg-slate-900 border border-white/10 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">1. Voice Recorder Component</h2>
                <p className="text-xs text-slate-400">
                  MediaRecorder with pause, resume, waveform energy & MIME negotiation
                </p>
              </div>
            </div>

            {/* Mode switch (Comments 60s vs Posts 300s) */}
            <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 text-xs font-bold">
              <button
                type="button"
                onClick={() => setVoiceMaxSecs(60)}
                className={`px-3 py-1 rounded-lg transition ${
                  voiceMaxSecs === 60 ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Comments (60s)
              </button>
              <button
                type="button"
                onClick={() => setVoiceMaxSecs(300)}
                className={`px-3 py-1 rounded-lg transition ${
                  voiceMaxSecs === 300 ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Posts (300s)
              </button>
            </div>
          </div>

          {!showVoiceRecorder ? (
            <button
              type="button"
              onClick={() => setShowVoiceRecorder(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-teal-500 text-slate-950 font-bold text-xs hover:bg-teal-400 transition shadow-lg"
            >
              <Mic className="w-4 h-4" />
              <span>Open Voice Recorder Bar</span>
            </button>
          ) : (
            <div className="pt-2">
              <VoiceRecorderBar
                maxSeconds={voiceMaxSecs}
                onDone={(result) => {
                  setRecordedAudio(result);
                  setShowVoiceRecorder(false);
                }}
                onCancel={() => setShowVoiceRecorder(false)}
              />
            </div>
          )}

          {recordedAudio && (
            <div className="p-4 rounded-2xl bg-black/40 border border-teal-500/30 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <FileAudio className="w-8 h-8 text-teal-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-teal-300">Voice Note Captured</div>
                  <div className="text-[11px] text-slate-400">
                    File: {recordedAudio.file.name} ({Math.round(recordedAudio.file.size / 1024)} KB) ·{' '}
                    Duration: {recordedAudio.duration}s
                  </div>
                </div>
              </div>

              <audio src={recordedAudio.previewUrl} controls className="h-8 max-w-xs" />
            </div>
          )}
        </div>

        {/* 2. CAMERA CAPTURE SECTION */}
        <div className="bg-slate-900 border border-white/10 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">2. Camera Capture Modal</h2>
                <p className="text-xs text-slate-400">
                  Live getUserMedia snapshot & video recorder with flip, torch, countdown & review
                </p>
              </div>
            </div>

            {/* Camera Mode */}
            <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 text-xs font-bold">
              {['both', 'photo', 'video'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setCameraMode(m)}
                  className={`px-2.5 py-1 rounded-lg uppercase text-[10px] transition ${
                    cameraMode === m ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowCamera(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition shadow-lg"
          >
            <Camera className="w-4 h-4" />
            <span>Open Camera ({cameraMode})</span>
          </button>

          {showCamera && (
            <CameraCaptureModal
              mode={cameraMode}
              maxVideoSeconds={60}
              onCapture={(file) => {
                const url = URL.createObjectURL(file);
                setCapturedMedia({
                  file,
                  url,
                  type: file.type.startsWith('video') ? 'video' : 'image',
                });
                setShowCamera(false);
              }}
              onClose={() => setShowCamera(false)}
            />
          )}

          {capturedMedia && (
            <div className="p-4 rounded-2xl bg-black/40 border border-cyan-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-cyan-300">
                  Captured: {capturedMedia.file.name} ({capturedMedia.type})
                </div>
                <div className="text-[11px] text-slate-400">
                  Size: {Math.round(capturedMedia.file.size / 1024)} KB
                </div>
              </div>

              <div className="max-h-64 rounded-xl overflow-hidden bg-black flex items-center justify-center">
                {capturedMedia.type === 'video' ? (
                  <video src={capturedMedia.url} controls className="max-h-64 object-contain" />
                ) : (
                  <img src={capturedMedia.url} alt="Captured preview" className="max-h-64 object-contain" />
                )}
              </div>
            </div>
          )}
        </div>

        {/* 3. GIF PICKER SECTION */}
        <div className="bg-slate-900 border border-white/10 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">3. GIF Picker Component</h2>
                <p className="text-xs text-slate-400">
                  Trending, 300ms debounced search, category chips, recent history & own upload
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowGifPicker(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-pink-500 text-slate-950 font-bold text-xs hover:bg-pink-400 transition shadow-lg"
          >
            <ImageIcon className="w-4 h-4" />
            <span>Open GIF Picker</span>
          </button>

          {showGifPicker && (
            <GifPicker
              onSelect={(gifData) => {
                setSelectedGif(gifData);
                setShowGifPicker(false);
              }}
              onClose={() => setShowGifPicker(false)}
            />
          )}

          {selectedGif && (
            <div className="p-4 rounded-2xl bg-black/40 border border-pink-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-pink-300">
                  Selected GIF: {selectedGif.media_meta?.title || 'GIF'}
                </div>
                <div className="text-[11px] text-slate-400">
                  Provider: {selectedGif.media_meta?.provider} · Aspect:{' '}
                  {selectedGif.media_meta?.aspect}
                </div>
              </div>

              <div className="max-h-64 rounded-xl overflow-hidden bg-black flex items-center justify-center">
                <img
                  src={selectedGif.url || selectedGif.previewUrl}
                  alt={selectedGif.media_meta?.title || 'Selected GIF'}
                  className="max-h-64 object-contain rounded-lg"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
