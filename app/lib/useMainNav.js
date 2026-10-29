'use client';
import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  MessageCircle,
  Building2,
  Bell,
  Compass,
} from 'lucide-react';
import { getTotalUnreadMessagesCount } from './inboxManager';
import { getUnreadNotificationCount, fetchRealNotifications } from './notificationsManager';
import { playSound } from './soundEffects';

import { useLayoutMode } from './useLayoutMode';

export const NAV_ITEMS = [
  {
    id: 'home',
    label: 'Home',
    icon: Home,
    color: '#06b6d4',
    complementColor: '#6366f1',
    kind: 'center',
    href: '/',
  },
  {
    id: 'messages',
    label: 'Messages',
    icon: MessageCircle,
    color: '#0ea5e9',
    complementColor: '#a855f7',
    kind: 'panel',
    panel: 'messages',
    href: '/?tab=messages',
  },
  {
    id: 'churches',
    label: 'Institutions',
    icon: Building2,
    color: '#f59e0b',
    complementColor: '#ef4444',
    kind: 'center',
    href: '/?tab=churches',
  },
  {
    id: 'alerts',
    label: 'Alerts',
    icon: Bell,
    color: '#ec4899',
    complementColor: '#8b5cf6',
    kind: 'panel',
    panel: 'alerts',
    href: '/?tab=alerts',
  },
  {
    id: 'menu',
    label: 'Explore',
    icon: Compass,
    color: '#10b981',
    complementColor: '#06b6d4',
    kind: 'panel',
    panel: 'explore',
    href: '/?tab=menu',
  },
];

export function useMainNav() {
  const pathname = usePathname();
  const router = useRouter();
  const layoutMode = useLayoutMode();
  const [activeTab, setActiveTab] = useState('home');
  const [activePanel, setActivePanel] = useState(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadAlerts, setUnreadAlerts] = useState(0);

  const syncBadges = useCallback(async () => {
    try {
      const count = await getTotalUnreadMessagesCount();
      setUnreadMessages(Number(count) || 0);
    } catch {
      setUnreadMessages(0);
    }
    setUnreadAlerts(getUnreadNotificationCount());
  }, []);

  useEffect(() => {
    syncBadges();
    fetchRealNotifications().catch(() => {});

    function onBadgeUpdate() {
      syncBadges();
    }

    window.addEventListener('shammah:inbox-updated', onBadgeUpdate);
    window.addEventListener('shammah:notifications-updated', onBadgeUpdate);
    return () => {
      window.removeEventListener('shammah:inbox-updated', onBadgeUpdate);
      window.removeEventListener('shammah:notifications-updated', onBadgeUpdate);
    };
  }, [syncBadges]);

  // Derive active tab from pathname and URL search params
  useEffect(() => {
    if (!pathname) return;

    if (pathname.startsWith('/churches')) {
      setActiveTab('churches');
    } else if (pathname.startsWith('/categories') || pathname.startsWith('/settings')) {
      setActiveTab(layoutMode === 'mobile' ? 'menu' : 'home');
    } else if (pathname === '/') {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get('tab');
        if (tabParam === 'institutions' || tabParam === 'churches') {
          setActiveTab('churches');
        } else if (
          layoutMode === 'mobile' &&
          tabParam &&
          ['home', 'churches', 'messages', 'alerts', 'menu'].includes(tabParam)
        ) {
          setActiveTab(tabParam);
        } else {
          setActiveTab('home');
        }
      }
    } else {
      setActiveTab('home');
    }
  }, [pathname, layoutMode]);

  // Listen for tab and panel changes
  useEffect(() => {
    function handleTabEvent(e) {
      if (e.detail) {
        setActiveTab(e.detail);
      }
    }
    function handlePanelEvent(e) {
      setActivePanel(e.detail?.panel || null);
    }
    function handleOpenPanel(e) {
      const nextPanel = e.detail?.panel || null;
      setActivePanel(nextPanel);
    }
    function handleClosePanel() {
      setActivePanel(null);
    }

    window.addEventListener('shammah:tab-changed', handleTabEvent);
    window.addEventListener('shammah:panel-changed', handlePanelEvent);
    window.addEventListener('shammah:open-panel', handleOpenPanel);
    window.addEventListener('shammah:close-panel', handleClosePanel);
    return () => {
      window.removeEventListener('shammah:tab-changed', handleTabEvent);
      window.removeEventListener('shammah:panel-changed', handlePanelEvent);
      window.removeEventListener('shammah:open-panel', handleOpenPanel);
      window.removeEventListener('shammah:close-panel', handleClosePanel);
    };
  }, []);

  // Phone / BottomNav click handler (preserves 100% existing phone behavior)
  const handleTabClick = useCallback((tabId, href) => {
    setActiveTab(tabId);
    playSound('reaction');

    if (tabId === 'home') {
      window.dispatchEvent(new CustomEvent('shammah:set-tab', { detail: 'home' }));
      window.dispatchEvent(new CustomEvent('shammah:set-section', { detail: 'all' }));
      if (pathname === '/') {
        if (typeof window !== 'undefined') {
          if (window.location.search) {
            window.history.pushState(null, '', '/');
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else {
        router.push('/');
      }
      return;
    }

    if (pathname === '/') {
      window.dispatchEvent(new CustomEvent('shammah:set-tab', { detail: tabId }));
    } else {
      router.push(href);
    }
  }, [pathname, router]);

  // Tablet / Desktop LeftRail click handler
  // 'center' items dispatch shammah:set-tab
  // 'panel' items dispatch shammah:open-panel and NEVER shammah:set-tab
  const handleRailItemClick = useCallback((item) => {
    playSound('reaction');

    if (item.kind === 'panel') {
      const targetPanel = item.panel;
      window.dispatchEvent(
        new CustomEvent('shammah:open-panel', {
          detail: { panel: targetPanel },
        })
      );
      window.dispatchEvent(
        new CustomEvent('shammah:panel-changed', {
          detail: { panel: targetPanel },
        })
      );
      setActivePanel(targetPanel);
      return;
    }

    // 'center' item (Home, Institutions)
    setActiveTab(item.id);
    setActivePanel(null);
    window.dispatchEvent(new CustomEvent('shammah:close-panel'));
    window.dispatchEvent(new CustomEvent('shammah:panel-changed', { detail: { panel: null } }));

    if (item.id === 'home') {
      window.dispatchEvent(new CustomEvent('shammah:set-tab', { detail: 'home' }));
      window.dispatchEvent(new CustomEvent('shammah:set-section', { detail: 'all' }));
      if (pathname === '/') {
        if (typeof window !== 'undefined') {
          if (window.location.search) {
            window.history.pushState(null, '', '/');
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else {
        router.push('/');
      }
      return;
    }

    if (pathname === '/') {
      window.dispatchEvent(new CustomEvent('shammah:set-tab', { detail: item.id }));
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      router.push(item.href);
    }
  }, [pathname, router]);

  const getBadgeCount = useCallback((itemId) => {
    if (itemId === 'messages') return unreadMessages;
    if (itemId === 'alerts') return unreadAlerts;
    return 0;
  }, [unreadMessages, unreadAlerts]);

  return {
    navItems: NAV_ITEMS,
    activeTab,
    activePanel,
    unreadMessages,
    unreadAlerts,
    getBadgeCount,
    handleTabClick,
    handleRailItemClick,
  };
}
