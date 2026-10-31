'use client';

import React, { useState } from 'react';
import {
  X,
  Flame,
  Sparkles,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  MessageSquare,
  Award,
} from 'lucide-react';
import { playSound } from '../../lib/soundEffects';
import { checkinChallenge } from '../../lib/data/challengesApi';

export default function ChallengeCheckinModal({
  isOpen,
  onClose,
  challenge,
  currentUser,
  currentStreak = 0,
  hasCheckedInToday = false,
  onCheckinSuccess,
}) {
  const [note, setNote] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successResult, setSuccessResult] = useState(null);

  if (!isOpen || !challenge) return null;

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);
    playSound('reaction');

    try {
      const res = await checkinChallenge({
        challengeId: challenge.id,
        note: note.trim() || null,
        mediaUrl: mediaUrl.trim() || null,
      });

      playSound('postPublished');
      setSuccessResult(res);
      if (onCheckinSuccess) onCheckinSuccess(res);
    } catch (err) {
      setErrorMsg(err.message || 'Check-in failed. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="author-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{ zIndex: 100 }}
    >
      <div
        className="inst-profile-modal-card neon-glow-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '480px',
          width: '92%',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'color-mix(in srgb, var(--teal) 8%, var(--surface))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Flame size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--ink)' }}>
                Daily Faith Check-in
              </h3>
              <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                Keep your spiritual flame burning today
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="topbar-toggle-btn"
            style={{ width: 32, height: 32, borderRadius: '50%' }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px', maxHeight: '75dvh', overflowY: 'auto' }}>
          {/* Target challenge badge */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              background: 'var(--surface-sunken)',
              border: '1px solid var(--border)',
              marginBottom: '16px',
            }}
          >
            <span style={{ fontSize: '10px', fontWeight: 700, color: challenge.accent || '#8b5cf6', textTransform: 'uppercase' }}>
              {challenge.category || 'Faith Challenge'}
            </span>
            <h4 style={{ margin: '2px 0 0 0', fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>
              {challenge.title}
            </h4>
          </div>

          {/* Already checked in state */}
          {hasCheckedInToday && !successResult && (
            <div style={{ textAlign: 'center', padding: '20px 8px' }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}
              >
                <CheckCircle2 size={28} />
              </div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>
                Today&apos;s Check-in Completed!
              </h4>
              <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--ink-muted)', lineHeight: 1.5 }}>
                Your flame streak is active at <strong>{currentStreak} days</strong>! Come back tomorrow morning to extend your streak.
              </p>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--ink)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          )}

          {/* Success screen */}
          {successResult && (
            <div style={{ textAlign: 'center', padding: '16px 8px' }}>
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px',
                  boxShadow: '0 8px 24px rgba(245, 158, 11, 0.4)',
                }}
              >
                <Flame size={32} />
              </div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 800, color: 'var(--ink)' }}>
                Streak Alive: {successResult.streak_current} Days! 🔥
              </h3>
              <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: 'var(--ink-muted)' }}>
                You earned <strong>+{successResult.points_awarded || 10} Faith Points</strong>!
              </p>

              {successResult.badge_awarded && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: 'rgba(139, 92, 246, 0.15)',
                    border: '1px solid #8b5cf6',
                    color: '#8b5cf6',
                    fontSize: '13px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    justifyContent: 'center',
                    marginBottom: '16px',
                  }}
                >
                  <Award size={18} />
                  <span>Milestone Unlocked: {successResult.badge_awarded}!</span>
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Continue In Faith
              </button>
            </div>
          )}

          {/* Form to check in */}
          {!hasCheckedInToday && !successResult && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '6px' }}>
                  Daily Scripture or Prayer Reflection
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Spent 20 minutes meditating on Romans 8. Overwhelmed by God's unconditional love!"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    fontSize: '13px',
                    lineHeight: 1.45,
                    outline: 'none',
                    resize: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '6px' }}>
                  Photo / Journal Proof URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://... (Bible highlighter, prayer journal photo, etc.)"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>

              {errorMsg && (
                <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  marginTop: '8px',
                  padding: '13px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '14px',
                  border: 'none',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 16px rgba(245, 158, 11, 0.35)',
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    <span>Confirming Check-in...</span>
                  </>
                ) : (
                  <>
                    <Flame size={18} />
                    <span>Check In Today &amp; Fuel Flame (+10 pts)</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
