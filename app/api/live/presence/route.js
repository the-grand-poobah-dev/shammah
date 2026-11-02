import { getLiveServiceClient, getLiveUser, isUuid, liveJsonError, parseLiveJson } from '../../../lib/live/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function canWatch(service, stream, userId) {
  if (stream.host_id === userId || stream.visibility === 'public') return true;
  if (stream.visibility === 'followers') {
    const { data } = await service.from('follows').select('follower_id')
      .eq('follower_id', userId).eq('followed_id', stream.host_id).maybeSingle();
    return Boolean(data);
  }
  if (stream.visibility === 'church' && stream.church_id) {
    const { data } = await service.from('profiles').select('church_id').eq('id', userId).maybeSingle();
    return data?.church_id === stream.church_id;
  }
  return false;
}

export async function POST(request) {
  const user = await getLiveUser(request);
  if (!user) return liveJsonError('Please sign in to update live presence.', 401);
  const body = await parseLiveJson(request);
  if (!isUuid(body?.streamId) || !['join', 'heartbeat', 'leave'].includes(body?.action)) {
    return liveJsonError('A valid stream and presence action are required.');
  }
  const service = getLiveServiceClient();
  if (!service) return liveJsonError('Live server configuration is incomplete.', 503);

  try {
    const { data: stream, error: streamError } = await service.from('live_streams')
      .select('id, host_id, church_id, visibility, status, viewer_count, peak_viewers')
      .eq('id', body.streamId).maybeSingle();
    if (streamError) throw streamError;
    if (!stream) return liveJsonError('Broadcast not found.', 404);
    if (body.action !== 'leave' && stream.status !== 'live') return liveJsonError('This broadcast has ended.', 409);
    if (!(await canWatch(service, stream, user.id))) return liveJsonError('You do not have permission to watch this broadcast.', 403);

    if (body.action === 'leave' || stream.host_id === user.id) {
      await service.from('live_viewers').delete().eq('stream_id', stream.id).eq('user_id', user.id);
    } else {
      const now = new Date().toISOString();
      const { error: presenceError } = await service.from('live_viewers').upsert({
        stream_id: stream.id, user_id: user.id, last_seen_at: now,
      }, { onConflict: 'stream_id,user_id' });
      if (presenceError) throw presenceError;
    }

    const threshold = new Date(Date.now() - 45_000).toISOString();
    const { count, error: countError } = await service.from('live_viewers')
      .select('user_id', { count: 'exact', head: true })
      .eq('stream_id', stream.id).gte('last_seen_at', threshold).neq('user_id', stream.host_id);
    if (countError) throw countError;
    const viewerCount = count || 0;
    const { error: updateError } = await service.from('live_streams').update({
      viewer_count: viewerCount,
      peak_viewers: Math.max(stream.peak_viewers || 0, viewerCount),
      updated_at: new Date().toISOString(),
    }).eq('id', stream.id);
    if (updateError) throw updateError;
    return Response.json({ viewerCount });
  } catch (error) {
    console.error('[api/live/presence]', error?.message || error);
    return liveJsonError('Could not update live viewer count.', 500);
  }
}
