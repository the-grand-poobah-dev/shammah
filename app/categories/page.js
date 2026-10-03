'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import PageHeader from '../components/PageHeader';
import { categoryInfo } from '../lib/categoryInfo';
import { CATEGORY_STYLES } from '../lib/postDisplay';
import { useSession } from '../lib/useSession';
import { ArrowLeft, Compass, Sparkles } from 'lucide-react';

export default function CategoriesPage() {
  const { session, loading } = useSession();
  const [counts, setCounts] = useState({});
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!session) return;
    supabase.rpc('category_counts').then(({ data }) => {
      const map = {};
      (data || []).forEach((r) => (map[r.category_id] = Number(r.total)));
      setCounts(map);
    });
  }, [session?.user?.id]);

  const term = search.trim().toLowerCase();
  const entries = Object.entries(CATEGORY_STYLES).filter(
    ([id, c]) => !term || c.label.toLowerCase().includes(term) || categoryInfo(id).blurb.toLowerCase().includes(term)
  );

  return (
    <div className="shell">
      <PageHeader title="Category Topics" backHref="/" />
      <main className="feed">
        <div className="cx-topics-intro-card">
          <div className="cx-topics-intro-header">
            <Compass size={22} className="text-teal" />
            <h2 className="cx-topics-intro-title">Explore by Category</h2>
          </div>
          <p className="cx-intro">
            Every post on Shammah belongs to a category topic. Pick any category below to immediately discover and filter matching content on your home feed.
          </p>
        </div>

        <input
          className="cx-search"
          type="search"
          placeholder="Search topics (prayer, testimony, worship, youth...)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search category topics"
        />

        {!loading && !session && (
          <p className="mut cx-note">
            <Link href="/">Sign in</Link> to see how many posts each category has.
          </p>
        )}

        <div className="cx-cat-grid">
          {entries.map(([id, c]) => {
            const n = counts[id];
            return (
              <Link
                key={id}
                href={`/?category=${id}`}
                className="cx-cat-card"
                style={{ '--accent': c.accent, '--accent-soft': c.soft, '--accent-text': c.text }}
                title={`Filter home feed by ${c.label}`}
              >
                <div className="cx-cat-header-row">
                  <span className="cx-cat-emoji" aria-hidden="true">{categoryInfo(id).emoji}</span>
                  {n !== undefined && (
                    <span className="cx-cat-count">{n} post{n !== 1 ? 's' : ''}</span>
                  )}
                </div>
                <span className="cx-cat-name">{c.label}</span>
                <span className="cx-cat-blurb">{categoryInfo(id).blurb}</span>
                <span className="cx-cat-feed-action">
                  <span>View on Home Feed</span>
                  <span aria-hidden="true">→</span>
                </span>
              </Link>
            );
          })}
        </div>
        {entries.length === 0 && <p className="mut">No categories match “{search}”.</p>}
      </main>
    </div>
  );
}
