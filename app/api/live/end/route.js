import { NextResponse } from 'next/server';
import { getSupabaseAdmin, resolveUser, getUserProfile } from '../../../lib/live/serverAuth';
import { closeRoom } from '../../../lib/live/provider';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const user = await resolveUser(req);
    if (!user?.id) {
      return NextResponse.json({ ok: false, error: 'Sign in required.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const streamId = body.streamId || body.stream_id;
    if (!streamId) {
      return NextResponse.json({ ok: false, error: 'streamId is required.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const profile = await getUserProfile(user.id);

    // 1. Fetch stream
    const { data: stream, error: streamErr } = await supabase
      .from('live_streams')
      .select('*')
      .eq('id', streamId)
      .maybeSingle();

    if (streamErr || !stream) {
      return NextResponse.json({ ok: false, error: 'Stream not found.' }, { status: 404 });
    }

    // 2. Auth check: Must be host or admin
    const isHost = stream.host_id === user.id;
    const isAdmin = ['admin', 'superadmin', 'pastor'].includes(String(profile?.role || '').toLowerCase());

    if (!isHost && !isAdmin) {
      return NextResponse.json(
        { ok: false, error: 'Only the stream host or a church administrator can end this broadcast.' },
        { status: 403 }
      );
    }

    const now = new Date();
    const startedAt = stream.started_at ? new Date(stream.started_at) : now;
    const durationSeconds = Math.max(0, Math.round((now.getTime() - startedAt.getTime()) / 1000));
    const peakViewers = Math.max(stream.peak_viewers || 0, stream.viewer_count || 0);

    // 3. Update stream status to 'ended'
    const { data: updated, error: updateErr } = await supabase
      .from('live_streams')
      .update({
        status: 'ended',
        ended_at: now.toISOString(),
        viewer_count: 0,
        peak_viewers: peakViewers,
        updated_at: now.toISOString(),
      })
      .eq('id', stream.id)
      .select('*, host:profiles(id, display_name, avatar_url)')
      .single();

    if (updateErr) {
      console.error('[live/end] update error:', updateErr);
      return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
    }

    // 4. Terminate room on LiveKit Cloud
    if (stream.room_name) {
      closeRoom(stream.room_name).catch(() => {});
    }

    return NextResponse.json({
      ok: true,
      stream: updated,
      stats: {
        durationSeconds,
        peakViewers,
        totalLikes: stream.like_count || 0,
      },
    });
  } catch (err) {
    console.error('[live/end] error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
