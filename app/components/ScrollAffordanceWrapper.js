'use client';
import { useRef, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { useScrollAffordances } from '../lib/useScrollAffordances';

/**
 * Reusable standalone button pair for containers that already have position: relative
 * Usage: <ScrollAffordanceButtons containerRef={scrollRef} direction="horizontal" />
 */
export function ScrollAffordanceButtons({
  containerRef,
  direction = 'horizontal',
  className = '',
  leftLabel = 'Scroll back',
  rightLabel = 'Scroll forward',
  upLabel = 'Scroll up',
  downLabel = 'Scroll down',
}) {
  const {
    canScrollLeft,
    canScrollRight,
    canScrollUp,
    canScrollDown,
    handlePointerDown,
    handlePointerUp,
  } = useScrollAffordances(containerRef, { direction });

  const isHorizontal = direction === 'horizontal' || direction === 'both';
  const isVertical = direction === 'vertical' || direction === 'both';

  return (
    <>
      {isHorizontal && canScrollLeft && (
        <button
          type="button"
          tabIndex={-1}
          className={`scroll-affordance-btn horizontal prev left ${className}`}
          aria-label={leftLabel}
          title={leftLabel}
          onPointerDown={(e) => handlePointerDown('left', e)}
          onPointerUp={(e) => handlePointerUp('left', e)}
          onPointerCancel={(e) => handlePointerUp('left', e)}
          onPointerLeave={(e) => handlePointerUp('left', e)}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <ChevronLeft size={16} strokeWidth={2.4} />
        </button>
      )}

      {isHorizontal && canScrollRight && (
        <button
          type="button"
          tabIndex={-1}
          className={`scroll-affordance-btn horizontal next right ${className}`}
          aria-label={rightLabel}
          title={rightLabel}
          onPointerDown={(e) => handlePointerDown('right', e)}
          onPointerUp={(e) => handlePointerUp('right', e)}
          onPointerCancel={(e) => handlePointerUp('right', e)}
          onPointerLeave={(e) => handlePointerUp('right', e)}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <ChevronRight size={16} strokeWidth={2.4} />
        </button>
      )}

      {isVertical && canScrollUp && (
        <button
          type="button"
          tabIndex={-1}
          className={`scroll-affordance-btn vertical prev top ${className}`}
          aria-label={upLabel}
          title={upLabel}
          onPointerDown={(e) => handlePointerDown('up', e)}
          onPointerUp={(e) => handlePointerUp('up', e)}
          onPointerCancel={(e) => handlePointerUp('up', e)}
          onPointerLeave={(e) => handlePointerUp('up', e)}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <ChevronUp size={16} strokeWidth={2.4} />
        </button>
      )}

      {isVertical && canScrollDown && (
        <button
          type="button"
          tabIndex={-1}
          className={`scroll-affordance-btn vertical next bottom ${className}`}
          aria-label={downLabel}
          title={downLabel}
          onPointerDown={(e) => handlePointerDown('down', e)}
          onPointerUp={(e) => handlePointerUp('down', e)}
          onPointerCancel={(e) => handlePointerUp('down', e)}
          onPointerLeave={(e) => handlePointerUp('down', e)}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <ChevronDown size={16} strokeWidth={2.4} />
        </button>
      )}
    </>
  );
}

/**
 * Reusable wrapper that wraps ANY scroll container and equips it with subtle,
 * consistent scroll affordance buttons.
 *
 * Usage:
 * <ScrollAffordanceWrapper direction="horizontal">
 *   <div className="churches-horizontal-scroll ...">
 *      ...
 *   </div>
 * </ScrollAffordanceWrapper>
 */
export default function ScrollAffordanceWrapper({
  children,
  direction = 'horizontal',
  className = '',
  style = {},
  targetRef = null,
  leftLabel,
  rightLabel,
  upLabel,
  downLabel,
}) {
  const wrapperRef = useRef(null);
  const internalTargetRef = useRef(null);
  const [ready, setReady] = useState(false);

  // If consumer passed an explicit targetRef, use it. Otherwise, locate scroll child.
  const activeTargetRef = targetRef || internalTargetRef;

  useEffect(() => {
    if (targetRef && targetRef.current) {
      targetRef.current.setAttribute('data-has-scroll-affordance', 'true');
      setReady(true);
      return;
    }

    if (wrapperRef.current) {
      // Find the first scrollable descendant or immediate child
      const scrollEl =
        wrapperRef.current.querySelector(
          '.no-scrollbar, [class*="scroll"], [class*="tabs"], [class*="row"], [class*="bar"], [data-draggable-scroll="true"]'
        ) || wrapperRef.current.firstElementChild;

      if (scrollEl) {
        internalTargetRef.current = scrollEl;
        scrollEl.setAttribute('data-has-scroll-affordance', 'true');
        setReady(true);
      }
    }
  }, [targetRef, children]);

  return (
    <div
      ref={wrapperRef}
      className={`scroll-affordance-wrapper ${direction} ${className}`}
      style={{ position: 'relative', width: '100%', minWidth: 0, ...style }}
    >
      {ready && activeTargetRef.current && (
        <ScrollAffordanceButtons
          containerRef={activeTargetRef}
          direction={direction}
          leftLabel={leftLabel}
          rightLabel={rightLabel}
          upLabel={upLabel}
          downLabel={downLabel}
        />
      )}
      {children}
    </div>
  );
}
