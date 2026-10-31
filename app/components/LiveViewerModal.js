'use client';
import React from 'react';
import PopupSheet from './PopupSheet';
import { Tv, Users, MessageSquare, Volume2 } from 'lucide-react';

export default function LiveViewerModal({ streamId, onClose }) {
  return (
    <PopupSheet open={Boolean(streamId)} onClose={onClose} title="Sanctuary Live Stream" size="lg">
      <div className="live-viewer-content aspect-16-9 bg-black flex items-center justify-center relative rounded-xl overflow-hidden">
        <video
          src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
          className="w-full h-full object-cover"
          autoPlay
          controls
          playsInline
        />
        <div className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1.5 shadow-md">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span>LIVE</span>
        </div>
      </div>
    </PopupSheet>
  );
}
