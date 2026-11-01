import { notFound } from 'next/navigation';
import LayoutKitPlayground from './LayoutKitPlayground';

/** Development/preview visual review route for the shared Layout Kit. */
export default function LayoutKitPage() {
  // Vercel preview builds also use NODE_ENV=production. Keep the playground
  // available in previews, but never expose it on the production deployment.
  const isProductionDeployment =
    process.env.VERCEL_ENV === 'production' ||
    (process.env.NODE_ENV === 'production' && !process.env.VERCEL_ENV);

  if (isProductionDeployment) {
    notFound();
  }

  return <LayoutKitPlayground />;
}
