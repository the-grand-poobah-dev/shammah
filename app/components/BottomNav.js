'use client';
import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  Sparkles,
  ChevronUp,
  LayoutGrid,
  Film,
  FileText,
} from 'lucide-react';
import { playSound } from '../lib/soundEffects';
import { useSession } from '../../lib/useSession';
import { useLayoutMode } from '../lib/useLayoutMode';
import { useMainNav } from '../lib/useMainNav';
import StatusCreatorModal from './StatusCreatorModal';
import ReelCreatorModal from './ReelCreatorModal';

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { session, profile } = useSession();
  const layoutMode = useLayoutMode();
  const isDesktopOrTablet = layoutMode === 'tablet' || layoutMode === 'desktop';

  const {
    activeTab,
    unreadMessages,
    unreadAlerts,
    handleTabClick,
    getBadgeCount,
  } = useMainNav();

  const [menuOpen, setMenuOpen] = useState(false);
  const [highlightColor] = useState('#06b6d4');
  const [activeHighlightId, setActiveHighlightId] = useState(null);
  const [hoveredActionId, setHoveredActionId] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isContentHovered, setIsContentHovered] = useState(false);
  const [showStatusCreator, setShowStatusCreator] = useState(false);
  const [showReelCreator, setShowReelCreator] = useState(false);
  const [railFooterEl, setRailFooterEl] = useState(null);
  const menuRef = useRef(null);

  const currentUser = session?.user
    ? {
        id: session.user.id,
        name: profile?.display_name || session.user.email?.split('@')[0] || 'You',
        avatar_url: profile?.avatar_url,
        badge: profile?.badge,
        badge_verified: profile?.badge_verified,
        role: profile?.role,
      }
    : null;

  // Mount Quick Actions inside Left Rail footer on tablet/desktop via Portal
  useEffect(() => {
    if (!isDesktopOrTablet || typeof document === 'undefined') {
      setRailFooterEl(null);
      return;
    }

    function findFooter() {
      const el = document.getElementById('dl-rail-footer');
      if (el) {
        setRailFooterEl(el);
        return true;
      }
      return false;
    }

    if (!findFooter()) {
      const timer = setTimeout(findFooter, 50);
      return () => clearTimeout(timer);
    }
  }, [isDesktopOrTablet]);

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
      id: 'status',
      label: 'Post a 24-Hour Status Story',
      desc: 'Share a photo, video or scripture expiring in 24 hours',
      icon: Sparkles,
      color: '#ec4899', // Pink / Rose
      action: handleOpenCreateStatus,
    },
    {
      id: 'reel',
      label: 'Post a Reel',
      desc: 'Short vertical video testimony or praise clip',
      icon: Film,
      color: '#8b5cf6', // Violet
      action: handleOpenCreateReel,
    },
    {
      id: 'sermon-note',
      label: 'Take Sermon Note',
      desc: 'Capture points & view scriptures',
      icon: FileText,
      color: '#f59e0b', // Sanctuary Amber
      action: handleOpenSermonNote,
    },
    {
      id: 'workspace',
      label: 'My Workspace',
      desc: 'Calendar, slides, forms, notes, video rooms & prayer wall',
      icon: LayoutGrid,
      color: '#10b981', // Emerald
      action: handleOpenWorkspace,
    },
  ];

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
        target.closest(
          '.post-card, .feed-container, .home-highlights, .reels-shelf-container, .explore-container, .churches-container, .sermon-notes-section'
        )
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

  // Listen for global open requests for status and reel creators
  useEffect(() => {
    function onOpenCreateStatus() {
      if (!session?.user?.id) {
        window.dispatchEvent(new CustomEvent('shammah:open-auth', { detail: 'signin' }));
      } else {
        setShowStatusCreator(true);
      }
    }
    function onOpenCreateReel() {
      if (!session?.user?.id) {
        window.dispatchEvent(new CustomEvent('shammah:open-auth', { detail: 'signin' }));
      } else {
        setShowReelCreator(true);
      }
    }
    window.addEventListener('shammah:open-create-status', onOpenCreateStatus);
    window.addEventListener('shammah:open-create-reel', onOpenCreateReel);
    return () => {
      window.removeEventListener('shammah:open-create-status', onOpenCreateStatus);
      window.removeEventListener('shammah:open-create-reel', onOpenCreateReel);
    };
  }, [session?.user?.id]);

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

  function handleOpenCreateStatus() {
    setMenuOpen(false);
    playSound('reaction');
    if (!session?.user?.id) {
      window.dispatchEvent(new CustomEvent('shammah:open-auth', { detail: 'signin' }));
      return;
    }
    setShowStatusCreator(true);
  }

  function handleOpenCreateReel() {
    setMenuOpen(false);
    playSound('reaction');
    if (!session?.user?.id) {
      window.dispatchEvent(new CustomEvent('shammah:open-auth', { detail: 'signin' }));
      return;
    }
    setShowReelCreator(true);
  }

  function handleOpenChatbot() {
    setMenuOpen(false);
    playSound('reaction');
    window.dispatchEvent(new CustomEvent('shammah:open-chatbot'));
  }

  function handleOpenSermonNote() {
    setMenuOpen(false);
    playSound('reaction');
    if (pathname === '/') {
      window.dispatchEvent(new CustomEvent('shammah:set-tab', { detail: 'home' }));
      window.dispatchEvent(new CustomEvent('shammah:set-section', { detail: 'bible' }));
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('shammah:open-sermon-note'));
      }, 80);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      router.push('/?section=bible&note=1');
    }
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

  // Floating Actions Node (Scroll-to-top button + Quick Actions (+) button and menu)
  const floatingActionsNode = (
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

      {/* Floating Circular Plus Action Button Container */}
      <div className="floating-plus-btn-container">
        {/* Quick Actions Speed-Dial Menu */}
        {menuOpen && (
          <div className="floating-quick-menu neon-glow-modal" role="menu">
            <div className="floating-quick-header">
              <div className="floating-quick-title-wrap">
                <Sparkles size={15} style={{ color: highlightColor }} />
                <span>Quick Actions</span>
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

            {/* Quick Actions List */}
            <div className="floating-quick-actions-list">
              {QUICK_ACTIONS.map((item) => {
                const Icon = item.icon;
                const isItemActive = activeHighlightId === item.id;
                const isHovered = hoveredActionId === item.id;
                const effectiveColor = item.color;
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
                        borderColor: isItemActive || isHovered ? effectiveColor : undefined,
                      }}
                      onMouseEnter={() => setHoveredActionId(item.id)}
                      onMouseLeave={() => setHoveredActionId(null)}
                      onFocus={() => setHoveredActionId(item.id)}
                      onBlur={() => setHoveredActionId(null)}
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
                      <span
                        className={`item-color-picker-box${isItemActive || isHovered ? ' active-picker' : ''}`}
                        style={{
                          '--picker-color': effectiveColor,
                          borderColor: isItemActive || isHovered ? effectiveColor : undefined,
                        }}
                      >
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
          title={menuOpen ? 'Close menu' : 'Quick Actions & Create Post'}
        >
          <span className="floating-neon-ring" aria-hidden="true" />
          <span className="floating-plus-inner">
            <Plus size={18} strokeWidth={2.8} className={menuOpen ? 'rotate-icon' : ''} />
          </span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* On tablet/desktop, portal floating actions to the left rail footer; on phones, render in place */}
      {railFooterEl && isDesktopOrTablet
        ? createPortal(floatingActionsNode, railFooterEl)
        : floatingActionsNode}

      {/* Phone Bottom Navigation Bar (Hidden on >=768px via desktop-layout.css) */}
      <nav className="bottom-nav" aria-label="Main Navigation">
        <div className="bottom-nav-pill">
          {/* Very thin rotating neon glow that snakes around */}
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
              {getBadgeCount('home') > 0 && activeTab !== 'home' && (
                <span className="tab-badge-num">{getBadgeCount('home')}</span>
              )}
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
              {getBadgeCount('churches') > 0 && (
                <span className="tab-badge-num">{getBadgeCount('churches')}</span>
              )}
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
              {((getBadgeCount('polls') || 0) + (getBadgeCount('fundraisers') || 0) + (getBadgeCount('challenges') || 0) + (getBadgeCount('games') || 0)) > 0 && activeTab !== 'menu' && (
                <span className="tab-badge-num">
                  {(getBadgeCount('polls') || 0) + (getBadgeCount('fundraisers') || 0) + (getBadgeCount('challenges') || 0) + (getBadgeCount('games') || 0)}
                </span>
              )}
            </span>
            <span className="tab-label">Explore</span>
          </button>
        </div>
      </nav>

      {/* 24-Hour Status Story Creator Modal */}
      {showStatusCreator && (
        <StatusCreatorModal
          currentUser={currentUser}
          onClose={() => setShowStatusCreator(false)}
          onCreated={() => setShowStatusCreator(false)}
        />
      )}

      {/* Faith Reel Creator Modal */}
      {showReelCreator && (
        <ReelCreatorModal
          isOpen={showReelCreator}
          onClose={() => setShowReelCreator(false)}
          session={session}
          profile={profile}
          onCreated={() => setShowReelCreator(false)}
        />
      )}
    </>
  );
}
