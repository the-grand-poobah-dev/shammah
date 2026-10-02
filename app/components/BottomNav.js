'use client';
import { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  MessageCircle,
  Bell,
  Compass,
  Plus,
  Building2,
  FileText,
  Sparkles,
  Gamepad2,
  PenSquare,
  BarChart3,
  X,
  Bot,
  Flame,
  DownloadCloud,
  Tv,
} from 'lucide-react';
import { getTotalUnreadMessagesCount } from '../lib/inboxManager';
import { getUnreadNotificationCount } from '../lib/notificationsManager';
import { playSound } from '../lib/soundEffects';

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('home');
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  function syncBadges() {
    setUnreadMessages(getTotalUnreadMessagesCount());
    setUnreadAlerts(getUnreadNotificationCount());
  }

  useEffect(() => {
    syncBadges();

    function onBadgeUpdate() {
      syncBadges();
    }
    window.addEventListener('shammah:inbox-updated', onBadgeUpdate);
    window.addEventListener('shammah:notifications-updated', onBadgeUpdate);
    return () => {
      window.removeEventListener('shammah:inbox-updated', onBadgeUpdate);
      window.removeEventListener('shammah:notifications-updated', onBadgeUpdate);
    };
  }, []);

  useEffect(() => {
    if (!pathname) return;

    if (pathname.startsWith('/churches')) {
      setActiveTab('churches');
    } else if (pathname.startsWith('/categories') || pathname.startsWith('/settings')) {
      setActiveTab('menu');
    } else if (pathname === '/') {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get('tab');
        if (tabParam && ['home', 'churches', 'messages', 'alerts', 'menu'].includes(tabParam)) {
          setActiveTab(tabParam);
        } else {
          setActiveTab('home');
        }
      }
    }
  }, [pathname]);

  // Listen to tab changes from the home feed
  useEffect(() => {
    function handleTabEvent(e) {
      if (e.detail) {
        setActiveTab(e.detail);
      }
    }
    window.addEventListener('shammah:tab-changed', handleTabEvent);
    return () => window.removeEventListener('shammah:tab-changed', handleTabEvent);
  }, []);

  // Close floating action menu on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      window.addEventListener('pointerdown', handleClickOutside);
    }
    return () => window.removeEventListener('pointerdown', handleClickOutside);
  }, [menuOpen]);

  function handleTabClick(tabId, href) {
    setActiveTab(tabId);
    setMenuOpen(false);
    playSound('reaction');

    if (pathname === '/') {
      window.dispatchEvent(new CustomEvent('shammah:set-tab', { detail: tabId }));
      if (tabId === 'home') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      if (tabId === 'home') {
        router.push('/');
      } else {
        router.push(href);
      }
    }
  }

  function handleCreatePost() {
    setMenuOpen(false);
    playSound('reaction');
    if (pathname === '/') {
      window.dispatchEvent(new CustomEvent('shammah:set-tab', { detail: 'home' }));
      window.dispatchEvent(new CustomEvent('shammah:open-create-post'));
      const el = document.getElementById('compose-box');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => el.focus(), 150);
      }
    } else {
      router.push('/?compose=1');
    }
  }

  function handleTakeSermonNote() {
    setMenuOpen(false);
    playSound('reaction');
    if (pathname === '/') {
      window.dispatchEvent(new CustomEvent('shammah:set-tab', { detail: 'home' }));
      window.dispatchEvent(new CustomEvent('shammah:set-section', { detail: 'bible' }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      router.push('/?section=bible');
    }
  }

  function handleOpenChallenges() {
    setMenuOpen(false);
    playSound('reaction');
    if (pathname === '/') {
      window.dispatchEvent(new CustomEvent('shammah:set-tab', { detail: 'home' }));
      window.dispatchEvent(new CustomEvent('shammah:set-section', { detail: 'challenges' }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      router.push('/?section=challenges');
    }
  }

  function handleOpenArcade() {
    setMenuOpen(false);
    playSound('reaction');
    if (pathname === '/') {
      window.dispatchEvent(new CustomEvent('shammah:set-tab', { detail: 'home' }));
      window.dispatchEvent(new CustomEvent('shammah:set-section', { detail: 'games' }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      router.push('/?section=games');
    }
  }

  function handleOpenPolls() {
    setMenuOpen(false);
    playSound('reaction');
    if (pathname === '/') {
      window.dispatchEvent(new CustomEvent('shammah:set-tab', { detail: 'home' }));
      window.dispatchEvent(new CustomEvent('shammah:set-section', { detail: 'polls' }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      router.push('/?section=polls');
    }
  }

  function handleOpenChatbot() {
    setMenuOpen(false);
    playSound('reaction');
    window.dispatchEvent(new CustomEvent('shammah:open-chatbot'));
  }

  function handleOpenOfflineLibrary() {
    setMenuOpen(false);
    playSound('reaction');
    window.dispatchEvent(new CustomEvent('shammah:open-offline-library'));
  }

  function handleOpenProjection() {
    setMenuOpen(false);
    playSound('reaction');
    window.dispatchEvent(new CustomEvent('shammah:open-projection', { detail: { type: 'course' } }));
  }

  return (
    <>
      {/* Floating Circular Plus Action Button on Bottom Left above Bottom Nav */}
      <div className="floating-plus-btn-wrap" ref={menuRef}>
        {/* Quick Actions Speed-Dial Menu */}
        {menuOpen && (
          <div className="floating-quick-menu neon-glow-modal" role="menu">
            <div className="floating-quick-header">
              <span>Quick Fellowship Actions</span>
              <button
                type="button"
                className="floating-menu-close"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
              >
                <X size={14} />
              </button>
            </div>

            {/* Circular Pop-Up Shammah AI Chatbot Trigger */}
            <div
              className="circular-bot-popup-hero"
              onClick={handleOpenChatbot}
              role="button"
              tabIndex={0}
              title="Open Shammah AI Chatbot"
            >
              <div className="circular-bot-ring-pulse">
                <Flame size={22} className="text-amber-400" />
                <span className="bot-active-dot" />
              </div>
              <div className="circular-bot-hero-text">
                <div className="circular-bot-title-line">
                  <strong>Shammah AI Chatbot</strong>
                  <span className="live-sparkle-pill">AI Companion</span>
                </div>
                <small>Pastoral counsel, study outlines &amp; prayer</small>
              </div>
            </div>

            <button
              type="button"
              className="quick-action-item"
              onClick={handleCreatePost}
              role="menuitem"
            >
              <span className="quick-action-icon post">
                <PenSquare size={16} />
              </span>
              <div className="quick-action-text">
                <strong>Create Post / Testimony</strong>
                <small>Post to feed or anonymously</small>
              </div>
            </button>

            <button
              type="button"
              className="quick-action-item"
              onClick={handleOpenProjection}
              role="menuitem"
            >
              <span className="quick-action-icon projection">
                <Tv size={16} />
              </span>
              <div className="quick-action-text">
                <strong>Sanctuary Screen Projection</strong>
                <small>Project courses, polls &amp; scriptures</small>
              </div>
            </button>

            <button
              type="button"
              className="quick-action-item"
              onClick={handleOpenOfflineLibrary}
              role="menuitem"
            >
              <span className="quick-action-icon offline">
                <DownloadCloud size={16} />
              </span>
              <div className="quick-action-text">
                <strong>Offline Library &amp; Sync</strong>
                <small>30-day downloaded feeds &amp; audio</small>
              </div>
            </button>

            <button
              type="button"
              className="quick-action-item"
              onClick={handleTakeSermonNote}
              role="menuitem"
            >
              <span className="quick-action-icon note">
                <FileText size={16} />
              </span>
              <div className="quick-action-text">
                <strong>Take Sermon Note</strong>
                <small>Capture points with complete NIV Bible</small>
              </div>
            </button>

            <button
              type="button"
              className="quick-action-item"
              onClick={handleOpenChallenges}
              role="menuitem"
            >
              <span className="quick-action-icon challenge">
                <Sparkles size={16} />
              </span>
              <div className="quick-action-text">
                <strong>Join Faith Challenge</strong>
                <small>#ScriptureIn60s, Worship Covers</small>
              </div>
            </button>

            <button
              type="button"
              className="quick-action-item"
              onClick={handleOpenArcade}
              role="menuitem"
            >
              <span className="quick-action-icon arcade">
                <Gamepad2 size={16} />
              </span>
              <div className="quick-action-text">
                <strong>Faith Champions Arcade</strong>
                <small>Kids, Teens &amp; Youth Offline Games</small>
              </div>
            </button>

            <button
              type="button"
              className="quick-action-item"
              onClick={handleOpenPolls}
              role="menuitem"
            >
              <span className="quick-action-icon poll">
                <BarChart3 size={16} />
              </span>
              <div className="quick-action-text">
                <strong>Question Surveys &amp; Polls</strong>
                <small>Sermon &amp; fellowship icebreakers</small>
              </div>
            </button>
          </div>
        )}

        <button
          type="button"
          className={`floating-plus-btn${menuOpen ? ' open' : ''}`}
          onClick={() => {
            playSound('reaction');
            setMenuOpen(!menuOpen);
          }}
          aria-label={menuOpen ? 'Close actions menu' : 'Open actions menu'}
          title={menuOpen ? 'Close menu' : 'Quick Fellowship Actions & Create Post'}
        >
          <span className="floating-neon-ring" aria-hidden="true" />
          <span className="floating-plus-inner">
            <Plus size={18} strokeWidth={2.8} className={menuOpen ? 'rotate-icon' : ''} />
          </span>
        </button>
      </div>

      <nav className="bottom-nav" aria-label="Main Navigation">
        <div className="bottom-nav-pill">
          {/* Very thin rotating neon glow that snakes around (broken in two places) */}
          <span className="bottom-nav-snake-glow" aria-hidden="true" />

          {/* Tab 1: Home */}
          <button
            type="button"
            className={`tab-btn${activeTab === 'home' ? ' active' : ''}`}
            onClick={() => handleTabClick('home', '/')}
            aria-label="Home"
            aria-current={activeTab === 'home' ? 'page' : undefined}
          >
            <span className="tab-icon-wrap">
              <Home size={19} strokeWidth={activeTab === 'home' ? 2.4 : 1.8} className="tab-icon" />
            </span>
            <span className="tab-label">Home</span>
          </button>

          {/* Tab 2: Messages */}
          <button
            type="button"
            className={`tab-btn${activeTab === 'messages' ? ' active' : ''}`}
            onClick={() => handleTabClick('messages', '/?tab=messages')}
            aria-label="Messages"
            aria-current={activeTab === 'messages' ? 'page' : undefined}
          >
            <span className="tab-icon-wrap">
              <MessageCircle size={19} strokeWidth={activeTab === 'messages' ? 2.4 : 1.8} className="tab-icon" />
              {unreadMessages > 0 && <span className="tab-badge-num">{unreadMessages}</span>}
            </span>
            <span className="tab-label">Messages</span>
          </button>

          {/* Tab 3: Institutions */}
          <button
            type="button"
            className={`tab-btn${activeTab === 'churches' ? ' active' : ''}`}
            onClick={() => handleTabClick('churches', '/?tab=churches')}
            aria-label="Institutions"
            aria-current={activeTab === 'churches' ? 'page' : undefined}
          >
            <span className="tab-icon-wrap">
              <Building2 size={19} strokeWidth={activeTab === 'churches' ? 2.4 : 1.8} className="tab-icon" />
            </span>
            <span className="tab-label">Institutions</span>
          </button>

          {/* Tab 4: Alerts */}
          <button
            type="button"
            className={`tab-btn${activeTab === 'alerts' ? ' active' : ''}`}
            onClick={() => handleTabClick('alerts', '/?tab=alerts')}
            aria-label="Alerts"
            aria-current={activeTab === 'alerts' ? 'page' : undefined}
          >
            <span className="tab-icon-wrap">
              <Bell size={19} strokeWidth={activeTab === 'alerts' ? 2.4 : 1.8} className="tab-icon" />
              {unreadAlerts > 0 && <span className="tab-badge-num">{unreadAlerts}</span>}
            </span>
            <span className="tab-label">Alerts</span>
          </button>

          {/* Tab 5: Explore */}
          <button
            type="button"
            className={`tab-btn${activeTab === 'menu' ? ' active' : ''}`}
            onClick={() => handleTabClick('menu', '/?tab=menu')}
            aria-label="Explore"
            aria-current={activeTab === 'menu' ? 'page' : undefined}
          >
            <span className="tab-icon-wrap">
              <Compass size={19} strokeWidth={activeTab === 'menu' ? 2.4 : 1.8} className="tab-icon" />
            </span>
            <span className="tab-label">Explore</span>
          </button>
        </div>
      </nav>
    </>
  );
}
