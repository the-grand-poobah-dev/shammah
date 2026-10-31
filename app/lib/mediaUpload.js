// Client-side helper for uploading media to Supabase Storage:
// - 'post-media': general community posts & comments
// - 'media-library': long-form video & audio sermons/podcasts
// - 'thumbnails': custom video & audio artwork

import { supabase } from '../../lib/supabaseClient';

export const MAX_BYTES = {
  image: 15 * 1024 * 1024,   // 15 MB
  gif: 15 * 1024 * 1024,     // 15 MB
  video: 100 * 1024 * 1024,  // 100 MB
  audio: 50 * 1024 * 1024,   // 50 MB
};

export const ALLOWED_MIME = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  video: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'],
  audio: ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/aac', 'audio/x-m4a'],
};

/**
 * Returns 'image' | 'gif' | 'video' | 'audio' | null based on mime or extension
 */
export function detectMediaType(file) {
  if (!file) return null;
  const mime = (file.type || '').split(';')[0].trim().toLowerCase();
  if (mime === 'image/gif') return 'gif';
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.gif')) return 'gif';

  if (ALLOWED_MIME.image.includes(mime) || mime.startsWith('image/')) return 'image';
  if (ALLOWED_MIME.video.includes(mime) || mime.startsWith('video/')) return 'video';
  if (ALLOWED_MIME.audio.includes(mime) || mime.startsWith('audio/')) return 'audio';
  
  if (/\.(jpg|jpeg|png|webp|avif)$/i.test(name)) return 'image';
  if (/\.(mp4|webm|mov|m4v)$/i.test(name)) return 'video';
  if (/\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i.test(name)) return 'audio';
  return null;
}

/**
 * Extracts width, height, aspect ratio from image File/Blob or URL
 */
export async function getImageSize(fileOrUrl) {
  if (typeof window === 'undefined' || !fileOrUrl) return { width: 0, height: 0, aspect: 1 };
  return new Promise((resolve) => {
    const img = new Image();
    const isBlob = typeof fileOrUrl !== 'string';
    const url = isBlob ? URL.createObjectURL(fileOrUrl) : fileOrUrl;

    const cleanup = () => {
      if (isBlob) URL.revokeObjectURL(url);
    };

    img.onload = () => {
      const width = img.naturalWidth || img.width || 0;
      const height = img.naturalHeight || img.height || 0;
      const aspect = height > 0 ? Number((width / height).toFixed(3)) : 1;
      cleanup();
      resolve({ width, height, aspect });
    };

    img.onerror = () => {
      cleanup();
      resolve({ width: 0, height: 0, aspect: 1 });
    };

    img.src = url;
  });
}

/**
 * Extracts width, height, duration, aspect ratio from video File/Blob or URL
 */
export async function getVideoMeta(fileOrUrl) {
  if (typeof window === 'undefined' || !fileOrUrl) return { width: 0, height: 0, duration: 0, aspect: 1 };
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const isBlob = typeof fileOrUrl !== 'string';
    const url = isBlob ? URL.createObjectURL(fileOrUrl) : fileOrUrl;

    const cleanup = () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
      if (isBlob) URL.revokeObjectURL(url);
    };

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const timer = setTimeout(() => {
      cleanup();
      resolve({ width: 0, height: 0, duration: 0, aspect: 1 });
    }, 10000);

    video.onloadedmetadata = () => {
      clearTimeout(timer);
      const width = video.videoWidth || 0;
      const height = video.videoHeight || 0;
      const duration = Math.round(video.duration) || 0;
      const aspect = height > 0 ? Number((width / height).toFixed(3)) : 1;
      cleanup();
      resolve({ width, height, duration, aspect });
    };

    video.onerror = () => {
      clearTimeout(timer);
      cleanup();
      resolve({ width: 0, height: 0, duration: 0, aspect: 1 });
    };

    video.src = url;
  });
}

/**
 * Upload a single file to post-media bucket (backwards-compatible with posts & comments).
 */
export async function uploadPostMedia(file, userId) {
  if (!file) throw new Error('No file selected.');
  if (!userId) throw new Error('You must be signed in to upload media.');

  const type = detectMediaType(file);
  if (!type) {
    throw new Error('Unsupported file type. Please use JPG, PNG, WebP, GIF, MP4, WebM, MP3 or WAV.');
  }

  const max = MAX_BYTES[type] || MAX_BYTES.image;
  if (file.size > max) {
    const mb = Math.round(max / (1024 * 1024));
    throw new Error(`That ${type} is too large. Maximum size is ${mb} MB.`);
  }

  const safeName = (file.name || 'file')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 80);

  const path = `${userId}/${Date.now()}-${safeName}`;
  const cleanContentType = (file.type || '').split(';')[0] || (
    type === 'gif' ? 'image/gif' :
    type === 'image' ? 'image/jpeg' :
    type === 'video' ? 'video/mp4' :
    'audio/webm'
  );

  const { error } = await supabase.storage.from('post-media').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: cleanContentType,
  });

  if (error) {
    if (error.message?.toLowerCase().includes('payload too large')) {
      throw new Error('File is too large for the server. Try a smaller one.');
    }
    throw new Error(error.message || 'Upload failed.');
  }

  const { data } = supabase.storage.from('post-media').getPublicUrl(path);

  return {
    url: data.publicUrl,
    type,
    path,
  };
}

