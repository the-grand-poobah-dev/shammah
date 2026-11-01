/**
 * ContentLayout - Shammah Layout Kit Multi-Layout Container
 * 
 * Props:
 *  - layout {'magazine-flat'|'magazine-x2'|'list-rich'|'rail'|'compact'|'tiles'|'spotlight'}:
 *      - 'magazine-flat': 1 wide hero card (16:9) + 2-up flat card grid (>=520px) or 1-col (<520px).
 *      - 'magazine-x2': 2-column alternating tall (4:5) and short (1:1) cards; 1-col <420px, 3-col >=900px.
 *      - 'list-rich': row card with thumb left (96-168px), title, 2-line desc, meta, progress, action cluster; stacks <420px.
 *      - 'rail': horizontal scroll-snap row with edge fades, drag-to-scroll, and arrow navigation.
 *      - 'compact': dense one-line rows for leaderboards and queues.
 *      - 'tiles': auto-fit grid (minmax 130px) of accent tiles for categories and stats.
 *      - 'spotlight': single full-bleed featured card with prominent CTA and backdrop scrim.
 *  - mode {string}: Alias for layout prop.
 *  - items {Array}: Optional array of data records.
 *  - renderItem {Function}: (item, index, { isHero, isOdd, layout }) => ReactNode.
 *  - children {React.ReactNode}: Content to render directly when not using items/renderItem.
 *  - emptyState {React.ReactNode}: Rendered when items array is empty.
 *  - loading {boolean}: When true, renders dimension-matched SkeletonLayout.
 *  - skeletonCount {number}: Number of skeleton items to show when loading (default 4).
 *  - accent {string}: Optional accent color to inject via --sec-color.
 *  - railCardWidth {string}: Optional width for rail cards (default '230px').
 *  - className {string}: Additional custom classes.
 *  - style {Object}: Additional inline styles.
 *  - id {string}: Element ID.
 * 
 * Container Architecture:
 *  - Uses container-type: inline-size on .content-layout-container / .shammah-layout-container.
 *  - Pure container queries (@container) ensure responsive reflow regardless of viewport width.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useDragScroll } from '../../lib/useDragScroll';
import { SkeletonLayout } from './Companions';

export default function ContentLayout({
  layout,
  mode,
  items,
  renderItem,
  children,
  emptyState = null,
  loading = false,
  skeletonCount = 4,
  accent = '#06b6d4',
  className = '',
  style = {},
  railCardWidth,
  id,
  ...restProps
}) {
  const activeLayout = layout || mode || 'list-rich';
  // Normalize 'grid' alias to 'tiles'
  const normalizedLayout = activeLayout === 'grid' ? 'tiles' : activeLayout;

  // 1. Loading State
  if (loading) {
    return (
      <SkeletonLayout
        layout={normalizedLayout}
        count={skeletonCount}
        className={className}
      />
    );
  }

  // 2. Empty State Handling (when items is passed as empty array)
  if (Array.isArray(items) && items.length === 0) {
    return emptyState ? (
      <div
        className={`content-layout-container shammah-layout-container ${className}`.trim()}
        id={id}
      >
        {emptyState}
      </div>
    ) : null;
  }

  const containerStyles = {
    '--sec-color': accent,
    '--layout-accent': accent,
    ...style,
  };

  // 3. Horizontal Scroll-Snap Rail Mode
  if (normalizedLayout === 'rail') {
    return (
      <RailLayout
        items={items}
        renderItem={renderItem}
        className={className}
        style={containerStyles}
        railCardWidth={railCardWidth}
        id={id}
        accent={accent}
        {...restProps}
      >
        {children}
      </RailLayout>
    );
  }

  // 4. Spotlight Feature Layout
  if (normalizedLayout === 'spotlight') {
    const featuredItem = Array.isArray(items) && items.length > 0 ? items[0] : null;

    return (
      <div
        className={`content-layout-container shammah-layout-container layout-spotlight ${className}`.trim()}
        data-layout-mode="spotlight"
        id={id}
        style={containerStyles}
        {...restProps}
      >
        {featuredItem && renderItem
          ? renderItem(featuredItem, 0, { isHero: true, isOdd: false, layout: 'spotlight' })
          : children}
      </div>
    );
  }

  // 5. Magazine-Flat Layout: 16:9 Hero + 2-up Secondary Grid
  if (normalizedLayout === 'magazine-flat') {
    if (Array.isArray(items) && items.length > 0 && renderItem) {
      const heroItem = items[0];
      const secondaryItems = items.slice(1);

      return (
        <div
          className={`content-layout-container shammah-layout-container layout-magazine-flat ${className}`.trim()}
          data-layout-mode="magazine-flat"
          id={id}
          style={containerStyles}
          {...restProps}
        >
          {heroItem && (
            <div className="layout-magazine-flat__hero">
              {renderItem(heroItem, 0, { isHero: true, isOdd: false, layout: 'magazine-flat' })}
            </div>
          )}
          {secondaryItems.length > 0 && (
            <div className="layout-magazine-flat__grid">
              {secondaryItems.map((item, idx) =>
                renderItem(item, idx + 1, {
                  isHero: false,
                  isOdd: (idx + 1) % 2 !== 0,
                  layout: 'magazine-flat',
                })
              )}
            </div>
          )}
        </div>
      );
    }

    // Direct children fallback for magazine-flat
    return (
      <div
        className={`content-layout-container shammah-layout-container layout-magazine-flat ${className}`.trim()}
        data-layout-mode="magazine-flat"
        id={id}
        style={containerStyles}
        {...restProps}
      >
        {children}
      </div>
    );
  }

  // 6. Standard Grid & List Layouts (magazine-x2, list-rich, compact, tiles)
  return (
    <div
      className={`content-layout-container shammah-layout-container layout-${normalizedLayout} ${className}`.trim()}
      data-layout-mode={normalizedLayout}
      id={id}
      style={containerStyles}
      {...restProps}
    >
      {Array.isArray(items) && renderItem
        ? items.map((item, idx) =>
            renderItem(item, idx, {
              isHero: idx === 0,
              isOdd: idx % 2 !== 0,
              layout: normalizedLayout,
            })
          )
        : children}
    </div>
  );
}

/**
 * RailLayout - Horizontal scroll-snap rail with drag-to-scroll, fade masks, and arrows
 */
