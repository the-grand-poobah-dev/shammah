'use client';
import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export function useMainNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('home');
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadAlerts, setUnreadAlerts] = useState(0);

  useEffect(() => {
    function handleSetTab(e) {
      if (e.detail) {
        setActiveTab(e.detail);
      }
    }
    window.addEventListener('shammah:set-tab', handleSetTab);
    return () => window.removeEventListener('shammah:set-tab', handleSetTab);
  }, []);

  const handleTabClick = useCallback(
    (tabId) => {
      setActiveTab(tabId);
      if (pathname !== '/') {
        router.push(`/?tab=${tabId}`);
      } else {
        window.dispatchEvent(new CustomEvent('shammah:set-tab', { detail: tabId }));
      }
    },
    [pathname, router]
  );

  const getBadgeCount = useCallback(
    (tabId) => {
      if (tabId === 'messages') return unreadMessages;
      if (tabId === 'notifications') return unreadAlerts;
      return 0;
    },
    [unreadMessages, unreadAlerts]
  );

  return {
    activeTab,
    unreadMessages,
    unreadAlerts,
    handleTabClick,
    getBadgeCount,
  };
}

export default useMainNav;
