'use client';
import { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
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
  MoreHorizontal,
  Compass,
  ChevronDown,
  Check,
  FileText,
} from 'lucide-react';
import { playSound } from '../lib/soundEffects';

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
    id: 'sermon-note',
    label: 'Take Sermon Note',
    desc: 'Capture points & view scriptures',
    icon: FileText,
    isSermonNote: true,
    color: '#f59e0b', // Sanctuary Amber
  },
  {
    id: 'category-topics',
    label: 'Category Topics',
    desc: 'Browse topics & filter home feed',
    icon: Compass,
    isCategories: true,
    color: '#0d9488', // Emerald Teal
  },
  {
    id: 'rss',
    label: 'RSS Feeds',
    desc: 'Christian news, blogs & devotionals',
    icon: Rss,
    isSection: true,
    color: '#f97316', // Warm Orange
  },
  {
    id: 'challenges',
    label: 'Faith Challenges',
    desc: 'Daily devotion & video challenges',
    icon: Sparkles,
    isSection: true,
    color: '#8b5cf6', // Kingdom Purple
  },
  {
    id: 'games',
    label: 'Arcade Games',
    desc: 'Bible trivia & scripture arcade',
    icon: Gamepad2,
    isSection: true,
    color: '#06b6d4', // Radiant Cyan
  },
];

