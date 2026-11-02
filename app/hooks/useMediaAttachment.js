'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { detectMediaType, getImageSize, getVideoMeta } from '../lib/mediaUpload';

/**
 * Shared attachment state for post/comment/status media.
 * Consumers own the upload action; this hook owns local previews and metadata.
 */
export function useMediaAttachment() {
  const [file, setFile] = useState(null);
  const [gifRef, setGifRef] = useState(null);
  const [type, setType] = useState(null);
  const [preview, setPreview] = useState(null);
  const [meta, setMeta] = useState({});
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const requestRef = useRef(0);

  useEffect(() => {
    const url = preview?.url;
    return () => {
      if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
    };
  }, [preview?.url]);

  const selectFile = useCallback((selectedFile) => {
    if (!selectedFile) return;
    const requestId = ++requestRef.current;
    const detected = detectMediaType(selectedFile);
    if (!detected) {
      setError('Unsupported media type.');
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setFile(selectedFile);
    setGifRef(null);
    setType(detected);
    setPreview({ url, type: detected, name: selectedFile.name });
    setMeta({});
    setProgress(0);
    setError('');

    const readMeta = detected === 'video' ? getVideoMeta(selectedFile) : detected === 'image' || detected === 'gif' ? getImageSize(selectedFile) : Promise.resolve({});
    readMeta.then((value) => {
      if (requestId === requestRef.current) setMeta(value || {});
    }).catch(() => {
      if (requestId === requestRef.current) setMeta({});
    });
  }, []);

  const selectGif = useCallback((gif) => {
    if (!gif?.url) return;
    requestRef.current += 1;
    setFile(null);
    setGifRef(gif);
    setType('gif');
    setPreview({ url: gif.url, type: 'gif', name: gif.title || 'GIF' });
    setMeta({
      provider: gif.provider || 'giphy',
      gif_id: gif.id || null,
      width: gif.width || null,
      height: gif.height || null,
      aspect: gif.width && gif.height ? gif.width / gif.height : null,
    });
    setProgress(0);
    setError('');
  }, []);

  const clear = useCallback(() => {
    requestRef.current += 1;
    setFile(null);
    setGifRef(null);
    setType(null);
    setPreview(null);
    setMeta({});
    setUploading(false);
    setProgress(0);
    setError('');
  }, []);

  return {
    file,
    gifRef,
    type,
    preview,
    previewUrl: preview?.url || '',
    meta,
    uploading,
    progress,
    error,
    selectFile,
    selectGif,
    clear,
    setUploading,
    setProgress,
    setError,
  };
}
