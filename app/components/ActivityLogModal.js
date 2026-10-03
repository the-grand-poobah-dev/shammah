'use client';
import { X, ShieldCheck } from 'lucide-react';
import ActivityLog from './ActivityLog';

export default function ActivityLogModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="activity-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="activity-modal-sheet neon-glow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="activity-modal-header">
          <div className="activity-modal-title">
            <ShieldCheck size={18} className="text-teal-400" />
            <span>Personal Activity Log &amp; Transparency</span>
          </div>
          <button
            type="button"
            className="activity-modal-close"
            onClick={onClose}
            aria-label="Close activity log"
          >
            <X size={18} />
          </button>
        </div>

        <div className="activity-modal-scroll">
          <ActivityLog onClose={onClose} />
        </div>
      </div>
    </div>
  );
}
