'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import {
  Search,
  Flame,
  Compass,
  Check,
  Church,
  Settings,
  User,
  MessageSquare,
  HeartHandshake,
} from 'lucide-react';
import { playSound } from '../lib/soundEffects';
import PopupSheet from './PopupSheet';
import {
  TOP_NAV_SECTIONS,
  MORE_DROPDOWN_ITEMS,
  handleSectionClick,
  handleMoreItemClick,
} from './TopNav';

// Route icon & accent mapping for non-Home routes
export const ROUTE_ICON_MAP = {
  '/categories': { icon: Compass, label: 'Categories', color: '#0d9488' },
  '/fundraisers': { icon: HeartHandshake, label: 'Fundraisers', color: '#10b981' },
  '/churches': { icon: Church, label: 'Churches', color: '#8b5cf6' },
  '/settings': { icon: Settings, label: 'Settings', color: '#64748b' },
  '/profile': { icon: User, label: 'Profile', color: '#10b981' },
  '/post': { icon: MessageSquare, label: 'Discussion', color: '#3b82f6' },
};

// Section descriptive copy and color accents
export const SECTION_METADATA = {
  all: { desc: 'Home feed & community updates', color: '#f59e0b' },
  videos: { desc: 'Sermons & worship videos', color: '#ef4444' },
  podcasts: { desc: 'Sermons, podcasts & audio praise', color: '#8b5cf6' },
  polls: { desc: 'Community faith polls & votes', color: '#06b6d4' },
  courses: { desc: 'Kingdom discipleship courses', color: '#10b981' },
  bible: { desc: 'Scripture reader & notes', color: '#3b82f6' },
  rss: { desc: 'Christian news, blogs & devotionals', color: '#f97316' },
  fundraisers: { desc: 'Kingdom missions, church building & relief', color: '#10b981' },
  challenges: { desc: 'Daily devotion & video challenges', color: '#8b5cf6' },
  games: { desc: 'Bible trivia & scripture arcade', color: '#06b6d4' },
  'category-topics': { desc: 'Browse topics & filter feed', color: '#0d9488' },
};

function getNavDisplayInfo(pathname, currentSection) {
  if (pathname !== '/') {
    if (ROUTE_ICON_MAP[pathname]) {
      return ROUTE_ICON_MAP[pathname];
    }
    if (pathname.startsWith('/fundraisers')) {
      return { icon: HeartHandshake, label: 'Fundraisers', color: '#10b981' };
    }
    if (pathname.startsWith('/churches')) {
      return { icon: Church, label: 'Churches', color: '#8b5cf6' };
    }
    if (pathname.startsWith('/settings')) {
      return { icon: Settings, label: 'Settings', color: '#64748b' };
    }
    if (pathname.startsWith('/categories')) {
      return { icon: Compass, label: 'Categories', color: '#0d9488' };
    }
    if (pathname.startsWith('/post')) {
      return { icon: MessageSquare, label: 'Discussion', color: '#3b82f6' };
    }
    if (pathname.startsWith('/profile')) {
      return { icon: User, label: 'Profile', color: '#10b981' };
    }
    return { icon: Compass, label: 'Explore', color: '#0d9488' };
  }

  // Home route: inspect active section
  const sec = TOP_NAV_SECTIONS.find((s) => s.id === currentSection);
  if (sec) {
    const meta = SECTION_METADATA[sec.id] || { color: '#f59e0b' };
    return { icon: sec.icon, label: sec.label, color: meta.color };
  }
  const more = MORE_DROPDOWN_ITEMS.find((m) => m.id === currentSection);
  if (more) {
    return { icon: more.icon, label: more.label, color: more.color || '#0d9488' };
  }
  return { icon: Flame, label: 'All Feed', color: '#f59e0b' };
}

