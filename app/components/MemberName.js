import ProfileBadge from './ProfileBadge';
import VerifiedBadge from './VerifiedBadge';

/**
 * A person's name with their badge, shown together everywhere a name appears in public.
 * layout 'inline': badge sits to the right of the name (feeds, comments)
 * layout 'stack':  badge sits directly below the name (profile views)
 */
export default function MemberName({
  name,
  badge,
  verified = false,
  role = null,
  layout = 'inline',
  nameClassName = '',
  userId = null,
  author = null,
  onClick = null,
  isInstitution = false,
  institutionId = null,
}) {
  function handleClick(e) {
    if (onClick) {
      onClick(e);
      return;
    }
    if (isInstitution || institutionId) {
      e.stopPropagation();
      window.dispatchEvent(
        new CustomEvent('shammah:open-institution-profile', {
          detail: {
            institutionId: institutionId || userId,
            name,
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
            author: author || { id: userId, display_name: name, badge, badge_verified: verified, role },
            authorId: userId,
          },
        })
      );
    }
  }

  const isClickable = Boolean(onClick || userId || name || institutionId);

  return (
    <span
      className={`member-name member-name-${layout}${isClickable ? ' is-clickable' : ''}`}
      onClick={isClickable ? handleClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      title={isClickable ? `View profile for ${name || 'Member'}` : undefined}
    >
      <span className="member-name-row">
        <span className={`member-name-text ${nameClassName}`.trim()}>{name || 'Someone'}</span>
        {verified && <VerifiedBadge badge={badge} role={role} size={15} />}
      </span>
      {badge && <ProfileBadge badge={badge} verified={false} />}
    </span>
  );
}
