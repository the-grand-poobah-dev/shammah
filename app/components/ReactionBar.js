'use client';
import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import FaithReactionPicker from './FaithReactionPicker';
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

export default function ReactionBar({ targetType, targetId, session, onRequireSignIn, size = 'md' }) {
  const [counts, setCounts] = useState({}); // { emoji: n }
  const [myEmoji, setMyEmoji] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showFullPicker, setShowFullPicker] = useState(false);
  const [floatingReaction, setFloatingReaction] = useState(null);
  const timerRef = useRef(null);
  const longPressedRef = useRef(false);

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
  }, [targetType, targetId, session?.user?.id]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  function applyLocal(nextEmoji) {
    setCounts((prev) => {
      const next = { ...prev };
      if (myEmoji) next[myEmoji] = Math.max(0, (next[myEmoji] || 1) - 1);
      if (nextEmoji) next[nextEmoji] = (next[nextEmoji] || 0) + 1;
      return next;
    });
    setMyEmoji(nextEmoji);

    if (nextEmoji) {
      playSound('reaction');
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
    setPickerOpen(false);
    setShowFullPicker(false);
    onRequireSignIn();
  }

  function handleTap() {
    if (longPressedRef.current) {
      longPressedRef.current = false;
      return;
    }
    if (!session) return requireSignIn();
    setReaction(DEFAULT_EMOJI);
  }

  function startPress() {
    if (!session) return;
    longPressedRef.current = false;
    timerRef.current = setTimeout(() => {
      longPressedRef.current = true;
      setPickerOpen(true);
    }, LONG_PRESS_MS);
  }

  function endPress() {
    if (timerRef.current) clearTimeout(timerRef.current);
  }

  function pick(emoji) {
    setPickerOpen(false);
    setShowFullPicker(false);
    if (!session) return requireSignIn();
    setReaction(emoji);
  }

  return (
    <div
      className={`reaction-wrap${size === 'sm' ? ' reaction-sm' : ''}`}
      onMouseEnter={() => session && !showFullPicker && setPickerOpen(true)}
      onMouseLeave={() => {
        if (!showFullPicker) setPickerOpen(false);
      }}
    >
      {/* Floating Animated Reaction */}
      {floatingReaction && (
        <span className="reaction-pop-burst" aria-hidden="true">
          {floatingReaction}
        </span>
      )}

      {/* Quick Reaction Pill with More button */}
      {pickerOpen && !showFullPicker && (
        <div className="reaction-picker faith-reaction-picker" role="menu">
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
              setShowFullPicker(true);
            }}
            title="Browse all faith reactions"
            aria-label="More reactions"
          >
            <Plus size={16} />
          </button>
        </div>
      )}

      {/* Full Categorized Faith Reaction Sheet */}
      {showFullPicker && (
        <div className="reaction-full-sheet-container">
          <FaithReactionPicker
            currentEmoji={myEmoji}
            onSelect={pick}
            onClose={() => {
              setShowFullPicker(false);
              setPickerOpen(false);
            }}
          />
        </div>
      )}

      <button
        type="button"
        className={`react-btn${myEmoji ? ' mine' : ''}`}
        onPointerDown={startPress}
        onPointerUp={endPress}
        onPointerLeave={endPress}
        onPointerCancel={endPress}
        onContextMenu={(e) => e.preventDefault()}
        onClick={handleTap}
        aria-label={myEmoji ? 'Remove reaction' : 'React'}
        title="Tap to like · hover or hold for prayer & praise reactions"
      >
        <span className="react-face">{myEmoji || '🤍'}</span>
        <span className="react-label">{myEmoji ? 'Reacted' : 'React'}</span>
        {total > 0 && <span className="react-count">{total}</span>}
      </button>
    </div>
  );
}
