'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Compass,
  ArrowLeft,
  Flame,
  BookOpen,
  Headphones,
  Calendar,
  Heart,
  Users,
  Smile,
  Shield,
  Music,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { CATEGORY_STYLES } from '../lib/postDisplay';
import { playSound } from '../lib/soundEffects';

const CATEGORY_ICONS = {
  lessons: BookOpen,
  stories: Heart,
  podcasts: Headphones,
  events: Calendar,
  involved: Users,
  resources: HelpCircle,
  parent: Shield,
  worship: Music,
  teen: Flame,
  kids: Smile,
  volunteer: Users,
  hacks: Sparkles,
  prayer: Heart,
  seasonal: Calendar,
  field: Compass,
};

export default function CategoriesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const categories = Object.entries(CATEGORY_STYLES).filter(([key, cat]) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return key.toLowerCase().includes(q) || cat.label.toLowerCase().includes(q);
  });

  return (
    <main className="shell">
      <div className="sticky-header">
        <header className="topbar">
          <div className="brand" style={{ gap: 10 }}>
            <Link
              href="/"
              className="action-btn"
              style={{ minHeight: 36, padding: '6px 10px', textDecoration: 'none' }}
              aria-label="Back to feed"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="brand-text-wrap">
              <h1 className="brand-mark" style={{ fontSize: '18px' }}>Categories &amp; Topics</h1>
              <span className="brand-subtext">Community Streams</span>
            </div>
          </div>
        </header>
      </div>

      <div className="cx-page" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="bible-controls-card">
          <input
            type="text"
            className="inst-search-field"
            placeholder="Search topics (e.g. Worship, Prayer, Lessons)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          {categories.map(([id, cat]) => {
            const Icon = CATEGORY_ICONS[id] || Compass;
            return (
              <button
                key={id}
                type="button"
                className="post-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderLeft: `4px solid ${cat.accent}`,
                  textDecoration: 'none',
                  minHeight: 64,
                }}
                onClick={() => {
                  playSound('reaction');
                  router.push(`/?category=${id}`);
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: cat.soft,
                    color: cat.text,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={20} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <strong style={{ display: 'block', fontSize: 14, color: 'var(--ink)' }}>{cat.label}</strong>
                  <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>Browse category posts</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}
