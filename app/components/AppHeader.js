'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Moon, Sun, Volume2, VolumeX, DownloadCloud, Search } from 'lucide-react';
import { useSession } from '../../lib/useSession';
import { isSoundEnabled, setSoundEnabled, playSound } from '../lib/soundEffects';
import { getOfflineItems } from '../lib/offlineSyncManager';
import { useOfflineIndicatorStatus } from '../lib/swFeedCache';
import TopNav from './TopNav';
import TopNavCollapsedControls from './TopNavCollapsedControls';
import UserAccountMenu from './UserAccountMenu';
import OfflineLibraryModal from './OfflineLibraryModal';

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    session,
    profile,
    canModerate,
    adminMode: sessionAdminMode,
    setAdminMode: setSessionAdminMode,
    ownedChurches,
    signOut,
  } = useSession();

  const [dark, setDark] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [offlineCount, setOfflineCount] = useState(0);
  const [showOfflineLibrary, setShowOfflineLibrary] = useState(false);
  const [activeSection, setActiveSection] = useState('all');
  const [adminMode, setAdminMode] = useState(false);

  // Scroll collapse behavior:
  // On non-Home routes, the header is ALWAYS collapsed.
  // On Home, collapses when scrolled down past 96px; restores when scrolled near top (< 16px).
  const [isScrolledDown, setIsScrolledDown] = useState(false);
  const isHome = pathname === '/';
  const isCollapsed = !isHome || isScrolledDown;

  const {
    isDisconnected,
    hasPendingSyncs,
    pendingSyncCount,
    dotColor,
  } = useOfflineIndicatorStatus();

  // Scroll listener with requestAnimationFrame and hysteresis to prevent oscillation
  useEffect(() => {
    if (pathname !== '/') {
      setIsScrolledDown(true);
      return;
    }

    let rafId = null;
    let lastCollapsed = typeof window !== 'undefined' ? window.scrollY > 96 : false;
    setIsScrolledDown(lastCollapsed);

    function handleScroll() {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const scrollY = window.scrollY || window.pageYOffset || 0;
        // Hysteresis: collapse at > 96px, expand at < 16px
        if (!lastCollapsed && scrollY > 96) {
          lastCollapsed = true;
          setIsScrolledDown(true);
        } else if (lastCollapsed && scrollY < 16) {
          lastCollapsed = false;
          setIsScrolledDown(false);
        }
      });
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [pathname]);

  // Sync internal adminMode with sessionAdminMode if provided
  useEffect(() => {
    if (sessionAdminMode !== undefined) {
      setAdminMode(sessionAdminMode);
    }
  }, [sessionAdminMode]);

  // Sync theme, sound, offline count, and listeners on mount
  useEffect(() => {
    // 1. Theme initialization
    const explicitMode =
      typeof window !== 'undefined'
        ? localStorage.getItem('shammah-theme-mode') || localStorage.getItem('shammah-theme')
        : null;
    const isDark = explicitMode ? explicitMode === 'dark' : true;
    setDark(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', isDark);

    function onThemeChange(e) {
      if (e.detail) {
        setDark(e.detail === 'dark');
      }
    }
    window.addEventListener('shammah:theme-change', onThemeChange);

    // 2. Sound state
    setSoundOn(isSoundEnabled());
    function onSoundToggle(e) {
      if (typeof e.detail === 'boolean') {
        setSoundOn(e.detail);
      }
    }
    window.addEventListener('shammah:sound-toggled', onSoundToggle);

    // 3. Offline count
    setOfflineCount(getOfflineItems().length);
    function onOfflineUpdate() {
      setOfflineCount(getOfflineItems().length);
    }
    window.addEventListener('shammah:offline-updated', onOfflineUpdate);

    // 4. Admin mode listener
    function onAdminModeToggle(e) {
      if (typeof e.detail === 'boolean') {
        setAdminMode(e.detail);
      }
    }
    window.addEventListener('shammah:admin-mode-toggled', onAdminModeToggle);

    // 5. Offline library modal trigger listener
    function onOpenOfflineModal() {
      setShowOfflineLibrary(true);
    }
    window.addEventListener('shammah:open-offline-library', onOpenOfflineModal);

    return () => {
      window.removeEventListener('shammah:theme-change', onThemeChange);
      window.removeEventListener('shammah:sound-toggled', onSoundToggle);
      window.removeEventListener('shammah:offline-updated', onOfflineUpdate);
      window.removeEventListener('shammah:admin-mode-toggled', onAdminModeToggle);
      window.removeEventListener('shammah:open-offline-library', onOpenOfflineModal);
    };
  }, []);

  // Sync activeSection with URL parameters and global events
  useEffect(() => {
    function syncSectionFromUrl() {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const sec = params.get('section');
        if (
          sec &&
          ['all', 'videos', 'podcasts', 'courses', 'polls', 'bible', 'challenges', 'games', 'rss', 'workspace'].includes(
            sec
          )
        ) {
          setActiveSection(sec);
        } else if (pathname === '/') {
          setActiveSection('all');
        }
      }
    }
    syncSectionFromUrl();

    function onSectionSet(e) {
      if (
        e.detail &&
        ['all', 'videos', 'podcasts', 'courses', 'polls', 'bible', 'challenges', 'games', 'rss', 'workspace'].includes(
          e.detail
        )
      ) {
        setActiveSection(e.detail);
      }
    }

    window.addEventListener('shammah:set-section', onSectionSet);
    window.addEventListener('shammah:section-changed', onSectionSet);
    window.addEventListener('popstate', syncSectionFromUrl);

    return () => {
      window.removeEventListener('shammah:set-section', onSectionSet);
      window.removeEventListener('shammah:section-changed', onSectionSet);
      window.removeEventListener('popstate', syncSectionFromUrl);
    };
  }, [pathname]);

  function handleToggleTheme() {
    playSound('themeToggle');
    const nextDark = !dark;
    setDark(nextDark);
    const themeVal = nextDark ? 'dark' : 'light';
    if (typeof window !== 'undefined') {
      localStorage.setItem('shammah-theme', themeVal);
      localStorage.setItem('shammah-theme-mode', themeVal);
    }
    document.documentElement.setAttribute('data-theme', themeVal);
    document.documentElement.classList.toggle('dark', nextDark);
    window.dispatchEvent(new CustomEvent('shammah:theme-change', { detail: themeVal }));
  }

  function handleToggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) playSound('reaction');
    window.dispatchEvent(new CustomEvent('shammah:sound-toggled', { detail: next }));
  }

  function handleSetAdminMode(action) {
    const next = typeof action === 'function' ? action(adminMode) : action;
    setAdminMode(next);
    if (setSessionAdminMode) {
      setSessionAdminMode(next);
    }
    window.dispatchEvent(new CustomEvent('shammah:admin-mode-toggled', { detail: next }));
  }

  function handleSelectSection(sec) {
    setActiveSection(sec);
    window.dispatchEvent(new CustomEvent('shammah:set-tab', { detail: 'home' }));
    window.dispatchEvent(new CustomEvent('shammah:set-section', { detail: sec }));
    if (pathname === '/') {
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }

  function handleOpenSearch() {
    playSound('reaction');
    window.dispatchEvent(new CustomEvent('shammah:open-search', { detail: { query: '' } }));
  }

  function handleOpenAuth(mode) {
    if (pathname === '/') {
      window.dispatchEvent(new CustomEvent('shammah:open-auth', { detail: mode }));
    } else {
      router.push(`/?auth=${mode}`);
    }
  }

  function handleOpenCreatePost() {
    if (pathname === '/') {
      window.dispatchEvent(new CustomEvent('shammah:open-create-post'));
    } else {
      router.push('/?compose=1');
    }
  }

  function handleOpenProfile() {
    if (pathname === '/') {
      window.dispatchEvent(new CustomEvent('shammah:open-profile'));
    } else {
      router.push('/settings');
    }
  }

  function handleOpenActivityLog() {
    window.dispatchEvent(new CustomEvent('shammah:open-activity-log'));
  }

  return (
    <>
      <div className="sticky-header">
        <header className="topbar">
          <div className="brand">
            <Link href="/" className="brand-text-wrap" style={{ textDecoration: 'none', color: 'inherit' }}>
              <h1 className="brand-mark">Shammah</h1>
              <span className="brand-subtext">The Lord is Here</span>
            </Link>
          </div>

          <div className="topbar-right">
            <div className="topbar-toggle-group">
              {/* 1. Theme toggle: Sun for light / Moon for dark */}
              <button
                type="button"
                className={`topbar-toggle-btn theme-toggle-btn ${dark ? 'is-dark' : 'is-light'}`}
                role="switch"
                aria-checked={dark}
                aria-label={dark ? 'Light mode (tap to switch to light mode)' : 'Dark mode (tap to switch to dark mode)'}
                title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                onClick={handleToggleTheme}
              >
                {dark ? (
                  <Moon size={18} className="theme-toggle-icon moon-icon text-amber-300" />
                ) : (
                  <Sun size={18} className="theme-toggle-icon sun-icon text-amber-500" />
                )}
              </button>

              {/* 2. Sound profile on/off toggle */}
              <button
                type="button"
                className={`topbar-toggle-btn sound-toggle-btn ${soundOn ? 'sound-on' : 'sound-off'}`}
                role="switch"
                aria-checked={soundOn}
                aria-label={soundOn ? 'Sound alerts on (tap to mute)' : 'Sound alerts muted (tap to enable)'}
                title={soundOn ? 'Mute sound alerts' : 'Enable sound alerts'}
                onClick={handleToggleSound}
              >
                {soundOn ? (
                  <Volume2 size={18} className="sound-toggle-icon sound-icon-active text-amber-600 dark:text-amber-400" />
                ) : (
                  <VolumeX size={18} className="sound-toggle-icon sound-icon-muted text-gray-400" />
                )}
              </button>

              {/* 3. Offline cache toggle */}
              <button
                type="button"
                className={`topbar-toggle-btn offline-cache-toggle-btn${offlineCount > 0 ? ' is-cached' : ''}`}
                title={
                  isDisconnected || hasPendingSyncs
                    ? hasPendingSyncs
                      ? `Offline — ${pendingSyncCount || 1} pending sync(s) queued. Click to open library.`
                      : 'Offline — Complete network disconnection detected by Service Worker. Click to open library.'
                    : offlineCount > 0
                      ? `✓ ${offlineCount} item${offlineCount > 1 ? 's' : ''} cached & available for offline viewing (30-day cache). Click to open library.`
                      : 'Offline Library: Save feeds & chapters for offline viewing'
                }
                aria-label="Offline Cached Content Status"
                onClick={() => {
                  playSound('reaction');
                  setShowOfflineLibrary(true);
                }}
              >
                <DownloadCloud size={17} className={offlineCount > 0 ? 'text-emerald-400' : 'text-gray-400'} />
                {isDisconnected || hasPendingSyncs ? (
                  <span
                    className={`inline-block w-2 h-2 rounded-full ml-1 animate-pulse ${
                      dotColor === 'yellow' ? 'bg-yellow-400' : 'bg-red-500'
                    }`}
                  />
                ) : (
                  offlineCount > 0 && <span className="topbar-offline-dot" />
                )}
              </button>

              {/* 4 & 5. Collapsed Search & Section Navigation Buttons (Shown when collapsed) */}
              {isCollapsed && (
                <TopNavCollapsedControls
                  activeSection={activeSection}
                  onSelectSection={handleSelectSection}
                />
              )}

              {/* Topbar 'Offline' indicator badge when disconnected */}
              {(isDisconnected || hasPendingSyncs) && (
                <span
                  role="status"
                  className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-900/90 text-white border border-white/15 shadow-sm"
                  title={
                    dotColor === 'yellow'
                      ? 'Yellow dot: Pending syncs waiting for network reconnection'
                      : 'Red dot: Complete network disconnection detected by Service Worker'
                  }
                >
                  <span
                    aria-hidden="true"
                    className={`w-2 h-2 rounded-full shrink-0 animate-pulse ${
                      dotColor === 'yellow' ? 'bg-yellow-400' : 'bg-red-500'
                    }`}
                  />
                  <span>
                    {dotColor === 'yellow'
                      ? `Offline · Pending (${pendingSyncCount || 1})`
                      : 'Offline'}
                  </span>
                </span>
              )}
            </div>

            {session ? (
              <UserAccountMenu
                session={session}
                profile={profile}
                canModerate={canModerate}
                adminMode={adminMode}
                setAdminMode={handleSetAdminMode}
                ownedChurches={ownedChurches}
                onOpenCreatePost={handleOpenCreatePost}
                onOpenProfile={handleOpenProfile}
                onOpenActivityLog={handleOpenActivityLog}
                onSignOut={signOut}
              />
            ) : (
              <div className="auth-header-actions">
                <button type="button" className="signin-btn" onClick={() => handleOpenAuth('signin')}>
                  Sign in
                </button>
                <button type="button" className="signup-btn" onClick={() => handleOpenAuth('signup')}>
                  Sign up
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Secondary Row: TopNav Sections + Search Bar Widget (collapses smoothly via CSS grid) */}
        <div
          className={`header-secondary-collapse-wrapper ${isCollapsed ? 'is-collapsed' : 'is-expanded'}`}
          aria-hidden={isCollapsed}
        >
          <div className="header-secondary-collapse-inner">
            <div className="header-secondary">
              <TopNav
                isHome={pathname === '/'}
                activeSection={activeSection}
                onSelectSection={handleSelectSection}
              />

              <div className="header-search-widget-wrap">
                <div
                  className="header-search-bar-widget"
                  role="search"
                  tabIndex={isCollapsed ? -1 : 0}
                  onClick={handleOpenSearch}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleOpenSearch();
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
          </div>
        </div>
      </div>

      {showOfflineLibrary && (
        <OfflineLibraryModal
          isOpen={showOfflineLibrary}
          onClose={() => setShowOfflineLibrary(false)}
        />
      )}
    </>
  );
}
