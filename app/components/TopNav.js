'use client';
import { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
} from 'lucide-react';

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

  function handleSectionClick(secId) {
    if (dragRef.current.moved) {
      dragRef.current.moved = false;
      return;
    }

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
      <div
        ref={scrollRef}
        className="section-menu-inner no-scrollbar"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="tablist"
      >
        {/* Double-broken rotating neon glow snake (thinner) */}
        <span className="top-nav-snake-glow" aria-hidden="true" />

        {TOP_NAV_SECTIONS.map((s) => {
          const Icon = s.icon;
          const isActive = currentSection === s.id;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              data-section={s.id}
              aria-selected={isActive}
              className={`section-item-stacked${isActive ? ' active' : ''}`}
              onClick={() => handleSectionClick(s.id)}
            >
              <span className="top-nav-icon-wrap">
                <Icon size={19} strokeWidth={isActive ? 2.3 : 1.8} className="top-nav-icon" />
              </span>
              <span className="top-nav-label-small">{s.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
