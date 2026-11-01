/**
 * LayoutSwitcher - Shammah Layout Kit Segmented Control
 * 
 * Props:
 *  - value {string}: Active layout identifier (e.g. 'magazine-flat', 'list-rich').
 *  - onChange {Function}: (layoutId: string) => void.
 *  - options {Array<{ id: string, label: string, icon: LucideIcon }|string>}: Optional options list.
 *  - storageKey {string}: Page key (e.g. 'videos', 'courses'). When passed, persists
 *                         preference in localStorage['shammah:layout:<storageKey>']
 *                         and loads it after mount to prevent hydration mismatch.
 *  - className {string}: Additional classes.
 *  - size {'sm'|'md'}: Control size (default 'md').
 *  - ariaLabel {string}: Custom accessible name for the radiogroup.
 */

'use client';

import React, { useEffect, useState } from 'react';
import {
  LayoutGrid,
  Rows,
  Columns2,
  List,
  GalleryHorizontal,
  Rows3,
  Sparkles,
} from 'lucide-react';

const ICON_MAP = {
  'magazine-flat': { label: 'Magazine Hero', icon: Rows },
  'magazine-x2': { label: 'Two-Column Magazine', icon: Columns2 },
  'list-rich': { label: 'Rich List', icon: List },
  'rail': { label: 'Horizontal Rail', icon: GalleryHorizontal },
  'tiles': { label: 'Tiles Grid', icon: LayoutGrid },
  'grid': { label: 'Tiles Grid', icon: LayoutGrid },
  'compact': { label: 'Compact List', icon: Rows3 },
  'spotlight': { label: 'Spotlight Feature', icon: Sparkles },
};

const DEFAULT_OPTIONS = [
  { id: 'magazine-flat', label: 'Magazine Hero', icon: Rows },
  { id: 'magazine-x2', label: 'Two-Column Magazine', icon: Columns2 },
  { id: 'list-rich', label: 'Rich List', icon: List },
  { id: 'rail', label: 'Horizontal Rail', icon: GalleryHorizontal },
  { id: 'tiles', label: 'Tiles Grid', icon: LayoutGrid },
];

export default function LayoutSwitcher({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  storageKey,
  className = '',
  size = 'md',
  ariaLabel = 'Content layout view options',
  ...restProps
}) {
  const [mounted, setMounted] = useState(false);

  // Normalize options if passed as simple strings or custom objects
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'string') {
      const mapped = ICON_MAP[opt];
      return {
        id: opt,
        label: mapped?.label || opt.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        icon: mapped?.icon || LayoutGrid,
      };
    }
    if (opt && typeof opt === 'object' && !opt.icon && ICON_MAP[opt.id]) {
      return {
        ...opt,
        icon: ICON_MAP[opt.id].icon,
      };
    }
    return opt;
  });

  // Load persisted layout preference after mount to avoid SSR hydration mismatch
  useEffect(() => {
    setMounted(true);
    if (!storageKey || typeof window === 'undefined') return;

    try {
      const saved =
        localStorage.getItem(`shammah:layout:${storageKey}`) ||
        localStorage.getItem(storageKey);

      if (saved && saved !== value) {
        const isValid = normalizedOptions.some((o) => o.id === saved);
        if (isValid && onChange) {
          onChange(saved);
        }
      }
    } catch {
      // Storage unavailable (e.g. private mode)
    }
  }, [storageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = (id) => {
    if (onChange) onChange(id);
    if (storageKey && typeof window !== 'undefined') {
      try {
        localStorage.setItem(`shammah:layout:${storageKey}`, id);
        localStorage.setItem(storageKey, id);
      } catch {
        // Storage full/blocked
      }
    }
  };

  return (
    <div
      className={`layout-switcher layout-switcher-bar layout-switcher--${size} ${className}`.trim()}
      role="radiogroup"
      aria-label={ariaLabel}
      {...restProps}
    >
      {normalizedOptions.map((opt) => {
        const Icon = opt.icon;
        const isSelected = value === opt.id;

        return (
          <button
            key={opt.id}
            type="button"
            className={`layout-switcher__btn layout-switch-pill ${
              isSelected ? 'is-active active' : ''
            }`}
            onClick={() => handleSelect(opt.id)}
            role="radio"
            aria-checked={isSelected}
            aria-label={opt.label}
            title={opt.label}
          >
            {Icon && <Icon size={16} strokeWidth={isSelected ? 2.4 : 1.9} />}
            <span className="layout-switch-label">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export { LayoutSwitcher };
