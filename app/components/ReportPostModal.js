'use client';
import { useState } from 'react';
import { X, Flag, AlertTriangle, Check, ShieldCheck } from 'lucide-react';
import { reportPost } from '../lib/feedAlgorithm';
import { playSound } from '../lib/soundEffects';

const REPORT_REASONS = [
  { id: 'hate', label: 'Hate speech or hostility', desc: 'Attacking individuals, ethnicities, or promoting hate' },
  { id: 'abuse', label: 'Abuse, harassment, or bullying', desc: 'Targeted disrespect or intimidation' },
  { id: 'false_doctrine', label: 'Spiritual manipulation or false doctrine', desc: 'Misleading spiritual claims or exploitation' },
  { id: 'inappropriate', label: 'Inappropriate or sexually explicit media', desc: 'Content violating faith community standards' },
  { id: 'spam', label: 'Spam, scams, or commercial fraud', desc: 'Unsolicited advertisements or phishing' },
  { id: 'other', label: 'Other violation of Community Guidelines', desc: 'Content contrary to Christian fellowship' },
];

export default function ReportPostModal({ post, onClose }) {
  const [selectedReason, setSelectedReason] = useState('hate');
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
    }, 2000);
  }

  return (
    <div className="report-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="report-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="report-modal-header">
          <div className="report-title-row">
            <span className="report-icon-box">
              <Flag size={18} className="report-flag-icon" />
            </span>
            <h3>Report Fellowship Content</h3>
          </div>
          <button type="button" className="report-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {submitted ? (
          <div className="report-success-state">
            <ShieldCheck size={42} className="report-success-icon" />
            <h4>Thank you for keeping Shammah safe</h4>
            <p>Our pastoral moderation team has received your report. The post has been hidden from your feed.</p>
          </div>
        ) : (
          <form className="report-form" onSubmit={handleSubmit}>
            <p className="report-desc">
              Please tell us why you are reporting this post. Reports are kept strictly confidential.
            </p>

            <div className="report-reasons-list">
              {REPORT_REASONS.map((r) => {
                const isSelected = selectedReason === r.id;
                return (
                  <label key={r.id} className={`report-reason-item${isSelected ? ' active' : ''}`}>
                    <input
                      type="radio"
                      name="reportReason"
                      value={r.id}
                      checked={isSelected}
                      onChange={() => setSelectedReason(r.id)}
                    />
                    <div className="report-reason-text">
                      <strong>{r.label}</strong>
                      <small>{r.desc}</small>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="report-notes-wrap">
              <label htmlFor="report-notes">Additional context (optional):</label>
              <textarea
                id="report-notes"
                rows={2}
                placeholder="Help us understand the issue..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                className="report-textarea"
                maxLength={300}
              />
            </div>

            <div className="report-modal-actions">
              <button type="button" className="report-cancel-btn" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="report-submit-btn">
                Submit Confidential Report
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
