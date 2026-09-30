// Client-side helper for uploading post media (image / video / audio)
// to the Supabase Storage bucket "post-media".
//
// Usage:
//   import { uploadPostMedia, detectMediaType } from '../lib/mediaUpload';
//   const { url, type } = await uploadPostMedia(file, session.user.id);

import { supabase } from '../../lib/supabaseClient';

const MAX_BYTES = {
  image: 15 * 1024 * 1024,   // 15 MB
  video: 100 * 1024 * 1024,  // 100 MB
  audio: 50 * 1024 * 1024,   // 50 MB
};

const ALLOWED = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  audio: ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/webm'],
};

/**
 * Returns 'image' | 'video' | 'audio' | null
 */
export function detectMediaType(file) {
  if (!file || !file.type) return null;
  if (ALLOWED.image.includes(file.type)) return 'image';
  if (ALLOWED.video.includes(file.type)) return 'video';
  if (ALLOWED.audio.includes(file.type)) return 'audio';
  return null;
}

/**
 * Upload a single file to the post-media bucket.
 * Path pattern:  <userId>/<timestamp>-<safe-filename>
 *
 * @param {File} file
 * @param {string} userId  – auth.uid()
 * @returns {Promise<{ url: string, type: 'image'|'video'|'audio' }>}
 */
export async function uploadPostMedia(file, userId) {
  if (!file) throw new Error('No file selected.');
  if (!userId) throw new Error('You must be signed in to upload media.');

  const type = detectMediaType(file);
  if (!type) {
    throw new Error(
      'Unsupported file type. Please use JPG, PNG, WebP, GIF, MP4, WebM, MP3 or WAV.'
    );
  }

  const max = MAX_BYTES[type];
  if (file.size > max) {
    const mb = Math.round(max / (1024 * 1024));
    throw new Error(`That ${type} is too large. Maximum size is ${mb} MB.`);
  }

  // Keep the filename safe and reasonably short
  const safeName = (file.name || 'file')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 80);

  const path = `${userId}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage.from('post-media').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });

  if (error) {
    // Common friendly messages
    if (error.message?.toLowerCase().includes('payload too large')) {
      throw new Error('File is too large for the server. Try a smaller one.');
    }
    if (error.message?.toLowerCase().includes('mime')) {
      throw new Error('That file type is not allowed.');
    }
    throw new Error(error.message || 'Upload failed.');
  }

  const { data } = supabase.storage.from('post-media').getPublicUrl(path);

  return {
    url: data.publicUrl,
    type, // 'image' | 'video' | 'audio'
  };
}
