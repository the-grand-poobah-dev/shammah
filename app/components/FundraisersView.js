'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
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
  Clock,
  MapPin,
  RefreshCw,
  Wallet,
  AlertCircle,
  ExternalLink,
  Flame,
} from 'lucide-react';
import { playSound } from '../lib/soundEffects';
import {
  ContentLayout,
  AccentCard,
  SectionBlock,
  LayoutSwitcher,
  FilterChips,
  SortMenu,
  StatStrip,
  ProgressBar,
  SkeletonLayout,
  EmptyState,
  ErrorState,
} from './layoutkit';
import {
  COMMUNITY_PROJECTS,
  SAMPLE_FUNDRAISERS,
  listFundraisers,
} from '../lib/data/fundraisersApi';
import FundraiserDonateModal from './fundraisers/FundraiserDonateModal';
import FundraiserCreatorModal from './fundraisers/FundraiserCreatorModal';
import FundraiserShareModal from './fundraisers/FundraiserShareModal';
import FundraiserAdminModal from './fundraisers/FundraiserAdminModal';

export { COMMUNITY_PROJECTS, SAMPLE_FUNDRAISERS };

const CATEGORY_CHIPS = [
  { id: 'All', label: 'All Causes' },
  { id: 'Relief', label: 'Relief & Mercy', icon: '💧' },
  { id: 'Church building', label: 'Church Building', icon: '⛪' },
  { id: 'Medical', label: 'Medical & Health', icon: '🩺' },
  { id: 'Education', label: 'Christian Education', icon: '📚' },
  { id: 'Missions', label: 'Gospel Missions', icon: '🌍' },
  { id: 'Community', label: 'Community Outreach', icon: '🤝' },
];

const SORT_OPTIONS = [
  { id: 'trending', label: 'Trending Givers' },
  { id: 'newest', label: 'Newest First' },
  { id: 'ending_soon', label: 'Ending Soon' },
  { id: 'almost_funded', label: 'Almost Funded' },
  { id: 'goal_asc', label: 'Goal: Low to High' },
  { id: 'goal_desc', label: 'Goal: High to Low' },
];

function ProgressRing({ percent = 0, size = 48, stroke = 4, color = '#10b981' }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, Number(percent || 0)));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="course-progress-ring" style={{ width: size, height: size, position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="course-progress-ring-label" style={{ position: 'absolute', fontSize: '11px', fontWeight: 800, color: 'var(--ink)' }}>
        {clamped}%
      </span>
    </div>
  );
}

