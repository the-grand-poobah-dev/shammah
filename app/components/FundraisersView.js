'use client';
import { useState, useMemo } from 'react';
import {
  HeartHandshake,
  Coins,
  Heart,
  Search,
  Sparkles,
  Share2,
  CheckCircle2,
  Building2,
  Users,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  PlusCircle,
  Copy,
  Check,
} from 'lucide-react';
import { playSound } from '../lib/soundEffects';
import MpesaPaymentModal, { COMMUNITY_PROJECTS } from './MpesaPaymentModal';

// Enhanced community fundraiser projects with ministry details
const EXTENDED_FUNDRAISERS = [
  ...COMMUNITY_PROJECTS,
  {
    id: 'turkana-borehole',
    name: 'Turkana Clean Water Borehole & Solar Pump',
    tag: 'Mercy & Outreach',
    icon: '💧',
    description: 'Drilling a deep clean water borehole and solar water purification plant for pastoralist families and schools in Turkana County.',
    targetKes: 650000,
    raisedKes: 520000,
    organizer: 'Turkana Community Fellowship',
    donorsCount: 312,
    daysLeft: 14,
  },
  {
    id: 'eldoret-sanctuary',
    name: 'Eldoret Worship Chapel Roof Restoration',
    tag: 'Church Building',
    icon: '⛪',
    description: 'Replacing aging iron sheets and installing insulation and ceiling acoustics before the heavy rainy season commences.',
    targetKes: 450000,
    raisedKes: 310000,
    organizer: 'Eldoret Grace Chapel',
    donorsCount: 198,
    daysLeft: 22,
  },
  {
    id: 'coast-medical-camp',
    name: 'Coast Free Medical Camp & Evangelism Drive',
    tag: 'Mercy & Outreach',
    icon: '🩺',
    description: 'Providing free medical consultations, essential prescription medication, eyeglasses, and gospel tracts to coastal villages in Kwale.',
    targetKes: 280000,
    raisedKes: 195000,
    organizer: 'Mombasa Gospel Mission',
    donorsCount: 145,
    daysLeft: 9,
  },
];

const CAUSE_FILTERS = [
  { id: 'all', label: 'All Causes' },
  { id: 'mercy', label: 'Mercy & Relief', tagMatch: 'Mercy & Outreach' },
  { id: 'youth', label: 'Next-Gen & Youth', tagMatch: 'Next-Gen Faith' },
  { id: 'building', label: 'Church Building', tagMatch: 'Church Building' },
  { id: 'word', label: 'Scripture & Missions', tagMatch: "God’s Word" },
];

