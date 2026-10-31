'use client';
import React from 'react';
import PopupSheet from './PopupSheet';
import { Award, Download, Share2, CheckCircle2, Sparkles } from 'lucide-react';
import { playSound } from '../lib/soundEffects';

export default function CourseCertificateModal({
  isOpen,
  onClose,
  certificate,
  course,
  recipientName = 'Kingdom Believer',
}) {
  const handleShare = () => {
    playSound('button');
    if (navigator.share) {
      navigator.share({
        title: `Certificate of Completion: ${course?.title}`,
        text: `I just completed "${course?.title}" on Shammah Faith Academy!`,
        url: window.location.href,
      });
    }
  };

  return (
    <PopupSheet
      open={isOpen}
      onClose={onClose}
      title="Certificate of Achievement"
      size="md"
    >
      <div className="p-4 sm:p-6 space-y-5 text-center">
        {/* Certificate Frame */}
        <div className="border-4 border-double border-[var(--gold)] rounded-2xl p-6 bg-gradient-to-b from-[var(--surface)] to-[var(--surface-sunken)] shadow-lg space-y-3">
          <div className="w-14 h-14 mx-auto rounded-full bg-[var(--gold)]/20 text-[var(--gold)] flex items-center justify-center">
            <Award size={32} />
          </div>

          <p className="text-xs uppercase tracking-widest font-bold text-[var(--ink-muted)]">
            Shammah Faith Academy
          </p>

          <p className="text-sm text-[var(--ink-muted)]">This certifies that</p>

          <h3 className="text-xl font-bold text-[var(--ink)] font-serif">
            {recipientName}
          </h3>

          <p className="text-xs text-[var(--ink-muted)]">has successfully completed</p>

          <h4 className="text-base font-bold text-[var(--teal)]">
            {course?.title || 'Foundations of Spiritual Growth'}
          </h4>

          <div className="pt-3 border-t border-[var(--border)] flex justify-between items-center text-[10px] text-[var(--ink-muted)]">
            <span>Verified: SHAMMAH-CERT-{certificate?.id || '2026-OK'}</span>
            <span>Issued: {new Date().toLocaleDateString()}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--teal)] text-white font-medium text-sm hover:opacity-90 transition-opacity min-h-[44px]"
          >
            <Share2 size={16} />
            <span>Share Certificate</span>
          </button>
        </div>
      </div>
    </PopupSheet>
  );
}
