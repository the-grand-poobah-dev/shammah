'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import {
  Flame,
  Video,
  Headphones,
  BarChart3,
  GraduationCap,
  Rss,
  BookOpen,
  Sparkles,
  Gamepad2,
  HeartHandshake,
  MoreHorizontal,
  Compass,
  ChevronDown,
  Check,
} from 'lucide-react';
import { playSound } from '../lib/soundEffects';
import PopupSheet from './PopupSheet';
import { ScrollAffordanceWrapper } from './ScrollAffordance';
import { subscribeToBadges, getAllContentBadges } from '../lib/contentBadgeManager';

export const TOP_NAV_SECTIONS = [
  { id: 'all', label: 'All', icon: Flame },
  { id: 'videos', label: 'Videos', icon: Video },
  { id: 'podcasts', label: 'Audio', icon: Headphones },
  { id: 'polls', label: 'Polls', icon: BarChart3 },
  { id: 'courses', label: 'Courses', icon: GraduationCap },
  { id: 'bible', label: 'Bible', icon: BookOpen },
];

export const MORE_DROPDOWN_ITEMS = [
  {
    id: 'rss',
    label: 'RSS Feeds',
    navLabel: 'RSS Feeds',
    desc: 'Christian news, blogs & devotionals',
    icon: Rss,
    isSection: true,
    color: '#f97316', // Warm Orange
  },
  {
    id: 'fundraisers',
    label: 'Fundraisers',
    navLabel: 'Fundraisers',
    desc: 'Missions, church building & relief causes',
    icon: HeartHandshake,
    isSection: true,
    color: '#10b981', // Emerald
  },
  {
    id: 'challenges',
    label: 'Faith Challenges',
    navLabel: 'Challenges',
    desc: 'Daily devotion & video challenges',
    icon: Sparkles,
    isSection: true,
    color: '#8b5cf6', // Kingdom Purple
  },
  {
    id: 'games',
    label: 'Arcade Games',
    navLabel: 'Arcade',
    desc: 'Bible trivia & scripture arcade',
    icon: Gamepad2,
    isSection: true,
    color: '#06b6d4', // Radiant Cyan
  },
  {
    id: 'category-topics',
    label: 'Category Topics',
    navLabel: 'Topics',
    desc: 'Browse topics & filter home feed',
    icon: Compass,
    isCategories: true,
    color: '#0d9488', // Emerald Teal
  },
];

export function handleSectionClick(secId, context = {}) {
  const {
    pathname = typeof window !== 'undefined' ? window.location.pathname : '/',
    router,
    onSelectSection,
    setCurrentSection,
    setMoreOpen,
  } = context;

  if (setMoreOpen) setMoreOpen(false);
  playSound('reaction');
  if (setCurrentSection) setCurrentSection(secId);

  if (onSelectSection) {
    onSelectSection(secId);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('shammah:set-tab', { detail: 'home' }));
    window.dispatchEvent(new CustomEvent('shammah:set-section', { detail: secId }));
  }

  if (pathname === '/') {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (secId === 'all') {
        url.searchParams.delete('section');
      } else {
        url.searchParams.set('section', secId);
      }
      window.history.replaceState({}, '', url.toString());
    }
  } else if (router) {
    router.push(secId === 'all' ? '/' : `/?section=${secId}`);
  }
}

export function handleMoreItemClick(item, context = {}) {
  const {
    pathname = typeof window !== 'undefined' ? window.location.pathname : '/',
    router,
    setMoreOpen,
  } = context;

  playSound('reaction');
  if (setMoreOpen) setMoreOpen(false);

  if (item.isCategories) {
    if (router) {
      router.push('/categories');
    }
    return;
  }

  if (item.isSection || item.id) {
    handleSectionClick(item.id, context);
  }
}

