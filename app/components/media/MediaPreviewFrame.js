'use client';
import React from 'react';
import { X, Play, Music, FileText } from 'lucide-react';

export default function MediaPreviewFrame({
  file,
  preview,
  onRemove,
  mediaUrl,
  mediaType,
}) {
  const url = preview?.url || mediaUrl;
  const type = preview?.type || mediaType || (file?.type?.startsWith('video') ? 'video' : file?.type?.startsWith('audio') ? 'audio' : 'image');

  if (!url && !file) return null;

  return (
    <div className="relative rounded-xl overflow-hidden border border-[var(--border)] bg-black/5 dark:bg-white/5 my-2 max-w-md">
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors min-h-[44px] min-w-[44px]"
          aria-label="Remove media"
        >
          <X size={16} />
        </button>
      )}

      {type === 'video' ? (
        <video
          src={url}
          controls
          playsInline
          className="w-full max-h-64 object-contain rounded-xl"
        />
      ) : type === 'audio' ? (
        <div className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--teal)]/20 text-[var(--teal)] flex items-center justify-center">
            <Music size={20} />
          </div>
          <audio src={url} controls className="w-full" />
        </div>
      ) : (
        <img
          src={url}
          alt="Media preview"
          className="w-full max-h-72 object-cover rounded-xl"
        />
      )}
    </div>
  );
}
