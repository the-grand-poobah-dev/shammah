'use client';

/**
 * Distinctive Pushpin / Thumbtack icon for community announcements
 */
export default function PinIcon({ className = 'pinned-icon', filled = true, ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={filled ? 0 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6l1 1 1-1v-6H18v-2l-2-2z" />
    </svg>
  );
}
