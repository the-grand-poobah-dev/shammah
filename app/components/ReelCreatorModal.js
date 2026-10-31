'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Film,
  Video,
  UploadCloud,
  X,
  Sparkles,
  Send,
  Loader2,
  AlertCircle,
  Globe,
  Users,
  Church,
  Lock,
  Play,
  Pause,
  RotateCcw,
  Clock,
  Tag,
  Check,
  Camera,
  Sliders,
  Image as ImageIcon,
  MessageCircle,
  Volume2,
  VolumeX,
  Square,
  SwitchCamera,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import PopupSheet from './PopupSheet';
import Avatar from './Avatar';
import MemberName from './MemberName';
import { uploadPostMedia } from '../lib/mediaUpload';
import { supabase } from '../../lib/supabaseClient';
import { playSound } from '../lib/soundEffects';
import { cleanDisplayName } from '../lib/postDisplay';

const REEL_CATEGORIES = [
  { id: 'testimonies', label: 'Testimonies', color: '#ec4899', emoji: '🙌' },
  { id: 'worship', label: 'Praise & Worship', color: '#8b5cf6', emoji: '🎵' },
  { id: 'youth', label: 'Youth & Gen-Z', color: '#06b6d4', emoji: '⚡' },
  { id: 'sermons', label: 'Sermon Highlights', color: '#f59e0b', emoji: '📖' },
  { id: 'devotion', label: 'Daily Devotion', color: '#10b981', emoji: '🌱' },
  { id: 'prayer', label: 'Prayer & Intercession', color: '#3b82f6', emoji: '🙏' },
];

const VISIBILITY_OPTIONS = [
  { id: 'public', label: 'Public', desc: 'Anyone on Shammah', icon: Globe },
  { id: 'followers', label: 'Followers', desc: 'People who follow you', icon: Users },
  { id: 'church', label: 'Church', desc: 'Members of your church', icon: Church },
];

const SUGGESTED_HASHTAGS = ['#Testimony', '#Worship', '#Grace', '#Praise', '#Jesus', '#Faith', '#Bible'];
const SPEED_OPTIONS = [0.5, 1, 1.5, 2];
const MAX_RECORDING_SECONDS = 90;

