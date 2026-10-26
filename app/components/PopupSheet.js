'use client';
/**
 * PopupSheet - Canonical Reusable Popup & Modal Foundation for Shammah
 *
 * HOW TO USE:
 * 1. Import PopupSheet:
 *    import PopupSheet from './PopupSheet';
 *
 * 2. Render as a controlled or conditionally-mounted dialog:
 *    <PopupSheet
 *      open={isOpen}                    // boolean: true to show, false to hide (default: true)
 *      onClose={() => setIsOpen(false)} // function: triggered by Escape, backdrop click, or X button
 *      title="Modal Title"              // optional: string or ReactNode for the header
 *      size="md"                        // optional: 'sm' | 'md' (default) | 'lg'
 *      footer={<ModalFooterActions />}  // optional: ReactNode docked at bottom of popup
 *      labelledBy="custom-title-id"     // optional: custom id for aria-labelledby
 *    >
 *      <p>Scrollable body content goes here...</p>
 *    </PopupSheet>
 *
 * BEHAVIOR & GUARANTEES:
 * - Always renders via createPortal to document.body, escaping containing blocks formed by
 *   ancestors with position: sticky, backdrop-filter, or transform (e.g. .sticky-header, cards).
 * - Fixed full-viewport dimmed & blurred backdrop, centering the dialog in both axes.
 * - Maximum height capped at 90dvh respecting safe-area-insets, with internal body scrolling
 *   while header and footer remain pinned in view.
 * - 44px tap-target X close button matching .topbar-toggle-btn design tokens.
 * - Module-level stacking counter dynamically assigns z-index (base: 200, +10 per open popup),
 *   allowing cleanly stacked nested dialogs without collisions.
 * - Module-level scroll-locking prevents body scrolling and layout shifts.
 * - Full focus trap: locks Tab / Shift+Tab inside the dialog and restores focus to the trigger on close.
 * - Fluid sizing: width: min(92vw, <size max>), completely responsive from 320px to 1280px+.
 * - motion/react transitions with automatic prefers-reduced-motion fallback.
 */

import { useState, useEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';

// Module-level stacking tracker and z-index calculation
const openPopupStack = [];
let popupZSequence = 0;
const BASE_Z_INDEX = 200;
const STEP_Z_INDEX = 10;

function isTopmostPopup(id) {
  return openPopupStack.length > 0 && openPopupStack[openPopupStack.length - 1] === id;
}

// Module-level body scroll lock with counter
let scrollLockCount = 0;
let originalBodyOverflow = '';
let originalBodyPaddingRight = '';

function lockBodyScroll() {
  if (typeof document === 'undefined') return;
  if (scrollLockCount === 0) {
    originalBodyOverflow = document.body.style.overflow;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      originalBodyPaddingRight = document.body.style.paddingRight;
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';
  }
  scrollLockCount += 1;
}

function unlockBodyScroll() {
  if (typeof document === 'undefined') return;
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) {
    document.body.style.overflow = originalBodyOverflow || '';
    document.body.style.paddingRight = originalBodyPaddingRight || '';
  }
}

export default function PopupSheet({
  open = true,
  onClose,
  title = null,
  size = 'md',
  children,
  footer = null,
  labelledBy,
  dialogClassName = '',
  bodyClassName = '',
}) {
  const [mounted, setMounted] = useState(false);
  const [currentZIndex, setCurrentZIndex] = useState(BASE_Z_INDEX);
  const dialogRef = useRef(null);
  const triggerRef = useRef(null);
  const closeBtnRef = useRef(null);
  const generatedId = useId();
  const shouldReduceMotion = useReducedMotion();

  const titleId = labelledBy || (title ? `popup-title-${generatedId}` : undefined);

  // SSR hydration guard
  useEffect(() => {
    setMounted(true);
  }, []);

  // Stacking z-index assignment and body scroll lock
  useEffect(() => {
    if (!open) return;

    openPopupStack.push(generatedId);
    popupZSequence += 1;
    const assignedZIndex = BASE_Z_INDEX + (popupZSequence * STEP_Z_INDEX);
    setCurrentZIndex(assignedZIndex);
    lockBodyScroll();

    return () => {
      const idx = openPopupStack.lastIndexOf(generatedId);
      if (idx !== -1) {
        openPopupStack.splice(idx, 1);
      }
      if (openPopupStack.length === 0) {
        popupZSequence = 0;
      }
      unlockBodyScroll();
    };
  }, [open, generatedId]);

  // Focus trap and trigger restoration
  useEffect(() => {
    if (!open) return;

    // Save previous active element before opening dialog
    if (typeof document !== 'undefined') {
      triggerRef.current = document.activeElement;
    }

    const timer = setTimeout(() => {
      if (!dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        dialogRef.current.focus();
      }
    }, 40);

    return () => {
      clearTimeout(timer);
      if (triggerRef.current && typeof triggerRef.current.focus === 'function') {
        try {
          triggerRef.current.focus();
        } catch (_) {}
      }
    };
  }, [open]);

  // Keyboard navigation: Escape closes topmost popup only, Tab traps focus inside topmost popup
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e) {
      if (!isTopmostPopup(generatedId)) return;

      if (e.key === 'Escape') {
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') {
          e.stopImmediatePropagation();
        }
        e.preventDefault();
        onClose?.();
        return;
      }

      if (e.key === 'Tab') {
        if (!dialogRef.current) return;
        const focusable = Array.from(
          dialogRef.current.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );

        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || !dialogRef.current.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !dialogRef.current.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [open, onClose, generatedId]);

  if (!mounted) return null;

  const dialogVariants = shouldReduceMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.15 } },
        exit: { opacity: 0, transition: { duration: 0.1 } },
      }
    : {
        hidden: { opacity: 0, scale: 0.96, y: 8 },
        visible: {
          opacity: 1,
          scale: 1,
          y: 0,
          transition: { type: 'spring', damping: 26, stiffness: 360, mass: 0.8 },
        },
        exit: {
          opacity: 0,
          scale: 0.97,
          y: 6,
          transition: { duration: 0.14, ease: [0.16, 1, 0.3, 1] },
        },
      };

  const portalContent = (
    <AnimatePresence>
      {open && (
        <motion.div
          key="popup-sheet-backdrop"
          className="popup-sheet-backdrop"
          style={{ zIndex: currentZIndex }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClose?.();
            }
          }}
        >
          <motion.div
            key="popup-sheet-dialog"
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className={`popup-sheet-dialog popup-sheet-${size}${dialogClassName ? ` ${dialogClassName}` : ''}`}
            variants={dialogVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`popup-sheet-header${!title ? ' popup-sheet-header-notitle' : ''}`}>
              {title && (
                <div className="popup-sheet-title" id={titleId}>
                  {title}
                </div>
              )}
              <button
                ref={closeBtnRef}
                type="button"
                className="popup-sheet-close-btn"
                onClick={onClose}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Body Content */}
            <div className={`popup-sheet-body${bodyClassName ? ` ${bodyClassName}` : ''}`}>
              {children}
            </div>

            {/* Docked Footer (optional) */}
            {footer && (
              <div className="popup-sheet-footer">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(portalContent, document.body);
}
