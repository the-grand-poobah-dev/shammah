'use client';

/**
 * Twitter / Facebook / Instagram style scalloped verification badge.
 * Color dynamically reflects the member tag / role:
 *  - Green: Pastor, Elder, Reverend, Bishop, Apostle, Priest, Prophet (Spiritual Leadership)
 *  - Red: Platform Admin, Church Admin, Overseer, Ministry Director (Administrative Governance)
 *  - Purple: Worship Leader, Youth Leader, Teacher, Intercessor, Evangelist (Serving & Ministry)
 *  - Blue: Believer, Seeker, Student, Deacon, Verified Member (Twitter / Facebook iconic Blue)
 */

export function getBadgeColor(badgeId, role) {
  if (role === 'platform_admin' || role === 'church_admin') {
    return '#ef4444'; // Red for administration / governance
  }

  const id = (badgeId || '').toLowerCase();

  // Green: Pastoral / Spiritual Leadership
  if (['pastor', 'elder', 'reverend', 'bishop', 'apostle', 'priest', 'prophet', 'chaplain'].includes(id)) {
    return '#10b981';
  }

  // Red: Administrative & Overseers
  if (['admin', 'director', 'overseer', 'missionary'].includes(id)) {
    return '#ef4444';
  }

  // Purple / Gold: Ministry & Worship
  if (['worship', 'youth', 'teacher', 'intercessor', 'evangelist'].includes(id)) {
    return '#8b5cf6';
  }

  // Default: Iconic Social Verified Blue
  return '#1d9bf0';
}

export default function VerifiedBadge({ badge, role, size = 15, className = '', title = 'Verified Member' }) {
  const color = getBadgeColor(badge, role);

  return (
    <span
      className={`verified-badge-wrap ${className}`.trim()}
      title={title}
      style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle', flexShrink: 0 }}
    >
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className="verified-badge-svg"
        aria-label={title}
      >
        {/* Scalloped rosette seal (Twitter/Facebook style) */}
        <path
          d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.67-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z"
          fill={color}
        />
        {/* Centered white checkmark */}
        <path
          d="M9.75 16.5l-4-4 1.41-1.42 2.59 2.59 7.09-7.09 1.41 1.42-8.5 8.5z"
          fill="#ffffff"
        />
      </svg>
    </span>
  );
}
