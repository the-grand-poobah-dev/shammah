'use client';
import { useState, useEffect, useCallback } from 'react';

/**
 * useLayoutMode
 * Manages responsive layout switching across section pages.
 * Supports: 'list-rich', 'magazine-x2', 'magazine-flat', 'tiles', 'compact', 'rail', 'spotlight'
 *
 * Persists the user's choice to localStorage under `shammah_layout_${sectionKey}`
 * and defaults smartly based on container/viewport width:
 * - Phone (< 640px): 'list-rich' (or 'compact')
 * - Tablet/Desktop (>= 640px): 'magazine-x2' (or 'tiles')
 */
export function useLayoutMode(sectionKey = 'feed', fallbackMode = 'list-rich') {
  const storageKey = `shammah_layout_${sectionKey}`;

  const [layoutMode, setLayoutModeState] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) return saved;
        // Default based on screen width
        if (window.innerWidth >= 768 && fallbackMode === 'list-rich') {
          return 'magazine-x2';
        }
      } catch (_) {}
    }
    return fallbackMode;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved && saved !== layoutMode) {
        setLayoutModeState(saved);
      } else if (!saved) {
        // Apply responsive default
        const responsiveDefault = window.innerWidth >= 768 && fallbackMode === 'list-rich' ? 'magazine-x2' : fallbackMode;
        setLayoutModeState(responsiveDefault);
      }
    } catch (_) {}
  }, [storageKey, fallbackMode]);

  const setLayoutMode = useCallback(
    (newMode) => {
      setLayoutModeState(newMode);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(storageKey, newMode);
          window.dispatchEvent(
            new CustomEvent('shammah:layout-changed', {
              detail: { section: sectionKey, mode: newMode },
            })
          );
        } catch (_) {}
      }
    },
    [storageKey, sectionKey]
  );

  return [layoutMode, setLayoutMode];
}

export default useLayoutMode;