export default function FundraisersView({ session, currentUser, openAuth }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Data states
  const [fundraisers, setFundraisers] = useState([]);
  const [urgent, setUrgent] = useState([]);
  const [featured, setFeatured] = useState(null);
  const [trending, setTrending] = useState([]);
  const [nearYou, setNearYou] = useState([]);
  const [myCampaigns, setMyCampaigns] = useState([]);

  // Filtering & controls
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy, setSortBy] = useState('trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [browseLayout, setBrowseLayout] = useState('list-rich'); // list-rich | magazine-flat | compact | rail

  // Active modals
  const [selectedFundraiser, setSelectedFundraiser] = useState(null);
  const [isDonateOpen, setIsDonateOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  const isAdmin = Boolean(
    currentUser?.role === 'platform_admin' ||
    currentUser?.role === 'admin' ||
    currentUser?.badge === 'pastor'
  );

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await listFundraisers({
        category: activeCategory,
        sort: sortBy,
        search: searchQuery,
        userId: currentUser?.id || null,
      });

      setFundraisers(data.fundraisers || []);
      setUrgent(data.urgent || []);
      setFeatured(data.featured || null);
      setTrending(data.trending || []);
      setNearYou(data.nearYou || []);
      setMyCampaigns(data.myCampaigns || []);
    } catch (err) {
      setError(err.message || 'Unable to load Kingdom Fundraisers.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeCategory, sortBy, searchQuery, currentUser?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Statistics for StatStrip
  const statsItems = useMemo(() => {
    const totalRaised = fundraisers.reduce((acc, f) => acc + (Number(f.raised_kes) || 0), 0);
    const totalDonors = fundraisers.reduce((acc, f) => acc + (Number(f.donors_count) || 0), 0);
    return [
      { label: 'Active Causes', value: fundraisers.length, accent: '#10b981' },
      { label: 'Total Raised (KES)', value: `KES ${totalRaised.toLocaleString()}`, accent: '#06b6d4' },
      { label: 'Generous Believers', value: totalDonors.toLocaleString(), accent: '#f59e0b' },
      { label: 'Vetted Verification', value: '100% Direct', accent: '#8b5cf6' },
    ];
  }, [fundraisers]);

  function handleOpenDonate(fundraiser) {
    playSound('reaction');
    setSelectedFundraiser(fundraiser);
    setIsDonateOpen(true);
  }

  function handleOpenShare(fundraiser) {
    playSound('reaction');
    setSelectedFundraiser(fundraiser);
    setIsShareOpen(true);
  }

  return (
    <div className="fundraisers-view-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. HERO BANNER */}
      <div
        className="post-card"
        style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.1) 100%)',
          borderColor: 'rgba(16, 185, 129, 0.35)',
          padding: '22px',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ maxWidth: '580px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '999px', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', fontSize: '11px', fontWeight: 700, marginBottom: '10px' }}>
              <HeartHandshake size={14} />
              <span>Kingdom Missions &amp; Giving Hub</span>
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--ink)' }}>
              Faith in Action: Church &amp; Community Causes
            </h2>
            <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, color: 'var(--ink-muted)' }}>
              Support vetted clean water projects, chapel building, emergency relief, and Christian youth scholarships across Kenya. 100% of giving is disbursed via Safaricom M-Pesa.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => {
                playSound('reaction');
                if (!session && openAuth) openAuth('signin');
                else setIsCreatorOpen(true);
              }}
              style={{
                padding: '10px 18px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
              }}
            >
              <PlusCircle size={16} />
              <span>Start a Campaign</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  playSound('reaction');
                  setIsAdminOpen(true);
                }}
                style={{
                  padding: '9px 14px',
                  borderRadius: '12px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  color: '#f59e0b',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <ShieldCheck size={14} />
                <span>Review Queue</span>
              </button>
            )}

            <button
              type="button"
              className="topbar-toggle-btn"
              onClick={() => fetchData(true)}
              disabled={refreshing}
              title="Refresh Causes"
              style={{ width: 38, height: 38, borderRadius: '12px' }}
            >
              <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
            </button>
          </div>
        </div>

        {/* Stat strip companion */}
        <div style={{ marginTop: '18px' }}>
          <StatStrip items={statsItems} />
        </div>
      </div>

      {/* SKELETON LOADING STATE */}
      {loading && !refreshing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <SkeletonLayout mode="spotlight" count={1} />
          <SkeletonLayout mode="rail" count={3} />
          <SkeletonLayout mode="list-rich" count={4} />
        </div>
      )}

      {/* ERROR STATE */}
      {error && !loading && (
        <ErrorState
          title="Could Not Load Fundraisers"
          message={error}
          onRetry={() => fetchData(false)}
        />
      )}

      {!loading && (
        <>
          {/* 2. FEATURED CAMPAIGN (SPOTLIGHT MODE) */}
          {featured && (
            <SectionBlock
              title="Featured Mission"
              subtitle="Special priority initiative backed by pastoral stewards"
              accent="#10b981"
            >
              <ContentLayout mode="spotlight" accent={featured.accent || '#10b981'}>
                <AccentCard
                  accent={featured.accent || '#10b981'}
                  variant="wash"
                  interactive
                  onClick={() => {}}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', padding: '16px' }}>
                    {featured.cover_url && (
                      <div style={{ borderRadius: '14px', overflow: 'hidden', height: 240, position: 'relative' }}>
                        <img
                          src={featured.cover_url}
                          alt={featured.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div style={{ position: 'absolute', top: 12, left: 12, padding: '4px 10px', borderRadius: '999px', background: 'rgba(0,0,0,0.65)', color: '#ffffff', fontSize: '11px', fontWeight: 700, backdropFilter: 'blur(4px)' }}>
                          {featured.category}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#10b981', fontWeight: 600, marginBottom: '6px' }}>
                          <ShieldCheck size={14} />
                          <span>Verified Ministry Initiative · {featured.location || 'Kenya'}</span>
                        </div>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 800, color: 'var(--ink)', lineHeight: 1.3 }}>
                          {featured.title}
                        </h3>
                        <p style={{ margin: '0 0 14px 0', fontSize: '13px', lineHeight: 1.5, color: 'var(--ink-muted)' }}>
                          {featured.story_md?.slice(0, 190)}...
                        </p>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--ink)' }}>
                            KES {(Number(featured.raised_kes) || 0).toLocaleString()}
                          </span>
                          <span style={{ color: 'var(--ink-muted)' }}>
                            {Math.min(100, Math.round(((Number(featured.raised_kes) || 0) / (Number(featured.goal_kes) || 1)) * 100))}% of KES {(Number(featured.goal_kes) || 0).toLocaleString()}
                          </span>
                        </div>

                        <ProgressBar
                          progress={Math.min(100, Math.round(((Number(featured.raised_kes) || 0) / (Number(featured.goal_kes) || 1)) * 100))}
                          color={featured.accent || '#10b981'}
                          size="md"
                        />

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', fontSize: '12px', color: 'var(--ink-muted)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Users size={13} />
                            <span>{featured.donors_count || 0} givers</span>
                          </span>

                          <Link
                            href={`/fundraisers/${featured.id}`}
                            style={{ color: 'var(--teal)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <span>Read Full Story</span>
                            <ArrowRight size={13} />
                          </Link>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenDonate(featured)}
                            style={{
                              flex: 1,
                              padding: '11px',
                              borderRadius: '10px',
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              color: '#fff',
                              fontWeight: 700,
                              fontSize: '13px',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                            }}
                          >
                            <Coins size={15} />
                            <span>Give via M-Pesa</span>
                          </button>

                          <button
                            type="button"
                            className="topbar-toggle-btn"
                            onClick={() => handleOpenShare(featured)}
                            aria-label="Share featured"
                            style={{ width: 40, height: 40, borderRadius: '10px' }}
                          >
                            <Share2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </AccentCard>
              </ContentLayout>
            </SectionBlock>
          )}

          {/* 3. URGENT AND ENDING SOON (RAIL MODE WITH PROGRESS RINGS) */}
          {urgent.length > 0 && (
            <SectionBlock
              title="Urgent &amp; Ending Soon"
              subtitle="Time-sensitive needs closing within the next few days"
              accent="#ef4444"
            >
              <ContentLayout mode="rail" accent="#ef4444">
                {urgent.map((camp) => {
                  const pct = Math.min(100, Math.round(((Number(camp.raised_kes) || 0) / (Number(camp.goal_kes) || 1)) * 100));
                  return (
                    <AccentCard
                      key={camp.id}
                      accent={camp.accent || '#ef4444'}
                      variant="edge"
                      interactive
                      onClick={() => {}}
                    >
                      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', gap: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase' }}>
                              {camp.category}
                            </span>
                            <ProgressRing percent={pct} size={42} stroke={3.5} color={camp.accent || '#ef4444'} />
                          </div>

                          <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 700, color: 'var(--ink)', lineHeight: 1.35 }}>
                            <Link href={`/fundraisers/${camp.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                              {camp.title}
                            </Link>
                          </h4>

                          <span style={{ fontSize: '11px', color: 'var(--ink-muted)', display: 'block' }}>
                            Goal: KES {(Number(camp.goal_kes) || 0).toLocaleString()}
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenDonate(camp)}
                            style={{
                              flex: 1,
                              padding: '8px',
                              borderRadius: '8px',
                              background: '#ef4444',
                              color: '#fff',
                              fontWeight: 700,
                              fontSize: '12px',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                            }}
                          >
                            <Coins size={13} />
                            <span>Donate</span>
                          </button>

                          <Link
                            href={`/fundraisers/${camp.id}`}
                            className="topbar-toggle-btn"
                            style={{ width: 34, height: 34, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
                          >
                            <ArrowRight size={14} />
                          </Link>
                        </div>
                      </div>
                    </AccentCard>
                  );
                })}
              </ContentLayout>
            </SectionBlock>
          )}

          {/* 4. TRENDING CAUSES (MAGAZINE-FLAT MODE) */}
          {trending.length > 0 && (
            <SectionBlock
              title="Trending Faith Projects"
              subtitle="Causes inspiring the widest support this week"
              accent="#f59e0b"
            >
              <ContentLayout mode="magazine-flat" accent="#f59e0b">
                {trending.map((camp) => {
                  const pct = Math.min(100, Math.round(((Number(camp.raised_kes) || 0) / (Number(camp.goal_kes) || 1)) * 100));
                  return (
                    <AccentCard
                      key={camp.id}
                      accent={camp.accent || '#f59e0b'}
                      variant="wash"
                      interactive
                      onClick={() => {}}
                    >
                      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: camp.accent || '#f59e0b' }}>
                            {camp.category}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                            {camp.donors_count || 0} donors
                          </span>
                        </div>

                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>
                          <Link href={`/fundraisers/${camp.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                            {camp.title}
                          </Link>
                        </h4>

                        <ProgressBar progress={pct} color={camp.accent || '#f59e0b'} size="sm" />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)' }}>
                            KES {(Number(camp.raised_kes) || 0).toLocaleString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenDonate(camp)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              background: 'var(--teal)',
                              color: '#fff',
                              border: 'none',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Give
                          </button>
                        </div>
                      </div>
                    </AccentCard>
                  );
                })}
              </ContentLayout>
            </SectionBlock>
          )}

          {/* 5. NEAR YOU / LOCAL CHURCHES (MAGAZINE-X2 MODE) */}
          {nearYou.length > 0 && (
            <SectionBlock
              title="Near You &amp; Church Fellowships"
              subtitle="Community needs grounded in local assemblies"
              accent="#06b6d4"
            >
              <ContentLayout mode="magazine-x2" accent="#06b6d4">
                {nearYou.map((camp) => (
                  <AccentCard
                    key={camp.id}
                    accent={camp.accent || '#06b6d4'}
                    variant="minimal"
                    interactive
                    onClick={() => {}}
                  >
                    <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--ink-muted)' }}>
                        <Building2 size={12} />
                        <span>{camp.church?.name || camp.beneficiary_name || 'Community Church'}</span>
                      </div>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>
                        <Link href={`/fundraisers/${camp.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                          {camp.title}
                        </Link>
                      </h4>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '6px' }}>
                        <span style={{ color: '#10b981', fontWeight: 600 }}>
                          KES {(Number(camp.raised_kes) || 0).toLocaleString()}
                        </span>
                        <span style={{ color: 'var(--ink-muted)' }}>
                          of KES {(Number(camp.goal_kes) || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </AccentCard>
                ))}
              </ContentLayout>
            </SectionBlock>
          )}

          {/* 6. ALL CAMPAIGNS (WITH SEARCH, CHIPS, SORT & LAYOUT SWITCHER) */}
          <SectionBlock
            title="Browse All Kingdom Causes"
            subtitle="Search and filter causes by cause category or urgency"
            accent="#8b5cf6"
            action={
              <LayoutSwitcher
                current={browseLayout}
                onChange={(l) => {
                  playSound('reaction');
                  setBrowseLayout(l);
                }}
                modes={['list-rich', 'magazine-flat', 'compact']}
              />
            }
          >
            {/* Search and Filters Bar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                  }}
                >
                  <Search size={16} style={{ color: 'var(--ink-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search causes by title, church, county, or beneficiary..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--ink)',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      style={{ background: 'none', border: 'none', color: 'var(--ink-muted)', cursor: 'pointer', fontSize: '11px' }}
                    >
                      Clear
                    </button>
                  )}
                </div>

                <SortMenu
                  value={sortBy}
                  onChange={(v) => {
                    playSound('reaction');
                    setSortBy(v);
                  }}
                  options={SORT_OPTIONS}
                />
              </div>

              {/* Category Chips */}
              <FilterChips
                options={CATEGORY_CHIPS}
                selected={activeCategory}
                onChange={(cat) => {
                  playSound('reaction');
                  setActiveCategory(cat);
                }}
              />
            </div>

            {/* Fundraiser Items in Chosen Layout */}
            {fundraisers.length > 0 ? (
              <ContentLayout mode={browseLayout} accent="#8b5cf6">
                {fundraisers.map((proj) => {
                  const pct = Math.min(100, Math.round(((Number(proj.raised_kes) || 0) / (Number(proj.goal_kes) || 1)) * 100));

                  return (
                    <AccentCard
                      key={proj.id}
                      accent={proj.accent || '#8b5cf6'}
                      variant={browseLayout === 'compact' ? 'minimal' : 'wash'}
                      interactive
                      onClick={() => {}}
                    >
                      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: proj.accent || '#10b981', textTransform: 'uppercase' }}>
                              {proj.category}
                            </span>
                            {proj.location && (
                              <span style={{ fontSize: '11px', color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <MapPin size={11} />
                                <span>{proj.location}</span>
                              </span>
                            )}
                          </div>

                          <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 700, color: 'var(--ink)', lineHeight: 1.35 }}>
                            <Link href={`/fundraisers/${proj.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                              {proj.title}
                            </Link>
                          </h3>

                          {browseLayout !== 'compact' && (
                            <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'var(--ink-muted)', lineHeight: 1.5 }}>
                              {proj.story_md?.slice(0, 130)}...
                            </p>
                          )}
                        </div>

                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                            <span style={{ fontWeight: 700, color: 'var(--ink)' }}>
                              KES {(Number(proj.raised_kes) || 0).toLocaleString()}
                            </span>
                            <span style={{ color: 'var(--ink-muted)' }}>
                              {pct}% of KES {(Number(proj.goal_kes) || 0).toLocaleString()}
                            </span>
                          </div>

                          <ProgressBar progress={pct} color={proj.accent || '#10b981'} size="sm" />

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenDonate(proj)}
                              style={{
                                flex: 1,
                                padding: '9px',
                                borderRadius: '10px',
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: '#ffffff',
                                border: 'none',
                                fontWeight: 700,
                                fontSize: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                              }}
                            >
                              <Coins size={14} />
                              <span>Give via M-Pesa</span>
                            </button>

                            <button
                              type="button"
                              className="topbar-toggle-btn"
                              onClick={() => handleOpenShare(proj)}
                              aria-label="Share cause"
                              style={{ width: 36, height: 36, borderRadius: '10px' }}
                            >
                              <Share2 size={14} />
                            </button>

                            <Link
                              href={`/fundraisers/${proj.id}`}
                              className="topbar-toggle-btn"
                              style={{ width: 36, height: 36, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
                              aria-label="View cause details"
                            >
                              <ArrowRight size={14} />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </AccentCard>
                  );
                })}
              </ContentLayout>
            ) : (
              <EmptyState
                icon={Search}
                title="No Fundraisers Match Your Search"
                message="Try adjusting your cause category or search query to find community causes."
                actionLabel="View All Causes"
                onAction={() => {
                  setActiveCategory('All');
                  setSearchQuery('');
                }}
              />
            )}
          </SectionBlock>

          {/* 7. MY CAMPAIGNS (COMPACT MODE) */}
          {myCampaigns.length > 0 && (
            <SectionBlock
              title="My Campaigns"
              subtitle="Fundraisers you created and are stewarding"
              accent="#f59e0b"
            >
              <ContentLayout mode="compact" accent="#f59e0b">
                {myCampaigns.map((camp) => (
                  <AccentCard key={camp.id} accent="#f59e0b" variant="minimal">
                    <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>
                          <Link href={`/fundraisers/${camp.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                            {camp.title}
                          </Link>
                        </h4>
                        <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                          Raised: KES {(Number(camp.raised_kes) || 0).toLocaleString()} · Status: {camp.status}
                        </span>
                      </div>
                      <Link
                        href={`/fundraisers/${camp.id}`}
                        style={{ padding: '6px 12px', borderRadius: '8px', background: 'var(--surface-sunken)', color: 'var(--teal)', fontSize: '11px', fontWeight: 600, textDecoration: 'none' }}
                      >
                        Manage
                      </Link>
                    </div>
                  </AccentCard>
                ))}
              </ContentLayout>
            </SectionBlock>
          )}
        </>
      )}

      {/* Trust & Safety Disclaimer */}
      <div
        className="post-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 18px',
          fontSize: '12px',
          color: 'var(--ink-muted)',
          borderRadius: '14px',
          background: 'var(--surface-sunken)',
          border: '1px solid var(--border)',
        }}
      >
        <ShieldCheck size={20} style={{ color: '#10b981', flexShrink: 0 }} />
        <span>
          Every Shammah campaign is governed under church community stewardship guidelines. 100% of donations are credited directly to ministry causes via Safaricom M-Pesa.
        </span>
      </div>

      {/* Donate Modal */}
      {isDonateOpen && selectedFundraiser && (
        <FundraiserDonateModal
          isOpen={isDonateOpen}
          onClose={() => setIsDonateOpen(false)}
          fundraiser={selectedFundraiser}
          currentUser={currentUser}
          onSuccess={() => {
            fetchData(true);
          }}
        />
      )}

      {/* Share Modal */}
      {isShareOpen && selectedFundraiser && (
        <FundraiserShareModal
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          fundraiser={selectedFundraiser}
        />
      )}

      {/* Creator Modal */}
      {isCreatorOpen && (
        <FundraiserCreatorModal
          isOpen={isCreatorOpen}
          onClose={() => setIsCreatorOpen(false)}
          currentUser={currentUser}
          onCreated={() => {
            fetchData(true);
          }}
        />
      )}

      {/* Admin Review Modal */}
      {isAdminOpen && (
        <FundraiserAdminModal
          isOpen={isAdminOpen}
          onClose={() => setIsAdminOpen(false)}
          onActionCompleted={() => {
            fetchData(true);
          }}
        />
      )}
    </div>
  );
}
