'use client';
import { getBadge } from '../lib/badges';

/**
 * Compact badge chip shown next to a member's name in feeds, comments, headers.
 * size: 'sm' | 'md'
 */
export default function MemberBadge({ badgeId, size = 'sm' }) {
  const badge = getBadge(badgeId);
  if (!badge) return null;

  return (
    <span
      className={`member-badge member-badge-${size}`}
      title={badge.description || badge.label}
      aria-label={badge.label}
    >
      <span className="member-badge-icon" aria-hidden>
        {badge.icon}
      </span>
      <span className="member-badge-label">{badge.label}</span>
    </span>
  );
}
