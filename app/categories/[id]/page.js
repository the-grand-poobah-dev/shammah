'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import PageHeader from '../../components/PageHeader';
import PostList from '../../components/PostList';
import { categoryInfo } from '../../lib/categoryInfo';
import { CATEGORY_STYLES } from '../../lib/postDisplay';
import { useSession } from '../../lib/useSession';

export default function CategoryPage() {
  const { id } = useParams();
  const router = useRouter();
  const { session, profile } = useSession();
  const cat = CATEGORY_STYLES[id];

  if (!cat) {
    return (
      <div className="shell">
        <PageHeader title="Category" backHref="/categories" />
        <div className="coming-soon">
          <h2>We couldn’t find that category</h2>
          <p>It may have been renamed.</p>
          <Link href="/categories" className="signin-btn">Browse all categories</Link>
        </div>
      </div>
    );
  }

  const info = categoryInfo(id);
  return (
    <div className="shell">
      <PageHeader title={cat.label} backHref="/categories" />
      <main className="feed">
        <section
          className="cx-cat-hero"
          style={{ '--accent': cat.accent, '--accent-soft': cat.soft, '--accent-text': cat.text }}
        >
          <span className="cx-cat-emoji cx-cat-emoji-lg" aria-hidden="true">{info.emoji}</span>
          <div>
            <h2 className="cx-cat-hero-title">{cat.label}</h2>
            <p className="cx-cat-hero-blurb">{info.blurb}</p>
            <div style={{ marginTop: '10px' }}>
              <Link href={`/?category=${id}`} className="signin-btn" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '6px 14px' }}>
                View on Home Feed →
              </Link>
            </div>
          </div>
        </section>

        <PostList
          session={session}
          profile={profile}
          filter={{ column: 'category_id', value: id }}
          onRequireSignIn={() => router.push('/')}
          emptyTitle={`No posts in ${cat.label} yet`}
          emptyText="Head back to the feed and be the first to share one."
        />
      </main>
    </div>
  );
}
