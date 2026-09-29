// Client-side image prep: validates, center-crops to a target size and
// re-encodes as JPEG so uploads are small (important on mobile data).

const MAX_INPUT_BYTES = 15 * 1024 * 1024; // refuse absurdly large originals
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

export async function prepareImage(file, { width, height, quality = 0.85 }) {
  if (!file) throw new Error('No file selected.');
  if (!ALLOWED.includes(file.type)) throw new Error('Please choose a JPG, PNG or WebP image.');
  if (file.size > MAX_INPUT_BYTES) throw new Error('That image is too large. Please pick one under 15 MB.');

  const bitmap = await loadBitmap(file);
  const srcW = bitmap.width;
  const srcH = bitmap.height;
  const targetRatio = width / height;
  const srcRatio = srcW / srcH;

  let cropW = srcW;
  let cropH = srcH;
  if (srcRatio > targetRatio) cropW = Math.round(srcH * targetRatio);
  else cropH = Math.round(srcW / targetRatio);
  const sx = Math.round((srcW - cropW) / 2);
  const sy = Math.round((srcH - cropH) / 2);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; // PNG transparency -> white instead of black
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, sx, sy, cropW, cropH, 0, 0, width, height);
  if (bitmap.close) bitmap.close();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) throw new Error('Could not process that image. Try another one.');
  return { blob, previewUrl: URL.createObjectURL(blob) };
}

async function loadBitmap(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* fall through to <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not read that image.'));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
