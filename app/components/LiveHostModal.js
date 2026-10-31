'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Radio,
  X,
  Mic,
  MicOff,
  Video,
  VideoOff,
  SwitchCamera,
  Users,
  Eye,
  Heart,
  Send,
  Pin,
  Trash2,
  Ban,
  Clock,
  Sparkles,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle,
  Calendar,
  Share2,
  Globe,
  Church,
  Lock,
  ChevronDown,
  Shield,
  MoreVertical,
  Flag,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Room, RoomEvent, VideoPresets } from 'livekit-client';
import Avatar from './Avatar';
import MemberName from './MemberName';
import {
  startLiveStream,
  endLiveStream,
  subscribeToLiveChat,
  sendLiveChatMessage,
  sendLiveReaction,
  moderateLiveStream,
  fetchLiveChatMessages,
} from '../lib/live/liveApi';
import { playSound } from '../lib/soundEffects';

const VISIBILITY_OPTIONS = [
  { id: 'public', label: 'Public Broadcast', icon: Globe, desc: 'Visible to everyone' },
  { id: 'followers', label: 'Followers Only', icon: Users, desc: 'Only disciples who follow you' },
  { id: 'church', label: 'Church Sanctuary', icon: Church, desc: 'Restricted to church members' },
];

export default function LiveHostModal({
  isOpen,
  onClose,
  session,
  profile,
  onStreamCreated,
}) {
  // State: 'setup' | 'countdown' | 'broadcasting' | 'ended'
  const [stage, setStage] = useState('setup');
  const [countdown, setCountdown] = useState(3);

  // Setup Form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');

  // Hardware Controls
  const [facingMode, setFacingMode] = useState('user'); // 'user' or 'environment'
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [networkQuality, setNetworkQuality] = useState('good'); // 'good' | 'fair' | 'poor'
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Live broadcast runtime state
  const [streamData, setStreamData] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [viewerCount, setViewerCount] = useState(0);
  const [peakViewers, setPeakViewers] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const [floatingHearts, setFloatingHearts] = useState([]);

  // Chat & Moderation
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [selectedMessageForMod, setSelectedMessageForMod] = useState(null);
  const [showConfirmEnd, setShowConfirmEnd] = useState(false);
  const [endedSummary, setEndedSummary] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refs
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const livekitRoomRef = useRef(null);
  const timerRef = useRef(null);
  const chatScrollRef = useRef(null);

  // Network check
  useEffect(() => {
    function updateOnlineStatus() {
      if (typeof navigator !== 'undefined') {
        setNetworkQuality(navigator.onLine ? 'good' : 'poor');
      }
    }
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // Initialize Local Camera Viewfinder
  const initLocalMedia = useCallback(async () => {
    setErrorMsg('');
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => {
        try { t.stop(); } catch {}
      });
      localStreamRef.current = null;
    }

    if (typeof window === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
      setErrorMsg('Camera access is not supported on this browser.');
      return;
    }

    try {
      const constraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      // Apply initial mic/camera mute states
      stream.getAudioTracks().forEach((t) => (t.enabled = micEnabled));
      stream.getVideoTracks().forEach((t) => (t.enabled = cameraEnabled));

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        try {
          await localVideoRef.current.play();
        } catch {
          localVideoRef.current.muted = true;
          await localVideoRef.current.play();
        }
      }
    } catch (err) {
      console.warn('[LiveHostModal] local camera error:', err);
      setErrorMsg('Camera or microphone permission was denied. Please allow access.');
    }
  }, [facingMode, micEnabled, cameraEnabled]);

  // Start media stream when setup begins
  useEffect(() => {
    if (isOpen && (stage === 'setup' || stage === 'broadcasting')) {
      initLocalMedia();
    }
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => {
          try { t.stop(); } catch {}
        });
        localStreamRef.current = null;
      }
    };
  }, [isOpen, stage, facingMode, initLocalMedia]);

  // Toggle Mic
  function toggleMic() {
    const nextState = !micEnabled;
    setMicEnabled(nextState);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = nextState));
    }
    if (livekitRoomRef.current?.localParticipant) {
      livekitRoomRef.current.localParticipant.setMicrophoneEnabled(nextState).catch(() => {});
    }
  }

  // Toggle Camera
  function toggleCamera() {
    const nextState = !cameraEnabled;
    setCameraEnabled(nextState);
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = nextState));
    }
    if (livekitRoomRef.current?.localParticipant) {
      livekitRoomRef.current.localParticipant.setCameraEnabled(nextState).catch(() => {});
    }
  }

  // Flip Camera
  function flipCamera() {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  }

  // Start Broadcast Process
  async function handleGoLiveClick() {
    if (!title.trim()) {
      setErrorMsg('Please enter a title for your broadcast.');
      return;
    }

    if (isScheduled && !scheduledDate) {
      setErrorMsg('Please choose a date and time for your scheduled stream.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      // 1. Call /api/live/start
      const res = await startLiveStream({
        title: title.trim(),
        description: description.trim() || null,
        visibility,
        scheduled_for: isScheduled ? new Date(scheduledDate).toISOString() : null,
        church_id: profile?.church_id || null,
      });

      setStreamData(res.stream);
      if (onStreamCreated) onStreamCreated(res.stream);

      // If scheduled, show friendly success and close
      if (isScheduled) {
        setIsSubmitting(false);
        playSound('reaction');
        onClose();
        return;
      }

      // 2. Launch 3-2-1 Countdown
      setStage('countdown');
      setCountdown(3);
      playSound('pop');

      let currentCount = 3;
      const countInterval = setInterval(async () => {
        currentCount -= 1;
        if (currentCount > 0) {
          setCountdown(currentCount);
          playSound('pop');
        } else {
          clearInterval(countInterval);
          await connectLiveKitRoom(res.url, res.token, res.stream);
        }
      }, 1000);
    } catch (err) {
      console.error('[handleGoLiveClick] error:', err);
      setErrorMsg(err.message || 'Failed to initialize live broadcast.');
      setIsSubmitting(false);
      setStage('setup');
    }
  }

  // Connect to LiveKit Room
  async function connectLiveKitRoom(livekitUrl, token, stream) {
    try {
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: VideoPresets.h720.resolution,
        },
      });
      livekitRoomRef.current = room;

      room.on(RoomEvent.Reconnecting, () => setIsReconnecting(true));
      room.on(RoomEvent.Reconnected, () => setIsReconnecting(false));
      room.on(RoomEvent.ParticipantConnected, () => {
        setViewerCount((c) => {
          const next = c + 1;
          setPeakViewers((p) => Math.max(p, next));
          return next;
        });
      });
      room.on(RoomEvent.ParticipantDisconnected, () => {
        setViewerCount((c) => Math.max(0, c - 1));
      });

      if (livekitUrl && token) {
        try {
          await room.connect(livekitUrl, token);
          await room.localParticipant.enableCameraAndMicrophone();
        } catch (connErr) {
          console.warn('[LiveKit Connect] Server connection warning (falling back to local stream preview):', connErr);
        }
      }

      setStage('broadcasting');
      setIsSubmitting(false);
      playSound('celebrate');

      // Start duration timer
      timerRef.current = setInterval(() => {
        setElapsedSeconds((sec) => sec + 1);
      }, 1000);

      // Initial chat & subscribe to Realtime chat
      fetchLiveChatMessages(stream.id).then((msgs) => setChatMessages(msgs));
    } catch (err) {
      console.error('[connectLiveKitRoom] error:', err);
      setStage('broadcasting'); // Still allow broadcast UI in resilient mode
      setIsSubmitting(false);
    }
  }

  // Subscribe to Realtime Chat during broadcast
  useEffect(() => {
    if (stage !== 'broadcasting' || !streamData?.id) return;

    const unsub = subscribeToLiveChat(
      streamData.id,
      (newMsg) => {
        setChatMessages((prev) => [...prev, newMsg]);
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      },
      (updatedMsg) => {
        setChatMessages((prev) =>
          prev.map((m) => (m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m))
        );
      }
    );

    return unsub;
  }, [stage, streamData?.id]);

  // Clean up on beforeunload
  useEffect(() => {
    function handleBeforeUnload() {
      if (stage === 'broadcasting' && streamData?.id) {
        endLiveStream(streamData.id).catch(() => {});
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [stage, streamData?.id]);

  // Send Host Chat Message
  async function handleSendChatMessage(e) {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !streamData?.id) return;

    const text = chatInput.trim();
    setChatInput('');

    try {
      const sent = await sendLiveChatMessage(streamData.id, text, {
        id: session?.user?.id,
        display_name: profile?.display_name || 'Host',
        avatar_url: profile?.avatar_url,
        badge: profile?.badge,
        role: profile?.role,
      });
      setChatMessages((prev) => [...prev, sent]);
    } catch (err) {
      console.warn('[handleSendChatMessage] error:', err);
    }
  }

  // Moderation Handler
  async function handleModerationAction(action) {
    if (!selectedMessageForMod || !streamData?.id) return;
    const msg = selectedMessageForMod;
    setSelectedMessageForMod(null);

    try {
      await moderateLiveStream({
        streamId: streamData.id,
        action,
        messageId: msg.id,
        targetUserId: msg.user_id,
      });

      if (action === 'pin_message' || action === 'pin') {
        setChatMessages((prev) =>
          prev.map((m) => ({ ...m, is_pinned: m.id === msg.id }))
        );
      } else if (action === 'delete_message' || action === 'delete') {
        setChatMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, is_deleted: true } : m))
        );
      } else if (action === 'ban_user' || action === 'ban') {
        setChatMessages((prev) =>
          prev.map((m) => (m.user_id === msg.user_id ? { ...m, is_deleted: true } : m))
        );
      }
    } catch (err) {
      console.error('[handleModerationAction] error:', err);
    }
  }

  // Floating Reaction Trigger
  function triggerHeartReaction() {
    setLikeCount((l) => l + 1);
    const newHeart = {
      id: Math.random().toString(),
      left: Math.floor(Math.random() * 60) + 20,
    };
    setFloatingHearts((prev) => [...prev, newHeart]);
    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
    }, 2000);
    if (streamData?.id) sendLiveReaction(streamData.id, '❤️').catch(() => {});
  }

  // End Broadcast Handler
  async function handleEndBroadcast() {
    if (timerRef.current) clearInterval(timerRef.current);
    setShowConfirmEnd(false);

    try {
      if (livekitRoomRef.current) {
        livekitRoomRef.current.disconnect();
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => {
          try { t.stop(); } catch {}
        });
      }

      if (streamData?.id) {
        const res = await endLiveStream(streamData.id);
        setEndedSummary({
          duration: elapsedSeconds,
          peakViewers: Math.max(peakViewers, viewerCount),
          likes: likeCount,
          newFollowers: 0,
        });
      }
      setStage('ended');
      playSound('reaction');
    } catch (err) {
      console.error('[handleEndBroadcast] error:', err);
      setStage('ended');
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col overflow-hidden text-white select-none">
      {/* Viewfinder Video Stream (Shared across stages) */}
      <div className="absolute inset-0 w-full h-full bg-black overflow-hidden flex items-center justify-center">
        <video
          ref={localVideoRef}
          playsInline
          muted
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            cameraEnabled ? 'opacity-100' : 'opacity-20'
          } ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
        />
        {!cameraEnabled && (
          <div className="absolute flex flex-col items-center gap-2 text-white/60">
            <VideoOff size={48} />
            <span className="text-xs font-semibold">Camera is Turned Off</span>
          </div>
        )}
      </div>

      {/* RECONNECTING BANNER */}
      {isReconnecting && (
        <div className="absolute top-4 inset-x-4 z-40 bg-amber-500/90 backdrop-blur-md text-black font-bold text-xs py-2 px-4 rounded-xl flex items-center justify-center gap-2 shadow-xl animate-pulse">
          <WifiOff size={16} /> Reconnecting broadcast stream...
        </div>
      )}

      {/* 3-2-1 COUNTDOWN OVERLAY */}
      {stage === 'countdown' && (
        <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center">
          <motion.div
            key={countdown}
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="text-8xl sm:text-9xl font-black text-red-500 tracking-tighter drop-shadow-[0_0_35px_rgba(239,68,68,0.8)]"
          >
            {countdown}
          </motion.div>
          <span className="text-sm font-semibold text-white/80 uppercase tracking-widest mt-4">
            Sanctuary Going Live...
          </span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 1: PRE-LIVE SETUP                                                   */}
      {/* ========================================================================= */}
      {stage === 'setup' && (
        <div className="relative z-30 flex flex-col justify-between h-full p-4 sm:p-6 bg-gradient-to-t from-black/90 via-black/40 to-black/80">
          {/* Top Bar: Title, Network Check, Close */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span className="text-xs font-bold uppercase tracking-wider">Live Sanctuary Setup</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Network Indicator */}
              <div
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-md border ${
                  networkQuality === 'good'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-red-500/20 text-red-400 border-red-500/30'
                }`}
              >
                <Wifi size={12} />
                <span>{networkQuality === 'good' ? 'Connection Good' : 'Low Connection'}</span>
              </div>

              {/* Close Button */}
              <button
                type="button"
                className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md text-white/80 hover:text-white flex items-center justify-center border border-white/10"
                onClick={onClose}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Error Notice */}
          {errorMsg && (
            <div className="p-3 my-2 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Center Form Sheet */}
          <div className="w-full max-w-md mx-auto flex flex-col gap-3 my-auto">
            {/* Title Input */}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What is this live broadcast about? (e.g. Sunday Worship, Evening Prayer Vigil)"
              maxLength={100}
              className="w-full px-4 py-3 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/20 text-white placeholder-white/40 text-sm font-semibold focus:outline-none focus:border-red-500 shadow-2xl"
            />

            {/* Description */}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details, scriptures, or prayer requests (optional)..."
              rows={2}
              maxLength={280}
              className="w-full px-4 py-2.5 rounded-xl bg-black/50 backdrop-blur-xl border border-white/15 text-white placeholder-white/40 text-xs focus:outline-none focus:border-red-500 resize-none shadow-xl"
            />

            {/* Visibility Selector */}
            <div className="grid grid-cols-3 gap-2">
              {VISIBILITY_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSel = visibility === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`py-2 px-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all backdrop-blur-md ${
                      isSel
                        ? 'bg-red-500/25 border-red-500 text-white font-bold'
                        : 'bg-black/40 border-white/10 text-white/60 hover:text-white'
                    }`}
                    onClick={() => setVisibility(opt.id)}
                  >
                    <Icon size={14} className={isSel ? 'text-red-400' : ''} />
                    <span className="text-[11px] leading-tight truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Schedule Later Toggle */}
            <div className="p-3 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 flex flex-col gap-2">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-semibold text-white/90 flex items-center gap-1.5">
                  <Calendar size={14} className="text-amber-400" /> Schedule for Later
                </span>
                <input
                  type="checkbox"
                  checked={isScheduled}
                  onChange={(e) => setIsScheduled(e.target.checked)}
                  className="accent-red-500 w-4 h-4 rounded"
                />
              </label>

              {isScheduled && (
                <input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full p-2 rounded-lg bg-black/60 border border-white/20 text-white text-xs focus:outline-none focus:border-red-500"
                />
              )}
            </div>
          </div>

          {/* Bottom Controls Bar: Flip camera, mic, camera, GO LIVE */}
          <div className="w-full max-w-md mx-auto flex items-center justify-between gap-4 pt-4">
            <div className="flex items-center gap-2">
              {/* Mic Toggle */}
              <button
                type="button"
                className={`p-3 rounded-full backdrop-blur-md border transition-all ${
                  micEnabled ? 'bg-black/60 border-white/20 text-white' : 'bg-red-500/80 border-red-400 text-white'
                }`}
                onClick={toggleMic}
                title={micEnabled ? 'Mute Mic' : 'Unmute Mic'}
              >
                {micEnabled ? <Mic size={20} /> : <MicOff size={20} />}
              </button>

              {/* Camera Toggle */}
              <button
                type="button"
                className={`p-3 rounded-full backdrop-blur-md border transition-all ${
                  cameraEnabled ? 'bg-black/60 border-white/20 text-white' : 'bg-red-500/80 border-red-400 text-white'
                }`}
                onClick={toggleCamera}
                title={cameraEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
              >
                {cameraEnabled ? <Video size={20} /> : <VideoOff size={20} />}
              </button>

              {/* Flip Camera */}
              <button
                type="button"
                className="p-3 rounded-full bg-black/60 border border-white/20 text-white backdrop-blur-md hover:bg-black/80"
                onClick={flipCamera}
                title="Flip Camera"
              >
                <SwitchCamera size={20} />
              </button>
            </div>

            {/* Big GO LIVE Button */}
            <button
              type="button"
              className="flex-1 py-3.5 px-6 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(239,68,68,0.5)] flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
              onClick={handleGoLiveClick}
              disabled={isSubmitting}
            >
              <Radio size={18} />
              <span>{isScheduled ? 'Save Scheduled Broadcast' : 'Go Live Now'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 2: LIVE BROADCASTING DASHBOARD                                      */}
      {/* ========================================================================= */}
      {stage === 'broadcasting' && (
        <div className="relative z-30 flex flex-col justify-between h-full p-3 sm:p-5 pointer-events-none">
          {/* Top Bar: LIVE badge, Timer, Viewer Count, End Button */}
          <div className="flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-2">
              {/* LIVE Red Pulsing Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-red-600/50">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span>LIVE</span>
              </div>

              {/* Elapsed Timer */}
              <div className="px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white font-mono text-xs font-bold">
                {Math.floor(elapsedSeconds / 3600) > 0
                  ? `${Math.floor(elapsedSeconds / 3600)}:`
                  : ''}
                {Math.floor((elapsedSeconds % 3600) / 60).toString().padStart(2, '0')}:
                {(elapsedSeconds % 60).toString().padStart(2, '0')}
              </div>

              {/* Viewer Count */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white/90 text-xs font-semibold">
                <Eye size={13} className="text-emerald-400" />
                <span>{viewerCount}</span>
              </div>
            </div>

            {/* End Stream & Tools */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="p-2 rounded-full bg-black/50 backdrop-blur-md text-white border border-white/10"
                onClick={flipCamera}
                title="Flip Camera"
              >
                <SwitchCamera size={16} />
              </button>

              <button
                type="button"
                className="px-3.5 py-1.5 rounded-full bg-red-600/90 hover:bg-red-600 text-white text-xs font-bold shadow-lg transition-all"
                onClick={() => setShowConfirmEnd(true)}
              >
                End
              </button>
            </div>
          </div>

          {/* Floating Reaction Hearts container */}
          <div className="absolute right-4 bottom-28 w-16 h-80 pointer-events-none overflow-hidden z-20">
            {floatingHearts.map((heart) => (
              <motion.div
                key={heart.id}
                initial={{ y: 280, opacity: 1, scale: 0.6 }}
                animate={{ y: -40, opacity: 0, scale: 1.4 }}
                transition={{ duration: 1.8, ease: 'easeOut' }}
                className="absolute text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                style={{ left: `${heart.left}%` }}
              >
                ❤️
              </motion.div>
            ))}
          </div>

          {/* Bottom Area: Realtime Chat Overlay & Host Input */}
          <div className="w-full max-w-md pointer-events-auto flex flex-col gap-2">
            {/* Scrollable Live Chat Feed (Semi-transparent) */}
            <div
              ref={chatScrollRef}
              className="max-h-48 overflow-y-auto flex flex-col gap-1.5 pr-2 no-scrollbar mask-gradient-top"
            >
              {chatMessages.map((msg) => {
                if (msg.is_deleted) return null;
                const isHost = msg.user_id === session?.user?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2 p-2 rounded-xl backdrop-blur-md border transition-all ${
                      msg.is_pinned
                        ? 'bg-amber-500/25 border-amber-500/50'
                        : 'bg-black/40 border-white/10'
                    }`}
                    onClick={() => setSelectedMessageForMod(msg)}
                  >
                    <Avatar
                      name={msg.user?.display_name || 'Member'}
                      src={msg.user?.avatar_url}
                      size={24}
                      className="shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-white/90 truncate">
                          {msg.user?.display_name || 'Member'}
                        </span>
                        {isHost && (
                          <span className="text-[9px] bg-red-600 px-1 py-0.2 rounded font-extrabold uppercase">
                            Host
                          </span>
                        )}
                        {msg.is_pinned && (
                          <span className="text-[9px] text-amber-400 font-bold flex items-center gap-0.5">
                            <Pin size={9} /> Pinned
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/80 break-words leading-tight mt-0.5">
                        {msg.body}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chat Bar & Heart Button */}
            <form onSubmit={handleSendChatMessage} className="flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Say something to your sanctuary..."
                maxLength={200}
                className="flex-1 px-4 py-2 rounded-full bg-black/60 backdrop-blur-xl border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-red-500"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="p-2 rounded-full bg-red-600 text-white disabled:opacity-40"
              >
                <Send size={15} />
              </button>

              {/* Heart Burst Button */}
              <button
                type="button"
                className="p-2 rounded-full bg-white/20 backdrop-blur-md text-red-500 active:scale-125 transition-transform"
                onClick={triggerHeartReaction}
                title="Send Love"
              >
                <Heart size={18} fill="currentColor" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODERATION ACTION SHEET */}
      {selectedMessageForMod && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-neutral-900 border border-neutral-800 p-4 shadow-2xl text-[var(--ink)]">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800 mb-3">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Shield size={14} className="text-red-400" /> Moderate Message
              </span>
              <button type="button" onClick={() => setSelectedMessageForMod(null)} className="text-neutral-400 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-neutral-300 italic mb-4 bg-black/40 p-2.5 rounded-lg border border-neutral-800">
              &quot;{selectedMessageForMod.body}&quot;
            </p>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="w-full py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white flex items-center gap-2"
                onClick={() => handleModerationAction(selectedMessageForMod.is_pinned ? 'unpin_message' : 'pin_message')}
              >
                <Pin size={14} className="text-amber-400" />
                <span>{selectedMessageForMod.is_pinned ? 'Unpin Message' : 'Pin to Top of Chat'}</span>
              </button>

              <button
                type="button"
                className="w-full py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-red-400 flex items-center gap-2"
                onClick={() => handleModerationAction('delete_message')}
              >
                <Trash2 size={14} />
                <span>Delete Message</span>
              </button>

              <button
                type="button"
                className="w-full py-2 px-3 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-xs font-semibold text-red-400 flex items-center gap-2"
                onClick={() => handleModerationAction('ban_user')}
              >
                <Ban size={14} />
                <span>Ban {selectedMessageForMod.user?.display_name || 'User'} from Stream</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM END BROADCAST MODAL */}
      {showConfirmEnd && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-neutral-900 border border-neutral-800 p-5 shadow-2xl text-center">
            <h4 className="text-base font-bold text-white mb-2">End Live Broadcast?</h4>
            <p className="text-xs text-neutral-400 mb-5 leading-relaxed">
              Ending this broadcast will disconnect all connected disciples and publish the broadcast summary.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 py-2.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white"
                onClick={() => setShowConfirmEnd(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex-1 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-xs font-bold text-white shadow-lg shadow-red-600/30"
                onClick={handleEndBroadcast}
              >
                Yes, End Stream
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 3: POST-BROADCAST SUMMARY CARD                                      */}
      {/* ========================================================================= */}
      {stage === 'ended' && (
        <div className="relative z-50 flex items-center justify-center h-full p-4 bg-black/85 backdrop-blur-xl">
          <div className="w-full max-w-md rounded-3xl bg-neutral-900 border border-neutral-800 p-6 shadow-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-500 mb-3 shadow-[0_0_20px_rgba(239,68,68,0.4)]">
              <CheckCircle size={32} />
            </div>

            <h3 className="text-lg font-black text-white">Broadcast Finished</h3>
            <p className="text-xs text-neutral-400 mt-1 mb-6">
              Great ministry work! Here is how your congregation engaged:
            </p>

            <div className="grid grid-cols-3 gap-3 w-full mb-6">
              <div className="p-3 rounded-2xl bg-black/50 border border-neutral-800 flex flex-col items-center">
                <Clock size={16} className="text-cyan-400 mb-1" />
                <span className="text-lg font-black text-white">
                  {Math.floor((endedSummary?.duration || 0) / 60)}m {(endedSummary?.duration || 0) % 60}s
                </span>
                <span className="text-[10px] text-neutral-400 uppercase font-semibold">Duration</span>
              </div>

              <div className="p-3 rounded-2xl bg-black/50 border border-neutral-800 flex flex-col items-center">
                <Eye size={16} className="text-emerald-400 mb-1" />
                <span className="text-lg font-black text-white">{endedSummary?.peakViewers || 0}</span>
                <span className="text-[10px] text-neutral-400 uppercase font-semibold">Peak Viewers</span>
              </div>

              <div className="p-3 rounded-2xl bg-black/50 border border-neutral-800 flex flex-col items-center">
                <Heart size={16} className="text-rose-400 mb-1" />
                <span className="text-lg font-black text-white">{endedSummary?.likes || 0}</span>
                <span className="text-[10px] text-neutral-400 uppercase font-semibold">Likes</span>
              </div>
            </div>

            <button
              type="button"
              className="w-full py-3 rounded-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-red-600/30"
              onClick={onClose}
            >
              Done &amp; Return to Feed
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
