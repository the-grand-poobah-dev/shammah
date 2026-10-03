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
} from 'lucide-react';
import { playSound } from '../lib/soundEffects';

export default function ShareMenuModal({
  post,
  onClose,
  onOpenWatermark,
  onLinkCopied,
}) {
  const [copied, setCopied] = useState(false);
  const [activeItem, setActiveItem] = useState(null);

  const authorName = post?.profiles?.name || post?.profiles?.display_name || post?.author_name || 'Shammah Member';
  const postSnippet = post?.text_content ? post.text_content.slice(0, 140) : 'Check out this fellowship post';
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?post=${post?.id || ''}`
    : `https://shammah.faith/?post=${post?.id || ''}`;
  const shareText = `"${postSnippet}" — shared by ${authorName} on Shammah: ${shareUrl}`;

  async function handleCopyLink() {
    playSound('share');
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch {}
    setCopied(true);
    onLinkCopied?.();
    setTimeout(() => {
      setCopied(false);
      onClose();
    }, 900);
  }

  function handleShareWhatsApp() {
    playSound('reaction');
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    onClose();
  }

  function handleShareTwitter() {
    playSound('reaction');
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    onClose();
  }

  function handleShareFacebook() {
    playSound('reaction');
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    onClose();
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
          title: `Fellowship post by ${authorName}`,
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
      title: copied ? 'Link Copied to Clipboard!' : 'Copy Direct Link',
      desc: 'Instant URL to this post with link preview',
      icon: copied ? Check : Copy,
      color: '#06b6d4', // Cyan
      badge: copied ? 'Copied ✓' : 'Direct Link',
      action: handleCopyLink,
    },
    {
      id: 'whatsapp',
      title: 'Share to WhatsApp',
      desc: 'Send to church groups, Bible study & prayer partners',
      icon: MessageCircle,
      color: '#10b981', // Emerald Green
      badge: 'WhatsApp',
      action: handleShareWhatsApp,
    },
    {
      id: 'twitter',
      title: 'Share to X / Twitter',
      desc: 'Post scripture, quote & testimony to public feed',
      icon: ExternalLink,
      color: '#0ea5e9', // Sky Blue
      badge: 'Twitter',
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
    <div className="share-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Share Post">
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

        {/* Share Options List */}
        <div className="share-menu-options-list no-scrollbar">
          {SHARE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isHovered = activeItem === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                className={`share-menu-item-card${isHovered ? ' is-active' : ''}`}
                style={{
                  '--item-accent': opt.color,
                  borderColor: isHovered ? opt.color : undefined,
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
                    <span
                      className="share-menu-chip"
                      style={{
                        color: isHovered ? opt.color : undefined,
                        borderColor: isHovered ? opt.color : undefined,
                      }}
                    >
                      {opt.badge}
                    </span>
                  </div>
                  <small>{opt.desc}</small>
                </div>

                <span
                  className={`item-color-picker-box${isHovered ? ' active-picker' : ''}`}
                  style={{ '--picker-color': opt.color }}
                >
                  <span className="picker-box-swatch" />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
