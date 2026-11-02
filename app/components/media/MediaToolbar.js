'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Clapperboard, ImagePlus, Mic, Radio } from 'lucide-react';
import CameraCaptureModal from './CameraCaptureModal';
import VoiceRecorderBar from './VoiceRecorderBar';

function ToolButton({ label, title, onClick, children, className = '', disabled = false }) {
  return <button type="button" className={'sh-media-tool ' + className} onClick={onClick} title={title || label} aria-label={label} disabled={disabled}><span className="sh-media-tool-icon">{children}</span><span className="sh-media-toolbar-label">{label}</span></button>;
}

export default function MediaToolbar({
  context = 'post',
  onPickFile,
  onCamera,
  onVoice,
  voiceActive = false,
  maxVoiceSeconds = 60,
  onGif,
  onReel,
  onLive,
  maxVideoSeconds = 90,
  disabled = false,
}) {
  const inputRef = useRef(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [wide, setWide] = useState(false);

  useEffect(() => {
    const element = inputRef.current?.parentElement;
    if (!element || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver((entries) => setWide((entries[0]?.contentRect.width || 0) >= 560));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  function pickFile(file) {
    if (file) onPickFile?.(file);
  }

  return (
    <>
      <div className="sh-media-toolbar" data-context={context} data-wide={wide ? 'true' : 'false'}>
        <input ref={inputRef} type="file" accept="image/*,video/*,audio/*" className="sh-media-hidden-input" disabled={disabled} onChange={(event) => { pickFile(event.target.files?.[0]); event.target.value = ''; }} />
        <ToolButton label="Media" title="Choose a photo, video or audio file" onClick={() => inputRef.current?.click()} disabled={disabled}><ImagePlus size={19} /></ToolButton>
        <ToolButton label="Camera" title="Take a photo or record video" onClick={() => onCamera ? onCamera() : setCameraOpen(true)} disabled={disabled}><Camera size={19} /></ToolButton>
        {onVoice && <ToolButton label={voiceOpen || voiceActive ? 'Voice' : 'Voice'} title="Record a voice note" onClick={() => setVoiceOpen(true)} disabled={disabled} className={voiceOpen || voiceActive ? 'active' : ''}><Mic size={19} /></ToolButton>}
        {onGif && <ToolButton label="GIF" title="Search or upload a GIF" onClick={onGif} disabled={disabled}><span className="sh-gif-glyph">GIF</span></ToolButton>}
        {context === 'post' && onReel && <ToolButton label="Reel" title="Create a Reel" onClick={onReel} disabled={disabled}><Clapperboard size={19} /></ToolButton>}
        {context === 'post' && onLive && <ToolButton label="Live" title="Start a live broadcast" onClick={onLive} disabled={disabled}><span className="sh-live-toolbar-icon"><Radio size={19} /><i /></span></ToolButton>}
      </div>
      {cameraOpen && <CameraCaptureModal mode="both" maxVideoSeconds={maxVideoSeconds} onCapture={(file) => pickFile(file)} onClose={() => setCameraOpen(false)} />}
      {voiceOpen && <VoiceRecorderBar maxSeconds={maxVoiceSeconds} onDone={(file, meta) => { if (onVoice) onVoice(file, meta); else pickFile(file); setVoiceOpen(false); }} onCancel={() => setVoiceOpen(false)} />}
    </>
  );
}
