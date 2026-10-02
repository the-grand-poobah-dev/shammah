'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Home, MessageCircle, Bell, Compass, Plus } from 'lucide-react';
import { getTotalUnreadMessagesCount } from '../lib/inboxManager';
import { getUnreadNotificationCount } from '../lib/notificationsManager';
import { playSound } from '../lib/soundEffects';

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('home');
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadAlerts, setUnreadAlerts] = useState(0);

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
      setActiveTab('home');
    } else if (pathname.startsWith('/categories') || pathname.startsWith('/settings')) {
      setActiveTab('menu');
    } else if (pathname === '/') {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get('tab');
        if (tabParam && ['home', 'messages', 'alerts', 'menu'].includes(tabParam)) {
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

  function handleTabClick(tabId, href) {
    setActiveTab(tabId);
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

  function handleCreateClick() {
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

  return (
    <nav className="bottom-nav" aria-label="Main Navigation">
      <div className="bottom-nav-pill">
        {/* Left Tab: Home */}
        <button
          type="button"
          className={`tab-btn${activeTab === 'home' ? ' active' : ''}`}
          onClick={() => handleTabClick('home', '/')}
          aria-label="Home"
          aria-current={activeTab === 'home' ? 'page' : undefined}
        >
          <span className="tab-icon-wrap">
            <Home size={20} strokeWidth={activeTab === 'home' ? 2.4 : 1.8} className="tab-icon" />
          </span>
          <span className="tab-label">Home</span>
        </button>

        {/* Left Tab: Messages */}
        <button
          type="button"
          className={`tab-btn${activeTab === 'messages' ? ' active' : ''}`}
          onClick={() => handleTabClick('messages', '/?tab=messages')}
          aria-label="Messages"
          aria-current={activeTab === 'messages' ? 'page' : undefined}
        >
          <span className="tab-icon-wrap">
            <MessageCircle size={20} strokeWidth={activeTab === 'messages' ? 2.4 : 1.8} className="tab-icon" />
            {unreadMessages > 0 && <span className="tab-badge-num">{unreadMessages}</span>}
          </span>
          <span className="tab-label">Messages</span>
        </button>

        {/* Center Dipped Circular Plus Action Button with Rotating Neon Glow Ring */}
        <div className="bottom-nav-center-slot">
          <button
            type="button"
            className="bottom-nav-dip-btn"
            onClick={handleCreateClick}
            aria-label="Create Post"
            title="Create a fellowship post"
          >
            <span className="neon-glow-ring" aria-hidden="true" />
            <span className="dip-btn-inner">
              <Plus size={24} strokeWidth={2.6} className="dip-btn-plus-icon" />
            </span>
          </button>
        </div>

        {/* Right Tab: Alerts / Notifications */}
        <button
          type="button"
          className={`tab-btn${activeTab === 'alerts' ? ' active' : ''}`}
          onClick={() => handleTabClick('alerts', '/?tab=alerts')}
          aria-label="Alerts"
          aria-current={activeTab === 'alerts' ? 'page' : undefined}
        >
          <span className="tab-icon-wrap">
            <Bell size={20} strokeWidth={activeTab === 'alerts' ? 2.4 : 1.8} className="tab-icon" />
            {unreadAlerts > 0 && <span className="tab-badge-num">{unreadAlerts}</span>}
          </span>
          <span className="tab-label">Alerts</span>
        </button>

        {/* Right Tab: Explore */}
        <button
          type="button"
          className={`tab-btn${activeTab === 'menu' ? ' active' : ''}`}
          onClick={() => handleTabClick('menu', '/?tab=menu')}
          aria-label="Explore"
          aria-current={activeTab === 'menu' ? 'page' : undefined}
        >
          <span className="tab-icon-wrap">
            <Compass size={20} strokeWidth={activeTab === 'menu' ? 2.4 : 1.8} className="tab-icon" />
          </span>
          <span className="tab-label">Explore</span>
        </button>
      </div>
    </nav>
  );
}
