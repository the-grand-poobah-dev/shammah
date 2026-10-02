'use client';

/**
 * Watermark Canvas Generator for Shammah
 * Creates high-fidelity, magazine-style watermarked cards with Shammah logo,
 * author attribution, and official website link (shammah.faith).
 */

export async function generateWatermarkedCanvas(data = {}) {
  if (typeof window === 'undefined') return null;

  const {
    title = 'Shammah Fellowship',
    textContent = '',
    authorName = 'Fellowship Member',
    churchName = 'Shammah Global Community',
    category = 'General',
    mediaUrl = null,
    pollOptions = null,
    courseInfo = null,
    dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://shammah.faith',
  } = data;

  const canvas = document.createElement('canvas');
  const width = 1080;
  // Calculate dynamic height based on content
  const estimatedTextLines = Math.ceil((textContent.length || 60) / 45);
  let height = 1080;
  if (mediaUrl) height = 1350; // Instagram portrait
  if (estimatedTextLines > 8) height = Math.max(1080, 800 + estimatedTextLines * 36);

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 1. Rich dark gradient background (Stage & Sanctuary Luxury look)
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#0a0f1d');
  bgGrad.addColorStop(0.5, '#0f172a');
  bgGrad.addColorStop(1, '#050814');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Subtle luminous decorative glows (Cyan & Gold faith halo)
  const haloGrad = ctx.createRadialGradient(width - 150, 150, 10, width - 150, 150, 450);
  haloGrad.addColorStop(0, 'rgba(6, 182, 212, 0.18)');
  haloGrad.addColorStop(0.5, 'rgba(217, 119, 6, 0.08)');
  haloGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = haloGrad;
  ctx.fillRect(0, 0, width, height);

  // Neon glowing outer frame border
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
  ctx.lineWidth = 4;
  ctx.strokeRect(28, 28, width - 56, height - 56);

  ctx.strokeStyle = 'rgba(234, 179, 8, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(34, 34, width - 68, height - 68);

  // 3. TOP BRANDING BANNER: SHAMMAH LOGO & FLAME
  const topY = 70;
  // Flame icon circle
  const flameGrad = ctx.createLinearGradient(70, topY, 130, topY + 60);
  flameGrad.addColorStop(0, '#f59e0b');
  flameGrad.addColorStop(1, '#ef4444');
  ctx.fillStyle = flameGrad;
  ctx.beginPath();
  ctx.arc(100, topY + 25, 26, 0, Math.PI * 2);
  ctx.fill();

  // Draw flame symbol
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🔥', 100, topY + 26);

  // Brand Name "SHAMMAH"
  ctx.textAlign = 'left';
  ctx.font = '900 36px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('SHAMMAH', 140, topY + 20);

  // Tagline
  ctx.font = '600 15px "Inter", sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('CHRISTIAN COMMUNITY & CHURCH FELLOWSHIP', 142, topY + 44);

  // Category pill on top right
  ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
  ctx.beginPath();
  ctx.roundRect(width - 250, topY, 170, 42, 21);
  ctx.fill();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(category.toUpperCase(), width - 165, topY + 22);

  // Divider
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(70, topY + 80);
  ctx.lineTo(width - 70, topY + 80);
  ctx.stroke();

  // 4. AUTHOR ATTRIBUTION ROW
  const authorY = topY + 115;

  // Avatar circle
  const avatarGrad = ctx.createLinearGradient(70, authorY, 140, authorY + 60);
  avatarGrad.addColorStop(0, '#6366f1');
  avatarGrad.addColorStop(1, '#a855f7');
  ctx.fillStyle = avatarGrad;
  ctx.beginPath();
  ctx.arc(106, authorY + 30, 32, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(authorName.charAt(0).toUpperCase() || 'S', 106, authorY + 32);

  // Author Name & Verified Badge
  ctx.textAlign = 'left';
  ctx.font = 'bold 26px "Inter", sans-serif';
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(authorName, 156, authorY + 22);

  // Verified check badge
  ctx.fillStyle = '#06b6d4';
  ctx.beginPath();
  ctx.arc(156 + ctx.measureText(authorName).width + 20, authorY + 14, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('✓', 156 + ctx.measureText(authorName).width + 20, authorY + 15);

  // Church Name & Date
  ctx.textAlign = 'left';
  ctx.font = '500 17px "Inter", sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`⛪ ${churchName} · ${dateStr}`, 156, authorY + 48);

  // 5. MAIN CONTENT AREA
  let currentY = authorY + 105;

  if (courseInfo) {
    // Course Badge & Title
    ctx.fillStyle = 'rgba(168, 85, 247, 0.2)';
    ctx.beginPath();
    ctx.roundRect(70, currentY, width - 140, 90, 16);
    ctx.fill();
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#c084fc';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('🎓 KINGDOM DISCIPLESHIP ACADEMY COURSE', 96, currentY + 34);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(courseInfo.title || title, 96, currentY + 68);

    currentY += 125;
  }

  // Large Quote Icon for testimonies or scriptures
  ctx.fillStyle = 'rgba(234, 179, 8, 0.25)';
  ctx.font = '900 68px "Georgia", serif';
  ctx.fillText('“', 70, currentY + 20);

  // Render Multiline Text Content
  ctx.font = '400 28px/1.55 "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillStyle = '#f1f5f9';

  function wrapText(text, x, y, maxWidth, lineHeight) {
    const words = (text || '').split(' ');
    let line = '';
    let posY = y;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, posY);
        line = words[n] + ' ';
        posY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, posY);
    return posY + lineHeight;
  }

  currentY = wrapText(textContent || title, 70, currentY + 60, width - 140, 44);

  // If Poll options present, render visual poll options
  if (pollOptions && Array.isArray(pollOptions) && pollOptions.length > 0) {
    currentY += 20;
    pollOptions.forEach((opt, idx) => {
      const optY = currentY + idx * 56;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.beginPath();
      ctx.roundRect(70, optY, width - 140, 46, 12);
      ctx.fill();

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '600 18px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${idx + 1}. ${opt.label || opt}`, 90, optY + 28);
    });
    currentY += pollOptions.length * 56 + 20;
  }

  // 6. BOTTOM OFFICIAL WATERMARK FOOTER
  const footerY = height - 140;

  // Luminous Divider
  const divGrad = ctx.createLinearGradient(70, footerY, width - 70, footerY);
  divGrad.addColorStop(0, 'rgba(56, 189, 248, 0.1)');
  divGrad.addColorStop(0.5, 'rgba(234, 179, 8, 0.6)');
  divGrad.addColorStop(1, 'rgba(56, 189, 248, 0.1)');
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(70, footerY);
  ctx.lineTo(width - 70, footerY);
  ctx.stroke();

  // Watermark Seal Box
  ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
  ctx.beginPath();
  ctx.roundRect(70, footerY + 16, width - 140, 78, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Watermark text left
  ctx.textAlign = 'left';
  ctx.font = 'bold 20px "Inter", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Shared via Shammah', 96, footerY + 48);

  ctx.font = '500 14px "Inter", sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('Where Faith Gathers · Church Community & Courses', 96, footerY + 72);

  // Watermark website link on right with glowing pill
  ctx.textAlign = 'right';
  ctx.font = 'bold 20px monospace';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('🌐 shammah.faith', width - 96, footerY + 48);

  ctx.font = '500 13px "Inter", sans-serif';
  ctx.fillStyle = '#eab308';
  ctx.fillText('Scan or visit to connect & fellowship', width - 96, footerY + 72);

  return canvas;
}

/**
 * Converts canvas to PNG Blob
 */
export async function getWatermarkedBlob(data) {
  const canvas = await generateWatermarkedCanvas(data);
  if (!canvas) return null;
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

/**
 * Downloads the watermarked card to user device
 */
export async function downloadWatermarkedImage(data, filename = 'shammah-share.png') {
  const canvas = await generateWatermarkedCanvas(data);
  if (!canvas) return false;
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return true;
}

/**
 * Copies watermarked image to user clipboard
 */
export async function copyWatermarkedImage(data) {
  const blob = await getWatermarkedBlob(data);
  if (!blob) return false;
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([
        new window.ClipboardItem({ 'image/png': blob }),
      ]);
      return true;
    }
  } catch (err) {
    console.warn('Clipboard write image failed, falling back:', err);
  }
  return false;
}
