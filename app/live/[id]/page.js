'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Heart, Loader2, Radio, Send, Share2, ShieldAlert, UserPlus, VideoOff } from 'lucide-react';
import { Room, RoomEvent } from 'livekit-client';
import { supabase } from '../../lib/supabaseClient';
import { useSession } from '../../lib/useSession';

async function livePost(path, session, body) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Live request failed.');
  return payload;
}

export default function LiveViewerPage() {
  const params = useParams();
  const router = useRouter();
  const { session, profile, loading: sessionLoading } = useSession();
  const streamId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [roomConnected, setRoomConnected] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [viewerCount, setViewerCount] = useState(0);
  const [replay, setReplay] = useState(null);
  const [reportSent, setReportSent] = useState(false);
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const roomRef = useRef(null);
  const channelRef = useRef(null);

  const disconnect = useCallback(async () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    const room = roomRef.current;
    roomRef.current = null;
    if (room) {
      try { await room.disconnect(); } catch {}
    }
  }, []);

  useEffect(() => {
    if (sessionLoading || !session?.access_token || !streamId) return undefined;
    let cancelled = false;
    async function loadStream() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/live/' + encodeURIComponent(streamId), {
          headers: { Authorization: 'Bearer ' + session.access_token },
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'Could not load this broadcast.');
        if (cancelled) return;
        setStream(payload.stream);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load this broadcast.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadStream();
    return () => { cancelled = true; };
  }, [sessionLoading, session?.access_token, streamId]);

  useEffect(() => {
    if (!stream?.id || stream.status !== 'live') return undefined;
    const channel = supabase.channel('shammah-live-status-' + stream.id)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_streams', filter: 'id=eq.' + stream.id }, (payload) => {
        setStream((current) => current ? { ...current, ...payload.new } : current);
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [stream?.id, stream?.status]);

  useEffect(() => {
    if (stream?.status !== 'ended' || !stream.replay_media_id) return undefined;
    let cancelled = false;
    fetch('/api/media?action=get&id=' + encodeURIComponent(stream.replay_media_id))
      .then((response) => response.json().then((payload) => ({ response, payload })))
      .then(({ response, payload }) => { if (!cancelled && response.ok) setReplay(payload.data || null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [stream?.status, stream?.replay_media_id]);

  useEffect(() => {
    if (!stream || stream.status !== 'live' || !session?.access_token) return undefined;
    let cancelled = false;
    async function joinRoom() {
      setJoining(true);
      setError('');
      try {
        const result = await livePost('/api/live/token', session, { streamId: stream.id });
        if (cancelled) return;
        const room = new Room({ adaptiveStream: true, dynacast: true });
        roomRef.current = room;
        room.on(RoomEvent.TrackSubscribed, (track) => {
          if (track.kind === 'video' && videoRef.current) track.attach(videoRef.current);
          else if (track.kind === 'audio' && audioRef.current) {
            const element = track.attach();
            element.autoplay = true;
            audioRef.current.appendChild(element);
          }
        });
        room.on(RoomEvent.TrackUnsubscribed, (track) => {
          track.detach();
        });
        const updateCount = () => setViewerCount(Math.max(0, room.remoteParticipants.size - 1));
        room.on(RoomEvent.ParticipantConnected, updateCount);
        room.on(RoomEvent.ParticipantDisconnected, updateCount);
        room.on(RoomEvent.Reconnected, updateCount);
        await room.connect(result.url, result.token);
        if (cancelled) { await room.disconnect(); return; }
        setRoomConnected(true);
        for (const participant of room.remoteParticipants.values()) {
          for (const publication of participant.trackPublications.values()) {
            if (publication.track) {
              const track = publication.track;
              if (track.kind === 'video' && videoRef.current) track.attach(videoRef.current);
              else if (track.kind === 'audio' && audioRef.current) {
                const element = track.attach();
                element.autoplay = true;
                audioRef.current.appendChild(element);
              }
            }
          }
        }
        updateCount();
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not join the live broadcast.');
      } finally {
        if (!cancelled) setJoining(false);
      }
    }
    joinRoom();
    return () => {
      cancelled = true;
      setRoomConnected(false);
      const room = roomRef.current;
      roomRef.current = null;
      if (room) room.disconnect().catch(() => {});
    };
  }, [stream?.id, stream?.status, session?.access_token]);

  useEffect(() => {
    if (!stream?.id || stream.status !== 'live' || !roomConnected || !session?.access_token) return undefined;
    let cancelled = false;
    let timer = null;
    const leave = () => livePost('/api/live/presence', session, { streamId: stream.id, action: 'leave' }).catch(() => {});
    livePost('/api/live/presence', session, { streamId: stream.id, action: 'join' }).then(() => {
      if (cancelled) { leave(); return; }
      timer = setInterval(() => {
        livePost('/api/live/presence', session, { streamId: stream.id, action: 'heartbeat' }).catch(() => {});
      }, 15000);
    }).catch(() => {});
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      leave();
    };
  }, [stream?.id, stream?.status, roomConnected, session?.access_token]);

  useEffect(() => {
    if (!stream?.id || stream.status !== 'live') return undefined;
    let cancelled = false;
    supabase.from('live_chat_messages')
      .select('id, stream_id, user_id, body, created_at, is_pinned, is_deleted')
      .eq('stream_id', stream.id).order('created_at', { ascending: true }).limit(100)
      .then(({ data, error: queryError }) => {
        if (!cancelled && !queryError) setMessages(data || []);
      });
    const channel = supabase.channel('shammah-live-viewer-chat-' + stream.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_chat_messages', filter: 'stream_id=eq.' + stream.id }, (payload) => {
        if (payload.eventType === 'INSERT') setMessages((current) => [...current.filter((item) => item.id !== payload.new.id), payload.new].slice(-100));
        if (payload.eventType === 'UPDATE') setMessages((current) => current.map((item) => item.id === payload.new.id ? payload.new : item));
      }).subscribe();
    channelRef.current = channel;
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      if (channelRef.current === channel) channelRef.current = null;
    };
  }, [stream?.id, stream?.status]);

  async function sendMessage(event) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !stream || !session?.user?.id) return;
    const { error: insertError } = await supabase.from('live_chat_messages').insert({ stream_id: stream.id, user_id: session.user.id, body });
    if (insertError) setError(insertError.message || 'Could not send chat message.');
    else setDraft('');
  }

  async function shareStream() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (navigator.share) await navigator.share({ title: stream?.title || 'Shammah Live', url });
      else if (navigator.clipboard) await navigator.clipboard.writeText(url);
    } catch {}
  }

  async function followHost() {
    if (!session?.user?.id || !stream?.host_id || stream.host_id === session.user.id) return;
    const { error: followError } = await supabase.from('follows').insert({ follower_id: session.user.id, following_id: stream.host_id });
    if (followError && !/duplicate|unique/i.test(followError.message || '')) setError(followError.message || 'Could not follow host.');
  }

  async function reportStream() {
    if (!session?.user?.id || !stream?.id) return;
    const reason = window.prompt('Why are you reporting this live broadcast?');
    if (!reason?.trim()) return;
    const { error: reportError } = await supabase.from('content_reports').insert({
      reporter_id: session.user.id,
      reported_user_id: stream.host_id,
      target_type: 'live_stream',
      target_id: stream.id,
      reason: reason.trim().slice(0, 120),
      notes: null,
    });
    if (reportError) setError('Could not submit report. Please try again.');
    else setReportSent(true);
  }

  useEffect(() => () => { disconnect(); }, [disconnect]);

  if (sessionLoading || loading) return <main className="sh-live-page-state"><Loader2 className="sh-spin" size={28} /><p>Loading live broadcast…</p></main>;
  if (!session) return <main className="sh-live-page-state"><h1>Sign in to watch Live</h1><p>Join the community to watch and chat with your church family.</p><button onClick={() => router.push('/')} type="button">Return to Shammah</button></main>;
  if (error && !stream) return <main className="sh-live-page-state"><h1>Unable to open this broadcast</h1><p role="alert">{error}</p><Link href="/">Return home</Link></main>;
  if (!stream) return null;

  return (
    <main className="sh-live-viewer">
      <header className="sh-live-viewer-header"><Link href="/" aria-label="Back to Shammah"><ArrowLeft size={20} /> Back</Link><div><Radio size={19} /> <span>Shammah Live</span></div><button type="button" onClick={shareStream} aria-label="Share live broadcast"><Share2 size={19} /></button></header>
      <div className="sh-live-viewer-grid">
        <section className="sh-live-viewer-main">
          <div className="sh-live-viewer-player">
            {stream.status === 'live' ? <><video ref={videoRef} autoPlay playsInline className="sh-live-viewer-video" /><div ref={audioRef} className="sh-live-audio-tracks" />{joining && <div className="sh-live-player-message"><Loader2 className="sh-spin" size={25} /><span>Joining broadcast…</span></div>}</> :
              replay ? <video className="sh-live-viewer-video" controls playsInline src={replay.media_url} poster={replay.thumb_url || undefined} /> :
              <div className="sh-live-player-message"><VideoOff size={32} /><strong>This broadcast has ended</strong><span>The host did not publish a replay.</span></div>}
            {stream.status === 'live' && <span className="sh-live-viewer-badge"><i /> LIVE</span>}
            {stream.status === 'live' && <span className="sh-live-viewer-count">{viewerCount} watching</span>}
          </div>
          <div className="sh-live-viewer-details"><h1>{stream.title}</h1>{stream.description && <p>{stream.description}</p>}<div className="sh-live-viewer-actions"><button type="button" onClick={followHost} disabled={stream.host_id === session.user.id}><UserPlus size={17} /> Follow host</button><button type="button" onClick={shareStream}><Share2 size={17} /> Share</button><button type="button" onClick={reportStream} disabled={reportSent}><ShieldAlert size={17} /> {reportSent ? 'Reported' : 'Report'}</button><button type="button" onClick={() => setError('Reaction sent!')}><Heart size={17} /> Send heart</button></div>{error && <p className="sh-live-viewer-error" role="alert">{error}</p>}</div>
        </section>
        <aside className="sh-live-viewer-chat"><div className="sh-live-chat-head"><strong>Live chat</strong><span>{messages.filter((item) => !item.is_deleted).length} messages</span></div><div className="sh-live-messages" aria-live="polite">{messages.filter((item) => !item.is_deleted).map((item) => <div key={item.id} className={item.is_pinned ? 'sh-live-message is-pinned' : 'sh-live-message'}><span>{item.user_id === session.user.id ? 'You' : item.user_id.slice(0, 8)}</span><p>{item.body}</p>{item.is_pinned && <small>Pinned</small>}</div>)}</div>{stream.status === 'live' && <form className="sh-live-chat-form" onSubmit={sendMessage}><input value={draft} maxLength={500} onChange={(event) => setDraft(event.target.value)} placeholder="Say something kind…" aria-label="Live chat message" /><button type="submit" disabled={!draft.trim()} aria-label="Send message"><Send size={18} /></button></form>}</aside>
      </div>
    </main>
  );
}
