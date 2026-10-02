'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Compass,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Bell,
  Lock,
  Heart,
  HelpCircle,
  LogOut,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  CreditCard,
  Gift,
  Coffee,
  Check,
  ExternalLink,
  Church,
  User,
  Sliders,
  Share2,
} from 'lucide-react';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import { CATEGORY_STYLES } from '../lib/postDisplay';
import { isSoundEnabled, setSoundEnabled, playSound } from '../lib/soundEffects';

const DONATION_TIERS = [
  { id: 'tier-5', amount: 5, title: 'Seed of Faith', desc: 'Sponsors 100 Gospel push alerts & cloud hosting', icon: Coffee },
  { id: 'tier-15', amount: 15, title: 'Kingdom Builder', desc: 'Supplies 1 month of sermon audio & media bandwidth', icon: Gift },
  { id: 'tier-50', amount: 50, title: 'Mission Sponsor', desc: 'Funds discipleship courses and church outreach', icon: Heart },
];

const FAITH_FAQS = [
  {
    q: 'How does 24-Hour Status work on Shammah?',
    a: 'Status stories let fellowship members share daily testimonies, scripture tags, prayers, and photo moments. Each story expires automatically after 24 hours, keeping the community fresh and authentic.',
  },
  {
    q: 'Is the messaging system really End-to-End Encrypted?',
    a: 'Yes. Direct messages and status story replies are encrypted with client-side keys (AES-256-GCM). Only you and the recipient can read the contents of your conversations.',
  },
  {
    q: 'How do church pastors and administrators get verified?',
    a: 'Pastors and ministry leaders can create or claim a church profile under the Churches tab. Platform admins verify identity and assign official pastoral badges.',
  },
  {
    q: 'Can I share audio sermons, podcasts, and Bible lessons?',
    a: 'Absolutely! You can upload audio files, record voice notes, or link RSS podcasts and video testimonies in the Audio and Videos sections.',
  },
  {
    q: 'How do I support or contact the app developer?',
    a: 'Shammah is actively maintained by Julius Thandi. You can donate via the developer blessing fund below or reach out directly at juliusthandi003@gmail.com.',
  },
];

