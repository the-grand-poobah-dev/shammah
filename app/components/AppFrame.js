'use client';
import { useEffect } from 'react';
import { LayoutModeProvider, useLayoutMode } from '../lib/useLayoutMode';
import { SidePanelProvider, useSidePanel } from '../lib/useSidePanel';
import LeftRail from './LeftRail';
import RightPanel from './RightPanel';

function AppFrameLayout({ children }) {
  const mode = useLayoutMode();
  const { activePanel, isCollapsed, closePanel } = useSidePanel();
  // Default to 'on' unless explicitly set to 'off'
  const isEnabled = process.env.NEXT_PUBLIC_DESKTOP_LAYOUT !== 'off';
  const isTablet = mode === 'tablet';
  const isDrawerOpen = isTablet && Boolean(activePanel) && !isCollapsed;

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

      {/* Tablet Drawer Scrim at z-index 58 */}
      <div
        className={`dl-drawer-scrim${isDrawerOpen ? ' open' : ''}`}
        onClick={closePanel}
        aria-hidden="true"
      />

      <aside
        className={`dl-right${isDrawerOpen ? ' dl-drawer-open' : ''}`}
        aria-label="Side panel"
        data-open={isDrawerOpen ? 'true' : 'false'}
        role={isTablet ? 'dialog' : undefined}
        aria-modal={isTablet && isDrawerOpen ? 'true' : undefined}
      >
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
