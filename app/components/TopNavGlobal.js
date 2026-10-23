'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Moon, Sun, Volume2, VolumeX, DownloadCloud } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { isSoundEnabled, setSoundEnabled, playSound } from '../lib/soundEffects';
import { getOfflineItems } from '../lib/offlineSyncManager';
import { useOfflineIndicatorStatus } from '../lib/swFeedCache';
import Avatar from './Avatar';
import UserAccountMenu from './UserAccountMenu';
import TopNavCollapsedControls from './TopNavCollapsedControls';
import OfflineLibraryModal from './OfflineLibraryModal';

// Renders the sticky top navigation strip in the default collapsed circular state on all subpages.
// On the Home page (pathname === '/'), app/page.js handles its own interactive scroll collapse/expansion.
export default function TopNavGlobal() {
  const pathname = usePathname();
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [dark, setDark] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [offlineCount, setOfflineCount] = useState(0);
  const [showOfflineLibrary, setShowOfflineLibrary] = useState(false);
  const [mounted, setMounted] = useState(false);

  const {
    isDisconnected,
    hasPendingSyncs,
    pendingSyncCount,
    dotColor,
  } = useOfflineIndicatorStatus();

  useEffect(() => {
    setMounted(true);
    setSoundOn(isSoundEnabled());
    const explicitMode = typeof window !== 'undefined' ? localStorage.getItem('shammah-theme-mode') : null;
    const isDark = explicitMode ? explicitMode === 'dark' : true;
    setDark(isDark);
    setOfflineCount(getOfflineItems().length);

    function onOfflineUpdate() {
      setOfflineCount(getOfflineItems().length);
    }
    window.addEventListener('shammah:offline-updated', onOfflineUpdate);

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user?.id) {
        supabase
          .from('profiles')
          .select('*')
          .eq('id', data.session.user.id)
          .maybeSingle()
          .then(({ data: prof }) => {
            if (prof) setProfile(prof);
          });
      }
    });

    const { data: authSub } = supabase.auth.onAuthStateChange((_, s) => {
      setSession(s);
      if (s?.user?.id) {
        supabase
          .from('profiles')
          .select('*')
          .eq('id', s.user.id)
          .maybeSingle()
          .then(({ data: prof }) => {
            if (prof) setProfile(prof);
          });
      } else {
        setProfile(null);
      }
    });

    return () => {
      window.removeEventListener('shammah:offline-updated', onOfflineUpdate);
      authSub?.subscription?.unsubscribe();
    };
  }, []);

  // On the Home page, app/page.js handles the full layout and smooth scroll transitions
  if (pathname === '/') {
    return null;
  }

  function handleToggleTheme() {
    playSound('reaction');
    const nextDark = !dark;
    setDark(nextDark);
    if (typeof window !== 'undefined') {
      localStorage.setItem('shammah-theme-mode', nextDark ? 'dark' : 'light');
    }
    document.documentElement.setAttribute('data-theme', nextDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', nextDark);
    window.dispatchEvent(new CustomEvent('shammah:theme-change', { detail: nextDark ? 'dark' : 'light' }));
  }

  function handleToggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) playSound('reaction');
  }

  return (
    <>
      <div className="sticky-header global-sticky-header">
        <header className="topbar">
          <div className="brand">
            <Link href="/" className="brand-text-wrap" style={{ textDecoration: 'none', color: 'inherit' }}>
              <h1 className="brand-mark">Shammah</h1>
              <span className="brand-subtext">The Lord is Here</span>
            </Link>
          </div>

          <div className="topbar-right">
            <div className="topbar-toggle-group">
              {/* 1. Theme toggle */}
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

              {/* 2. Sound toggle */}
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

              {/* 3. Offline cache */}
              <button
                type="button"
                className={`topbar-toggle-btn offline-cache-toggle-btn${offlineCount > 0 ? ' is-cached' : ''}`}
                title={
                  isDisconnected || hasPendingSyncs
                    ? hasPendingSyncs
                      ? `Offline — ${pendingSyncCount || 1} pending sync(s) queued. Click to open library.`
                      : 'Offline — Complete network disconnection detected. Click to open library.'
                    : offlineCount > 0
                      ? `✓ ${offlineCount} item${offlineCount > 1 ? 's' : ''} cached & available offline. Click to open library.`
                      : 'Offline Library: Save feeds & chapters for offline viewing'
                }
                aria-label="Offline Cached Content Status"
                onClick={() => {
                  playSound('reaction');
                  setShowOfflineLibrary(true);
                }}
              >
                <DownloadCloud size={17} className={offlineCount > 0 ? 'text-emerald-400' : 'text-gray-400'} />
                {(isDisconnected || hasPendingSyncs) ? (
                  <span
                    className={`inline-block w-2 h-2 rounded-full ml-1 animate-pulse ${
                      dotColor === 'yellow' ? 'bg-yellow-400' : 'bg-red-500'
                    }`}
                  />
                ) : (
                  offlineCount > 0 && <span className="topbar-offline-dot" />
                )}
              </button>

              {/* 4 & 5. Circular Search button and Circular Top-Nav button */}
              <TopNavCollapsedControls />

              {/* Offline indicator badge when disconnected */}
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
                onOpenProfile={() => {
                  if (typeof window !== 'undefined') window.location.href = '/settings';
                }}
                onSignOut={() => supabase.auth.signOut()}
              />
            ) : (
              <div className="auth-header-actions">
                <Link href="/?auth=signin" className="signin-btn" style={{ textDecoration: 'none' }}>
                  Sign in
                </Link>
                <Link href="/?auth=signup" className="signup-btn" style={{ textDecoration: 'none' }}>
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </header>
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
