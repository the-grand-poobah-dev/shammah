import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const REQUIRED = [
  ['NEXT_PUBLIC_SUPABASE_URL', () => process.env.NEXT_PUBLIC_SUPABASE_URL],
  ['NEXT_PUBLIC_SUPABASE_ANON_KEY', () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY],
  ['SUPABASE_SERVICE_ROLE_KEY', () => process.env.SUPABASE_SERVICE_ROLE_KEY],
];

const OPTIONAL = [
  ['GEMINI_API_KEY', () => process.env.GEMINI_API_KEY],
  ['GIPHY_API_KEY', () => process.env.GIPHY_API_KEY],
  ['API_BIBLE_KEY', () => process.env.API_BIBLE_KEY],
  ['LIVEKIT_URL', () => process.env.LIVEKIT_URL],
  ['LIVEKIT_API_KEY', () => process.env.LIVEKIT_API_KEY],
  ['LIVEKIT_API_SECRET', () => process.env.LIVEKIT_API_SECRET],
  ['MPESA_CONSUMER_KEY', () => process.env.MPESA_CONSUMER_KEY],
  ['MPESA_CONSUMER_SECRET', () => process.env.MPESA_CONSUMER_SECRET],
  ['MPESA_PASSKEY', () => process.env.MPESA_PASSKEY],
  ['MPESA_SHORTCODE', () => process.env.MPESA_SHORTCODE],
  ['MPESA_CALLBACK_URL', () => process.env.MPESA_CALLBACK_URL],
  ['MPESA_CALLBACK_SECRET', () => process.env.MPESA_CALLBACK_SECRET],
  ['NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', () => process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY],
];

export async function GET() {
  // Intentionally dev-only: never expose environment diagnostics on a deployed site.
  if (process.env.NODE_ENV !== 'development') {
    return new Response(null, { status: 404 });
  }

  const missing = (items) => items.filter(([, read]) => {
    try {
      return !String(read() || '').trim();
    } catch {
      return true;
    }
  }).map(([name]) => name);

  const requiredMissing = missing(REQUIRED);
  const optionalMissing = missing(OPTIONAL);
  const firebaseReady = Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY)
  );

  return NextResponse.json({
    environment: 'development',
    status: requiredMissing.length ? 'needs-configuration' : 'ok',
    checkedAt: new Date().toISOString(),
    requiredMissing,
    optionalMissing,
    optionalGroups: {
      firebaseMessaging: firebaseReady ? 'configured' : 'missing-configuration',
    },
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
