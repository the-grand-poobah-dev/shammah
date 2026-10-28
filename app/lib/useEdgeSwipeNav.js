'use client';
import { playSound } from './soundEffects';

export const SWIPE_SECTIONS = [
  'all',
  'videos',
  'podcasts',
  'polls',
  'courses',
  'bible',
  'rss',
  'fundraisers',
  'challenges',
  'games',
];

/**
 * Checks if a touch target is or is contained within any horizontally scrollable
 * component, active modal, slider, or interactive element that shouldn't trigger an edge swipe.
 */
function isScrollableOrInteractive(target) {
  if (!target || typeof target.closest !== 'function') return false;

  // 1. Interactive controls and media
  if (
    target.closest(
      'input, textarea, select, button, a[href], label, audio, video, canvas, [role="button"], [role="slider"]'
    )
  ) {
    return true;
  }

  // 2. Active dialogs, modals, and popup sheets
  if (
    target.closest(
      '.modal-card, .popup-sheet-modal, .auth-overlay, .status-creator-card, .reel-creator-modal, .shammah-chatbot-window, [role="dialog"], .popup-backdrop, .author-modal-card'
    )
  ) {
    return true;
  }

  // 3. Known horizontally scrollable components in Shammah
  if (
    target.closest(
      '.status-tray-container, .status-tray-scroll-area, .status-card-item, .reels-shelf-container, .reel-shelf-card, .section-menu-inner, .section-menu, .top-nav-wrapper, .bottom-nav, .scroll-affordance-content, [data-scroll-affordance], .categories-chips-scroll, .explore-tabs-scroll, .overflow-x-auto, .overflow-x-scroll'
    )
  ) {
    return true;
  }

  // 4. Dynamic check for any element with horizontal scroll enabled
  let el = target;
  while (el && el !== document.body && el !== document.documentElement) {
    if (el.scrollWidth > el.clientWidth + 8) {
      const style = window.getComputedStyle(el);
      if (style.overflowX === 'auto' || style.overflowX === 'scroll') {
        return true;
      }
    }
    el = el.parentElement;
  }

  return false;
}

/**
 * Retrieves the current active section on the Home feed.
 */
function getCurrentSection() {
  if (typeof window === 'undefined') return 'all';
  const params = new URLSearchParams(window.location.search);
  const sec = params.get('section');
  if (sec && SWIPE_SECTIONS.includes(sec)) {
    return sec;
  }
  return 'all';
}

/**
 * Transitions to the target section on mobile.
 */
export function navigateToSection(nextSectionId) {
  if (typeof window === 'undefined') return;

  playSound('reaction');

  // Trigger haptic feedback on supported mobile devices
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(12);
  }

  // Dispatch custom events for page and navigation state
  window.dispatchEvent(new CustomEvent('shammah:set-tab', { detail: 'home' }));
  window.dispatchEvent(new CustomEvent('shammah:set-section', { detail: nextSectionId }));

  // Update URL history without page reload
  try {
    const url = new URL(window.location.href);
    if (nextSectionId === 'all') {
      url.searchParams.delete('section');
    } else {
      url.searchParams.set('section', nextSectionId);
    }
    window.history.replaceState({}, '', url.toString());
  } catch {}

  // Smooth scroll feed back to top
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Scroll active tab button in top nav into view
  setTimeout(() => {
    const tabEl = document.querySelector(`.section-menu-inner [data-section="${nextSectionId}"]`);
    if (tabEl && typeof tabEl.scrollIntoView === 'function') {
      tabEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, 60);
}

/**
 * Initializes mobile edge swipe detection to switch top nav tabs.
 * Only active on viewports <= 767px on the Home route.
 */
export function initMobileEdgeSwipeNav() {
  if (typeof window === 'undefined') return () => {};

  let isTracking = false;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let startTime = 0;

  const EDGE_ZONE_WIDTH = 75; // px from screen edge
  const MIN_SWIPE_DISTANCE = 45; // min horizontal px
  const MAX_SWIPE_DURATION = 800; // ms

  function onTouchStart(e) {
    // Only active on mobile viewports
    if (window.innerWidth > 767) return;

    // Only on home route (where top nav sections exist)
    if (window.location.pathname !== '/') return;

    // Ignore multi-touch gestures
    if (e.touches.length !== 1) {
      isTracking = false;
      return;
    }

    // Check if any modal is currently displayed
    if (
      document.querySelector(
        '.modal-card, .popup-sheet-modal, .auth-overlay, .status-creator-card, .reel-creator-modal, .shammah-chatbot-window, [role="dialog"]'
      )
    ) {
      isTracking = false;
      return;
    }

    const touch = e.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;

    // Verify touch started in the left or right edge zone
    const isEdge = x <= EDGE_ZONE_WIDTH || x >= window.innerWidth - EDGE_ZONE_WIDTH;
    if (!isEdge) {
      isTracking = false;
      return;
    }

    // Verify target is not a scrollable item or interactive control
    if (isScrollableOrInteractive(touch.target)) {
      isTracking = false;
      return;
    }

    isTracking = true;
    startX = x;
    startY = y;
    lastX = x;
    lastY = y;
    startTime = Date.now();
  }

  function onTouchMove(e) {
    if (!isTracking) return;
    if (e.touches.length !== 1) {
      isTracking = false;
      return;
    }

    const touch = e.touches[0];
    lastX = touch.clientX;
    lastY = touch.clientY;

    const deltaX = lastX - startX;
    const deltaY = lastY - startY;

    // If movement is predominantly vertical (scrolling feed), cancel swipe tracking
    if (Math.abs(deltaY) > 28 && Math.abs(deltaY) > Math.abs(deltaX)) {
      isTracking = false;
    }
  }

  function onTouchEnd() {
    if (!isTracking) return;
    isTracking = false;

    const deltaX = lastX - startX;
    const deltaY = lastY - startY;
    const duration = Date.now() - startTime;

    if (duration > MAX_SWIPE_DURATION) return;

    // Must be predominantly horizontal and exceed threshold distance
    if (Math.abs(deltaX) >= MIN_SWIPE_DISTANCE && Math.abs(deltaX) > Math.abs(deltaY) * 1.35) {
      const currentSection = getCurrentSection();
      const currentIndex = SWIPE_SECTIONS.indexOf(currentSection);
      const safeIndex = currentIndex !== -1 ? currentIndex : 0;

      if (deltaX < 0) {
        // Swiped Left -> Advance to NEXT section tab
        if (safeIndex < SWIPE_SECTIONS.length - 1) {
          const nextSec = SWIPE_SECTIONS[safeIndex + 1];
          navigateToSection(nextSec);
        }
      } else {
        // Swiped Right -> Return to PREVIOUS section tab
        if (safeIndex > 0) {
          const prevSec = SWIPE_SECTIONS[safeIndex - 1];
          navigateToSection(prevSec);
        }
      }
    }
  }

  function onTouchCancel() {
    isTracking = false;
  }

  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: true });
  window.addEventListener('touchend', onTouchEnd, { passive: true });
  window.addEventListener('touchcancel', onTouchCancel, { passive: true });

  return () => {
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('touchend', onTouchEnd);
    window.removeEventListener('touchcancel', onTouchCancel);
  };
}
