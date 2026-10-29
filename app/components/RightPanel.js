'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import {
  MessageCircle,
  Bell,
  Compass,
  CheckCheck,
  Maximize2,
  X,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { useSidePanel } from '../lib/useSidePanel';
import { useSession } from '../../lib/useSession';
import { useLayoutMode } from '../lib/useLayoutMode';
import { getTotalUnreadMessagesCount } from '../lib/inboxManager';
import { getUnreadNotificationCount } from '../lib/notificationsManager';
import { isDarkThemeActive, toggleTheme } from '../lib/themeHelper';
import { playSound } from '../lib/soundEffects';
import InboxView from './InboxView';
import NotificationsView from './NotificationsView';
import ExploreView from './ExploreView';

const PANEL_TABS = [
  {
    id: 'messages',
    label: 'Chats',
    title: 'Messages & Chats',
    icon: MessageCircle,
    color: '#0ea5e9',
    complementColor: '#a855f7',
  },
  {
    id: 'alerts',
    label: 'Alerts',
    title: 'Notifications & Alerts',
    icon: Bell,
    color: '#ec4899',
    complementColor: '#8b5cf6',
  },
  {
    id: 'explore',
    label: 'Explore',
    title: 'Explore Shammah',
    icon: Compass,
    color: '#10b981',
    complementColor: '#06b6d4',
  },
];

