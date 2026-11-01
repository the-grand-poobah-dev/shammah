/**
 * ContentLayout - Shammah Layout Kit Multi-Layout Container
 * 
 * Props:
 *  - layout {'magazine-flat'|'magazine-x2'|'list-rich'|'rail'|'compact'|'tiles'|'spotlight'}:
 *      - 'magazine-flat': 1 wide hero card (16:9) + 2-up flat card grid (>=520px) or 1-col (<520px).
 *      - 'magazine-x2': 2-column alternating tall (4:5) and short (1:1) cards; 1-col <420px, 3-col >=900px.
 *      - 'list-rich': row card with thumb left, title, 2-line desc, meta, progress, and action cluster; stacks <420px.
 *      - 'rail': horizontal scroll-snap row with edge fades, drag-to-scroll, and arrow navigation.
 *      - 'compact': dense one-line rows for leaderboards and queues.
 *      - 'tiles': auto-fit grid of accent tiles for categories and stats.
 *      - 'spotlight': single full-bleed featured card with prominent CTA.
 *  - items {Array}: Array of data records.
 *  - renderItem {Function}: (item, index, { isHero, isOdd, layout }) => ReactNode.
 *  - emptyState {React.ReactNode}: Rendered when items is empty.
 *  - className {string}: Additional class names.
 *  - railCardWidth {string}: Optional width for rail cards (default '220px').
 * 
 * Container Architecture:
 *  - Uses container-type: inline-size on .shammah-layout-container.
 *  - Pure container queries (@container) ensure responsive reflow regardless of viewport width.
 */

'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useDragScroll } from '../../lib/useDragScroll';

export default function ContentLayout({
  layout = 'magazine-flat',
  items = [],
  renderItem,
  emptyState = null,
  className = '',
  railCardWidth,
  id,
  ...restProps
}) {
  // Empty state handling
  if (!items || items.length === 0) {
    return emptyState ? (
      <div className={`shammah-layout-container ${className}`} id={id}>
        {emptyState}
      </div>
    ) : null;
  }

  if (layout === 'rail') {
    return (
      <RailLayout
        items={items}
        renderItem={renderItem}
        className={className}
        railCardWidth={railCardWidth}
        id={id}
        {...restProps}
      />
    );
  }

  if (layout === 'spotlight') {
    const featuredItem = items[0];
    return (
      <div className={`shammah-layout-container ${className}`} id={id} {...restProps}>
        <div className="layout-spotlight">
          {renderItem
            ? renderItem(featuredItem, 0, { isHero: true, layout: 'spotlight' })
            : null}
        </div>
      </div>
    );
  }

  if (layout === 'magazine-flat') {
    const heroItem = items[0];
    const secondaryItems = items.slice(1);

    return (
      <div className={`shammah-layout-container ${className}`} id={id} {...restProps}>
        <div className="layout-magazine-flat">
          {heroItem && (
            <div className="layout-magazine-flat__hero">
              {renderItem
                ? renderItem(heroItem, 0, { isHero: true, layout: 'magazine-flat' })
                : null}
            </div>
          )}
          {secondaryItems.length > 0 && (
            <div className="layout-magazine-flat__grid">
              {secondaryItems.map((item, idx) =>
                renderItem
                  ? renderItem(item, idx + 1, { isHero: false, layout: 'magazine-flat' })
                  : null
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Standard layouts: 'magazine-x2', 'list-rich', 'compact', 'tiles'
  const layoutClass = `layout-${layout}`;

  return (
    <div className={`shammah-layout-container ${className}`} id={id} {...restProps}>
      <div className={layoutClass}>
        {items.map((item, idx) =>
          renderItem
            ? renderItem(item, idx, {
                isHero: idx === 0,
                isOdd: idx % 2 !== 0,
                layout,
              })
            : null
        )}
      </div>
    </div>
  );
}

/**
 * RailLayout - Horizontal scroll-snap rail with drag-to-scroll and arrows
 */
function RailLayout({
  items,
  renderItem,
  className = '',
  railCardWidth = '220px',
  id,
  ...restProps
}) {
  const { ref: scrollRef, onPointerDown, onPointerMove, onPointerUp } = useDragScroll();
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollAffordance = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 6);
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
  }, [scrollRef, checkScrollAffordance, items]);

  const scrollByAmount = (offset) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: offset, behavior: 'smooth' });
  };

  return (
    <div
      className={`shammah-layout-container layout-rail-wrapper ${className}`}
      id={id}
      style={{ '--rail-card-width': railCardWidth }}
      {...restProps}
    >
      {/* Left Edge Fade */}
      <div
        className={`layout-rail__fade layout-rail__fade--left ${
          canScrollLeft ? 'is-visible' : ''
        }`}
        aria-hidden="true"
      />

      {/* Left Arrow Button */}
      {canScrollLeft && (
        <button
          type="button"
          className="layout-rail__arrow layout-rail__arrow--left"
          onClick={() => scrollByAmount(-320)}
          aria-label="Scroll left"
        >
          <ChevronLeft size={20} />
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
        {items.map((item, idx) => (
          <div key={item.id || idx} className="layout-rail__item">
            {renderItem
              ? renderItem(item, idx, { isHero: false, layout: 'rail' })
              : null}
          </div>
        ))}
      </div>

      {/* Right Arrow Button */}
      {canScrollRight && (
        <button
          type="button"
          className="layout-rail__arrow layout-rail__arrow--right"
          onClick={() => scrollByAmount(320)}
          aria-label="Scroll right"
        >
          <ChevronRight size={20} />
        </button>
      )}

      {/* Right Edge Fade */}
      <div
        className={`layout-rail__fade layout-rail__fade--right ${
          canScrollRight ? 'is-visible' : ''
        }`}
        aria-hidden="true"
      />
    </div>
  );
}
