'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useScrollAffordances
 *
 * Tracks overflow & scroll positions on any horizontal or vertical container,
 * providing accurate state (canScrollLeft, canScrollRight, canScrollUp, canScrollDown),
 * smooth step scrolling, and long-press acceleration via requestAnimationFrame.
 */
export function useScrollAffordances({
  targetRef,
  axis = 'horizontal', // 'horizontal' | 'vertical' | 'both'
  threshold = 6,
  scrollDistance = 240,
} = {}) {
  const [canScroll, setCanScroll] = useState({
    left: false,
    right: false,
    up: false,
    down: false,
  });

  const animFrameRef = useRef(null);
  const pressTimerRef = useRef(null);
  const isPressingRef = useRef(false);
  const pressStartRef = useRef(0);
  const longPressedRef = useRef(false);

  const checkScroll = useCallback(() => {
    const el = targetRef?.current;
    if (!el) return;

    const {
      scrollLeft,
      scrollTop,
      scrollWidth,
      scrollHeight,
      clientWidth,
      clientHeight,
    } = el;

    const isH = axis === 'horizontal' || axis === 'both';
    const isV = axis === 'vertical' || axis === 'both';

    // Only allow scrolling if element truly overflows by more than 4px
    const hasHOverflow = scrollWidth > clientWidth + 4;
    const hasVOverflow = scrollHeight > clientHeight + 4;

    const canLeft = isH && hasHOverflow && scrollLeft > threshold;
    const canRight = isH && hasHOverflow && scrollLeft + clientWidth < scrollWidth - threshold;
    const canUp = isV && hasVOverflow && scrollTop > threshold;
    const canDown = isV && hasVOverflow && scrollTop + clientHeight < scrollHeight - threshold;

    setCanScroll((prev) => {
      if (
        prev.left === canLeft &&
        prev.right === canRight &&
        prev.up === canUp &&
        prev.down === canDown
      ) {
        return prev;
      }
      return { left: canLeft, right: canRight, up: canUp, down: canDown };
    });
  }, [targetRef, axis, threshold]);

  const stepScroll = useCallback(
    (direction, customDistance) => {
      const el = targetRef?.current;
      if (!el) return;

      const isVertical = direction === 'up' || direction === 'down';
      const containerSize = isVertical ? el.clientHeight : el.clientWidth;
      const dist =
        customDistance ||
        scrollDistance ||
        Math.max(160, Math.round(containerSize * 0.65));

      let left = 0;
      let top = 0;
      if (direction === 'left') left = -dist;
      if (direction === 'right') left = dist;
      if (direction === 'up') top = -dist;
      if (direction === 'down') top = dist;

      el.scrollBy({ left, top, behavior: 'smooth' });

      // Recheck scroll state across smooth-scroll duration
      setTimeout(checkScroll, 80);
      setTimeout(checkScroll, 220);
      setTimeout(checkScroll, 400);
    },
    [targetRef, scrollDistance, checkScroll]
  );

  const stopContinuousScroll = useCallback(() => {
    isPressingRef.current = false;
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    checkScroll();
  }, [checkScroll]);

  const startContinuousScroll = useCallback(
    (direction) => {
      const el = targetRef?.current;
      if (!el) return;

      stopContinuousScroll();
      isPressingRef.current = true;
      pressStartRef.current = performance.now();
      longPressedRef.current = false;

      // Delay before continuous scroll loop begins (distinguishes tap from hold)
      pressTimerRef.current = setTimeout(() => {
        if (!isPressingRef.current) return;
        longPressedRef.current = true;

        const loop = () => {
          if (!isPressingRef.current || !el) return;

          const elapsed = performance.now() - pressStartRef.current;
          // Smooth acceleration: begins at 7px/frame, scales up to 22px/frame
          const speed = Math.min(22, 7 + (elapsed / 500) * 8);

          if (direction === 'left') {
            el.scrollLeft -= speed;
            if (el.scrollLeft <= 0) {
              checkScroll();
              return;
            }
          } else if (direction === 'right') {
            el.scrollLeft += speed;
            if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 1) {
              checkScroll();
              return;
            }
          } else if (direction === 'up') {
            el.scrollTop -= speed;
            if (el.scrollTop <= 0) {
              checkScroll();
              return;
            }
          } else if (direction === 'down') {
            el.scrollTop += speed;
            if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) {
              checkScroll();
              return;
            }
          }

          checkScroll();
          animFrameRef.current = requestAnimationFrame(loop);
        };

        animFrameRef.current = requestAnimationFrame(loop);
      }, 220);
    },
    [targetRef, stopContinuousScroll, checkScroll]
  );

  const handlePointerUp = useCallback(
    (direction) => {
      if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
        pressTimerRef.current = null;
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }

      if (!longPressedRef.current && isPressingRef.current) {
        // Quick tap: trigger single smooth scroll step
        stepScroll(direction);
      }

      isPressingRef.current = false;
      longPressedRef.current = false;
    },
    [stepScroll]
  );

  useEffect(() => {
    const el = targetRef?.current;
    if (!el) return;

    checkScroll();

    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);

    let resizeObs = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObs = new ResizeObserver(() => checkScroll());
      try {
        resizeObs.observe(el);
        if (el.firstElementChild) {
          resizeObs.observe(el.firstElementChild);
        }
      } catch (_) {}
    }

    let mutObs = null;
    if (typeof MutationObserver !== 'undefined') {
      mutObs = new MutationObserver(() => checkScroll());
      try {
        mutObs.observe(el, { childList: true, subtree: true });
      } catch (_) {}
    }

    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
      resizeObs?.disconnect();
      mutObs?.disconnect();
      stopContinuousScroll();
    };
  }, [targetRef, checkScroll, stopContinuousScroll]);

  const getButtonProps = useCallback(
    (direction, ariaLabel) => {
      const isVisible =
        direction === 'left'
          ? canScroll.left
          : direction === 'right'
          ? canScroll.right
          : direction === 'up'
          ? canScroll.up
          : canScroll.down;

      const defaultLabel =
        direction === 'left'
          ? 'Scroll left'
          : direction === 'right'
          ? 'Scroll right'
          : direction === 'up'
          ? 'Scroll up'
          : 'Scroll down';

      return {
        type: 'button',
        tabIndex: isVisible ? 0 : -1,
        'aria-label': ariaLabel || defaultLabel,
        className: `scroll-affordance-btn ${
          direction === 'left'
            ? 'horizontal-left'
            : direction === 'right'
            ? 'horizontal-right'
            : direction === 'up'
            ? 'vertical-up'
            : 'vertical-down'
        }`,
        onPointerDown: (e) => {
          // Do not steal focus that could cause window to jump
          e.preventDefault();
          e.stopPropagation();
          startContinuousScroll(direction);
        },
        onPointerUp: (e) => {
          e.preventDefault();
          e.stopPropagation();
          handlePointerUp(direction);
        },
        onPointerCancel: () => stopContinuousScroll(),
        onPointerLeave: () => stopContinuousScroll(),
        onClick: (e) => {
          e.preventDefault();
          e.stopPropagation();
        },
        onKeyDown: (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            stepScroll(direction);
          }
        },
      };
    },
    [canScroll, startContinuousScroll, handlePointerUp, stopContinuousScroll, stepScroll]
  );

  return {
    canScrollLeft: canScroll.left,
    canScrollRight: canScroll.right,
    canScrollUp: canScroll.up,
    canScrollDown: canScroll.down,
    checkScroll,
    stepScroll,
    startContinuousScroll,
    stopContinuousScroll,
    handlePointerUp,
    getButtonProps,
  };
}
