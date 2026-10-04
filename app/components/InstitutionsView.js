'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Building2,
  MapPin,
  Users,
  Search,
  Check,
  Plus,
  Sparkles,
  BookOpen,
  Calendar,
  Coins,
  Shield,
  Layers,
  Award,
  ChevronRight,
} from 'lucide-react';
import {
  INSTITUTION_CATEGORIES,
  SAMPLE_INSTITUTIONS,
  getJoinedInstitutionIds,
  toggleJoinInstitution,
  isInstitutionJoined,
  isInstitutionFollowed,
  toggleFollowInstitution,
  getInstitutionSubscription,
  SUBSCRIPTION_PLANS,
} from '../lib/institutionManager';
import VerifiedBadge from './VerifiedBadge';
import InstitutionProfileModal from './InstitutionProfileModal';
import InstitutionSubscriptionModal from './InstitutionSubscriptionModal';
import ChurchMapLocator from './ChurchMapLocator';
import { playSound } from '../lib/soundEffects';

export default function InstitutionsView({ session, currentUser, openAuth }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [joinedIds, setJoinedIds] = useState(() => getJoinedInstitutionIds());
  const [selectedInstForModal, setSelectedInstForModal] = useState(null);
  const [selectedInstForSub, setSelectedInstForSub] = useState(null);
  const [toastMsg, setToastMsg] = useState('');
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'map' | 'directory'

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  }

  function handleJoinToggle(inst) {
    if (!session) {
      if (openAuth) openAuth('signin');
      return;
    }
    const next = toggleJoinInstitution(inst.id);
    setJoinedIds(getJoinedInstitutionIds());
    showToast(next ? `Joined ${inst.name}` : `Left ${inst.name}`);
  }

  // Filter institutions
  const filteredInstitutions = useMemo(() => {
    return SAMPLE_INSTITUTIONS.filter((inst) => {
      if (activeCategory !== 'all' && inst.category !== activeCategory) {
        return false;
      }
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = inst.name.toLowerCase().includes(query);
        const matchesLocation = (inst.location || '').toLowerCase().includes(query);
        const matchesCategory = (inst.categoryLabel || '').toLowerCase().includes(query);
        const matchesDenom = (inst.denomination || '').toLowerCase().includes(query);
        return matchesName || matchesLocation || matchesCategory || matchesDenom;
      }
      return true;
    });
  }, [activeCategory, searchTerm]);

  // Joined institutions list
  const joinedInstitutions = SAMPLE_INSTITUTIONS.filter((inst) => joinedIds.includes(inst.id));

  // Location-based recommendations (user's location or default to Nairobi regional recommendations)
  const userCounty = currentUser?.location_label || 'Nairobi';
  const recommendedInstitutions = SAMPLE_INSTITUTIONS.filter(
    (inst) => (inst.county || '').toLowerCase().includes('nairobi') || inst.verified
  ).slice(0, 4);

  return (
    <div className="institutions-page-shell">
      {/* Hero Banner */}
      <div className="institutions-hero-card">
        <div className="inst-hero-badge">
          <Sparkles size={14} />
          <span>Christian Institutions Directory &amp; Ministry Hub</span>
        </div>
        <h1 className="inst-hero-title">Institutions, Unions &amp; Fellowships</h1>
        <p className="inst-hero-sub">
          Explore churches, missionary organizations, school &amp; university Christian Unions, and bible study groups across Kenya.
        </p>

        {/* Search input */}
        <div className="inst-search-wrapper">
          <Search size={18} className="inst-search-icon" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by institution name, campus, town, or denomination…"
            className="inst-search-field"
            aria-label="Search institutions"
          />
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="institutions-filter-bar" role="tablist">
        {INSTITUTION_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={activeCategory === cat.id}
            className={`inst-filter-pill${activeCategory === cat.id ? ' active' : ''}`}
            onClick={() => {
              setActiveCategory(cat.id);
              playSound('reaction');
            }}
          >
            <span className="cat-pill-icon">{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* View Mode Switcher: Directory + Live Google Maps Locator */}
      <div className="flex flex-wrap items-center justify-between gap-2 my-3 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <MapPin size={15} className="text-teal-400" />
          <span>
            <strong>Google Maps Church &amp; Ministry Locator:</strong> Search places, explore verified markers, and compute live driving/walking routes.
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setViewMode('split');
              playSound('reaction');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              viewMode === 'split'
                ? 'bg-teal-500/20 border-teal-400 text-teal-200'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            🗺️ Map + Directory
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode('map');
              playSound('reaction');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              viewMode === 'map'
                ? 'bg-teal-500/20 border-teal-400 text-teal-200'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            📍 Full Map &amp; Routes
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode('directory');
              playSound('reaction');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              viewMode === 'directory'
                ? 'bg-teal-500/20 border-teal-400 text-teal-200'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            🏛️ Cards Only
          </button>
        </div>
      </div>

      {/* Interactive Google Maps Platform Locator & Route Planner */}
      {(viewMode === 'split' || viewMode === 'map') && (
        <section className="inst-shelf-section mb-6">
          <ChurchMapLocator
            institutions={filteredInstitutions}
            onSelectInstitution={(inst) => setSelectedInstForModal(inst)}
          />
        </section>
      )}

      {/* Layer 1: Joined Institutions Shelf (if user has joined any) */}
      {!searchTerm && joinedInstitutions.length > 0 && activeCategory === 'all' && (
        <section className="inst-shelf-section">
          <div className="inst-shelf-header">
            <div className="shelf-title-wrap">
              <Check size={18} className="text-emerald-500" />
              <h3>Your Joined Institutions ({joinedInstitutions.length})</h3>
            </div>
            <span className="shelf-hint">You receive updates &amp; announcements</span>
          </div>

          <div className="joined-institutions-scroll">
            {joinedInstitutions.map((inst) => (
              <div
                key={inst.id}
                className="joined-inst-card"
                onClick={() => setSelectedInstForModal(inst)}
              >
                <div
                  className="joined-inst-cover"
                  style={inst.cover_url ? { backgroundImage: `url(${inst.cover_url})` } : undefined}
                >
                  <span className="joined-inst-badge">Member</span>
                </div>
                <div className="joined-inst-body">
                  <div className="joined-inst-head">
                    <img src={inst.logo_url} alt="" className="joined-logo" />
                    <div className="joined-titles">
                      <strong>{inst.name}</strong>
                      <span className="joined-cat">{inst.categoryLabel}</span>
                    </div>
                  </div>
                  <div className="joined-inst-actions">
                    <Link
                      href={`/churches/${inst.id}`}
                      className="joined-visit-link"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Visit Page
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Layer 2: Location-Based Recommendations */}
      {!searchTerm && activeCategory === 'all' && (
        <section className="inst-shelf-section">
          <div className="inst-shelf-header">
            <div className="shelf-title-wrap">
              <MapPin size={18} className="text-teal-500" />
              <h3>Recommended for You ({userCounty} &amp; Regional)</h3>
            </div>
            <span className="shelf-hint">Based on your community connections</span>
          </div>

          <div className="inst-recommendations-grid">
            {recommendedInstitutions.map((inst) => {
              const isJoined = joinedIds.includes(inst.id);
              const sub = getInstitutionSubscription(inst.id);
              const plan = SUBSCRIPTION_PLANS.find((p) => p.id === sub.planId) || SUBSCRIPTION_PLANS[0];

              return (
                <div
                  key={inst.id}
                  className="inst-rec-card neon-border-hover"
                  onClick={() => setSelectedInstForModal(inst)}
                >
                  <div className="rec-card-top">
                    <img src={inst.logo_url} alt="" className="rec-logo" />
                    <div className="rec-info">
                      <div className="rec-name-row">
                        <h4>{inst.name}</h4>
                        {inst.verified && <VerifiedBadge badge="pastor" role="church_admin" size={15} />}
                      </div>
                      <div className="rec-branch-row">
                        {inst.branch && <span className="rec-branch-chip">📍 {inst.branch}</span>}
                        <span className="rec-meta">{inst.location}</span>
                      </div>
                    </div>
                    <span className="rec-plan-pill" style={{ color: plan.badgeColor, borderColor: plan.badgeColor }}>
                      {plan.name}
                    </span>
                  </div>

                  <p className="rec-about">{inst.about}</p>

                  <div className="rec-footer">
                    <span className="rec-members-count">
                      <Users size={13} />
                      <span>{inst.membersCount.toLocaleString()} members</span>
                    </span>

                    <button
                      type="button"
                      className={`inst-join-action-btn${isJoined ? ' joined' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJoinToggle(inst);
                      }}
                    >
                      {isJoined ? 'Joined ✓' : '+ Join'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Layer 3: All Institutions Directory */}
      <section className="inst-shelf-section main-directory">
        <div className="inst-shelf-header">
          <div className="shelf-title-wrap">
            <Building2 size={18} className="text-indigo-500" />
            <h3>
              {activeCategory === 'all'
                ? 'All Institutions Directory'
                : INSTITUTION_CATEGORIES.find((c) => c.id === activeCategory)?.label}{' '}
              ({filteredInstitutions.length})
            </h3>
          </div>
          <Link href="/churches/new" className="inst-create-btn">
            + Register Institution
          </Link>
        </div>

        {filteredInstitutions.length === 0 ? (
          <div className="empty-state">
            <h2>No institutions found</h2>
            <p>Try clearing your search query or choosing another category.</p>
          </div>
        ) : (
          <div className="inst-main-grid">
            {filteredInstitutions.map((inst) => {
              const isJoined = joinedIds.includes(inst.id);
              const sub = getInstitutionSubscription(inst.id);
              const plan = SUBSCRIPTION_PLANS.find((p) => p.id === sub.planId) || SUBSCRIPTION_PLANS[0];

              return (
                <div
                  key={inst.id}
                  className="inst-directory-card neon-border-hover"
                  onClick={() => setSelectedInstForModal(inst)}
                >
                  <div
                    className="inst-dir-cover"
                    style={inst.cover_url ? { backgroundImage: `url(${inst.cover_url})` } : undefined}
                  >
                    <div className="inst-dir-cover-overlay" />
                    <span className="inst-dir-type-pill">{inst.categoryLabel}</span>
                    <span className="inst-dir-plan-badge" style={{ background: plan.badgeColor }}>
                      {plan.name}
                    </span>
                  </div>

                  <div className="inst-dir-body">
                    <div className="inst-dir-avatar-row">
                      <img src={inst.logo_url} alt="" className="inst-dir-avatar" />
                      <div className="inst-dir-titles">
                        <div className="dir-title-row">
                          <h4>{inst.name}</h4>
                          {inst.verified && <VerifiedBadge badge="pastor" role="church_admin" size={15} />}
                        </div>
                        {inst.branch && (
                          <span className="dir-branch-pill">🏛️ Branch: <strong>{inst.branch}</strong></span>
                        )}
                        <span className="dir-location-text">
                          <MapPin size={12} />
                          <span>{inst.location}</span>
                        </span>
                      </div>
                    </div>

                    <p className="inst-dir-desc">{inst.about}</p>

                    {/* Features badges row */}
                    <div className="inst-dir-features-row">
                      {inst.hasFundraising && (
                        <span className="dir-feat-badge gold">
                          <Coins size={12} />
                          <span>Fundraising Active</span>
                        </span>
                      )}
                      {inst.coursesCount > 0 && (
                        <span className="dir-feat-badge purple">
                          <BookOpen size={12} />
                          <span>{inst.coursesCount} Courses</span>
                        </span>
                      )}
                      {inst.upcomingEvents && inst.upcomingEvents.length > 0 && (
                        <span className="dir-feat-badge teal">
                          <Calendar size={12} />
                          <span>{inst.upcomingEvents.length} Events</span>
                        </span>
                      )}
                    </div>

                    <div className="inst-dir-footer">
                      <span className="dir-members-total">
                        <Users size={13} />
                        <span>{inst.membersCount.toLocaleString()} members</span>
                      </span>

                      <div className="dir-actions-pair" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className={`inst-join-action-btn${isJoined ? ' joined' : ''}`}
                          onClick={() => handleJoinToggle(inst)}
                        >
                          {isJoined ? 'Joined ✓' : '+ Join'}
                        </button>
                        <Link href={`/churches/${inst.id}`} className="inst-view-btn">
                          View
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Detailed Institution Profile Modal with Neon Glow Border */}
      {selectedInstForModal && (
        <InstitutionProfileModal
          institution={selectedInstForModal}
          onClose={() => setSelectedInstForModal(null)}
          onOpenSubscription={() => {
            setSelectedInstForSub(selectedInstForModal);
            setSelectedInstForModal(null);
          }}
        />
      )}

      {/* Subscription Modal for Admins */}
      {selectedInstForSub && (
        <InstitutionSubscriptionModal
          institution={selectedInstForSub}
          onClose={() => setSelectedInstForSub(null)}
          onUpdated={() => {
            setJoinedIds(getJoinedInstitutionIds());
          }}
        />
      )}

      {/* Toast Feedback */}
      {toastMsg && <div className="author-modal-toast">{toastMsg}</div>}
    </div>
  );
}
