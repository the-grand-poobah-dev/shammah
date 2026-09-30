'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Home, MessageCircle, Church, Bell, Compass } from 'lucide-react';

const TABS = [
  { id: 'home', label: 'Home', icon: Home, href: '/' },
  { id: 'messages', label: 'Messages', icon: MessageCircle, href: '/?tab=messages' },
  { id: 'churches', label: 'Churches', icon: Church, href: '/churches' },
  { id: 'alerts', label: 'Alerts', icon: Bell, href: '/?tab=alerts' },
  { id: 'menu', label: 'Explore', icon: Compass, href: '/categories' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    if (!pathname) return;

    if (pathname.startsWith('/churches')) {
      setActiveTab('churches');
    } else if (pathname.startsWith('/categories')) {
      setActiveTab('menu');
    } else if (pathname.startsWith('/settings')) {
      setActiveTab('menu');
    } else if (pathname === '/') {
      // Check query param if present
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get('tab');
        if (tabParam && ['home', 'messages', 'alerts', 'churches', 'menu'].includes(tabParam)) {
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

  function handleTabClick(t) {
    setActiveTab(t.id);

    if (pathname === '/') {
      // On the home page: dispatch event to switch tab without reload
      window.dispatchEvent(new CustomEvent('shammah:set-tab', { detail: t.id }));
      if (t.id === 'home') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      // If clicking Churches or Explore while on home page, update URL query cleanly
      if (t.id === 'churches') {
        router.push('/churches');
      } else if (t.id === 'menu') {
        router.push('/categories');
      }
    } else {
      // On subpages: navigate directly to target route
      if (t.id === 'home') {
        router.push('/');
      } else if (t.id === 'churches') {
        router.push('/churches');
      } else if (t.id === 'menu') {
        router.push('/categories');
      } else {
        router.push(t.href);
      }
    }
  }

  return (
    <nav className="bottom-nav" aria-label="Main Navigation">
      <div className="bottom-nav-pill">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              className={`tab-btn${isActive ? ' active' : ''}`}
              onClick={() => handleTabClick(t)}
              aria-label={t.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="tab-icon-wrap">
                <Icon size={20} strokeWidth={isActive ? 2.3 : 1.8} className="tab-icon" />
                {t.id === 'alerts' && <span className="tab-badge-dot" />}
              </span>
              <span className="tab-label">{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
