'use client';
import { useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  X,
  Sparkles,
  MessageCircle,
  ExternalLink,
  Globe,
  Share,
  FileText,
} from 'lucide-react';
import { playSound } from '../lib/soundEffects';

async function copyToClipboard(text) {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    // fallback below
  }
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (e) {
    return false;
  }
}

function openSafeUrl(url) {
  try {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch {
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }
}

export default function ShareMenuModal({
  post,
  onClose,
  onOpenWatermark,
  onLinkCopied,
}) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [activeItem, setActiveItem] = useState(null);

  const authorName = post?.profiles?.name || post?.profiles?.display_name || post?.author_name || 'Shammah Member';
  const postSnippet = post?.text_content ? post.text_content.slice(0, 160) : 'Check out this publication';
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?post=${post?.id || ''}`
    : `https://shammah.faith/?post=${post?.id || ''}`;
  const shareText = `"${postSnippet}" — ${authorName} on Shammah: ${shareUrl}`;

  function triggerToast(msg, duration = 1500) {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, duration);
  }

  async function handleCopyLink() {
    playSound('share');
    const success = await copyToClipboard(shareUrl);
    setCopiedLink(true);
    triggerToast('Post link copied to clipboard ✓');
    onLinkCopied?.();
    setTimeout(() => {
      setCopiedLink(false);
      onClose();
    }, 1100);
  }

  async function handleCopyText() {
    playSound('share');
    const content = post?.text_content || shareText;
    await copyToClipboard(content);
    setCopiedText(true);
    triggerToast('Post content copied to clipboard ✓');
    setTimeout(() => {
      setCopiedText(false);
      onClose();
    }, 1100);
  }

  function handleShareWhatsApp() {
    playSound('reaction');
    triggerToast('Opening WhatsApp...');
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    openSafeUrl(waUrl);
    setTimeout(() => {
      onClose();
    }, 700);
  }

  function handleShareTwitter() {
    playSound('reaction');
    triggerToast('Opening X / Twitter...');
    const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    openSafeUrl(twUrl);
    setTimeout(() => {
      onClose();
    }, 700);
  }

  function handleShareFacebook() {
    playSound('reaction');
    triggerToast('Opening Facebook...');
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    openSafeUrl(fbUrl);
    setTimeout(() => {
      onClose();
    }, 700);
  }

  function handleOpenWatermarkCard() {
    playSound('reaction');
    onClose();
    onOpenWatermark?.();
  }

  async function handleNativeShare() {
    playSound('reaction');
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Post by ${authorName}`,
          text: shareText,
          url: shareUrl,
        });
        onClose();
      } catch (err) {
        if (err.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  }

  const SHARE_OPTIONS = [
    {
      id: 'copy',
      title: copiedLink ? 'Link Copied to Clipboard!' : 'Copy Direct Link',
      desc: 'Instant web URL with preview and author reference',
      icon: copiedLink ? Check : Copy,
      color: '#06b6d4', // Cyan
      badge: copiedLink ? 'Copied ✓' : 'Direct Link',
      action: handleCopyLink,
    },
    {
      id: 'copy-text',
      title: copiedText ? 'Text Copied to Clipboard!' : 'Copy Post Content',
      desc: 'Copy full scripture, devotion, or sermon text',
      icon: copiedText ? Check : FileText,
      color: '#10b981', // Emerald
      badge: copiedText ? 'Copied ✓' : 'Text / Bible',
      action: handleCopyText,
    },
    {
      id: 'whatsapp',
      title: 'Share to WhatsApp',
      desc: 'Send to church groups, Bible study & prayer partners',
      icon: MessageCircle,
      color: '#22c55e', // Green
      badge: 'WhatsApp',
      action: handleShareWhatsApp,
    },
    {
      id: 'twitter',
      title: 'Share to X / Twitter',
      desc: 'Post scripture, quote & testimony to public feed',
      icon: ExternalLink,
      color: '#0ea5e9', // Sky Blue
      badge: 'X / Twitter',
      action: handleShareTwitter,
    },
    {
      id: 'facebook',
      title: 'Share to Facebook',
      desc: 'Share blessing with friends, family & church community',
      icon: Globe,
      color: '#3b82f6', // Royal Blue
      badge: 'Facebook',
      action: handleShareFacebook,
    },
    {
      id: 'watermark',
      title: 'Official Watermarked Card',
      desc: 'Generate branded high-res card with flame logo & quote',
      icon: Sparkles,
      color: '#f59e0b', // Sanctuary Amber
      badge: 'Branded PNG',
      action: handleOpenWatermarkCard,
    },
  ];

  if (typeof navigator !== 'undefined' && navigator.share) {
    SHARE_OPTIONS.push({
      id: 'native',
      title: 'System Share Sheet...',
      desc: 'Open standard device sharing options & contacts',
      icon: Share,
      color: '#8b5cf6', // Kingdom Purple
      badge: 'Device Options',
      action: handleNativeShare,
    });
  }

  return (
    <div
      className="share-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Share Post"
    >
      <div
        className="share-modal-card neon-glow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="share-modal-header">
          <div className="share-modal-title-row">
            <span className="share-modal-icon-badge">
              <Share2 size={18} />
            </span>
            <div className="share-modal-title-text">
              <h3>Share Fellowship Post</h3>
              <p>Spread Gospel encouragement and edify the church</p>
            </div>
          </div>
          <button
            type="button"
            className="share-modal-close-btn"
            onClick={onClose}
            aria-label="Close share menu"
          >
            <X size={17} />
          </button>
        </div>

        {/* In-Modal Feedback Toast */}
        {toastMessage && (
          <div className="share-modal-toast-banner">
            <Check size={16} className="text-emerald-400 flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Share Options List with outline card shadows only on highlighted items */}
        <div className="share-menu-options-list no-scrollbar">
          {SHARE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isHighlighted = activeItem === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                className={`share-menu-item-card${isHighlighted ? ' is-highlighted is-active' : ''}`}
                style={{
                  '--item-accent': opt.color,
                }}
                onMouseEnter={() => setActiveItem(opt.id)}
                onMouseLeave={() => setActiveItem(null)}
                onClick={opt.action}
              >
                <span
                  className="share-menu-icon-wrap"
                  style={{ '--item-accent': opt.color }}
                >
                  <Icon size={17} strokeWidth={2.2} />
                </span>

                <div className="share-menu-text-wrap">
                  <div className="share-menu-title-row">
                    <strong>{opt.title}</strong>
                    <span className="share-menu-chip">
                      {opt.badge}
                    </span>
                  </div>
                  <small>{opt.desc}</small>
                </div>

                <span
                  className={`item-color-picker-box${isHighlighted ? ' active-picker' : ''}`}
                  style={{ '--picker-color': opt.color }}
                >
                  <span className="picker-box-swatch" style={{ background: opt.color }} />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
