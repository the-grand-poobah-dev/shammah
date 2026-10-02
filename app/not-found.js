import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="shell" style={{ textAlign: 'center', padding: '60px 20px' }}>
      <h2>Page Not Found</h2>
      <p style={{ marginTop: '12px', color: 'var(--ink-muted)' }}>The page you are looking for does not exist.</p>
      <Link href="/" style={{ display: 'inline-block', marginTop: '20px', color: 'var(--teal)' }}>
        Return Home
      </Link>
    </div>
  );
}
