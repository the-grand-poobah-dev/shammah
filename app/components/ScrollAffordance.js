'use client';
import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { useScrollAffordances } from '../lib/useScrollAffordances';

export { useScrollAffordances };

/**
 * ScrollAffordanceButtons
 *
 * Standalone circular buttons designed to sit within an already positioned
 * container (e.g. StatusTray or custom cards) linked to a target scroll container.
 */
export function ScrollAffordanceButtons({
  targetRef,
  axis = 'horizontal',
  scrollDistance = 240,
  threshold = 6,
  className = '',
  leftLabel = 'Scroll backward',
  rightLabel = 'Scroll forward',
  upLabel = 'Scroll up',
  downLabel = 'Scroll down',
}) {
  const {
    canScrollLeft,
    canScrollRight,
    canScrollUp,
    canScrollDown,
    getButtonProps,
  } = useScrollAffordances({
    targetRef,
    axis,
    scrollDistance,
    threshold,
  });

  const showH = axis === 'horizontal' || axis === 'both';
  const showV = axis === 'vertical' || axis === 'both';

  return (
    <>
      {showH && canScrollLeft && (
        <button
          {...getButtonProps('left', leftLabel)}
          className={`scroll-affordance-btn horizontal-left ${className}`.trim()}
        >
          <ChevronLeft size={16} strokeWidth={2.4} />
        </button>
      )}

      {showH && canScrollRight && (
        <button
          {...getButtonProps('right', rightLabel)}
          className={`scroll-affordance-btn horizontal-right ${className}`.trim()}
        >
          <ChevronRight size={16} strokeWidth={2.4} />
        </button>
      )}

      {showV && canScrollUp && (
        <button
          {...getButtonProps('up', upLabel)}
          className={`scroll-affordance-btn vertical-up ${className}`.trim()}
        >
          <ChevronUp size={16} strokeWidth={2.4} />
        </button>
      )}

      {showV && canScrollDown && (
        <button
          {...getButtonProps('down', downLabel)}
          className={`scroll-affordance-btn vertical-down ${className}`.trim()}
        >
          <ChevronDown size={16} strokeWidth={2.4} />
        </button>
      )}
    </>
  );
}

/**
 * ScrollAffordanceWrapper
 *
 * Wraps any scrollable child element, automatically attaching the scroll detection
 * and rendering subtle circular arrow controls when content overflows.
 */
export function ScrollAffordanceWrapper({
  children,
  axis = 'horizontal', // 'horizontal' | 'vertical' | 'both'
  scrollDistance = 240,
  threshold = 6,
  className = '',
  wrapperClassName = '',
  leftLabel,
  rightLabel,
  upLabel,
  downLabel,
}) {
  const localRef = useRef(null);

  // If child is a single React element with its own ref, we merge refs
  const child = React.Children.only(children);
  const targetRef = child.ref && typeof child.ref === 'object' ? child.ref : localRef;

  const {
    canScrollLeft,
    canScrollRight,
    canScrollUp,
    canScrollDown,
    getButtonProps,
  } = useScrollAffordances({
    targetRef,
    axis,
    scrollDistance,
    threshold,
  });

  const showH = axis === 'horizontal' || axis === 'both';
  const showV = axis === 'vertical' || axis === 'both';

  // Clone child with ref and marker attribute so global enhancer knows it is already managed
  const clonedChild = React.cloneElement(child, {
    ref: targetRef,
    'data-has-scroll-affordance': 'true',
  });

  return (
    <div
      className={`scroll-affordance-wrapper ${wrapperClassName}`.trim()}
      data-scroll-affordance-wrap="true"
    >
      {showH && canScrollLeft && (
        <button
          {...getButtonProps('left', leftLabel)}
          className={`scroll-affordance-btn horizontal-left ${className}`.trim()}
        >
          <ChevronLeft size={16} strokeWidth={2.4} />
        </button>
      )}

      {showH && canScrollRight && (
        <button
          {...getButtonProps('right', rightLabel)}
          className={`scroll-affordance-btn horizontal-right ${className}`.trim()}
        >
          <ChevronRight size={16} strokeWidth={2.4} />
        </button>
      )}

      {showV && canScrollUp && (
        <button
          {...getButtonProps('up', upLabel)}
          className={`scroll-affordance-btn vertical-up ${className}`.trim()}
        >
          <ChevronUp size={16} strokeWidth={2.4} />
        </button>
      )}

      {showV && canScrollDown && (
        <button
          {...getButtonProps('down', downLabel)}
          className={`scroll-affordance-btn vertical-down ${className}`.trim()}
        >
          <ChevronDown size={16} strokeWidth={2.4} />
        </button>
      )}

      {clonedChild}
    </div>
  );
}

export default ScrollAffordanceWrapper;
