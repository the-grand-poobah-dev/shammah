'use client';
import { useState } from 'react';
import Link from 'next/link';
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
import PopupSheet from './PopupSheet';
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

  const headerName = profile?.display_name || session?.user?.email?.split('@')[0] || 'Member';

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
    <div className="avatar-menu">
      {/* Profile Avatar Trigger Button */}
      <button
        type="button"
        className="me-btn"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
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

      {/* Canonical PopupSheet Modal (Portaled to document.body, centered, 90dvh max, 44px X, focus trap & scroll lock) */}
      <PopupSheet
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="Account & Status"
        size="sm"
      >
        <div className="top-nav-dropdown-scrollable">
          {/* User Identity Header */}
          <div
            className="dropdown-user-header"
            role="button"
            tabIndex={0}
            onClick={() => handleAction(onOpenProfile)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleAction(onOpenProfile);
              }
            }}
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
            className="dropdown-item"
            onClick={() => handleAction(onOpenCreatePost)}
          >
            <PenSquare size={16} className="dropdown-item-icon" />
            <span>Create a post</span>
          </button>

          {/* Action: View profile */}
          <button
            type="button"
            className="dropdown-item"
            onClick={() => handleAction(onOpenProfile)}
          >
            <User size={16} className="dropdown-item-icon" />
            <span>View profile</span>
          </button>

          {/* Action: Activity Log & Transparency */}
          <button
            type="button"
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
            className="dropdown-item"
            href="/settings"
            onClick={() => setIsOpen(false)}
          >
            <Settings size={16} className="dropdown-item-icon" />
            <span>Profile settings</span>
          </Link>

          {/* Navigation: Browse categories */}
          <Link
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
            className="dropdown-item danger"
            onClick={() => handleAction(onSignOut)}
          >
            <LogOut size={16} className="dropdown-item-icon" />
            <span>Log out</span>
          </button>
        </div>
      </PopupSheet>
    </div>
  );
}
