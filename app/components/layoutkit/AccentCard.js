/**
 * AccentCard - Shammah Layout Kit Base Card
 * 
 * Props:
 *  - accent {string}: Optional hex color (defaults to #06b6d4 or mapped via accentFor).
 *  - variant {'edge'|'wash'|'minimal'|'neon'|'tint'|'glow'|'solid'}:
 *      - 'edge': 4px accent bar along left or top edge.
 *      - 'wash': subtle 10-14% color-mix background gradient wash with surface.
 *      - 'minimal': clean surface with subtle accent border on hover.
 *      - 'neon': displays rotating neon accent ring (@property --neon-angle).
 *      - 'tint': subtle tinted border and background wash.
 *      - 'glow': soft accent drop-glow.
 *  - hoverGlow {boolean}: Adds soft accent halo on hover (default true).
 *  - icon {React.ComponentType}: Optional Lucide icon to display in top accent chip.
 *  - iconLabel {string}: Optional accessible label for the icon chip.
 *  - onClick {Function}: Optional click handler (makes card interactive & keyboard operable).
 *  - as {'div'|'article'|'button'|'section'}: HTML tag to render (default 'div').
 *  - className {string}: Additional custom classes.
 *  - style {Object}: Additional inline styles.
 *  - children {React.ReactNode}: Card inner content.
 * 
 * CSS Tokens Used:
 *  - --surface, --border, --ink, --ink-muted, --radius, --sec-color
 */

'use client';

import React, { useCallback } from 'react';
import { accentFor, ACCENT_PALETTE } from './palette';

export { accentFor, ACCENT_PALETTE };

export default function AccentCard({
  accent,
  variant = 'wash',
  hoverGlow = true,
  icon: Icon,
  iconLabel,
  onClick,
  as: Component = 'div',
  className = '',
  style = {},
  children,
  role,
  tabIndex,
  ariaLabel,
  ...restProps
}) {
  const chosenAccent = accent || '#06b6d4';
  const isInteractive = Boolean(onClick || restProps['aria-label'] || ariaLabel || restProps.href);

  // Set CSS custom variables --sec-color, --accent, and --card-accent on the card
  const inlineStyles = {
    '--accent': chosenAccent,
    '--card-accent': chosenAccent,
    '--sec-color': chosenAccent,
    ...style,
  };

  const computedRole = role || (onClick ? 'button' : undefined);
  const computedTabIndex = tabIndex ?? (onClick ? 0 : undefined);

  const handleKeyDown = useCallback((e) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick(e);
    }
    if (restProps.onKeyDown) {
      restProps.onKeyDown(e);
    }
  }, [onClick, restProps]);

  return (
    <Component
      className={`accent-card variant-${variant} accent-card--${variant} ${hoverGlow ? 'has-hover-glow' : ''} ${isInteractive ? 'is-clickable accent-card--interactive' : ''} ${className}`.trim()}
      style={inlineStyles}
      onClick={onClick}
      onKeyDown={isInteractive ? handleKeyDown : restProps.onKeyDown}
      role={computedRole}
      tabIndex={computedTabIndex}
      aria-label={ariaLabel || restProps['aria-label']}
      {...restProps}
    >
      {/* 4px Accent Edge indicator when variant is 'edge' */}
      {variant === 'edge' && (
        <span className="accent-card__edge-bar" aria-hidden="true" />
      )}

      {/* Rotating Neon Ring when variant is 'neon' */}
      {variant === 'neon' && (
        <span className="accent-card__neon-ring" aria-hidden="true" />
      )}

      {/* Optional top accent icon chip */}
      {Icon && (
        <div className="accent-card__icon-chip" aria-hidden={!iconLabel} aria-label={iconLabel}>
          <Icon size={16} strokeWidth={2.2} />
        </div>
      )}

      {/* Card Content */}
      <div className="accent-card__inner">
        {children}
      </div>
    </Component>
  );
}

export { AccentCard };
