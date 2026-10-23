'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Flame,
  Video,
  Headphones,
  BarChart3,
  GraduationCap,
  BookOpen,
  Rss,
  Sparkles,
  Gamepad2,
  FileText,
  Compass,
  Check,
  ChevronDown,
} from 'lucide-react';
import { playSound } from '../lib/soundEffects';

export const ALL_NAV_ITEMS = [
  { id: 'all', label: 'All Feed', desc: 'Home feed & community', icon: Flame, color: '#f59e0b', group: 'sections' },
  { id: 'videos', label: 'Videos', desc: 'Sermons & worship videos', icon: Video, color: '#ef4444', group: 'sections' },
  { id: 'podcasts', label: 'Audio', desc: 'Sermons, podcasts & praise audio', icon: Headphones, color: '#8b5cf6', group: 'sections' },
  { id: 'polls', label: 'Polls', desc: 'Community faith polls & votes', icon: BarChart3, color: '#06b6d4', group: 'sections' },
  { id: 'courses', label: 'Courses', desc: 'Kingdom discipleship courses', icon: GraduationCap, color: '#10b981', group: 'sections' },
  { id: 'bible', label: 'Bible', desc: 'Scripture reader & notes', icon: BookOpen, color: '#3b82f6', group: 'sections' },
  { id: 'sermon-note', label: 'Take Sermon Note', desc: 'Capture points & view scriptures', icon: FileText, color: '#f59e0b', isSermonNote: true, group: 'tools' },
  { id: 'category-topics', label: 'Category Topics', desc: 'Browse topics & filter feed', icon: Compass, color: '#0d9488', isCategories: true, group: 'tools' },
  { id: 'rss', label: 'RSS Feeds', desc: 'Christian news & devotionals', icon: Rss, color: '#f97316', isSection: true, group: 'tools' },
  { id: 'challenges', label: 'Faith Challenges', desc: 'Daily devotion & video challenges', icon: Sparkles, color: '#8b5cf6', isSection: true, group: 'tools' },
  { id: 'games', label: 'Arcade Games', desc: 'Bible trivia & scripture arcade', icon: Gamepad2, color: '#06b6d4', isSection: true, group: 'tools' },
];

const SECTION_ICON_MAP = {
  all: Flame,
  videos: Video,
  podcasts: Headphones,
  polls: BarChart3,
  courses: GraduationCap,
  bible: BookOpen,
  rss: Rss,
  challenges: Sparkles,
  games: Gamepad2,
  'sermon-note': FileText,
  'category-topics': Compass,
};