export default function ExploreView({ session, profile, dark, setDark, onSignOut, openAuth, onSelectCategory }) {
  const router = useRouter();
  const [soundOn, setSoundOn] = useState(true);
  const [selectedTier, setSelectedTier] = useState('tier-15');
  const [customAmount, setCustomAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [donated, setDonated] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  useEffect(() => {
    setSoundOn(isSoundEnabled());
  }, []);

  function handleToggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) playSound('alert');
  }

  function handleDonate(e) {
    e.preventDefault();
    setDonated(true);
    playSound('postPublished');
    setTimeout(() => setDonated(false), 5000);
  }

  function handleCategoryClick(catId) {
    if (onSelectCategory) {
      onSelectCategory(catId);
    } else {
      router.push(`/?category=${catId}`);
    }
  }

  const activeAmount = customAmount ? Number(customAmount) : DONATION_TIERS.find((t) => t.id === selectedTier)?.amount || 15;

  return (
    <div className="explore-shell">
      {/* Top Header */}
      <div className="explore-header">
        <div className="explore-header-left">
          <div className="explore-title-row">
            <span className="explore-icon-box">
              <Compass size={22} className="explore-compass-icon" />
            </span>
            <h2>Explore &amp; App Settings</h2>
          </div>
          <p className="explore-subtext">
            Discover fellowship categories, configure your app experience, support development, and find answers.
          </p>
        </div>
      </div>

      {/* Account Profile Card */}
      <div className="explore-profile-card">
        <div className="explore-profile-left">
          <Avatar
            name={profile?.display_name || session?.user?.email || 'Guest Member'}
            src={profile?.avatar_url}
            className="avatar-lg"
          />
          <div className="explore-profile-meta">
            <div className="explore-name-row">
              <h3>{profile?.display_name || session?.user?.email || 'Guest Member'}</h3>
              {profile?.badge && <VerifiedBadge badge={profile.badge} size={15} />}
            </div>
            <span className="explore-role-tag">{profile?.role || 'Christian Fellowship Member'}</span>
            <span className="explore-email-sub">{session?.user?.email || 'Sign in to sync your church preferences'}</span>
          </div>
        </div>

        <div className="explore-profile-actions">
          {session ? (
            <>
              <Link href="/profile" className="explore-profile-link-btn">
                <User size={15} />
                <span>My Profile</span>
              </Link>
              <button type="button" className="explore-logout-btn" onClick={onSignOut}>
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <button type="button" className="explore-signin-btn" onClick={() => openAuth?.('signin')}>
              <span>Sign In / Sign Up</span>
            </button>
          )}
        </div>
      </div>

      {/* Application Settings Section */}
      <div className="explore-section">
        <div className="explore-section-header">
          <Sliders size={18} className="sec-icon" />
          <h3>Application Preferences</h3>
        </div>

        <div className="explore-settings-grid">
          {/* Dark / Light Theme Toggle */}
          <div className="explore-setting-card">
            <div className="setting-card-left">
              <span className="setting-icon-wrap theme-icon">
                {dark ? <Moon size={18} /> : <Sun size={18} />}
              </span>
              <div>
                <strong>Theme Display</strong>
                <p>{dark ? 'Dark Neon Glass Mode' : 'Clean Light Gold Mode'}</p>
              </div>
            </div>
            <button
              type="button"
              className={`theme-toggle-switch${dark ? ' is-dark' : ''}`}
              onClick={() => {
                setDark(!dark);
                playSound('reaction');
              }}
              title="Toggle Dark / Light Theme"
            >
              <span className="switch-knob" />
            </button>
          </div>

          {/* Sound Profiles Toggle */}
          <div className="explore-setting-card">
            <div className="setting-card-left">
              <span className="setting-icon-wrap sound-icon">
                {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </span>
              <div>
                <strong>Faith Sound Profiles</strong>
                <p>{soundOn ? 'Interactive chimes & audio active' : 'All app sounds muted'}</p>
              </div>
            </div>
            <div className="setting-actions-right">
              <button
                type="button"
                className={`theme-toggle-switch${soundOn ? ' is-dark' : ''}`}
                onClick={handleToggleSound}
                title="Toggle Sound Effects"
              >
                <span className="switch-knob" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Category Explorer Grid (Excludes FAQ, since FAQ has dedicated section) */}
      <div className="explore-section">
        <div className="explore-section-header">
          <Sparkles size={18} className="sec-icon" />
          <h3>Browse Community by Category</h3>
        </div>
        <p className="explore-sec-desc">
          Click any category below to immediately explore prayers, testimonies, sermons, and discussions.
        </p>

        <div className="explore-cat-grid">
          {Object.entries(CATEGORY_STYLES).map(([id, c]) => (
            <button
              key={id}
              type="button"
              className="explore-cat-card"
              style={{ '--cat-accent': c.accent, '--cat-soft': c.soft, '--cat-text': c.text }}
              onClick={() => handleCategoryClick(id)}
            >
              <span className="explore-cat-dot" />
              <strong className="explore-cat-name">{c.label}</strong>
              <span className="explore-cat-explore-link">Explore →</span>
            </button>
          ))}
        </div>
      </div>

      {/* Fundraising & Developer Blessing Center */}
      <div className="explore-section">
        <div className="explore-donate-card">
          <div className="donate-header">
            <div className="donate-badge">
              <Heart size={14} className="donate-heart-icon" />
              <span>Kingdom Tech Ministry Fund</span>
            </div>
            <h3>Support Shammah &amp; Developers</h3>
            <p>
              Shammah is built with dedication by Julius Thandi to connect churches and believers worldwide.
              Your support powers cloud media servers, encrypted messaging, and missionary outreach.
            </p>
          </div>

          {/* Progress Goal */}
          <div className="donate-goal-wrap">
            <div className="donate-goal-meta">
              <span>Goal: $10,000 Annual Server &amp; Gospel Outreach</span>
              <strong>$4,850 Raised (48%)</strong>
            </div>
            <div className="donate-progress-bar">
              <div className="donate-progress-fill" style={{ width: '48%' }} />
            </div>
          </div>

          {/* Tiers */}
          <div className="donate-tiers-grid">
            {DONATION_TIERS.map((tier) => {
              const Icon = tier.icon;
              const isSelected = selectedTier === tier.id && !customAmount;
              return (
                <button
                  key={tier.id}
                  type="button"
                  className={`donate-tier-card${isSelected ? ' active' : ''}`}
                  onClick={() => {
                    setSelectedTier(tier.id);
                    setCustomAmount('');
                  }}
                >
                  <Icon size={18} className="tier-icon" />
                  <span className="tier-amount">${tier.amount}</span>
                  <strong className="tier-title">{tier.title}</strong>
                  <p className="tier-desc">{tier.desc}</p>
                </button>
              );
            })}
          </div>

          {/* Custom Amount & Payment Method */}
          <form className="donate-form" onSubmit={handleDonate}>
            <div className="donate-input-row">
              <span className="currency-prefix">$</span>
              <input
                type="number"
                min="1"
                placeholder="Or enter custom blessing amount…"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="donate-amount-input"
              />
            </div>

            <div className="donate-methods-row">
              {['card', 'mpesa', 'crypto', 'paypal'].map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`donate-method-chip${paymentMethod === m ? ' active' : ''}`}
                  onClick={() => setPaymentMethod(m)}
                >
                  {m === 'card' && 'Credit Card / Apple Pay'}
                  {m === 'mpesa' && 'M-Pesa / Mobile'}
                  {m === 'crypto' && 'Crypto (USDT/BTC)'}
                  {m === 'paypal' && 'PayPal'}
                </button>
              ))}
            </div>

            <button type="submit" className="donate-submit-btn">
              <Heart size={16} />
              <span>Bless Shammah with ${activeAmount}</span>
            </button>

            {donated && (
              <div className="donate-success-banner">
                <Check size={18} />
                <span>
                  Thank you abundantly! &ldquo;God is able to bless you abundantly, so that in all things you will abound.&rdquo; — 2 Cor 9:8
                </span>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Comprehensive FAQ Section */}
      <div className="explore-section">
        <div className="explore-section-header">
          <HelpCircle size={18} className="sec-icon" />
          <h3>Frequently Asked Questions (FAQ)</h3>
        </div>

        <div className="explore-faq-accordion">
          {FAITH_FAQS.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div key={idx} className={`faq-item${isOpen ? ' open' : ''}`}>
                <button
                  type="button"
                  className="faq-question-btn"
                  onClick={() => setOpenFaqIndex(isOpen ? -1 : idx)}
                >
                  <span>{faq.q}</span>
                  <ChevronDown size={16} className={`faq-chevron${isOpen ? ' open' : ''}`} />
                </button>
                {isOpen && (
                  <div className="faq-answer">
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Info & Developer Contact */}
      <div className="explore-footer">
        <p>Shammah Christian Fellowship Platform · Built with faith &amp; devotion</p>
        <p className="developer-tag">
          Lead Engineer: <strong>Julius Thandi</strong> · Nairobi, Kenya
        </p>
      </div>
    </div>
  );
}
