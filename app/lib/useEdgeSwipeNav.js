'use client';

/**
 * initMobileEdgeSwipeNav
 * Allows left/right edge gestures to switch tabs/sections naturally on phones.
 */
export function initMobileEdgeSwipeNav() {
  if (typeof window === 'undefined') return () => {};

  let startX = 0;
  let startY = 0;
  let isEdge = false;

  function onTouchStart(e) {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    // Edge threshold: within 24px of screen edges
    isEdge = startX < 24 || startX > window.innerWidth - 24;
  }

  function onTouchEnd(e) {
    if (!isEdge || e.changedTouches.length !== 1) return;
    const touch = e.changedTouches[0];
    const diffX = touch.clientX - startX;
    const diffY = touch.clientY - startY;

    if (Math.abs(diffX) > 60 && Math.abs(diffY) < 40) {
      if (diffX > 0 && startX < 24) {
        // Swiped right from left edge -> dispatch back or previous
        window.dispatchEvent(new CustomEvent('shammah:edge-swipe-right'));
      } else if (diffX < 0 && startX > window.innerWidth - 24) {
        // Swiped left from right edge -> dispatch next
        window.dispatchEvent(new CustomEvent('shammah:edge-swipe-left'));
      }
    }
    isEdge = false;
  }

  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchend', onTouchEnd, { passive: true });

  return () => {
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchend', onTouchEnd);
  };
}
