/**
 * AccentCard - Shammah Layout Kit Base Card
 * 
 * Props:
 *  - accent {string}: Optional hex color (defaults to #06b6d4 or mapped via accentFor).
 *  - variant {'edge'|'wash'|'minimal'|'neon'}:
 *      - 'edge': 4px accent bar along top or left edge.
 *      - 'wash': subtle 10-14% color-mix background gradient wash with surface.
 *      - 'minimal': clean surface with subtle accent border on hover.
 *      - 'neon': displays rotating neon accent ring (@property --neon-angle).
 *  - icon {React.ComponentType}: Optional Lucide icon to display in top accent chip.
 *  - onClick {Function}: Optional click handler (makes card interactive & focusable).
 *  - as {'div'|'article'|'button'|'section'}: HTML tag to render (default 'div').
 *  - className {string}: Additional custom classes.
 *  - children {React.ReactNode}: Card inner content.
 * 
 * CSS Tokens Used:
 *  - --surface, --border, --ink, --ink-muted, --radius, --sec-color
 */

'use client';

import React from 'react';
import { accentFor, ACCENT_PALETTE } from './palette';

export { accentFor, ACCENT_PALETTE };

export default function AccentCard({
  accent,
  variant = 'wash',
  icon: Icon,
  iconLabel,
  onClick,
  as: Component = 'div',
  className = '',
  style = {},
  children,
  role,
  tabIndex,
  ...restProps
}) {
  const chosenAccent = accent || '#06b6d4';
  const isInteractive = Boolean(onClick || restProps['aria-label'] || restProps.href);

  // Set CSS custom variable --sec-color and --accent on the card
  const inlineStyles = {
    '--accent': chosenAccent,
    '--sec-color': chosenAccent,
    ...style,
  };

  const computedRole = role || (onClick ? 'button' : undefined);
  const computedTabIndex = tabIndex ?? (onClick ? 0 : undefined);

  const handleKeyDown = (e) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick(e);
    }
    if (restProps.onKeyDown) {
      restProps.onKeyDown(e);
    }
  };

  return (
    <Component
      className={`accent-card accent-card--${variant} ${isInteractive ? 'accent-card--interactive' : ''} ${className}`}
      style={inlineStyles}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={computedRole}
      tabIndex={computedTabIndex}
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
