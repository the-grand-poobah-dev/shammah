'use client';
import { playSound } from './soundEffects';

const INBOX_STORAGE_KEY = 'shammah_direct_messages_v2';

export const FAITH_MESSAGE_REACTIONS = [
  { id: 'pray', emoji: '🙏', label: 'Amen / Pray' },
  { id: 'love', emoji: '❤️', label: 'Love' },
  { id: 'amen', emoji: '🙌', label: 'Praise' },
  { id: 'fire', emoji: '🔥', label: 'Holy Fire' },
  { id: 'dove', emoji: '🕊️', label: 'Peace' },
  { id: 'smile', emoji: '😊', label: 'Joy' },
];

// Initial welcoming inbox conversations with rich badges and member tags
export const DEFAULT_CONVERSATIONS = [
  {
    id: 'conv-pastor-david',
    participantId: 'user-pastor-david',
    participantName: 'Pastor David Mwangi',
    participantTag: 'Lead Pastor · Nairobi Worship Center',
    participantAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    participantBadge: 'pastor',
    participantVerified: true,
    isE2EE: true,
    encryptionFingerprint: 'SHA256:7f4a...9b12',
    lastMessage: 'Grace and peace to you! Let me know if you need prayer this week.',
    lastMessageTime: new Date(Date.now() - 3600000 * 2).toISOString(),
    unreadCount: 1,
    messages: [
      {
        id: 'msg-pd-1',
        senderId: 'user-pastor-david',
        senderName: 'Pastor David Mwangi',
        text: 'Welcome to Shammah Fellowship! We are praying for your family.',
        timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
        isFromMe: false,
        reactions: { '🙏': 2, '❤️': 1 },
      },
      {
        id: 'msg-pd-2',
        senderId: 'user-pastor-david',
        senderName: 'Pastor David Mwangi',
        text: 'Grace and peace to you! Let me know if you need prayer this week.',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        isFromMe: false,
        reactions: {},
      },
    ],
  },
  {
    id: 'conv-sister-mary',
    participantId: 'user-sister-mary',
    participantName: 'Sister Mary Grace',
    participantTag: 'Worship Team Director',
    participantAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    participantBadge: 'worship',
    participantVerified: true,
    isE2EE: true,
    encryptionFingerprint: 'SHA256:1a8c...4e3f',
    lastMessage: 'Amen! Looking forward to joining fellowship together this Sunday.',
    lastMessageTime: new Date(Date.now() - 3600000 * 6).toISOString(),
    unreadCount: 0,
    messages: [
      {
        id: 'msg-sm-1',
        senderId: 'user-sister-mary',
        senderName: 'Sister Mary Grace',
        text: 'Amen! Looking forward to joining fellowship together this Sunday.',
        timestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
        isFromMe: false,
        reactions: { '🙌': 1 },
      },
    ],
  },
  {
    id: 'conv-brother-john',
    participantId: 'user-brother-john',
    participantName: 'Brother John Ochieng',
    participantTag: 'Youth & Outreach Mentor',
    participantAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    participantBadge: 'partner',
    participantVerified: true,
    isE2EE: true,
    encryptionFingerprint: 'SHA256:3d9e...c702',
    lastMessage: 'The youth Bible study was so blessed! Here is the scripture reading plan.',
    lastMessageTime: new Date(Date.now() - 3600000 * 12).toISOString(),
    unreadCount: 1,
    messages: [
      {
        id: 'msg-bj-1',
        senderId: 'user-brother-john',
        senderName: 'Brother John Ochieng',
        text: 'The youth Bible study was so blessed! Here is the scripture reading plan.',
        timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
        isFromMe: false,
        reactions: { '🔥': 3 },
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

export function getTotalUnreadMessagesCount() {
  const convs = getInboxConversations();
  return convs.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
}

export function markConversationAsRead(convId) {
  const convs = getInboxConversations();
  let changed = false;
  const next = convs.map((c) => {
    if (c.id === convId && c.unreadCount > 0) {
      changed = true;
      return { ...c, unreadCount: 0 };
    }
    return c;
  });
  if (changed) {
    saveInboxConversations(next);
  }
}

/**
 * Delivers a status story reply directly to the recipient's inbox
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
    senderAvatar,
    senderBadge,
    senderVerified,
    text: commentText,
    storyReplyTo: statusPreviewText ? statusPreviewText.slice(0, 80) : null,
    timestamp: new Date().toISOString(),
    isFromMe: true,
    reactions: {},
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
      participantTag: 'Fellowship Member',
      participantAvatar,
      participantBadge,
      participantVerified,
      isE2EE: true,
      encryptionFingerprint: `SHA256:${Math.random().toString(16).substr(2, 4)}...${Math.random().toString(16).substr(2, 4)}`,
      lastMessage: `Replied to story: "${commentText}"`,
      lastMessageTime: newMsg.timestamp,
      unreadCount: 0,
      messages: [newMsg],
    };
    convs.unshift(conv);
  }

  saveInboxConversations(convs);
  playSound('messageSent');
  return newMsg;
}

/**
 * Send a direct message with optional quote reply
 */
export function sendDirectMessage(participantIdOrConvId, text, sender, replyTo = null) {
  const convs = getInboxConversations();
  const conv = convs.find((c) => c.id === participantIdOrConvId || c.participantId === participantIdOrConvId);

  if (!conv) return null;

  const newMsg = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    senderId: sender?.id || 'me',
    senderName: sender?.name || 'You',
    text,
    timestamp: new Date().toISOString(),
    isFromMe: true,
    reactions: {},
    replyTo: replyTo
      ? {
          id: replyTo.id,
          text: replyTo.text,
          senderName: replyTo.senderName,
        }
      : null,
  };

  conv.messages = [...(conv.messages || []), newMsg];
  conv.lastMessage = text;
  conv.lastMessageTime = newMsg.timestamp;

  saveInboxConversations(convs);
  playSound('messageSent');

  // Trigger fellowship automated response after brief realistic delay
  simulateFellowshipReply(conv.id, conv.participantName, text);

  return newMsg;
}

/**
 * Edit an existing sent message
 */
export function editDirectMessage(convId, msgId, newText) {
  const convs = getInboxConversations();
  const conv = convs.find((c) => c.id === convId);
  if (!conv) return false;

  const msg = (conv.messages || []).find((m) => m.id === msgId);
  if (!msg || !msg.isFromMe) return false;

  msg.text = newText;
  msg.isEdited = true;
  msg.editedAt = new Date().toISOString();

  // If last message was edited, sync conv.lastMessage
  if (conv.messages[conv.messages.length - 1]?.id === msgId) {
    conv.lastMessage = newText;
  }

  saveInboxConversations(convs);
  return true;
}

/**
 * Delete a message
 */
export function deleteDirectMessage(convId, msgId) {
  const convs = getInboxConversations();
  const conv = convs.find((c) => c.id === convId);
  if (!conv) return false;

  const msg = (conv.messages || []).find((m) => m.id === msgId);
  if (!msg) return false;

  msg.isDeleted = true;
  msg.text = 'This message was deleted';
  msg.reactions = {};

  if (conv.messages[conv.messages.length - 1]?.id === msgId) {
    conv.lastMessage = 'This message was deleted';
  }

  saveInboxConversations(convs);
  return true;
}

/**
 * Toggle reaction on a message
 */
export function toggleMessageReaction(convId, msgId, emoji, userName = 'You') {
  const convs = getInboxConversations();
  const conv = convs.find((c) => c.id === convId);
  if (!conv) return false;

  const msg = (conv.messages || []).find((m) => m.id === msgId);
  if (!msg) return false;

  if (!msg.reactions) msg.reactions = {};
  if (!msg.reactionUsers) msg.reactionUsers = {};

  const currentCount = msg.reactions[emoji] || 0;
  const userList = msg.reactionUsers[emoji] || [];
  const hasReacted = userList.includes(userName);

  if (hasReacted) {
    // Remove reaction
    if (currentCount <= 1) {
      delete msg.reactions[emoji];
      delete msg.reactionUsers[emoji];
    } else {
      msg.reactions[emoji] = currentCount - 1;
      msg.reactionUsers[emoji] = userList.filter((u) => u !== userName);
    }
  } else {
    // Add reaction
    msg.reactions[emoji] = currentCount + 1;
    msg.reactionUsers[emoji] = [...userList, userName];
    playSound('reaction');
  }

  saveInboxConversations(convs);
  return true;
}

// Simulates a warm, biblical fellowship response for demo & testing
function simulateFellowshipReply(convId, participantName, userMessage) {
  setTimeout(() => {
    // Broadcast typing event
    window.dispatchEvent(
      new CustomEvent('shammah:inbox-typing', {
        detail: { convId, isTyping: true, name: participantName },
      })
    );
    playSound('typing');

    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('shammah:inbox-typing', {
          detail: { convId, isTyping: false, name: participantName },
        })
      );

      const convs = getInboxConversations();
      const conv = convs.find((c) => c.id === convId);
      if (!conv) return;

      const responses = [
        `Amen! The Lord bless you abundantly today. Remember: Philippians 4:13.`,
        `Thank you for sharing this! I am keeping this in our weekly church prayers.`,
        `Praise God! Always here for fellowship and prayer whenever you need.`,
        `Such an encouragement! May God continue to guide your steps.`,
      ];
      const reply = responses[Math.floor(Math.random() * responses.length)];

      const incomingMsg = {
        id: `msg-in-${Date.now()}`,
        senderId: conv.participantId,
        senderName: conv.participantName,
        text: reply,
        timestamp: new Date().toISOString(),
        isFromMe: false,
        reactions: {},
      };

      conv.messages.push(incomingMsg);
      conv.lastMessage = reply;
      conv.lastMessageTime = incomingMsg.timestamp;
      conv.unreadCount = (conv.unreadCount || 0) + 1;

      saveInboxConversations(convs);
      playSound('messageReceived');

      // Dispatch alert notification popup
      window.dispatchEvent(
        new CustomEvent('shammah:new-notification', {
          detail: {
            id: `notif-${Date.now()}`,
            type: 'message',
            title: `New Message from ${conv.participantName}`,
            text: reply,
            time: 'Just now',
            avatar: conv.participantAvatar,
            senderName: conv.participantName,
          },
        })
      );
    }, 1800);
  }, 1000);
}
