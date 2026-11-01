/**
 * SectionBlock - Shammah Layout Kit Titled Section Strip
 * 
 * Props:
 *  - title {string}: Section heading text.
 *  - subtitle {string}: Optional secondary description.
 *  - icon {React.ComponentType}: Lucide icon for the section header chip.
 *  - accent {string}: Hex accent color (defaults to #06b6d4 or accentFor(title)).
 *  - count {number|string}: Optional count badge displayed next to the title.
 *  - onSeeAll {Function}: Callback when "See all" is clicked.
 *  - seeAllText {string}: Label for the link (default 'See all').
 *  - seeAllHref {string}: Optional href link if navigating to a dedicated view.
 *  - layout {string}: When items & renderItem are provided, rendered as a ContentLayout.
 *  - items {Array}: Array of data items.
 *  - renderItem {Function}: Item render function.
 *  - emptyState {React.ReactNode}: Rendered when items is empty.
 *  - action {React.ReactNode}: Optional custom action control on the right (e.g. switcher).
 *  - children {React.ReactNode}: Content to render inside the block (if not using items/renderItem).
 *  - className {string}: Additional class names.
 */

'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { accentFor } from './palette';
import ContentLayout from './ContentLayout';

export default function SectionBlock({
  title,
  subtitle,
  icon: Icon,
  accent,
  count,
  onSeeAll,
  seeAllText = 'See all',
  seeAllHref,
  layout,
  items,
  renderItem,
  emptyState,
  action,
  children,
  className = '',
  id,
  ...restProps
}) {
  const chosenAccent = accent || (title ? accentFor(title) : '#06b6d4');

  const headerStyle = {
    '--accent': chosenAccent,
    '--sec-color': chosenAccent,
  };

  return (
    <section
      className={`section-block ${className}`}
      id={id}
      style={headerStyle}
      {...restProps}
    >
      {/* Section Header Strip */}
      <header className="section-block__header">
        <div className="section-block__title-group">
          {Icon && (
            <div className="section-block__icon-chip" aria-hidden="true">
              <Icon size={18} strokeWidth={2.2} />
            </div>
          )}
          <div className="section-block__text-wrap">
            <div className="section-block__title-row">
              <h2 className="section-block__title">{title}</h2>
              {count !== undefined && count !== null && (
                <span className="section-block__count-badge" aria-label={`${count} items`}>
                  {count}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="section-block__subtitle">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right Action / See All cluster */}
        <div className="section-block__actions">
          {action}

          {onSeeAll && !seeAllHref && (
            <button
              type="button"
              className="section-block__see-all-btn"
              onClick={onSeeAll}
              aria-label={`${seeAllText} for ${title}`}
            >
              <span>{seeAllText}</span>
              <ChevronRight size={16} strokeWidth={2.2} />
            </button>
          )}

          {seeAllHref && (
            <a
              href={seeAllHref}
              className="section-block__see-all-btn"
              aria-label={`${seeAllText} for ${title}`}
            >
              <span>{seeAllText}</span>
              <ChevronRight size={16} strokeWidth={2.2} />
            </a>
          )}
        </div>
      </header>

      {/* Section Body */}
      <div className="section-block__body">
        {items && items.length > 0 && layout ? (
          <ContentLayout
            layout={layout}
            items={items}
            renderItem={renderItem}
            emptyState={emptyState}
          />
        ) : items && items.length === 0 && emptyState ? (
          emptyState
        ) : (
          children
        )}
      </div>
    </section>
  );
}
