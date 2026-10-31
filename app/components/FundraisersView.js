'use client';
import { useState, useEffect } from 'react';
import {
  Coins,
  Heart,
  Users,
  Target,
  Clock,
  Sparkles,
  Share2,
  Plus,
  Church,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import Avatar from './Avatar';
import MemberName from './MemberName';
import VerifiedBadge from './VerifiedBadge';
import { playSound } from '../lib/soundEffects';
import {
  ContentLayout,
  AccentCard,
  SectionBlock,
  LayoutSwitcher,
  FilterChips,
  ProgressBar,
  StatStrip,
  EmptyState,
} from './layoutkit';
import { useLayoutMode } from '../lib/useLayoutMode';
import MpesaPaymentModal from './MpesaPaymentModal';
import WatermarkShareModal from './WatermarkShareModal';
import { supabase } from '../lib/supabaseClient';

export const SAMPLE_FUNDRAISERS = [
  {
    id: 'fund-1',
    title: 'Kibera Youth Outreach & Food Pantry Expansion',
    description: 'Providing weekly nutritional packs, bibles, and mentorship for 350 vulnerable children in Nairobi.',
    category: 'Community Food Drive',
    target_kes: 750000,
    raised_kes: 524000,
    donors_count: 142,
    days_left: 14,
    accent: '#10b981',
    cover_url: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600',
    organizer: {
      id: 'org-1',
      name: 'Nairobi Harvest Missions',
      avatar: 'https://images.unsplash.com/photo-1548625361-195fe57876a3?w=150',
      badge: 'church_official',
      verified: true,
      city: 'Nairobi',
    },
  },
  {
    id: 'fund-2',
    title: 'Mombasa Sanctuary Roof & Sound Gear Restoration',
    description: 'Rebuilding storm-damaged sanctuary roofing and sound equipment for Sunday bilingual community services.',
    category: 'Church Building',
    target_kes: 1200000,
    raised_kes: 890000,
    donors_count: 218,
    days_left: 21,
    accent: '#06b6d4',
    cover_url: 'https://images.unsplash.com/photo-1519491050282-cf00c82424b4?w=600',
    organizer: {
      id: 'org-2',
      name: 'Grace Chapel Coast',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      badge: 'pastor',
      verified: true,
      city: 'Mombasa',
    },
  },
  {
    id: 'fund-3',
    title: 'Turkana Clean Water Well Drilling Mission',
    description: 'Solar-powered borehole providing sustainable drinking water and solar lighting for remote pastoral villages.',
    category: 'Missions & Outreach',
    target_kes: 2400000,
    raised_kes: 1850000,
    donors_count: 360,
    days_left: 30,
    accent: '#f59e0b',
    cover_url: 'https://images.unsplash.com/photo-1541252260730-0412e8e2108e?w=600',
    organizer: {
      id: 'org-3',
      name: 'Kingdom Water Initiative Kenya',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      badge: 'missionary',
      verified: true,
      city: 'Lodwar',
    },
  },
  {
    id: 'fund-4',
    title: 'Annual Youth Camp & Discipleship Leadership Retreat',
    description: 'Full sponsorship for 120 secondary and university students attending the annual faith and tech leadership camp.',
    category: 'Youth Ministry',
    target_kes: 450000,
    raised_kes: 310000,
    donors_count: 89,
    days_left: 9,
    accent: '#8b5cf6',
    cover_url: 'https://images.unsplash.com/photo-1526976668912-1a811878dd37?w=600',
    organizer: {
      id: 'org-4',
      name: 'Gen-Z Revival Hub Nairobi',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      badge: 'youth_pastor',
      verified: true,
      city: 'Nairobi',
    },
  },
];

const FUNDRAISER_CATEGORIES = [
  'All Projects',
  'Church Building',
  'Community Food Drive',
  'Missions & Outreach',
  'Youth Ministry',
];

export default function FundraisersView({ session, currentUser, openAuth }) {
  const [layoutMode, setLayoutMode] = useLayoutMode('fundraisers', 'magazine-x2');
  const [activeCategory, setActiveCategory] = useState('All Projects');
  const [fundraisers, setFundraisers] = useState(SAMPLE_FUNDRAISERS);
  const [selectedForPayment, setSelectedForPayment] = useState(null);
  const [selectedForShare, setSelectedForShare] = useState(null);

  // Filter items
  const filteredItems = fundraisers.filter((f) => {
    if (activeCategory === 'All Projects') return true;
    return f.category === activeCategory;
  });

  const totalRaised = fundraisers.reduce((acc, f) => acc + (f.raised_kes || 0), 0);
  const totalDonors = fundraisers.reduce((acc, f) => acc + (f.donors_count || 0), 0);

  return (
    <div className="section-feed-view fundraisers-view-container">
      {/* Hero Banner */}
      <div className="section-hero-card" style={{ '--hero-accent': '#10b981' }}>
        <div className="section-hero-content">
          <div className="hero-kicker">
            <Coins size={16} className="text-emerald-400" />
            <span>Kingdom Giving &amp; Missions · Safaricom M-Pesa</span>
          </div>
          <h1 className="section-hero-title">Support Faith &amp; Community Missions</h1>
          <p className="section-hero-desc">
            Direct, transparent giving towards church projects, clean water wells, feeding initiatives, and gospel outreach across Kenya.
          </p>
        </div>

        {/* Global Statistics Strip */}
        <StatStrip
          stats={[
            { label: 'Total Kingdom Giving', value: `KES ${(totalRaised / 1000).toFixed(0)}k`, icon: Coins, accent: '#10b981' },
            { label: 'Active Contributors', value: `${totalDonors}`, icon: Users, accent: '#06b6d4' },
            { label: 'Verified Missions', value: `${fundraisers.length}`, icon: Church, accent: '#f59e0b' },
          ]}
        />
      </div>

      {/* Filters and Layout Switcher Bar */}
      <div className="section-toolbar-row">
        <FilterChips
          chips={FUNDRAISER_CATEGORIES}
          activeId={activeCategory}
          onSelect={setActiveCategory}
        />
        <LayoutSwitcher
          value={layoutMode}
          onChange={setLayoutMode}
          storageKey="shammah_layout_fundraisers"
        />
      </div>

      {/* Fundraiser Cards Grid / List */}
      <ContentLayout
        layout={layoutMode}
        accent="#10b981"
        items={filteredItems}
        emptyState={
          <EmptyState
            icon={Target}
            title="No fundraisers found"
            description="There are currently no projects matching this category."
            accent="#10b981"
          />
        }
        renderItem={(item) => {
          const percent = Math.min(100, Math.round((item.raised_kes / item.target_kes) * 100));

          return (
            <AccentCard
              key={item.id}
              accent={item.accent || '#10b981'}
              variant="wash"
              className="fundraiser-item-card"
            >
              {/* Media Preview Box */}
              <div className="fundraiser-media-wrap aspect-16-9">
                <img
                  src={item.cover_url}
                  alt={item.title}
                  className="fundraiser-cover-img"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                <span className="fundraiser-category-badge">{item.category}</span>
                <span className="fundraiser-days-left">
                  <Clock size={12} />
                  <span>{item.days_left} days left</span>
                </span>
              </div>

              {/* Card Body */}
              <div className="fundraiser-card-body">
                <div className="fundraiser-organizer-line">
                  <Avatar src={item.organizer.avatar} name={item.organizer.name} size="sm" />
                  <span className="organizer-name">{item.organizer.name}</span>
                  {item.organizer.verified && <VerifiedBadge />}
                </div>

                <h3 className="fundraiser-title">{item.title}</h3>
                <p className="fundraiser-desc">{item.description}</p>

                {/* Progress Indicator */}
                <div className="fundraiser-progress-section">
                  <ProgressBar value={item.raised_kes} max={item.target_kes} accent={item.accent || '#10b981'} />
                  <div className="fundraiser-numbers-row">
                    <div>
                      <strong className="raised-amount">KES {item.raised_kes.toLocaleString()}</strong>
                      <span className="target-amount"> of KES {item.target_kes.toLocaleString()}</span>
                    </div>
                    <span className="percent-text">{percent}% funded</span>
                  </div>
                </div>

                {/* Actions: Give via M-Pesa & Share */}
                <div className="fundraiser-actions-row">
                  <button
                    type="button"
                    className="fundraiser-give-btn"
                    onClick={() => {
                      playSound('pop');
                      setSelectedForPayment({
                        id: item.id,
                        name: item.title,
                        raisedKes: item.raised_kes,
                        targetKes: item.target_kes,
                        icon: '🌿',
                      });
                    }}
                    style={{ background: item.accent || '#10b981' }}
                  >
                    <Coins size={16} />
                    <span>Give via M-Pesa</span>
                  </button>

                  <button
                    type="button"
                    className="fundraiser-share-btn"
                    onClick={() => {
                      playSound('reaction');
                      setSelectedForShare(item);
                    }}
                    aria-label="Share fundraiser"
                  >
                    <Share2 size={16} />
                  </button>
                </div>
              </div>
            </AccentCard>
          );
        }}
      />

      {/* Safaricom M-Pesa Payment Sheet Modal */}
      {selectedForPayment && (
        <MpesaPaymentModal
          project={selectedForPayment}
          onClose={() => setSelectedForPayment(null)}
          onSuccess={() => {
            playSound('success');
            setSelectedForPayment(null);
          }}
        />
      )}

      {/* Watermark Share Modal */}
      {selectedForShare && (
        <WatermarkShareModal
          post={{
            id: selectedForShare.id,
            text_content: `${selectedForShare.title} — Supporting ${selectedForShare.organizer.name}`,
            author: { display_name: selectedForShare.organizer.name },
          }}
          onClose={() => setSelectedForShare(null)}
        />
      )}
    </div>
  );
}
