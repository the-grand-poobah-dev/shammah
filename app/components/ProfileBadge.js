import { badgeById } from '../lib/badges';
import BadgeIcon from './BadgeIcon';

// Small icon + label shown directly below a person's name, everywhere a name appears.
export default function ProfileBadge({ badge, verified = false }) {
  const b = badgeById(badge);
  if (!b) return null;
  return (
    <span className="profile-badge" title={verified ? `${b.label} (verified)` : b.label}>
      <BadgeIcon badge={b} size={13} />
      <span>{b.label}</span>
      {verified && (
        <svg viewBox="0 0 24 24" width="12" height="12" className="profile-badge-check" aria-label="Verified">
          <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}