export default function TopNav({ activeSection = 'all', onSelectSection, isHome = false }) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentSection, setCurrentSection] = useState(activeSection);
  const [moreOpen, setMoreOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 60, right: 12 });
  const moreRef = useRef(null);

  useEffect(() => {
    setCurrentSection(activeSection);
  }, [activeSection]);

  // Keep dropdown accurately positioned sticky to the right of the screen
  useEffect(() => {
    if (moreOpen && moreRef.current) {
      function updatePos() {
        if (!moreRef.current) return;
        const rect = moreRef.current.getBoundingClientRect();
        // Stick safely to right of viewport so it is never overlapped by bottom-left plus menu
        const rightOffset = Math.max(12, Math.min(24, window.innerWidth - rect.right));
        setDropdownPos({
          top: rect.bottom + 8,
          right: rightOffset,
        });
      }
      updatePos();
      window.addEventListener('scroll', updatePos, { passive: true });
      window.addEventListener('resize', updatePos, { passive: true });
      return () => {
        window.removeEventListener('scroll', updatePos);
        window.removeEventListener('resize', updatePos);
      };
    }
  }, [moreOpen]);

  // Sync with global custom event
  useEffect(() => {
    function handleSectionEvent(e) {
      if (e.detail) {
        setCurrentSection(e.detail);
      }
    }
    window.addEventListener('shammah:section-changed', handleSectionEvent);
    return () => window.removeEventListener('shammah:section-changed', handleSectionEvent);
  }, []);

  // Reliable outside-click and escape listener
  useEffect(() => {
    if (!moreOpen) return;

    function handleOutsideClick(e) {
      if (moreRef.current && !moreRef.current.contains(e.target)) {
        setMoreOpen(false);
      }
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setMoreOpen(false);
      }
    }

    const timer = setTimeout(() => {
      document.addEventListener('pointerdown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('pointerdown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [moreOpen]);

  function handleSectionClick(secId) {
    setMoreOpen(false);
    playSound('reaction');
    setCurrentSection(secId);

    if (onSelectSection) {
      onSelectSection(secId);
    }

    // Dispatch global event for listeners
    window.dispatchEvent(new CustomEvent('shammah:set-tab', { detail: 'home' }));
    window.dispatchEvent(new CustomEvent('shammah:set-section', { detail: secId }));

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
    } else {
      router.push(secId === 'all' ? '/' : `/?section=${secId}`);
    }
  }

  function handleMoreItemClick(item) {
    playSound('reaction');
    setMoreOpen(false);

    if (item.isSermonNote) {
      if (pathname === '/') {
        window.dispatchEvent(new CustomEvent('shammah:set-tab', { detail: 'home' }));
        window.dispatchEvent(new CustomEvent('shammah:set-section', { detail: 'bible' }));
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('shammah:open-sermon-note'));
        }, 80);
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else {
        router.push('/?section=bible&note=1');
      }
      return;
    }

    if (item.isCategories) {
      router.push('/categories');
      return;
    }

    if (item.isSection) {
      handleSectionClick(item.id);
    }
  }

  const isMoreActive =
    currentSection === 'rss' || currentSection === 'challenges' || currentSection === 'games';

  return (
    <nav
      className={`top-nav-wrapper${isHome ? ' top-nav-home' : ' top-nav-subpage'} no-scrollbar`}
      aria-label="Content Type Navigation"
    >
      <div className="section-menu">
        <div className="section-menu-pill">
          {/* Subtle perimeter glow accent */}
          <span className="top-nav-snake-glow" aria-hidden="true" />

          <div className="section-menu-inner" role="tablist">
            {TOP_NAV_SECTIONS.map((s) => {
              const Icon = s.icon;
              const isActive = currentSection === s.id;
              return (
                <motion.button
                  key={s.id}
                  type="button"
                  role="tab"
                  data-section={s.id}
                  aria-selected={isActive}
                  className={`section-item-stacked${isActive ? ' active' : ''}`}
                  onClick={() => handleSectionClick(s.id)}
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
                  </motion.span>
                  <span className="top-nav-label-small">{s.label}</span>
                </motion.button>
              );
            })}

            {/* More Tab with Dropdown Menu containing Sermon Note, Category Topics, RSS, Challenges & Arcade */}
            <div className="top-nav-more-container" ref={moreRef}>
              <motion.button
                type="button"
                role="button"
                aria-haspopup="menu"
                aria-expanded={moreOpen}
                aria-label="More options including RSS feeds, category topics, challenges, and arcade"
                className={`section-item-stacked top-nav-more-btn${isMoreActive ? ' active' : ''}${moreOpen ? ' is-open' : ''}`}
                onPointerDown={(e) => e.stopPropagation()}
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
                    ) : currentSection === 'challenges' ? (
                      <Sparkles size={18} strokeWidth={2.3} className="top-nav-icon" />
                    ) : (
                      <Gamepad2 size={18} strokeWidth={2.3} className="top-nav-icon" />
                    )
                  ) : (
                    <MoreHorizontal size={18} strokeWidth={moreOpen ? 2.3 : 1.8} className="top-nav-icon" />
                  )}
                </motion.span>
                <span className="top-nav-label-small flex-center-gap">
                  <span>More</span>
                  <ChevronDown size={10} className={`top-nav-chevron-icon${moreOpen ? ' rotated' : ''}`} />
                </span>
              </motion.button>

              <AnimatePresence>
                {moreOpen && (
                  <>
                    <div
                      className="top-nav-more-backdrop"
                      onClick={() => setMoreOpen(false)}
                      aria-hidden="true"
                    />
                    <motion.div
                      className="top-nav-more-dropdown neon-glow-modal"
                      role="menu"
                      style={{
                        position: 'fixed',
                        top: dropdownPos.top,
                        right: dropdownPos.right,
                        zIndex: 55,
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      initial={{ opacity: 0, y: -6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.96 }}
                      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div className="top-nav-more-header">Explore &amp; Topics</div>

                      {MORE_DROPDOWN_ITEMS.map((item) => {
                        const ItemIcon = item.icon;
                        const isItemActive = currentSection === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            role="menuitem"
                            className={`top-nav-more-item${isItemActive ? ' is-active' : ''}`}
                            style={{
                              '--item-accent': item.color,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoreItemClick(item);
                            }}
                          >
                            <div className={`top-nav-more-icon-box ${item.id}`} style={{ '--item-accent': item.color }}>
                              <ItemIcon size={17} strokeWidth={2} />
                            </div>
                            <div className="top-nav-more-text">
                              <span className="top-nav-more-title">
                                <span>{item.label}</span>
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
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
