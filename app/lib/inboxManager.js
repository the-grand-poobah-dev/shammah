'use client';
import { supabase } from '../../lib/supabaseClient';
import { playSound } from './soundEffects';
import { getBlockedUsers } from './profileManager';

export const FAITH_MESSAGE_REACTIONS = [
  { id: 'pray', emoji: '🙏', label: 'Amen / Pray' },
  { id: 'love', emoji: '❤️', label: 'Love' },
  { id: 'amen', emoji: '🙌', label: 'Praise' },
  { id: 'fire', emoji: '🔥', label: 'Holy Fire' },
  { id: 'dove', emoji: '🕊️', label: 'Peace' },
  { id: 'smile', emoji: '😊', label: 'Joy' },
];

function isValidUuid(id) {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Fetches real 1:1 conversations for the current user from Supabase.
 * Derives conversation threads from direct_messages table joined with profiles.
 */
export async function getInboxConversations(currentUserId) {
  if (!currentUserId || !isValidUuid(currentUserId)) {
    return [];
  }

  try {
    // 1. Attempt using optimized RPC
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_conversations', {
      p_user_id: currentUserId,
    });

    const blockedList = getBlockedUsers();
    const blockedSet = new Set(blockedList || []);

    if (!rpcError && Array.isArray(rpcData)) {
      return rpcData
        .filter((row) => !blockedSet.has(row.participant_id))
        .map((row) => ({
          id: row.conversation_id || `conv-${row.participant_id}`,
          participantId: row.participant_id,
          participantName: row.participant_name || 'Fellowship Member',
          participantAvatar: row.participant_avatar || null,
          participantBadge: row.participant_badge || 'member',
          participantVerified: Boolean(row.participant_verified),
          participantRole: row.participant_role || 'member',
          participantInboxPermission: row.participant_inbox_permission || 'everyone',
          lastMessage: row.last_message || '',
          lastMessageTime: row.last_message_time || new Date().toISOString(),
          unreadCount: Number(row.unread_count || 0),
        }));
    }

    // 2. Direct query fallback
    const { data: messages, error: msgError } = await supabase
      .from('direct_messages')
      .select('id, sender_id, recipient_id, text_content, created_at, read_at')
      .or(`sender_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`)
      .order('created_at', { ascending: false });

    if (msgError || !messages || messages.length === 0) {
      return [];
    }

    const conversationMap = new Map();
    for (const msg of messages) {
      const otherId = msg.sender_id === currentUserId ? msg.recipient_id : msg.sender_id;
      if (!conversationMap.has(otherId)) {
        conversationMap.set(otherId, {
          participantId: otherId,
          lastMessage: msg.text_content,
          lastMessageTime: msg.created_at,
          unreadCount: 0,
        });
      }
      if (msg.recipient_id === currentUserId && !msg.read_at) {
        const conv = conversationMap.get(otherId);
        conv.unreadCount += 1;
      }
    }

    const otherIds = Array.from(conversationMap.keys());
    if (otherIds.length === 0) return [];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, badge, badge_verified, role, inbox_permission')
      .in('id', otherIds);

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    return otherIds.map((otherId) => {
      const convData = conversationMap.get(otherId);
      const prof = profileMap.get(otherId);
      return {
        id: `conv-${otherId}`,
        participantId: otherId,
        participantName: prof?.display_name || 'Fellowship Member',
        participantAvatar: prof?.avatar_url || null,
        participantBadge: prof?.badge || 'member',
        participantVerified: Boolean(prof?.badge_verified),
        participantRole: prof?.role || 'member',
        participantInboxPermission: prof?.inbox_permission || 'everyone',
        lastMessage: convData.lastMessage,
        lastMessageTime: convData.lastMessageTime,
        unreadCount: convData.unreadCount,
      };
    });
  } catch (err) {
    console.error('Failed to load conversations from Supabase:', err);
    return [];
  }
}

/**
 * Fetches all direct messages between the current user and a target participant.
 */
export async function getConversationMessages(currentUserId, otherUserId) {
  if (!currentUserId || !otherUserId || !isValidUuid(currentUserId) || !isValidUuid(otherUserId)) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('direct_messages')
      .select('*')
      .or(
        `and(sender_id.eq.${currentUserId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${currentUserId})`
      )
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch messages:', error);
      return [];
    }

    return (data || []).map((m) => ({
      id: m.id,
      senderId: m.sender_id,
      recipientId: m.recipient_id,
      text: m.text_content,
      timestamp: m.created_at,
      readAt: m.read_at,
      isFromMe: m.sender_id === currentUserId,
      reactions: {},
    }));
  } catch (err) {
    console.error('Error in getConversationMessages:', err);
    return [];
  }
}

