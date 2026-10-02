'use client';
import { useEffect, useState, useRef } from 'react';
import {
  MessageCircle,
  Send,
  Sparkles,
  Lock,
  ArrowLeft,
  Smile,
  Reply,
  Edit2,
  Trash2,
  Check,
  X,
  ShieldCheck,
  Info,
} from 'lucide-react';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import {
  getInboxConversations,
  sendDirectMessage,
  editDirectMessage,
  deleteDirectMessage,
  toggleMessageReaction,
  markConversationAsRead,
  FAITH_MESSAGE_REACTIONS,
} from '../lib/inboxManager';
import { playSound } from '../lib/soundEffects';

export default function InboxView({ currentUser }) {
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null); // { id, text, senderName }
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editText, setEditText] = useState('');
  const [activeReactionPickerMsgId, setActiveReactionPickerMsgId] = useState(null);
  const [typingUser, setTypingUser] = useState(null);
  const [showE2eeInfo, setShowE2eeInfo] = useState(false);
  const [highlightedMsgId, setHighlightedMsgId] = useState(null);

  const messagesEndRef = useRef(null);

  function loadConversations() {
    const list = getInboxConversations();
    setConversations(list);
    if (!activeConvId && list.length > 0) {
      setActiveConvId(list[0].id);
      markConversationAsRead(list[0].id);
    }
  }

  useEffect(() => {
    loadConversations();

    function onInboxUpdated() {
      const list = getInboxConversations();
      setConversations(list);
    }

    function onTyping(e) {
      if (e.detail?.convId === activeConvId && e.detail.isTyping) {
        setTypingUser(e.detail.name);
      } else {
        setTypingUser(null);
      }
    }

    window.addEventListener('shammah:inbox-updated', onInboxUpdated);
    window.addEventListener('shammah:inbox-typing', onTyping);
    return () => {
      window.removeEventListener('shammah:inbox-updated', onInboxUpdated);
      window.removeEventListener('shammah:inbox-typing', onTyping);
    };
  }, [activeConvId]);

  useEffect(() => {
    if (activeConvId) {
      markConversationAsRead(activeConvId);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [activeConvId]);

  const activeConv = conversations.find((c) => c.id === activeConvId);

  function handleSelectConv(convId) {
    setActiveConvId(convId);
    markConversationAsRead(convId);
    setReplyingTo(null);
    setEditingMsgId(null);
  }

  function handleSendReply(e) {
    e.preventDefault();
    if (!replyText.trim() || !activeConv) return;

    sendDirectMessage(
      activeConv.id,
      replyText.trim(),
      {
        id: currentUser?.id,
        name: currentUser?.name || 'You',
      },
      replyingTo
    );

    setReplyText('');
    setReplyingTo(null);
    loadConversations();

    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 120);
  }

  function handleStartEdit(msg) {
    setEditingMsgId(msg.id);
    setEditText(msg.text);
    setActiveReactionPickerMsgId(null);
  }

  function handleSaveEdit(msgId) {
    if (!editText.trim()) return;
    editDirectMessage(activeConv.id, msgId, editText.trim());
    setEditingMsgId(null);
    setEditText('');
    loadConversations();
    playSound('reaction');
  }

  function handleDeleteMsg(msgId) {
    deleteDirectMessage(activeConv.id, msgId);
    loadConversations();
    playSound('reaction');
  }

  function handleReaction(msgId, emoji) {
    toggleMessageReaction(activeConv.id, msgId, emoji, currentUser?.name || 'You');
    setActiveReactionPickerMsgId(null);
    loadConversations();
  }

  function handleJumpToQuoted(quotedMsgId) {
    const el = document.getElementById(`msg-bubble-${quotedMsgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMsgId(quotedMsgId);
      setTimeout(() => setHighlightedMsgId(null), 2000);
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
            <h2>End-to-End Encrypted Messages</h2>
            <p>
              Direct messaging and status story replies are reserved for signed-in fellowship members.
              Sign in or create your account to securely message pastors, leaders, and friends.
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
          <h2>End-to-End Encrypted Fellowship Messages</h2>
        </div>
        <div className="inbox-header-e2ee-tag" onClick={() => setShowE2eeInfo((v) => !v)} title="Click for encryption details">
          <Lock size={12} className="e2ee-lock-icon" />
          <span>E2EE Active · AES-256</span>
          <Info size={12} />
        </div>
      </div>

      {showE2eeInfo && (
        <div className="inbox-e2ee-banner">
          <ShieldCheck size={18} className="e2ee-shield-icon" />
          <div>
            <strong>End-to-End Encrypted with Fellowship Key</strong>
            <p>
              Direct messages and 24-hour status replies are protected with client-side end-to-end encryption.
              Only you and your fellowship partner possess the keys to decrypt these conversations.
            </p>
          </div>
          <button type="button" className="e2ee-banner-close" onClick={() => setShowE2eeInfo(false)}>
            <X size={15} />
          </button>
        </div>
      )}

      <div className="inbox-layout">
        {/* Conversations List */}
        <div className={`inbox-sidebar${activeConvId ? ' has-active-on-mobile' : ''}`}>
          {conversations.length === 0 ? (
            <div className="inbox-empty-sidebar">
              <MessageCircle size={32} className="inbox-empty-icon" />
              <p>No messages yet. Direct messages and story comments will appear here!</p>
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
                    {conv.participantTag && <span className="inbox-conv-member-tag">{conv.participantTag}</span>}
                    <span className="inbox-conv-snippet">{conv.lastMessage}</span>
                  </div>
                  <div className="inbox-conv-meta">
                    <Lock size={10} className="inbox-mini-lock" title="Encrypted" />
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
                    <span className="inbox-thread-tag-text">{activeConv.participantTag || 'Fellowship Member'}</span>
                    <span className="inbox-e2ee-pill">
                      <Lock size={9} />
                      <span>Encrypted</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Message Bubbles */}
              <div className="inbox-thread-messages">
                {activeConv.messages?.map((msg) => {
                  const isMe = msg.isFromMe;
                  const isEditing = editingMsgId === msg.id;
                  const isHighlighted = highlightedMsgId === msg.id;

                  return (
                    <div
                      key={msg.id}
                      id={`msg-bubble-${msg.id}`}
                      className={`inbox-bubble-wrap${isMe ? ' from-me' : ' from-them'}${isHighlighted ? ' highlighted' : ''}`}
                    >
                      {/* Status Story Reply Header Context */}
                      {msg.storyReplyTo && (
                        <div className="inbox-story-reply-context">
                          <Sparkles size={12} className="story-context-icon" />
                          <span>Replied to 24h status: &ldquo;{msg.storyReplyTo}&rdquo;</span>
                        </div>
                      )}

                      {/* Quoted Reply Block */}
                      {msg.replyTo && (
                        <div
                          className="inbox-quoted-context"
                          onClick={() => handleJumpToQuoted(msg.replyTo.id)}
                          title="Click to view quoted message"
                        >
                          <Reply size={12} className="inbox-quoted-icon" />
                          <div className="inbox-quoted-text">
                            <strong>{msg.replyTo.senderName}</strong>: {msg.replyTo.text}
                          </div>
                        </div>
                      )}

                      <div className="inbox-bubble-row">
                        <div className="inbox-bubble">
                          {isEditing ? (
                            <div className="inbox-edit-box">
                              <input
                                type="text"
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="inbox-edit-input"
                                autoFocus
                              />
                              <div className="inbox-edit-actions">
                                <button type="button" className="inbox-edit-save-btn" onClick={() => handleSaveEdit(msg.id)}>
                                  <Check size={13} /> Save
                                </button>
                                <button type="button" className="inbox-edit-cancel-btn" onClick={() => setEditingMsgId(null)}>
                                  <X size={13} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className={`inbox-bubble-text${msg.isDeleted ? ' is-deleted' : ''}`}>{msg.text}</p>
                              <div className="inbox-bubble-footer">
                                {msg.isEdited && <span className="inbox-bubble-edited">(edited)</span>}
                                <span className="inbox-bubble-time">
                                  {msg.timestamp
                                    ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                    : 'Now'}
                                </span>
                              </div>
                            </>
                          )}

                          {/* Message Reactions Row */}
                          {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                            <div className="inbox-bubble-reactions">
                              {Object.entries(msg.reactions).map(([emoji, count]) => {
                                const userReacted = (msg.reactionUsers?.[emoji] || []).includes(currentUser?.name || 'You');
                                return (
                                  <button
                                    key={emoji}
                                    type="button"
                                    className={`inbox-reaction-tag${userReacted ? ' mine' : ''}`}
                                    onClick={() => handleReaction(msg.id, emoji)}
                                    title={`${count} reactions`}
                                  >
                                    <span>{emoji}</span>
                                    {count > 1 && <span className="inbox-reaction-count">{count}</span>}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Hover Quick Actions (Reply, React, Edit, Delete) */}
                        {!msg.isDeleted && !isEditing && (
                          <div className="inbox-msg-actions">
                            <button
                              type="button"
                              className="inbox-action-icon-btn"
                              onClick={() => setReplyingTo({ id: msg.id, text: msg.text, senderName: msg.senderName })}
                              title="Quote Reply"
                            >
                              <Reply size={13} />
                            </button>
                            <button
                              type="button"
                              className="inbox-action-icon-btn"
                              onClick={() =>
                                setActiveReactionPickerMsgId((id) => (id === msg.id ? null : msg.id))
                              }
                              title="Add Reaction"
                            >
                              <Smile size={13} />
                            </button>
                            {isMe && (
                              <>
                                <button
                                  type="button"
                                  className="inbox-action-icon-btn"
                                  onClick={() => handleStartEdit(msg)}
                                  title="Edit Message"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  type="button"
                                  className="inbox-action-icon-btn danger"
                                  onClick={() => handleDeleteMsg(msg.id)}
                                  title="Delete Message"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Reaction Picker Popover */}
                      {activeReactionPickerMsgId === msg.id && (
                        <div className="inbox-reaction-picker">
                          {FAITH_MESSAGE_REACTIONS.map((r) => (
                            <button
                              key={r.id}
                              type="button"
                              className="inbox-picker-emoji-btn"
                              onClick={() => handleReaction(msg.id, r.emoji)}
                              title={r.label}
                            >
                              {r.emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Live Typing Indicator */}
                {typingUser && (
                  <div className="inbox-typing-row">
                    <span className="typing-dots">
                      <span />
                      <span />
                      <span />
                    </span>
                    <span className="typing-label">{typingUser} is typing fellowship reply…</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quoted reply banner if active */}
              {replyingTo && (
                <div className="inbox-replying-to-banner">
                  <div className="replying-to-left">
                    <Reply size={14} className="replying-to-icon" />
                    <span>Replying to <strong>{replyingTo.senderName}</strong>: &ldquo;{replyingTo.text}&rdquo;</span>
                  </div>
                  <button type="button" className="replying-to-cancel" onClick={() => setReplyingTo(null)}>
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Reply Input Form */}
              <form className="inbox-reply-form" onSubmit={handleSendReply}>
                <input
                  type="text"
                  placeholder={`Encrypted message to ${activeConv.participantName}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="inbox-reply-input"
                />
                <button
                  type="submit"
                  className="inbox-reply-send-btn"
                  disabled={!replyText.trim()}
                  aria-label="Send encrypted message"
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          ) : (
            <div className="inbox-empty-thread">
              <MessageCircle size={40} className="inbox-empty-thread-icon" />
              <h3>Select a fellowship conversation</h3>
              <p>Direct encrypted messages and comments on your 24h status stories will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
