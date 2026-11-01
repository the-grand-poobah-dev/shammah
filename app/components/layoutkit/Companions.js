/**
 * Shammah Layout Kit - Companions & Feedback States
 * 
 * Reusable layout sub-components and feedback states:
 *  - MediaThumb: Lazy-loaded image with aspect-ratio, anti-CLS container, blur-up, fallback gradient, badges & duration.
 *  - MetaChips: Clean unboxed typographic metadata adhering to zero-pill discipline (with '·' separator dots).
 *  - ProgressBar: Accessible progress indicator with label & percentage for courses, fundraisers, and challenges.
 *  - FilterChips: Scrollable category/filter pill row with min 44px tap targets and count badges.
 *  - SortMenu: Popover or native select for ordering content.
 *  - StatStrip: Coloured KPI tiles for stats, metrics & counters.
 *  - SkeletonLayout & SkeletonGrid: Shimmer placeholders mirroring all 7 ContentLayout modes.
 *  - EmptyState: Friendly zero-state message with icon & action.
 *  - ErrorState: Accessible error card with retry button.
 *  - InfiniteSentinel: IntersectionObserver-based infinite scroll trigger.
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Film,
  AlertCircle,
  RotateCcw,
  ArrowUpDown,
  Check,
  ChevronDown,
  Search,
  Sparkles,
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
  overlay,
  fallbackBg,
  className = '',
  onClick,
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(!src);

  // Normalize aspect ratio to CSS aspect-ratio format (e.g. 16/9 or aspect-16-9)
  const normalizedAspect = String(aspect).replace(':', '/');
  const aspectClass = `aspect-${normalizedAspect.replace('/', '-')}`;

  const containerStyle = {
    aspectRatio: normalizedAspect,
    '--thumb-accent': fallbackAccent,
  };

  return (
    <div
      className={`media-thumb media-thumb-box ${aspectClass} ${loaded ? 'is-loaded' : ''} ${className}`.trim()}
      style={containerStyle}
      onClick={onClick}
    >
      {/* Fallback gradient background with icon */}
      {(!src || error) && (
        <div
          className="media-thumb__fallback media-thumb-fallback"
          style={fallbackBg ? { background: fallbackBg } : undefined}
          aria-hidden="true"
        >
          <FallbackIcon size={28} className="media-thumb__fallback-icon" />
        </div>
      )}

      {/* Real Image with referrerPolicy="no-referrer" for hotlink security */}
      {src && !error && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="media-thumb__img media-thumb-img"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      )}

      {/* Optional custom overlay */}
      {overlay && <div className="media-thumb-overlay">{overlay}</div>}

      {/* Top Badge (e.g. "Live", "Course", "Featured") */}
      {badge && (
        <span
          className="media-thumb__badge media-thumb-badge"
          style={badgeColor ? { background: badgeColor, color: '#ffffff' } : undefined}
        >
          {badge}
        </span>
      )}

      {/* Bottom Duration Badge (e.g. "14:20") */}
      {duration && (
        <span className="media-thumb__duration media-thumb-badge duration" aria-label={`Duration: ${duration}`}>
          {duration}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. MetaChips (Zero-Pill Discipline)
// ---------------------------------------------------------------------------
export function MetaChips({ items = [], className = '' }) {
  if (!items || items.length === 0) return null;
  const filtered = items.filter(Boolean);

  return (
    <div className={`meta-chips meta-chips-line ${className}`.trim()}>
      {filtered.map((item, idx) => {
        const isObj = typeof item === 'object' && item !== null;
        const label = isObj ? item.label : String(item);
        const Icon = isObj ? item.icon : null;
        const accent = isObj ? item.accent : null;

        const chipStyle = accent ? { '--chip-accent': accent, color: accent } : undefined;

        return (
          <React.Fragment key={idx}>
            {idx > 0 && <span className="meta-dot" aria-hidden="true">·</span>}
            <span
              className={`meta-chip ${accent ? 'meta-chip--accented' : ''}`}
              style={chipStyle}
            >
              {Icon && <Icon size={12} strokeWidth={2.2} className="meta-chip__icon" />}
              <span className="meta-text meta-chip__label">{label}</span>
            </span>
          </React.Fragment>
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
  accent,
  color,
  height,
  size = 'md', // 'sm' | 'md' | 'lg'
  label,
  showPercent = false,
  showLabel = false,
  className = '',
}) {
  const chosenColor = accent || color || 'var(--teal)';
  const percentage = Math.min(100, Math.max(0, Math.round((value / (max || 1)) * 100)));

  const barStyle = {
    '--progress-color': chosenColor,
    '--sec-color': chosenColor,
    ...(height ? { '--progress-height': typeof height === 'number' ? `${height}px` : height } : {}),
  };

  const shouldShowLabel = Boolean(label || showLabel);
  const shouldShowPercent = Boolean(showPercent || showLabel);

  return (
    <div
      className={`shammah-progress shammah-progress-wrap size-${size} ${className}`.trim()}
      style={barStyle}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label || 'Progress'}
    >
      {(shouldShowLabel || shouldShowPercent) && (
        <div className="shammah-progress__header">
          {label && <span className="shammah-progress__label">{label}</span>}
          {shouldShowPercent && (
            <span className="shammah-progress__percent shammah-progress-text">{percentage}%</span>
          )}
        </div>
      )}
      <div className="shammah-progress__track shammah-progress-track">
        <div
          className="shammah-progress__fill shammah-progress-fill"
          style={{ width: `${percentage}%`, backgroundColor: chosenColor }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. FilterChips
// ---------------------------------------------------------------------------
export function FilterChips({
  options,
  chips,
  value,
  activeId,
  onChange,
  onSelect,
  scrollable = true,
  className = '',
  ariaLabel = 'Filter choices',
}) {
  const actualOptions = chips || options || [];
  const actualValue = value !== undefined ? value : activeId;
  const actualOnChange = onChange || onSelect;

  return (
    <div
      className={`filter-chips filter-chips-rail no-scrollbar ${scrollable ? 'filter-chips--scrollable' : ''} ${className}`.trim()}
      role="tablist"
      aria-label={ariaLabel}
      data-draggable-scroll="true"
    >
      {actualOptions.map((opt) => {
        const isObj = typeof opt === 'object' && opt !== null;
        const id = isObj ? opt.id : opt;
        const label = isObj ? opt.label : opt;
        const count = isObj ? opt.count : undefined;
        const Icon = isObj ? opt.icon : undefined;
        const isSelected = actualValue === id;

        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isSelected}
            className={`filter-chip filter-chip-btn ${isSelected ? 'is-active active' : ''}`}
            onClick={() => actualOnChange && actualOnChange(id)}
          >
            {Icon && <Icon size={15} strokeWidth={2.2} className="filter-chip__icon filter-chip-icon" />}
            <span className="filter-chip__label filter-chip-text">{label}</span>
            {count !== undefined && (
              <span className="filter-chip__count filter-chip-count">{count}</span>
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
  activeId,
  onChange,
  onSelect,
  label = 'Sort by',
  className = '',
}) {
  const actualValue = activeId !== undefined ? activeId : value;
  const actualOnChange = onChange || onSelect;
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

  const currentOption = options.find((o) => o.id === actualValue) || options[0];

  return (
    <div className={`sort-menu sort-menu-wrapper ${className}`.trim()} ref={menuRef}>
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
            const isSelected = opt.id === actualValue;
            return (
              <button
                key={opt.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`sort-menu__option ${isSelected ? 'is-selected' : ''}`}
                onClick={() => {
                  if (actualOnChange) actualOnChange(opt.id);
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
export function StatStrip({ items, stats, className = '' }) {
  const actualStats = items || stats || [];
  if (!actualStats || actualStats.length === 0) return null;

  return (
    <div className={`stat-strip stat-strip-row ${className}`.trim()}>
      {actualStats.map((st, idx) => {
        const Icon = st.icon;
        const accent = st.accent || accentFor(st.label || idx);
        const tileStyle = {
          '--tile-accent': accent,
          '--stat-accent': accent,
        };

        return (
          <div key={st.label || idx} className="stat-tile stat-strip-item" style={tileStyle}>
            <div className="stat-tile__header">
              <span className="stat-tile__label stat-strip-label">{st.label}</span>
              {Icon && <Icon size={16} className="stat-tile__icon stat-strip-icon" style={{ color: accent }} />}
            </div>
            <div className="stat-tile__value-row stat-strip-meta">
              <span className="stat-tile__value stat-strip-value">{st.value}</span>
              {st.change && (
                <span
                  className={`stat-tile__change ${
                    String(st.change).startsWith('+')
                      ? 'is-positive'
                      : String(st.change).startsWith('-')
                      ? 'is-negative'
                      : ''
                  }`}
                >
                  {st.change}
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
// 7. SkeletonLayout & SkeletonGrid
// ---------------------------------------------------------------------------
export function SkeletonLayout({ layout = 'magazine-flat', count = 4, className = '' }) {
  const items = Array.from({ length: count });

  if (layout === 'spotlight') {
    return (
      <div className={`content-layout-container shammah-layout-container layout-spotlight ${className}`.trim()}>
        <div className="skeleton-card skeleton-card--spotlight shimmer-box">
          <div className="skeleton-thumb skeleton-media shimmer-box" style={{ height: '240px' }} />
          <div className="skeleton-content skeleton-meta-wrap">
            <div className="skeleton-line shimmer-box w-3-4" />
            <div className="skeleton-line shimmer-box w-1-2" />
            <div className="skeleton-line shimmer-box w-1-3" />
          </div>
        </div>
      </div>
    );
  }

  if (layout === 'magazine-flat') {
    return (
      <div className={`content-layout-container shammah-layout-container layout-magazine-flat ${className}`.trim()}>
        <div className="layout-magazine-flat__hero">
          <div className="skeleton-card skeleton-card--hero shimmer-box">
            <div className="skeleton-thumb skeleton-media shimmer-box" style={{ aspectRatio: '16/9' }} />
            <div className="skeleton-content skeleton-meta-wrap">
              <div className="skeleton-line shimmer-box w-3-4" />
              <div className="skeleton-line shimmer-box w-1-2" />
            </div>
          </div>
        </div>
        <div className="layout-magazine-flat__grid">
          {items.slice(1).map((_, i) => (
            <div key={i} className="skeleton-card shimmer-box">
              <div className="skeleton-thumb skeleton-media shimmer-box" style={{ aspectRatio: '16/9' }} />
              <div className="skeleton-content skeleton-meta-wrap">
                <div className="skeleton-line shimmer-box w-3-4" />
                <div className="skeleton-line shimmer-box w-1-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (layout === 'list-rich') {
    return (
      <div className={`content-layout-container shammah-layout-container layout-list-rich ${className}`.trim()}>
        {items.map((_, i) => (
          <div key={i} className="skeleton-card skeleton-card--list shimmer-box">
            <div className="skeleton-thumb skeleton-thumb--list skeleton-media shimmer-box" />
            <div className="skeleton-content skeleton-meta-wrap">
              <div className="skeleton-line shimmer-box w-3-4" />
              <div className="skeleton-line shimmer-box w-1-2" />
              <div className="skeleton-line shimmer-box w-1-3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (layout === 'compact') {
    return (
      <div className={`content-layout-container shammah-layout-container layout-compact ${className}`.trim()}>
        {items.map((_, i) => (
          <div key={i} className="skeleton-card skeleton-card--compact shimmer-box" style={{ flexDirection: 'row', alignItems: 'center' }}>
            <div className="skeleton-avatar shimmer-box" style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
            <div className="skeleton-line shimmer-box w-1-2" style={{ flex: 1, margin: '0 12px' }} />
            <div className="skeleton-pill shimmer-box" style={{ width: '60px', height: '16px' }} />
          </div>
        ))}
      </div>
    );
  }

  // Default grid/rail/tiles skeletons
  return (
    <div className={`content-layout-container shammah-layout-container layout-${layout} ${className}`.trim()}>
      {items.map((_, i) => (
        <div key={i} className="skeleton-card shimmer-box">
          <div className="skeleton-thumb skeleton-media shimmer-box" style={{ aspectRatio: '16/9' }} />
          <div className="skeleton-content skeleton-meta-wrap">
            <div className="skeleton-line shimmer-box w-3-4" />
            <div className="skeleton-line shimmer-box w-1-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonGrid(props) {
  return <SkeletonLayout layout="tiles" {...props} />;
}

// ---------------------------------------------------------------------------
// 8. EmptyState
// ---------------------------------------------------------------------------
export function EmptyState({
  icon: Icon = Search,
  title = 'No items found',
  hint,
  description,
  action,
  actionLabel,
  onAction,
  className = '',
  accent = '#06b6d4',
}) {
  const descText = hint || description || 'Check back later or adjust your filters.';

  return (
    <div
      className={`layoutkit-empty-state shammah-empty-state ${className}`.trim()}
      style={{ '--sec-color': accent }}
    >
      <div
        className="empty-state-icon-wrap shammah-empty-state__icon-wrap"
        style={{ color: accent, background: `color-mix(in srgb, ${accent} 12%, transparent)` }}
      >
        <Icon size={32} strokeWidth={1.8} />
      </div>
      <h3 className="empty-state-title shammah-empty-state__title">{title}</h3>
      {descText && <p className="empty-state-desc shammah-empty-state__hint">{descText}</p>}
      {action && <div className="shammah-empty-state__action">{action}</div>}
      {actionLabel && onAction && !action && (
        <button
          type="button"
          className="empty-state-cta-btn"
          onClick={onAction}
          style={{ background: accent }}
        >
          {actionLabel}
        </button>
      )}
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
    <div className={`layoutkit-error-state shammah-error-state ${className}`.trim()}>
      <div className="error-state-icon-wrap shammah-error-state__icon-wrap">
        <AlertCircle size={28} />
      </div>
      <div className="shammah-error-state__text">
        <h4 className="error-state-title shammah-error-state__title">{title}</h4>
        <p className="error-state-desc shammah-error-state__message">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          className="error-state-retry-btn shammah-error-state__retry-btn"
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
  onLoadMore,
  onIntersect,
  hasMore = true,
  isLoading = false,
  loading = false,
  className = '',
}) {
  const sentinelRef = useRef(null);
  const actualLoading = isLoading || loading;
  const triggerCallback = onVisible || onLoadMore || onIntersect;

  useEffect(() => {
    if (!hasMore || actualLoading || !triggerCallback) return;

    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first && first.isIntersecting) {
          triggerCallback();
        }
      },
      { rootMargin: '300px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [triggerCallback, hasMore, actualLoading]);

  if (!hasMore) return null;

  return (
    <div
      ref={sentinelRef}
      className={`infinite-sentinel infinite-sentinel-bar ${actualLoading ? 'is-loading' : ''} ${className}`.trim()}
      aria-hidden="true"
    >
      {actualLoading && (
        <div className="sentinel-loading-indicator">
          <span className="sentinel-spinner infinite-sentinel__spinner" />
          <span className="sentinel-text">Loading more community content…</span>
        </div>
      )}
    </div>
  );
}
