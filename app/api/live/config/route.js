import { NextResponse } from 'next/server';
import { getLiveConfig } from '../../../lib/live/provider';
import { resolveUser, getUserProfile } from '../../../lib/live/serverAuth';
import { canUserGoLive } from '../../../lib/live/rules';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const config = getLiveConfig();
    const user = await resolveUser(req);
    let eligibility = { allowed: false, reason: 'Sign in to broadcast live.' };

    if (user?.id) {
      const profile = await getUserProfile(user.id);
      eligibility = canUserGoLive(profile);
    }

    return NextResponse.json({
      ok: true,
      ...config,
      eligibility,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  return GET(req);
}
