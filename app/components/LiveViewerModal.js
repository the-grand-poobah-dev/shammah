'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Eye,
  Heart,
  Send,
  Share2,
  Flag,
  UserPlus,
  UserCheck,
  Radio,
  Clock,
  Volume2,
  VolumeX,
  Maximize2,
  AlertCircle,
  Play,
  RotateCcw,
  Sparkles,
  Pin,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Room, RoomEvent } from 'livekit-client';
import Avatar from './Avatar';
import MemberName from './MemberName';
import {
  fetchLiveStream,
  getViewerToken,
  fetchLiveChatMessages,
  subscribeToLiveChat,
  sendLiveChatMessage,
  sendLiveReaction,
} from '../lib/live/liveApi';
import { toggleFollowAuthor, checkIsFollowing } from '../lib/data/reelsApi';
import { playSound } from '../lib/soundEffects';

export default function LiveViewerModal({
  streamId,
  isOpen = true,
  onClose,
  session,
  profile,
  initialStream = null,
}) {
  const [stream, setStream] = useState(initialStream);
  const [loading, setLoading] = useState(!initialStream);
  const [error, setError] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // LiveKit WebRTC state
  const [isConnecting, setIsConnecting] = useState(true);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [viewerCount, setViewerCount] = useState(initialStream?.viewer_count || 1);
  const [likeCount, setLikeCount] = useState(initialStream?.like_count || 0);

  // Chat & Reactions
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [floatingHearts, setFloatingHearts] = useState([]);
  const [shareToast, setShareToast] = useState('');

  // Refs
  const videoElemRef = useRef(null);
  const audioElemRef = useRef(null);
  const livekitRoomRef = useRef(null);
  const chatScrollRef = useRef(null);

  // 1. Fetch Stream Data & Check Follow State
  useEffect(() => {
    if (!streamId) return;
    let isMounted = true;

    async function loadData() {
      try {
        const data = await fetchLiveStream(streamId);
        if (isMounted) {
          if (data) {
            setStream(data);
            setViewerCount(data.viewer_count || 1);
            setLikeCount(data.like_count || 0);
            if (data.host_id) {
              checkIsFollowing(data.host_id).then((following) => {
                if (isMounted) setIsFollowing(following);
              });
            }
          } else {
            setError('Live broadcast not found.');
          }
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load stream.');
          setLoading(false);
        }
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, [streamId]);

  // 2. Connect to LiveKit Room as Viewer
  useEffect(() => {
    if (!streamId || stream?.status === 'ended') {
      setIsConnecting(false);
      return;
    }

    let room = null;
    let isMounted = true;

    async function joinRoom() {
      try {
        const { token, url } = await getViewerToken(streamId);
        if (!isMounted) return;

        room = new Room({ adaptiveStream: true, dynacast: true });
        livekitRoomRef.current = room;

        room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
          if (track.kind === 'video') {
            setHasRemoteVideo(true);
            if (videoElemRef.current) {
              track.attach(videoElemRef.current);
            }
          } else if (track.kind === 'audio') {
            if (audioElemRef.current) {
              track.attach(audioElemRef.current);
            }
          }
        });

        room.on(RoomEvent.TrackUnsubscribed, (track) => {
          track.detach();
        });

        room.on(RoomEvent.Disconnected, () => {
          if (isMounted) {
            setStream((prev) => (prev ? { ...prev, status: 'ended' } : prev));
          }
        });

        await room.connect(url, token);
        if (isMounted) setIsConnecting(false);
      } catch (connErr) {
        console.warn('[LiveViewer] LiveKit connection fallback:', connErr);
        if (isMounted) setIsConnecting(false);
      }
    }

    joinRoom();

    return () => {
      isMounted = false;
      if (room) {
        try { room.disconnect(); } catch {}
      }
    };
  }, [streamId, stream?.status]);

  // 3. Load Chat Messages & Realtime Subscription
  useEffect(() => {
    if (!streamId) return;

    fetchLiveChatMessages(streamId).then((msgs) => setChatMessages(msgs));

    const unsub = subscribeToLiveChat(
      streamId,
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
  }, [streamId]);

  // Follow Host Handler
  async function handleToggleFollow() {
    if (!stream?.host_id) return;
    if (!session?.user) {
      window.dispatchEvent(new CustomEvent('shammah:open-auth', { detail: 'signin' }));
      return;
    }
    setFollowLoading(true);
    try {
      const { following } = await toggleFollowAuthor(stream.host_id);
      setIsFollowing(following);
      playSound('reaction');
    } catch (err) {
      console.warn('Follow error:', err);
    } finally {
      setFollowLoading(false);
    }
  }

  // Send Chat Message
  async function handleSendMessage(e) {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !streamId) return;

    if (!session?.user) {
      window.dispatchEvent(new CustomEvent('shammah:open-auth', { detail: 'signin' }));
      return;
    }

    const text = chatInput.trim();
    setChatInput('');

    try {
      const sent = await sendLiveChatMessage(streamId, text, {
        id: session.user.id,
        display_name: profile?.display_name || 'Member',
        avatar_url: profile?.avatar_url,
        badge: profile?.badge,
        role: profile?.role,
      });
      setChatMessages((prev) => [...prev, sent]);
    } catch (err) {
      setError(err.message || 'Could not send message.');
    }
  }

  // Send Floating Heart Reaction
  function handleHeartReaction() {
    setLikeCount((l) => l + 1);
    const newHeart = {
      id: Math.random().toString(),
      left: Math.floor(Math.random() * 60) + 20,
    };
    setFloatingHearts((prev) => [...prev, newHeart]);
    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
    }, 2000);
    sendLiveReaction(streamId, '❤️').catch(() => {});
  }

  // Share Stream
  function handleShare() {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/live/${streamId}` : '';
    if (navigator.share) {
      navigator.share({
        title: stream?.title || 'Watch Live on Shammah',
        text: `Watch ${stream?.host?.display_name || 'live broadcast'} on Shammah`,
        url,
      }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setShareToast('Link copied to clipboard!');
      setTimeout(() => setShareToast(''), 3000);
    }
  }

  // Report Stream
  function handleReport() {
    window.dispatchEvent(
      new CustomEvent('shammah:open-report', {
        detail: {
          targetType: 'live_stream',
          targetId: streamId,
          title: stream?.title || 'Live Stream',
        },
      })
    );
  }

  if (!isOpen) return null;

  const isEnded = stream?.status === 'ended';

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col text-white select-none overflow-hidden">
      {/* Video Viewport Container (Contain / Center) */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center bg-black overflow-hidden">
        {/* Remote Live Video Player */}
        <video
          ref={videoElemRef}
          playsInline
          autoPlay
          muted={isMuted}
          className={`w-full h-full max-h-screen object-contain transition-opacity duration-500 ${
            hasRemoteVideo && !isEnded ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <audio ref={audioElemRef} autoPlay muted={isMuted} />

        {/* Backdrop Thumbnail when video is loading or connecting */}
        {(!hasRemoteVideo || isEnded) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-neutral-950">
            {stream?.thumb_url ? (
              <img
                src={stream.thumb_url}
                alt=""
                className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-20"
              />
            ) : null}

            {isEnded ? (
              <div className="relative z-10 flex flex-col items-center max-w-sm">
                <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-500 mb-3">
                  <Radio size={28} />
                </div>
                <h3 className="text-xl font-black text-white">This broadcast has ended</h3>
                <p className="text-xs text-neutral-400 mt-1 mb-5">
                  Thanks for tuning into this sanctuary moment with {stream?.host?.display_name || 'the host'}.
                </p>
                <button
                  type="button"
                  className="px-6 py-2.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white shadow-lg"
                  onClick={onClose}
                >
                  Return to Feed
                </button>
              </div>
            ) : isConnecting ? (
              <div className="relative z-10 flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
                <span className="text-xs font-bold text-neutral-300">Connecting to sanctuary feed...</span>
              </div>
            ) : (
              <div className="relative z-10 flex flex-col items-center gap-2">
                <Avatar
                  name={stream?.host?.display_name || 'Host'}
                  src={stream?.host?.avatar_url}
                  size={64}
                  className="mb-2 ring-4 ring-red-500/50"
                />
                <h4 className="text-base font-bold text-white">{stream?.title}</h4>
                <p className="text-xs text-neutral-400">Waiting for video stream to start...</p>
              </div>
            )}
          </div>
        )}

        {/* Share Toast */}
        {shareToast && (
          <div className="absolute top-16 inset-x-0 mx-auto w-max px-4 py-2 rounded-full bg-emerald-500 text-black text-xs font-bold shadow-xl z-50">
            {shareToast}
          </div>
        )}

        {/* Floating Hearts Reaction Canvas */}
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

        {/* ======================================================================= */}
        {/* TOP BAR OVERLAY: Host Info, LIVE badge, Viewers, Actions, Close        */}
        {/* ======================================================================= */}
        <div className="absolute top-0 inset-x-0 p-3 sm:p-5 flex items-center justify-between z-30 bg-gradient-to-b from-black/80 via-black/30 to-transparent">
          {/* Left: Host Avatar, Name, Follow button */}
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Avatar
                name={stream?.host?.display_name || 'Host'}
                src={stream?.host?.avatar_url}
                size={38}
                className="ring-2 ring-red-500"
              />
              <span className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded bg-red-600 text-white text-[8px] font-black uppercase tracking-tight">
                LIVE
              </span>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <MemberName
                  name={stream?.host?.display_name || 'Host'}
                  role={stream?.host?.role}
                  badge={stream?.host?.badge}
                  badgeVerified={stream?.host?.badge_verified}
                  className="text-xs font-bold text-white max-w-[140px] truncate"
                />
              </div>
              <span className="text-[10px] text-white/70 truncate max-w-[150px]">
                {stream?.title}
              </span>
            </div>

            {/* Follow Button */}
            {session?.user?.id !== stream?.host_id && (
              <button
                type="button"
                className={`ml-1 px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 transition-all ${
                  isFollowing
                    ? 'bg-white/20 text-white/90 border border-white/20'
                    : 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/30'
                }`}
                onClick={handleToggleFollow}
                disabled={followLoading}
              >
                {isFollowing ? <UserCheck size={12} /> : <UserPlus size={12} />}
                <span>{isFollowing ? 'Following' : 'Follow'}</span>
              </button>
            )}
          </div>

          {/* Right: Viewers, Share, Report, Close */}
          <div className="flex items-center gap-1.5">
            {/* Viewer Count */}
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/15 text-xs font-bold text-white/90">
              <Eye size={13} className="text-emerald-400" />
              <span>{viewerCount}</span>
            </div>

            {/* Audio Mute */}
            <button
              type="button"
              className="p-2 rounded-full bg-black/50 backdrop-blur-md text-white/90 border border-white/15 hover:bg-black/70"
              onClick={() => setIsMuted(!isMuted)}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>

            {/* Share */}
            <button
              type="button"
              className="p-2 rounded-full bg-black/50 backdrop-blur-md text-white/90 border border-white/15 hover:bg-black/70"
              onClick={handleShare}
              title="Share Stream"
            >
              <Share2 size={15} />
            </button>

            {/* Report */}
            <button
              type="button"
              className="p-2 rounded-full bg-black/50 backdrop-blur-md text-white/90 border border-white/15 hover:bg-black/70"
              onClick={handleReport}
              title="Report Stream"
            >
              <Flag size={15} />
            </button>

            {/* Close */}
            <button
              type="button"
              className="p-2 rounded-full bg-black/50 backdrop-blur-md text-white/90 border border-white/15 hover:bg-black/70"
              onClick={onClose}
              title="Close Stream"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* BOTTOM OVERLAY: Live Chat & Realtime Heart Replay                      */}
        {/* ======================================================================= */}
        <div className="absolute bottom-0 inset-x-0 p-3 sm:p-5 flex flex-col justify-end z-30 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none">
          <div className="w-full max-w-md pointer-events-auto flex flex-col gap-2">
            {/* Chat List */}
            <div
              ref={chatScrollRef}
              className="max-h-48 overflow-y-auto flex flex-col gap-1.5 pr-2 no-scrollbar mask-gradient-top"
            >
              {chatMessages.map((msg) => {
                if (msg.is_deleted) return null;
                const isHost = msg.user_id === stream?.host_id;
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2 p-2 rounded-xl backdrop-blur-md border ${
                      msg.is_pinned
                        ? 'bg-amber-500/25 border-amber-500/50'
                        : 'bg-black/40 border-white/10'
                    }`}
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

            {/* Input Bar & Heart Button */}
            {!isEnded && (
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Send prayer or message..."
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
                  onClick={handleHeartReaction}
                  title="Amen / Love"
                >
                  <Heart size={18} fill="currentColor" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
