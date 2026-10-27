'use client';
import { usePathname } from 'next/navigation';
import { Search } from 'lucide-react';
import TopNav from './TopNav';
import { playSound } from '../lib/soundEffects';

// Renders the sticky top navigation bar on every subpage (on homepage, it is placed right below the Shammah header)
export default function TopNavGlobal() {
  const pathname = usePathname();

  // On the homepage, the top nav is rendered right below the Shammah title & avatar inside the sticky-header
  if (pathname === '/') {
    return null;
  }

  return (
    <div className="top-nav-global-sticky">
      <TopNav isHome={false} />
      <div className="header-search-widget-wrap">
        <div
          className="header-search-bar-widget"
          role="search"
          tabIndex={0}
          onClick={() => {
            playSound('reaction');
            window.dispatchEvent(new CustomEvent('shammah:open-search', { detail: { query: '' } }));
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              playSound('reaction');
              window.dispatchEvent(new CustomEvent('shammah:open-search', { detail: { query: '' } }));
            }
          }}
          aria-label="Search scriptures, sermons, topics, and churches"
          title="Search scriptures, sermons, topics, and churches (Press / or ⌘K)"
        >
          <Search size={16} className="search-bar-widget-icon" />
          <span className="search-bar-widget-placeholder">
            Search sermons, scriptures, topics, members...
          </span>
          <span className="search-bar-widget-badge">
            <kbd className="search-kbd">⌘K</kbd>
          </span>
        </div>
      </div>
    </div>
  );
}
