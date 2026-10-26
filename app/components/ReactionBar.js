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

  const buttonRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const longPressedRef = useRef(false);

  const clearTimers = useCallback(() => {
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

  const openPicker = useCallback(() => {
    clearTimers();
    setPickerOpen(true);
  }, [clearTimers]);

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
  function handleClick() {
    clearTimers();

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

      {/* Quick Reaction Picker inside centered PopupSheet */}
      {pickerOpen && (
        <PopupSheet
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={16} style={{ color: 'var(--gold)' }} />
              <span>React to Post</span>
            </div>
          }
          size="sm"
        >
          <div
            className="reaction-picker faith-reaction-picker"
            role="menu"
            aria-label="Faith reactions"
            style={{
              position: 'static',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              margin: '0 auto',
              boxShadow: 'none',
            }}
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
                setShowFullPicker(true);
              }}
              title="Browse all faith reactions"
              aria-label="More reactions"
            >
              <Plus size={16} />
            </button>
          </div>
        </PopupSheet>
      )}

      {/* Full Categorized Faith Reaction Sheet inside PopupSheet (stacks above Quick Picker) */}
      {showFullPicker && (
        <PopupSheet
          open={showFullPicker}
          onClose={() => {
            setShowFullPicker(false);
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
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onContextMenu={(e) => e.preventDefault()}
        onClick={handleClick}
        aria-label={myEmoji ? 'Remove reaction' : 'React'}
        aria-haspopup="dialog"
        aria-expanded={pickerOpen}
        title="Tap to react with praise & prayer reactions"
      >
        <span className="react-face">{myEmoji || '🤍'}</span>
        <span className="react-label action-label-text">{myEmoji ? 'Reacted' : 'React'}</span>
        {total > 0 && <span className="react-count">{total}</span>}
      </button>
    </div>
  );
}
