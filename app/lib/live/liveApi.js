/**
 * Shammah Live Broadcast Client API Layer
 * Connects to Supabase Realtime for chat & viewer updates, and Live API endpoints.
 */

import { supabase } from '../../supabaseClient';

/**
 * Fetches all currently active live streams.
 */
export async function fetchActiveLiveStreams(limit = 10) {
  try {
    const { data, error } = await supabase
      .from('live_streams')
      .select(`
        id,
        host_id,
        church_id,
        title,
        description,
        thumb_url,
        status,
        room_name,
        visibility,
        started_at,
        viewer_count,
        like_count,
        created_at,
        host:profiles(id, display_name, avatar_url, badge, badge_verified, role),
        church:churches(id, name, logo_url)
      `)
      .eq('status', 'live')
      .order('viewer_count', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[liveApi] fetchActiveLiveStreams error:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn('[liveApi] fetchActiveLiveStreams exception:', err);
    return [];
  }
}

/**
 * Fetches single live stream details with host profile.
 */
export async function fetchLiveStream(streamId) {
  if (!streamId) return null;
  try {
    const { data, error } = await supabase
      .from('live_streams')
      .select(`
        *,
        host:profiles(id, display_name, avatar_url, badge, badge_verified, role),
        church:churches(id, name, logo_url)
      `)
      .eq('id', streamId)
      .maybeSingle();

    if (error) {
      console.warn('[liveApi] fetchLiveStream error:', error);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Fetches initial chat messages for a stream.
 */
export async function fetchLiveChatMessages(streamId, limit = 50) {
  if (!streamId) return [];
  try {
    const { data, error } = await supabase
      .from('live_chat_messages')
      .select(`
        id,
        stream_id,
        user_id,
        body,
        created_at,
        is_pinned,
        is_deleted,
        user:profiles(id, display_name, avatar_url, badge, badge_verified, role)
      `)
      .eq('stream_id', streamId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.warn('[liveApi] fetchLiveChatMessages error:', error);
      return [];
    }
    return data || [];
  } catch {
    return [];
  }
}

/**
 * Subscribes to Supabase Realtime for a stream's chat messages.
 */
export function subscribeToLiveChat(streamId, onMessage, onUpdate) {
  if (!streamId) return () => {};

  const channel = supabase
    .channel(`live-chat-${streamId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'live_chat_messages',
        filter: `stream_id=eq.${streamId}`,
      },
      async (payload) => {
        const newMsg = payload.new;
        if (!newMsg) return;

        // Fetch author profile
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, badge, badge_verified, role')
          .eq('id', newMsg.user_id)
          .maybeSingle();

        onMessage({
          ...newMsg,
          user: userProfile || { id: newMsg.user_id, display_name: 'Member' },
        });
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'live_chat_messages',
        filter: `stream_id=eq.${streamId}`,
      },
      (payload) => {
        if (payload.new && onUpdate) {
          onUpdate(payload.new);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Sends a chat message in the live stream.
 */
export async function sendLiveChatMessage(streamId, body, currentUser) {
  if (!streamId || !body?.trim() || !currentUser?.id) {
    throw new Error('Message content and user authentication required.');
  }

  const { data, error } = await supabase
    .from('live_chat_messages')
    .insert({
      stream_id: streamId,
      user_id: currentUser.id,
      body: body.trim(),
    })
    .select(`
      id,
      stream_id,
      user_id,
      body,
      created_at,
      is_pinned,
      is_deleted
    `)
    .single();

  if (error) {
    if (error.message?.includes('violates row-level security')) {
      throw new Error('You cannot post in this chat (you may be restricted).');
    }
    throw new Error(error.message || 'Failed to send message.');
  }

  return {
    ...data,
    user: {
      id: currentUser.id,
      display_name: currentUser.display_name || currentUser.name || 'You',
      avatar_url: currentUser.avatar_url,
      badge: currentUser.badge,
      role: currentUser.role,
    },
  };
}

/**
 * Sends a live floating reaction / heart.
 */
export async function sendLiveReaction(streamId, reaction = '❤️') {
  if (!streamId) return 0;
  try {
    const { data } = await supabase.rpc('increment_stream_like', {
      p_stream_id: streamId,
    });
    return data || 0;
  } catch {
    return 0;
  }
}

/**
 * Checks provider configuration and user eligibility.
 */
export async function checkLiveConfig() {
  try {
    const sessionRes = await supabase.auth.getSession().catch(() => null);
    const token = sessionRes?.data?.session?.access_token;
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch('/api/live/config', { headers });
    if (!res.ok) throw new Error('Failed to check live configuration');
    return await res.json();
  } catch (err) {
    return { configured: false, eligibility: { allowed: false, reason: err.message } };
  }
}

/**
 * Starts a live stream on the server.
 */
export async function startLiveStream(streamData) {
  const sessionRes = await supabase.auth.getSession().catch(() => null);
  const token = sessionRes?.data?.session?.access_token;
  if (!token) throw new Error('Sign in required to go live.');

  const res = await fetch('/api/live/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(streamData),
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'Failed to start live stream.');
  }
  return data;
}

/**
 * Requests viewer token to subscribe to live video.
 */
export async function getViewerToken(streamId) {
  const sessionRes = await supabase.auth.getSession().catch(() => null);
  const token = sessionRes?.data?.session?.access_token;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch('/api/live/token', {
    method: 'POST',
    headers,
    body: JSON.stringify({ streamId }),
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'Failed to join live stream.');
  }
  return data;
}

/**
 * Ends a live stream on the server.
 */
export async function endLiveStream(streamId) {
  const sessionRes = await supabase.auth.getSession().catch(() => null);
  const token = sessionRes?.data?.session?.access_token;
  if (!token) throw new Error('Sign in required to end stream.');

  const res = await fetch('/api/live/end', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ streamId }),
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'Failed to end stream.');
  }
  return data;
}

/**
 * Calls moderation endpoint (pin, unpin, delete, ban, unban).
 */
export async function moderateLiveStream({ streamId, action, messageId, targetUserId, reason }) {
  const sessionRes = await supabase.auth.getSession().catch(() => null);
  const token = sessionRes?.data?.session?.access_token;
  if (!token) throw new Error('Sign in required for moderation.');

  const res = await fetch('/api/live/moderate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ streamId, action, messageId, targetUserId, reason }),
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'Moderation action failed.');
  }
  return data;
}
