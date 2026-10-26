'use client';
import { useState, useEffect } from 'react';
import {
  Share2,
  Download,
  Copy,
  Check,
  X,
  Sparkles,
  Flame,
  Globe,
  AlertCircle,
} from 'lucide-react';
import PopupSheet from './PopupSheet';
import {
  generateWatermarkedCanvas,
  downloadWatermarkedImage,
  copyWatermarkedImage,
} from '../lib/watermarkManager';
import {
  BRAND,
  getPostShareUrl,
  formatShareText,
} from '../lib/brand';
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
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        const canvas = await generateWatermarkedCanvas(contentData);
        if (canvas && active) {
          try {
            setPreviewUrl(canvas.toDataURL('image/png'));
          } catch (exportErr) {
            console.error('Canvas export failed due to security/CORS restriction:', exportErr);
            setErrorMsg('Could not export canvas image due to cross-origin media security restrictions.');
          }
        } else if (active) {
          setErrorMsg('Failed to build card preview.');
        }
      } catch (err) {
        console.error('Failed to generate watermark canvas preview', err);
        if (active) setErrorMsg('Error generating preview card.');
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
    const safeTitle = (contentData?.title || contentData?.authorName || 'shammah-share')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .slice(0, 24);
    const success = await downloadWatermarkedImage(contentData, `shammah-${safeTitle}.png`);
    if (success) {
      setDownloaded(true);
      showToast('Watermarked image downloaded!');
      setTimeout(() => setDownloaded(false), 2000);
    } else {
      showToast('Could not download image. Cross-origin security error.');
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
      // Fallback: copy standardized brand text and post URL
      try {
        const shareUrl = contentData?.postId ? getPostShareUrl(contentData.postId) : BRAND.appUrl;
        const text = formatShareText({
          title: contentData?.title,
          textContent: contentData?.textContent,
          authorName: contentData?.authorName,
          churchName: contentData?.churchName,
          postId: contentData?.postId,
          postUrl: shareUrl,
        });
        await navigator.clipboard.writeText(text);
        setCopied(true);
        showToast('Link & text copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
      } catch {
        showToast('Unable to copy to clipboard.');
      }
    }
  }

  async function handleWebShare() {
    playSound('reaction');
    const shareUrl = contentData?.postId ? getPostShareUrl(contentData.postId) : BRAND.appUrl;
    const text = formatShareText({
      title: contentData?.title,
      textContent: contentData?.textContent,
      authorName: contentData?.authorName,
      churchName: contentData?.churchName,
      postId: contentData?.postId,
      postUrl: shareUrl,
    });
    const title = `${BRAND.appName} - ${contentData?.title || 'Fellowship Post'}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url: shareUrl,
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
    <PopupSheet
      open={true}
      onClose={onClose}
      size="md"
      title={
        <div className="watermark-modal-badge">
          <Sparkles size={14} className="text-amber-400" />
          <span>Watermarked Share Card</span>
        </div>
      }
      footer={
        <div className="watermark-footer-note" style={{ paddingTop: 0 }}>
          <Globe size={13} className="text-sky-400" />
          <span>Includes verified watermark: <strong>{BRAND.domain}</strong></span>
        </div>
      }
    >
      <div className="watermark-modal-intro">
        <h3>Share to WhatsApp, Instagram &amp; Socials</h3>
        <p>
          Any content shared outside the app is automatically watermarked with {BRAND.appName}&apos;s flame logo, &ldquo;{BRAND.tagline}&rdquo; tagline, and verified website link (<strong>{BRAND.domain}</strong>).
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
            <AlertCircle size={28} className="text-amber-400 mb-2" />
            <span className="text-rose-400 font-medium">{errorMsg || 'Could not generate preview'}</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="watermark-actions-grid">
        <button
          type="button"
          className="watermark-btn primary"
          onClick={handleDownload}
          disabled={loading || Boolean(errorMsg)}
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

      {toast && <div className="inst-modal-toast">{toast}</div>}
    </PopupSheet>
  );
}