export default function TopNavCollapsedControls({
  activeSection = 'all',
  onSelectSection,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentSection, setCurrentSection] = useState(activeSection || 'all');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Keep internal state aligned with prop
  useEffect(() => {
    if (activeSection) {
      setCurrentSection(activeSection);
    }
  }, [activeSection]);

  // Keep internal state aligned with global event
  useEffect(() => {
    function handleSectionChange(e) {
      if (e.detail) {
        setCurrentSection(e.detail);
      }
    }
    window.addEventListener('shammah:set-section', handleSectionChange);
    window.addEventListener('shammah:section-changed', handleSectionChange);
    return () => {
      window.removeEventListener('shammah:set-section', handleSectionChange);
      window.removeEventListener('shammah:section-changed', handleSectionChange);
    };
  }, []);

  // Read URL query parameter on load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sec = params.get('section');
      if (sec) {
        setCurrentSection(sec);
      }
    }
  }, []);

  const navInfo = getNavDisplayInfo(pathname, currentSection);
  const ActiveIcon = navInfo.icon;

  const navContext = {
    pathname,
    router,
    onSelectSection,
    setCurrentSection,
    setMoreOpen: setDropdownOpen,
  };

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

  return (
    <div className="topbar-collapsed-controls">
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

      {/* 2. Circular Top-Nav Section / Route Button */}
      <div className="section-nav-btn-wrap">
        <motion.button
          type="button"
          className={`topbar-toggle-btn section-nav-toggle-btn${dropdownOpen ? ' is-open' : ''}`}
          onClick={handleToggleDropdown}
          aria-label={`Navigation sections (Current: ${navInfo.label}). Click to open section menu`}
          title={`Active Navigation: ${navInfo.label} (Click to browse all sections)`}
          aria-haspopup="dialog"
          aria-expanded={dropdownOpen}
          style={{
            '--nav-btn-accent': navInfo.color,
          }}
          whileTap={{ scale: 0.92 }}
          whileHover={{ scale: 1.05 }}
        >
          <ActiveIcon size={16} strokeWidth={2.2} />
        </motion.button>

        {/* Canonical PopupSheet Modal (Portaled to document.body, centered, 90dvh max, 44px X, focus trap & scroll lock) */}
        <PopupSheet
          open={dropdownOpen}
          onClose={() => setDropdownOpen(false)}
          title="Navigation & Explore"
          size="sm"
        >
          <div className="top-nav-dropdown-scrollable">
            <div className="top-nav-dropdown-header">Navigation Sections</div>
            {TOP_NAV_SECTIONS.map((s) => {
              const ItemIcon = s.icon;
              const meta = SECTION_METADATA[s.id] || { desc: 'Feed view', color: '#f59e0b' };
              const isActive = pathname === '/' && currentSection === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`top-nav-dropdown-item${isActive ? ' is-active' : ''}`}
                  onClick={() => handleSectionClick(s.id, navContext)}
                >
                  <span
                    className="top-nav-dropdown-icon-box"
                    style={{
                      background: `color-mix(in srgb, ${meta.color} 14%, transparent)`,
                      color: meta.color,
                    }}
                  >
                    <ItemIcon size={16} strokeWidth={2.2} />
                  </span>
                  <div className="top-nav-dropdown-text">
                    <span className="top-nav-dropdown-label">{s.label}</span>
                    <span className="top-nav-dropdown-sub">{meta.desc}</span>
                  </div>
                  {isActive && <Check size={16} className="top-nav-dropdown-check" style={{ color: meta.color }} />}
                </button>
              );
            })}

            <div className="top-nav-dropdown-divider" />
            <div className="top-nav-dropdown-header">Explore &amp; Tools</div>
            {MORE_DROPDOWN_ITEMS.map((item) => {
              const ItemIcon = item.icon;
              const isActive =
                (item.isCategories && pathname === '/categories') ||
                (pathname === '/' && currentSection === item.id);
              const itemColor = item.color || '#0d9488';
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`top-nav-dropdown-item${isActive ? ' is-active' : ''}`}
                  onClick={() => handleMoreItemClick(item, navContext)}
                >
                  <span
                    className="top-nav-dropdown-icon-box"
                    style={{
                      background: `color-mix(in srgb, ${itemColor} 14%, transparent)`,
                      color: itemColor,
                    }}
                  >
                    <ItemIcon size={16} strokeWidth={2.2} />
                  </span>
                  <div className="top-nav-dropdown-text">
                    <span className="top-nav-dropdown-label">{item.label}</span>
                    <span className="top-nav-dropdown-sub">{item.desc}</span>
                  </div>
                  {isActive && <Check size={16} className="top-nav-dropdown-check" style={{ color: itemColor }} />}
                </button>
              );
            })}
          </div>
        </PopupSheet>
      </div>
    </div>
  );
}
