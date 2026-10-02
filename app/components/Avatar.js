'use client';
import { useEffect, useState } from 'react';
import { initials } from '../lib/postDisplay';
import { hasUserActiveStatus } from '../lib/statusManager';

// Round profile picture with dynamic status ring:
// - Green glowing ring when the user has an active 24-hour status update
// - Rotating multi-color neon glow around edges when there are no status updates
export default function Avatar({
  name,
  src,
  userId = null,
  hasStatus = null,
  className = '',
  children,
  onClick,
  isInstitution = false,
  institutionId = null,
  badge = null,
  role = null,
}) {
  const [activeStatus, setActiveStatus] = useState(hasStatus ?? false);

  useEffect(() => {
    if (hasStatus !== null) {
      setActiveStatus(hasStatus);
      return;
    }
    // Check if user has active 24h status update
    setActiveStatus(hasUserActiveStatus(userId, name));

    function onStatusChange() {
      setActiveStatus(hasUserActiveStatus(userId, name));
    }
    window.addEventListener('shammah:status-updated', onStatusChange);
    return () => window.removeEventListener('shammah:status-updated', onStatusChange);
  }, [userId, name, hasStatus]);

  function handleClick(e) {
    if (onClick) {
      onClick(e);
      return;
    }
    if (activeStatus) {
      e.stopPropagation();
      window.dispatchEvent(
        new CustomEvent('shammah:open-status', { detail: { userId, userName: name } })
      );
      return;
    }
    if (isInstitution || institutionId) {
      e.stopPropagation();
      window.dispatchEvent(
        new CustomEvent('shammah:open-institution-profile', {
          detail: {
            institutionId: institutionId || userId,
            name,
            logo_url: src,
          },
        })
      );
      return;
    }
    if (userId || name) {
      e.stopPropagation();
      window.dispatchEvent(
        new CustomEvent('shammah:open-profile', {
          detail: {
            author: { id: userId, display_name: name, avatar_url: src, badge, role },
            authorId: userId,
          },
        })
      );
    }
  }

  const statusClass = activeStatus ? 'has-status' : 'no-status';
  const isClickable = Boolean(onClick || activeStatus || userId || name || institutionId);

  return (
    <span
      className={`avatar ${statusClass} ${isClickable ? 'cursor-pointer' : ''} ${className}`.trim()}
      onClick={handleClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      title={
        activeStatus
          ? `${name || 'Member'} has a 24-hour status (Tap to view)`
          : `View profile for ${name || 'Member'}`
      }
    >
      <span className="avatar-inner">
        {src ? <img src={src} alt="" className="avatar-img" /> : initials(name)}
      </span>
      {children}
    </span>
  );
}