export default function RightPanel() {
  const pathname = usePathname();
  const layoutMode = useLayoutMode();
  const isTablet = layoutMode === 'tablet';

  const {
    activePanel,
    openPanel,
    closePanel,
    isCollapsed,
    initialConversationId,
  } = useSidePanel();
  const { session, profile, signOut } = useSession();

  const isDrawerOpen = isTablet && Boolean(activePanel) && !isCollapsed;

  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [dark, setDark] = useState(true);
  const [expandedModal, setExpandedModal] = useState(null); // 'messages' | 'alerts' | null

  // Lazy mounting state: only mount a view once it is opened for the first time
  const [mountedViews, setMountedViews] = useState({
    messages: true, // Default active panel
    alerts: false,
    explore: false,
  });

  const panelBodyRef = useRef(null);
  const drawerPanelRef = useRef(null);
  const triggerFocusRef = useRef(null);
  const touchStartXRef = useRef(null);
  const touchStartYRef = useRef(null);
  const messagesWrapRef = useRef(null);
  const alertsWrapRef = useRef(null);
  const exploreWrapRef = useRef(null);

  // Sync unread counts
  const syncBadges = useCallback(async () => {
    try {
      const msgCount = await getTotalUnreadMessagesCount();
      setUnreadMessages(Number(msgCount) || 0);
    } catch {
      setUnreadMessages(0);
    }
    setUnreadAlerts(getUnreadNotificationCount());
  }, []);

  useEffect(() => {
    syncBadges();
    setDark(isDarkThemeActive());

    function onBadgeUpdate() {
      syncBadges();
    }
    function onThemeChange(e) {
      if (e.detail) {
        setDark(e.detail === 'dark');
      } else {
        setDark(isDarkThemeActive());
      }
    }

    window.addEventListener('shammah:inbox-updated', onBadgeUpdate);
    window.addEventListener('shammah:notifications-updated', onBadgeUpdate);
    window.addEventListener('shammah:theme-change', onThemeChange);
    return () => {
      window.removeEventListener('shammah:inbox-updated', onBadgeUpdate);
      window.removeEventListener('shammah:notifications-updated', onBadgeUpdate);
      window.removeEventListener('shammah:theme-change', onThemeChange);
    };
  }, [syncBadges]);

  // Keep track of mounted views when activePanel changes
  useEffect(() => {
    if (activePanel && !mountedViews[activePanel]) {
      setMountedViews((prev) => ({ ...prev, [activePanel]: true }));
    }
  }, [activePanel, mountedViews]);

  // Close tablet drawer on route change
  useEffect(() => {
    if (isTablet && isDrawerOpen) {
      closePanel();
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle tablet drawer focus trap, Esc key & focus restoration
  useEffect(() => {
    if (!isTablet || !isDrawerOpen) return;

    // Remember the element that had focus before drawer opened
    triggerFocusRef.current = document.activeElement;

    // Focus the first interactive control inside the drawer
    const timer = setTimeout(() => {
      const focusable = drawerPanelRef.current?.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable && focusable.length > 0) {
        focusable[0].focus();
      }
    }, 60);

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closePanel();
        return;
      }

      if (e.key === 'Tab') {
        const focusableEls = drawerPanelRef.current?.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusableEls || focusableEls.length === 0) return;

        const first = focusableEls[0];
        const last = focusableEls[focusableEls.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);

      // Restore focus to previous element or the rail button
      if (triggerFocusRef.current && document.contains(triggerFocusRef.current)) {
        triggerFocusRef.current.focus();
      } else if (activePanel) {
        const railBtn = document.querySelector(`[data-nav-id="${activePanel}"]`);
        railBtn?.focus?.();
      }
    };
  }, [isTablet, isDrawerOpen, activePanel, closePanel]);

  // Lock background scroll on tablet while drawer is open (compensate for scrollbar)
  useEffect(() => {
    if (isTablet && isDrawerOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      const originalOverflow = document.body.style.overflow;
      const originalPaddingRight = document.body.style.paddingRight;

      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
      };
    }
  }, [isTablet, isDrawerOpen]);

  // Touch Swipe-Right Gesture Handler for Tablet Drawer
  function handleTouchStart(e) {
    if (!isTablet) return;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e) {
    if (!isTablet || touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartXRef.current;
    const deltaY = touchEndY - touchStartYRef.current;

    // Swipe right gesture (at least 60px rightward and predominantly horizontal)
    if (deltaX > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      playSound('reaction');
      closePanel();
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  }

  // Handle focus when already-open view is clicked on LeftRail
  useEffect(() => {
    function handleOpenPanelEvent(e) {
      const panel = e.detail?.panel;
      if (panel && panel === activePanel && !isCollapsed) {
        // Focus the first interactive control
        const wrap =
          panel === 'messages'
            ? messagesWrapRef.current
            : panel === 'alerts'
            ? alertsWrapRef.current
            : exploreWrapRef.current;
        const target = wrap?.querySelector('input:not([disabled]), button:not([disabled])');
        target?.focus?.();
      }
    }
    window.addEventListener('shammah:open-panel', handleOpenPanelEvent);
    return () => {
      window.removeEventListener('shammah:open-panel', handleOpenPanelEvent);
    };
  }, [activePanel, isCollapsed]);

  // Handle Esc key to close expand modal
  useEffect(() => {
    if (!expandedModal) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setExpandedModal(null);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expandedModal]);

  const activeTabObj = PANEL_TABS.find((t) => t.id === activePanel) || PANEL_TABS[0];

  function handleTabClick(tabId) {
    playSound('reaction');
    if (activePanel === tabId && !isCollapsed) {
      // Already active: focus its first control
      const wrap =
        tabId === 'messages'
          ? messagesWrapRef.current
          : tabId === 'alerts'
          ? alertsWrapRef.current
          : exploreWrapRef.current;
      const target = wrap?.querySelector('input:not([disabled]), button:not([disabled])');
      target?.focus?.();
      return;
    }
    openPanel(tabId);
  }

  function handleMarkAllRead() {
    playSound('alert');
    window.dispatchEvent(new CustomEvent('shammah:mark-all-notifications-read'));
  }

  function handleToggleDark() {
    const updated = toggleTheme(dark);
    setDark(updated);
  }

  const currentUser = session?.user ? { ...profile, id: session.user.id } : null;

  // On desktop (>=1100px), if collapsed, render sleek mini dock strip
  if ((isCollapsed || !activePanel) && !isTablet) {
    return (
      <aside className="dl-right-panel dl-panel-card dl-panel-collapsed" aria-label="Collapsed Side Panel">
        <div className="dl-collapsed-dock">
          <button
            type="button"
            className="dl-collapsed-toggle-btn"
            onClick={() => openPanel('messages')}
            title="Expand Side Panel"
            aria-label="Expand Side Panel"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="dl-collapsed-icons-stack">
            {PANEL_TABS.map((tab) => {
              const Icon = tab.icon;
              const count = tab.id === 'messages' ? unreadMessages : tab.id === 'alerts' ? unreadAlerts : 0;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className="dl-collapsed-icon-btn"
                  style={{ '--sec-color': tab.color }}
                  onClick={() => openPanel(tab.id)}
                  title={`Open ${tab.label}`}
                  aria-label={`Open ${tab.label}`}
                >
                  <Icon size={18} />
                  {count > 0 && <span className="dl-badge dl-collapsed-badge">{count}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    );
  }

  // On tablet, when not open, don't show any collapsed dock (drawer sits hidden offscreen)
  if (isTablet && !isDrawerOpen) {
    return null;
  }

  return (
    <aside
      ref={drawerPanelRef}
      className={`dl-right-panel dl-panel-card${isTablet ? ' dl-drawer-panel' : ''}`}
      aria-label={isTablet ? activeTabObj.title : 'Side Panel'}
      role={isTablet ? 'dialog' : 'complementary'}
      aria-modal={isTablet ? 'true' : undefined}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pinned Header: Segmented 3-tab control */}
      <div className="dl-panel-header">
        <div className="dl-panel-tabs" role="tablist" aria-label="Panel tabs">
          {PANEL_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activePanel === tab.id;
            const badgeCount =
              tab.id === 'messages' ? unreadMessages : tab.id === 'alerts' ? unreadAlerts : 0;

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`dl-panel-view-${tab.id}`}
                id={`dl-panel-tab-${tab.id}`}
                className={`dl-panel-tab-btn${isActive ? ' active' : ''}`}
                style={{
                  '--sec-color': tab.color,
                  '--sec-complement': tab.complementColor,
                }}
                onClick={() => handleTabClick(tab.id)}
                title={tab.label}
              >
                <span className="dl-panel-tab-icon-wrap" aria-hidden="true">
                  <Icon size={16} strokeWidth={isActive ? 2.4 : 1.8} />
                  {badgeCount > 0 && <span className="dl-badge dl-panel-badge">{badgeCount}</span>}
                </span>
                <span className="dl-panel-tab-label">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Subheader Title Row with View Name and Action Buttons */}
        <div className="dl-panel-title-row">
          <h3 className="dl-panel-view-title">{activeTabObj.title}</h3>

          <div className="dl-panel-actions">
            {activePanel === 'alerts' && (
              <button
                type="button"
                className="dl-panel-action-btn"
                onClick={handleMarkAllRead}
                title="Mark all notifications as read"
                aria-label="Mark all notifications as read"
              >
                <CheckCheck size={14} />
                <span className="dl-action-text">Mark all read</span>
              </button>
            )}

            {(activePanel === 'messages' || activePanel === 'alerts') && (
              <button
                type="button"
                className="dl-panel-action-btn icon-only"
                onClick={() => setExpandedModal(activePanel)}
                title="Expand to full window modal"
                aria-label="Expand to full window modal"
              >
                <Maximize2 size={13} />
              </button>
            )}

            <button
              type="button"
              className="dl-panel-action-btn icon-only"
              onClick={closePanel}
              title={isTablet ? 'Close drawer' : 'Collapse panel'}
              aria-label={isTablet ? 'Close drawer' : 'Collapse panel'}
            >
              {isTablet ? <X size={16} /> : <ChevronRight size={15} />}
            </button>
          </div>
        </div>
      </div>

      {/* Panel Body: Container Query enabled, internal scrolling */}
      <div className="dl-panel-body" ref={panelBodyRef}>
        {/* Messages / Chats View */}
        <div
          id="dl-panel-view-messages"
          role="tabpanel"
          aria-labelledby="dl-panel-tab-messages"
          ref={messagesWrapRef}
          className="dl-panel-view"
          style={{ display: activePanel === 'messages' ? 'flex' : 'none' }}
        >
          {mountedViews.messages && (
            <InboxView
              currentUser={currentUser}
              variant="panel"
              initialConversationId={initialConversationId}
            />
          )}
        </div>

        {/* Notifications / Alerts View */}
        <div
          id="dl-panel-view-alerts"
          role="tabpanel"
          aria-labelledby="dl-panel-tab-alerts"
          ref={alertsWrapRef}
          className="dl-panel-view"
          style={{ display: activePanel === 'alerts' ? 'flex' : 'none' }}
        >
          {mountedViews.alerts && (
            <NotificationsView
              currentUser={currentUser}
              openAuth={(mode) =>
                window.dispatchEvent(new CustomEvent('shammah:open-auth', { detail: mode }))
              }
              variant="panel"
            />
          )}
        </div>

        {/* Explore / Settings View */}
        <div
          id="dl-panel-view-explore"
          role="tabpanel"
          aria-labelledby="dl-panel-tab-explore"
          ref={exploreWrapRef}
          className="dl-panel-view"
          style={{ display: activePanel === 'explore' ? 'block' : 'none' }}
        >
          {mountedViews.explore && (
            <ExploreView
              session={session}
              profile={profile}
              dark={dark}
              setDark={handleToggleDark}
              onSignOut={signOut}
              openAuth={(mode) =>
                window.dispatchEvent(new CustomEvent('shammah:open-auth', { detail: mode }))
              }
              onSelectCategory={(cat) => {
                window.dispatchEvent(new CustomEvent('shammah:set-tab', { detail: 'home' }));
                window.dispatchEvent(new CustomEvent('shammah:set-section', { detail: cat }));
              }}
              variant="panel"
            />
          )}
        </div>
      </div>

      {/* Centred Full-Size Modal at z-index 100 for Expanded Messages or Alerts */}
      {expandedModal && typeof document !== 'undefined' &&
        createPortal(
          <div
            className="dl-expand-modal-backdrop"
            onClick={() => setExpandedModal(null)}
            role="dialog"
            aria-modal="true"
            aria-label={`Expanded ${expandedModal === 'messages' ? 'Direct Messages' : 'Alerts'}`}
          >
            <div
              className="dl-expand-modal-dialog"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="dl-expand-modal-header">
                <h3>
                  {expandedModal === 'messages' ? 'Direct Messages' : 'Notifications & Alerts'}
                </h3>
                <button
                  type="button"
                  className="dl-expand-close-btn"
                  onClick={() => setExpandedModal(null)}
                  title="Close modal (Esc)"
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="dl-expand-modal-content">
                {expandedModal === 'messages' ? (
                  <InboxView
                    currentUser={currentUser}
                    skipRealtimeSubscription={true}
                    initialConversationId={initialConversationId}
                  />
                ) : (
                  <NotificationsView
                    currentUser={currentUser}
                    openAuth={(mode) =>
                      window.dispatchEvent(new CustomEvent('shammah:open-auth', { detail: mode }))
                    }
                  />
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </aside>
  );
}
