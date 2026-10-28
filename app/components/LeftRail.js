'use client';
import Link from 'next/link';
import Avatar from './Avatar';
import MemberName from './MemberName';
import { useSession } from '../../lib/useSession';
import { useMainNav } from '../lib/useMainNav';

export default function LeftRail() {
  const { session, profile } = useSession();
  const {
    navItems,
    activeTab,
    activePanel,
    getBadgeCount,
    handleRailItemClick,
  } = useMainNav();

  const displayName = profile?.display_name || session?.user?.email?.split('@')[0] || 'Member';
  const isSignedIn = Boolean(session?.user);

  return (
    <div className="dl-left-rail">
      <nav className="dl-rail-nav" aria-label="Main Navigation">
        {/* Profile / Auth Row */}
        {isSignedIn ? (
          <Link
            href="/profile"
            className="dl-profile-row"
            title={`Signed in as ${displayName}. View profile.`}
          >
            <Avatar
              name={displayName}
              src={profile?.avatar_url}
              size={36}
              className="dl-profile-avatar"
            />
            <div className="dl-profile-meta">
              <MemberName
                name={displayName}
                role={profile?.role}
                badge={profile?.badge}
                badgeVerified={profile?.badge_verified}
                className="dl-profile-name"
              />
              <span className="dl-profile-sub">View profile</span>
            </div>
          </Link>
        ) : (
          <div className="dl-auth-row">
            <button
              type="button"
              className="dl-auth-btn signin"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent('shammah:open-auth', { detail: 'signin' })
                )
              }
              title="Sign in to your account"
            >
              Sign In
            </button>
            <button
              type="button"
              className="dl-auth-btn signup"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent('shammah:open-auth', { detail: 'signup' })
                )
              }
              title="Join Shammah community"
            >
              Sign Up
            </button>
          </div>
        )}

        {/* 5 Navigation Items */}
        <div className="dl-nav-list" role="list">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.kind === 'panel'
                ? activePanel === item.panel
                : activeTab === item.id && !activePanel;
            const ariaCurrent = isActive && item.kind === 'center' ? 'page' : undefined;
            const badgeCount = getBadgeCount(item.id);

            return (
              <button
                key={item.id}
                type="button"
                className={`dl-nav-item${isActive ? ' active' : ''}`}
                style={{
                  '--sec-color': item.color,
                  '--sec-complement': item.complementColor || '#6366f1',
                }}
                onClick={() => handleRailItemClick(item)}
                aria-label={item.label}
                aria-current={ariaCurrent}
                title={item.label}
                role="listitem"
              >
                <span className="dl-icon-wrap" aria-hidden="true">
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.4 : 1.8}
                    className="dl-nav-icon"
                  />
                </span>
                <span className="dl-nav-label">{item.label}</span>
                {badgeCount > 0 && (
                  <span
                    className="dl-badge"
                    aria-label={`${badgeCount} unread`}
                  >
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Slot for Explore Shammah widget */}
      <div className="dl-rail-widget-slot" />

      {/* Slot for Quick Actions footer portal */}
      <div className="dl-rail-footer" id="dl-rail-footer" />
    </div>
  );
}
