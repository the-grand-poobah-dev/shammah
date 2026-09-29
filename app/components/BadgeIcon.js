import { badgeById } from '../lib/badges';

export default function BadgeIcon({ badge, size = 14 }) {
  const b = typeof badge === 'string' ? badgeById(badge) : badge;
  if (!b) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {b.icon.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
