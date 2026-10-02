import ProfileBadge from './ProfileBadge';
import VerifiedBadge from './VerifiedBadge';

/**
 * A person's name with their badge, shown together everywhere a name appears in public.
 * layout 'inline': badge sits to the right of the name (feeds, comments)
 * layout 'stack':  badge sits directly below the name (profile views)
 */
export default function MemberName({ name, badge, verified = false, role = null, layout = 'inline', nameClassName = '' }) {
  return (
    <span className={`member-name member-name-${layout}`}>
      <span className="member-name-row">
        <span className={`member-name-text ${nameClassName}`.trim()}>{name || 'Someone'}</span>
        {verified && <VerifiedBadge badge={badge} role={role} size={15} />}
      </span>
      {badge && <ProfileBadge badge={badge} verified={false} />}
    </span>
  );
}
