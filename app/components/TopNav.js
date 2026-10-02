'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export const TOP_NAV_SECTIONS = [
  { id: 'all', label: 'All' },
  { id: 'videos', label: 'Videos' },
  { id: 'podcasts', label: 'Audio' },
  { id: 'polls', label: 'Polls' },
  { id: 'courses', label: 'Courses' },
  { id: 'bible', label: 'Bible' },
];

export default function TopNav({ activeSection = 'all', onSelectSection, isHome = false }) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentSection, setCurrentSection] = useState(activeSection);

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

  return (
    <nav className={`top-nav-wrapper${isHome ? ' top-nav-home' : ' top-nav-subpage'}`} aria-label="Content Type Navigation">
      <div className="section-menu-inner">
        {TOP_NAV_SECTIONS.map((s) => {
          const isActive = currentSection === s.id;
          return (
            <button
              key={s.id}
              type="button"
              className={`section-item${isActive ? ' active' : ''}`}
              onClick={() => handleSectionClick(s.id)}
              aria-pressed={isActive}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
