'use client';
import { useEffect } from 'react';
import { LayoutModeProvider, useLayoutMode } from '../lib/useLayoutMode';
import { SidePanelProvider } from '../lib/useSidePanel';
import LeftRail from './LeftRail';
import RightPanel from './RightPanel';

function AppFrameLayout({ children }) {
  const mode = useLayoutMode();
  // Default to 'on' unless explicitly set to 'off'
  const isEnabled = process.env.NEXT_PUBLIC_DESKTOP_LAYOUT !== 'off';

  // Live measurement of .sticky-header height so desktop columns remain pinned at exact top offset
  useEffect(() => {
    if (typeof window === 'undefined') return;

    function measureHeaderHeight() {
      const headerEl = document.querySelector('.sticky-header');
      if (headerEl) {
        const height = headerEl.offsetHeight;
        if (height > 0) {
          document.documentElement.style.setProperty('--sticky-header-h', `${height}px`);
        }
      }
    }

    measureHeaderHeight();

    let resizeObserver = null;
    const headerEl = document.querySelector('.sticky-header');
    if (typeof ResizeObserver !== 'undefined' && headerEl) {
      resizeObserver = new ResizeObserver(() => {
        measureHeaderHeight();
      });
      resizeObserver.observe(headerEl);
    }

    // Header expands/collapses on window scroll and viewport resize
    window.addEventListener('scroll', measureHeaderHeight, { passive: true });
    window.addEventListener('resize', measureHeaderHeight, { passive: true });

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('scroll', measureHeaderHeight);
      window.removeEventListener('resize', measureHeaderHeight);
    };
  }, []);

  return (
    <div
      className="app-layout"
      data-layout={mode}
      data-enabled={isEnabled ? 'true' : 'false'}
    >
      <aside className="dl-left" aria-label="Sidebar">
        <LeftRail />
      </aside>
      <div className="dl-center">{children}</div>
      <aside className="dl-right" aria-label="Side panel">
        <RightPanel />
      </aside>
    </div>
  );
}

export default function AppFrame({ children }) {
  return (
    <LayoutModeProvider>
      <SidePanelProvider>
        <AppFrameLayout>{children}</AppFrameLayout>
      </SidePanelProvider>
    </LayoutModeProvider>
  );
}
