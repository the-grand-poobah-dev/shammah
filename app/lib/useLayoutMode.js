'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const LayoutModeContext = createContext('mobile');

function getViewportLayoutMode() {
  if (typeof window === 'undefined') return 'mobile';
  const width = window.innerWidth;
  if (width >= 1100) return 'desktop';
  if (width >= 768) return 'tablet';
  return 'mobile';
}

export function LayoutModeProvider({ children }) {
  // SSR and initial client hydration value is strictly 'mobile' to eliminate hydration mismatches
  const [layoutMode, setLayoutMode] = useState('mobile');

  useEffect(() => {
    // Resolve real layout mode immediately after mount
    setLayoutMode(getViewportLayoutMode());

    const mqlDesktop = window.matchMedia('(min-width: 1100px)');
    const mqlTablet = window.matchMedia('(min-width: 768px) and (max-width: 1099px)');

    function handleMediaChange() {
      setLayoutMode(getViewportLayoutMode());
    }

    if (mqlDesktop.addEventListener) {
      mqlDesktop.addEventListener('change', handleMediaChange);
      mqlTablet.addEventListener('change', handleMediaChange);
    } else {
      mqlDesktop.addListener(handleMediaChange);
      mqlTablet.addListener(handleMediaChange);
    }

    window.addEventListener('resize', handleMediaChange, { passive: true });

    return () => {
      if (mqlDesktop.removeEventListener) {
        mqlDesktop.removeEventListener('change', handleMediaChange);
        mqlTablet.removeEventListener('change', handleMediaChange);
      } else {
        mqlDesktop.removeListener(handleMediaChange);
        mqlTablet.removeListener(handleMediaChange);
      }
      window.removeEventListener('resize', handleMediaChange);
    };
  }, []);

  return (
    <LayoutModeContext.Provider value={layoutMode}>
      {children}
    </LayoutModeContext.Provider>
  );
}

export function useLayoutMode() {
  return useContext(LayoutModeContext);
}
