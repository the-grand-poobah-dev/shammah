'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Coins,
  Heart,
  Share2,
  ShieldCheck,
  Building2,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Flag,
  PlusCircle,
  Wallet,
  MessageSquare,
  TrendingUp,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { useSession } from '../../../lib/useSession';
import { playSound } from '../../lib/soundEffects';
import { getFundraiser, postFundraiserUpdate, requestWithdrawal, reportFundraiser } from '../../lib/data/fundraisersApi';
import FundraiserDonateModal from '../../components/fundraisers/FundraiserDonateModal';
import FundraiserShareModal from '../../components/fundraisers/FundraiserShareModal';
import { ProgressBar } from '../../components/layoutkit';

export default function FundraiserDetailPage() {
  const params = useParams();
  const id = params?.id;
  const { session, profile } = useSession();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [campaignData, setCampaignData] = useState(null);

  // Modals
  const [isDonateOpen, setIsDonateOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Donor wall tab
  const [donorTab, setDonorTab] = useState('recent'); // recent | top

  // Form states
  const [updateBody, setUpdateBody] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPhone, setWithdrawPhone] = useState(profile?.phone || '');
  const [reportReason, setReportReason] = useState('misleading');
  const [reportDetails, setReportDetails] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const data = await getFundraiser(id);
      setCampaignData(data);
    } catch (err) {
      setError(err.message || 'Unable to load campaign.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const fundraiser = campaignData?.fundraiser;
  const milestones = campaignData?.milestones || [];
  const updates = campaignData?.updates || [];
  const donations = campaignData?.donations || [];
  const topDonors = campaignData?.topDonors || [];
  const recentDonors = campaignData?.recentDonors || [];

  const isOwner = Boolean(
    profile?.id &&
    (profile.id === fundraiser?.owner_id || profile.id === fundraiser?.owner?.id || profile.role === 'platform_admin')
  );

  const goal = Number(fundraiser?.goal_kes || 1);
  const raised = Number(fundraiser?.raised_kes || 0);
  const percent = Math.min(100, Math.round((raised / goal) * 100));

  let daysRemaining = null;
  if (fundraiser?.deadline) {
    const diff = new Date(fundraiser.deadline).getTime() - Date.now();
    daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  // Handle owner posting update
  async function handlePostUpdate(e) {
    e.preventDefault();
    if (!updateBody.trim()) return;
    try {
      await postFundraiserUpdate({ fundraiserId: fundraiser.id, body: updateBody.trim() });
      setUpdateBody('');
      setIsUpdateOpen(false);
      setActionSuccessMsg('Update posted to campaign successfully!');
      setTimeout(() => setActionSuccessMsg(''), 4000);
      playSound('postPublished');
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to post update.');
    }
  }

  // Handle owner requesting withdrawal
  async function handleRequestWithdrawal(e) {
    e.preventDefault();
    if (!withdrawAmount || Number(withdrawAmount) < 100 || !withdrawPhone) return;
    try {
      await requestWithdrawal({
        fundraiserId: fundraiser.id,
        amountKes: Number(withdrawAmount),
        mpesaPhone: withdrawPhone,
      });
      setIsWithdrawOpen(false);
      setActionSuccessMsg('Withdrawal request submitted for church steward review.');
      setTimeout(() => setActionSuccessMsg(''), 4000);
      playSound('reaction');
    } catch (err) {
      alert(err.message || 'Failed to request withdrawal.');
    }
  }

  // Handle report
  async function handleReport(e) {
    e.preventDefault();
    try {
      await reportFundraiser({
        fundraiserId: fundraiser.id,
        reason: reportReason,
        details: reportDetails,
      });
      setIsReportOpen(false);
      setActionSuccessMsg('Report submitted. Thank you for keeping Shammah safe.');
      setTimeout(() => setActionSuccessMsg(''), 4000);
      playSound('reaction');
    } catch (err) {
      alert(err.message || 'Failed to report.');
    }
  }

  return (
    <main className="shell">
      {/* Top Navbar */}
      <div className="subpage-nav-header">
        <header className="topbar">
          <div className="brand" style={{ gap: 10 }}>
            <Link
              href="/fundraisers"
              className="action-btn"
              style={{ minHeight: 36, padding: '6px 10px', textDecoration: 'none' }}
              aria-label="Back to all fundraisers"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="brand-text-wrap">
              <h1 className="brand-mark" style={{ fontSize: '17px' }}>
                {fundraiser?.title || 'Kingdom Fundraiser'}
              </h1>
              <span className="brand-subtext">{fundraiser?.category || 'Missions & Giving'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="topbar-toggle-btn"
              onClick={() => setIsShareOpen(true)}
              aria-label="Share campaign"
              style={{ width: 36, height: 36, borderRadius: '50%' }}
            >
              <Share2 size={16} />
            </button>
            <button
              type="button"
              className="topbar-toggle-btn"
              onClick={() => setIsReportOpen(true)}
              aria-label="Report campaign"
              style={{ width: 36, height: 36, borderRadius: '50%' }}
            >
              <Flag size={16} />
            </button>
          </div>
        </header>
      </div>

      {actionSuccessMsg && (
        <div style={{ margin: '14px 0', padding: '10px 14px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#10b981', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {loading && (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--ink-muted)' }}>
          <Sparkles size={24} className="spin" style={{ margin: '0 auto 12px' }} />
          <p>Loading Kingdom campaign...</p>
        </div>
      )}

      {error && !loading && (
        <div className="empty-state" style={{ padding: '40px 16px', textAlign: 'center' }}>
          <AlertCircle size={32} style={{ color: '#ef4444', margin: '0 auto 12px' }} />
          <h3 style={{ margin: '0 0 6px 0', color: 'var(--ink)' }}>Campaign Not Found</h3>
          <p style={{ margin: '0 0 16px 0', color: 'var(--ink-muted)', fontSize: '13px' }}>{error}</p>
          <Link href="/fundraisers" className="action-btn" style={{ display: 'inline-flex', padding: '8px 16px', borderRadius: '10px', textDecoration: 'none' }}>
            Back to All Fundraisers
          </Link>
        </div>
      )}

      {!loading && fundraiser && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '14px' }}>
          {/* Hero Cover & Gallery */}
          <div
            className="post-card"
            style={{
              padding: 0,
              overflow: 'hidden',
              borderRadius: '20px',
              border: '1px solid var(--border)',
              position: 'relative',
            }}
          >
            {fundraiser.cover_url && (
              <img
                src={fundraiser.cover_url}
                alt={fundraiser.title}
                style={{ width: '100%', maxHeight: '340px', objectFit: 'cover', display: 'block' }}
              />
            )}

            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 10px',
                    borderRadius: '999px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: fundraiser.accent || '#10b981',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  {fundraiser.category}
                </span>

                {fundraiser.location && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--ink-muted)' }}>
                    <MapPin size={12} />
                    <span>{fundraiser.location}</span>
                  </span>
                )}

                {fundraiser.verified && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                    <ShieldCheck size={14} />
                    <span>Verified Ministry Cause</span>
                  </span>
                )}
              </div>

              <h1 style={{ margin: '0 0 10px 0', fontSize: '22px', fontWeight: 800, color: 'var(--ink)', lineHeight: 1.3 }}>
                {fundraiser.title}
              </h1>

              {/* Organiser Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: 'var(--surface-sunken)',
                  border: '1px solid var(--border)',
                  marginBottom: '18px',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {fundraiser.owner?.avatar_url ? (
                    <img
                      src={fundraiser.owner.avatar_url}
                      alt="Owner"
                      style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px' }}>
                      {(fundraiser.owner?.display_name || 'K')[0]}
                    </div>
                  )}
                  <div>
                    <span style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>
                      {fundraiser.owner?.display_name || 'Community Leader'}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                      Beneficiary: {fundraiser.beneficiary_name || 'Ministry Committee'}
                    </span>
                  </div>
                </div>

                {fundraiser.church?.name && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--teal)', fontWeight: 600 }}>
                    <Building2 size={14} />
                    <span>{fundraiser.church.name}</span>
                  </div>
                )}
              </div>

              {/* Progress & Stats Card */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '14px',
                  background: 'color-mix(in srgb, var(--teal) 6%, var(--surface))',
                  border: '1px solid var(--border)',
                  marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Raised via M-Pesa
                    </span>
                    <div style={{ fontSize: '24px', fontWeight: 900, color: '#10b981' }}>
                      KES {raised.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', color: 'var(--ink-muted)', display: 'block' }}>
                      Goal: KES {goal.toLocaleString()}
                    </span>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)' }}>
                      {percent}%
                    </span>
                  </div>
                </div>

                <ProgressBar progress={percent} color={fundraiser.accent || '#10b981'} size="lg" />

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '12px', color: 'var(--ink-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Users size={13} />
                    <span><strong>{fundraiser.donors_count || 0}</strong> Believers Gave</span>
                  </span>

                  {daysRemaining !== null && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={13} />
                      <span><strong>{daysRemaining}</strong> days left</span>
                    </span>
                  )}
                </div>

                {/* Primary Donate CTA */}
                <button
                  type="button"
                  onClick={() => {
                    playSound('reaction');
                    setIsDonateOpen(true);
                  }}
                  style={{
                    width: '100%',
                    marginTop: '16px',
                    padding: '14px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '15px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)',
                  }}
                >
                  <Coins size={18} />
                  <span>Give via M-Pesa (Prompt to Phone)</span>
                </button>
              </div>

              {/* Owner Controls */}
              {isOwner && (
                <div
                  style={{
                    display: 'flex',
                    gap: '10px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    marginBottom: '20px',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#f59e0b', fontWeight: 600 }}>
                    <Sparkles size={14} />
                    <span>Campaign Organiser Dashboard</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setIsUpdateOpen(true)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid #f59e0b',
                        background: '#f59e0b',
                        color: '#000',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <PlusCircle size={13} />
                      <span>Post Update</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsWithdrawOpen(true)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--ink)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Wallet size={13} />
                      <span>Request Payout</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Story */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink)', marginBottom: '10px' }}>
                  The Story &amp; Calling
                </h3>
                <div
                  style={{
                    fontSize: '14px',
                    lineHeight: 1.65,
                    color: 'var(--ink-muted)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {fundraiser.story_md}
                </div>
              </div>

              {/* Milestones timeline */}
              {milestones.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink)', marginBottom: '12px' }}>
                    Milestones &amp; Accountability
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {milestones.map((ms) => {
                      const reached = Boolean(ms.reached_at);
                      return (
                        <div
                          key={ms.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 14px',
                            borderRadius: '12px',
                            background: reached ? 'rgba(16, 185, 129, 0.08)' : 'var(--surface-sunken)',
                            border: reached ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                background: reached ? '#10b981' : 'var(--border)',
                                color: reached ? '#ffffff' : 'var(--ink-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {reached ? <CheckCircle2 size={14} /> : <Clock size={12} />}
                            </div>
                            <div>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: reached ? '#10b981' : 'var(--ink)' }}>
                                {ms.label}
                              </span>
                              {reached && (
                                <span style={{ display: 'block', fontSize: '10px', color: '#10b981' }}>
                                  Funded on {new Date(ms.reached_at).toLocaleDateString('en-KE')}
                                </span>
                              )}
                            </div>
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>
                            KES {Number(ms.amount_kes).toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Updates Feed */}
              {updates.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink)', marginBottom: '12px' }}>
                    Field Updates ({updates.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {updates.map((up) => (
                      <div
                        key={up.id}
                        style={{
                          padding: '14px',
                          borderRadius: '12px',
                          background: 'var(--surface-sunken)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ink-muted)', marginBottom: '8px' }}>
                          <span>Posted by Organiser</span>
                          <span>{new Date(up.created_at).toLocaleDateString('en-KE')}</span>
                        </div>
                        <p style={{ margin: '0 0 10px 0', fontSize: '13px', lineHeight: 1.5, color: 'var(--ink)' }}>
                          {up.body}
                        </p>
                        {up.media_url && (
                          <img
                            src={up.media_url}
                            alt="Update"
                            style={{ width: '100%', maxHeight: '220px', borderRadius: '10px', objectFit: 'cover' }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Donor Wall */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>
                    Donor Wall ({donations.length})
                  </h3>
                  <div style={{ display: 'flex', gap: '4px', background: 'var(--surface-sunken)', padding: '3px', borderRadius: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setDonorTab('recent')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        background: donorTab === 'recent' ? 'var(--surface)' : 'transparent',
                        color: donorTab === 'recent' ? 'var(--ink)' : 'var(--ink-muted)',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Recent
                    </button>
                    <button
                      type="button"
                      onClick={() => setDonorTab('top')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        background: donorTab === 'top' ? 'var(--surface)' : 'transparent',
                        color: donorTab === 'top' ? 'var(--ink)' : 'var(--ink-muted)',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Top Givers
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(donorTab === 'recent' ? recentDonors : topDonors).map((d) => (
                    <div
                      key={d.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        background: 'var(--surface-sunken)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: '50%',
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#10b981',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '12px',
                          }}
                        >
                          <Heart size={14} />
                        </div>
                        <div>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', display: 'block' }}>
                            {d.display_name}
                          </span>
                          {d.message && (
                            <span style={{ fontSize: '11px', color: 'var(--ink-muted)', fontStyle: 'italic' }}>
                              &ldquo;{d.message}&rdquo;
                            </span>
                          )}
                        </div>
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#10b981' }}>
                        KES {Number(d.amount_kes).toLocaleString()}
                      </span>
                    </div>
                  ))}

                  {donations.length === 0 && (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ink-muted)', fontSize: '12px' }}>
                      Be the first to stand with this cause!
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Donate Modal */}
      {isDonateOpen && (
        <FundraiserDonateModal
          isOpen={isDonateOpen}
          onClose={() => setIsDonateOpen(false)}
          fundraiser={fundraiser}
          currentUser={profile}
          onSuccess={(updated) => {
            loadData();
          }}
        />
      )}

      {/* Share Modal */}
      {isShareOpen && (
        <FundraiserShareModal
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          fundraiser={fundraiser}
        />
      )}

      {/* Post Update Modal */}
      {isUpdateOpen && (
        <div className="author-modal-backdrop" onClick={() => setIsUpdateOpen(false)} role="dialog">
          <div className="inst-profile-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480, width: '92%', padding: 20 }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>Post Campaign Update</h3>
            <form onSubmit={handlePostUpdate}>
              <textarea
                rows={4}
                placeholder="Share field progress with believers who supported your cause..."
                value={updateBody}
                onChange={(e) => setUpdateBody(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontSize: '13px', marginBottom: '14px' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setIsUpdateOpen(false)} className="action-btn" style={{ padding: '8px 14px' }}>Cancel</button>
                <button type="submit" className="action-btn" style={{ padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none' }}>Publish Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Withdrawal Modal */}
      {isWithdrawOpen && (
        <div className="author-modal-backdrop" onClick={() => setIsWithdrawOpen(false)} role="dialog">
          <div className="inst-profile-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480, width: '92%', padding: 20 }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>Request Ministry Disbursement</h3>
            <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: 'var(--ink-muted)' }}>
              Funds are disbursed directly to your registered Safaricom M-Pesa line after verification. Available balance: KES {raised.toLocaleString()}.
            </p>
            <form onSubmit={handleRequestWithdrawal} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--ink-muted)', marginBottom: '4px' }}>Disbursement Amount (KES)</label>
                <input
                  type="number"
                  min="100"
                  max={raised}
                  placeholder="Amount KES..."
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontSize: '14px', fontWeight: 600 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--ink-muted)', marginBottom: '4px' }}>M-Pesa Payout Number</label>
                <input
                  type="tel"
                  placeholder="07... or 254..."
                  value={withdrawPhone}
                  onChange={(e) => setWithdrawPhone(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontSize: '13px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button type="button" onClick={() => setIsWithdrawOpen(false)} className="action-btn" style={{ padding: '8px 14px' }}>Cancel</button>
                <button type="submit" className="action-btn" style={{ padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none' }}>Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {isReportOpen && (
        <div className="author-modal-backdrop" onClick={() => setIsReportOpen(false)} role="dialog">
          <div className="inst-profile-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460, width: '92%', padding: 20 }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>Report This Campaign</h3>
            <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: 'var(--ink-muted)' }}>
              Help keep Shammah truthful and honoring to Christ. Our pastoral moderators review all concerns.
            </p>
            <form onSubmit={handleReport} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--ink-muted)', marginBottom: '4px' }}>Reason</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontSize: '13px' }}
                >
                  <option value="misleading">Misleading or false information</option>
                  <option value="fraud">Suspected fraudulent beneficiary</option>
                  <option value="offensive">Inappropriate or offensive content</option>
                  <option value="other">Other concern</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--ink-muted)', marginBottom: '4px' }}>Details (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Provide context..."
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontSize: '13px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button type="button" onClick={() => setIsReportOpen(false)} className="action-btn" style={{ padding: '8px 14px' }}>Cancel</button>
                <button type="submit" className="action-btn" style={{ padding: '8px 16px', background: '#ef4444', color: '#fff', border: 'none' }}>Submit Report</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
