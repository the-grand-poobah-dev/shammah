'use client';
import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Users,
  Check,
  Plus,
  Share2,
  Coins,
  BookOpen,
  Calendar,
  Shield,
  Heart,
} from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import VerifiedBadge from '../../components/VerifiedBadge';
import PostCard from '../../components/PostCard';
import InstitutionSubscriptionModal from '../../components/InstitutionSubscriptionModal';
import MpesaPaymentModal from '../../components/MpesaPaymentModal';
import {
  getAllInstitutions,
  isInstitutionJoined,
  toggleJoinInstitution,
  isInstitutionFollowed,
  toggleFollowInstitution,
  getInstitutionSubscription,
  isInstitutionOwner,
  SUBSCRIPTION_PLANS,
  getJoinedInstitutionIds,
  getFollowedInstitutionIds,
} from '../../lib/institutionManager';
import { getSampleFeedPosts } from '../../lib/pinnedPosts';
import { canUserViewPost, getPostVisibility } from '../../lib/postInteractions';
import { getFollows } from '../../lib/profileManager';
import { playSound } from '../../lib/soundEffects';

export default function ChurchDetailPage({ params }) {
  const resolvedParams = typeof params?.then === 'function' ? use(params) : params;
  const churchId = resolvedParams?.id;

  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [institution, setInstitution] = useState(null);
  const [joined, setJoined] = useState(false);
  const [followed, setFollowed] = useState(false);
  const [posts, setPosts] = useState([]);
  const [showSubModal, setShowSubModal] = useState(false);
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [subVersion, setSubVersion] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user?.id) {
        supabase
          .from('profiles')
          .select('*')
          .eq('id', data.session.user.id)
          .maybeSingle()
          .then(({ data: prof }) => {
            if (prof) setProfile(prof);
          });
      }
    });
  }, []);

  useEffect(() => {
    if (!churchId) return;
    const all = getAllInstitutions();
    const matched = all.find((i) => String(i.id) === String(churchId));
    if (matched) {
      setInstitution(matched);
      setJoined(isInstitutionJoined(matched.id));
      setFollowed(isInstitutionFollowed(matched.id));
    } else {
      supabase
        .from('churches')
        .select('*')
        .eq('id', churchId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setInstitution({
              id: data.id,
              name: data.name,
              category: 'church',
              categoryLabel: 'Church & Ministry',
              location: data.location || 'Kenya',
              about:
                data.about ||
                `${data.name} is a faith community dedicated to worship, scripture, and discipleship.`,
              membersCount: data.members_count || 150,
              verified: true,
              created_by: data.created_by,
              owner_id: data.created_by,
              plan: data.subscription_plan || 'free',
            });
          } else {
            setInstitution({
              id: churchId,
              name: 'Christian Ministry Sanctuary',
              category: 'church',
              categoryLabel: 'Church & Ministry',
              location: 'Nairobi, Kenya',
              about: 'A Christ-centered congregation gathering for worship, teaching, and outreach.',
              membersCount: 240,
              verified: true,
            });
          }
        });
    }

    const samplePosts = getSampleFeedPosts().filter(
      (p) => !p.church_id || String(p.church_id) === String(churchId)
    );
    setPosts(samplePosts);
  }, [churchId, subVersion]);

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  }

  if (!institution) {
    return (
      <main className="shell">
        <div className="cx-page">
          <div className="post-card">Loading institution page…</div>
        </div>
      </main>
    );
  }

  // Strictly enforce that ONLY the page owner can see or manage the subscription plan
  const isOwner = isInstitutionOwner(institution, session?.user, profile);
  const sub = isOwner ? getInstitutionSubscription(institution.id) : null;
  const planInfo = isOwner
    ? SUBSCRIPTION_PLANS.find((p) => p.id === sub?.planId) || SUBSCRIPTION_PLANS[0]
    : null;

  const visiblePosts = posts.filter((p) =>
    canUserViewPost(
      { ...p, visibility: getPostVisibility(p.id, p.visibility || 'public') },
      session?.user,
      profile,
      getFollows(),
      Array.from(new Set([...getJoinedInstitutionIds(), ...getFollowedInstitutionIds()]))
    )
  );

  return (
    <main className="shell">
      <div className="sticky-header">
        <header className="topbar">
          <div className="brand" style={{ gap: 10 }}>
            <Link
              href="/?tab=churches"
              className="action-btn"
              style={{ minHeight: 36, padding: '6px 10px', textDecoration: 'none' }}
              aria-label="Back to directory"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="brand-text-wrap">
              <h1 className="brand-mark" style={{ fontSize: '18px' }}>{institution.name}</h1>
              <span className="brand-subtext">{institution.categoryLabel || 'Institution Page'}</span>
            </div>
          </div>

          {isOwner && planInfo && (
            <button
              type="button"
              className="inst-action-pill"
              onClick={() => setShowSubModal(true)}
              title="Visible only to you as page owner"
            >
              <Shield size={14} />
              <span>{planInfo.name} · Manage Plan</span>
            </button>
          )}
        </header>
      </div>

      <div className="cx-page" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="post-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            className="inst-modal-cover"
            style={{
              height: 160,
              ...(institution.cover_url ? { backgroundImage: `url(${institution.cover_url})` } : {}),
            }}
          >
            <div className="inst-modal-cover-gradient" />
          </div>

          <div style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {institution.logo_url ? (
                  <img
                    src={institution.logo_url}
                    alt={institution.name}
                    style={{ width: 64, height: 64, borderRadius: 16, objectFit: 'cover', border: '2px solid var(--border)' }}
                  />
                ) : (
                  <div className="inst-modal-logo-placeholder" style={{ width: 64, height: 64 }}>
                    <Building2 size={28} />
                  </div>
                )}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <h2 style={{ margin: 0, fontSize: 20 }}>{institution.name}</h2>
                    {institution.verified && <VerifiedBadge badge="pastor" role="church_admin" size={17} />}
                    {isOwner && planInfo && (
                      <span
                        className="inst-plan-chip"
                        style={{ backgroundColor: planInfo.badgeColor }}
                        title="Subscription plan (visible only to you as page owner)"
                      >
                        {planInfo.name} (Owner Only)
                      </span>
                    )}
                  </div>
                  {institution.branch && (
                    <div style={{ fontSize: 12.5, color: 'var(--teal)', fontWeight: 600, marginTop: 2 }}>
                      📍 Branch: {institution.branch}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12.5, color: 'var(--ink-muted)', marginTop: 4 }}>
                    <span>
                      <MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />
                      {institution.location}
                    </span>
                    <span>
                      <Users size={12} style={{ display: 'inline', marginRight: 4 }} />
                      {(institution.membersCount || 120).toLocaleString()} members
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`inst-action-pill${followed ? ' followed' : ''}`}
                  onClick={() => {
                    const next = toggleFollowInstitution(institution.id);
                    setFollowed(next);
                    showToast(next ? `Now following ${institution.name}` : `Unfollowed ${institution.name}`);
                  }}
                >
                  {followed ? <Check size={14} /> : <Plus size={14} />}
                  <span>{followed ? 'Following' : 'Follow'}</span>
                </button>

                <button
                  type="button"
                  className={`inst-action-pill join-btn${joined ? ' joined' : ''}`}
                  onClick={() => {
                    const next = toggleJoinInstitution(institution.id);
                    setJoined(next);
                    showToast(next ? `Joined ${institution.name}` : `Left ${institution.name}`);
                  }}
                >
                  <span>{joined ? 'Joined Member ✓' : '+ Join Institution'}</span>
                </button>

                <button
                  type="button"
                  className="inst-action-icon-btn"
                  onClick={async () => {
                    const url = typeof window !== 'undefined' ? window.location.href : '';
                    try {
                      await navigator.clipboard.writeText(url);
                      showToast('Page link copied to clipboard!');
                      playSound('reaction');
                    } catch {}
                  }}
                  title="Share page"
                >
                  <Share2 size={16} />
                </button>
              </div>
            </div>

            <p style={{ marginTop: 14, fontSize: 14, lineHeight: 1.55, color: 'var(--ink)' }}>
              {institution.about}
            </p>

            {/* Owner-Only Subscription Management Card */}
            {isOwner && planInfo && (
              <div
                style={{
                  marginTop: 14,
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'rgba(13, 148, 136, 0.1)',
                  border: '1px solid rgba(20, 184, 166, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <strong style={{ fontSize: 13, display: 'block' }}>
                    🔒 Page Owner Administration · Current Plan: {planInfo.name}
                  </strong>
                  <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                    This subscription status is private and only visible to you as the page owner.
                  </span>
                </div>
                <button
                  type="button"
                  className="inst-btn-primary"
                  onClick={() => setShowSubModal(true)}
                >
                  <Shield size={14} />
                  <span>Manage Subscription Plan</span>
                </button>
              </div>
            )}

            {/* Active Fundraising Box */}
            {institution.hasFundraising && institution.activeCampaign && (
              <div className="inst-campaign-box" style={{ marginTop: 16 }}>
                <div className="campaign-top" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Coins size={16} className="text-amber-500" />
                    <strong>{institution.activeCampaign.title}</strong>
                  </div>
                  <button
                    type="button"
                    className="giving-cta-btn"
                    onClick={() => setShowDonateModal(true)}
                  >
                    <Heart size={13} />
                    <span>Give via M-Pesa</span>
                  </button>
                </div>
                <p className="campaign-purpose">{institution.activeCampaign.purpose}</p>
                <div className="campaign-progress-bar">
                  <div
                    className="campaign-fill"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round((institution.activeCampaign.raisedKes / institution.activeCampaign.goalKes) * 100)
                      )}%`,
                    }}
                  />
                </div>
                <div className="campaign-stats">
                  <span>Raised: KES {institution.activeCampaign.raisedKes.toLocaleString()}</span>
                  <span>Goal: KES {institution.activeCampaign.goalKes.toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* Upcoming Events */}
            {institution.upcomingEvents && institution.upcomingEvents.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h3 style={{ fontSize: 14, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={15} className="text-teal-400" />
                  <span>Upcoming Gatherings &amp; Services</span>
                </h3>
                <div style={{ display: 'grid', gap: 8 }}>
                  {institution.upcomingEvents.map((ev, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                        background: 'var(--bg)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 8,
                      }}
                    >
                      <strong style={{ fontSize: 13 }}>{ev.title}</strong>
                      <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                        {ev.date} · {ev.venue}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <h3 style={{ margin: '4px 0 0', fontSize: 16 }}>Recent Updates &amp; Posts</h3>
        {visiblePosts.map((p) => (
          <PostCard key={p.id} post={p} session={session} />
        ))}
      </div>

      {showSubModal && isOwner && (
        <InstitutionSubscriptionModal
          institution={institution}
          session={session}
          currentUser={profile}
          onClose={() => setShowSubModal(false)}
          onUpdated={() => setSubVersion((v) => v + 1)}
        />
      )}

      {showDonateModal && (
        <MpesaPaymentModal
          currentUser={profile}
          onClose={() => setShowDonateModal(false)}
        />
      )}

      {toastMsg && <div className="author-modal-toast">{toastMsg}</div>}
    </main>
  );
}
