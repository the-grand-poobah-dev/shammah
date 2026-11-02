import { getLiveServiceClient, liveJsonError } from '../../lib/live/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const service = getLiveServiceClient();
  if (!service) return liveJsonError('Live listing is temporarily unavailable.', 503);
  try {
    const { data: streams, error } = await service.from('live_streams')
      .select('id, host_id, title, description, thumb_url, started_at, viewer_count, church_id')
      .eq('status', 'live').eq('visibility', 'public')
      .order('started_at', { ascending: false }).limit(12);
    if (error) throw error;
    const hostIds = [...new Set((streams || []).map((stream) => stream.host_id))];
    const { data: profiles } = hostIds.length
      ? await service.from('profiles').select('id, display_name, avatar_url, badge_verified').in('id', hostIds)
      : { data: [] };
    const byId = new Map((profiles || []).map((profile) => [profile.id, profile]));
    return Response.json({
      streams: (streams || []).map((stream) => ({ ...stream, host: byId.get(stream.host_id) || null })),
    });
  } catch (error) {
    console.error('[api/live/list]', error?.message || error);
    return liveJsonError('Could not load live broadcasts.', 500);
  }
}
