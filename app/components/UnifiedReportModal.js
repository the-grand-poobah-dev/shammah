'use client';
import { useState } from 'react';
import { Flag, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';
import PopupSheet from './PopupSheet';
import { submitContentReport } from '../lib/data/reportApi';
import { playSound } from '../lib/soundEffects';

const REPORT_REASONS = [
  { id: 'inappropriate', label: 'Inappropriate or vulgar content' },
  { id: 'harassment', label: 'Harassment, hostility, or bullying' },
  { id: 'heresy', label: 'Misleading doctrine or false claims' },
  { id: 'spam', label: 'Spam, bot activity, or unsolicited sales' },
  { id: 'scam', label: 'Financial fraud or false fundraiser' },
  { id: 'hate', label: 'Hate speech or tribal animosity' },
  { id: 'copyright', label: 'Copyright or intellectual property' },
  { id: 'other', label: 'Other community guideline concern' },
];

export default function UnifiedReportModal({
  isOpen = true,
  onClose,
  targetType = 'post',
  targetId,
  contentTitle = '',
  reporterId = null,
}) {
  const [selectedReason, setSelectedReason] = useState('inappropriate');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const formatTargetLabel = (type) => {
    switch (type) {
      case 'video':
        return 'Video';
      case 'reel':
        return 'Reel';
      case 'podcast':
      case 'audio':
        return 'Audio Message';
      case 'course':
        return 'Discipleship Course';
      case 'poll':
        return 'Community Poll';
      case 'fundraiser':
        return 'Kingdom Fundraiser';
      case 'challenge':
        return 'Faith Challenge';
      case 'arcade':
        return 'Faith Game';
      case 'comment':
        return 'Comment';
      case 'status':
        return 'Story Status';
      case 'live':
        return 'Live Broadcast';
      default:
        return 'Faith Post';
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setErrorMessage('');

    try {
      const res = await submitContentReport({
        targetType,
        targetId,
        reason: selectedReason,
        details: details.trim(),
        reporterId,
      });

      if (res?.success) {
        playSound('reaction');
        setSubmitted(true);
        setTimeout(() => {
          if (onClose) onClose();
        }, 1600);
      } else {
        setErrorMessage(res?.error || 'Unable to submit report. Please try again.');
      }
    } catch (err) {
      setErrorMessage(err?.message || 'A network error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PopupSheet
      open={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <ShieldAlert size={18} className="text-amber-400" />
          <span className="font-semibold text-sm">Report {formatTargetLabel(targetType)}</span>
        </div>
      }
      size="sm"
    >
      <div className="p-4 flex flex-col gap-3.5 text-xs text-[var(--ink)]">
        {submitted ? (
          <div className="py-6 flex flex-col items-center justify-center text-center gap-2.5">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <CheckCircle2 size={24} />
            </div>
            <h4 className="text-sm font-bold text-[var(--ink)]">Report Received</h4>
            <p className="text-xs text-[var(--ink-muted)] max-w-xs">
              Thank you for keeping our church community pure, loving, and safe. A moderator will review this item promptly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {contentTitle && (
              <div className="p-2.5 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border)] text-[var(--ink-muted)]">
                <span className="font-medium text-[var(--ink)]">Item: </span>
                <span className="truncate">{contentTitle}</span>
              </div>
            )}

            <div>
              <label className="block font-semibold mb-1 text-[var(--ink)]">
                Why are you reporting this?
              </label>
              <div className="flex flex-col gap-1.5 mt-1">
                {REPORT_REASONS.map((r) => (
                  <label
                    key={r.id}
                    className={`flex items-center gap-2.5 p-2 rounded-xl border cursor-pointer transition-all ${
                      selectedReason === r.id
                        ? 'border-[var(--teal)] bg-[var(--teal)]/10 text-[var(--ink)]'
                        : 'border-[var(--border)] hover:bg-[var(--surface-sunken)] text-[var(--ink-muted)]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={r.id}
                      checked={selectedReason === r.id}
                      onChange={() => setSelectedReason(r.id)}
                      className="accent-[var(--teal)]"
                    />
                    <span className="text-xs font-medium">{r.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="reportDetails" className="block font-semibold mb-1 text-[var(--ink)]">
                Additional context (optional)
              </label>
              <textarea
                id="reportDetails"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Share any timestamps, links, or specific words that violate guidelines..."
                className="w-full p-2.5 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border)] text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] resize-none"
              />
              <div className="text-[10px] text-[var(--ink-faint)] text-right mt-0.5">
                {details.length}/500
              </div>
            </div>

            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-[var(--ink-muted)] hover:bg-[var(--surface-sunken)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
              >
                <Flag size={13} />
                <span>{submitting ? 'Submitting...' : 'Submit Report'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </PopupSheet>
  );
}
