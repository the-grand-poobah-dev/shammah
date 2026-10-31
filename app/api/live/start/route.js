import { NextResponse } from 'next/server';
import { getSupabaseAdmin, resolveUser, getUserProfile } from '../../../lib/live/serverAuth';
import { isLiveConfigured, createHostToken } from '../../../lib/live/provider';
import { canUserGoLive } from '../../../lib/live/rules';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const user = await resolveUser(req);
    if (!user?.id) {
      return NextResponse.json(
        { ok: false, error: 'Sign in required to start a live broadcast.' },
        { status: 401 }
      );
    }

    const profile = await getUserProfile(user.id);
    const eligibility = canUserGoLive(profile);
    if (!eligibility.allowed) {
      return NextResponse.json(
        { ok: false, error: eligibility.reason || 'You are not eligible to go live.' },
        { status: 403 }
      );
    }

    if (!isLiveConfigured()) {
      return NextResponse.json(
        {
          ok: false,
          notConfigured: true,
          error: 'Live streaming is not configured yet. Set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET.',
        },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const title = (body.title || '').trim();
    if (!title) {
      return NextResponse.json(
        { ok: false, error: 'A broadcast title is required.' },
        { status: 400 }
      );
    }

    const description = (body.description || '').trim() || null;
    const visibility = ['public', 'followers', 'church', 'private'].includes(body.visibility)
      ? body.visibility
      : 'public';
    const thumbUrl = body.thumb_url || null;
    const scheduledFor = body.scheduled_for || null;
    const isScheduled = Boolean(scheduledFor);

    const roomName = `shammah-live-${user.id.slice(0, 8)}-${Date.now()}`;
    const supabase = getSupabaseAdmin();

    const insertPayload = {
      host_id: user.id,
      church_id: body.church_id || profile.church_id || null,
      title,
      description,
      thumb_url: thumbUrl,
      status: isScheduled ? 'scheduled' : 'live',
      room_name: roomName,
      visibility,
      started_at: isScheduled ? null : new Date().toISOString(),
      scheduled_for: scheduledFor,
      viewer_count: 0,
      peak_viewers: 0,
      like_count: 0,
    };

    const { data: stream, error: streamErr } = await supabase
      .from('live_streams')
      .insert(insertPayload)
      .select('*, host:profiles(id, display_name, avatar_url, badge, badge_verified, role)')
      .single();

    if (streamErr) {
      console.error('[live/start] stream creation error:', streamErr);
      return NextResponse.json(
        { ok: false, error: streamErr.message || 'Failed to initialize live broadcast.' },
        { status: 500 }
      );
    }

    // Generate Host Token
    const { token, url } = await createHostToken(roomName, profile, {
      stream_id: stream.id,
      church_id: stream.church_id,
    });

    // Notify followers if going live immediately
    if (!isScheduled) {
      notifyFollowersOfLive(supabase, profile, stream).catch((err) => {
        console.warn('[live/start] follower notification error:', err?.message || err);
      });
    }

    return NextResponse.json({
      ok: true,
      stream,
      token,
      url,
      roomName,
      provider: 'livekit',
    });
  } catch (err) {
    console.error('[live/start] unhandled error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

async function notifyFollowersOfLive(supabase, hostProfile, stream) {
  try {
    // 1. Fetch followers
    const { data: followers } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('followed_id', hostProfile.id)
      .limit(500);

    if (!followers || followers.length === 0) return;

    const hostName = hostProfile.display_name || 'A believer';
    const notifTitle = `🔴 ${hostName} is LIVE now!`;
    const notifBody = stream.title || 'Tap to join the sanctuary live broadcast.';

    // 2. Dispatch FCM push notification
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://shammah.app';
    fetch(`${appUrl}/api/fcm/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: notifTitle,
        body: notifBody,
        url: `/live/${stream.id}`,
        tag: `live-${stream.id}`,
      }),
    }).catch(() => {});
  } catch (err) {
    console.warn('[notifyFollowersOfLive] error:', err);
  }
}
