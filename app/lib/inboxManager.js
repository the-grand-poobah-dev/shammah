'use client';

const INBOX_STORAGE_KEY = 'shammah_direct_messages_v1';

// Initial welcoming inbox conversations
const DEFAULT_CONVERSATIONS = [
  {
    id: 'conv-pastor-david',
    participantId: 'user-pastor-david',
    participantName: 'Pastor David Mwangi',
    participantAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    participantBadge: 'pastor',
    participantVerified: true,
    lastMessage: 'Grace and peace to you! Let me know if you need prayer this week.',
    lastMessageTime: new Date(Date.now() - 3600000 * 3).toISOString(),
    unreadCount: 1,
    messages: [
      {
        id: 'msg-1',
        senderId: 'user-pastor-david',
        senderName: 'Pastor David Mwangi',
        text: 'Grace and peace to you! Let me know if you need prayer this week.',
        timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
        isFromMe: false,
      },
    ],
  },
  {
    id: 'conv-sister-mary',
    participantId: 'user-sister-mary',
    participantName: 'Sister Mary Grace',
    participantAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    participantBadge: 'worship',
    participantVerified: true,
    lastMessage: 'Amen! Looking forward to joining fellowship together.',
    lastMessageTime: new Date(Date.now() - 3600000 * 7).toISOString(),
    unreadCount: 0,
    messages: [
      {
        id: 'msg-2',
        senderId: 'user-sister-mary',
        senderName: 'Sister Mary Grace',
        text: 'Amen! Looking forward to joining fellowship together.',
        timestamp: new Date(Date.now() - 3600000 * 7).toISOString(),
        isFromMe: false,
      },
    ],
  },
];

export function getInboxConversations() {
  if (typeof window === 'undefined') return DEFAULT_CONVERSATIONS;
  try {
    const raw = localStorage.getItem(INBOX_STORAGE_KEY);
    if (!raw) return DEFAULT_CONVERSATIONS;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_CONVERSATIONS;
  }
}

export function saveInboxConversations(convs) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(INBOX_STORAGE_KEY, JSON.stringify(convs));
    window.dispatchEvent(new CustomEvent('shammah:inbox-updated'));
  } catch (err) {
    console.error('Failed to save inbox conversations', err);
  }
}

/**
 * Delivers a status story reply directly to the recipient's inbox.
 */
export function sendStatusReplyToInbox({
  recipientId,
  recipientName,
  recipientAvatar,
  recipientBadge,
  recipientVerified,
  senderId,
  senderName,
  senderAvatar,
  senderBadge,
  senderVerified,
  commentText,
  statusPreviewText,
}) {
  const convs = getInboxConversations();
  const convId = `conv-${recipientId || 'admin'}`;
  let conv = convs.find((c) => c.id === convId || c.participantId === recipientId);

  const newMsg = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    senderId: senderId || 'me',
    senderName: senderName || 'You',
    senderAvatar: senderAvatar,
    senderBadge: senderBadge,
    senderVerified: senderVerified,
    text: commentText,
    storyReplyTo: statusPreviewText ? statusPreviewText.slice(0, 80) : null,
    timestamp: new Date().toISOString(),
    isFromMe: true,
  };

  if (conv) {
    conv.messages = [...(conv.messages || []), newMsg];
    conv.lastMessage = `Replied to story: "${commentText}"`;
    conv.lastMessageTime = newMsg.timestamp;
  } else {
    conv = {
      id: convId,
      participantId: recipientId || 'recipient',
      participantName: recipientName || 'Fellowship Member',
      participantAvatar: recipientAvatar,
      participantBadge: recipientBadge,
      participantVerified: recipientVerified,
      lastMessage: `Replied to story: "${commentText}"`,
      lastMessageTime: newMsg.timestamp,
      unreadCount: 0,
      messages: [newMsg],
    };
    convs.unshift(conv);
  }

  saveInboxConversations(convs);
  return newMsg;
}

export function sendDirectMessage(participantId, text, sender) {
  const convs = getInboxConversations();
  const conv = convs.find((c) => c.id === participantId || c.participantId === participantId);

  const newMsg = {
    id: `msg-${Date.now()}`,
    senderId: sender?.id || 'me',
    senderName: sender?.name || 'You',
    text,
    timestamp: new Date().toISOString(),
    isFromMe: true,
  };

  if (conv) {
    conv.messages = [...(conv.messages || []), newMsg];
    conv.lastMessage = text;
    conv.lastMessageTime = newMsg.timestamp;
    saveInboxConversations(convs);
  }
}
