'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Check,
  XCircle,
  Clock,
  Coins,
  Building2,
  FileText,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { playSound } from '../../lib/soundEffects';
import { getAdminPendingFundraisers, reviewFundraiser } from '../../lib/data/fundraisersApi';

export default function FundraiserAdminModal({ isOpen, onClose, onActionCompleted }) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('campaigns'); // campaigns | withdrawals
  const [pendingCampaigns, setPendingCampaigns] = useState([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState([]);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const loadPending = async () => {
    setLoading(true);
    try {
      const data = await getAdminPendingFundraisers();
      setPendingCampaigns(data.pendingCampaigns || []);
      setPendingWithdrawals(data.pendingWithdrawals || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPending();
    }
  }, [isOpen]);

  async function handleDecision(targetType, targetId, decision) {
    setActionLoadingId(targetId);
    try {
      await reviewFundraiser({ targetType, targetId, decision });
      playSound(decision === 'approve' ? 'postPublished' : 'reaction');
      loadPending();
      if (onActionCompleted) onActionCompleted();
    } catch (err) {
      alert(err.message || 'Action failed.');
    } finally {
      setActionLoadingId(null);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="author-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" style={{ zIndex: 100 }}>
      <div
        className="inst-profile-modal-card neon-glow-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '640px',
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
            <ShieldCheck size={18} style={{ color: '#10b981' }} />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--ink)' }}>
              Steward Review Queue
            </h3>
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

        {/* Tab switch */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--surface-sunken)' }}>
          <button
            type="button"
            onClick={() => setActiveTab('campaigns')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: activeTab === 'campaigns' ? 'var(--surface)' : 'transparent',
              color: activeTab === 'campaigns' ? '#10b981' : 'var(--ink-muted)',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              borderBottom: activeTab === 'campaigns' ? '2px solid #10b981' : 'none',
            }}
          >
            Pending Campaigns ({pendingCampaigns.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('withdrawals')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: activeTab === 'withdrawals' ? 'var(--surface)' : 'transparent',
              color: activeTab === 'withdrawals' ? '#10b981' : 'var(--ink-muted)',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              borderBottom: activeTab === 'withdrawals' ? '2px solid #10b981' : 'none',
            }}
          >
            Withdrawal Requests ({pendingWithdrawals.length})
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', maxHeight: '70dvh', overflowY: 'auto' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--ink-muted)' }}>
              <Loader2 size={24} className="spin" style={{ margin: '0 auto 8px' }} />
              <p>Checking queue...</p>
            </div>
          )}

          {!loading && activeTab === 'campaigns' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingCampaigns.map((camp) => (
                <div
                  key={camp.id}
                  style={{
                    padding: '14px',
                    borderRadius: '12px',
                    background: 'var(--surface-sunken)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>
                        {camp.category}
                      </span>
                      <h4 style={{ margin: '2px 0 4px 0', fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>
                        {camp.title}
                      </h4>
                      <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                        Goal: KES {Number(camp.goal_kes).toLocaleString()} · Organiser: {camp.owner?.display_name || 'Member'}
                      </span>
                    </div>
                  </div>

                  <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'var(--ink-muted)', lineHeight: 1.4 }}>
                    {camp.story_md?.slice(0, 160)}...
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      type="button"
                      disabled={actionLoadingId === camp.id}
                      onClick={() => handleDecision('campaign', camp.id, 'reject')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      disabled={actionLoadingId === camp.id}
                      onClick={() => handleDecision('campaign', camp.id, 'approve')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#10b981',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Check size={13} />
                      <span>Approve &amp; Verify</span>
                    </button>
                  </div>
                </div>
              ))}

              {pendingCampaigns.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--ink-muted)', fontSize: '13px' }}>
                  No pending campaigns awaiting review.
                </div>
              )}
            </div>
          )}

          {!loading && activeTab === 'withdrawals' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingWithdrawals.map((wth) => (
                <div
                  key={wth.id}
                  style={{
                    padding: '14px',
                    borderRadius: '12px',
                    background: 'var(--surface-sunken)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>
                        KES {Number(wth.amount_kes).toLocaleString()}
                      </h4>
                      <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                        Disbursement M-Pesa: {wth.mpesa_payout_phone} · Campaign: {wth.fundraiser?.title || 'Fundraiser'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      type="button"
                      disabled={actionLoadingId === wth.id}
                      onClick={() => handleDecision('withdrawal', wth.id, 'reject')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'transparent',
                        color: '#ef4444',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      disabled={actionLoadingId === wth.id}
                      onClick={() => handleDecision('withdrawal', wth.id, 'approve')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#10b981',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Coins size={13} />
                      <span>Mark Disbursed</span>
                    </button>
                  </div>
                </div>
              ))}

              {pendingWithdrawals.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--ink-muted)', fontSize: '13px' }}>
                  No pending withdrawal requests.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
