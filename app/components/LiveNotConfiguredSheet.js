'use client';
import React from 'react';
import PopupSheet from './PopupSheet';
import { Radio, AlertCircle, ExternalLink, ShieldCheck } from 'lucide-react';

export default function LiveNotConfiguredSheet({ open, onClose }) {
  return (
    <PopupSheet open={open} onClose={onClose} title="Live Broadcasting Setup" size="md">
      <div className="p-5 space-y-4">
        <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-[var(--surface-sunken)] border border-[var(--border)]">
          <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center flex-shrink-0">
            <Radio size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-[var(--ink)]">RTMP Stream Key Required</h3>
            <p className="text-xs text-[var(--ink-muted)] mt-1 leading-relaxed">
              To broadcast high-definition sanctuary services directly to Shammah with low latency, your church account must be verified and have an active streaming endpoint configured.
            </p>
          </div>
        </div>

        <div className="space-y-2 text-xs text-[var(--ink-muted)]">
          <p>Features included with Sanctuary Live streaming:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Automatic archive to Church Media library for on-demand playback</li>
            <li>Real-time prayer request chat and offering giving links (M-Pesa)</li>
            <li>Multi-bitrate adaptive streaming for mobile connections across Kenya &amp; Africa</li>
          </ul>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            className="px-5 py-2.5 rounded-full bg-[var(--teal)] text-white font-medium text-sm hover:opacity-90 transition-opacity min-h-[44px]"
            onClick={onClose}
          >
            Understood
          </button>
        </div>
      </div>
    </PopupSheet>
  );
}
