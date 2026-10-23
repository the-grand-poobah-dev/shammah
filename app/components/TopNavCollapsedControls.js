'use client';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  Church,
  Settings,
  User,
  MessageSquare,
} from 'lucide-react';
import { playSound } from '../lib/soundEffects';
import PopupSheet from './PopupSheet';
import { TOP_NAV_SECTIONS, MORE_DROPDOWN_ITEMS } from './TopNav';

// Route icon & accent mapping for non-Home routes
export const ROUTE_ICON_MAP = {
  '/categories': { icon: Compass, label: 'Categories', color: '#0d9488' },
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
};

function getNavDisplayInfo(pathname, currentSection) {
  if (pathname !== '/') {
    if (ROUTE_ICON_MAP[pathname]) {
      return ROUTE_ICON_MAP[pathname];
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
  const [dropdownPos, setDropdownPos] = useState({ top: 54, right: 12 });
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const navBtnRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    function checkMobile() {
      setIsMobile(window.innerWidth < 640);
    }
    checkMobile();
    window.addEventListener('resize', checkMobile, { passive: true });
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
    return () => window.removeEventListener('shammah:set-section', handleSectionChange);
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

  // Update dropdown position safely anchored to viewport (for desktop dropdown)
  useEffect(() => {
    if (!dropdownOpen || isMobile || !navBtnRef.current) return;

    function updatePos() {
      if (!navBtnRef.current) return;
      const rect = navBtnRef.current.getBoundingClientRect();
      const menuWidth = Math.min(340, window.innerWidth - 20);
      const idealRight = window.innerWidth - rect.right;
      const clampedRight = Math.max(10, Math.min(window.innerWidth - menuWidth - 10, idealRight));
      setDropdownPos({
        top: Math.round(rect.bottom + 8),
        right: Math.round(clampedRight),
      });
    }

    updatePos();
    window.addEventListener('resize', updatePos, { passive: true });
    window.addEventListener('scroll', updatePos, { passive: true });
    return () => {
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos);
    };
  }, [dropdownOpen, isMobile]);

  // Handle outside click & Escape key for desktop floating dropdown
  useEffect(() => {
    if (!dropdownOpen || isMobile) return;

    function handlePointerDown(e) {
      if (navBtnRef.current && navBtnRef.current.contains(e.target)) {
        return;
      }
      setDropdownOpen(false);
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
  }, [dropdownOpen, isMobile]);

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

    setCurrentSection(item.id);
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

  // Render navigation menu items list
  const renderMenuItems = () => (
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
            role="menuitem"
            className={`top-nav-dropdown-item${isActive ? ' is-active' : ''}`}
            onClick={() => handleItemClick({ id: s.id })}
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
            role="menuitem"
            className={`top-nav-dropdown-item${isActive ? ' is-active' : ''}`}
            onClick={() => handleItemClick(item)}
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
  );

  return (
    <div className="topbar-collapsed-controls" style={{ display: 'inline-flex', alignItems: 'center' }}>
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
      <div className="section-nav-btn-wrap" ref={navBtnRef} style={{ position: 'relative' }}>
        <motion.button
          type="button"
          className={`topbar-toggle-btn section-nav-toggle-btn${dropdownOpen ? ' is-open' : ''}`}
          onClick={handleToggleDropdown}
          aria-label={`Navigation sections (Current: ${navInfo.label}). Click to open section menu`}
          title={`Active Navigation: ${navInfo.label} (Click to browse all sections)`}
          aria-haspopup="menu"
          aria-expanded={dropdownOpen}
          style={{
            background: `color-mix(in srgb, ${navInfo.color} 15%, transparent)`,
            borderColor: `color-mix(in srgb, ${navInfo.color} 45%, transparent)`,
            color: navInfo.color,
            boxShadow: dropdownOpen
              ? `0 0 16px ${navInfo.color}`
              : `0 0 10px color-mix(in srgb, ${navInfo.color} 25%, transparent)`,
          }}
          whileTap={{ scale: 0.92 }}
          whileHover={{ scale: 1.05 }}
        >
          <ActiveIcon size={16} strokeWidth={2.2} />
        </motion.button>

        {/* Small Screen: PopupSheet Modal (Full canonical popup primitive with focus-trap & safe-area) */}
        {mounted && isMobile && (
          <PopupSheet
            open={dropdownOpen}
            onClose={() => setDropdownOpen(false)}
            title="Navigation & Explore"
            size="sm"
          >
            {renderMenuItems()}
          </PopupSheet>
        )}

        {/* Desktop Screen: Anchored Portaled Dropdown with Backdrop */}
        {mounted && !isMobile && createPortal(
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
                    zIndex: 9999,
                  }}
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  {renderMenuItems()}
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
      </div>
    </div>
  );
}
