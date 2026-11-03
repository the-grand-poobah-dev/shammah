'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, BookOpen, GraduationCap, HeartHandshake, Headphones, Radio, Vote, Gamepad2, X } from 'lucide-react';
import { fetchPromoCandidates, rankPromoCandidates, recordPromoEvent } from '../../lib/promoData';

const DISMISS_KEY = 'shammah:promo-dismissed:v1';
const SEEN_KEY = 'shammah:promo-seen:v1';
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

const META = {
  live: { icon: Radio, title: 'Live now', action: 'Watch live', accent: '#ef4444', section: 'videos' },
  course: { icon: GraduationCap, title: 'Featured course', action: 'Explore courses', accent: '#8b5cf6', section: 'courses' },
  fundraiser: { icon: HeartHandshake, title: 'Make a difference', action: 'Support a fundraiser', accent: '#10b981', section: 'fundraisers' },
  challenge: { icon: Activity, title: 'Faith challenge', action: 'Join the challenge', accent: '#f59e0b', section: 'challenges' },
  verse: { icon: BookOpen, title: 'Verse of the day', action: 'Open Bible', accent: '#06b6d4', section: 'bible' },
  audio: { icon: Headphones, title: 'Listen and grow', action: 'Explore audio', accent: '#ec4899', section: 'podcasts' },
  poll: { icon: Vote, title: 'Join the conversation', action: 'Vote in a poll', accent: '#0ea5e9', section: 'polls' },
  arcade: { icon: Gamepad2, title: 'Faith Arcade', action: 'Play a Bible game', accent: '#f97316', section: 'arcade' },
};

function getText(item) {
  const d = item?.data || {};
  return d.title || d.reference || d.text_content || d.description || (item?.type === 'live' ? 'Join your community live' : 'Discover something meaningful today');
}

export default function PromoSlot({ onSelectSection }) {
  const [candidates, setCandidates] = useState([]);
  const [dismissed, setDismissed] = useState([]);
  const [seen, setSeen] = useState([]);
  const [activeType, setActiveType] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const now = Date.now();
      const rawDismissed = JSON.parse(localStorage.getItem(DISMISS_KEY) || '{}');
      const kept = Object.entries(rawDismissed).filter(([, expires]) => Number(expires) > now).map(([type]) => type);
      setDismissed(kept);
      setSeen(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'));
    } catch { setDismissed([]); setSeen([]); }
    let active = true;
    fetchPromoCandidates().then(data => {
      if (!active) return;
      setCandidates(data);
      const ranked = rankPromoCandidates(data);
      setActiveType(ranked[0]?.type || null);
    }).catch(() => setCandidates([])).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const ranked = useMemo(() => rankPromoCandidates(candidates, dismissed, seen), [candidates, dismissed, seen]);
  const current = ranked.find(item => item.type === activeType) || ranked[0];
  const meta = current ? META[current.type] : null;

  useEffect(() => {
    if (!current || loading) return;
    recordPromoEvent({ promoType: current.type, promoId: current.data?.id, eventType: 'impression' });
    const next = [...new Set([...seen, current.type])];
    setSeen(next);
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(next)); } catch {}
  // Track each selected card only once per component mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.type, loading]);

  if (loading) return <div className="shammah-promo-slot shammah-promo-skeleton" aria-hidden="true" />;
  if (!current || !meta) return null;

  const Icon = meta.icon;
  const body = current.type === 'verse' ? current.data.text : (current.data.description || current.data.text_content || current.data.title || '');
  const title = current.type === 'verse' ? current.data.reference : getText(current);

  function dismiss() {
    const next = [...new Set([...dismissed, current.type])];
    setDismissed(next);
    setActiveType(rankPromoCandidates(candidates, next, seen)[0]?.type || null);
    try {
      const raw = JSON.parse(localStorage.getItem(DISMISS_KEY) || '{}');
      raw[current.type] = Date.now() + DISMISS_MS;
      localStorage.setItem(DISMISS_KEY, JSON.stringify(raw));
    } catch {}
    recordPromoEvent({ promoType: current.type, promoId: current.data?.id, eventType: 'dismiss' });
  }

  function openPromo() {
    recordPromoEvent({ promoType: current.type, promoId: current.data?.id, eventType: 'click' });
    if (onSelectSection) onSelectSection(meta.section);
    else if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('shammah:set-section', { detail: meta.section }));
  }

  return (
    <section className="shammah-promo-slot" style={{ '--promo-accent': meta.accent }}>
      <div className="shammah-promo-slot-main">
        <span className="shammah-promo-icon"><Icon size={19} aria-hidden="true" /></span>
        <div className="shammah-promo-slot-copy">
          <span className="shammah-promo-eyebrow">{meta.title}</span>
          <h3>{title}</h3>
          {body && <p>{body}</p>}
          <button type="button" className="shammah-promo-cta" onClick={openPromo}>{meta.action}</button>
        </div>
      </div>
      <button type="button" className="shammah-promo-dismiss" onClick={dismiss} aria-label="Not interested in this recommendation" title="Not interested"><X size={17} /></button>
    </section>
  );
}
