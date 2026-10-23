'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import FaithReactionPicker from './FaithReactionPicker';
import PopupSheet from './PopupSheet';
import { playSound } from '../lib/soundEffects';
import { logActivity } from '../lib/activityLogManager';

const FAITH_EMOJI_SET = [
  { emoji: '❤️', label: 'Love' },
  { emoji: '🙏', label: 'Amen / Pray' },
  { emoji: '🔥', label: 'Holy Fire' },
  { emoji: '🙌', label: 'Praise' },
  { emoji: '💡', label: 'Insight' },
  { emoji: '🕊️', label: 'Peace' },
  { emoji: '👏', label: 'Joy' },
];

const DEFAULT_EMOJI = '❤️';
const LONG_PRESS_MS = 380;
const HOVER_OPEN_DELAY = 150;
const HOVER_CLOSE_DELAY = 250;

export default function ReactionBar({ targetType, targetId, session, onRequireSignIn, size = 'md' }) {
  const [counts, setCounts] = useState({}); // { emoji: n }
  const [myEmoji, setMyEmoji] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showFullPicker, setShowFullPicker] = useState(false);
  const [floatingReaction, setFloatingReaction] = useState(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  const buttonRef = useRef(null);
  const pickerRef = useRef(null);
  const openTimerRef = useRef(null);
  const closeTimerRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const longPressedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Clear hover & long-press timers
  const clearTimers = useCallback(() => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  // Load counts and user reaction from Supabase
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data } = await supabase.rpc('reaction_counts', {
        p_target_type: targetType,
        p_target_ids: [targetId],
      });
      if (cancelled) return;
      const next = {};
      (data || []).forEach((row) => {
        next[row.emoji] = Number(row.count);
      });
      setCounts(next);

      if (session) {
        const { data: mine } = await supabase
          .from('reactions')
          .select('emoji')
          .eq('target_type', targetType)
          .eq('target_id', targetId)
          .eq('user_id', session.user.id)
          .maybeSingle();
        if (!cancelled) setMyEmoji(mine ? mine.emoji : null);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [targetType, targetId, session]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  // Position calculation: anchored to the button, flipped/clamped to viewport
  const updateCoords = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const pickerEl = pickerRef.current;
    const pickerWidth = pickerEl ? pickerEl.offsetWidth : 310;
    const pickerHeight = pickerEl ? pickerEl.offsetHeight : 46;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // If button is completely scrolled out of viewport, dismiss picker
    if (rect.bottom < -20 || rect.top > viewportHeight + 20) {
      setPickerOpen(false);
      return;
    }

    // Vertical placement: default above button; flip below if tight at the top
    const spaceAbove = rect.top;
    const spaceBelow = viewportHeight - rect.bottom;
    let top;

    if (spaceAbove < pickerHeight + 10 && spaceBelow > spaceAbove) {
      // Flip below button
      top = rect.bottom + 8;
    } else {
      // Anchor above button
      top = rect.top - pickerHeight - 8;
    }

    // Avoid colliding with fixed bottom-nav on mobile
    const bottomNavEl = document.querySelector('.bottom-nav');
    const bottomNavHeight = bottomNavEl ? bottomNavEl.offsetHeight : 0;
    const bottomMargin = Math.max(10, bottomNavHeight + 8);
    const maxTop = viewportHeight - pickerHeight - bottomMargin;
    top = Math.max(10, Math.min(top, maxTop));

    // Horizontal clamping: align with button left, clamp inside viewport margins
    let left = rect.left;
    const maxLeft = Math.max(10, viewportWidth - pickerWidth - 10);
    left = Math.max(10, Math.min(left, maxLeft));

    setCoords({ top, left });
  }, []);

  const openPicker = useCallback(() => {
    clearTimers();
    updateCoords();
    setPickerOpen(true);
  }, [clearTimers, updateCoords]);

  // Viewport scroll and resize listener when quick picker is open
  useEffect(() => {
    if (!pickerOpen) return;

    updateCoords();
    const rafId = requestAnimationFrame(updateCoords);

    const handleScrollOrResize = () => {
      updateCoords();
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [pickerOpen, updateCoords]);

  // Outside tap/click and Esc key dismissals
  useEffect(() => {
    if (!pickerOpen) return;

    function handlePointerDown(e) {
      // If clicking inside button or picker, do not dismiss here
      if (buttonRef.current && buttonRef.current.contains(e.target)) {
        return;
      }
      if (pickerRef.current && pickerRef.current.contains(e.target)) {
        return;
      }
      clearTimers();
      setPickerOpen(false);
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        clearTimers();
        setPickerOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [pickerOpen, clearTimers]);

  function applyLocal(nextEmoji) {
    setCounts((prev) => {
      const next = { ...prev };
      if (myEmoji) next[myEmoji] = Math.max(0, (next[myEmoji] || 1) - 1);
      if (nextEmoji) next[nextEmoji] = (next[nextEmoji] || 0) + 1;
      return next;
    });
    setMyEmoji(nextEmoji);

    if (nextEmoji) {
      if (nextEmoji === '🙏') {
        playSound('reaction_amen');
      } else if (nextEmoji === '🔥') {
        playSound('reaction_fire');
      } else if (nextEmoji === '🙌') {
        playSound('reaction_praise');
      } else {
        playSound('reaction');
      }
      setFloatingReaction(nextEmoji);
      setTimeout(() => setFloatingReaction(null), 1200);
    }
  }

  async function setReaction(emoji) {
    const turningOff = myEmoji === emoji;
    const target = turningOff ? null : emoji;
    const prevEmoji = myEmoji;
    applyLocal(target);

    if (turningOff) {
      const { error } = await supabase
        .from('reactions')
        .delete()
        .eq('target_type', targetType)
        .eq('target_id', targetId)
        .eq('user_id', session.user.id);
      if (error) applyLocal(prevEmoji);
    } else {
      const { error } = await supabase.from('reactions').upsert(
        { target_type: targetType, target_id: targetId, user_id: session.user.id, emoji },
        { onConflict: 'target_type,target_id,user_id' }
      );
      if (error) {
        applyLocal(prevEmoji);
      } else {
        logActivity({
          type: 'reaction',
          icon: emoji,
          title: `Reacted with ${emoji}`,
          snippet: `Expressed faith reaction on ${targetType}`,
          meta: { emoji, targetType, targetId },
        });
      }
    }
  }

  function requireSignIn() {
    clearTimers();
    setPickerOpen(false);
    setShowFullPicker(false);
    onRequireSignIn();
  }

  function pick(emoji) {
    clearTimers();
    setPickerOpen(false);
    setShowFullPicker(false);
    if (!session) return requireSignIn();
    setReaction(emoji);
  }

  // --- Interaction Event Handlers ---

  // Desktop Hover: Open with 150ms intent delay
  function handleMouseEnter(e) {
    // If pointer is touch, do not trigger hover
    if (e?.nativeEvent?.sourceCapabilities?.firesTouchEvents) return;

    // Clear any close delay running from leaving picker/button
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (!session || showFullPicker || pickerOpen) return;

    openTimerRef.current = setTimeout(() => {
      openPicker();
    }, HOVER_OPEN_DELAY);
  }

  // Desktop Hover: Close with 250ms grace delay
  function handleMouseLeave() {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }

    if (pickerOpen && !showFullPicker) {
      closeTimerRef.current = setTimeout(() => {
        setPickerOpen(false);
      }, HOVER_CLOSE_DELAY);
    }
  }

  // Picker hover: keep picker open when pointer is inside the picker
  function handlePickerMouseEnter() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  // Picker leave: start 250ms grace delay (cancelled if pointer re-enters button)
  function handlePickerMouseLeave() {
    if (pickerOpen && !showFullPicker) {
      closeTimerRef.current = setTimeout(() => {
        setPickerOpen(false);
      }, HOVER_CLOSE_DELAY);
    }
  }

  // Touch pointer down: long-press detection (~380ms)
  function handlePointerDown(e) {
    if (e.pointerType === 'touch') {
      longPressedRef.current = false;
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      if (!session) return;
      longPressTimerRef.current = setTimeout(() => {
        longPressedRef.current = true;
        openPicker();
      }, LONG_PRESS_MS);
    }
  }

  function handlePointerUp() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function handlePointerCancel() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  // Click handler: tap/click toggles quick picker
  function handleClick(e) {
    clearTimers();

    // If long-press already fired and opened the picker, consume click without toggling off
    if (longPressedRef.current) {
      longPressedRef.current = false;
      return;
    }

    if (!session) {
      return requireSignIn();
    }

    if (pickerOpen) {
      setPickerOpen(false);
    } else {
      openPicker();
    }
  }

  return (
    <div className={`reaction-wrap${size === 'sm' ? ' reaction-sm' : ''}`}>
      {/* Floating Animated Reaction */}
      {floatingReaction && (
        <span className="reaction-pop-burst" aria-hidden="true">
          {floatingReaction}
        </span>
      )}

      {/* Quick Reaction Pill (Portaled to document.body, clamped & anchored) */}
      {mounted &&
        pickerOpen &&
        !showFullPicker &&
        createPortal(
          <div
            ref={pickerRef}
            className="reaction-picker faith-reaction-picker"
            role="menu"
            aria-label="Faith reactions"
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              bottom: 'auto',
              right: 'auto',
              zIndex: 120,
              margin: 0,
              whiteSpace: 'nowrap',
              flexWrap: 'nowrap',
            }}
            onMouseEnter={handlePickerMouseEnter}
            onMouseLeave={handlePickerMouseLeave}
            onClick={(e) => e.stopPropagation()}
          >
            {FAITH_EMOJI_SET.map((item) => (
              <button
                key={item.emoji}
                type="button"
                role="menuitem"
                className={`reaction-picker-btn${myEmoji === item.emoji ? ' mine' : ''}`}
                onClick={() => pick(item.emoji)}
                title={item.label}
                aria-label={item.label}
              >
                <span className="picker-emoji-char">{item.emoji}</span>
              </button>
            ))}
            <button
              type="button"
              className="reaction-picker-btn reaction-more-btn"
              onClick={(e) => {
                e.stopPropagation();
                clearTimers();
                setPickerOpen(false);
                setShowFullPicker(true);
              }}
              title="Browse all faith reactions"
              aria-label="More reactions"
            >
              <Plus size={16} />
            </button>
          </div>,
          document.body
        )}

      {/* Full Categorized Faith Reaction Sheet inside PopupSheet */}
      {showFullPicker && (
        <PopupSheet
          open={showFullPicker}
          onClose={() => {
            setShowFullPicker(false);
            setPickerOpen(false);
          }}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={16} style={{ color: 'var(--gold)' }} />
              <span>Faith Reactions</span>
            </div>
          }
          size="sm"
        >
          <FaithReactionPicker
            currentEmoji={myEmoji}
            onSelect={pick}
            onClose={() => {
              setShowFullPicker(false);
              setPickerOpen(false);
            }}
            hideHeader={true}
          />
        </PopupSheet>
      )}

      {/* Reaction Toggle Button */}
      <button
        ref={buttonRef}
        type="button"
        className={`react-btn${myEmoji ? ' mine' : ''}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onContextMenu={(e) => e.preventDefault()}
        onClick={handleClick}
        aria-label={myEmoji ? 'Remove reaction' : 'React'}
        aria-haspopup="menu"
        aria-expanded={pickerOpen}
        title="Tap to react · hover or hold for praise & prayer reactions"
      >
        <span className="react-face">{myEmoji || '🤍'}</span>
        <span className="react-label action-label-text">{myEmoji ? 'Reacted' : 'React'}</span>
        {total > 0 && <span className="react-count">{total}</span>}
      </button>
    </div>
  );
}
