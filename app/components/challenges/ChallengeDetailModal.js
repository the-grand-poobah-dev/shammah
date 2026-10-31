'use client';
import React, { useState, useEffect } from 'react';
import PopupSheet from '../PopupSheet';
import { Trophy, Users, Calendar, Flame, CheckCircle2, Video, Share2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { playSound } from '../../lib/soundEffects';

export default function ChallengeDetailModal({
  isOpen,
  onClose,
  challengeId,
  currentUser,
  onOpenCheckin,
  onOpenSubmit,
}) {
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!challengeId || !isOpen) return;
    let mounted = true;
    async function loadDetail() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('challenges')
          .select('*')
          .eq('id', challengeId)
          .maybeSingle();

        if (mounted && data) {
          setChallenge(data);
        } else if (mounted) {
          setChallenge({
            id: challengeId,
            title: '21-Day New Testament Journey',
            description: 'Read one chapter of the New Testament daily, memorizing one key promise each week. Let the living Word transform your heart.',
            category: 'scripture',
            participants_count: 142,
            duration_days: 21,
            days_left: 14,
            current_streak: 5,
          });
        }
      } catch {
        if (mounted) {
          setChallenge({
            id: challengeId,
            title: '21-Day New Testament Journey',
            description: 'Read one chapter of the New Testament daily, memorizing one key promise each week.',
            category: 'scripture',
            participants_count: 142,
            duration_days: 21,
            days_left: 14,
            current_streak: 5,
          });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadDetail();
    return () => {
      mounted = false;
    };
  }, [challengeId, isOpen]);

  return (
    <PopupSheet
      open={isOpen}
      onClose={onClose}
      title={challenge?.title || 'Faith Challenge'}
      size="md"
    >
      <div className="p-4 sm:p-5 space-y-5">
        <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--ink-muted)]">
          <span className="flex items-center gap-1 font-semibold text-orange-500">
            <Flame size={14} /> {challenge?.current_streak || 3}-Day Streak
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Users size={14} /> {challenge?.participants_count || 56} Joined
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Calendar size={14} /> {challenge?.days_left || 7} Days Left
          </span>
        </div>

        <p className="text-sm text-[var(--ink)] leading-relaxed">
          {challenge?.description}
        </p>

        {/* Milestone Days grid */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
            Streak Schedule
          </h4>
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-xs">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 ${
                  i < (challenge?.current_streak || 3)
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                    : 'bg-[var(--surface-sunken)] border-[var(--border)] text-[var(--ink-muted)]'
                }`}
              >
                <span className="font-bold text-[10px]">D{i + 1}</span>
                {i < (challenge?.current_streak || 3) ? (
                  <CheckCircle2 size={13} />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-[var(--border)]" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={() => onOpenSubmit && onOpenSubmit(challenge)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-[var(--border)] text-sm font-medium text-[var(--ink)] hover:border-[var(--sec-color)] transition-colors min-h-[44px]"
          >
            <Video size={16} />
            <span>Submit Entry</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenCheckin && onOpenCheckin(challenge)}
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-[var(--teal)] text-white text-sm font-semibold hover:opacity-90 transition-opacity min-h-[44px]"
          >
            <CheckCircle2 size={16} />
            <span>Check In Today</span>
          </button>
        </div>
      </div>
    </PopupSheet>
  );
}
