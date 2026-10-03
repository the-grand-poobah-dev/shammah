'use client';
import { useEffect, useState, useRef } from 'react';
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
  DownloadCloud,
} from 'lucide-react';
import { playSound } from '../lib/soundEffects';
import { getOfflineItems } from '../lib/offlineSyncManager';

export const TOP_NAV_SECTIONS = [
  { id: 'all', label: 'All', icon: Flame },
  { id: 'videos', label: 'Videos', icon: Video },
  { id: 'podcasts', label: 'Audio', icon: Headphones },
  { id: 'polls', label: 'Polls', icon: BarChart3 },
  { id: 'courses', label: 'Courses', icon: GraduationCap },
  { id: 'rss', label: 'RSS Feeds', icon: Rss },
  { id: 'bible', label: 'Bible & Notes', icon: BookOpen },
  { id: 'challenges', label: 'Challenges', icon: Sparkles },
  { id: 'games', label: 'Arcade', icon: Gamepad2 },
];

export default function TopNav({ activeSection = 'all', onSelectSection, isHome = false }) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentSection, setCurrentSection] = useState(activeSection);
  const scrollRef = useRef(null);
  const dragRef = useRef({ active: false, startX: 0, startScroll: 0, moved: false });

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
    return () => window.removeEventListener('shammah:section-changed', handleSectionEvent);
  }, []);

  // Offline cached content status tracking
  const [offlineCount, setOfflineCount] = useState(0);
  const [recentCachedNotice, setRecentCachedNotice] = useState(false);

  useEffect(() => {
    setOfflineCount(getOfflineItems().length);

    function onOfflineUpdate(e) {
      setOfflineCount(getOfflineItems().length);
      if (e.detail?.action === 'save') {
        setRecentCachedNotice(true);
        setTimeout(() => setRecentCachedNotice(false), 4000);
      }
    }
    window.addEventListener('shammah:offline-updated', onOfflineUpdate);
    return () => window.removeEventListener('shammah:offline-updated', onOfflineUpdate);
  }, []);

  function handleOpenOfflineLibrary(e) {
    if (dragRef.current.moved) {
      dragRef.current.moved = false;
      return;
    }
    e?.stopPropagation();
    playSound('reaction');
    window.dispatchEvent(new CustomEvent('shammah:open-offline-library'));
  }

  function handleSectionClick(secId) {
    if (dragRef.current.moved) {
      dragRef.current.moved = false;
      return;
    }

    playSound('reaction');
    setCurrentSection(secId);

    if (onSelectSection) {
      onSelectSection(secId);
    }

    // Dispatch global event for listeners
    window.dispatchEvent(new CustomEvent('shammah:set-section', { detail: secId }));

    if (pathname === '/') {
      // On homepage: update URL query without full reload
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
      // On other pages: navigate to homepage with section param
      router.push(secId === 'all' ? '/' : `/?section=${secId}`);
    }
  }

  // Pointer drag to scroll horizontally with no visible scrollbar
  function onPointerDown(e) {
    if (!scrollRef.current) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startScroll: scrollRef.current.scrollLeft,
      moved: false,
    };
  }

  function onPointerMove(e) {
    const d = dragRef.current;
    if (!d.active || !scrollRef.current) return;
    const dx = e.clientX - d.startX;
    if (!d.moved && Math.abs(dx) > 4) {
      d.moved = true;
      scrollRef.current.setPointerCapture?.(e.pointerId);
    }
    if (d.moved) {
      scrollRef.current.scrollLeft = d.startScroll - dx;
    }
  }

  function onPointerUp() {
    dragRef.current.active = false;
  }

  return (
    <nav
      className={`top-nav-wrapper${isHome ? ' top-nav-home' : ' top-nav-subpage'} no-scrollbar`}
      aria-label="Content Type Navigation"
    >
      <div className="section-menu">
        <div className="section-menu-pill">
          {/* Rotating neon ring open at two places on the outline of the top bar navigation widget */}
          <span className="top-nav-snake-glow" aria-hidden="true" />

          <div
            ref={scrollRef}
            className="section-menu-inner no-scrollbar"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            role="tablist"
          >
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
                    type: 'spring',
                    stiffness: 480,
                    damping: 24,
                    mass: 0.6,
                  }}
                >
                  <motion.span
                    className="top-nav-icon-wrap"
                    animate={isActive ? { scale: [1, 1.18, 1], rotate: [0, -5, 5, 0] } : { scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                  >
                    <Icon size={19} strokeWidth={isActive ? 2.3 : 1.8} className="top-nav-icon" />
                  </motion.span>
                  <span className="top-nav-label-small">{s.label}</span>
                </motion.button>
              );
            })}

            {/* Small status icon informing users when content is successfully cached & available for offline viewing */}
            <motion.button
              type="button"
              role="button"
              className={`section-item-stacked top-nav-offline-status-btn${offlineCount > 0 ? ' is-cached' : ''}${recentCachedNotice ? ' is-just-cached' : ''}`}
              onClick={handleOpenOfflineLibrary}
              whileTap={{ scale: 0.92 }}
              animate={recentCachedNotice ? { scale: [1, 1.15, 1], y: [0, -3, 0] } : { scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
              title={
                offlineCount > 0
                  ? `✓ ${offlineCount} item${offlineCount > 1 ? 's' : ''} cached & available for offline viewing (30-day storage). Tap to view offline library.`
                  : 'Offline Library: Download feeds & chapters to view anytime without internet'
              }
              aria-label="Offline Cached Content Status"
            >
              <motion.span
                className="top-nav-icon-wrap offline-icon-wrap"
                animate={recentCachedNotice ? { rotate: [0, -12, 12, 0], scale: [1, 1.25, 1] } : { rotate: 0 }}
                transition={{ duration: 0.4 }}
              >
                <DownloadCloud
                  size={19}
                  strokeWidth={offlineCount > 0 ? 2.3 : 1.8}
                  className={`top-nav-icon${offlineCount > 0 ? ' text-emerald-400' : ' text-slate-400'}`}
                />
                {offlineCount > 0 && (
                  <span className="top-nav-offline-badge" title={`${offlineCount} items cached`}>
                    {offlineCount}
                  </span>
                )}
                {recentCachedNotice && (
                  <span className="top-nav-offline-ping-dot" />
                )}
              </motion.span>
              <span className="top-nav-label-small">
                {recentCachedNotice ? 'Cached!' : offlineCount > 0 ? 'Offline ✓' : 'Offline'}
              </span>
            </motion.button>
          </div>
        </div>
      </div>
    </nav>
  );
}