/**
 * Sends a real 1:1 direct message via Supabase with RLS validation.
 */
export async function sendDirectMessage(recipientId, text, senderId) {
  const cleanText = (text || '').trim();
  if (!cleanText) {
    throw new Error('Message text cannot be empty.');
  }
  if (!senderId || !isValidUuid(senderId)) {
    throw new Error('You must be signed in to send a message.');
  }
  if (!recipientId || !isValidUuid(recipientId)) {
    throw new Error('Invalid recipient.');
  }
  if (recipientId === senderId) {
    throw new Error('You cannot message yourself.');
  }

  // Verify recipient allows incoming messages
  const { data: recipientProf } = await supabase
    .from('profiles')
    .select('inbox_permission')
    .eq('id', recipientId)
    .maybeSingle();

  if (recipientProf && recipientProf.inbox_permission === 'no_one') {
    throw new Error('This fellowship member has closed their inbox to new direct messages.');
  }

  const { data, error } = await supabase
    .from('direct_messages')
    .insert({
      sender_id: senderId,
      recipient_id: recipientId,
      text_content: cleanText,
    })
    .select()
    .single();

  if (error) {
    if (error.message?.includes('violates row-level security')) {
      throw new Error('Unable to send message: recipient inbox is closed or permissions restricted.');
    }
    throw new Error(error.message || 'Failed to send message');
  }

  playSound('messageSent');

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('shammah:inbox-updated', {
        detail: { type: 'message_sent', message: data },
      })
    );
  }

  return {
    id: data.id,
    senderId: data.sender_id,
    recipientId: data.recipient_id,
    text: data.text_content,
    timestamp: data.created_at,
    readAt: data.read_at,
    isFromMe: true,
    reactions: {},
  };
}

/**
 * Marks all incoming messages from a conversation as read in Supabase.
 */
export async function markConversationAsRead(currentUserId, otherUserId) {
  if (!currentUserId || !otherUserId || !isValidUuid(currentUserId) || !isValidUuid(otherUserId)) {
    return;
  }

  try {
    const { error } = await supabase
      .from('direct_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('recipient_id', currentUserId)
      .eq('sender_id', otherUserId)
      .is('read_at', null);

    if (error) {
      console.warn('Failed to mark conversation as read:', error);
      return;
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('shammah:inbox-updated', { detail: { type: 'read' } }));
    }
  } catch (err) {
    console.error('Error in markConversationAsRead:', err);
  }
}

/**
 * Returns total unread messages count for the current user.
 */
export async function getTotalUnreadMessagesCount(currentUserId = null) {
  try {
    let uid = currentUserId;
    if (!uid) {
      const { data: sessionData } = await supabase.auth.getSession();
      uid = sessionData?.session?.user?.id;
    }
    if (!uid || !isValidUuid(uid)) return 0;

    const { data: rpcCount, error: rpcErr } = await supabase.rpc('total_unread_messages_count', {
      p_user_id: uid,
    });
    if (!rpcErr && rpcCount !== null && rpcCount !== undefined) {
      return Number(rpcCount);
    }

    const { count, error } = await supabase
      .from('direct_messages')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', uid)
      .is('read_at', null);

    if (!error && count !== null && count !== undefined) {
      return count;
    }
    return 0;
  } catch {
    return 0;
  }
}

/**
 * Subscribes to Supabase Realtime changes for direct messages involving the current user.
 */
export function subscribeToDirectMessages(currentUserId, onUpdate) {
  if (!currentUserId || !isValidUuid(currentUserId)) {
    return () => {};
  }

  const channel = supabase
    .channel(`dm_${currentUserId}_${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'direct_messages',
        filter: `recipient_id=eq.${currentUserId}`,
      },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          playSound('messageReceived');
        }
        if (onUpdate) onUpdate(payload);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('shammah:inbox-updated', { detail: payload }));
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'direct_messages',
        filter: `sender_id=eq.${currentUserId}`,
      },
      (payload) => {
        if (onUpdate) onUpdate(payload);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('shammah:inbox-updated', { detail: payload }));
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Safely routes status story comments to recipient's direct messages if valid.
 */
export async function sendStatusReplyToInbox({
  recipientId,
  senderId,
  commentText,
  statusPreviewText,
}) {
  if (!recipientId || !senderId || !isValidUuid(recipientId) || !isValidUuid(senderId) || recipientId === senderId) {
    return null;
  }
  const prefix = statusPreviewText ? `[Story: "${statusPreviewText.slice(0, 40)}..."] ` : '[Story Reply] ';
  try {
    return await sendDirectMessage(recipientId, `${prefix}${commentText}`, senderId);
  } catch (err) {
    console.warn('Status story reply could not be sent to inbox:', err.message);
    return null;
  }
}
