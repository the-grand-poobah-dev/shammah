'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import PageHeader from '../components/PageHeader';
import { categoryInfo } from '../lib/categoryInfo';
import { CATEGORY_STYLES } from '../lib/postDisplay';
import { useSession } from '../lib/useSession';

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
      <PageHeader title="Browse categories" />
      <main className="feed">
        <p className="cx-intro">Every post on Shammah lives in a category. Pick one to see everything shared there.</p>

        <input
          className="cx-search"
          type="search"
          placeholder="Search categories…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search categories"
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
                href={`/categories/${id}`}
                className="cx-cat-card"
                style={{ '--accent': c.accent, '--accent-soft': c.soft, '--accent-text': c.text }}
              >
                <span className="cx-cat-emoji" aria-hidden="true">{categoryInfo(id).emoji}</span>
                <span className="cx-cat-name">{c.label}</span>
                <span className="cx-cat-blurb">{categoryInfo(id).blurb}</span>
                {n !== undefined && (
                  <span className="cx-cat-count">{n} post{n !== 1 ? 's' : ''}</span>
                )}
              </Link>
            );
          })}
        </div>
        {entries.length === 0 && <p className="mut">No categories match “{search}”.</p>}
      </main>
    </div>
  );
}
