'use client';

import { useEffect, useState } from 'react';
import { AudioLines, X } from 'lucide-react';

function resolveMedia(media) {
  if (!media) return { url: '', type: '' };
  const url = media.url || media.previewUrl || media.media_url || media.src || '';
  const type = String(media.type || media.kind || media.media_type || '').toLowerCase();
  return { url, type };
}

export default function MediaPreviewFrame({ mode = 'composer', media, aspect, onRemove }) {
  const { url, type } = resolveMedia(media);
  const [naturalAspect, setNaturalAspect] = useState(aspect || null);
  useEffect(() => { setNaturalAspect(aspect || null); }, [url, aspect]);
  if (!url) return null;

  const isVideo = type === 'video' || type === 'reel' || /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url);
  const isAudio = type === 'audio' || /\.(mp3|wav|ogg|m4a|aac|flac)(\?|$)/i.test(url);
  const mediaStyle = naturalAspect ? { aspectRatio: String(naturalAspect) } : undefined;

  return (
    <div className={'sh-media-preview-frame sh-media-preview-' + mode} style={mediaStyle}>
      {!isAudio && <div className="sh-media-preview-backdrop" aria-hidden="true">{isVideo ? <video src={url} muted autoPlay loop playsInline /> : <img src={url} alt="" />}</div>}
      {isAudio ? <div className="sh-media-preview-audio"><AudioLines size={28} /><span>{media?.title || media?.name || 'Audio attachment'}</span><small>Audio file</small></div> :
        isVideo ? <video className="sh-media-preview-content" src={url} controls playsInline preload="metadata" onLoadedMetadata={(event) => { const v=event.currentTarget; if (v.videoWidth && v.videoHeight) setNaturalAspect(v.videoWidth / v.videoHeight); }} /> :
        <img className="sh-media-preview-content" src={url} alt={media?.title || 'Media preview'} onLoad={(event) => { const img=event.currentTarget; if (img.naturalWidth && img.naturalHeight) setNaturalAspect(img.naturalWidth / img.naturalHeight); }} />}
      {onRemove && <button type="button" className="sh-media-preview-remove" onClick={onRemove} aria-label="Remove attachment"><X size={18} /></button>}
    </div>
  );
}
