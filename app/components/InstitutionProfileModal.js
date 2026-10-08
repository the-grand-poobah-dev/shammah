'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  MapPin,
  Users,
  Check,
  Plus,
  Share2,
  ExternalLink,
  Coins,
  BookOpen,
  Calendar,
  Sparkles,
  X,
  Heart,
  Shield,
} from 'lucide-react';
import VerifiedBadge from './VerifiedBadge';
import {
  isInstitutionJoined,
  toggleJoinInstitution,
  isInstitutionFollowed,
  toggleFollowInstitution,
  getInstitutionSubscription,
  isInstitutionOwner,
  SUBSCRIPTION_PLANS,
} from '../lib/institutionManager';
import { getInstitutionBranch } from '../lib/churchConfig';
import { playSound } from '../lib/soundEffects';

export default function InstitutionProfileModal({
  institution,
  session = null,
  currentUser = null,
  onClose,
  onOpenSubscription = null,
}) {
  const [joined, setJoined] = useState(false);
  const [followed, setFollowed] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [subModalOpen, setSubModalOpen] = useState(false);

  useEffect(() => {
    if (institution?.id) {
      setJoined(isInstitutionJoined(institution.id));
      setFollowed(isInstitutionFollowed(institution.id));
    }
  }, [institution?.id]);

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  }

  function handleJoinToggle() {
    const next = toggleJoinInstitution(institution.id);
    setJoined(next);
    showToast(next ? `🎉 You joined ${institution.name}!` : `Left ${institution.name}`);
  }

  function handleFollowToggle() {
    const next = toggleFollowInstitution(institution.id);
    setFollowed(next);
    showToast(next ? `Now following ${institution.name}` : `Unfollowed ${institution.name}`);
  }

  async function handleShare() {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/churches/${institution.id}` : '';
    if (navigator.share) {
      try {
        await navigator.share({ title: institution.name, url });
      } catch {}
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast('Institution link copied to clipboard!');
      playSound('reaction');
    } catch {}
  }

  const isOwner = isInstitutionOwner(institution, session?.user || currentUser, currentUser);
  const sub = isOwner ? getInstitutionSubscription(institution.id) : null;
  const planInfo = isOwner
    ? SUBSCRIPTION_PLANS.find((p) => p.id === sub.planId) || SUBSCRIPTION_PLANS[0]
    : null;

  return (
    <div
      className="institution-modal-backdrop toast-backdrop-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={institution.name || 'Institution details'}
    >
      <div
        className="inst-profile-modal-card toast-popup-box multicolored-glow-shadow"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cover Header with Contained Top-Right Close Button */}
        <div
          className="inst-modal-cover"
          style={institution.cover_url ? { backgroundImage: `url(${institution.cover_url})` } : undefined}
        >
          <div className="inst-modal-cover-gradient" />
          <div className="inst-modal-cover-top-bar">
            <span className="inst-modal-cover-pill">
              <Sparkles size={11} />
              <span>{institution.categoryLabel || 'Christian Institution'}</span>
            </span>
            <button
              type="button"
              className="inst-modal-close"
              onClick={onClose}
              aria-label="Close institution preview"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Profile Avatar & Quick Actions */}
        <div className="inst-modal-head-row">
          <div className="inst-modal-logo-wrap">
            {institution.logo_url ? (
              <img src={institution.logo_url} alt={institution.name} className="inst-modal-logo" />
            ) : (
              <div className="inst-modal-logo-placeholder">
                <Building2 size={26} />
              </div>
            )}
          </div>

          <div className="inst-modal-actions-top">
            <button
              type="button"
              className={`inst-action-pill${followed ? ' followed' : ''}`}
              onClick={handleFollowToggle}
            >
              {followed ? <Check size={13} /> : <Heart size={13} />}
              <span>{followed ? 'Following' : 'Follow'}</span>
            </button>

            <button
              type="button"
              className={`inst-action-pill join-btn${joined ? ' joined' : ''}`}
              onClick={handleJoinToggle}
            >
              {joined ? <Check size={13} /> : <Plus size={13} />}
              <span>{joined ? 'Joined Member' : 'Join Fellowship'}</span>
            </button>

            <button
              type="button"
              className="inst-action-icon-btn"
              onClick={handleShare}
              title="Share institution"
              aria-label="Share institution"
            >
              <Share2 size={15} />
            </button>
          </div>
        </div>

        {/* Details Section */}
        <div className="inst-modal-details">
          <div className="inst-modal-title-line">
            <h3>{institution.name}</h3>
            {institution.verified && <VerifiedBadge badge="pastor" role="church_admin" size={16} />}
            {isOwner && planInfo && (
              <span
                className="inst-plan-chip"
                style={{ backgroundColor: planInfo.badgeColor }}
                title="Subscription plan (visible only to you as page owner)"
              >
                {planInfo.name}
              </span>
            )}
          </div>

          {(institution.branch || getInstitutionBranch(institution.id)) && (
            <div className="inst-modal-branch-chip">
              <Building2 size={13} />
              <span>
                Campus / Branch: <strong>{institution.branch || getInstitutionBranch(institution.id)}</strong>
              </span>
            </div>
          )}

          {/* Assimilated Church Info Pills / Stats Grid */}
          <div className="inst-modal-meta-row">
            <span className="inst-type-badge">
              <Building2 size={12} />
              <span>{institution.denomination || institution.categoryLabel || 'Fellowship'}</span>
            </span>
            {institution.location && (
              <span className="inst-meta-item">
                <MapPin size={13} />
                <span>{institution.location}</span>
              </span>
            )}
            <span className="inst-meta-item">
              <Users size={13} />
              <span>{(institution.membersCount || 120).toLocaleString()} members</span>
            </span>
          </div>

          {institution.about && <p className="inst-modal-bio">{institution.about}</p>}

          {/* Active Fundraising Banner if present */}
          {institution.hasFundraising && institution.activeCampaign && (
            <div className="inst-campaign-box">
              <div className="campaign-top">
                <span className="campaign-icon-badge">
                  <Coins size={14} />
                </span>
                <div className="campaign-title-wrap">
                  <strong>{institution.activeCampaign.title}</strong>
                  <span className="campaign-active-tag">Active Giving</span>
                </div>
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
                <span>
                  Raised: <strong>KES {institution.activeCampaign.raisedKes.toLocaleString()}</strong>
                </span>
                <span>Goal: KES {institution.activeCampaign.goalKes.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Key offerings / features row */}
          {(institution.coursesCount > 0 ||
            (institution.upcomingEvents && institution.upcomingEvents.length > 0)) && (
            <div className="inst-features-mini-grid">
              {institution.coursesCount > 0 && (
                <div className="inst-feat-chip">
                  <BookOpen size={14} className="inst-feat-icon-purple" />
                  <span>{institution.coursesCount} Discipleship Courses</span>
                </div>
              )}
              {institution.upcomingEvents && institution.upcomingEvents.length > 0 && (
                <div className="inst-feat-chip">
                  <Calendar size={14} className="inst-feat-icon-teal" />
                  <span>{institution.upcomingEvents.length} Upcoming Events</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom CTA Row */}
        <div className="inst-modal-footer">
          {isOwner && onOpenSubscription && (
            <button
              type="button"
              className="inst-manage-plan-btn"
              onClick={onOpenSubscription}
            >
              <Shield size={15} />
              <span>Manage Plan</span>
            </button>
          )}
          <Link
            href={`/churches/${institution.id}`}
            className="inst-visit-full-btn"
            onClick={onClose}
          >
            <Building2 size={15} />
            <span>Visit Institution Page</span>
            <ExternalLink size={14} />
          </Link>
        </div>

        {/* Toast */}
        {toastMsg && <div className="inst-modal-toast">{toastMsg}</div>}
      </div>
    </div>
  );
}
