'use client';
import React, { useRef } from 'react';
import { Image, Camera, Mic, Film, Smile } from 'lucide-react';

export default function MediaToolbar({
  context = 'post',
  onPickFile,
  onCamera,
  onVoice,
  onGif,
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onPickFile) {
      onPickFile(file);
    }
    e.target.value = '';
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--teal)] hover:bg-[var(--surface-sunken)] transition-colors min-h-[44px] min-w-[44px]"
        title="Upload Image/Video/Audio"
        aria-label="Upload media file"
      >
        <Image size={19} />
      </button>

      {onCamera && (
        <button
          type="button"
          onClick={onCamera}
          className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--teal)] hover:bg-[var(--surface-sunken)] transition-colors min-h-[44px] min-w-[44px]"
          title="Open Camera"
          aria-label="Open Camera"
        >
          <Camera size={19} />
        </button>
      )}

      {onVoice && (
        <button
          type="button"
          onClick={onVoice}
          className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--teal)] hover:bg-[var(--surface-sunken)] transition-colors min-h-[44px] min-w-[44px]"
          title="Record Voice Note"
          aria-label="Record voice note"
        >
          <Mic size={19} />
        </button>
      )}

      {onGif && (
        <button
          type="button"
          onClick={onGif}
          className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--teal)] hover:bg-[var(--surface-sunken)] transition-colors min-h-[44px] min-w-[44px]"
          title="Add GIF"
          aria-label="Add GIF sticker"
        >
          <Smile size={19} />
        </button>
      )}
    </div>
  );
}
