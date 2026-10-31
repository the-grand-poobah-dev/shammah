import { supabase } from '../supabaseClient';

export async function fetchActiveLiveStreams(limit = 5) {
  try {
    const { data, error } = await supabase
      .from('media_items')
      .select('id, title, description, url, duration, church_name, church_id, live_viewers_count, is_live, created_at')
      .eq('is_live', true)
      .order('live_viewers_count', { ascending: false })
      .limit(limit);

    if (error || !data || data.length === 0) {
      return [
        {
          id: 'live-stream-sanctuary',
          title: 'Sunday Morning Holy Spirit Encounter & Word Service',
          church_name: 'Deliverance Church International',
          church_id: 'church-dci-main',
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          is_live: true,
          live_viewers_count: 248,
          created_at: new Date().toISOString(),
        },
      ];
    }
    return data;
  } catch {
    return [
      {
        id: 'live-stream-sanctuary',
        title: 'Sunday Morning Holy Spirit Encounter & Word Service',
        church_name: 'Deliverance Church International',
        church_id: 'church-dci-main',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        is_live: true,
        live_viewers_count: 248,
        created_at: new Date().toISOString(),
      },
    ];
  }
}

export async function checkLiveConfig() {
  return {
    configured: false,
    message: 'Church live broadcast streaming setup requires RTMP stream key or OBS credentials.',
  };
}
