'use client';
import { useEffect, useState } from 'react';
import { MessageCircle, Send, Sparkles, User, ArrowLeft } from 'lucide-react';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import { getInboxConversations, sendDirectMessage } from '../lib/inboxManager';

export default function InboxView({ currentUser }) {
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [replyText, setReplyText] = useState('');

  function loadConversations() {
    const list = getInboxConversations();
    setConversations(list);
    if (!activeConvId && list.length > 0) {
      setActiveConvId(list[0].id);
    }
  }

  useEffect(() => {
    loadConversations();

    function onInboxUpdated() {
      loadConversations();
    }
    window.addEventListener('shammah:inbox-updated', onInboxUpdated);
    return () => window.removeEventListener('shammah:inbox-updated', onInboxUpdated);
  }, []);

  const activeConv = conversations.find((c) => c.id === activeConvId);

  function handleSendReply(e) {
    e.preventDefault();
    if (!replyText.trim() || !activeConv) return;

    sendDirectMessage(activeConv.id, replyText.trim(), {
      id: currentUser?.id,
      name: currentUser?.name || 'You',
    });

    setReplyText('');
    loadConversations();
  }

  return (
    <div className="inbox-shell">
      <div className="inbox-header">
        <div className="inbox-header-title">
          <MessageCircle size={20} className="inbox-title-icon" />
          <h2>Direct Fellowship &amp; Status Inbox</h2>
        </div>
        <p className="inbox-subtext">
          Status story replies and direct messages are received right here.
        </p>
      </div>

      <div className="inbox-layout">
        {/* Conversations List */}
        <div className={`inbox-sidebar${activeConvId ? ' has-active-on-mobile' : ''}`}>
          {conversations.length === 0 ? (
            <div className="inbox-empty-sidebar">
              <MessageCircle size={32} className="inbox-empty-icon" />
              <p>No messages yet. When people comment on your 24h status, they will appear here!</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const isSelected = conv.id === activeConvId;
              return (
                <div
                  key={conv.id}
                  className={`inbox-conv-item${isSelected ? ' active' : ''}`}
                  onClick={() => setActiveConvId(conv.id)}
                >
                  <Avatar
                    name={conv.participantName}
                    src={conv.participantAvatar}
                    className="avatar-sm"
                  />
                  <div className="inbox-conv-info">
                    <div className="inbox-conv-name-row">
                      <span className="inbox-conv-name">{conv.participantName}</span>
                      {conv.participantVerified && (
                        <VerifiedBadge badge={conv.participantBadge} size={14} />
                      )}
                    </div>
                    <span className="inbox-conv-snippet">{conv.lastMessage}</span>
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
                >
                  <ArrowLeft size={16} />
                </button>
                <Avatar
                  name={activeConv.participantName}
                  src={activeConv.participantAvatar}
                  className="avatar-sm"
                />
                <div className="inbox-thread-user-meta">
                  <div className="inbox-thread-name-row">
                    <span className="inbox-thread-name">{activeConv.participantName}</span>
                    {activeConv.participantVerified && (
                      <VerifiedBadge badge={activeConv.participantBadge} size={14} />
                    )}
                  </div>
                  <span className="inbox-thread-status">Fellowship Member</span>
                </div>
              </div>

              {/* Message Bubbles */}
              <div className="inbox-thread-messages">
                {activeConv.messages?.map((msg) => {
                  const isMe = msg.isFromMe;
                  return (
                    <div key={msg.id} className={`inbox-bubble-wrap${isMe ? ' from-me' : ' from-them'}`}>
                      {msg.storyReplyTo && (
                        <div className="inbox-story-reply-context">
                          <Sparkles size={12} className="story-context-icon" />
                          <span>Replied to 24h status: &ldquo;{msg.storyReplyTo}&rdquo;</span>
                        </div>
                      )}
                      <div className="inbox-bubble">
                        <p className="inbox-bubble-text">{msg.text}</p>
                        <span className="inbox-bubble-time">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply Input Form */}
              <form className="inbox-reply-form" onSubmit={handleSendReply}>
                <input
                  type="text"
                  placeholder={`Reply to ${activeConv.participantName}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="inbox-reply-input"
                />
                <button
                  type="submit"
                  className="inbox-reply-send-btn"
                  disabled={!replyText.trim()}
                  aria-label="Send reply"
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          ) : (
            <div className="inbox-empty-thread">
              <MessageCircle size={40} className="inbox-empty-thread-icon" />
              <h3>Select a fellowship conversation</h3>
              <p>Direct comments on your 24h status stories will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
