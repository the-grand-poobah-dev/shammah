'use client';
import { getBadge } from '../lib/badges';

/**
 * Compact badge label shown below/next to a member's name in status stories, feeds, and headers.
 * size: 'sm' | 'md'
 */
export default function MemberBadge({ badgeId, size = 'sm' }) {
  const badge = getBadge(badgeId);
  if (!badge) return null;

  return (
    <span
      className={`member-badge member-badge-${size}`}
      title={badge.desc || badge.description || badge.label}
      aria-label={badge.label}
    >
      <span className="member-badge-label">{badge.label}</span>
    </span>
  );
}