function RailLayout({
  items,
  renderItem,
  children,
  className = '',
  style = {},
  railCardWidth = '230px',
  accent = '#06b6d4',
  id,
  ...restProps
}) {
  const { ref: scrollRef, onPointerDown, onPointerMove, onPointerUp } = useDragScroll();
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollAffordance = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 8);
  }, [scrollRef]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScrollAffordance();
    el.addEventListener('scroll', checkScrollAffordance, { passive: true });
    window.addEventListener('resize', checkScrollAffordance);
    return () => {
      el.removeEventListener('scroll', checkScrollAffordance);
      window.removeEventListener('resize', checkScrollAffordance);
    };
  }, [scrollRef, checkScrollAffordance, items, children]);

  const scrollByAmount = (offset) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: offset, behavior: 'smooth' });
  };

  return (
    <div
      className={`content-layout-container shammah-layout-container layout-rail-wrapper ${className}`.trim()}
      data-layout-mode="rail"
      id={id}
      style={{
        '--rail-card-width': railCardWidth,
        '--sec-color': accent,
        ...style,
      }}
      {...restProps}
    >
      {/* Left Edge Fade Mask */}
      <div
        className={`layout-rail__fade layout-rail__fade--left ${
          canScrollLeft ? 'is-visible' : ''
        }`}
        aria-hidden="true"
      />

      {/* Left Navigation Arrow */}
      {canScrollLeft && (
        <button
          type="button"
          className="layout-rail__arrow layout-rail__arrow--left"
          onClick={() => scrollByAmount(-280)}
          aria-label="Scroll left"
        >
          <ChevronLeft size={20} strokeWidth={2.4} />
        </button>
      )}

      {/* Horizontal Snap Track */}
      <div
        ref={scrollRef}
        className="layout-rail"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        tabIndex={0}
        role="region"
        aria-label="Horizontal content rail"
      >
        {Array.isArray(items) && renderItem
          ? items.map((item, idx) => (
              <div key={item.id || idx} className="layout-rail__item">
                {renderItem(item, idx, { isHero: false, isOdd: idx % 2 !== 0, layout: 'rail' })}
              </div>
            ))
          : children}
      </div>

      {/* Right Navigation Arrow */}
      {canScrollRight && (
        <button
          type="button"
          className="layout-rail__arrow layout-rail__arrow--right"
          onClick={() => scrollByAmount(280)}
          aria-label="Scroll right"
        >
          <ChevronRight size={20} strokeWidth={2.4} />
        </button>
      )}

      {/* Right Edge Fade Mask */}
      <div
        className={`layout-rail__fade layout-rail__fade--right ${
          canScrollRight ? 'is-visible' : ''
        }`}
        aria-hidden="true"
      />
    </div>
  );
}

export { ContentLayout };
