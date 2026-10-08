'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import {
  MessageCircle,
  Send,
  Lock,
  ArrowLeft,
  Smile,
  Reply,
  Edit2,
  Trash2,
  ShieldCheck,
  Info,
  X,
  AlertCircle,
} from 'lucide-react';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import {
  getInboxConversations,
  getConversationMessages,
  sendDirectMessage,
  markConversationAsRead,
  subscribeToDirectMessages,
} from '../lib/inboxManager';
import { supabase } from '../../lib/supabaseClient';

export default function InboxView({ currentUser }) {
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showPrivacyInfo, setShowPrivacyInfo] = useState(false);
  const [sendError, setSendError] = useState('');
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef(null);
  const activeConvRef = useRef(null);

  // Load conversations from Supabase
  const loadConversations = useCallback(async (preserveActiveId = null) => {
    if (!currentUser?.id) {
      setConversations([]);
      setLoadingConvs(false);
      return;
    }

    try {
      const list = await getInboxConversations(currentUser.id);
      setConversations(list);

      // Determine active conversation
      const currentActive = preserveActiveId || activeConvRef.current;
      if (currentActive && list.some((c) => c.id === currentActive)) {
        setActiveConvId(currentActive);
      } else if (!currentActive && list.length > 0) {
        setActiveConvId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load inbox conversations:', err);
    } finally {
      setLoadingConvs(false);
    }
  }, [currentUser?.id]);

  // Load messages for active conversation
  const loadMessages = useCallback(async (conv) => {
    if (!conv || !currentUser?.id) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    setSendError('');
    try {
      const msgs = await getConversationMessages(currentUser.id, conv.participantId);
      setMessages(msgs);
      // Mark unread messages as read in Supabase
      if (conv.unreadCount > 0) {
        await markConversationAsRead(currentUser.id, conv.participantId);
        setConversations((prev) =>
          prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
        );
      }
    } catch (err) {
      console.error('Failed to load messages for thread:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, [currentUser?.id]);

  // Handle open conversation event (from Profile Message button or other links)
  const handleOpenTargetRecipient = useCallback(async (recipientId, optionalMeta = {}) => {
    if (!recipientId || !currentUser?.id) return;

    // Check if conversation already exists in state
    let target = conversations.find(
      (c) => c.participantId === recipientId || c.id === `conv-${recipientId}`
    );

    if (!target) {
      // Fetch recipient profile from Supabase
      try {
        const { data: prof } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, badge, badge_verified, role, inbox_permission')
          .eq('id', recipientId)
          .maybeSingle();

        target = {
          id: `conv-${recipientId}`,
          participantId: recipientId,
          participantName: prof?.display_name || optionalMeta.recipientName || 'Community Member',
          participantAvatar: prof?.avatar_url || optionalMeta.recipientAvatar || null,
          participantBadge: prof?.badge || optionalMeta.recipientBadge || 'member',
          participantVerified: Boolean(prof?.badge_verified ?? optionalMeta.recipientVerified),
          participantRole: prof?.role || optionalMeta.recipientRole || 'member',
          participantInboxPermission: prof?.inbox_permission || optionalMeta.recipientInboxPermission || 'everyone',
          lastMessage: '',
          lastMessageTime: new Date().toISOString(),
          unreadCount: 0,
        };

        setConversations((prev) => [target, ...prev.filter((c) => c.participantId !== recipientId)]);
      } catch (err) {
        console.error('Failed to resolve profile for messaging:', err);
      }
    }

    if (target) {
      setActiveConvId(target.id);
      loadMessages(target);
    }
  }, [conversations, currentUser?.id, loadMessages]);

  // Initialize and check URL recipient param
  useEffect(() => {
    loadConversations();

    // Check if recipient was specified in URL query
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const recipientParam = params.get('recipient');
      if (recipientParam) {
        handleOpenTargetRecipient(recipientParam);
      }
    }

    function onOpenConv(e) {
      if (e.detail?.recipientId) {
        handleOpenTargetRecipient(e.detail.recipientId, e.detail);
      }
    }

    function onInboxEvent() {
      loadConversations(activeConvRef.current);
    }

    window.addEventListener('shammah:open-conversation', onOpenConv);
    window.addEventListener('shammah:inbox-updated', onInboxEvent);

    return () => {
      window.removeEventListener('shammah:open-conversation', onOpenConv);
      window.removeEventListener('shammah:inbox-updated', onInboxEvent);
    };
  }, [loadConversations, handleOpenTargetRecipient]);

  // Realtime Supabase Channel Subscription
  useEffect(() => {
    if (!currentUser?.id) return;

    const unsubscribe = subscribeToDirectMessages(currentUser.id, (payload) => {
      const active = activeConvRef.current;
      const activeItem = conversations.find((c) => c.id === active);

      if (payload.eventType === 'INSERT' && payload.new) {
        const newMsg = payload.new;
        const otherId = newMsg.sender_id === currentUser.id ? newMsg.recipient_id : newMsg.sender_id;

        // If message is in the active thread, append it
        if (activeItem && otherId === activeItem.participantId) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [
              ...prev,
              {
                id: newMsg.id,
                senderId: newMsg.sender_id,
                recipientId: newMsg.recipient_id,
                text: newMsg.text_content,
                timestamp: newMsg.created_at,
                readAt: newMsg.read_at,
                isFromMe: newMsg.sender_id === currentUser.id,
                reactions: {},
              },
            ];
          });

          // Mark as read immediately if viewer is recipient
          if (newMsg.recipient_id === currentUser.id) {
            markConversationAsRead(currentUser.id, otherId);
          }
        }
      } else if (payload.eventType === 'UPDATE' && payload.new) {
        // Read receipt update
        setMessages((prev) =>
          prev.map((m) => (m.id === payload.new.id ? { ...m, readAt: payload.new.read_at } : m))
        );
      }

      loadConversations(active);
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser?.id, conversations, loadConversations]);

  // Keep active conversation ref in sync
  useEffect(() => {
    activeConvRef.current = activeConvId;
    const conv = conversations.find((c) => c.id === activeConvId);
    if (conv) {
      loadMessages(conv);
    }
  }, [activeConvId, loadMessages]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom on message updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const isInboxClosed = activeConv?.participantInboxPermission === 'no_one';

  function handleSelectConv(convId) {
    setActiveConvId(convId);
    setSendError('');
    setReplyText('');
  }

  async function handleSendReply(e) {
    e.preventDefault();
    const text = replyText.trim();
    if (!text || !activeConv || !currentUser?.id || isSending) return;

    if (isInboxClosed) {
      setSendError('This member has closed their inbox to incoming direct messages.');
      return;
    }

    setIsSending(true);
    setSendError('');

    try {
      const sent = await sendDirectMessage(activeConv.participantId, text, currentUser.id);
      setMessages((prev) => [...prev, sent]);
      setReplyText('');

      // Refresh conversations list to update snippet
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConv.id
            ? { ...c, lastMessage: text, lastMessageTime: new Date().toISOString() }
            : c
        )
      );
    } catch (err) {
      console.error('Error sending message:', err);
      setSendError(err.message || 'Failed to deliver message.');
    } finally {
      setIsSending(false);
    }
  }

  // Guard: Logged off members cannot send or receive messages
  if (!currentUser?.id) {
    return (
      <div className="inbox-shell">
        <div className="inbox-logged-off-gate">
          <div className="inbox-gate-card">
            <div className="inbox-gate-icon-wrap">
              <Lock size={36} className="inbox-gate-lock-icon" />
            </div>
            <h2>Private Messages</h2>
            <p>
              Direct messaging and personal conversations are reserved for signed-in members.
              Sign in or create an account to securely message pastors, leaders, and friends.
            </p>
            <button
              type="button"
              className="inbox-gate-signin-btn"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('shammah:open-auth', { detail: 'signin' }));
                }
              }}
            >
              Sign In to Message
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="inbox-shell">
      {/* Header */}
      <div className="inbox-header">
        <div className="inbox-header-title">
          <MessageCircle size={20} className="inbox-title-icon" />
          <h2>Direct Messages</h2>
        </div>
        <div
          className="inbox-header-e2ee-tag"
          onClick={() => setShowPrivacyInfo((v) => !v)}
          title="Click for security & privacy details"
          role="button"
          tabIndex={0}
        >
          <ShieldCheck size={13} className="e2ee-lock-icon text-cyan-400" />
          <span>Encrypted in Transit (TLS) · RLS Protected</span>
          <Info size={12} />
        </div>
      </div>

      {showPrivacyInfo && (
        <div className="inbox-e2ee-banner">
          <ShieldCheck size={18} className="e2ee-shield-icon text-cyan-400" />
          <div>
            <strong>Encrypted in Transit · Row-Level Security Protected</strong>
            <p>
              All direct messages are transmitted securely over TLS encryption and guarded by
              Supabase Row-Level Security (RLS) policies. Only you and your conversation partner
              have permission to read or query these conversations.
            </p>
          </div>
          <button
            type="button"
            className="e2ee-banner-close"
            onClick={() => setShowPrivacyInfo(false)}
            aria-label="Close security notice"
          >
            <X size={15} />
          </button>
        </div>
      )}

      <div className="inbox-layout">
        {/* Conversations List */}
        <div className={`inbox-sidebar${activeConvId ? ' has-active-on-mobile' : ''}`}>
          {loadingConvs ? (
            <div className="inbox-empty-sidebar">
              <p>Loading conversations…</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="inbox-empty-sidebar">
              <MessageCircle size={32} className="inbox-empty-icon" />
              <p>No messages yet. Direct messages and chats will appear here!</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const isSelected = conv.id === activeConvId;
              const unread = conv.unreadCount || 0;
              return (
                <div
                  key={conv.id}
                  className={`inbox-conv-item${isSelected ? ' active' : ''}`}
                  onClick={() => handleSelectConv(conv.id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="inbox-conv-avatar-wrap">
                    <Avatar name={conv.participantName} src={conv.participantAvatar} className="avatar-sm" />
                    {unread > 0 && <span className="inbox-unread-count-dot">{unread}</span>}
                  </div>
                  <div className="inbox-conv-info">
                    <div className="inbox-conv-name-row">
                      <span className="inbox-conv-name">{conv.participantName}</span>
                      {conv.participantVerified && <VerifiedBadge badge={conv.participantBadge} size={14} />}
                    </div>
                    {conv.participantRole && (
                      <span className="inbox-conv-member-tag">{conv.participantRole}</span>
                    )}
                    <span className="inbox-conv-snippet">{conv.lastMessage || 'New conversation'}</span>
                  </div>
                  <div className="inbox-conv-meta">
                    <ShieldCheck size={11} className="inbox-mini-lock text-cyan-400" title="RLS Protected" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Conversation Thread */}
        <div className="inbox-main-thread">
          {activeConv ? (
            <div className="inbox-thread-card">
              {/* Thread Header */}
              <div className="inbox-thread-header">
                <button
                  type="button"
                  className="inbox-back-to-list-btn"
                  onClick={() => setActiveConvId(null)}
                  aria-label="Back to conversations list"
                >
                  <ArrowLeft size={16} />
                </button>
                <Avatar name={activeConv.participantName} src={activeConv.participantAvatar} className="avatar-sm" />
                <div className="inbox-thread-user-meta">
                  <div className="inbox-thread-name-row">
                    <span className="inbox-thread-name">{activeConv.participantName}</span>
                    {activeConv.participantVerified && <VerifiedBadge badge={activeConv.participantBadge} size={14} />}
                    <span className="inbox-badge-tag">{activeConv.participantBadge || 'Member'}</span>
                  </div>
                  <div className="inbox-thread-tag-row">
                    <span className="inbox-thread-tag-text">{activeConv.participantRole || 'Community Member'}</span>
                    <span className="inbox-e2ee-pill" title="Protected by database Row-Level Security">
                      <ShieldCheck size={10} className="text-cyan-400" />
                      <span>RLS Protected</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Message Bubbles */}
              <div className="inbox-thread-messages">
                {loadingMessages ? (
                  <div className="inbox-loading-thread">
                    <p>Loading messages…</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="inbox-empty-thread-content">
                    <p>This is the start of your direct conversation with {activeConv.participantName}.</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.isFromMe;
                    return (
                      <div
                        key={msg.id}
                        id={`msg-bubble-${msg.id}`}
                        className={`inbox-bubble-wrap${isMe ? ' from-me' : ' from-them'}`}
                      >
                        <div className="inbox-bubble-row">
                          <div className="inbox-bubble">
                            <p className="inbox-bubble-text">{msg.text}</p>
                            <div className="inbox-bubble-footer">
                              <span className="inbox-bubble-time">
                                {msg.timestamp
                                  ? new Date(msg.timestamp).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : 'Now'}
                              </span>
                              {isMe && (
                                <span
                                  className="inbox-read-check"
                                  title={msg.readAt ? `Read ${new Date(msg.readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Delivered'}
                                  style={{
                                    marginLeft: 5,
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    color: msg.readAt ? '#06b6d4' : '#94a3b8',
                                  }}
                                >
                                  {msg.readAt ? '✓✓' : '✓'}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action icons cleanly disabled with tooltips */}
                          <div className="inbox-msg-actions">
                            <button
                              type="button"
                              className="inbox-action-icon-btn disabled"
                              disabled
                              title="Quote reply coming soon"
                              aria-label="Quote reply coming soon"
                            >
                              <Reply size={13} />
                            </button>
                            <button
                              type="button"
                              className="inbox-action-icon-btn disabled"
                              disabled
                              title="Message reactions coming soon"
                              aria-label="Message reactions coming soon"
                            >
                              <Smile size={13} />
                            </button>
                            {isMe && (
                              <>
                                <button
                                  type="button"
                                  className="inbox-action-icon-btn disabled"
                                  disabled
                                  title="Message editing coming soon"
                                  aria-label="Message editing coming soon"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  type="button"
                                  className="inbox-action-icon-btn danger disabled"
                                  disabled
                                  title="Message deletion coming soon"
                                  aria-label="Message deletion coming soon"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Error notice if send fails */}
              {sendError && (
                <div className="inbox-send-error-bar" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '13px' }}>
                  <AlertCircle size={14} />
                  <span>{sendError}</span>
                </div>
              )}

              {/* Inbox closed notice if recipient has closed inbox */}
              {isInboxClosed ? (
                <div className="inbox-closed-banner" style={{ padding: '14px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', background: 'rgba(255,255,255,0.03)' }}>
                  <Lock size={14} style={{ display: 'inline', marginRight: 6 }} />
                  <span>This member has closed their inbox to incoming direct messages.</span>
                </div>
              ) : (
                /* Reply Input Form */
                <form className="inbox-reply-form" onSubmit={handleSendReply}>
                  <input
                    type="text"
                    placeholder={`Message ${activeConv.participantName}...`}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="inbox-reply-input"
                    disabled={isSending}
                  />
                  <button
                    type="submit"
                    className="inbox-reply-send-btn"
                    disabled={!replyText.trim() || isSending}
                    aria-label="Send message"
                  >
                    <Send size={15} />
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="inbox-empty-thread">
              <MessageCircle size={40} className="inbox-empty-thread-icon" />
              <h3>Select a conversation</h3>
              <p>Direct messages and conversations will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
