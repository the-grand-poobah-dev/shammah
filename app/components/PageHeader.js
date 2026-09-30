import Link from 'next/link';

// Top bar for the extra pages: back arrow + title (+ optional action on the right).
export default function PageHeader({ title, backHref = '/', action = null }) {
  return (
    <header className="topbar cx-topbar">
      <Link href={backHref} className="icon-btn" aria-label="Back">
        <svg viewBox="0 0 24 24" className="icon"><path d="M15 5l-7 7 7 7" /></svg>
      </Link>
      <h1 className="cx-topbar-title">{title}</h1>
      <div className="cx-topbar-action">{action}</div>
    </header>
  );
}
