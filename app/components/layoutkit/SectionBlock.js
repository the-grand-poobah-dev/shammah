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
 *  - mode {string}: Alias for layout.
 *  - items {Array}: Array of data items.
 *  - renderItem {Function}: Item render function.
 *  - emptyState {React.ReactNode}: Rendered when items is empty.
 *  - action {React.ReactNode}: Optional custom action control on the right (e.g. switcher).
 *  - children {React.ReactNode}: Content to render inside the block.
 *  - className {string}: Additional class names.
 *  - id {string}: Section element ID.
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
  mode,
  items,
  renderItem,
  emptyState,
  action,
  children,
  className = '',
  id,
  style = {},
  ...restProps
}) {
  const chosenAccent = accent || (title ? accentFor(title) : '#06b6d4');
  const activeLayout = layout || mode;

  const headerStyle = {
    '--accent': chosenAccent,
    '--block-accent': chosenAccent,
    '--sec-color': chosenAccent,
    ...style,
  };

  return (
    <section
      className={`section-block ${className}`.trim()}
      id={id}
      style={headerStyle}
      {...restProps}
    >
      {/* Section Header Strip */}
      {(title || subtitle || action || onSeeAll || seeAllHref) && (
        <header className="section-block__header section-block-header">
          <div className="section-block__title-group section-block-title-wrap">
            {Icon && (
              <div
                className="section-block__icon-chip section-block-icon"
                style={{ color: chosenAccent }}
                aria-hidden="true"
              >
                <Icon size={18} strokeWidth={2.2} />
              </div>
            )}
            <div className="section-block__text-wrap section-block-headings">
              <div className="section-block__title-row section-block-title-row">
                {title && <h2 className="section-block__title section-block-title">{title}</h2>}
                {count !== undefined && count !== null && (
                  <span
                    className="section-block__count-badge section-block-count-badge"
                    style={{ '--badge-accent': chosenAccent }}
                    aria-label={`${count} items`}
                  >
                    {count}
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="section-block__subtitle section-block-subtitle">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Right Action / See All cluster */}
          <div className="section-block__actions section-block-action">
            {action}

            {onSeeAll && !seeAllHref && (
              <button
                type="button"
                className="section-block__see-all-btn"
                onClick={onSeeAll}
                aria-label={`${seeAllText} for ${title || 'section'}`}
              >
                <span>{seeAllText}</span>
                <ChevronRight size={16} strokeWidth={2.2} />
              </button>
            )}

            {seeAllHref && (
              <a
                href={seeAllHref}
                className="section-block__see-all-btn"
                aria-label={`${seeAllText} for ${title || 'section'}`}
              >
                <span>{seeAllText}</span>
                <ChevronRight size={16} strokeWidth={2.2} />
              </a>
            )}
          </div>
        </header>
      )}

      {/* Section Body */}
      <div className="section-block__body section-block-body">
        {items && items.length > 0 && activeLayout ? (
          <ContentLayout
            layout={activeLayout}
            items={items}
            renderItem={renderItem}
            emptyState={emptyState}
            accent={chosenAccent}
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

export { SectionBlock };
