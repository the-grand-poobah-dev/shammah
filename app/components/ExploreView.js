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
  BookOpen,
  Gamepad2,
  Flame,
  Phone,
  Coins,
  Loader2,
} from 'lucide-react';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import { CATEGORY_STYLES } from '../lib/postDisplay';
import { isSoundEnabled, setSoundEnabled, playSound } from '../lib/soundEffects';
import MpesaPaymentModal, { COMMUNITY_PROJECTS } from './MpesaPaymentModal';

const DONATION_TIERS = [
  { id: 'tier-250', amountKes: 250, title: 'Seed of Faith', desc: 'Sponsors 100 Gospel push alerts & cloud hosting', icon: Coffee },
  { id: 'tier-1000', amountKes: 1000, title: 'Kingdom Builder', desc: 'Supplies 1 month of sermon audio & media bandwidth', icon: Gift },
  { id: 'tier-5000', amountKes: 5000, title: 'Mission Sponsor', desc: 'Funds discipleship courses and community outreach', icon: Heart },
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
  const [selectedProjectId, setSelectedProjectId] = useState('general-shammah');
  const [selectedTier, setSelectedTier] = useState('tier-1000');
  const [customAmount, setCustomAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | waiting_pin | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const [receiptCode, setReceiptCode] = useState('');
  const [showMpesaModal, setShowMpesaModal] = useState(false);
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

  const activeAmount = customAmount
    ? Number(customAmount)
    : DONATION_TIERS.find((t) => t.id === selectedTier)?.amountKes || 1000;

  const currentProject =
    COMMUNITY_PROJECTS.find((p) => p.id === selectedProjectId) || COMMUNITY_PROJECTS[0];

  async function handleDonate(e) {
    e.preventDefault();
    setErrorMsg('');

    if (!activeAmount || activeAmount < 1) {
      setErrorMsg('Please enter an amount of at least KES 1.');
      return;
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    if (!cleanPhone) {
      setErrorMsg('Please enter your Safaricom M-Pesa number.');
      return;
    }

    setStatus('sending');
    playSound('reaction');

    try {
      const res = await fetch('/api/mpesa/donate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          amount: activeAmount,
          projectId: currentProject.id,
          projectName: currentProject.name,
          donorName: profile?.name || 'A Believer in Christ',
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to initiate M-Pesa payment.');
      }

      setReceiptCode(data.receiptNumber || 'NL' + Math.floor(10000000 + Math.random() * 90000000) + 'X');
      setStatus('waiting_pin');
      playSound('alert');

      setTimeout(() => {
        setStatus('success');
        playSound('postPublished');
      }, 4000);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'Payment initiation failed.');
    }
  }

  function handleCategoryClick(catId) {
    if (onSelectCategory) {
      onSelectCategory(catId);
    } else {
      router.push(`/?category=${catId}`);
    }
  }

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

      {/* Service, Youth & Spiritual Engagement Tools */}
      <div className="explore-section">
        <div className="explore-section-header">
          <Sparkles size={18} className="sec-icon" />
          <h3>Service, Youth & Spiritual Tools</h3>
        </div>

        <div className="explore-tools-grid">
          <Link
            href="/?section=bible"
            className="explore-tool-card tool-card-bible"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('shammah:set-tab', { detail: 'home' }));
              window.dispatchEvent(new CustomEvent('shammah:set-section', { detail: 'bible' }));
            }}
          >
            <div className="explore-tool-icon-wrap bible">
              <BookOpen size={22} />
            </div>
            <div className="explore-tool-info">
              <h4>Complete Offline NIV Bible &amp; Note Taker</h4>
              <p>All 66 canonical books, multi-color verse highlighting, and sermon notebook for Sunday service &amp; mid-week fellowship.</p>
              <span className="explore-tool-badge">📖 100% Offline Ready</span>
            </div>
          </Link>

          <Link
            href="/?section=games"
            className="explore-tool-card tool-card-arcade"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('shammah:set-tab', { detail: 'home' }));
              window.dispatchEvent(new CustomEvent('shammah:set-section', { detail: 'games' }));
            }}
          >
            <div className="explore-tool-icon-wrap arcade">
              <Gamepad2 size={22} />
            </div>
            <div className="explore-tool-info">
              <h4>Faith Champions Arcade</h4>
              <p>Offline HTML5 games for kids, teens, and youth: David vs Goliath sling challenge, Bible Champions quiz, and Noah’s Ark rescue.</p>
              <span className="explore-tool-badge">🎮 Kids, Teens &amp; Youth</span>
            </div>
          </Link>

          <Link
            href="/?section=challenges"
            className="explore-tool-card tool-card-challenges"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('shammah:set-tab', { detail: 'home' }));
              window.dispatchEvent(new CustomEvent('shammah:set-section', { detail: 'challenges' }));
            }}
          >
            <div className="explore-tool-icon-wrap challenges">
              <Flame size={22} />
            </div>
            <div className="explore-tool-info">
              <h4>Faith TikTok Challenges</h4>
              <p>Short testimonies, acoustic worship covers, #ScriptureIn60s, and Sunday fit check challenges with campus CUs and youth ministries.</p>
              <span className="explore-tool-badge">🔥 Trending Community</span>
            </div>
          </Link>
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

      {/* Fundraising & M-Pesa Community Projects Center */}
      <div className="explore-section">
        <div className="explore-donate-card">
          <div className="donate-header">
            <div className="donate-badge">
              <Coins size={14} className="text-emerald-400" />
              <span>Lipa Na M-Pesa · Kingdom &amp; Community Giving</span>
            </div>
            <h3>Support Shammah &amp; Community Projects</h3>
            <p>
              Donate directly via Safaricom M-Pesa to power gospel servers, sponsor school CU students,
              and feed needy families through community outreach initiatives.
            </p>
          </div>

          {/* Project Selector Chips */}
          <div className="mb-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
              Select Ministry Project to Support
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {COMMUNITY_PROJECTS.slice(0, 4).map((p) => {
                const isSelected = selectedProjectId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedProjectId(p.id);
                      playSound('reaction');
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500/60 shadow-sm shadow-emerald-500/10'
                        : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <span className="text-base shrink-0 p-1 rounded-lg bg-white/5">{p.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <strong className="text-xs text-white truncate">{p.name}</strong>
                      </div>
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">{p.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Progress Goal for Selected Project */}
          <div className="donate-goal-wrap">
            <div className="donate-goal-meta">
              <span>Goal: KES {currentProject.targetKes.toLocaleString()} · {currentProject.name}</span>
              <strong>KES {currentProject.raisedKes.toLocaleString()} Raised ({Math.round((currentProject.raisedKes / currentProject.targetKes) * 100)}%)</strong>
            </div>
            <div className="donate-progress-bar">
              <div
                className="donate-progress-fill"
                style={{ width: `${Math.min(100, Math.round((currentProject.raisedKes / currentProject.targetKes) * 100))}%` }}
              />
            </div>
          </div>

          {/* Preset KES Tiers */}
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
                    playSound('reaction');
                  }}
                >
                  <Icon size={18} className="tier-icon" />
                  <span className="tier-amount">KES {tier.amountKes.toLocaleString()}</span>
                  <strong className="tier-title">{tier.title}</strong>
                  <p className="tier-desc">{tier.desc}</p>
                </button>
              );
            })}
          </div>

          {/* Custom Amount & Phone Form */}
          <form className="donate-form" onSubmit={handleDonate}>
            <div className="space-y-3">
              <div className="donate-input-row">
                <span className="currency-prefix text-xs font-bold">KES</span>
                <input
                  type="number"
                  min="1"
                  placeholder="Or enter custom KES blessing amount…"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="donate-amount-input"
                />
              </div>

              {/* Safaricom Phone Number */}
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-emerald-400">
                  <Phone size={16} />
                </span>
                <input
                  type="tel"
                  required
                  placeholder="Safaricom phone: 07XXXXXXXX or 2547XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/15 rounded-xl text-white placeholder-gray-500 text-sm font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            {/* M-Pesa STK Submit Button */}
            <button
              type="submit"
              disabled={status === 'sending'}
              className="donate-submit-btn w-full flex items-center justify-center gap-2 cursor-pointer bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-extrabold"
            >
              {status === 'sending' ? (
                <>
                  <Loader2 size={16} className="animate-spin text-black" />
                  <span>Sending STK Prompt to Phone...</span>
                </>
              ) : (
                <>
                  <Coins size={16} />
                  <span>Sow via M-Pesa (KES {activeAmount.toLocaleString()})</span>
                </>
              )}
            </button>

            {status === 'waiting_pin' && (
              <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-amber-400 shrink-0" />
                <span>
                  Check your phone screen and enter your M-Pesa PIN for KES {activeAmount.toLocaleString()} to complete your donation!
                </span>
              </div>
            )}

            {status === 'success' && (
              <div className="donate-success-banner">
                <Check size={18} className="text-emerald-400" />
                <div>
                  <strong className="block text-white">Payment Confirmed · Receipt: {receiptCode}</strong>
                  <span>
                    Thank you for blessing <strong>{currentProject.name}</strong>! &ldquo;God loves a cheerful giver.&rdquo; — 2 Cor 9:7
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-gray-400 flex items-center gap-1">
                <ShieldCheck size={12} className="text-emerald-400" />
                <span>Daraja M-Pesa Express Gateway</span>
              </span>
              <button
                type="button"
                onClick={() => setShowMpesaModal(true)}
                className="text-[11px] text-emerald-400 hover:underline font-semibold cursor-pointer"
              >
                View all community projects →
              </button>
            </div>
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

      {/* M-Pesa Payment & Community Projects Modal */}
      {showMpesaModal && (
        <MpesaPaymentModal
          currentUser={profile}
          defaultProjectId={selectedProjectId}
          onClose={() => setShowMpesaModal(false)}
        />
      )}
    </div>
  );
}
