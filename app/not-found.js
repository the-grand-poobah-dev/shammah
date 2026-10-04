import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="shell">
      <div className="empty-state" style={{ margin: '48px 16px' }}>
        <h2>Page not found</h2>
        <p>The page you are looking for does not exist or has been moved.</p>
        <div className="empty-auth-actions">
          <Link href="/" className="signin-btn" style={{ textDecoration: 'none' }}>
            Return Home
          </Link>
        </div>
      </div>
    </main>
  );
}
