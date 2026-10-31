/**
 * Shammah Layout Kit - Companions
 * 
 * Reusable layout sub-components and feedback states:
 *  - MediaThumb: Lazy-loaded image with aspect-ratio, blur-up, fallback gradient, badges & duration.
 *  - MetaChips: Meta tags with icon and label pills.
 *  - ProgressBar: Accessible progress indicator with label & percentage.
 *  - FilterChips: Scrollable category/filter pill row.
 *  - SortMenu: Popover/select for ordering content.
 *  - StatStrip: Coloured number tiles for stats & counters.
 *  - SkeletonLayout: Shimmer placeholders mirroring each ContentLayout mode.
 *  - EmptyState: Friendly zero-state message with icon & action.
 *  - ErrorState: Accessible error card with retry button.
 *  - InfiniteSentinel: IntersectionObserver-based infinite scroll trigger.
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Film,
  Headphones,
  AlertCircle,
  RotateCcw,
  ArrowUpDown,
  Check,
  ChevronDown,
} from 'lucide-react';
import { accentFor } from './palette';

// ---------------------------------------------------------------------------
// 1. MediaThumb
// ---------------------------------------------------------------------------
export function MediaThumb({
  src,
  alt = 'Media preview',
  fallbackAccent = '#06b6d4',
  aspect = '16/9',
  badge,
  badgeColor,
  duration,
  icon: FallbackIcon = Film,
  className = '',
  onClick,
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(!src);

  // Normalize aspect ratio to CSS aspect-ratio format
  const normalizedAspect = String(aspect).replace(':', '/');

  const containerStyle = {
    aspectRatio: normalizedAspect,
    '--thumb-accent': fallbackAccent,
  };

  return (
    <div
      className={`media-thumb ${loaded ? 'is-loaded' : ''} ${className}`}
      style={containerStyle}
      onClick={onClick}
    >
      {/* Fallback gradient background with icon */}
      <div className="media-thumb__fallback" aria-hidden="true">
        <FallbackIcon size={28} className="media-thumb__fallback-icon" />
      </div>

      {/* Real Image */}
      {src && !error && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="media-thumb__img"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      )}

      {/* Top Badge (e.g. "Live", "Course", "Featured") */}
      {badge && (
        <span
          className="media-thumb__badge"
          style={badgeColor ? { background: badgeColor, color: '#ffffff' } : undefined}
        >
          {badge}
        </span>
      )}

      {/* Bottom Duration Badge (e.g. "14:20") */}
      {duration && (
        <span className="media-thumb__duration" aria-label={`Duration: ${duration}`}>
          {duration}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. MetaChips
// ---------------------------------------------------------------------------
export function MetaChips({ items = [], className = '' }) {
  if (!items || items.length === 0) return null;

  return (
    <div className={`meta-chips ${className}`}>
      {items.map((item, idx) => {
        if (!item) return null;
        const isObj = typeof item === 'object';
        const label = isObj ? item.label : String(item);
        const Icon = isObj ? item.icon : null;
        const accent = isObj ? item.accent : null;

        const chipStyle = accent ? { '--chip-accent': accent } : undefined;

        return (
          <span
            key={idx}
            className={`meta-chip ${accent ? 'meta-chip--accented' : ''}`}
            style={chipStyle}
          >
            {Icon && <Icon size={12} strokeWidth={2.2} className="meta-chip__icon" />}
            <span className="meta-chip__label">{label}</span>
          </span>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. ProgressBar
// ---------------------------------------------------------------------------
export function ProgressBar({
  value = 0,
  max = 100,
  color,
  height = 6,
  label,
  showPercent = false,
  className = '',
}) {
  const percentage = Math.min(100, Math.max(0, Math.round((value / (max || 1)) * 100)));
  const barStyle = {
    '--progress-color': color || 'var(--teal)',
    '--progress-height': typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div className={`shammah-progress ${className}`} style={barStyle}>
      {(label || showPercent) && (
        <div className="shammah-progress__header">
          {label && <span className="shammah-progress__label">{label}</span>}
          {showPercent && (
            <span className="shammah-progress__percent">{percentage}%</span>
          )}
        </div>
      )}
      <div
        className="shammah-progress__track"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || 'Progress'}
      >
        <div
          className="shammah-progress__fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. FilterChips
// ---------------------------------------------------------------------------
export function FilterChips({
  options = [],
  value,
  onChange,
  scrollable = true,
  className = '',
}) {
  return (
    <div
      className={`filter-chips ${scrollable ? 'filter-chips--scrollable' : ''} ${className}`}
      role="tablist"
      aria-label="Filter choices"
    >
      {options.map((opt) => {
        const isObj = typeof opt === 'object';
        const id = isObj ? opt.id : opt;
        const label = isObj ? opt.label : opt;
        const count = isObj ? opt.count : undefined;
        const Icon = isObj ? opt.icon : undefined;
        const isSelected = value === id;

        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isSelected}
            className={`filter-chip ${isSelected ? 'is-active' : ''}`}
            onClick={() => onChange && onChange(id)}
          >
            {Icon && <Icon size={14} strokeWidth={2.2} className="filter-chip__icon" />}
            <span className="filter-chip__label">{label}</span>
            {count !== undefined && (
              <span className="filter-chip__count">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 5. SortMenu
// ---------------------------------------------------------------------------
export function SortMenu({
  options = [
    { id: 'recent', label: 'Most Recent' },
    { id: 'popular', label: 'Most Popular' },
    { id: 'trending', label: 'Trending' },
  ],
  value = 'recent',
  onChange,
  label = 'Sort by',
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('pointerdown', handleClickOutside);
    }
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [open]);

  const currentOption = options.find((o) => o.id === value) || options[0];

  return (
    <div className={`sort-menu ${className}`} ref={menuRef}>
      <button
        type="button"
        className="sort-menu__trigger"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${currentOption?.label}`}
      >
        <ArrowUpDown size={14} className="sort-menu__icon" />
        <span className="sort-menu__selected-label">{currentOption?.label}</span>
        <ChevronDown size={14} className="sort-menu__arrow" />
      </button>

      {open && (
        <div className="sort-menu__popover" role="listbox">
          {options.map((opt) => {
            const isSelected = opt.id === value;
            return (
              <button
                key={opt.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`sort-menu__option ${isSelected ? 'is-selected' : ''}`}
                onClick={() => {
                  if (onChange) onChange(opt.id);
                  setOpen(false);
                }}
              >
                <span>{opt.label}</span>
                {isSelected && <Check size={14} className="sort-menu__check" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 6. StatStrip
// ---------------------------------------------------------------------------
export function StatStrip({ items = [], className = '' }) {
  if (!items || items.length === 0) return null;

  return (
    <div className={`stat-strip ${className}`}>
      {items.map((stat, idx) => {
        const Icon = stat.icon;
        const accent = stat.accent || accentFor(stat.label || idx);
        const tileStyle = {
          '--tile-accent': accent,
        };

        return (
          <div key={idx} className="stat-tile" style={tileStyle}>
            <div className="stat-tile__header">
              <span className="stat-tile__label">{stat.label}</span>
              {Icon && <Icon size={16} className="stat-tile__icon" />}
            </div>
            <div className="stat-tile__value-row">
              <span className="stat-tile__value">{stat.value}</span>
              {stat.change && (
                <span
                  className={`stat-tile__change ${
                    stat.change.startsWith('+')
                      ? 'is-positive'
                      : stat.change.startsWith('-')
                      ? 'is-negative'
                      : ''
                  }`}
                >
                  {stat.change}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 7. SkeletonLayout
// ---------------------------------------------------------------------------
export function SkeletonLayout({ layout = 'magazine-flat', count = 4, className = '' }) {
  const items = Array.from({ length: count });

  if (layout === 'spotlight') {
    return (
      <div className={`shammah-layout-container ${className}`}>
        <div className="layout-spotlight">
          <div className="skeleton-card skeleton-card--spotlight shimmer">
            <div className="skeleton-thumb" style={{ height: '240px' }} />
            <div className="skeleton-content">
              <div className="skeleton-line skeleton-line--title" />
              <div className="skeleton-line skeleton-line--desc" />
              <div className="skeleton-line skeleton-line--short" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (layout === 'magazine-flat') {
    return (
      <div className={`shammah-layout-container ${className}`}>
        <div className="layout-magazine-flat">
          <div className="layout-magazine-flat__hero">
            <div className="skeleton-card skeleton-card--hero shimmer">
              <div className="skeleton-thumb" style={{ aspectRatio: '16/9' }} />
              <div className="skeleton-content">
                <div className="skeleton-line skeleton-line--title" />
                <div className="skeleton-line skeleton-line--desc" />
              </div>
            </div>
          </div>
          <div className="layout-magazine-flat__grid">
            {items.slice(1).map((_, i) => (
              <div key={i} className="skeleton-card shimmer">
                <div className="skeleton-thumb" style={{ aspectRatio: '16/9' }} />
                <div className="skeleton-content">
                  <div className="skeleton-line skeleton-line--title" />
                  <div className="skeleton-line skeleton-line--desc" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (layout === 'list-rich') {
    return (
      <div className={`shammah-layout-container ${className}`}>
        <div className="layout-list-rich">
          {items.map((_, i) => (
            <div key={i} className="skeleton-card skeleton-card--list shimmer">
              <div className="skeleton-thumb skeleton-thumb--list" />
              <div className="skeleton-content">
                <div className="skeleton-line skeleton-line--title" />
                <div className="skeleton-line skeleton-line--desc" />
                <div className="skeleton-line skeleton-line--short" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (layout === 'compact') {
    return (
      <div className={`shammah-layout-container ${className}`}>
        <div className="layout-compact">
          {items.map((_, i) => (
            <div key={i} className="skeleton-card skeleton-card--compact shimmer">
              <div className="skeleton-avatar" />
              <div className="skeleton-line skeleton-line--title" style={{ flex: 1 }} />
              <div className="skeleton-pill" style={{ width: '60px' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default grid/rail/tiles skeletons
  return (
    <div className={`shammah-layout-container ${className}`}>
      <div className={`layout-${layout}`}>
        {items.map((_, i) => (
          <div key={i} className="skeleton-card shimmer">
            <div className="skeleton-thumb" style={{ aspectRatio: '16/9' }} />
            <div className="skeleton-content">
              <div className="skeleton-line skeleton-line--title" />
              <div className="skeleton-line skeleton-line--desc" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 4, layout = 'grid', className = '', ...props }) {
  return <SkeletonLayout layout={layout} count={count} className={className} {...props} />;
}

// ---------------------------------------------------------------------------
// 8. EmptyState
// ---------------------------------------------------------------------------
export function EmptyState({
  icon: Icon = Film,
  title = 'No items found',
  hint = 'Check back later or adjust your filters.',
  action,
  className = '',
}) {
  return (
    <div className={`shammah-empty-state ${className}`}>
      <div className="shammah-empty-state__icon-wrap">
        <Icon size={32} strokeWidth={1.8} />
      </div>
      <h3 className="shammah-empty-state__title">{title}</h3>
      {hint && <p className="shammah-empty-state__hint">{hint}</p>}
      {action && <div className="shammah-empty-state__action">{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 9. ErrorState
// ---------------------------------------------------------------------------
export function ErrorState({
  title = 'Something went wrong',
  message = 'Failed to load content. Please check your connection.',
  onRetry,
  className = '',
}) {
  return (
    <div className={`shammah-error-state ${className}`}>
      <div className="shammah-error-state__icon-wrap">
        <AlertCircle size={24} />
      </div>
      <div className="shammah-error-state__text">
        <h4 className="shammah-error-state__title">{title}</h4>
        <p className="shammah-error-state__message">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          className="shammah-error-state__retry-btn"
          onClick={onRetry}
          aria-label="Retry loading content"
        >
          <RotateCcw size={15} />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 10. InfiniteSentinel
// ---------------------------------------------------------------------------
export function InfiniteSentinel({
  onVisible,
  hasMore = true,
  isLoading = false,
  className = '',
}) {
  const sentinelRef = useRef(null);

  useEffect(() => {
    if (!hasMore || isLoading || !onVisible) return;

    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first && first.isIntersecting) {
          onVisible();
        }
      },
      { rootMargin: '300px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [onVisible, hasMore, isLoading]);

  if (!hasMore) return null;

  return (
    <div
      ref={sentinelRef}
      className={`infinite-sentinel ${isLoading ? 'is-loading' : ''} ${className}`}
      aria-hidden="true"
    >
      {isLoading && (
        <div className="infinite-sentinel__spinner" aria-label="Loading more items..." />
      )}
    </div>
  );
}
