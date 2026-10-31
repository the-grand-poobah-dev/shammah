'use client';

import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Share2,
  ExternalLink,
  Download,
  Image as ImageIcon,
  MessageCircle,
} from 'lucide-react';
import { playSound } from '../../lib/soundEffects';

export default function FundraiserShareModal({
  isOpen,
  onClose,
  fundraiser,
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !fundraiser) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://shammah.faith';
  const shareUrl = `${origin}/fundraisers/${fundraiser.id}`;
  const shareText = `Stand with us for "${fundraiser.title}". Give via M-Pesa on Shammah: ${shareUrl}`;

  function handleCopy() {
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
    setCopied(true);
    playSound('reaction');
    setTimeout(() => setCopied(false), 2500);
  }

  function handleWhatsApp() {
    playSound('reaction');
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, '_blank');
  }

  return (
    <div
      className="author-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{ zIndex: 100 }}
    >
      <div
        className="inst-profile-modal-card neon-glow-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '460px',
          width: '92%',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'color-mix(in srgb, var(--teal) 8%, var(--surface))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Share2 size={18} style={{ color: '#10b981' }} />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--ink)' }}>
              Share This Kingdom Cause
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="topbar-toggle-btn"
            style={{ width: 32, height: 32, borderRadius: '50%' }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Card preview */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              padding: '12px',
              borderRadius: '12px',
              background: 'var(--surface-sunken)',
              border: '1px solid var(--border)',
              alignItems: 'center',
            }}
          >
            {fundraiser.cover_url && (
              <img
                src={fundraiser.cover_url}
                alt={fundraiser.title}
                style={{ width: 56, height: 56, borderRadius: '10px', objectFit: 'cover' }}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {fundraiser.title}
              </h4>
              <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                Goal: KES {(Number(fundraiser.goal_kes) || 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Copy link input */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '6px' }}>
              Direct Link
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                readOnly
                value={shareUrl}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface-sunken)',
                  color: 'var(--ink)',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={handleCopy}
                style={{
                  padding: '9px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  background: copied ? '#10b981' : 'var(--teal)',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexShrink: 0,
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Share options */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            <button
              type="button"
              onClick={handleWhatsApp}
              style={{
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid #25D366',
                background: 'rgba(37, 211, 102, 0.1)',
                color: '#25D366',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <MessageCircle size={16} />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playSound('reaction');
                if (navigator.share) {
                  navigator.share({ title: fundraiser.title, text: shareText, url: shareUrl }).catch(() => {});
                } else {
                  handleCopy();
                }
              }}
              style={{
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                background: 'var(--surface-sunken)',
                color: 'var(--ink)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <Share2 size={16} />
              <span>More Options</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
