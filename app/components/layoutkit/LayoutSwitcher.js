/**
 * LayoutSwitcher - Shammah Layout Kit Segmented Control
 * 
 * Props:
 *  - value {string}: Active layout identifier (e.g. 'magazine-flat', 'list-rich').
 *  - onChange {Function}: (layoutId: string) => void.
 *  - options {Array<{ id: string, label: string, icon: LucideIcon }>}: Optional options list.
 *  - storageKey {string}: Page key (e.g. 'videos', 'courses'). When passed, persists
 *                         preference in localStorage['shammah:layout:<storageKey>']
 *                         and loads it after mount to prevent hydration mismatch.
 *  - className {string}: Additional classes.
 *  - size {'sm'|'md'}: Control size (default 'md').
 */

'use client';

import React, { useEffect, useState } from 'react';
import {
  LayoutGrid,
  Rows,
  Columns2,
  List,
  GalleryHorizontal,
} from 'lucide-react';

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
  ...restProps
}) {
  const [mounted, setMounted] = useState(false);

  // Normalize options if passed as simple strings
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'string') {
      const match = DEFAULT_OPTIONS.find((d) => d.id === opt);
      return (
        match || {
          id: opt,
          label: opt.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          icon: LayoutGrid,
        }
      );
    }
    return opt;
  });

  // Load persisted layout preference after mount to avoid SSR hydration mismatch
  useEffect(() => {
    setMounted(true);
    if (!storageKey || typeof window === 'undefined') return;

    try {
      const saved = localStorage.getItem(`shammah:layout:${storageKey}`);
      if (saved && saved !== value) {
        const isValid = normalizedOptions.some((o) => o.id === saved);
        if (isValid && onChange) {
          onChange(saved);
        }
      }
    } catch {
      // Storage unavailable or disabled
    }
  }, [storageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = (id) => {
    if (onChange) onChange(id);
    if (storageKey && typeof window !== 'undefined') {
      try {
        localStorage.setItem(`shammah:layout:${storageKey}`, id);
      } catch {
        // Storage full/blocked
      }
    }
  };

  return (
    <div
      className={`layout-switcher layout-switcher--${size} ${className}`}
      role="radiogroup"
      aria-label="Content layout view options"
      {...restProps}
    >
      {normalizedOptions.map((opt) => {
        const Icon = opt.icon;
        const isSelected = value === opt.id;

        return (
          <button
            key={opt.id}
            type="button"
            className={`layout-switcher__btn ${isSelected ? 'is-active' : ''}`}
            onClick={() => handleSelect(opt.id)}
            role="radio"
            aria-checked={isSelected}
            aria-label={opt.label}
            title={opt.label}
          >
            {Icon && <Icon size={16} strokeWidth={2.2} />}
          </button>
        );
      })}
    </div>
  );
}
