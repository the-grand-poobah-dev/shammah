'use client';
import { useState } from 'react';
import {
  X,
  Flag,
  ShieldCheck,
  ShieldAlert,
  Check,
  AlertTriangle,
  HelpCircle,
  Flame,
} from 'lucide-react';
import { reportPost } from '../lib/feedAlgorithm';
import { playSound } from '../lib/soundEffects';

const REPORT_REASONS = [
  {
    id: 'hate',
    label: 'Hate speech or hostility',
    desc: 'Attacking individuals, ethnic groups, or promoting malice',
    color: '#ef4444', // Red
  },
  {
    id: 'abuse',
    label: 'Abuse, harassment, or bullying',
    desc: 'Targeted disrespect, personal defamation, or intimidation',
    color: '#f43f5e', // Rose
  },
  {
    id: 'false_doctrine',
    label: 'Spiritual manipulation or false doctrine',
    desc: 'Exploitative claims, fraudulent prophecies, or deception',
    color: '#f59e0b', // Amber
  },
  {
    id: 'inappropriate',
    label: 'Inappropriate or explicit content',
    desc: 'Media or wording violating Christian community standards',
    color: '#ec4899', // Pink
  },
  {
    id: 'spam',
    label: 'Spam, scams, or commercial fraud',
    desc: 'Unsolicited adverts, suspicious links, or phishing',
    color: '#8b5cf6', // Purple
  },
  {
    id: 'other',
    label: 'Other Community Guideline breach',
    desc: 'Any behavior contrary to peaceful Christian fellowship',
    color: '#0d9488', // Teal
  },
];

export default function ReportPostModal({ post, onClose }) {
  const [selectedReason, setSelectedReason] = useState('hate');
  const [hoveredReason, setHoveredReason] = useState(null);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!post) return null;

  function handleSubmit(e) {
    e.preventDefault();
    reportPost(post.id, selectedReason, post.author_id || post.user_id);
    setSubmitted(true);
    playSound('reaction');
    setTimeout(() => {
      onClose();
    }, 2200);
  }

  return (
    <div className="report-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Report Post">
      <div className="report-modal-card neon-glow-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="report-modal-header">
          <div className="report-title-row">
            <span className="report-icon-box">
              <Flag size={18} className="report-flag-icon" />
            </span>
            <div className="report-header-text">
              <h3>Report Fellowship Content</h3>
              <p>Keeping Shammah safe, edifying, and Christ-centered</p>
            </div>
          </div>
          <button
            type="button"
            className="report-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={17} />
          </button>
        </div>

        {submitted ? (
          <div className="report-success-state">
            <div className="report-success-icon-wrap">
              <ShieldCheck size={42} className="report-success-icon" />
            </div>
            <h4>Report Received Confidentially</h4>
            <p>
              Thank you for caring for the flock. Our pastoral moderation team has received this report and will review it promptly. This publication has been muted from your feed.
            </p>
            <button
              type="button"
              className="signin-btn"
              onClick={onClose}
              style={{ marginTop: 12 }}
            >
              Done
            </button>
          </div>
        ) : (
          <form className="report-form" onSubmit={handleSubmit}>
            <div className="report-banner-note">
              <ShieldAlert size={14} className="text-amber-500 flex-shrink-0" />
              <span>Reports are strictly anonymous and reviewed by ordained church elders.</span>
            </div>

            <div className="report-reasons-list no-scrollbar">
              {REPORT_REASONS.map((r) => {
                const isSelected = selectedReason === r.id;
                const isHovered = hoveredReason === r.id;
                const isHighlighted = isSelected || isHovered;
                return (
                  <label
                    key={r.id}
                    className={`report-reason-item${isHighlighted ? ' active' : ''}`}
                    style={{
                      '--reason-color': r.color,
                      borderColor: isHighlighted ? r.color : undefined,
                    }}
                    onMouseEnter={() => setHoveredReason(r.id)}
                    onMouseLeave={() => setHoveredReason(null)}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={r.id}
                      checked={isSelected}
                      onChange={() => setSelectedReason(r.id)}
                      className="report-radio-input"
                    />
                    <div className="report-reason-text">
                      <strong style={{ color: isHighlighted ? r.color : undefined }}>
                        {r.label}
                      </strong>
                      <small>{r.desc}</small>
                    </div>

                    <span
                      className={`item-color-picker-box${isHighlighted ? ' active-picker' : ''}`}
                      style={{ '--picker-color': r.color }}
                    >
                      <span className="picker-box-swatch" />
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="report-notes-wrap">
              <label htmlFor="report-notes" className="report-notes-label">
                Additional context or scripture concern (optional):
              </label>
              <textarea
                id="report-notes"
                rows={2}
                placeholder="Share any additional details to assist church leaders..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                className="report-textarea"
                maxLength={300}
              />
              <span className="report-char-count">{additionalNotes.length} / 300</span>
            </div>

            <div className="report-modal-actions">
              <button type="button" className="report-cancel-btn" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="signin-btn report-submit-btn">
                Submit Report
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
