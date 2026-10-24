'use client';

/**
 * Watermark Canvas Generator for Shammah
 *
 * Generates high-fidelity, magazine-style watermarked cards with:
 * - Shammah flame logo & official tagline: 'The Lord is Here'
 * - Real author attribution with member badge & verification check
 * - Real church name (omitted cleanly when absent; never defaulted to placeholders)
 * - Formatted date, category pill, and multi-line text with font measurement
 * - Media image rendering with crossOrigin='anonymous' and CORS protection
 * - Interactive poll options preview when present
 * - Canonical website URL & verified watermark seal
 */

import { BRAND, getPostShareUrl } from './brand';
import { badgeById } from './badges';

/**
 * Helper to safely load remote images with crossOrigin = 'anonymous' and timeout.
 */
function loadRemoteImage(url, timeoutMs = 6000) {
  return new Promise((resolve) => {
    if (!url || typeof window === 'undefined') {
      return resolve({ img: null, error: 'no_url' });
    }
    const img = new Image();
    let finished = false;

    const timer = setTimeout(() => {
      if (!finished) {
        finished = true;
        console.warn('Canvas image load timed out for URL:', url);
        resolve({ img: null, error: 'timeout' });
      }
    }, timeoutMs);

    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!finished) {
        finished = true;
        clearTimeout(timer);
        resolve({ img, error: null });
      }
    };
    img.onerror = (err) => {
      if (!finished) {
        finished = true;
        clearTimeout(timer);
        console.warn('Canvas image load failed (CORS or network):', url, err);
        resolve({ img: null, error: 'load_or_cors_failed' });
      }
    };
    img.src = url;
  });
}

/**
 * Helper to wrap text cleanly given max width and return lines array.
 */