export default function ReelCreatorModal({
  isOpen,
  onClose,
  session,
  profile,
  onCreated,
}) {
  // Mode: 'record' | 'review'
  const [step, setStep] = useState('record');
  const [activeTab, setActiveTab] = useState('camera'); // 'camera' or 'upload'

  // Camera Recording States
  const [facingMode, setFacingMode] = useState('user'); // 'user' (front) or 'environment' (back)
  const [countdownSetting, setCountdownSetting] = useState(0); // 0, 3, 10
  const [activeCountdown, setActiveCountdown] = useState(null);
  const [recordingSpeed, setRecordingSpeed] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordedSeconds, setRecordedSeconds] = useState(0);
  const [cameraError, setCameraError] = useState(null);

  // Video File & Review States
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState('');
  const [videoDuration, setVideoDuration] = useState(0);
  const [caption, setCaption] = useState('');
  const [soundTitle, setSoundTitle] = useState('Original Sound');
  const [category, setCategory] = useState('testimonies');
  const [visibility, setVisibility] = useState('public');
  const [allowComments, setAllowComments] = useState(true);

  // Cover Frame Picker States
  const [coverScrubTime, setCoverScrubTime] = useState(0);
  const [coverBlob, setCoverBlob] = useState(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState('');
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);

  // Upload progress & submission
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadAborted, setUploadAborted] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Refs
  const videoElementRef = useRef(null); // Camera viewfinder
  const reviewVideoRef = useRef(null); // Review player
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const fileInputRef = useRef(null);
  const uploadXhrRef = useRef(null);

  const displayName = cleanDisplayName(
    profile?.display_name || session?.user?.email?.split('@')[0] || 'Disciple',
    'Disciple'
  );

  // Stop camera tracks helper
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        try { t.stop(); } catch {}
      });
      streamRef.current = null;
    }
  }, []);

  // Initialize Camera Stream for Recording
  const startCameraStream = useCallback(async () => {
    setCameraError(null);
    stopCameraStream();

    if (typeof window === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
      setCameraError('Camera access is not supported by your browser.');
      setActiveTab('upload');
      return;
    }

    try {
      const constraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1080 },
          height: { ideal: 1920 },
          aspectRatio: { ideal: 9 / 16 },
        },
        audio: true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoElementRef.current) {
        videoElementRef.current.srcObject = stream;
        try {
          await videoElementRef.current.play();
        } catch {
          videoElementRef.current.muted = true;
          await videoElementRef.current.play();
        }
      }
    } catch (err) {
      console.warn('[ReelCreator] Camera start error:', err);
      setCameraError('Could not access camera/microphone. Please allow camera permissions.');
    }
  }, [facingMode, stopCameraStream]);

  // Effect: Start camera when in 'record' step and 'camera' tab
  useEffect(() => {
    if (isOpen && step === 'record' && activeTab === 'camera') {
      startCameraStream();
    } else {
      stopCameraStream();
    }

    return () => {
      stopCameraStream();
    };
  }, [isOpen, step, activeTab, startCameraStream, stopCameraStream]);

  // Clean up previews on unmount
  useEffect(() => {
    return () => {
      if (videoPreview && videoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(videoPreview);
      }
      if (coverPreviewUrl && coverPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(coverPreviewUrl);
      }
      stopCameraStream();
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [videoPreview, coverPreviewUrl, stopCameraStream]);

  // Flip Camera
  function handleFlipCamera() {
    playSound('reaction');
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  }

  // Segment Recording logic
  function startRecordingProcess() {
    if (countdownSetting > 0) {
      setActiveCountdown(countdownSetting);
      let remaining = countdownSetting;
      const countInterval = setInterval(() => {
        remaining -= 1;
        if (remaining > 0) {
          setActiveCountdown(remaining);
        } else {
          clearInterval(countInterval);
          setActiveCountdown(null);
          executeStartRecording();
        }
      }, 1000);
    } else {
      executeStartRecording();
    }
  }

  function executeStartRecording() {
    if (!streamRef.current) return;
    recordedChunksRef.current = [];
    setError('');

    try {
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4',
      ];
      let selectedMime = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || '';

      const options = selectedMime ? { mimeType: selectedMime } : {};
      const recorder = new MediaRecorder(streamRef.current, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        if (recordedChunksRef.current.length > 0) {
          const blob = new Blob(recordedChunksRef.current, {
            type: recorder.mimeType || 'video/webm',
          });
          const file = new File([blob], `reel-${Date.now()}.webm`, {
            type: blob.type,
          });
          processSelectedVideo(file);
        }
      };

      recorder.start(500); // 500ms time slice
      setIsRecording(true);
      setIsPaused(false);
      setRecordedSeconds(0);
      playSound('pop');

      recordingTimerRef.current = setInterval(() => {
        setRecordedSeconds((prev) => {
          if (prev >= MAX_RECORDING_SECONDS - 1) {
            stopRecording();
            return MAX_RECORDING_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('[ReelCreator] Record start failed:', err);
      setError('Could not start recording: ' + err.message);
    }
  }

  function pauseRecording() {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      try {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      } catch {}
    }
  }

  function resumeRecording() {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      try {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
        recordingTimerRef.current = setInterval(() => {
          setRecordedSeconds((prev) => {
            if (prev >= MAX_RECORDING_SECONDS - 1) {
              stopRecording();
              return MAX_RECORDING_SECONDS;
            }
            return prev + 1;
          });
        }, 1000);
      } catch {}
    }
  }

  function stopRecording() {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    setIsRecording(false);
    setIsPaused(false);
    stopCameraStream();
  }

  // Handle Video File Process (from recording or upload)
  function processSelectedVideo(file) {
    if (!file) return;
    setError('');

    if (file.size > 100 * 1024 * 1024) {
      setError('Video is too large. Maximum size is 100 MB.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setVideoFile(file);
    setVideoPreview(objectUrl);
    setStep('review');
    setUploadProgress(0);

    // Read metadata
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.muted = true;
    tempVideo.playsInline = true;
    tempVideo.onloadedmetadata = () => {
      const dur = Math.round(tempVideo.duration || 0);
      setVideoDuration(dur);
      // Auto-extract first frame as initial cover
      generateCoverFrame(objectUrl, 0.5);
    };
    tempVideo.src = objectUrl;
  }

  // Cover Frame Extractor
  function generateCoverFrame(videoSrc, timeSeconds = 0.5) {
    setIsGeneratingCover(true);
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    video.onloadeddata = () => {
      video.currentTime = Math.min(Math.max(0.1, timeSeconds), video.duration || 1);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 720;
        canvas.height = video.videoHeight || 1280;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              if (coverPreviewUrl && coverPreviewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(coverPreviewUrl);
              }
              const previewUrl = URL.createObjectURL(blob);
              setCoverBlob(blob);
              setCoverPreviewUrl(previewUrl);
            }
            setIsGeneratingCover(false);
          },
          'image/jpeg',
          0.85
        );
      } catch (err) {
        console.warn('[generateCoverFrame] error:', err);
        setIsGeneratingCover(false);
      }
    };

    video.onerror = () => {
      setIsGeneratingCover(false);
    };

    video.src = videoSrc;
  }

  function handleScrubCoverChange(e) {
    const time = parseFloat(e.target.value);
    setCoverScrubTime(time);
    if (reviewVideoRef.current) {
      reviewVideoRef.current.currentTime = time;
    }
    generateCoverFrame(videoPreview, time);
  }

  function handleFileSelect(file) {
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setError('Please select a valid vertical video file (MP4, WebM, or MOV).');
      return;
    }
    processSelectedVideo(file);
  }

  function handleAddHashtag(tag) {
    setCaption((prev) => (prev ? `${prev} ${tag}` : tag));
  }

  // Cancel / Abort Upload
  function handleCancelUpload() {
    if (uploadXhrRef.current) {
      try {
        uploadXhrRef.current.abort();
      } catch {}
    }
    setUploading(false);
    setUploadProgress(0);
    setError('Upload cancelled.');
  }

  // Final Publish Handler
  async function handlePublishReel(e) {
    if (e) e.preventDefault();
    if (!videoFile) {
      setError('Please record or select a video to post as a reel.');
      return;
    }

    if (!session?.user?.id) {
      window.dispatchEvent(new CustomEvent('shammah:open-auth', { detail: 'signin' }));
      onClose();
      return;
    }

    setUploading(true);
    setUploadProgress(10);
    setError('');

    try {
      // 1. Upload Cover Thumbnail first (if available)
      let thumbUrl = null;
      if (coverBlob) {
        try {
          const coverFile = new File([coverBlob], `thumb-${Date.now()}.jpg`, { type: 'image/jpeg' });
          const uploadedThumb = await uploadPostMedia(coverFile, session.user.id);
          thumbUrl = uploadedThumb?.url || null;
        } catch (tErr) {
          console.warn('[ReelCreator] Cover upload warning:', tErr);
        }
      }
      setUploadProgress(35);

      // 2. Upload Video to 'post-media' bucket with progress reporting
      const uploadedVideo = await uploadPostMedia(videoFile, session.user.id);
      setUploadProgress(85);

      // 3. Insert into posts table
      const reelPayload = {
        author_id: session.user.id,
        church_id: profile?.church_id ?? null,
        category_id: category,
        text_content: caption.trim() || null,
        media_url: uploadedVideo.url,
        media_type: 'reel',
        media_duration_seconds: videoDuration,
        duration_seconds: videoDuration,
        media_thumbnail_url: thumbUrl || uploadedVideo.url,
        thumb_url: thumbUrl || uploadedVideo.url,
        sound_title: soundTitle.trim() || 'Original Sound',
        aspect: '9:16',
        visibility: visibility,
        allow_comments: allowComments,
      };

      const { data: inserted, error: insertError } = await supabase
        .from('posts')
        .insert(reelPayload)
        .select('*, author:profiles(id, display_name, avatar_url, badge, badge_verified, role)')
        .single();

      if (insertError) {
        throw new Error(insertError.message || 'Failed to save reel post.');
      }

      setUploadProgress(100);

      const newPost = inserted || {
        id: 'reel-' + Date.now(),
        ...reelPayload,
        created_at: new Date().toISOString(),
        profiles: {
          display_name: displayName,
          avatar_url: profile?.avatar_url || null,
          badge: profile?.badge || null,
          badge_verified: profile?.badge_verified || false,
          role: profile?.role || 'member',
        },
      };

      // 4. Dispatch real-time events across feed, reels shelf, and profile tabs
      window.dispatchEvent(new CustomEvent('shammah:post-created', { detail: { post: newPost } }));
      window.dispatchEvent(new CustomEvent('shammah:reel-created', { detail: { reel: newPost } }));
      window.dispatchEvent(new CustomEvent('shammah:feed-algorithm-updated'));

      playSound('reaction');
      if (onCreated) onCreated(newPost);
      onClose();
    } catch (err) {
      console.error('[ReelCreator] Publish error:', err);
      setError(err.message || 'Failed to publish reel. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <PopupSheet
      open={isOpen}
      onClose={() => {
        if (!uploading) {
          stopCameraStream();
          onClose();
        }
      }}
      title={
        <div className="flex items-center gap-2 text-[var(--ink)]">
          <span className="w-8 h-8 rounded-full bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
            <Film size={18} />
          </span>
          <div>
            <h3 className="text-sm sm:text-base font-bold leading-tight">Create Faith Reel</h3>
            <p className="text-[11px] text-[var(--ink-muted)]">9:16 vertical testimonies, worship, &amp; sermon clips</p>
          </div>
        </div>
      }
      size="lg"
    >
      <div className="reel-creator-container py-2 text-[var(--ink)]">
        {error && (
          <div className="p-3 mb-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span className="flex-1">{error}</span>
            <button type="button" onClick={() => setError('')} className="text-red-400 hover:text-white">
              <X size={14} />
            </button>
          </div>
        )}

        {/* STEP 1: RECORD OR UPLOAD */}
        {step === 'record' && (
          <div className="flex flex-col gap-4">
            {/* Top Switcher: In-App Camera vs Gallery Upload */}
            <div className="flex rounded-xl bg-[var(--surface-sunken)] p-1 border border-[var(--border)]">
              <button
                type="button"
                className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'camera'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                }`}
                onClick={() => {
                  setActiveTab('camera');
                  setError('');
                }}
              >
                <Camera size={14} /> Record in Camera
              </button>
              <button
                type="button"
                className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'upload'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                }`}
                onClick={() => {
                  setActiveTab('upload');
                  stopCameraStream();
                  setError('');
                }}
              >
                <UploadCloud size={14} /> Upload from Gallery
              </button>
            </div>

            {/* TAB A: CAMERA RECORDING */}
            {activeTab === 'camera' && (
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-[9/16] max-h-[60vh] mx-auto w-full max-w-[340px] flex items-center justify-center border border-[var(--border)] shadow-2xl">
                {/* Camera Viewfinder Video */}
                <video
                  ref={videoElementRef}
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                />

                {/* Countdown Overlay */}
                {activeCountdown !== null && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-30">
                    <span className="text-7xl font-extrabold text-white animate-ping">
                      {activeCountdown}
                    </span>
                  </div>
                )}

                {/* Top Controls Overlay */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20 pointer-events-auto">
                  {/* Timer Countdown Toggle */}
                  <button
                    type="button"
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold backdrop-blur-md transition-all ${
                      countdownSetting > 0 ? 'bg-amber-500 text-black' : 'bg-black/40 text-white/90 border border-white/20'
                    }`}
                    onClick={() => setCountdownSetting((prev) => (prev === 0 ? 3 : prev === 3 ? 10 : 0))}
                    title="Self-timer countdown"
                  >
                    <Clock size={12} className="inline mr-1" />
                    {countdownSetting > 0 ? `${countdownSetting}s` : 'Timer'}
                  </button>

                  {/* Flip Camera */}
                  <button
                    type="button"
                    className="p-2 rounded-full bg-black/40 text-white backdrop-blur-md border border-white/20 hover:bg-black/60 transition-all"
                    onClick={handleFlipCamera}
                    title="Flip camera"
                    aria-label="Flip camera"
                  >
                    <SwitchCamera size={16} />
                  </button>
                </div>

                {/* Recording Progress Bar & Timer */}
                {isRecording && (
                  <div className="absolute top-12 left-3 right-3 z-20">
                    <div className="h-1.5 w-full bg-white/30 rounded-full overflow-hidden backdrop-blur-sm">
                      <div
                        className="h-full bg-red-500 transition-all duration-300"
                        style={{ width: `${(recordedSeconds / MAX_RECORDING_SECONDS) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-white/90 font-mono mt-1 px-1">
                      <span className="flex items-center gap-1 font-bold">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        REC {Math.floor(recordedSeconds / 60)}:{(recordedSeconds % 60).toString().padStart(2, '0')}
                      </span>
                      <span>MAX {MAX_RECORDING_SECONDS}s</span>
                    </div>
                  </div>
                )}

                {/* Bottom Camera Action Bar */}
                <div className="absolute bottom-4 inset-x-0 flex items-center justify-around px-6 z-20">
                  {/* Left: Speed selector */}
                  <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md px-2 py-1 rounded-full border border-white/20">
                    {SPEED_OPTIONS.map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          recordingSpeed === spd ? 'bg-purple-600 text-white' : 'text-white/70 hover:text-white'
                        }`}
                        onClick={() => setRecordingSpeed(spd)}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>

                  {/* Center: Main Record / Pause / Stop Button */}
                  {!isRecording ? (
                    <button
                      type="button"
                      className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center p-1 shadow-lg hover:scale-105 active:scale-95 transition-all"
                      onClick={startRecordingProcess}
                      aria-label="Start recording reel"
                    >
                      <div className="w-full h-full rounded-full bg-red-500 hover:bg-red-600 transition-colors" />
                    </button>
                  ) : (
                    <div className="flex items-center gap-3">
                      {/* Pause / Resume */}
                      <button
                        type="button"
                        className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center border border-white/40"
                        onClick={isPaused ? resumeRecording : pauseRecording}
                        aria-label={isPaused ? 'Resume' : 'Pause'}
                      >
                        {isPaused ? <Play size={16} fill="white" /> : <Pause size={16} fill="white" />}
                      </button>

                      {/* Stop & Finish */}
                      <button
                        type="button"
                        className="w-14 h-14 rounded-full border-4 border-red-500 flex items-center justify-center bg-white shadow-xl hover:scale-105 active:scale-95 transition-all"
                        onClick={stopRecording}
                        aria-label="Stop recording"
                      >
                        <Square size={20} className="text-red-600" fill="currentColor" />
                      </button>
                    </div>
                  )}

                  {/* Right: Upload shortcut */}
                  <button
                    type="button"
                    className="p-2.5 rounded-full bg-black/40 text-white backdrop-blur-md border border-white/20 hover:bg-black/60 transition-all"
                    onClick={() => fileInputRef.current?.click()}
                    title="Pick from gallery"
                  >
                    <ImageIcon size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* TAB B: GALLERY UPLOAD */}
            {activeTab === 'upload' && (
              <div
                className={`p-8 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                  dragActive ? 'border-purple-500 bg-purple-500/10' : 'border-[var(--border)] hover:border-purple-500/50'
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  if (e.dataTransfer?.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-14 h-14 mx-auto rounded-full bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-3">
                  <UploadCloud size={26} />
                </div>
                <h4 className="text-sm font-bold text-[var(--ink)]">Select a vertical video from your device</h4>
                <p className="text-xs text-[var(--ink-muted)] mt-1 max-w-sm mx-auto">
                  Drag and drop an MP4, WebM, or QuickTime MOV (up to 100 MB). Portrait 9:16 aspect ratio works best.
                </p>
                <button
                  type="button"
                  className="mt-4 px-4 py-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-md"
                >
                  Choose Video File
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                e.target.value = '';
              }}
            />
          </div>
        )}

        {/* STEP 2: REVIEW & POLISH */}
        {step === 'review' && (
          <div className="flex flex-col lg:grid lg:grid-cols-12 gap-5">
            {/* Left Column: 9:16 Video Preview with blurred backdrop */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="relative w-full max-w-[280px] aspect-[9/16] rounded-2xl overflow-hidden bg-black border border-[var(--border)] shadow-2xl flex items-center justify-center">
                {/* Blurred backdrop fills container nicely */}
                <video
                  src={videoPreview}
                  muted
                  loop
                  autoPlay
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover blur-xl opacity-40 scale-125"
                />

                {/* Primary crisp foreground player */}
                <video
                  ref={reviewVideoRef}
                  src={videoPreview}
                  controls
                  playsInline
                  className="relative z-10 w-full h-full object-contain"
                />

                {/* Duration Badge */}
                <span className="absolute top-3 left-3 z-20 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-mono border border-white/20">
                  {Math.floor(videoDuration / 60)}:{(videoDuration % 60).toString().padStart(2, '0')}
                </span>

                {/* Re-record button */}
                <button
                  type="button"
                  className="absolute top-3 right-3 z-20 p-1.5 rounded-full bg-black/60 text-white backdrop-blur-md border border-white/20 hover:bg-red-600 transition-colors"
                  onClick={() => {
                    setStep('record');
                    setVideoFile(null);
                    setVideoPreview('');
                  }}
                  title="Discard and retake video"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Cover Frame Scrubber Picker */}
              <div className="w-full max-w-[280px] mt-3 p-3 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border)]">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-[var(--ink)] flex items-center gap-1">
                    <ImageIcon size={13} className="text-purple-400" /> Choose Cover Frame
                  </span>
                  <span className="text-[10px] text-[var(--ink-muted)] font-mono">
                    {coverScrubTime.toFixed(1)}s
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={videoDuration || 1}
                  step="0.1"
                  value={coverScrubTime}
                  onChange={handleScrubCoverChange}
                  className="w-full accent-purple-600 cursor-pointer h-1.5 bg-[var(--border)] rounded-lg"
                />
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-10 h-14 rounded-md overflow-hidden bg-black shrink-0 border border-[var(--border)] relative">
                    {coverPreviewUrl ? (
                      <img src={coverPreviewUrl} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Loader2 size={12} className="animate-spin text-purple-400" />
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-[var(--ink-muted)] leading-tight">
                    Scrub the slider to choose the perfect cover thumbnail for feed &amp; reels strip.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Meta details, caption, sound, visibility, publish */}
            <div className="lg:col-span-7 flex flex-col gap-3">
              {/* Caption with Mention/Hashtags */}
              <div>
                <label className="block text-xs font-semibold mb-1 text-[var(--ink)]">
                  Caption &amp; Message
                </label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Share what God did, a word of encouragement, or verse..."
                  rows={3}
                  maxLength={500}
                  className="w-full text-xs p-3 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border)] text-[var(--ink)] focus:outline-none focus:border-purple-500 transition-colors resize-none"
                />
                {/* Hashtag suggestions */}
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {SUGGESTED_HASHTAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--surface-sunken)] border border-[var(--border)] hover:border-purple-400 text-[var(--ink-muted)] hover:text-purple-400 transition-all"
                      onClick={() => handleAddHashtag(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sound / Audio Title */}
              <div>
                <label className="block text-xs font-semibold mb-1 text-[var(--ink)]">
                  Sound / Audio Attribution
                </label>
                <div className="relative">
                  <Volume2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
                  <input
                    type="text"
                    value={soundTitle}
                    onChange={(e) => setSoundTitle(e.target.value)}
                    placeholder="Original Sound - Your Name"
                    maxLength={80}
                    className="w-full text-xs pl-8 pr-3 py-2 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border)] text-[var(--ink)] focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Category Selector */}
              <div>
                <label className="block text-xs font-semibold mb-1 text-[var(--ink)]">
                  Gospel Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {REEL_CATEGORIES.map((cat) => {
                    const isSel = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        className={`p-2 rounded-xl text-left border text-xs flex items-center gap-1.5 transition-all ${
                          isSel
                            ? 'bg-purple-500/15 border-purple-500 text-purple-400 font-semibold'
                            : 'bg-[var(--surface-sunken)] border-[var(--border)] text-[var(--ink-muted)] hover:text-[var(--ink)]'
                        }`}
                        onClick={() => setCategory(cat.id)}
                      >
                        <span>{cat.emoji}</span>
                        <span className="truncate">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Visibility & Comments */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Visibility */}
                <div>
                  <label className="block text-xs font-semibold mb-1 text-[var(--ink)]">
                    Visibility
                  </label>
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border)] text-[var(--ink)] focus:outline-none focus:border-purple-500"
                  >
                    {VISIBILITY_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label} ({opt.desc})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Allow Comments Toggle */}
                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 p-2 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border)] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={allowComments}
                      onChange={(e) => setAllowComments(e.target.checked)}
                      className="accent-purple-600 w-4 h-4 rounded cursor-pointer"
                    />
                    <span className="text-xs font-medium text-[var(--ink)]">Allow disciples to comment</span>
                  </label>
                </div>
              </div>

              {/* Upload Progress Bar */}
              {uploading && (
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 mt-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-purple-300 mb-1">
                    <span className="flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin" /> Publishing Faith Reel...
                    </span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-purple-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      className="text-[11px] text-red-400 hover:text-red-300"
                      onClick={handleCancelUpload}
                    >
                      Cancel Upload
                    </button>
                  </div>
                </div>
              )}

              {/* Bottom Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-[var(--border)] mt-2">
                <button
                  type="button"
                  className="px-4 py-2 text-xs font-semibold rounded-full bg-[var(--surface-sunken)] border border-[var(--border)] text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
                  onClick={() => {
                    setStep('record');
                    setVideoFile(null);
                    setVideoPreview('');
                  }}
                  disabled={uploading}
                >
                  Back to Record
                </button>

                <button
                  type="button"
                  className="px-6 py-2.5 text-xs font-bold rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30 flex items-center gap-2 disabled:opacity-50 transition-all"
                  onClick={handlePublishReel}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Publishing...
                    </>
                  ) : (
                    <>
                      <Send size={14} /> Post Reel Now
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PopupSheet>
  );
}
