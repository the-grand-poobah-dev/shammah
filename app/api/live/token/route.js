import { NextResponse } from 'next/server';
import { getSupabaseAdmin, resolveUser, getUserProfile } from '../../../lib/live/serverAuth';
import { isLiveConfigured, createViewerToken } from '../../../lib/live/provider';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const streamId = body.streamId || body.stream_id;
    if (!streamId) {
      return NextResponse.json({ ok: false, error: 'streamId is required.' }, { status: 400 });
    }

    if (!isLiveConfigured()) {
      return NextResponse.json(
        {
          ok: false,
          notConfigured: true,
          error: 'Live streaming is not configured.',
        },
        { status: 503 }
      );
    }

    const supabase = getSupabaseAdmin();
    const user = await resolveUser(req);
    const profile = user?.id ? await getUserProfile(user.id) : null;
    const userId = user?.id || null;

    // 1. Fetch live stream
    const { data: stream, error: streamErr } = await supabase
      .from('live_streams')
      .select('*, host:profiles(id, display_name, avatar_url, badge, badge_verified, role)')
      .eq('id', streamId)
      .maybeSingle();

    if (streamErr || !stream) {
      return NextResponse.json({ ok: false, error: 'Stream not found.' }, { status: 404 });
    }

    // 2. Check if banned
    if (userId) {
      const { data: ban } = await supabase
        .from('live_bans')
        .select('stream_id')
        .eq('stream_id', stream.id)
        .eq('user_id', userId)
        .maybeSingle();

      if (ban) {
        return NextResponse.json(
          { ok: false, error: 'You have been restricted from participating in this broadcast.' },
          { status: 403 }
        );
      }
    }

    // 3. Check Visibility
    if (stream.visibility === 'followers' && stream.host_id !== userId) {
      if (!userId) {
        return NextResponse.json(
          { ok: false, error: 'Sign in to view follower-only broadcasts.' },
          { status: 401 }
        );
      }
      const { data: isFollowing } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', userId)
        .eq('followed_id', stream.host_id)
        .maybeSingle();

      if (!isFollowing) {
        return NextResponse.json(
          { ok: false, error: 'This broadcast is visible only to followers of the host.' },
          { status: 403 }
        );
      }
    } else if (stream.visibility === 'church' && stream.host_id !== userId) {
      if (!userId) {
        return NextResponse.json(
          { ok: false, error: 'Sign in to view church-only broadcasts.' },
          { status: 401 }
        );
      }
      if (stream.church_id) {
        const { data: membership } = await supabase
          .from('church_members')
          .select('church_id')
          .eq('church_id', stream.church_id)
          .eq('user_id', userId)
          .maybeSingle();

        if (!membership && profile?.church_id !== stream.church_id) {
          return NextResponse.json(
            { ok: false, error: 'This broadcast is restricted to verified church members.' },
            { status: 403 }
          );
        }
      }
    } else if (stream.visibility === 'private' && stream.host_id !== userId) {
      return NextResponse.json(
        { ok: false, error: 'This broadcast is private.' },
        { status: 403 }
      );
    }

    // 4. Generate Viewer Token
    const viewerIdentity = profile || {
      id: userId || `guest-${Math.random().toString(36).substring(2, 9)}`,
      display_name: 'Disciple',
      avatar_url: null,
    };

    const { token, url } = await createViewerToken(stream.room_name, viewerIdentity);

    // 5. Increment viewer count
    if (stream.status === 'live') {
      const newViewerCount = (stream.viewer_count || 0) + 1;
      const newPeak = Math.max(stream.peak_viewers || 0, newViewerCount);
      await supabase
        .from('live_streams')
        .update({
          viewer_count: newViewerCount,
          peak_viewers: newPeak,
          updated_at: new Date().toISOString(),
        })
        .eq('id', stream.id);
    }

    return NextResponse.json({
      ok: true,
      token,
      url,
      stream,
      roomName: stream.room_name,
    });
  } catch (err) {
    console.error('[live/token] error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