function getWrappedLines(ctx, text, maxWidth) {
  if (!text) return [];
  const paragraphs = String(text).split('\n');
  const lines = [];

  for (let p = 0; p < paragraphs.length; p++) {
    const rawParagraph = paragraphs[p].trim();
    if (!rawParagraph) {
      // Empty line / paragraph break
      if (lines.length > 0 && lines[lines.length - 1] !== '') {
        lines.push('');
      }
      continue;
    }

    const words = rawParagraph.split(/\s+/);
    let currentLine = '';

    for (let w = 0; w < words.length; w++) {
      const word = words[w];
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
}

/**
 * Generates watermarked share canvas with real data and brand assets.
 */
export async function generateWatermarkedCanvas(data = {}) {
  if (typeof window === 'undefined') return null;

  // 1. Wait for document fonts to be ready before text measurement & drawing
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Proceed even if font ready promise encounters an issue
    }
  }

  const {
    postId = null,
    title = '',
    textContent = '',
    authorName: rawAuthorName,
    authorBadge = null,
    authorVerified = false,
    churchName: rawChurchName = null,
    category = 'Fellowship',
    mediaUrl = null,
    mediaType = null,
    pollOptions = null,
    pollCounts = null,
    courseInfo = null,
    createdAt = null,
    dateStr: rawDateStr = null,
    _skipImage = false,
  } = data;

  // Ensure author name is not left as an empty placeholder
  const authorName = (rawAuthorName && rawAuthorName.trim()) || 'Disciple';

  // Do not default church name to generic placeholder when absent
  const churchName = (
    rawChurchName &&
    rawChurchName.trim() &&
    rawChurchName !== 'Shammah Global Community'
  ) ? rawChurchName.trim() : null;

  // Formatted date string
  const dateStr = rawDateStr || (
    createdAt
      ? new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  );

  // Badge metadata
  const badgeObj = authorBadge ? badgeById(authorBadge) : null;
  const badgeLabel = badgeObj?.label || (typeof authorBadge === 'string' && authorBadge !== 'member' ? authorBadge : null);

  // 2. Pre-load media image if present and not skipped
  let loadedImage = null;
  let imageLoadFailed = false;

  const isImageMedia = Boolean(
    mediaUrl &&
    (!mediaType || mediaType === 'image' || mediaUrl.match(/\.(jpeg|jpg|png|webp|gif)($|\?)/i))
  );

  if (isImageMedia && !_skipImage) {
    const res = await loadRemoteImage(mediaUrl, 6000);
    if (res?.img) {
      loadedImage = res.img;
    } else {
      imageLoadFailed = true;
    }
  }

  // 3. Measure text and calculate dynamic canvas height
  const width = 1080;
  const paddingX = 70;
  const contentWidth = width - paddingX * 2; // 940px

  // Temporary canvas context for font metrics measurement
  const measureCanvas = document.createElement('canvas');
  measureCanvas.width = width;
  measureCanvas.height = 200;
  const mCtx = measureCanvas.getContext('2d');
  mCtx.font = '400 28px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

  // Measure text lines
  const displayContent = textContent || title || 'The Lord is Here';
  let lines = getWrappedLines(mCtx, displayContent, contentWidth);

  // Limit max text lines to 14 so it fits comfortably; ellipsize the last line if truncated
  const MAX_TEXT_LINES = 14;
  if (lines.length > MAX_TEXT_LINES) {
    lines = lines.slice(0, MAX_TEXT_LINES);
    let last = lines[MAX_TEXT_LINES - 1];
    if (last.length > 3) {
      lines[MAX_TEXT_LINES - 1] = `${last.slice(0, -3)}...`;
    }
  }

  const lineHeight = 44;
  const textSectionHeight = Math.max(100, lines.length * lineHeight + 40);

  // Estimate media section height
  let mediaSectionHeight = 0;
  let drawImgWidth = contentWidth;
  let drawImgHeight = 0;

  if (loadedImage) {
    const naturalW = loadedImage.naturalWidth || contentWidth;
    const naturalH = loadedImage.naturalHeight || 600;
    const aspect = naturalH / naturalW;
    drawImgHeight = Math.min(560, Math.max(260, Math.round(contentWidth * aspect)));
    mediaSectionHeight = drawImgHeight + 40;
  } else if (imageLoadFailed) {
    mediaSectionHeight = 60; // Subtle indicator pill
  }

  // Poll section height
  let pollSectionHeight = 0;
  const validPollOptions = Array.isArray(pollOptions) && pollOptions.length > 0 ? pollOptions : null;
  if (validPollOptions) {
    pollSectionHeight = validPollOptions.length * 60 + 36;
  }

  // Course section height
  const courseSectionHeight = courseInfo ? 110 : 0;

  // Header and author attribution heights
  const headerHeight = 170;
  const authorHeight = 115;
  const footerHeight = 165;
  const spacingBetweenSections = 40;

  // Calculate total height dynamically to fit all real content
  let totalHeight = headerHeight + authorHeight + courseSectionHeight + textSectionHeight + mediaSectionHeight + pollSectionHeight + footerHeight + spacingBetweenSections;
  // Instagram portrait / luxury card min 1080, max 2200
  const height = Math.max(1080, Math.min(2200, Math.round(totalHeight)));

  // 4. Create primary drawing canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 5. Draw Luxury Sanctuary Dark Gradient Background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#0a0f1d');
  bgGrad.addColorStop(0.5, '#0f172a');
  bgGrad.addColorStop(1, '#050814');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Radiant cyan & gold atmospheric ambient glows
  const haloGrad = ctx.createRadialGradient(width - 150, 150, 10, width - 150, 150, 520);
  haloGrad.addColorStop(0, 'rgba(6, 182, 212, 0.20)');
  haloGrad.addColorStop(0.4, 'rgba(234, 179, 8, 0.08)');
  haloGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = haloGrad;
  ctx.fillRect(0, 0, width, height);

  const bottomGlow = ctx.createRadialGradient(160, height - 120, 10, 160, height - 120, 480);
  bottomGlow.addColorStop(0, 'rgba(139, 92, 246, 0.14)');
  bottomGlow.addColorStop(0.5, 'rgba(6, 182, 212, 0.06)');
  bottomGlow.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = bottomGlow;
  ctx.fillRect(0, 0, width, height);

  // Outer glowing double borders
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(26, 26, width - 52, height - 52, 24);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(234, 179, 8, 0.28)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(33, 33, width - 66, height - 66, 20);
  ctx.stroke();

  // 6. TOP BRANDING BANNER: SHAMMAH FLAME LOGO + APP NAME + TAGLINE
  const topY = 68;

  // Flame badge circular icon
  const flameGrad = ctx.createLinearGradient(70, topY, 130, topY + 60);
  flameGrad.addColorStop(0, BRAND.logo.gradient[0]);
  flameGrad.addColorStop(1, BRAND.logo.gradient[1]);
  ctx.fillStyle = flameGrad;
  ctx.beginPath();
  ctx.arc(102, topY + 26, 28, 0, Math.PI * 2);
  ctx.fill();

  // Subtle flame outline
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Flame symbol
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(BRAND.logo.symbol, 102, topY + 28);

  // Brand Name "SHAMMAH"
  ctx.textAlign = 'left';
  ctx.font = '900 36px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(BRAND.appName.toUpperCase(), 144, topY + 22);

  // Official Tagline "The Lord is Here"
  ctx.font = '600 16px "Inter", sans-serif';
  ctx.fillStyle = BRAND.logo.accentCyan;
  ctx.fillText(BRAND.tagline.toUpperCase(), 146, topY + 46);

  // Category chip on top right
  const categoryStr = (category || 'Fellowship').toUpperCase();
  ctx.font = 'bold 14px "Inter", sans-serif';
  const catWidth = Math.max(130, ctx.measureText(categoryStr).width + 36);
  const catX = width - paddingX - catWidth;

  ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
  ctx.beginPath();
  ctx.roundRect(catX, topY + 4, catWidth, 38, 19);
  ctx.fill();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#38bdf8';
  ctx.textAlign = 'center';
  ctx.fillText(categoryStr, catX + catWidth / 2, topY + 24);

  // Header divider
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(paddingX, topY + 82);
  ctx.lineTo(width - paddingX, topY + 82);
  ctx.stroke();

  // 7. AUTHOR ATTRIBUTION ROW WITH MEMBER BADGE & VERIFIED ICON
  const authorY = topY + 112;

  // Author avatar circle with initials
  const avatarGrad = ctx.createLinearGradient(paddingX, authorY, paddingX + 64, authorY + 64);
  avatarGrad.addColorStop(0, '#4f46e5');
  avatarGrad.addColorStop(1, '#9333ea');
  ctx.fillStyle = avatarGrad;
  ctx.beginPath();
  ctx.arc(paddingX + 32, authorY + 32, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 2;
  ctx.stroke();

  const initialLetter = (authorName.trim().charAt(0) || 'D').toUpperCase();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initialLetter, paddingX + 32, authorY + 34);

  // Author name text
  ctx.textAlign = 'left';
  ctx.font = 'bold 26px "Inter", -apple-system, sans-serif';
  ctx.fillStyle = '#f8fafc';
  const authorTextX = paddingX + 80;
  ctx.fillText(authorName, authorTextX, authorY + 22);

  // Member Badge and/or Verification Check
  let badgeOffset = authorTextX + ctx.measureText(authorName).width + 12;

  // Render Verification Check rosette
  if (authorVerified) {
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.arc(badgeOffset + 12, authorY + 16, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✓', badgeOffset + 12, authorY + 17);
    badgeOffset += 32;
  }

  // Render Member Role / Badge Chip
  if (badgeLabel) {
    ctx.font = '600 13px "Inter", sans-serif';
    const badgeText = badgeLabel.toUpperCase();
    const badgeW = ctx.measureText(badgeText).width + 22;

    ctx.fillStyle = 'rgba(234, 179, 8, 0.16)';
    ctx.beginPath();
    ctx.roundRect(badgeOffset, authorY + 4, badgeW, 25, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#facc15';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, badgeOffset + badgeW / 2, authorY + 17);
  }

  // Sub-row: Church Name (when present) & Date
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '500 17px "Inter", sans-serif';
  ctx.fillStyle = '#94a3b8';

  let subAuthorLine = '';
  if (churchName) {
    subAuthorLine = `⛪ ${churchName} · ${dateStr}`;
  } else {
    subAuthorLine = `📅 ${dateStr}`;
  }
  ctx.fillText(subAuthorLine, authorTextX, authorY + 54);

  // 8. OPTIONAL COURSE CARD
  let currentY = authorY + 95;

  if (courseInfo) {
    ctx.fillStyle = 'rgba(168, 85, 247, 0.15)';
    ctx.beginPath();
    ctx.roundRect(paddingX, currentY, contentWidth, 84, 16);
    ctx.fill();
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#c084fc';
    ctx.font = 'bold 15px "Inter", sans-serif';
    ctx.fillText('🎓 KINGDOM DISCIPLESHIP ACADEMY COURSE', paddingX + 24, currentY + 30);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "Inter", sans-serif';
    ctx.fillText(courseInfo.title || title, paddingX + 24, currentY + 62);

    currentY += 105;
  }

  // 9. MAIN TEXT CONTENT
  // Decorative quotation mark
  ctx.fillStyle = 'rgba(234, 179, 8, 0.22)';
  ctx.font = '900 64px "Georgia", serif';
  ctx.fillText('“', paddingX, currentY + 22);

  // Render multi-line text
  ctx.font = '400 28px/1.55 "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillStyle = '#f1f5f9';

  let textPosY = currentY + 44;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === '') {
      textPosY += lineHeight * 0.7;
    } else {
      ctx.fillText(line, paddingX, textPosY);
      textPosY += lineHeight;
    }
  }

  currentY = textPosY + 16;

  // 10. MEDIA IMAGE OR NOTICE (if present)
  if (loadedImage) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(paddingX, currentY, contentWidth, drawImgHeight, 18);
    ctx.clip();

    // Center crop drawing
    const imgAspect = loadedImage.naturalHeight / loadedImage.naturalWidth;
    const targetAspect = drawImgHeight / contentWidth;

    let sx = 0;
    let sy = 0;
    let sWidth = loadedImage.naturalWidth;
    let sHeight = loadedImage.naturalHeight;

    if (imgAspect > targetAspect) {
      // Taller image: crop top/bottom
      sHeight = loadedImage.naturalWidth * targetAspect;
      sy = (loadedImage.naturalHeight - sHeight) / 2;
    } else {
      // Wider image: crop left/right
      sWidth = loadedImage.naturalHeight / targetAspect;
      sx = (loadedImage.naturalWidth - sWidth) / 2;
    }

    ctx.drawImage(loadedImage, sx, sy, sWidth, sHeight, paddingX, currentY, contentWidth, drawImgHeight);
    ctx.restore();

    // Subtle outline around image
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(paddingX, currentY, contentWidth, drawImgHeight, 18);
    ctx.stroke();

    currentY += drawImgHeight + 30;
  } else if (imageLoadFailed) {
    // If image could not be loaded via CORS, show a neat fallback badge rather than a broken canvas
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.roundRect(paddingX, currentY, contentWidth, 48, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 16px "Inter", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('📷 Photo attachment included with post on Shammah', paddingX + 20, currentY + 30);
    currentY += 68;
  }

  // 11. POLL OPTIONS (if present)
  if (validPollOptions) {
    currentY += 10;
    const totalVotes = validPollOptions.reduce((acc, opt) => acc + (pollCounts?.[opt.id] || 0), 0);

    validPollOptions.forEach((opt, idx) => {
      const optY = currentY + idx * 58;
      const optVotes = pollCounts?.[opt.id] || 0;
      const pct = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0;
      const optLabel = typeof opt === 'string' ? opt : opt.label || `Option ${idx + 1}`;

      // Option background container
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      ctx.roundRect(paddingX, optY, contentWidth, 48, 12);
      ctx.fill();

      // If votes exist, draw fill bar
      if (pct > 0) {
        ctx.fillStyle = 'rgba(6, 182, 212, 0.18)';
        ctx.beginPath();
        ctx.roundRect(paddingX, optY, Math.round((contentWidth * pct) / 100), 48, 12);
        ctx.fill();
      }

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(paddingX, optY, contentWidth, 48, 12);
      ctx.stroke();

      // Option label
      ctx.fillStyle = '#f1f5f9';
      ctx.font = '600 18px "Inter", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${idx + 1}. ${optLabel}`, paddingX + 20, optY + 30);

      // Vote percentage if counts present
      if (totalVotes > 0) {
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 17px "Inter", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`${pct}%`, width - paddingX - 20, optY + 30);
      }
    });

    currentY += validPollOptions.length * 58 + 20;
  }

  // 12. BOTTOM OFFICIAL WATERMARK FOOTER
  const footerY = height - 138;

  // Luminous Divider
  const divGrad = ctx.createLinearGradient(paddingX, footerY, width - paddingX, footerY);
  divGrad.addColorStop(0, 'rgba(56, 189, 248, 0.15)');
  divGrad.addColorStop(0.5, 'rgba(234, 179, 8, 0.65)');
  divGrad.addColorStop(1, 'rgba(56, 189, 248, 0.15)');
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(paddingX, footerY);
  ctx.lineTo(width - paddingX, footerY);
  ctx.stroke();

  // Watermark Seal Box
  ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
  ctx.beginPath();
  ctx.roundRect(paddingX, footerY + 16, contentWidth, 82, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Watermark text left
  ctx.textAlign = 'left';
  ctx.font = 'bold 21px "Inter", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`Shared via ${BRAND.appName}`, paddingX + 24, footerY + 48);

  ctx.font = '500 14px "Inter", sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`"${BRAND.tagline}" · Christian Fellowship & Church Community`, paddingX + 24, footerY + 74);

  // Watermark website link on right with glowing monospace chip
  ctx.textAlign = 'right';
  ctx.font = 'bold 20px monospace';
  ctx.fillStyle = BRAND.logo.accentCyan;
  ctx.fillText(`🌐 ${BRAND.domain}`, width - paddingX - 24, footerY + 48);

  ctx.font = '500 13px "Inter", sans-serif';
  ctx.fillStyle = BRAND.logo.accentGold;
  ctx.fillText(`Visit ${BRAND.domain} to fellowship & connect`, width - paddingX - 24, footerY + 74);

  // 13. Pre-flight check: ensure canvas is not tainted by cross-origin images
  try {
    ctx.getImageData(0, 0, 1, 1);
  } catch (taintErr) {
    console.warn('Canvas was tainted by cross-origin image policy. Regenerating clean card without remote attachment...', taintErr);
    // Regenerate without the tainted remote image so the user is guaranteed an exportable PNG
    return generateWatermarkedCanvas({
      ...data,
      mediaUrl: null,
      _skipImage: true,
    });
  }

  return canvas;
}

/**
 * Converts watermarked canvas to PNG Blob safely.
 */
export async function getWatermarkedBlob(data) {
  try {
    const canvas = await generateWatermarkedCanvas(data);
    if (!canvas) return null;
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  } catch (err) {
    console.error('Failed to export watermarked canvas blob:', err);
    return null;
  }
}

/**
 * Downloads the watermarked card to user device as a PNG.
 */
export async function downloadWatermarkedImage(data, filename = 'shammah-share.png') {
  try {
    const canvas = await generateWatermarkedCanvas(data);
    if (!canvas) return false;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (err) {
    console.error('Failed to download watermarked image (possible CORS restriction):', err);
    return false;
  }
}

/**
 * Copies watermarked image to user clipboard.
 */
export async function copyWatermarkedImage(data) {
  try {
    const blob = await getWatermarkedBlob(data);
    if (!blob) return false;
    if (typeof navigator !== 'undefined' && navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([
        new window.ClipboardItem({ 'image/png': blob }),
      ]);
      return true;
    }
  } catch (err) {
    console.warn('Clipboard write image failed, falling back to link/text copy:', err);
  }
  return false;
}
