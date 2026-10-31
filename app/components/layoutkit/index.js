'use client';
import React, { useEffect, useRef, useState, useCallback, useId } from 'react';
import {
  List,
  Columns,
  Grid,
  LayoutGrid,
  Sparkles,
  ChevronDown,
  AlertTriangle,
  RotateCcw,
  Check,
  Search,
  Filter,
} from 'lucide-react';

export const ACCENT_PALETTE = [
  '#06b6d4', // Cyan / Teal
  '#10b981', // Emerald
  '#f59e0b', // Amber / Gold
  '#8b5cf6', // Violet
  '#ec4899', // Pink / Rose
  '#3b82f6', // Royal Blue
  '#14b8a6', // Teal
  '#f97316', // Orange
  '#6366f1', // Indigo
];

/**
 * Deterministic accent color picker based on any string key.
 */
export function accentFor(str = '') {
  if (!str) return ACCENT_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % ACCENT_PALETTE.length;
  return ACCENT_PALETTE[index];
}

/**
 * AccentCard
 * Interactive card adhering to Shammah design tokens:
 * - 18px standard card radius
 * - --sec-color colored outline on hover, focus, active
 * - Keyboard navigable with Enter/Space handling if clickable
 * - No layout shift, smooth transitions
 */
export function AccentCard({
  children,
  accent = '#06b6d4',
  variant = 'edge', // 'edge' | 'wash' | 'tint' | 'glow' | 'solid'
  hoverGlow = true,
  as: Component = 'article',
  className = '',
  onClick,
  style = {},
  tabIndex,
  role,
  ariaLabel,
  ...rest
}) {
  const isClickable = Boolean(onClick);

  const handleKeyDown = useCallback(
    (e) => {
      if (!isClickable) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick(e);
      }
    },
    [isClickable, onClick]
  );

  return (
    <Component
      className={`accent-card variant-${variant}${hoverGlow ? ' has-hover-glow' : ''}${isClickable ? ' is-clickable' : ''} ${className}`.trim()}
      style={{
        '--sec-color': accent,
        '--card-accent': accent,
        ...style,
      }}
      onClick={onClick}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      tabIndex={isClickable ? tabIndex ?? 0 : tabIndex}
      role={isClickable ? role ?? 'button' : role}
      aria-label={ariaLabel}
      {...rest}
    >
      {children}
    </Component>
  );
}

/**
 * SectionBlock
 * Semantic content section with title, subtitle, optional badge count, accent indicator, and action.
 */
export function SectionBlock({
  title,
  subtitle,
  count,
  accent = '#06b6d4',
  icon: Icon,
  action,
  children,
  className = '',
  id,
}) {
  return (
    <section
      id={id}
      className={`section-block ${className}`.trim()}
      style={{ '--sec-color': accent, '--block-accent': accent }}
    >
      {(title || subtitle || action) && (
        <header className="section-block-header">
          <div className="section-block-title-wrap">
            {Icon && (
              <span className="section-block-icon" style={{ color: accent }} aria-hidden="true">
                <Icon size={20} strokeWidth={2.2} />
              </span>
            )}
            <div className="section-block-headings">
              <div className="section-block-title-row">
                <h3 className="section-block-title">{title}</h3>
                {typeof count === 'number' && (
                  <span className="section-block-count-badge" style={{ '--badge-accent': accent }}>
                    {count}
                  </span>
                )}
              </div>
              {subtitle && <p className="section-block-subtitle">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="section-block-action">{action}</div>}
        </header>
      )}
      <div className="section-block-body">{children}</div>
    </section>
  );
}

/**
 * LayoutSwitcher
 * Provides seamless toggling between layouts:
 * - list-rich: detailed single column
 * - magazine-x2: 2-column editorial grid
 * - tiles / grid: flexible auto-fit cards
 * - compact: dense list for quick scanning
 */
