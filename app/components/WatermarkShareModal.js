'use client';
import { useState, useEffect, useRef } from 'react';
import {
  Share2,
  Download,
  Copy,
  Check,
  X,
  Sparkles,
  ExternalLink,
  Flame,
  Globe,
} from 'lucide-react';
import {
  generateWatermarkedCanvas,
  downloadWatermarkedImage,
  copyWatermarkedImage,
} from '../lib/watermarkManager';
import { playSound } from '../lib/soundEffects';

export default function WatermarkShareModal({
  contentData,
  onClose,
}) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const canvas = await generateWatermarkedCanvas(contentData);
        if (canvas && active) {
          setPreviewUrl(canvas.toDataURL('image/png'));
        }
      } catch (err) {
        console.error('Failed to generate watermark canvas preview', err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [contentData]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  async function handleDownload() {
    playSound('reaction');
    const safeTitle = (contentData.title || contentData.authorName || 'shammah-share')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .slice(0, 24);
    const success = await downloadWatermarkedImage(contentData, `shammah-${safeTitle}.png`);
    if (success) {
      setDownloaded(true);
      showToast('Watermarked image downloaded!');
      setTimeout(() => setDownloaded(false), 2000);
    }
  }

  async function handleCopyImage() {
    playSound('reaction');
    const ok = await copyWatermarkedImage(contentData);
    if (ok) {
      setCopied(true);
      showToast('Watermarked image copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } else {
      // Fallback: copy link and text
      try {
        const text = `${contentData.textContent || ''}\n\nShared via Shammah: https://shammah.faith`;
        await navigator.clipboard.writeText(text);
        setCopied(true);
        showToast('Link & text copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
      } catch {}
    }
  }

  async function handleWebShare() {
    playSound('reaction');
    const text = `${contentData.textContent || ''}\n\nShared via Shammah (Church & Christian Community): https://shammah.faith`;
    const title = contentData.title || 'Shammah';

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url: 'https://shammah.faith',
        });
        showToast('Shared successfully!');
      } catch (err) {
        if (err.name !== 'AbortError') {
          showToast('Could not open share menu');
        }
      }
    } else {
      handleCopyImage();
    }
  }

  return (
    <div className="vis-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="vis-modal-card neon-glow-modal watermark-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="watermark-modal-header">
          <div className="watermark-modal-badge">
            <Sparkles size={14} className="text-amber-400" />
            <span>Watermarked Share Card</span>
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

        <div className="watermark-modal-intro">
          <h3>Share to WhatsApp, Instagram &amp; Socials</h3>
          <p>
            Any content shared outside the app is automatically watermarked with Shammah&apos;s flame logo and website link (<strong>shammah.faith</strong>).
          </p>
        </div>

        {/* Live Canvas Preview Frame */}
        <div className="watermark-preview-box">
          {loading ? (
            <div className="watermark-loading-state">
              <Flame size={32} className="text-amber-500 animate-pulse" />
              <span>Generating watermarked view...</span>
            </div>
          ) : previewUrl ? (
            <div className="watermark-img-wrap">
              <img
                src={previewUrl}
                alt="Watermarked Content"
                className="watermark-rendered-img"
              />
            </div>
          ) : (
            <div className="watermark-loading-state">
              <span>Could not generate preview</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="watermark-actions-grid">
          <button
            type="button"
            className="watermark-btn primary"
            onClick={handleDownload}
            disabled={loading}
          >
            {downloaded ? <Check size={16} /> : <Download size={16} />}
            <span>{downloaded ? 'Downloaded ✓' : 'Download Image'}</span>
          </button>

          <button
            type="button"
            className="watermark-btn secondary"
            onClick={handleCopyImage}
            disabled={loading}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? 'Copied ✓' : 'Copy Image'}</span>
          </button>

          <button
            type="button"
            className="watermark-btn share"
            onClick={handleWebShare}
            disabled={loading}
          >
            <Share2 size={16} />
            <span>Share Sheet</span>
          </button>
        </div>

        <div className="watermark-footer-note">
          <Globe size={13} className="text-sky-400" />
          <span>Includes verified watermark: <strong>shammah.faith</strong></span>
        </div>

        {toast && <div className="inst-modal-toast">{toast}</div>}
      </div>
    </div>
  );
}
