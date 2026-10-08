'use client';
import { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  X,
  Bot,
  User,
  Flame,
  Share2,
  Copy,
  Check,
  BookOpen,
  PenSquare,
  MessageCircle,
  RefreshCw,
  Minus,
  Maximize2,
} from 'lucide-react';
import { playSound } from '../lib/soundEffects';

const QUICK_PROMPTS = [
  { icon: '🙏', label: 'Prayer for Peace', prompt: 'Please write a compassionate, uplifting prayer for someone walking through a season of anxiety and seeking God’s peace.' },
  { icon: '📖', label: 'Explain Scripture', prompt: 'Could you explain the context and deeper spiritual meaning of Philippians 4:6-7?' },
  { icon: '📊', label: 'Community Poll', prompt: 'Suggest 3 engaging, creative poll questions for this Sunday’s church service or youth gathering.' },
  { icon: '📝', label: 'Sermon Outline', prompt: 'Prepare a 3-point biblical sermon outline on the topic "Faith That Overcomes Fear", with scriptures and illustrations.' },
  { icon: '🕊️', label: 'Morning Devotional', prompt: 'Write a short 2-minute morning devotional on walking in continuous communion with the Holy Spirit.' },
  { icon: '🎓', label: 'Course Outline', prompt: 'Outline a 4-module discipleship curriculum for new believers learning the foundations of the faith.' },
];

export default function ShammahChatbotModal({
  onClose,
  onShareContent = null,
  onPopulateCompose = null,
}) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      text: `🕊️ **Shalom & Welcome to Shammah AI!**\n\nI am your biblically grounded pastoral companion and ministry assistant. How can I serve your walk with Christ today?\n\nFeel free to ask for scripture explanations, sermon notes, prayer, poll ideas, or discipleship course materials!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function handleSend(textToSend) {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    playSound('reaction');
    const userMsg = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationHistory: messages.slice(-6),
        }),
      });

      const data = await res.json();
      const botReply = data.reply || 'May the peace of God guard your heart and mind in Christ Jesus.';

      setMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          sender: 'bot',
          text: botReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      console.error('Chatbot error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          sender: 'bot',
          text: `*"Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go." (Joshua 1:9)*\n\nGrace and peace to you in Jesus' name.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleCopy(id, text) {
    playSound('reaction');
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleShare(text) {
    if (onShareContent) {
      onShareContent({
        title: 'Shammah AI Word of Faith',
        textContent: text,
        authorName: 'Shammah Pastoral AI',
        churchName: 'Shammah Global Community',
        category: 'Faith & Devotion',
      });
    }
  }

  function handlePostToFeed(text) {
    if (onPopulateCompose) {
      onPopulateCompose(text);
      onClose();
    }
  }

  if (isMinimized) {
    return (
      <div className="shammah-chatbot-minimized" onClick={() => setIsMinimized(false)}>
        <div className="circular-bot-pulse">
          <Flame size={20} className="text-amber-400" />
        </div>
        <span className="minimized-label">Shammah AI</span>
      </div>
    );
  }

  return (
    <div className="shammah-chatbot-popover-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="shammah-chatbot-window neon-glow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Circular glowing header */}
        <header className="chatbot-header">
          <div className="chatbot-avatar-col">
            <div className="chatbot-circular-avatar">
              <Flame size={20} className="text-amber-400" />
              <span className="chatbot-online-dot" />
            </div>
            <div className="chatbot-meta">
              <div className="chatbot-title-row">
                <h4>Shammah AI</h4>
                <span className="chatbot-verified-chip">Scripture Grounded</span>
              </div>
              <span className="chatbot-sub">Pastoral &amp; Study Companion</span>
            </div>
          </div>

          <div className="chatbot-header-actions">
            <button
              type="button"
              className="chatbot-icon-btn"
              onClick={() => setIsMinimized(true)}
              title="Minimize"
              aria-label="Minimize"
            >
              <Minus size={15} />
            </button>
            <button
              type="button"
              className="chatbot-icon-btn close-btn"
              onClick={onClose}
              title="Close"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        {/* Quick Suggestion Chips */}
        <div className="chatbot-prompts-bar no-scrollbar">
          {QUICK_PROMPTS.map((qp, i) => (
            <button
              key={i}
              type="button"
              className="chatbot-chip-btn"
              onClick={() => handleSend(qp.prompt)}
              disabled={loading}
            >
              <span>{qp.icon}</span>
              <span>{qp.label}</span>
            </button>
          ))}
        </div>

        {/* Messages Stream */}
        <div className="chatbot-messages-area">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`chatbot-bubble-row ${m.sender === 'user' ? 'user-side' : 'bot-side'}`}
            >
              {m.sender === 'bot' && (
                <div className="chatbot-mini-avatar">
                  <Flame size={14} className="text-amber-400" />
                </div>
              )}

              <div className="chatbot-bubble">
                <div className="chatbot-bubble-text">
                  {m.text.split('\n').map((line, idx) => (
                    <p key={idx} className={line.startsWith('**') ? 'font-bold' : ''}>
                      {line}
                    </p>
                  ))}
                </div>

                <div className="chatbot-bubble-foot">
                  <span className="chatbot-msg-time">{m.timestamp}</span>

                  {m.sender === 'bot' && (
                    <div className="chatbot-msg-actions">
                      <button
                        type="button"
                        className="chatbot-action-tiny-btn"
                        onClick={() => handleCopy(m.id, m.text)}
                        title="Copy text"
                      >
                        {copiedId === m.id ? <Check size={12} /> : <Copy size={12} />}
                      </button>

                      {onShareContent && (
                        <button
                          type="button"
                          className="chatbot-action-tiny-btn"
                          onClick={() => handleShare(m.text)}
                          title="Share with Watermark"
                        >
                          <Share2 size={12} />
                        </button>
                      )}

                      {onPopulateCompose && (
                        <button
                          type="button"
                          className="chatbot-action-tiny-btn"
                          onClick={() => handlePostToFeed(m.text)}
                          title="Post to Feed"
                        >
                          <PenSquare size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="chatbot-bubble-row bot-side">
              <div className="chatbot-mini-avatar">
                <Flame size={14} className="text-amber-400 animate-spin" />
              </div>
              <div className="chatbot-bubble loading-bubble">
                <div className="typing-dots">
                  <span />
                  <span />
                  <span />
                </div>
                <span className="typing-text">Shammah AI is reflecting in scripture...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          className="chatbot-input-bar"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <input
            type="text"
            className="chatbot-input-field"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask scripture questions, prayer, poll ideas..."
            disabled={loading}
          />
          <button
            type="submit"
            className="chatbot-send-btn"
            disabled={loading || !input.trim()}
            aria-label="Send"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
