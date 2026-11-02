import { getLiveServiceClient, getLiveUser, isUuid, liveJsonError } from '../../../lib/live/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const user = await getLiveUser(request);
  if (!user) return liveJsonError('Please sign in to view this broadcast.', 401);
  if (!isUuid(params?.id)) return liveJsonError('A valid stream ID is required.');
  const service = getLiveServiceClient();
  if (!service) return liveJsonError('Live server configuration is incomplete.', 503);

  try {
    const { data: stream, error } = await service.from('live_streams')
      .select('id, host_id, church_id, title, description, thumb_url, status, visibility, started_at, ended_at, viewer_count, peak_viewers, like_count, replay_media_id, created_at')
      .eq('id', params.id).maybeSingle();
    if (error) throw error;
    if (!stream) return liveJsonError('Broadcast not found.', 404);

    let allowed = stream.host_id === user.id || stream.visibility === 'public';
    if (!allowed && stream.visibility === 'followers') {
      const { data } = await service.from('follows').select('follower_id')
        .eq('follower_id', user.id).eq('following_id', stream.host_id).maybeSingle();
      allowed = Boolean(data);
    }
    if (!allowed && stream.visibility === 'church' && stream.church_id) {
      const { data } = await service.from('profiles').select('church_id').eq('id', user.id).maybeSingle();
      allowed = data?.church_id === stream.church_id;
    }
    if (!allowed) return liveJsonError('You do not have permission to view this broadcast.', 403);
    return Response.json({ stream });
  } catch (error) {
    console.error('[api/live/stream]', error?.message || error);
    return liveJsonError('Could not load this broadcast.', 500);
  }
}
