'use client';
import { useState } from 'react';
import { notFound } from 'next/navigation';
import {
  Mic,
  Camera,
  Film,
  Sparkles,
  Play,
  CheckCircle2,
  FileCode,
  Layers,
  Info,
} from 'lucide-react';
import VoiceRecorderBar from '../components/media/VoiceRecorderBar';
import CameraCaptureModal from '../components/media/CameraCaptureModal';
import GifPicker from '../components/media/GifPicker';
import { detectMediaType, getImageSize, getVideoMeta } from '../lib/mediaUpload';

export default function MediaLabPage() {
  // 404 in production
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  // Camera modal state
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState('both');
  const [capturedMedia, setCapturedMedia] = useState(null);

  // Voice note state
  const [capturedVoice, setCapturedVoice] = useState(null);
  const [voiceMaxSec, setVoiceMaxSec] = useState(60);

  // GIF picker state
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [selectedGif, setSelectedGif] = useState(null);

  // File Inspector state
  const [inspectedMeta, setInspectedMeta] = useState(null);

  const handleInspectFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const detectedType = detectMediaType(file);
    let sizeMeta = null;

    if (detectedType === 'image' || detectedType === 'gif') {
      sizeMeta = await getImageSize(file);
    } else if (detectedType === 'video') {
      sizeMeta = await getVideoMeta(file);
    }

    setInspectedMeta({
      name: file.name,
      type: file.type,
      sizeBytes: file.size,
      detectedType,
      sizeMeta,
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 text-[var(--ink)]">
      {/* Header */}
      <div className="mb-8 border-b border-[var(--border)] pb-5">
        <div className="flex items-center gap-2 text-teal-400 font-semibold text-xs tracking-wider uppercase mb-1">
          <Layers size={14} />
          <span>Shammah Developer Test Harness</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
          Media Capture &amp; Picker Lab
        </h1>
        <p className="text-[var(--ink-muted)] text-sm max-w-2xl">
          Test in-browser microphone voice notes, live camera capture with photo and video MediaRecorder, and GIPHY / custom GIF picker. (Disabled automatically in production builds).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ===================================================================
            SECTION 1: VOICE RECORDER
           =================================================================== */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-base">
              <Mic size={18} className="text-cyan-400" />
              <span>Voice Note Recorder</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <button
                type="button"
                className={`px-2.5 py-1 rounded-full border ${voiceMaxSec === 60 ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50' : 'border-[var(--border)] text-[var(--ink-muted)]'}`}
                onClick={() => setVoiceMaxSec(60)}
              >
                60s (Comment)
              </button>
              <button
                type="button"
                className={`px-2.5 py-1 rounded-full border ${voiceMaxSec === 300 ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50' : 'border-[var(--border)] text-[var(--ink-muted)]'}`}
                onClick={() => setVoiceMaxSec(300)}
              >
                5m (Post)
              </button>
            </div>
          </div>

          <p className="text-xs text-[var(--ink-muted)]">
            Features pause/resume, live AnalyserNode waveform, MIME negotiation (webm/mp4), and in-bar review scrubber.
          </p>

          <VoiceRecorderBar
            maxSeconds={voiceMaxSec}
            onDone={(res) => {
              setCapturedVoice(res);
            }}
            onCancel={() => {
              setCapturedVoice(null);
            }}
          />

          {capturedVoice && (
            <div className="mt-2 p-3 rounded-xl bg-black/40 border border-emerald-500/30 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                <CheckCircle2 size={14} />
                <span>Voice Note Captured Successfully</span>
              </div>
              <div className="text-xs space-y-1 font-mono text-[var(--ink-muted)]">
                <div>File: {capturedVoice.file?.name} ({capturedVoice.file?.type})</div>
                <div>Duration: {capturedVoice.duration} seconds</div>
                <div>Size: {Math.round(capturedVoice.file?.size / 1024)} KB</div>
              </div>
              <audio controls src={capturedVoice.previewUrl} className="w-full mt-1 h-9" />
            </div>
          )}
        </div>

        {/* ===================================================================
            SECTION 2: LIVE CAMERA & VIDEO CAPTURE
           =================================================================== */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-base">
              <Camera size={18} className="text-purple-400" />
              <span>Camera Capture Modal</span>
            </div>
            <select
              className="bg-black/30 border border-[var(--border)] text-xs rounded-lg px-2 py-1 text-[var(--ink)]"
              value={cameraMode}
              onChange={(e) => setCameraMode(e.target.value)}
            >
              <option value="both">Mode: Both (Photo + Video)</option>
              <option value="photo">Mode: Photo Only</option>
              <option value="video">Mode: Video Only</option>
            </select>
          </div>

          <p className="text-xs text-[var(--ink-muted)]">
            Photo/Video toggle, shutter progress ring, flip camera, torch/flash, 3s timer, 3x3 grid, unmirrored file output, and native camera fallback.
          </p>

          <button
            type="button"
            className="flex items-center justify-center gap-2 min-h-[44px] rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm transition-all shadow-md"
            onClick={() => setShowCamera(true)}
          >
            <Camera size={18} />
            <span>Launch Camera Modal</span>
          </button>

          {capturedMedia && (
            <div className="mt-2 p-3 rounded-xl bg-black/40 border border-purple-500/30 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-purple-400 text-xs font-semibold">
                <CheckCircle2 size={14} />
                <span>Captured {capturedMedia.meta?.type?.toUpperCase()}</span>
              </div>
              <div className="text-xs space-y-1 font-mono text-[var(--ink-muted)]">
                <div>File: {capturedMedia.file?.name}</div>
                <div>Size: {Math.round(capturedMedia.file?.size / 1024)} KB</div>
                {capturedMedia.meta?.duration !== undefined && (
                  <div>Duration: {capturedMedia.meta.duration}s</div>
                )}
                <div>Resolution: {capturedMedia.meta?.width} x {capturedMedia.meta?.height}</div>
              </div>
              <div className="rounded-lg overflow-hidden border border-white/10 max-h-48 flex items-center justify-center bg-black">
                {capturedMedia.meta?.type === 'video' ? (
                  <video src={capturedMedia.meta.previewUrl} controls className="max-h-48 object-contain" />
                ) : (
                  <img src={capturedMedia.meta.previewUrl} alt="Captured snapshot" className="max-h-48 object-contain" />
                )}
              </div>
            </div>
          )}
        </div>

        {/* ===================================================================
            SECTION 3: GIF PICKER
           =================================================================== */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-base">
              <Sparkles size={18} className="text-amber-400" />
              <span>GIF Picker</span>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
              GIPHY &amp; Upload
            </span>
          </div>

          <p className="text-xs text-[var(--ink-muted)]">
            Trending, debounced search, faith category chips, localStorage recents, own .gif upload up to 10MB, and 2-col masonry.
          </p>

          <button
            type="button"
            className="flex items-center justify-center gap-2 min-h-[44px] rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold text-sm transition-all shadow-md"
            onClick={() => setShowGifPicker(true)}
          >
            <Sparkles size={18} />
            <span>Open GIF Picker</span>
          </button>

          {selectedGif && (
            <div className="mt-2 p-3 rounded-xl bg-black/40 border border-amber-500/30 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                <CheckCircle2 size={14} />
                <span>Selected GIF Attachment</span>
              </div>
              <div className="text-xs space-y-1 font-mono text-[var(--ink-muted)]">
                <div>Provider: {selectedGif.media_meta?.provider}</div>
                <div>ID: {selectedGif.media_meta?.gif_id}</div>
                <div>Size: {selectedGif.media_meta?.width} x {selectedGif.media_meta?.height}</div>
              </div>
              <div className="rounded-lg overflow-hidden border border-white/10 max-h-48 flex items-center justify-center bg-black">
                <img src={selectedGif.url} alt="Selected GIF" className="max-h-48 object-contain" />
              </div>
            </div>
          )}
        </div>

        {/* ===================================================================
            SECTION 4: MEDIA UPLOAD & METADATA INSPECTOR
           =================================================================== */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center gap-2 font-bold text-base">
            <FileCode size={18} className="text-emerald-400" />
            <span>Media Metadata Inspector</span>
          </div>

          <p className="text-xs text-[var(--ink-muted)]">
            Tests <code>detectMediaType</code>, <code>getImageSize</code>, and <code>getVideoMeta</code> on arbitrary device files.
          </p>

          <label className="flex flex-col items-center justify-center border-2 border-dashed border-[var(--border)] rounded-xl p-4 cursor-pointer hover:border-[var(--sec-color)] transition-all">
            <span className="text-xs font-semibold text-[var(--ink)]">Choose image, GIF, or video file</span>
            <span className="text-[11px] text-[var(--ink-muted)] mt-1">Inspects width, height, aspect, duration</span>
            <input
              type="file"
              accept="image/*,video/*,audio/*"
              className="hidden"
              onChange={handleInspectFile}
            />
          </label>

          {inspectedMeta && (
            <div className="p-3 rounded-xl bg-black/40 border border-white/10 font-mono text-xs space-y-1 text-[var(--ink-muted)]">
              <div className="text-[var(--ink)] font-semibold">{inspectedMeta.name}</div>
              <div>Detected Type: <span className="text-teal-400">{inspectedMeta.detectedType}</span></div>
              <div>MIME: {inspectedMeta.type}</div>
              <div>Size: {Math.round(inspectedMeta.sizeBytes / 1024)} KB</div>
              {inspectedMeta.sizeMeta && (
                <div className="text-emerald-400">
                  Dimensions: {inspectedMeta.sizeMeta.width} x {inspectedMeta.sizeMeta.height} (Aspect: {inspectedMeta.sizeMeta.aspect})
                  {inspectedMeta.sizeMeta.duration !== undefined && (
                    <span> | Duration: {inspectedMeta.sizeMeta.duration}s</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Camera Capture Modal */}
      {showCamera && (
        <CameraCaptureModal
          mode={cameraMode}
          maxVideoSeconds={60}
          onCapture={(file, meta) => {
            setCapturedMedia({ file, meta });
          }}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* GIF Picker Modal */}
      {showGifPicker && (
        <GifPicker
          onSelect={(gifData) => {
            setSelectedGif(gifData);
          }}
          onClose={() => setShowGifPicker(false)}
        />
      )}
    </div>
  );
}
