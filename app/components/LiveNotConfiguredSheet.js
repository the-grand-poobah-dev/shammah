'use client';
import { Radio, AlertCircle, Sparkles, Key, CheckCircle, ExternalLink } from 'lucide-react';
import PopupSheet from './PopupSheet';

export default function LiveNotConfiguredSheet({ isOpen, onClose }) {
  return (
    <PopupSheet
      open={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-[var(--ink)]">
          <span className="w-8 h-8 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-500 shrink-0">
            <Radio size={18} />
          </span>
          <div>
            <h3 className="text-sm sm:text-base font-bold leading-tight">Live Sanctuary Broadcast</h3>
            <p className="text-[11px] text-[var(--ink-muted)]">Real-time video streaming setup</p>
          </div>
        </div>
      }
      size="md"
    >
      <div className="py-2 text-[var(--ink)] flex flex-col gap-4">
        <div className="p-4 rounded-2xl bg-[var(--surface-sunken)] border border-[var(--border)] flex flex-col gap-3">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
            <AlertCircle size={16} /> Live streaming is not configured yet
          </div>
          <p className="text-xs text-[var(--ink-muted)] leading-relaxed m-0">
            Shammah Live uses high-performance, sub-second WebRTC video powered by <strong>LiveKit Cloud</strong>.
            Broadcasting live sanctuary prayer rooms, youth devotionals, and Sunday services requires three environment variables:
          </p>

          <div className="flex flex-col gap-1.5 font-mono text-[11px] bg-black/40 p-3 rounded-xl border border-white/10 text-emerald-400">
            <div><span className="text-neutral-400">1.</span> LIVEKIT_URL=wss://your-project.livekit.cloud</div>
            <div><span className="text-neutral-400">2.</span> LIVEKIT_API_KEY=APIxxxxxxxxx</div>
            <div><span className="text-neutral-400">3.</span> LIVEKIT_API_SECRET=secxxxxxxxxx</div>
          </div>
        </div>

        <div className="space-y-2 text-xs text-[var(--ink-muted)]">
          <div className="flex items-start gap-2">
            <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />
            <span><strong>Zero-latency WebRTC:</strong> Stream to congregation members worldwide with sub-second lag.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />
            <span><strong>Live chat &amp; reactions:</strong> Believers send real-time prayers, floating hearts, and amens.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />
            <span><strong>Moderation safety:</strong> Host controls to pin scriptures, delete abusive messages, and ban users.</span>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
          <button
            type="button"
            className="px-5 py-2 rounded-full text-xs font-semibold bg-[var(--surface-sunken)] border border-[var(--border)] text-[var(--ink)] hover:bg-[var(--border)] transition-colors"
            onClick={onClose}
          >
            Understood
          </button>
        </div>
      </div>
    </PopupSheet>
  );
}
