'use client';
import { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Check,
  Clock,
  Sparkles,
  Church,
  AlertCircle,
} from 'lucide-react';
import VerifiedBadge from './VerifiedBadge';
import {
  fetchPendingBadgeRequest,
  submitVerificationBadgeRequest,
} from '../lib/profileManager';

const MINISTRY_ROLES = [
  { id: 'pastor', label: 'Lead Pastor / Shepherd' },
  { id: 'worship', label: 'Worship Leader / Psalmist' },
  { id: 'elder', label: 'Elder / Deacon / Deaconess' },
  { id: 'youth', label: 'Youth Leader / Minister' },
  { id: 'teacher', label: 'Bible Teacher / Evangelist' },
  { id: 'church_admin', label: 'Church Administrator' },
  { id: 'intercessor', label: 'Prayer Leader / Intercessor' },
  { id: 'partner', label: 'Ministry Partner / Mentor' },
];

export default function VerificationBadgeModal({ session, profile, onClose }) {
  const [role, setRole] = useState('pastor');
  const [churchName, setChurchName] = useState(profile?.church_name || '');
  const [reason, setReason] = useState('');
  const [pendingRequest, setPendingRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const isVerified = Boolean(profile?.badge_verified);

  useEffect(() => {
    let cancelled = false;
    async function loadStatus() {
      if (session?.user?.id) {
        setLoading(true);
        const pending = await fetchPendingBadgeRequest(session.user.id);
        if (!cancelled) {
          setPendingRequest(pending);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    }
    loadStatus();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!session?.user?.id) {
      setErrorMsg('Please sign in to submit a verification request.');
      return;
    }

    const trimmedChurch = churchName.trim();
    const trimmedReason = reason.trim();
    const fullReason = trimmedChurch
      ? `Church: ${trimmedChurch}. ${trimmedReason}`
      : trimmedReason;

    if (fullReason.length < 10) {
      setErrorMsg('Please provide at least 10 characters explaining your ministry affiliation and background.');
      return;
    }

    setSubmitting(true);
    const result = await submitVerificationBadgeRequest({
      userId: session.user.id,
      currentBadge: profile?.badge,
      requestedBadge: role,
      reason: fullReason,
    });
    setSubmitting(false);

    if (result.error) {
      setErrorMsg(result.error);
    } else {
      setPendingRequest(result.data);
      setSuccessMsg('Your verification request has been submitted for manual review by church leadership.');
    }
  }

  const selectedRoleObj = MINISTRY_ROLES.find((r) => r.id === role) || MINISTRY_ROLES[0];
  const charCount = (churchName.trim() ? `Church: ${churchName.trim()}. ` : '').length + reason.trim().length;

  return (
    <div className="verification-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="verification-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="verification-modal-header">
          <div className="verif-title-row">
            <span className="verif-icon-box">
              <ShieldCheck size={20} className="verif-icon" />
            </span>
            <div>
              <h3>Ministry &amp; Member Verification</h3>
              <p className="verif-sub">Official blue checkmark &amp; pastoral recognition</p>
            </div>
          </div>
          <button type="button" className="verif-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Live Badge Preview Banner */}
        <div className="verif-preview-banner">
          <div className="verif-avatar-preview">
            <VerifiedBadge badge={role} size={28} />
          </div>
          <div className="verif-preview-text">
            <div className="preview-name-row">
              <strong>{profile?.display_name || session?.user?.email || 'Fellowship Member'}</strong>
              <VerifiedBadge badge={role} size={16} />
            </div>
            <span>Verified {selectedRoleObj.label}</span>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '28px 16px', textAlign: 'center', opacity: 0.7 }}>
            Checking verification status…
          </div>
        ) : isVerified ? (
          <div className="verif-active-status-card" style={{ borderLeft: '4px solid #10b981' }}>
            <div className="active-status-left">
              <Sparkles size={22} className="sparkle-active" style={{ color: '#10b981' }} />
              <div>
                <strong>Ministry Badge Verified ✓</strong>
                <p>
                  Your profile holds an official verified <strong>{profile?.badge || 'Member'}</strong> badge.
                  Your ministry status is recognized across Shammah.
                </p>
              </div>
            </div>
          </div>
        ) : pendingRequest ? (
          <div className="verif-active-status-card" style={{ borderLeft: '4px solid #f59e0b' }}>
            <div className="active-status-left">
              <Clock size={22} className="sparkle-active" style={{ color: '#f59e0b' }} />
              <div>
                <strong>Verification Request Pending Review</strong>
                <p style={{ marginTop: 4 }}>
                  Your request for the <strong>{pendingRequest.requested_badge}</strong> badge is currently under review by
                  the Shammah team and church administrators.
                </p>
                <small style={{ opacity: 0.7, display: 'block', marginTop: 4 }}>
                  Submitted on {new Date(pendingRequest.created_at).toLocaleDateString()}
                </small>
              </div>
            </div>
          </div>
        ) : (
          <form className="verif-form" onSubmit={handleSubmit}>
            {/* Honest Review Notice */}
            <div
              style={{
                background: 'rgba(6, 182, 212, 0.08)',
                border: '1px solid rgba(6, 182, 212, 0.25)',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: '0.85rem',
                lineHeight: 1.45,
                color: 'inherit',
                marginBottom: 12,
              }}
            >
              <strong>Honest Pastoral Review:</strong> Verification on Shammah confirms ordained ministers, worship
              leaders, and fellowship elders. Requests are reviewed personally by church leadership. Verification is{' '}
              <strong>100% free of charge</strong> for individual servants.
            </div>

            {/* Choose Role */}
            <div className="verif-section-group">
              <label className="verif-label">Select Ministry Role to Verify:</label>
              <div className="verif-roles-grid">
                {MINISTRY_ROLES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={`verif-role-chip${role === r.id ? ' active' : ''}`}
                    onClick={() => setRole(r.id)}
                  >
                    <VerifiedBadge badge={r.id} size={14} />
                    <span>{r.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Church Affiliation */}
            <div className="verif-section-group">
              <label className="verif-label" htmlFor="church-name-input">
                Church or Ministry Affiliation:
              </label>
              <input
                id="church-name-input"
                type="text"
                placeholder="e.g. Nairobi Worship Center, Grace Chapel"
                value={churchName}
                onChange={(e) => setChurchName(e.target.value)}
                className="verif-input"
              />
            </div>

            {/* Reason / Background */}
            <div className="verif-section-group">
              <label className="verif-label" htmlFor="verif-reason-input">
                Ministry Background &amp; Reason:
              </label>
              <textarea
                id="verif-reason-input"
                placeholder="Provide a brief explanation of your ministry calling, ordination, or leadership role at your church (at least 10 characters)."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="verif-input"
                rows={3}
                maxLength={500}
                style={{ resize: 'vertical' }}
              />
              <small style={{ display: 'block', textAlign: 'right', opacity: 0.6, fontSize: '0.75rem', marginTop: 4 }}>
                {charCount < 10 ? 'At least 10 characters required' : `${charCount}/500`}
              </small>
            </div>

            {errorMsg && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 6,
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                  fontSize: '0.84rem',
                  marginBottom: 12,
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="verif-success-banner" style={{ marginBottom: 12 }}>
                <Check size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="verif-submit-btn"
              disabled={submitting || charCount < 10}
            >
              <ShieldCheck size={18} />
              <span>{submitting ? 'Submitting Application…' : 'Submit Verification Request'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