export function LayoutSwitcher({
  value = 'list-rich',
  onChange,
  storageKey,
  options,
  className = '',
  ariaLabel = 'Switch view layout',
}) {
  const defaultOptions = [
    { id: 'list-rich', label: 'Rich List', icon: List },
    { id: 'magazine-x2', label: 'Magazine', icon: Columns },
    { id: 'tiles', label: 'Tiles', icon: Grid },
    { id: 'compact', label: 'Compact', icon: LayoutGrid },
  ];

  const actualOptions = options || defaultOptions;

  const handleSelect = (modeId) => {
    if (onChange) onChange(modeId);
    if (storageKey && typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, modeId);
      } catch (_) {}
    }
  };

  return (
    <div
      className={`layout-switcher-bar ${className}`.trim()}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {actualOptions.map((opt) => {
        const IconComponent = opt.icon;
        const isActive = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={opt.label}
            title={opt.label}
            className={`layout-switch-pill${isActive ? ' active' : ''}`}
            onClick={() => handleSelect(opt.id)}
          >
            {IconComponent && <IconComponent size={18} strokeWidth={isActive ? 2.4 : 1.8} />}
            <span className="layout-switch-label">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * ContentLayout
 * Container-driven layout renderer for items or raw children.
 * Uses `@container` for fluid responsive behavior across all device breakpoints.
 */
export function ContentLayout({
  layout = 'list-rich',
  mode,
  items,
  renderItem,
  children,
  accent = '#06b6d4',
  className = '',
  style = {},
  emptyState,
  loading = false,
  skeletonCount = 6,
}) {
  const activeMode = mode || layout || 'list-rich';

  if (loading) {
    return <SkeletonLayout layout={activeMode} count={skeletonCount} className={className} />;
  }

  if (items && items.length === 0 && emptyState) {
    return emptyState;
  }

  return (
    <div
      className={`content-layout-container layout-${activeMode} ${className}`.trim()}
      data-layout-mode={activeMode}
      style={{
        '--sec-color': accent,
        '--layout-accent': accent,
        ...style,
      }}
    >
      {items && renderItem ? items.map((item, idx) => renderItem(item, idx)) : children}
    </div>
  );
}

/**
 * FilterChips
 * Scrollable chip strip with unified 44px tap targets and 10px radii.
 */
export function FilterChips({
  chips = [],
  activeId,
  onSelect,
  className = '',
  ariaLabel = 'Filter categories',
}) {
  return (
    <div
      className={`filter-chips-rail no-scrollbar ${className}`.trim()}
      role="tablist"
      aria-label={ariaLabel}
      data-draggable-scroll="true"
    >
      {chips.map((chip) => {
        const id = typeof chip === 'string' ? chip : chip.id;
        const label = typeof chip === 'string' ? chip : chip.label;
        const count = typeof chip === 'object' ? chip.count : undefined;
        const Icon = typeof chip === 'object' ? chip.icon : undefined;
        const isActive = activeId === id;

        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`filter-chip-btn${isActive ? ' active' : ''}`}
            onClick={() => onSelect && onSelect(id)}
          >
            {Icon && <Icon size={16} strokeWidth={2} className="filter-chip-icon" />}
            <span className="filter-chip-text">{label}</span>
            {typeof count === 'number' && (
              <span className="filter-chip-count">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * SortMenu
 * Accessible dropdown or select control for ordering content.
 */
export function SortMenu({
  options = [],
  activeId,
  onSelect,
  className = '',
  label = 'Sort by',
}) {
  return (
    <div className={`sort-menu-wrapper ${className}`.trim()}>
      <label className="sort-menu-label" htmlFor="shammah-sort-select">
        {label}:
      </label>
      <div className="sort-select-wrap">
        <select
          id="shammah-sort-select"
          className="sort-select-control"
          value={activeId}
          onChange={(e) => onSelect && onSelect(e.target.value)}
          aria-label={label}
        >
          {options.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="sort-select-chevron" aria-hidden="true" />
      </div>
    </div>
  );
}

/**
 * ProgressBar
 * Kingdom progress indicator for courses, fundraisers, and challenges.
 */
export function ProgressBar({
  value = 0,
  max = 100,
  accent = '#10b981',
  showLabel = false,
  className = '',
  size = 'md', // 'sm' | 'md' | 'lg'
}) {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  return (
    <div
      className={`shammah-progress-wrap size-${size} ${className}`.trim()}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      style={{ '--sec-color': accent }}
    >
      <div className="shammah-progress-track">
        <div
          className="shammah-progress-fill"
          style={{ width: `${percentage}%`, backgroundColor: accent }}
        />
      </div>
      {showLabel && (
        <span className="shammah-progress-text">{percentage}%</span>
      )}
    </div>
  );
}

/**
 * StatStrip
 * KPI row for key figures (Target, Raised, Donors, Days Left).
 */
export function StatStrip({ stats = [], className = '' }) {
  return (
    <div className={`stat-strip-row ${className}`.trim()}>
      {stats.map((st, idx) => {
        const Icon = st.icon;
        const statAccent = st.accent || 'var(--teal)';
        return (
          <div
            key={st.label || idx}
            className="stat-strip-item"
            style={{ '--stat-accent': statAccent }}
          >
            {Icon && (
              <span className="stat-strip-icon" style={{ color: statAccent }} aria-hidden="true">
                <Icon size={16} strokeWidth={2.2} />
              </span>
            )}
            <div className="stat-strip-meta">
              <strong className="stat-strip-value">{st.value}</strong>
              <span className="stat-strip-label">{st.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * MediaThumb
 * Zero-layout-shift responsive thumbnail with strict aspect ratio,
 * lazy-loaded image, and duration / play overlay.
 */
export function MediaThumb({
  src,
  alt = '',
  aspect = '16/9', // '16/9' | '9/16' | '1/1' | '4/3'
  badge,
  overlay,
  className = '',
  fallbackBg,
}) {
  const aspectClass = `aspect-${aspect.replace('/', '-')}`;

  return (
    <div className={`media-thumb-box ${aspectClass} ${className}`.trim()}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className="media-thumb-img"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div
          className="media-thumb-fallback"
          style={fallbackBg ? { background: fallbackBg } : undefined}
        />
      )}
      {overlay && <div className="media-thumb-overlay">{overlay}</div>}
      {badge && <span className="media-thumb-badge">{badge}</span>}
    </div>
  );
}

/**
 * MetaChips
 * Clean unboxed metadata items adhering to the zero-pill discipline.
 */
export function MetaChips({ items = [], className = '' }) {
  const filtered = items.filter(Boolean);
  return (
    <div className={`meta-chips-line ${className}`.trim()}>
      {filtered.map((it, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && <span className="meta-dot" aria-hidden="true">·</span>}
          <span className="meta-text">{it}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

/**
 * EmptyState
 * Production-ready empty state with friendly copy and optional action.
 */
export function EmptyState({
  icon: Icon = Search,
  title = 'No items found',
  description = 'Try adjusting your filters or check back later for updates.',
  actionLabel,
  onAction,
  className = '',
  accent = '#06b6d4',
}) {
  return (
    <div className={`layoutkit-empty-state ${className}`.trim()} style={{ '--sec-color': accent }}>
      <div className="empty-state-icon-wrap" style={{ color: accent, background: `${accent}18` }}>
        <Icon size={32} strokeWidth={1.8} />
      </div>
      <h4 className="empty-state-title">{title}</h4>
      {description && <p className="empty-state-desc">{description}</p>}
      {actionLabel && onAction && (
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

/**
 * ErrorState
 * Error state with retry CTA.
 */
export function ErrorState({
  title = 'Unable to load content',
  message = 'A connection error occurred. Please try again shortly.',
  onRetry,
  className = '',
}) {
  return (
    <div className={`layoutkit-error-state ${className}`.trim()}>
      <div className="error-state-icon-wrap">
        <AlertTriangle size={32} strokeWidth={1.8} />
      </div>
      <h4 className="error-state-title">{title}</h4>
      <p className="error-state-desc">{message}</p>
      {onRetry && (
        <button type="button" className="error-state-retry-btn" onClick={onRetry}>
          <RotateCcw size={16} />
          <span>Try Again</span>
        </button>
      )}
    </div>
  );
}

/**
 * SkeletonLayout & SkeletonGrid
 * Dimension-matched skeleton placeholders that eliminate jumpy layout shifts.
 */
export function SkeletonLayout({ layout = 'list-rich', count = 6, className = '' }) {
  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <div className={`content-layout-container layout-${layout} skeleton-mode ${className}`.trim()}>
      {items.map((i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-media shimmer-box" />
          <div className="skeleton-meta-wrap">
            <div className="skeleton-line shimmer-box w-3-4" />
            <div className="skeleton-line shimmer-box w-1-2" />
            <div className="skeleton-line shimmer-box w-1-3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonGrid(props) {
  return <SkeletonLayout layout="tiles" {...props} />;
}

/**
 * InfiniteSentinel
 * IntersectionObserver anchor that fires `onIntersect` when scrolled into view.
 */
export function InfiniteSentinel({ onIntersect, hasMore = false, loading = false, className = '' }) {
  const sentinelRef = useRef(null);

  useEffect(() => {
    if (!hasMore || loading) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onIntersect && onIntersect();
        }
      },
      { rootMargin: '300px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [onIntersect, hasMore, loading]);

  if (!hasMore) return null;

  return (
    <div ref={sentinelRef} className={`infinite-sentinel-bar ${className}`.trim()}>
      {loading && (
        <div className="sentinel-loading-indicator">
          <span className="sentinel-spinner" />
          <span className="sentinel-text">Loading more community content…</span>
        </div>
      )}
    </div>
  );
}
