'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import {
  PenSquare,
  User,
  ShieldCheck,
  Settings,
  Compass,
  LogOut,
  Church,
  Pin,
  Check,
} from 'lucide-react';
import Avatar from './Avatar';
import { playSound } from '../lib/soundEffects';
import {
  useUserActivityStatus,
  ACTIVITY_STATUS_OPTIONS,
} from '../lib/presenceManager';

export default function UserAccountMenu({
  session,
  profile,
  canModerate = false,
  adminMode = false,
  setAdminMode = () => {},
  ownedChurches = [],
  onOpenCreatePost = () => {},
  onOpenProfile = () => {},
  onOpenActivityLog = () => {},
  onSignOut = () => {},
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activityStatus, setActivityStatus] = useUserActivityStatus();
  const menuContainerRef = useRef(null);

  const headerName = profile?.display_name || session?.user?.email?.split('@')[0] || 'Member';

  // Reliable outside-click (pointerdown) and Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(e) {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }

    const timer = setTimeout(() => {
      document.addEventListener('pointerdown', handlePointerDown);
      document.addEventListener('keydown', handleKeyDown);
    }, 40);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  function handleToggle(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    playSound('reaction');
    setIsOpen((prev) => !prev);
  }

  function handleSelectStatus(statusId) {
    playSound('reaction');
    setActivityStatus(statusId);
  }

  function handleAction(callback) {
    playSound('reaction');
    setIsOpen(false);
    if (callback) {
      callback();
    }
  }

  return (
    <div className="avatar-menu" ref={menuContainerRef}>
      {/* Profile Avatar Trigger Button */}
      <button
        type="button"
        className="me-btn"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="User account menu"
        title="User account menu"
      >
        <Avatar
          name={headerName}
          src={profile?.avatar_url}
          className="avatar-sm"
          activityStatus={activityStatus}
          onClick={handleToggle}
        />
        <span className="me-name">{headerName}</span>
      </button>

      {/* Identical dropdown menu for all screen sizes (mobile < md and desktop) */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Darkened backdrop for outside clicks/taps on mobile & desktop */}
            <div
              className="avatar-dropdown-backdrop"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />

            <motion.div
              className="dropdown avatar-dropdown-menu neon-glow-modal"
              role="menu"
              aria-label="User account options"
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              {/* User Identity Header */}
              <div
                className="dropdown-user-header"
                role="button"
                tabIndex={0}
                onClick={() => handleAction(onOpenProfile)}
                title="View your profile"
              >
                <Avatar
                  name={headerName}
                  src={profile?.avatar_url}
                  className="avatar-sm"
                  activityStatus={activityStatus}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAction(onOpenProfile);
                  }}
                />
                <div className="dropdown-user-info">
                  <span className="dropdown-user-name">{headerName}</span>
                  <span className="dropdown-user-email">{session?.user?.email}</span>
                  {canModerate ? (
                    <span className="dropdown-user-role-badge admin">
                      <ShieldCheck size={11} />
                      <span>{profile?.role === 'platform_admin' ? 'Platform Admin' : 'Church Leader'}</span>
                    </span>
                  ) : (
                    <span className="dropdown-user-role-badge member">
                      <User size={11} />
                      <span>Member</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Activity Status Selector: Online (green), Busy (yellow/orange), Offline (gray) */}
              <div className="dropdown-divider" />
              <div className="dropdown-section-label">Activity Status</div>
              <div className="activity-status-row" role="radiogroup" aria-label="Set activity status">
                {ACTIVITY_STATUS_OPTIONS.map((opt) => {
                  const isCurrent = activityStatus === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={isCurrent}
                      className={`activity-status-btn${isCurrent ? ' is-active' : ''}`}
                      onClick={() => handleSelectStatus(opt.id)}
                      title={`${opt.label}: ${opt.desc}`}
                    >
                      <span className={`activity-status-dot ${opt.id}`} />
                      <span>{opt.label}</span>
                      {isCurrent && <Check size={11} className="activity-status-check shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <div className="dropdown-divider" />

              {/* Action: Create a post */}
              <button
                type="button"
                role="menuitem"
                className="dropdown-item"
                onClick={() => handleAction(onOpenCreatePost)}
              >
                <PenSquare size={16} className="dropdown-item-icon" />
                <span>Create a post</span>
              </button>

              {/* Action: View profile */}
              <button
                type="button"
                role="menuitem"
                className="dropdown-item"
                onClick={() => handleAction(onOpenProfile)}
              >
                <User size={16} className="dropdown-item-icon" />
                <span>View profile</span>
              </button>

              {/* Action: Activity Log & Transparency */}
              <button
                type="button"
                role="menuitem"
                className="dropdown-item"
                onClick={() => handleAction(onOpenActivityLog)}
              >
                <ShieldCheck size={16} className="dropdown-item-icon text-teal-400" />
                <span>Activity Log &amp; Transparency</span>
              </button>

              {/* Church Administration Section for Leaders & Admins */}
              {canModerate && (
                <>
                  <div className="dropdown-divider" />
                  <div className="dropdown-section-label">Church Administration</div>
                  <button
                    type="button"
                    role="menuitem"
                    className={`dropdown-item dropdown-toggle-item ${adminMode ? 'is-active' : ''}`}
                    onClick={() => {
                      playSound('reaction');
                      setAdminMode((m) => !m);
                    }}
                    title="Toggle admin pinning privileges"
                  >
                    <div className="dropdown-item-left">
                      <Pin size={16} className="dropdown-item-icon" />
                      <div className="dropdown-item-titles">
                        <span className="dropdown-item-main">Admin Pinning Mode</span>
                        <span className="dropdown-item-sub">
                          {adminMode ? 'Pin privileges active' : 'Switch to admin view'}
                        </span>
                      </div>
                    </div>
                    <span className={`dropdown-toggle-pill ${adminMode ? 'on' : 'off'}`}>
                      <span className="dropdown-toggle-dot" />
                      <span>{adminMode ? 'Admin' : 'Member'}</span>
                    </span>
                  </button>

                  {ownedChurches.length > 0 && (
                    <Link
                      role="menuitem"
                      className="dropdown-item"
                      href={`/churches/${ownedChurches[0].id}`}
                      onClick={() => setIsOpen(false)}
                    >
                      <Church size={16} className="dropdown-item-icon" />
                      <span>Manage My Church</span>
                    </Link>
                  )}
                </>
              )}

              <div className="dropdown-divider" />

              {/* Navigation: Profile settings */}
              <Link
                role="menuitem"
                className="dropdown-item"
                href="/settings"
                onClick={() => setIsOpen(false)}
              >
                <Settings size={16} className="dropdown-item-icon" />
                <span>Profile settings</span>
              </Link>

              {/* Navigation: Browse categories */}
              <Link
                role="menuitem"
                className="dropdown-item"
                href="/categories"
                onClick={() => setIsOpen(false)}
              >
                <Compass size={16} className="dropdown-item-icon" />
                <span>Browse categories</span>
              </Link>

              <div className="dropdown-divider" />

              {/* Sign out */}
              <button
                type="button"
                role="menuitem"
                className="dropdown-item danger"
                onClick={() => handleAction(onSignOut)}
              >
                <LogOut size={16} className="dropdown-item-icon" />
                <span>Log out</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