export default function TopNav({ activeSection = 'all', onSelectSection, isHome = false }) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentSection, setCurrentSection] = useState(activeSection);
  const [moreOpen, setMoreOpen] = useState(false);
  const [contentBadges, setContentBadges] = useState(() => getAllContentBadges());

  useEffect(() => {
    const unsub = subscribeToBadges((badges) => {
      setContentBadges(badges);
    });
    return unsub;
  }, []);

  useEffect(() => {
    setCurrentSection(activeSection);
  }, [activeSection]);

  // Sync with global custom event
  useEffect(() => {
    function handleSectionEvent(e) {
      if (e.detail) {
        setCurrentSection(e.detail);
      }
    }
    window.addEventListener('shammah:section-changed', handleSectionEvent);
    window.addEventListener('shammah:set-section', handleSectionEvent);
    return () => {
      window.removeEventListener('shammah:section-changed', handleSectionEvent);
      window.removeEventListener('shammah:set-section', handleSectionEvent);
    };
  }, []);

  const navContext = {
    pathname,
    router,
    onSelectSection,
    setCurrentSection,
    setMoreOpen,
  };

  const isMoreActive =
    currentSection === 'rss' ||
    currentSection === 'fundraisers' ||
    currentSection === 'challenges' ||
    currentSection === 'games';

  const moreItemsTotalBadges = MORE_DROPDOWN_ITEMS.reduce(
    (sum, item) => sum + (Number(contentBadges[item.id]) || 0),
    0
  );

  return (
    <nav
      className={`top-nav-wrapper${isHome ? ' top-nav-home' : ' top-nav-subpage'} no-scrollbar`}
      aria-label="Content Type Navigation"
    >
      <div className="section-menu">
        <div className="section-menu-pill">
          {/* Subtle perimeter glow accent */}
          <span className="top-nav-snake-glow" aria-hidden="true" />

          <ScrollAffordanceWrapper axis="horizontal" leftLabel="Scroll navigation left" rightLabel="Scroll navigation right">
            <div className="section-menu-inner" role="tablist">
            {TOP_NAV_SECTIONS.map((s) => {
              const Icon = s.icon;
              const isActive = pathname === '/' && currentSection === s.id;
              const badgeNum = Number(contentBadges[s.id]) || 0;

              return (
                <motion.button
                  key={s.id}
                  type="button"
                  role="tab"
                  data-section={s.id}
                  aria-selected={isActive}
                  className={`section-item-stacked${isActive ? ' active' : ''}`}
                  onClick={() => handleSectionClick(s.id, navContext)}
                  whileTap={{ scale: 0.92 }}
                  animate={isActive ? { scale: [0.96, 1.07, 1], y: [1, -2, 0] } : { scale: 1, y: 0 }}
                  transition={{
                    duration: 0.28,
                    ease: [0.25, 1, 0.5, 1],
                  }}
                  title={s.label}
                >
                  <motion.span
                    className="top-nav-icon-wrap"
                    animate={isActive ? { scale: [1, 1.18, 1], rotate: [0, -5, 5, 0] } : { scale: 1, rotate: 0 }}
                    transition={{ duration: 0.32, ease: 'easeInOut' }}
                  >
                    <Icon size={18} strokeWidth={isActive ? 2.3 : 1.8} className="top-nav-icon" />
                    {badgeNum > 0 && !isActive && (
                      <span className="top-nav-badge-num">{badgeNum}</span>
                    )}
                  </motion.span>
                  <span className="top-nav-label-small">{s.label}</span>
                </motion.button>
              );
            })}

            {/* Larger Screens (>= 641px, tablets & desktops): Display 'More' items & their icons directly on the full-width bar */}
            {MORE_DROPDOWN_ITEMS.map((item) => {
              const ItemIcon = item.icon;
              const isItemActive =
                (item.isCategories && pathname === '/categories') ||
                (pathname === '/' && currentSection === item.id);
              const itemBadge = Number(contentBadges[item.id]) || 0;

              return (
                <motion.button
                  key={item.id}
                  type="button"
                  role="tab"
                  data-section={item.id}
                  aria-selected={isItemActive}
                  className={`section-item-stacked top-nav-desktop-more-item${isItemActive ? ' active' : ''}`}
                  onClick={() => handleMoreItemClick(item, navContext)}
                  whileTap={{ scale: 0.92 }}
                  animate={isItemActive ? { scale: [0.96, 1.07, 1], y: [1, -2, 0] } : { scale: 1, y: 0 }}
                  transition={{
                    duration: 0.28,
                    ease: [0.25, 1, 0.5, 1],
                  }}
                  title={`${item.label} — ${item.desc}`}
                >
                  <motion.span
                    className="top-nav-icon-wrap"
                    animate={isItemActive ? { scale: [1, 1.18, 1], rotate: [0, -5, 5, 0] } : { scale: 1, rotate: 0 }}
                    transition={{ duration: 0.32, ease: 'easeInOut' }}
                    style={{ color: isItemActive ? undefined : item.color }}
                  >
                    <ItemIcon size={18} strokeWidth={isItemActive ? 2.3 : 2} className="top-nav-icon" />
                    {itemBadge > 0 && !isItemActive && (
                      <span className="top-nav-badge-num">{itemBadge}</span>
                    )}
                  </motion.span>
                  <span className="top-nav-label-small">{item.label}</span>
                </motion.button>
              );
            })}

            {/* Smaller Screens (<= 640px): More Tab with PopupSheet Menu */}
            <div className="top-nav-more-container">
              <motion.button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={moreOpen}
                aria-label="More options including RSS feeds, category topics, challenges, and arcade"
                className={`section-item-stacked top-nav-more-btn${isMoreActive ? ' active' : ''}${moreOpen ? ' is-open' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  playSound('reaction');
                  setMoreOpen((prev) => !prev);
                }}
                whileTap={{ scale: 0.92 }}
                title="More: RSS, Topics, Challenges & Arcade"
              >
                <motion.span
                  className="top-nav-icon-wrap"
                  animate={isMoreActive || moreOpen ? { scale: [1, 1.14, 1] } : { scale: 1 }}
                  transition={{ duration: 0.28, ease: 'easeInOut' }}
                >
                  {isMoreActive ? (
                    currentSection === 'rss' ? (
                      <Rss size={18} strokeWidth={2.3} className="top-nav-icon" />
                    ) : currentSection === 'fundraisers' ? (
                      <HeartHandshake size={18} strokeWidth={2.3} className="top-nav-icon" />
                    ) : currentSection === 'challenges' ? (
                      <Sparkles size={18} strokeWidth={2.3} className="top-nav-icon" />
                    ) : (
                      <Gamepad2 size={18} strokeWidth={2.3} className="top-nav-icon" />
                    )
                  ) : (
                    <MoreHorizontal size={18} strokeWidth={moreOpen ? 2.3 : 1.8} className="top-nav-icon" />
                  )}
                  {moreItemsTotalBadges > 0 && !isMoreActive && (
                    <span className="top-nav-badge-num">{moreItemsTotalBadges}</span>
                  )}
                </motion.span>
                <span className="top-nav-label-small flex-center-gap">
                  <span>More</span>
                  <ChevronDown size={10} className={`top-nav-chevron-icon${moreOpen ? ' rotated' : ''}`} />
                </span>
              </motion.button>

              <PopupSheet
                open={moreOpen}
                onClose={() => setMoreOpen(false)}
                title="Explore & Topics"
                size="sm"
              >
                <div className="top-nav-dropdown-scrollable">
                  {MORE_DROPDOWN_ITEMS.map((item) => {
                    const ItemIcon = item.icon;
                    const isItemActive = currentSection === item.id;
                    const itemBadge = Number(contentBadges[item.id]) || 0;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`top-nav-more-item${isItemActive ? ' is-active' : ''}`}
                        style={{
                          '--item-accent': item.color,
                          marginBottom: '6px',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoreItemClick(item, navContext);
                        }}
                      >
                        <div className={`top-nav-more-icon-box ${item.id}`} style={{ '--item-accent': item.color }}>
                          <ItemIcon size={17} strokeWidth={2} />
                        </div>
                        <div className="top-nav-more-text">
                          <span className="top-nav-more-title">
                            <span>{item.label}</span>
                            {itemBadge > 0 && (
                              <span className="top-nav-badge-inline">{itemBadge} new</span>
                            )}
                            {isItemActive && <Check size={14} style={{ color: item.color }} />}
                          </span>
                          <span className="top-nav-more-desc">{item.desc}</span>
                        </div>
                        <span className="item-color-picker-box" style={{ '--picker-color': item.color }}>
                          <span className="picker-box-swatch" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </PopupSheet>
            </div>
            </div>
          </ScrollAffordanceWrapper>
        </div>
      </div>
    </nav>
  );
}
