'use client';
import { usePathname } from 'next/navigation';
import TopNav from './TopNav';

// Renders the sticky top navigation bar on every subpage (on homepage, it is placed right below the Shammah header)
export default function TopNavGlobal() {
  const pathname = usePathname();

  // On the homepage, the top nav is rendered right below the Shammah title & avatar inside the sticky-header
  if (pathname === '/') {
    return null;
  }

  return (
    <div className="top-nav-global-sticky">
      <TopNav isHome={false} />
    </div>
  );
}
