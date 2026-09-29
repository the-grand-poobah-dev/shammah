'use client';
import MemberBadge from './MemberBadge';

/**
 * Name + optional badge, always shown together in public contexts.
 * layout: 'inline' (name then badge to the right) | 'stack' (name, badge below)
 */
export default function MemberName({ name, badgeId, layout = 'inline', className = '' }) {
  const display = name || 'Someone';

  if (layout === 'stack') {
    return (
      <span className={`member-name-stack ${className}`.trim()}>
        <span className="member-name-text">{display}</span>
        {badgeId && <MemberBadge badgeId={badgeId} size="sm" />}
      </span>
    );
  }

  return (
    <span className={`member-name-inline ${className}`.trim()}>
      <span className="member-name-text">{display}</span>
      {badgeId && <MemberBadge badgeId={badgeId} size="sm" />}
    </span>
  );
}
