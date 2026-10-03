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
  Download,
  Flame,
  Globe,
} from 'lucide-react';
import { playSound } from '../lib/soundEffects';

export default function ShareMenuModal({
  post,
  onClose,
  onOpenWatermark,
  onLinkCopied,
}) {
  const [copied, setCopied] = useState(false);

  const postTitle = post?.title || post?.text_content?.slice(0, 60) || 'Fellowship update on Shammah';
  const authorName = post?.profiles?.name || post?.profiles?.display_name || 'Shammah Disciple';
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?post=${post?.id || ''}`
    : `https://shammah.faith/?post=${post?.id || ''}`;
  const shareText = `"${post?.text_content?.slice(0, 140) || 'Check out this faith reflection'}" — shared by ${authorName} on Shammah: ${shareUrl}`;

  async function handleCopyLink() {
    playSound('reaction');
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch {}
    setCopied(true);
    onLinkCopied?.();
    setTimeout(() => {
      onClose();
    }, 350);
  }

  function handleShareWhatsApp() {
    playSound('reaction');
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  }

  function handleShareTwitter() {
    playSound('reaction');
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  }

  async function handleNativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: postTitle,
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

  return (
    <div className="author-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="inst-profile-modal-card neon-glow-modal max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '420px' }}
      >
        {/* Header */}
        <div className="inst-modal-header">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
              <Share2 size={18} />
            </span>
            <div>
              <h3 className="text-base font-bold text-white">Share Fellowship Post</h3>
              <p className="text-xs text-gray-400">Spread the Gospel and bless others</p>
            </div>
          </div>
          <button
            type="button"
            className="inst-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Options Stack */}
        <div className="p-4 space-y-2 text-sm">
          {/* Quick Copy Link */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="w-full p-3 rounded-xl bg-white/[0.04] border border-cyan-500/30 hover:bg-cyan-950/30 hover:border-cyan-500 flex items-center justify-between text-left transition-all group"
          >
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300 group-hover:scale-110 transition-transform">
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </span>
              <div>
                <strong className="block text-white text-xs font-semibold">
                  Copy Direct Link
                </strong>
                <span className="text-[11px] text-gray-400">
                  Copies link with automatic 2s confirmation
                </span>
              </div>
            </div>
            <span className="text-[11px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-md">
              {copied ? 'Copied!' : 'Copy'}
            </span>
          </button>

          {/* WhatsApp */}
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="w-full p-3 rounded-xl bg-white/[0.04] border border-white/10 hover:border-emerald-500 hover:bg-emerald-950/30 flex items-center gap-3 text-left transition-all group"
          >
            <span className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 text-base">
              💬
            </span>
            <div>
              <strong className="block text-white text-xs font-semibold">
                Share to WhatsApp
              </strong>
              <span className="text-[11px] text-gray-400">
                Send to fellowship church groups &amp; family
              </span>
            </div>
          </button>

          {/* Twitter / X */}
          <button
            type="button"
            onClick={handleShareTwitter}
            className="w-full p-3 rounded-xl bg-white/[0.04] border border-white/10 hover:border-sky-500 hover:bg-sky-950/30 flex items-center gap-3 text-left transition-all group"
          >
            <span className="p-2 rounded-lg bg-sky-500/20 text-sky-300 text-base">
              𝕏
            </span>
            <div>
              <strong className="block text-white text-xs font-semibold">
                Share to X / Twitter
              </strong>
              <span className="text-[11px] text-gray-400">
                Post testimony &amp; scripture to public timeline
              </span>
            </div>
          </button>

          {/* Official Watermark Card */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenWatermark?.();
            }}
            className="w-full p-3 rounded-xl bg-white/[0.04] border border-amber-500/30 hover:border-amber-400 hover:bg-amber-950/30 flex items-center gap-3 text-left transition-all group"
          >
            <span className="p-2 rounded-lg bg-amber-500/20 text-amber-300">
              <Sparkles size={16} />
            </span>
            <div>
              <strong className="block text-white text-xs font-semibold flex items-center gap-1.5">
                <span>Official Watermarked Card</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                  PNG
                </span>
              </strong>
              <span className="text-[11px] text-gray-400">
                Generate branded card with flame logo &amp; link
              </span>
            </div>
          </button>

          {/* Native Web Share API if available */}
          {typeof navigator !== 'undefined' && navigator.share && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="w-full p-3 rounded-xl bg-white/[0.04] border border-white/10 hover:border-purple-500 hover:bg-purple-950/30 flex items-center gap-3 text-left transition-all group"
            >
              <span className="p-2 rounded-lg bg-purple-500/20 text-purple-300">
                <Globe size={16} />
              </span>
              <div>
                <strong className="block text-white text-xs font-semibold">
                  More Share Options...
                </strong>
                <span className="text-[11px] text-gray-400">
                  Open device system sharing dialog
                </span>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
