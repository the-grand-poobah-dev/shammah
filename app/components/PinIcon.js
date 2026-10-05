'use client';
import { Pin } from 'lucide-react';

/**
 * Standard Pushpin / Thumbtack icon for community announcements, backed by lucide-react
 */
export default function PinIcon({ className = 'pinned-icon', size = 14, ...props }) {
  return <Pin size={size} className={className} aria-hidden="true" {...props} />;
}
