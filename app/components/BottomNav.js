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
  PenSquare,
  X,
  Flame,
  Tv,
  Sparkles,
  ChevronUp,
  Calendar,
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
  const [highlightColor] = useState('#06b6d4');
  const [activeHighlightId, setActiveHighlightId] = useState(null);
  const [hoveredActionId, setHoveredActionId] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isContentHovered, setIsContentHovered] = useState(false);
  const menuRef = useRef(null);

  const QUICK_ACTIONS = [
    {
      id: 'post',
      label: 'Create Post / Testimony',
      desc: 'Post to feed or anonymously',
      icon: PenSquare,
      color: '#0ea5e9', // Sky Cyan
      action: handleCreatePost,
    },
    {
      id: 'projection',
      label: 'Sanctuary Screen Projection',
      desc: 'Project courses, polls & scriptures',
      icon: Tv,
      color: '#f59e0b', // Sanctuary Gold
      action: handleOpenProjection,
    },
    {
      id: 'workspace',
      label: 'Google Workspace & Firebase Hub',
      desc: 'Slides, Forms, Keep, Calendar, Meet, Classroom, Tasks & Chat',
      icon: Calendar,
      color: '#10b981', // Emerald
      action: handleOpenWorkspace,
    },
  ];

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

  // Track scroll direction: show Move to Top button only when intending to scroll back upwards
  useEffect(() => {
    let lastY = typeof window !== 'undefined' ? window.scrollY : 0;
    let ticking = false;

    function handleScroll() {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY;
          if (currentY > 150) {
            if (currentY < lastY - 4) {
              // Scrolling upwards
              setShowScrollTop(true);
            } else if (currentY > lastY + 5) {
              // Scrolling downwards
              setShowScrollTop(false);
            }
          } else {
            // Near top
            setShowScrollTop(false);
          }
          lastY = currentY;
          ticking = false;
        });
        ticking = true;
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Disappear when user hovers over posted content/cards
  useEffect(() => {
    function handleContentHover(e) {
      const target = e.target;
      if (
        target &&
        target.closest &&
        target.closest('.post-card, .feed-container, .home-highlights, .reels-shelf-container, .explore-container, .churches-container, .sermon-notes-section')
      ) {
        setIsContentHovered(true);
      } else {
        setIsContentHovered(false);
      }
    }

    function handleMouseLeave() {
      setIsContentHovered(false);
    }

    document.addEventListener('mouseover', handleContentHover, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      document.removeEventListener('mouseover', handleContentHover);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  function handleScrollToTop() {
    playSound('reaction');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setShowScrollTop(false);
  }

  const isScrollTopVisible = showScrollTop && !isContentHovered;

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

  function handleOpenChatbot() {
    setMenuOpen(false);
    playSound('reaction');
    window.dispatchEvent(new CustomEvent('shammah:open-chatbot'));
  }

  function handleOpenProjection() {
    setMenuOpen(false);
    playSound('reaction');
    window.dispatchEvent(new CustomEvent('shammah:open-projection', { detail: { type: 'course' } }));
  }

  function handleOpenWorkspace() {
    setMenuOpen(false);
    playSound('reaction');
    if (pathname === '/') {
      window.dispatchEvent(new CustomEvent('shammah:set-tab', { detail: 'home' }));
      window.dispatchEvent(new CustomEvent('shammah:set-section', { detail: 'workspace' }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      router.push('/?section=workspace');
    }
  }

  return (
    <>
      {/* Floating Action Buttons Wrap on Bottom Left */}
      <div className="floating-left-actions-wrap" ref={menuRef}>
        {/* Move to Top Icon (Placed Above the Plus Icon) */}
        <button
          type="button"
          className={`floating-scroll-top-btn${isScrollTopVisible ? ' is-visible' : ''}`}
          onClick={handleScrollToTop}
          aria-label="Scroll back to top"
          title="Scroll to top of feed"
        >
          <span className="floating-neon-ring" aria-hidden="true" />
          <span className="floating-scroll-top-inner">
            <ChevronUp size={20} strokeWidth={2.8} />
          </span>
        </button>

        {/* Floating Circular Plus Action Button Container (Placed Directly Above Bottom Nav Bar) */}
        <div className="floating-plus-btn-container">
          {/* Quick Actions Speed-Dial Menu */}
          {menuOpen && (
            <div className="floating-quick-menu neon-glow-modal" role="menu">
              <div className="floating-quick-header">
                <div className="floating-quick-title-wrap">
                  <Sparkles size={15} style={{ color: highlightColor }} />
                  <span>Quick Fellowship Actions</span>
                </div>
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
                style={{ '--sec-color': highlightColor }}
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

              {/* Quick Actions with Different-Color Picker Boxes */}
              <div className="floating-quick-actions-list">
                {QUICK_ACTIONS.map((item) => {
                  const Icon = item.icon;
                  const isItemActive = activeHighlightId === item.id;
                  const effectiveColor = isItemActive ? highlightColor : item.color;
                  return (
                    <div
                      key={item.id}
                      className={`quick-action-row-wrap${isItemActive ? ' is-active-row' : ''}`}
                    >
                      <button
                        type="button"
                        className={`quick-action-item explore-channel-card${isItemActive ? ' item-active' : ''}`}
                        style={{
                          '--sec-color': effectiveColor,
                          borderColor: effectiveColor,
                        }}
                        onClick={() => {
                          setActiveHighlightId(item.id);
                          item.action();
                        }}
                        role="menuitem"
                      >
                        <span className="channel-icon-wrap" style={{ '--sec-color': effectiveColor }}>
                          <Icon size={17} />
                        </span>
                        <div className="channel-meta">
                          <strong>{item.label}</strong>
                          <small>{item.desc}</small>
                        </div>
                        <span className="item-color-picker-box" style={{ '--picker-color': effectiveColor, borderColor: effectiveColor }}>
                          <span className="picker-box-swatch" style={{ background: effectiveColor }} />
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
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