export default function FundraisersView({ session, currentUser, openAuth }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const filteredProjects = useMemo(() => {
    return EXTENDED_FUNDRAISERS.filter((proj) => {
      const matchesSearch =
        !searchQuery.trim() ||
        proj.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        proj.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (proj.organizer && proj.organizer.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (activeFilter === 'all') return true;
      const filterObj = CAUSE_FILTERS.find((f) => f.id === activeFilter);
      if (!filterObj || !filterObj.tagMatch) return true;
      return proj.tag.toLowerCase().includes(filterObj.tagMatch.toLowerCase());
    });
  }, [activeFilter, searchQuery]);

  // Summary statistics
  const totalRaised = useMemo(() => {
    return EXTENDED_FUNDRAISERS.reduce((acc, curr) => acc + curr.raisedKes, 0);
  }, []);

  const totalTarget = useMemo(() => {
    return EXTENDED_FUNDRAISERS.reduce((acc, curr) => acc + curr.targetKes, 0);
  }, []);

  function handleOpenDonate(projectId) {
    playSound('reaction');
    setSelectedProjectId(projectId);
    setIsModalOpen(true);
  }

  function handleShare(proj) {
    playSound('reaction');
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/fundraisers#${proj.id}`;
      navigator.clipboard?.writeText(url).catch(() => {});
      setCopiedId(proj.id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  }

  return (
    <div className="fundraisers-view-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Hero Banner */}
      <div
        className="post-card"
        style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 182, 212, 0.08) 100%)',
          borderColor: 'rgba(16, 185, 129, 0.35)',
          padding: '20px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ maxWidth: '540px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '999px', background: 'rgba(16, 185, 129, 0.18)', color: '#10b981', fontSize: '11px', fontWeight: 600, marginBottom: '10px' }}>
              <HeartHandshake size={14} />
              <span>Kingdom Missions &amp; Giving</span>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--ink)' }}>
              Faith in Action: Church &amp; Community Causes
            </h2>
            <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, color: 'var(--ink-muted)' }}>
              Support verified church construction, outreach, youth camps, and emergency relief across Kenya and East Africa. Give securely via M-Pesa.
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '12px',
              padding: '12px 16px',
              background: 'var(--surface)',
              borderRadius: '14px',
              border: '1px solid var(--border)',
            }}
          >
            <div>
              <span style={{ fontSize: '11px', color: 'var(--ink-muted)', display: 'block' }}>Total Raised</span>
              <strong style={{ fontSize: '16px', color: '#10b981' }}>
                KES {totalRaised.toLocaleString()}
              </strong>
            </div>
            <div style={{ width: '1px', background: 'var(--border)' }} />
            <div>
              <span style={{ fontSize: '11px', color: 'var(--ink-muted)', display: 'block' }}>Verified Causes</span>
              <strong style={{ fontSize: '16px', color: 'var(--ink)' }}>
                {EXTENDED_FUNDRAISERS.length} Projects
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Chips & Search Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div className="bible-controls-card" style={{ padding: '8px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
            <Search size={16} style={{ color: 'var(--ink-muted)', shrink: 0 }} />
            <input
              type="text"
              className="inst-search-field"
              placeholder="Search fundraisers by cause, church name, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13px', color: 'var(--ink)' }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--ink-muted)' }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Cause Filter Buttons */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }} className="no-scrollbar">
          {CAUSE_FILTERS.map((f) => {
            const isActive = activeFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  playSound('reaction');
                  setActiveFilter(f.id);
                }}
                className={`gws-filter-chip${isActive ? ' active' : ''}`}
                style={{
                  padding: '6px 14px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: isActive ? 600 : 500,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  border: isActive ? '1px solid #10b981' : '1px solid var(--border)',
                  background: isActive ? 'rgba(16, 185, 129, 0.15)' : 'var(--surface)',
                  color: isActive ? '#10b981' : 'var(--ink-muted)',
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Fundraiser Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
        {filteredProjects.map((proj) => {
          const percent = Math.min(100, Math.round((proj.raisedKes / proj.targetKes) * 100));
          const isCopied = copiedId === proj.id;

          return (
            <div
              key={proj.id}
              id={proj.id}
              className="post-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '16px',
                borderRadius: '16px',
                position: 'relative',
              }}
            >
              <div>
                {/* Header Tag and Organizer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: 'rgba(16, 185, 129, 0.12)',
                      color: '#10b981',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                  >
                    <span aria-hidden="true">{proj.icon || '🕊️'}</span>
                    <span>{proj.tag}</span>
                  </span>

                  {proj.daysLeft !== undefined && (
                    <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                      {proj.daysLeft} days left
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--ink)', lineHeight: 1.35 }}>
                  {proj.name}
                </h3>

                {/* Organizer */}
                {proj.organizer && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--ink-muted)', marginBottom: '8px' }}>
                    <Building2 size={12} />
                    <span>{proj.organizer}</span>
                    <ShieldCheck size={12} style={{ color: '#10b981' }} />
                  </div>
                )}

                {/* Description */}
                <p style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--ink-muted)', margin: '0 0 14px 0' }}>
                  {proj.description}
                </p>
              </div>

              <div>
                {/* Progress Bar */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--ink)' }}>
                      KES {proj.raisedKes.toLocaleString()}
                    </span>
                    <span style={{ color: 'var(--ink-muted)' }}>
                      {percent}% of KES {proj.targetKes.toLocaleString()}
                    </span>
                  </div>

                  <div
                    style={{
                      width: '100%',
                      height: '7px',
                      borderRadius: '999px',
                      background: 'var(--surface-sunken, rgba(255, 255, 255, 0.08))',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${percent}%`,
                        height: '100%',
                        borderRadius: '999px',
                        background: 'linear-gradient(90deg, #10b981 0%, #06b6d4 100%)',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>

                  {proj.donorsCount && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--ink-muted)', marginTop: '4px' }}>
                      <Users size={11} />
                      <span>{proj.donorsCount} believers contributed</span>
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    className="action-btn"
                    style={{
                      flex: 1,
                      minHeight: '38px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      fontWeight: 600,
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                    }}
                    onClick={() => handleOpenDonate(proj.id)}
                  >
                    <Coins size={15} />
                    <span>Give via M-Pesa</span>
                  </button>

                  <button
                    type="button"
                    className="topbar-toggle-btn"
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                    onClick={() => handleShare(proj)}
                    title="Copy share link"
                    aria-label="Share fundraiser"
                  >
                    {isCopied ? <Check size={15} style={{ color: '#10b981' }} /> : <Share2 size={15} />}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredProjects.length === 0 && (
        <div className="empty-state" style={{ padding: '36px 16px' }}>
          <p style={{ margin: 0, color: 'var(--ink-muted)' }}>
            No fundraisers match &quot;{searchQuery}&quot;. Try a different search term or view all causes.
          </p>
        </div>
      )}

      {/* Verified Church Outreach Notice */}
      <div
        className="post-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 16px',
          fontSize: '12px',
          color: 'var(--ink-muted)',
          borderRadius: '12px',
        }}
      >
        <ShieldCheck size={20} style={{ color: '#10b981', flexShrink: 0 }} />
        <span>
          Every fundraiser is vetted by registered churches and community stewards. 100% of giving is disbursed directly to ministry project accounts via Safaricom M-Pesa.
        </span>
      </div>

      {/* M-Pesa Payment Modal */}
      {isModalOpen && (
        <MpesaPaymentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          defaultProjectId={selectedProjectId}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}
