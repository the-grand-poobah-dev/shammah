'use client';
import { useRef, useEffect } from 'react';
export { initGlobalScrollAffordances, useScrollAffordances } from './useScrollAffordances';

// Reusable hook that gives any horizontally overflowing container smooth mouse/touch drag scrolling
export function useDragScroll() {
  const ref = useRef(null);
  const dragInfo = useRef({ isDown: false, startX: 0, scrollLeft: 0, hasMoved: false });

  function onPointerDown(e) {
    if (!ref.current) return;
    // Don't hijack input elements or buttons that were just clicked
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.closest?.('.scroll-affordance-btn, .status-tray-scroll-btn')) return;
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
    // Ignore input fields, textareas, sliders, and scroll affordance buttons
    if (
      e.target.tagName === 'INPUT' ||
      e.target.tagName === 'TEXTAREA' ||
      e.target.tagName === 'SELECT' ||
      e.target.closest?.('.scroll-affordance-btn, .status-tray-scroll-btn')
    )
      return;

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

// Re-export hook for components
export { useScrollAffordances } from './useScrollAffordances';

const CHEVRON_SVG = {
  left: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
  right: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
  up: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>',
  down: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
};

/**
 * initGlobalScrollAffordances
 *
 * Scans DOM for scrollable horizontal and vertical containers across the app,
 * attaching subtle circular arrow buttons (‹ › and ˄ ˅) that appear when content
 * overflows, scroll smoothly on click, accelerate smoothly on long-press,
 * and disappear when boundaries are reached without interfering with drag gestures.
 */
export function initGlobalScrollAffordances() {
  if (typeof window === 'undefined') return () => {};

  const HORIZONTAL_SELECTOR =
    '.section-menu-inner, .section-menu-pill, .churches-horizontal-scroll, .people-horizontal-scroll, .reels-shelf-scroll, .trending-reels-scroll, .giving-project-selector-row, .giving-proj-chips-row, .category-bar, .category-ticker-scroll, .compose-cat-chips-scroll, .status-tray-scroll, .video-subnav-bar, .bible-book-tabs, .bible-books-scroll, .bible-chapters-scroll, .profile-media-tabs, .search-tags-shelf, .global-search-tabs-row, .horizontal-scroll-shelf, .institutions-filter-bar, .courses-main-tabs, .notif-categories-bar, .chal-pills-scroll, .arcade-game-tabs, [data-draggable-scroll="true"]';

  const VERTICAL_SELECTOR =
    '.popup-sheet-body, .inbox-thread-messages, .inbox-sidebar, .offline-items-list, .offline-cached-verses-list, .hidden-stories-list, .activity-modal-scroll, .chatbot-messages-area, .report-modal-scroll-area, .post-options-list, .picker-emoji-grid, .share-menu-options-list, .gws-items-list, .tag-members-list, .feeling-grid, [data-scrollable-vertical="true"]';

  const managedContainers = new WeakSet();

  function createAffordanceButton(direction, ariaLabel) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `scroll-affordance-btn ${
      direction === 'left'
        ? 'horizontal-left'
        : direction === 'right'
        ? 'horizontal-right'
        : direction === 'up'
        ? 'vertical-up'
        : 'vertical-down'
    }`;
    btn.setAttribute('aria-label', ariaLabel);
    btn.setAttribute('data-scroll-affordance-btn', 'true');
    btn.tabIndex = 0;
    btn.style.display = 'none';
    btn.innerHTML = CHEVRON_SVG[direction];
    return btn;
  }

  function wireButtonInteractions(btn, targetEl, direction) {
    let animFrame = null;
    let pressTimer = null;
    let isPressing = false;
    let startTime = 0;
    let hasHeld = false;

    function stop() {
      isPressing = false;
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
      if (animFrame) {
        cancelAnimationFrame(animFrame);
        animFrame = null;
      }
    }

    function step() {
      if (!targetEl || !targetEl.isConnected) return;
      const isVertical = direction === 'up' || direction === 'down';
      const containerSize = isVertical ? targetEl.clientHeight : targetEl.clientWidth;
      const dist = Math.max(160, Math.round(containerSize * 0.65));

      let left = 0;
      let top = 0;
      if (direction === 'left') left = -dist;
      if (direction === 'right') left = dist;
      if (direction === 'up') top = -dist;
      if (direction === 'down') top = dist;

      targetEl.scrollBy({ left, top, behavior: 'smooth' });
    }

    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      stop();

      isPressing = true;
      hasHeld = false;
      startTime = performance.now();

      pressTimer = setTimeout(() => {
        if (!isPressing) return;
        hasHeld = true;

        const loop = () => {
          if (!isPressing || !targetEl || !targetEl.isConnected) return;
          const elapsed = performance.now() - startTime;
          const speed = Math.min(22, 7 + (elapsed / 500) * 8);

          if (direction === 'left') {
            targetEl.scrollLeft -= speed;
            if (targetEl.scrollLeft <= 0) return;
          } else if (direction === 'right') {
            targetEl.scrollLeft += speed;
            if (targetEl.scrollLeft + targetEl.clientWidth >= targetEl.scrollWidth - 1) return;
          } else if (direction === 'up') {
            targetEl.scrollTop -= speed;
            if (targetEl.scrollTop <= 0) return;
          } else if (direction === 'down') {
            targetEl.scrollTop += speed;
            if (targetEl.scrollTop + targetEl.clientHeight >= targetEl.scrollHeight - 1) return;
          }

          animFrame = requestAnimationFrame(loop);
        };

        animFrame = requestAnimationFrame(loop);
      }, 220);
    });

    btn.addEventListener('pointerup', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!hasHeld && isPressing) {
        step();
      }
      stop();
    });

    btn.addEventListener('pointercancel', stop);
    btn.addEventListener('pointerleave', stop);
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        step();
      }
    });

    return stop;
  }

  function setupAffordance(container, axis) {
    if (!container || managedContainers.has(container)) return;
    if (container.hasAttribute('data-has-scroll-affordance')) return;
    if (container.hasAttribute('data-global-affordance-attached')) return;

    const parent = container.parentElement;
    if (!parent) return;

    // Check parent positioning context so absolute buttons anchor correctly
    const parentStyle = window.getComputedStyle(parent);
    if (parentStyle.position === 'static') {
      parent.classList.add('scroll-affordance-parent');
    }

    managedContainers.add(container);
    container.setAttribute('data-global-affordance-attached', 'true');

    const cleanups = [];
    const isHorizontal = axis === 'horizontal' || axis === 'both';
    const isVertical = axis === 'vertical' || axis === 'both';

    let btnLeft = null;
    let btnRight = null;
    let btnUp = null;
    let btnDown = null;

    if (isHorizontal) {
      btnLeft = createAffordanceButton('left', 'Scroll backward');
      btnRight = createAffordanceButton('right', 'Scroll forward');
      parent.appendChild(btnLeft);
      parent.appendChild(btnRight);
      cleanups.push(wireButtonInteractions(btnLeft, container, 'left'));
      cleanups.push(wireButtonInteractions(btnRight, container, 'right'));
    }

    if (isVertical) {
      btnUp = createAffordanceButton('up', 'Scroll upward');
      btnDown = createAffordanceButton('down', 'Scroll downward');
      parent.appendChild(btnUp);
      parent.appendChild(btnDown);
      cleanups.push(wireButtonInteractions(btnUp, container, 'up'));
      cleanups.push(wireButtonInteractions(btnDown, container, 'down'));
    }

    function checkVisibility() {
      if (!container.isConnected) return;

      const {
        scrollLeft,
        scrollTop,
        scrollWidth,
        scrollHeight,
        clientWidth,
        clientHeight,
      } = container;

      if (isHorizontal && btnLeft && btnRight) {
        const hasH = scrollWidth > clientWidth + 4;
        const canLeft = hasH && scrollLeft > 6;
        const canRight = hasH && scrollLeft + clientWidth < scrollWidth - 6;
        btnLeft.style.display = canLeft ? 'flex' : 'none';
        btnRight.style.display = canRight ? 'flex' : 'none';
      }

      if (isVertical && btnUp && btnDown) {
        const hasV = scrollHeight > clientHeight + 4;
        const canUp = hasV && scrollTop > 6;
        const canDown = hasV && scrollTop + clientHeight < scrollHeight - 6;
        btnUp.style.display = canUp ? 'flex' : 'none';
        btnDown.style.display = canDown ? 'flex' : 'none';
      }
    }

    container.addEventListener('scroll', checkVisibility, { passive: true });
    window.addEventListener('resize', checkVisibility);

    let resizeObs = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObs = new ResizeObserver(checkVisibility);
      try {
        resizeObs.observe(container);
        if (container.firstElementChild) {
          resizeObs.observe(container.firstElementChild);
        }
      } catch (_) {}
    }

    // Initial check
    checkVisibility();
    // Subsequent checks after images/fonts hydrate
    setTimeout(checkVisibility, 150);
    setTimeout(checkVisibility, 400);

    return () => {
      container.removeEventListener('scroll', checkVisibility);
      window.removeEventListener('resize', checkVisibility);
      resizeObs?.disconnect();
      cleanups.forEach((c) => c?.());
      btnLeft?.remove();
      btnRight?.remove();
      btnUp?.remove();
      btnDown?.remove();
      container.removeAttribute('data-global-affordance-attached');
    };
  }

  function scanAndEnhance() {
    const horizontalItems = document.querySelectorAll(HORIZONTAL_SELECTOR);
    horizontalItems.forEach((el) => {
      setupAffordance(el, 'horizontal');
    });

    const verticalItems = document.querySelectorAll(VERTICAL_SELECTOR);
    verticalItems.forEach((el) => {
      setupAffordance(el, 'vertical');
    });
  }

  scanAndEnhance();

  let scanTimer = null;
  const debouncedScan = () => {
    if (scanTimer) clearTimeout(scanTimer);
    scanTimer = setTimeout(scanAndEnhance, 100);
  };

  const observer = new MutationObserver(debouncedScan);
  observer.observe(document.body, { childList: true, subtree: true });

  window.addEventListener('resize', debouncedScan);

  return () => {
    if (scanTimer) clearTimeout(scanTimer);
    observer.disconnect();
    window.removeEventListener('resize', debouncedScan);
  };
}
