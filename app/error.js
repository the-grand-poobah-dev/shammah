'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({ error, reset }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[Shammah route error]', error);
    }
  }, [error]);

  return (
    <main role="alert" style={{ minHeight: '55vh', display: 'grid', placeItems: 'center', padding: 24, color: 'var(--ink, #f8fafc)', background: 'var(--bg, #0b1220)' }}>
      <section style={{ width: 'min(100%, 480px)', border: '1px solid var(--border, #334155)', borderRadius: 18, padding: 24, background: 'var(--surface, #111827)', textAlign: 'center' }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Something went wrong</h2>
        <p style={{ color: 'var(--ink-muted, #94a3b8)', marginBottom: 20 }}>This section hit an unexpected error. Your account and saved content have not been intentionally changed.</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => reset()} style={{ minHeight: 44, padding: '10px 18px', borderRadius: 12, fontWeight: 700, background: 'var(--teal, #0d9488)', color: '#fff' }}>Try again</button>
          <Link href="/" style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center', padding: '10px 18px', borderRadius: 12, border: '1px solid var(--border, #334155)' }}>Back to feed</Link>
        </div>
      </section>
    </main>
  );
}