export default function TopNavCollapsedControls({
  activeSection = 'all',
  onSelectSection,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 54, right: 12 });
  const navBtnRef = useRef(null);

  const ActiveIcon = SECTION_ICON_MAP[activeSection] || Flame;
  const activeItem = ALL_NAV_ITEMS.find((item) => item.id === activeSection) || ALL_NAV_ITEMS[0];

  // Update dropdown position safely anchored to viewport
  useEffect(() => {
    if (!dropdownOpen || !navBtnRef.current) return;

    function updatePos() {
      if (!navBtnRef.current) return;
      const rect = navBtnRef.current.getBoundingClientRect();
      const rightOffset = Math.max(10, Math.min(window.innerWidth - 300, window.innerWidth - rect.right - 10));
      setDropdownPos({
        top: rect.bottom + 8,
        right: Math.max(10, rightOffset),
      });
    }

    updatePos();
    window.addEventListener('resize', updatePos, { passive: true });
    window.addEventListener('scroll', updatePos, { passive: true });
    return () => {
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos);
    };
  }, [dropdownOpen]);

  // Handle outside click & Escape key
  useEffect(() => {
    if (!dropdownOpen) return;

    function handlePointerDown(e) {
      if (navBtnRef.current && !navBtnRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
      }
    }

    const timer = setTimeout(() => {
      document.addEventListener('pointerdown', handlePointerDown);
      document.addEventListener('keydown', handleKeyDown);
    }, 40);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dropdownOpen]);

  function handleSearchClick(e) {
    e.stopPropagation();
    playSound('reaction');
    window.dispatchEvent(new CustomEvent('shammah:open-search', { detail: { query: '' } }));
  }

  function handleToggleDropdown(e) {
    e.stopPropagation();
    playSound('reaction');
    setDropdownOpen((prev) => !prev);
  }

  function handleItemClick(item) {
    playSound('reaction');
    setDropdownOpen(false);

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

    if (onSelectSection) {
      onSelectSection(item.id);
    }

    // Broadcast globally
    window.dispatchEvent(new CustomEvent('shammah:set-tab', { detail: 'home' }));
    window.dispatchEvent(new CustomEvent('shammah:set-section', { detail: item.id }));

    if (pathname === '/') {
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        if (item.id === 'all') {
          url.searchParams.delete('section');
        } else {
          url.searchParams.set('section', item.id);
        }
        window.history.replaceState({}, '', url.toString());
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      router.push(item.id === 'all' ? '/' : `/?section=${item.id}`);
    }
  }

  const sectionsList = ALL_NAV_ITEMS.filter((i) => i.group === 'sections');
  const toolsList = ALL_NAV_ITEMS.filter((i) => i.group === 'tools');

  return (
    <div className="topbar-collapsed-controls" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {/* 1. Circular Search Button */}
      <motion.button
        type="button"
        className="topbar-toggle-btn search-toggle-btn"
        onClick={handleSearchClick}
        aria-label="Open search (scriptures, sermons, topics, and members)"
        title="Search sermons, scriptures, and members (⌘K or /)"
        whileTap={{ scale: 0.92 }}
        whileHover={{ scale: 1.05 }}
      >
        <Search size={16} strokeWidth={2.2} />
      </motion.button>

      {/* 2. Circular Top-Nav Section Button */}
      <div className="section-nav-btn-wrap" ref={navBtnRef} style={{ position: 'relative' }}>
        <motion.button
          type="button"
          className={`topbar-toggle-btn section-nav-toggle-btn${dropdownOpen ? ' is-open' : ''}`}
          onClick={handleToggleDropdown}
          aria-label={`Navigation sections (Current: ${activeItem.label}). Click to open section menu`}
          title={`Active Section: ${activeItem.label} (Click to browse all sections)`}
          aria-haspopup="menu"
          aria-expanded={dropdownOpen}
          whileTap={{ scale: 0.92 }}
          whileHover={{ scale: 1.05 }}
        >
          <ActiveIcon size={16} strokeWidth={2.2} />
        </motion.button>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {dropdownOpen && (
            <>
              <div
                className="top-nav-dropdown-backdrop"
                onClick={() => setDropdownOpen(false)}
                aria-hidden="true"
              />
              <motion.div
                className="top-nav-dropdown-menu neon-glow-modal"
                role="menu"
                aria-label="Navigation sections and explore tools"
                style={{
                  position: 'fixed',
                  top: dropdownPos.top,
                  right: dropdownPos.right,
                  zIndex: 100,
                }}
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="top-nav-dropdown-scrollable">
                  <div className="top-nav-dropdown-header">Navigation Sections</div>
                  {sectionsList.map((item) => {
                    const ItemIcon = item.icon;
                    const isActive = activeSection === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="menuitem"
                        className={`top-nav-dropdown-item${isActive ? ' is-active' : ''}`}
                        onClick={() => handleItemClick(item)}
                      >
                        <span
                          className="top-nav-dropdown-icon-box"
                          style={{
                            background: `color-mix(in srgb, ${item.color} 14%, transparent)`,
                            color: item.color,
                          }}
                        >
                          <ItemIcon size={16} strokeWidth={2.2} />
                        </span>
                        <div className="top-nav-dropdown-text">
                          <span className="top-nav-dropdown-label">{item.label}</span>
                          <span className="top-nav-dropdown-sub">{item.desc}</span>
                        </div>
                        {isActive && <Check size={16} className="top-nav-dropdown-check" style={{ color: item.color }} />}
                      </button>
                    );
                  })}

                  <div className="top-nav-dropdown-divider" />
                  <div className="top-nav-dropdown-header">Explore &amp; Tools</div>
                  {toolsList.map((item) => {
                    const ItemIcon = item.icon;
                    const isActive = activeSection === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="menuitem"
                        className={`top-nav-dropdown-item${isActive ? ' is-active' : ''}`}
                        onClick={() => handleItemClick(item)}
                      >
                        <span
                          className="top-nav-dropdown-icon-box"
                          style={{
                            background: `color-mix(in srgb, ${item.color} 14%, transparent)`,
                            color: item.color,
                          }}
                        >
                          <ItemIcon size={16} strokeWidth={2.2} />
                        </span>
                        <div className="top-nav-dropdown-text">
                          <span className="top-nav-dropdown-label">{item.label}</span>
                          <span className="top-nav-dropdown-sub">{item.desc}</span>
                        </div>
                        {isActive && <Check size={16} className="top-nav-dropdown-check" style={{ color: item.color }} />}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
