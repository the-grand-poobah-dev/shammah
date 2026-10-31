'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { detectMediaType, getImageSize, getVideoMeta } from '../../lib/mediaUpload';

/**
 * useMediaAttachment
 *
 * Unified hook managing media attachments (files, recordings, GIFs)
 * across composer, comment threads, and status updates.
 *
 * Handles object URL creation and revocation, metadata extraction,
 * and upload lifecycle tracking.
 */
export default function useMediaAttachment(initialMedia = null) {
  const [file, setFile] = useState(initialMedia?.file || null);
  const [mediaType, setMediaType] = useState(initialMedia?.mediaType || null); // 'image' | 'video' | 'audio' | 'gif'
  const [previewUrl, setPreviewUrl] = useState(initialMedia?.previewUrl || null);
  const [mediaMeta, setMediaMeta] = useState(initialMedia?.mediaMeta || null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  // Keep a ref of active preview URL to revoke on cleanup or change
  const activeBlobUrlRef = useRef(null);

  const revokeActiveBlob = useCallback(() => {
    if (activeBlobUrlRef.current && activeBlobUrlRef.current.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(activeBlobUrlRef.current);
      } catch (_) {}
      activeBlobUrlRef.current = null;
    }
  }, []);

  // Clean up blob on unmount
  useEffect(() => {
    return () => {
      revokeActiveBlob();
    };
  }, [revokeActiveBlob]);

  /**
   * Attach a standard device file (Photo, Video, Audio)
   */
  const attachFile = useCallback(async (selectedFile) => {
    if (!selectedFile) return;
    setError(null);

    const type = detectMediaType(selectedFile) || (
      selectedFile.type?.startsWith('video/')
        ? 'video'
        : selectedFile.type?.startsWith('audio/')
          ? 'audio'
          : 'image'
    );

    revokeActiveBlob();
    const objectUrl = URL.createObjectURL(selectedFile);
    activeBlobUrlRef.current = objectUrl;

    setFile(selectedFile);
    setMediaType(type);
    setPreviewUrl(objectUrl);

    // Extract dimension & duration metadata asynchronously
    try {
      if (type === 'image' || type === 'gif') {
        const size = await getImageSize(selectedFile);
        setMediaMeta({
          width: size.width || 0,
          height: size.height || 0,
          aspect: size.aspect || 1,
        });
      } else if (type === 'video') {
        const meta = await getVideoMeta(selectedFile);
        setMediaMeta({
          width: meta.width || 0,
          height: meta.height || 0,
          duration: meta.duration || 0,
          aspect: meta.aspect || 1,
        });
      } else if (type === 'audio') {
        // Measure audio duration
        const audio = document.createElement('audio');
        audio.preload = 'metadata';
        audio.src = objectUrl;
        audio.onloadedmetadata = () => {
          setMediaMeta({
            duration: Math.round(audio.duration) || 0,
            aspect: 1,
          });
        };
      }
    } catch (err) {
      console.warn('Could not extract media metadata:', err);
    }
  }, [revokeActiveBlob]);

  /**
   * Attach an animated GIF from GifPicker or external library
   */
  const attachGif = useCallback((gifData) => {
    if (!gifData?.url) return;
    setError(null);
    revokeActiveBlob();

    setFile(null);
    setMediaType('gif');
    setPreviewUrl(gifData.url);
    setMediaMeta(gifData.media_meta || {
      width: gifData.width || 400,
      height: gifData.height || 300,
      aspect: gifData.width && gifData.height ? gifData.width / gifData.height : 1.33,
    });
  }, [revokeActiveBlob]);

  /**
   * Attach recorded audio voice note
   */
  const attachAudio = useCallback(({ file: audioFile, duration = 0, previewUrl: audioUrl }) => {
    if (!audioFile && !audioUrl) return;
    setError(null);
    revokeActiveBlob();

    const finalUrl = audioUrl || (audioFile ? URL.createObjectURL(audioFile) : null);
    if (finalUrl && finalUrl.startsWith('blob:')) {
      activeBlobUrlRef.current = finalUrl;
    }

    setFile(audioFile || null);
    setMediaType('audio');
    setPreviewUrl(finalUrl);
    setMediaMeta({
      duration: Math.round(duration) || 0,
      aspect: 1,
    });
  }, [revokeActiveBlob]);

  /**
   * Remove current attachment and clear state
   */
  const removeAttachment = useCallback(() => {
    revokeActiveBlob();
    setFile(null);
    setMediaType(null);
    setPreviewUrl(null);
    setMediaMeta(null);
    setError(null);
    setProgress(0);
    setUploading(false);
  }, [revokeActiveBlob]);

  return {
    file,
    mediaType,
    previewUrl,
    mediaMeta,
    uploading,
    progress,
    error,
    attachFile,
    attachGif,
    attachAudio,
    removeAttachment,
    setFile,
    setMediaType,
    setPreviewUrl,
    setMediaMeta,
    setUploading,
    setProgress,
    setError,
  };
}
