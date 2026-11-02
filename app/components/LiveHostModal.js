'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Check, ChevronDown, Copy, Heart, Loader2, Mic, MicOff, Radio, Send, Shield, Signal, Video, VideoOff, X } from 'lucide-react';
import { Room, RoomEvent, createLocalTracks } from 'livekit-client';
import { supabase } from '../lib/supabaseClient';

async function postLive(path, session, body) {
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + session.access_token,
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Live broadcast request failed.');
  return payload;
}

export default function LiveHostModal({ isOpen, onClose, session, profile }) {
  const [configured, setConfigured] = useState(null);
  const [checkingConfig, setCheckingConfig] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [stream, setStream] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [viewerCount, setViewerCount] = useState(0);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [previewReady, setPreviewReady] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [endedSummary, setEndedSummary] = useState(null);
  const localVideoRef = useRef(null);
  const tracksRef = useRef([]);
  const roomRef = useRef(null);
  const chatChannelRef = useRef(null);
  const startedAtRef = useRef(null);
  const countdownRef = useRef(null);

  const stopTracks = useCallback(() => {
    tracksRef.current.forEach((track) => {
      try { track.stop(); } catch {}
    });
    tracksRef.current = [];
    setPreviewReady(false);
  }, []);

  const disconnectRoom = useCallback(async () => {
    const room = roomRef.current;
    roomRef.current = null;
    if (room) {
      try { await room.disconnect(); } catch {}
    }
    stopTracks();
  }, [stopTracks]);

  const endBroadcast = useCallback(async (quiet = false) => {
    const active = stream;
    if (!active) {
      await disconnectRoom();
      return;
    }
    setBusy(true);
    try {
      const result = await postLive('/api/live/end', session, { streamId: active.id });
      setEndedSummary({
        title: active.title,
        duration: Math.max(0, Math.floor((Date.now() - (startedAtRef.current || Date.now())) / 1000)),
        peakViewers: result.stream?.peak_viewers ?? viewerCount,
      });
      setStream(null);
      await disconnectRoom();
    } catch (err) {
      if (!quiet) setError(err.message || 'Could not end the broadcast.');
    } finally {
      setBusy(false);
    }
  }, [stream, session, disconnectRoom, viewerCount]);

  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;
    setError('');
    setEndedSummary(null);
    setCheckingConfig(true);
    fetch('/api/live/config')
      .then((response) => response.json())
      .then((payload) => { if (!cancelled) setConfigured(Boolean(payload.configured)); })
      .catch(() => { if (!cancelled) setConfigured(false); })
      .finally(() => { if (!cancelled) setCheckingConfig(false); });

    return () => {
      cancelled = true;
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (chatChannelRef.current) {
        supabase.removeChannel(chatChannelRef.current);
        chatChannelRef.current = null;
      }
      const room = roomRef.current;
      roomRef.current = null;
      if (room) room.disconnect().catch(() => {});
      tracksRef.current.forEach((track) => { try { track.stop(); } catch {} });
      tracksRef.current = [];
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !configured || stream || endedSummary || !session?.access_token) return undefined;
    let cancelled = false;
    async function startPreview() {
      try {
        const tracks = await createLocalTracks({ audio: true, video: { facingMode: 'user' } });
        if (cancelled) {
          tracks.forEach((track) => track.stop());
          return;
        }
        tracksRef.current = tracks;
        const videoTrack = tracks.find((track) => track.kind === 'video');
        if (videoTrack && localVideoRef.current) videoTrack.attach(localVideoRef.current);
        setPreviewReady(Boolean(videoTrack));
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Camera or microphone permission was denied. You can still retry after allowing access.');
      }
    }
    startPreview();
    return () => {
      cancelled = true;
      tracksRef.current.forEach((track) => { try { track.stop(); } catch {} });
      tracksRef.current = [];
    };
  }, [isOpen, configured, session?.access_token]);

  useEffect(() => {
    if (!stream?.id || !session?.access_token) return undefined;
    let sent = false;
    const endOnPageExit = () => {
      if (sent) return;
      sent = true;
      fetch('/api/live/end', {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
        body: JSON.stringify({ streamId: stream.id }),
      }).catch(() => {});
      if (roomRef.current) roomRef.current.disconnect().catch(() => {});
      tracksRef.current.forEach((track) => { try { track.stop(); } catch {} });
      tracksRef.current = [];
    };
    window.addEventListener('pagehide', endOnPageExit);
    window.addEventListener('beforeunload', endOnPageExit);
    return () => {
      window.removeEventListener('pagehide', endOnPageExit);
      window.removeEventListener('beforeunload', endOnPageExit);
    };
  }, [stream?.id, session?.access_token]);

  useEffect(() => {
    if (!stream?.id) return undefined;
    let cancelled = false;
    async function loadChat() {
      const { data, error: loadError } = await supabase.from('live_chat_messages')
        .select('id, stream_id, user_id, body, created_at, is_pinned, is_deleted')
        .eq('stream_id', stream.id).order('created_at', { ascending: true }).limit(100);
      if (!cancelled && !loadError) setMessages(data || []);
    }
    loadChat();
    const channel = supabase.channel('shammah-live-chat-' + stream.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_chat_messages', filter: 'stream_id=eq.' + stream.id }, (payload) => {
        if (payload.eventType === 'INSERT') setMessages((current) => [...current.filter((item) => item.id !== payload.new.id), payload.new].slice(-100));
        if (payload.eventType === 'UPDATE') setMessages((current) => current.map((item) => item.id === payload.new.id ? payload.new : item));
      }).subscribe();
    chatChannelRef.current = channel;
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      if (chatChannelRef.current === channel) chatChannelRef.current = null;
    };
  }, [stream?.id]);

  useEffect(() => {
    if (!stream) return undefined;
    const timer = setInterval(() => {
      if (startedAtRef.current) setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [stream]);

  useEffect(() => {
    if (!stream || !roomRef.current) return undefined;
    const room = roomRef.current;
    const updateCount = () => setViewerCount(Math.max(0, room.remoteParticipants.size));
    room.on(RoomEvent.ParticipantConnected, updateCount);
    room.on(RoomEvent.ParticipantDisconnected, updateCount);
    room.on(RoomEvent.Reconnected, updateCount);
    updateCount();
    return () => {
      room.off(RoomEvent.ParticipantConnected, updateCount);
      room.off(RoomEvent.ParticipantDisconnected, updateCount);
      room.off(RoomEvent.Reconnected, updateCount);
    };
  }, [stream]);

  async function handleGoLive() {
    if (!session?.access_token) { setError('Please sign in again before going live.'); return; }
    if (!title.trim()) { setError('Give your broadcast a title first.'); return; }
    if (!configured) { setError('Live is not configured yet. Add LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET in your deployment environment.'); return; }
    setBusy(true);
    setError('');
    try {
      await new Promise((resolve) => {
        let count = 3;
        setError('Going live in ' + count + '…');
        countdownRef.current = setInterval(() => {
          count -= 1;
          if (count <= 0) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
            resolve();
          } else setError('Going live in ' + count + '…');
        }, 700);
      });
      const started = await postLive('/api/live/start', session, {
        title: title.trim(), description: description.trim(), visibility,
        churchId: profile?.church_id || null,
      });
      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;
      await room.connect(started.url, started.token);
      for (const track of tracksRef.current) {
        if (track.kind === 'audio' && !micEnabled) track.mute();
        if (track.kind === 'video' && !cameraEnabled) track.mute();
        await room.localParticipant.publishTrack(track);
      }
      startedAtRef.current = Date.now();
      setElapsed(0);
      setViewerCount(Math.max(0, room.remoteParticipants.size));
      setMessages([]);
      setStream(started.stream);
      setError('');
    } catch (err) {
      setError(err?.message || 'Could not start the broadcast. Check your camera, microphone and network.');
      if (roomRef.current) {
        try { await roomRef.current.disconnect(); } catch {}
        roomRef.current = null;
      }
    } finally {
      setBusy(false);
    }
  }

  async function shareLive() {
    if (!stream || typeof window === 'undefined') return;
    const url = window.location.origin + '/live/' + stream.id;
    try {
      if (navigator.share) await navigator.share({ title: stream.title || 'Shammah Live', url });
      else {
        await navigator.clipboard.writeText(url);
        setError('Viewer link copied.');
      }
    } catch {}
  }

  async function sendMessage(event) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !stream || !session?.user?.id) return;
    if (body.length > 500) { setError('Chat messages must be 500 characters or fewer.'); return; }
    const { error: insertError } = await supabase.from('live_chat_messages').insert({
      stream_id: stream.id, user_id: session.user.id, body,
    });
    if (insertError) setError(insertError.message || 'Could not send chat message.');
    else setDraft('');
  }

  async function moderate(action, message) {
    try {
      await postLive('/api/live/moderate', session, {
        streamId: stream.id, action, messageId: message.id, userId: message.user_id,
      });
    } catch (err) { setError(err.message || 'Moderation action failed.'); }
  }

  function toggleTrack(kind) {
    const track = tracksRef.current.find((item) => item.kind === kind);
    const enabled = kind === 'audio' ? micEnabled : cameraEnabled;
    const next = !enabled;
    if (track) {
      if (next) track.unmute(); else track.mute();
    }
    if (kind === 'audio') setMicEnabled(next); else setCameraEnabled(next);
  }

  async function handleClose() {
    if (stream && !window.confirm('End your live broadcast and disconnect everyone?')) return;
    if (stream) await endBroadcast();
    else await disconnectRoom();
    onClose?.();
  }

  if (!isOpen) return null;
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins + ':' + String(secs).padStart(2, '0');
  };

  return (
    <div className="sh-live-backdrop" role="dialog" aria-modal="true" aria-label="Live broadcast">
      <section className="sh-live-shell">
        <header className="sh-live-header">
          <div className="sh-live-brand"><Radio size={20} /><span>{stream ? 'You are live' : endedSummary ? 'Broadcast summary' : 'Go live'}</span></div>
          <button type="button" className="sh-live-icon-btn" onClick={handleClose} aria-label="Close live broadcast" disabled={busy}><X size={20} /></button>
        </header>

        {checkingConfig ? <div className="sh-live-state"><Loader2 className="sh-spin" size={28} /><p>Checking live broadcast setup…</p></div> :
        endedSummary ? <div className="sh-live-summary"><Check size={36} /><h2>Broadcast ended</h2><p>{endedSummary.title}</p><div className="sh-live-stats"><span><strong>{formatTime(endedSummary.duration)}</strong>Duration</span><span><strong>{endedSummary.peakViewers}</strong>Peak viewers</span></div><button type="button" className="sh-live-primary" onClick={onClose}>Done</button></div> :
        !configured ? <div className="sh-live-state"><Radio size={34} /><h2>Live is not configured yet</h2><p>Live broadcasts need LiveKit Cloud credentials. Add <code>LIVEKIT_URL</code>, <code>LIVEKIT_API_KEY</code> and <code>LIVEKIT_API_SECRET</code> to the deployment environment, then redeploy. Your other Shammah features will continue to work.</p><button type="button" className="sh-live-secondary" onClick={onClose}>Close</button></div> :
        <div className={stream ? 'sh-live-content is-live' : 'sh-live-content'}>
          <div className="sh-live-stage">
            <video ref={localVideoRef} autoPlay muted playsInline className={cameraEnabled ? 'sh-live-preview' : 'sh-live-preview is-hidden'} />
            {!previewReady || !cameraEnabled ? <div className="sh-live-camera-placeholder"><CameraOff size={34} /><span>{cameraEnabled ? 'Starting camera preview…' : 'Camera is off'}</span></div> : null}
            {stream && <div className="sh-live-badge"><span /> LIVE</div>}
            {stream && <div className="sh-live-count"><Signal size={15} /> {viewerCount} watching · {formatTime(elapsed)} <button type="button" className="sh-live-share" onClick={shareLive} aria-label="Share viewer link" title="Share viewer link"><Copy size={14} /></button></div>}
            {error && <p className="sh-live-error" role="alert">{error}</p>}
          </div>
          <div className="sh-live-controls">
            {!stream ? <>
              <label>Broadcast title<input value={title} maxLength={140} onChange={(event) => setTitle(event.target.value)} placeholder="What are we gathering for?" /></label>
              <label>Description <span>(optional)</span><textarea value={description} maxLength={3000} onChange={(event) => setDescription(event.target.value)} placeholder="Share what viewers can expect…" rows={2} /></label>
              <label>Who can watch<select value={visibility} onChange={(event) => setVisibility(event.target.value)}><option value="public">Everyone</option><option value="followers">Followers</option><option value="church" disabled={!profile?.church_id}>My church</option><option value="private">Only me (test)</option></select></label>
              <div className="sh-live-device-row"><button type="button" className="sh-live-secondary" onClick={() => toggleTrack('audio')} aria-label={micEnabled ? 'Mute microphone' : 'Enable microphone'}>{micEnabled ? <Mic size={18} /> : <MicOff size={18} />}{micEnabled ? 'Mic on' : 'Mic off'}</button><button type="button" className="sh-live-secondary" onClick={() => toggleTrack('video')} aria-label={cameraEnabled ? 'Turn camera off' : 'Turn camera on'}>{cameraEnabled ? <Video size={18} /> : <VideoOff size={18} />}{cameraEnabled ? 'Camera on' : 'Camera off'}</button></div>
              <p className="sh-live-network"><Signal size={15} /> {typeof navigator !== 'undefined' && navigator.onLine ? 'Network connected' : 'You appear to be offline'}</p>
              <button type="button" className="sh-live-primary" onClick={handleGoLive} disabled={busy || !title.trim()}>{busy ? <><Loader2 className="sh-spin" size={18} /> Preparing broadcast…</> : <><Radio size={18} /> Go Live</>}</button>
            </> : <>
              <div className="sh-live-chat-head"><strong>Live chat</strong><span>{messages.filter((item) => !item.is_deleted).length} messages</span></div>
              <div className="sh-live-messages" aria-live="polite">{messages.filter((item) => !item.is_deleted).map((item) => <div className={item.is_pinned ? 'sh-live-message is-pinned' : 'sh-live-message'} key={item.id}><span>{item.user_id === session?.user?.id ? 'You' : item.user_id.slice(0, 8)}</span><p>{item.body}</p>{item.is_pinned && <small>Pinned</small>}<div className="sh-live-message-tools"><button type="button" onClick={() => moderate('pin', item)} aria-label="Pin message"><Shield size={14} /></button><button type="button" onClick={() => moderate('delete', item)} aria-label="Delete message"><X size={14} /></button><button type="button" onClick={() => moderate('ban', item)} aria-label="Ban viewer"><X size={14} /></button></div></div>)}</div>
              <form className="sh-live-chat-form" onSubmit={sendMessage}><input value={draft} maxLength={500} onChange={(event) => setDraft(event.target.value)} placeholder="Send a message…" aria-label="Live chat message" /><button type="submit" disabled={!draft.trim()} aria-label="Send message"><Send size={18} /></button></form>
              <button type="button" className="sh-live-end" onClick={() => endBroadcast()} disabled={busy}>{busy ? <Loader2 size={18} /> : <X size={18} />} End broadcast</button>
            </>}
          </div>
        </div>}
      </section>
    </div>
  );
}