/**
 * Uploads a first-class video or audio file to the 'media-library' bucket
 * with progress reporting and path formatting: <userId>/<timestamp>-<safeName>
 * 
 * @param {File|Blob} file 
 * @param {string} userId 
 * @param {Object} options { kind: 'video'|'audio', onProgress: (pct) => void, bucket: string }
 * @returns {Promise<{ url: string, path: string, kind: string, size: number }>}
 */
export async function uploadMediaItem(file, userId, options = {}) {
  if (!file) throw new Error('No media file provided.');
  if (!userId) throw new Error('Sign-in required to publish to media library.');

  const detectedKind = options.kind || detectMediaType(file);
  if (!detectedKind || (detectedKind !== 'video' && detectedKind !== 'audio' && detectedKind !== 'image')) {
    throw new Error('Invalid media type. Expected video, audio, or image thumbnail.');
  }

  const bucket = options.bucket || (detectedKind === 'image' ? 'thumbnails' : 'media-library');
  const max = MAX_BYTES[detectedKind] || (100 * 1024 * 1024);
  
  if (file.size > max) {
    const mb = Math.round(max / (1024 * 1024));
    throw new Error(`File is too large. Maximum allowed size is ${mb} MB.`);
  }

  const onProgress = options.onProgress || (() => {});
  const safeName = (file.name || `media-${Date.now()}`)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 80);

  const path = `${userId}/${Date.now()}-${safeName}`;
  const contentType = (file.type || '').split(';')[0] || (detectedKind === 'video' ? 'video/mp4' : detectedKind === 'audio' ? 'audio/mpeg' : 'image/jpeg');

  onProgress(10);

  // Attempt XMLHttpRequest for real progress if access token and endpoint are available
  const sessionRes = await supabase.auth.getSession().catch(() => null);
  const token = sessionRes?.data?.session?.access_token;
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  let uploadedSuccessfully = false;

  if (typeof window !== 'undefined' && token && projectUrl && !projectUrl.includes('placeholder')) {
    try {
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const uploadUrl = `${projectUrl}/storage/v1/object/${bucket}/${path}`;
        xhr.open('POST', uploadUrl, true);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('x-upsert', 'false');
        if (contentType) xhr.setRequestHeader('Content-Type', contentType);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.min(95, Math.round((e.loaded / e.total) * 100));
            onProgress(pct);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            uploadedSuccessfully = true;
            resolve(xhr.responseText);
          } else {
            reject(new Error(`Storage server error: ${xhr.statusText || xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error('Network error during media upload.'));
        xhr.send(file);
      });
    } catch {
      // Fallback to standard Supabase SDK upload
      uploadedSuccessfully = false;
    }
  }

  if (!uploadedSuccessfully) {
    onProgress(35);
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType,
    });

    if (error) {
      throw new Error(error.message || 'Media upload failed.');
    }
  }

  onProgress(100);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);

  return {
    url: data.publicUrl,
    path,
    kind: detectedKind,
    size: file.size,
  };
}

/**
 * Extracts a video frame into a JPEG Blob thumbnail using a hidden <video> + canvas.
 * 
 * @param {File|Blob} file 
 * @param {number} seekSeconds Default 1.0s or 10%
 * @returns {Promise<Blob>} JPEG thumbnail Blob
 */
export async function generateVideoThumbnail(file, seekSeconds = 1.0) {
  if (typeof window === 'undefined') return null;
  if (!file) throw new Error('No video file provided.');

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    let isCleanedUp = false;

    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      video.pause();
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(url);
    };

    video.src = url;
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Thumbnail extraction timed out.'));
    }, 12000);

    video.onloadedmetadata = () => {
      const targetTime = Math.min(seekSeconds, Math.max(0.2, (video.duration || 1) * 0.1));
      video.currentTime = targetTime;
    };

    video.onseeked = () => {
      try {
        const maxWidth = 1280;
        let width = video.videoWidth || 640;
        let height = video.videoHeight || 360;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            clearTimeout(timeout);
            cleanup();
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Could not generate thumbnail blob from canvas.'));
            }
          },
          'image/jpeg',
          0.85
        );
      } catch (err) {
        clearTimeout(timeout);
        cleanup();
        reject(err);
      }
    };

    video.onerror = () => {
      clearTimeout(timeout);
      cleanup();
      reject(new Error('Failed to load video for thumbnail extraction.'));
    };
  });
}

/**
 * Determines media duration in seconds by reading HTML5 Audio/Video metadata.
 * 
 * @param {File|Blob} file 
 * @returns {Promise<number>} Duration in integer seconds
 */
export async function getMediaDuration(file) {
  if (typeof window === 'undefined') return 0;
  if (!file) return 0;

  const type = detectMediaType(file);
  const isVideo = type === 'video';
  const isAudio = type === 'audio';

  if (!isVideo && !isAudio) return 0;

  return new Promise((resolve) => {
    const el = document.createElement(isVideo ? 'video' : 'audio');
    const url = URL.createObjectURL(file);

    const cleanup = () => {
      el.pause();
      el.removeAttribute('src');
      el.load();
      URL.revokeObjectURL(url);
    };

    el.preload = 'metadata';
    el.src = url;

    const timer = setTimeout(() => {
      cleanup();
      resolve(0);
    }, 8000);

    el.onloadedmetadata = () => {
      clearTimeout(timer);
      const secs = Math.round(el.duration) || 0;
      cleanup();
      resolve(secs);
    };

    el.onerror = () => {
      clearTimeout(timer);
      cleanup();
      resolve(0);
    };
  });
}
