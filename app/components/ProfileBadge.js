import { badgeById } from '../lib/badges';
import BadgeIcon from './BadgeIcon';
import VerifiedBadge from './VerifiedBadge';

// Small icon + label shown directly below a person's name, everywhere a name appears.
export default function ProfileBadge({ badge, verified = false }) {
  const b = badgeById(badge);
  if (!b) return null;
  return (
    <span className="profile-badge" title={verified ? `${b.label} (verified)` : b.label}>
      <BadgeIcon badge={b} size={13} />
      <span>{b.label}</span>
      {verified && <VerifiedBadge badge={badge} size={13} title={`${b.label} (Verified)`} />}
    </span>
  );
}
