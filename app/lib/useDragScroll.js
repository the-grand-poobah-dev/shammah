'use client';
import { useRef, useEffect } from 'react';

// Reusable hook that gives any horizontally overflowing container smooth mouse/touch drag scrolling
export function useDragScroll() {
  const ref = useRef(null);
  const dragInfo = useRef({ isDown: false, startX: 0, scrollLeft: 0, hasMoved: false });

  function onPointerDown(e) {
    if (!ref.current) return;
    // Don't hijack input elements or buttons that were just clicked
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    dragInfo.current = {
      isDown: true,
      startX: e.pageX - ref.current.offsetLeft,
      scrollLeft: ref.current.scrollLeft,
      hasMoved: false,
    };
    ref.current.style.cursor = 'grabbing';
    ref.current.style.userSelect = 'none';
  }

  function onPointerMove(e) {
    if (!dragInfo.current.isDown || !ref.current) return;
    const x = e.pageX - ref.current.offsetLeft;
    const walk = (x - dragInfo.current.startX) * 1.35;
    if (Math.abs(walk) > 3) {
      dragInfo.current.hasMoved = true;
      ref.current.scrollLeft = dragInfo.current.scrollLeft - walk;
    }
  }

  function onPointerUp() {
    dragInfo.current.isDown = false;
    if (ref.current) {
      ref.current.style.cursor = 'grab';
      ref.current.style.removeProperty('user-select');
    }
  }

  return { ref, onPointerDown, onPointerMove, onPointerUp, dragInfo };
}

// Global helper that enables smooth mouse & touch dragging for all horizontal shelves in the DOM
export function initGlobalHorizontalDrag() {
  if (typeof window === 'undefined') return;

  function findScrollContainer(target) {
    if (!target || target === document.body || target === document.documentElement) return null;
    const explicitlyTagged = target.closest?.(
      '.section-menu-inner, .section-menu-pill, .churches-horizontal-scroll, .people-horizontal-scroll, .reels-shelf-scroll, .trending-reels-scroll, .giving-project-selector-row, .giving-proj-chips-row, .category-bar, .category-ticker-scroll, .compose-cat-chips-scroll, .status-tray-scroll, .status-tray-container, .video-subnav-bar, .bible-book-tabs, .bible-books-scroll, .profile-media-tabs, .search-tags-shelf, .global-search-tabs-row, .horizontal-scroll-shelf, [data-draggable-scroll="true"]'
    );
    if (explicitlyTagged) return explicitlyTagged;

    let el = target;
    while (el && el !== document.body && el !== document.documentElement) {
      if (el.scrollWidth > el.clientWidth + 4) {
        const style = window.getComputedStyle(el);
        if (style.overflowX === 'auto' || style.overflowX === 'scroll') {
          return el;
        }
      }
      el = el.parentElement;
    }
    return null;
  }

  function handlePointerDown(e) {
    // Ignore input fields, textareas, and sliders
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

    const scrollContainer = findScrollContainer(e.target);
    if (!scrollContainer) return;

    let isDown = true;
    let startX = e.pageX - scrollContainer.offsetLeft;
    let scrollLeft = scrollContainer.scrollLeft;
    let hasDragged = false;

    function onMove(moveEvent) {
      if (!isDown) return;
      const x = moveEvent.pageX - scrollContainer.offsetLeft;
      const walk = (x - startX) * 1.35;
      if (Math.abs(walk) > 4) {
        if (!hasDragged) {
          hasDragged = true;
          scrollContainer.style.cursor = 'grabbing';
          scrollContainer.style.userSelect = 'none';
        }
        scrollContainer.scrollLeft = scrollLeft - walk;
      }
    }

    function onUp(upEvent) {
      isDown = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);

      if (hasDragged) {
        // Prevent click trigger on children if user dragged across screen
        function captureClick(clickEvent) {
          clickEvent.stopPropagation();
          clickEvent.preventDefault();
        }
        scrollContainer.addEventListener('click', captureClick, { capture: true, once: true });
        setTimeout(() => {
          scrollContainer.removeEventListener('click', captureClick, { capture: true });
        }, 80);

        scrollContainer.style.cursor = 'grab';
        scrollContainer.style.removeProperty('user-select');
      }
    }

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp, { capture: true });
    window.addEventListener('pointercancel', onUp, { capture: true });
  }

  document.addEventListener('pointerdown', handlePointerDown, { passive: true });
  return () => document.removeEventListener('pointerdown', handlePointerDown);
}
