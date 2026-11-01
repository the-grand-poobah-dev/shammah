import { notFound } from 'next/navigation';
import LayoutKitPlayground from './LayoutKitPlayground';

/** Development-only visual review route for the shared Layout Kit. */
export default function LayoutKitPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return <LayoutKitPlayground />;
}
