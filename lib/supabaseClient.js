import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const isConfigured = Boolean(
  rawUrl &&
  (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) &&
  !rawUrl.includes('placeholder.supabase.co') &&
  rawAnonKey &&
  !rawAnonKey.includes('placeholder')
);

function createMockSupabaseClient() {
  if (typeof console !== 'undefined') {
    console.warn('[AI Studio] Supabase not connected — running in graceful preview mode');
  }

  const listeners = new Set();
  let currentSession = null;

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('shammah_mock_session');
      if (stored) {
        currentSession = JSON.parse(stored);
      }
    } catch {}
  }

  const notify = (event, session) => {
    listeners.forEach((cb) => {
      try {
        cb(event, session);
      } catch (e) {
        console.error(e);
      }
    });
  };

  const sampleChurches = [
    {
      id: 'church-nwc',
      name: 'Nairobi Worship Center',
      denomination: 'Pentecostal',
      location_label: 'Nairobi, Kenya',
      logo_url: 'https://images.unsplash.com/photo-1548625361-195fe57876a3?w=150',
      description: 'A vibrant worshipping community rooted in scripture and active fellowship.',
      website: 'https://nwc.church',
      created_by: 'demo-user-1',
      subscription_status: 'active',
      created_at: new Date().toISOString(),
    },
    {
      id: 'church-grace',
      name: 'Grace Community Fellowship',
      denomination: 'Non-denominational',
      location_label: 'Kampala, Uganda',
      logo_url: 'https://images.unsplash.com/photo-1519491050282-cf00c82424b4?w=150',
      description: 'Discipleship, community outreach, and kingdom multiplication.',
      website: 'https://gracefellowship.org',
      created_by: 'demo-user-2',
      subscription_status: 'active',
      created_at: new Date().toISOString(),
    },
    {
      id: 'church-glory',
      name: 'Glory Tabernacle Chapel',
      denomination: 'Methodist',
      location_label: 'Dar es Salaam, TZ',
      logo_url: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=150',
      description: 'Prayer, intercession, and spreading Christ love to all nations.',
      website: 'https://glorytabernacle.org',
      created_by: 'demo-user-3',
      subscription_status: 'active',
      created_at: new Date().toISOString(),
    },
  ];

  const sampleMediaItems = [
    {
      id: 'b1000000-0000-0000-0000-000000000001',
      kind: 'video',
      author_id: 'demo-user-1',
      church_id: 'church-nwc',
      series_id: 'series-1',
      episode_no: 1,
      title: 'The Unshakeable Covenant: Walking by Faith',
      description: 'Sunday morning message exploring Abrahamic faith, spiritual resilience, and standing steadfast in modern East Africa.',
      media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      thumb_url: 'https://images.unsplash.com/photo-1544427920-c49ccfb85579?w=800&auto=format&fit=crop&q=80',
      duration_seconds: 596,
      category: 'Sermons',
      tags: ['faith', 'covenant', 'abraham', 'nairobi'],
      visibility: 'public',
      status: 'published',
      accent: '#06b6d4',
      view_count: 1420,
      like_count: 184,
      save_count: 52,
      published_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
      author: {
        id: 'demo-user-1',
        display_name: 'Pastor Julius',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        role: 'platform_admin',
        badge: 'pastor',
        badge_verified: true,
      },
      church: {
        id: 'church-nwc',
        name: 'Nairobi Worship Center',
        logo_url: 'https://images.unsplash.com/photo-1548625361-195fe57876a3?w=150',
      },
      series: {
        id: 'series-1',
        title: 'Walking in Supernatural Faith',
        cover_url: 'https://images.unsplash.com/photo-1544427920-c49ccfb85579?w=800',
      },
      chapters: [
        { title: 'Opening Prayer & Context', time_seconds: 0 },
        { title: 'The Covenant of Grace', time_seconds: 120 },
        { title: 'Stepping Into Supernatural Favor', time_seconds: 320 },
        { title: 'Benediction & Impartation', time_seconds: 510 },
      ],
    },
    {
      id: 'b1000000-0000-0000-0000-000000000002',
      kind: 'video',
      author_id: 'demo-user-2',
      church_id: 'church-grace',
      series_id: 'series-2',
      episode_no: 2,
      title: 'Overcoming the Giants: David in the Valley',
      description: 'Practical spiritual weapons for facing anxiety, job loss, and sudden family crises with holy courage.',
      media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      thumb_url: 'https://images.unsplash.com/photo-1507842229451-7f01be8610ce?w=800&auto=format&fit=crop&q=80',
      duration_seconds: 745,
      category: 'Teaching',
      tags: ['david', 'courage', 'victory', 'overcoming'],
      visibility: 'public',
      status: 'published',
      accent: '#f59e0b',
      view_count: 890,
      like_count: 112,
      save_count: 36,
      published_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
      author: {
        id: 'demo-user-2',
        display_name: 'Sarah Ndung\'u',
        avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
        role: 'member',
        badge: 'teacher',
        badge_verified: true,
      },
      church: {
        id: 'church-grace',
        name: 'Grace Community Fellowship',
        logo_url: 'https://images.unsplash.com/photo-1519491050282-cf00c82424b4?w=150',
      },
      series: {
        id: 'series-2',
        title: 'Kingdom Foundations & Discipleship',
        cover_url: 'https://images.unsplash.com/photo-1507842229451-7f01be8610ce?w=800',
      },
      chapters: [
        { title: 'The Valley of Elah', time_seconds: 0 },
        { title: 'Refusing Saul\'s Armor', time_seconds: 210 },
        { title: 'The Stone of Faith', time_seconds: 460 },
      ],
    },
    {
      id: 'b1000000-0000-0000-0000-000000000003',
      kind: 'video',
      author_id: 'demo-user-1',
      church_id: 'church-nwc',
      series_id: 'series-1',
      episode_no: 3,
      title: 'Nairobi Revival Night: Deep Spirit Worship & Prayer',
      description: 'Extended atmosphere of heart surrender, spontaneous praise, and prophetic intercession from the main sanctuary.',
      media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      thumb_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
      duration_seconds: 1820,
      category: 'Worship',
      tags: ['worship', 'praise', 'prayer', 'presence'],
      visibility: 'public',
      status: 'published',
      accent: '#8b5cf6',
      view_count: 3410,
      like_count: 420,
      save_count: 118,
      published_at: new Date(Date.now() - 3600000 * 18).toISOString(),
      author: {
        id: 'demo-user-1',
        display_name: 'Pastor Julius',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        role: 'platform_admin',
        badge: 'pastor',
        badge_verified: true,
      },
      church: {
        id: 'church-nwc',
        name: 'Nairobi Worship Center',
        logo_url: 'https://images.unsplash.com/photo-1548625361-195fe57876a3?w=150',
      },
    },
    {
      id: 'b1000000-0000-0000-0000-000000000004',
      kind: 'video',
      author_id: 'demo-user-3',
      church_id: 'church-glory',
      title: 'From Hopeless Addiction to Christ\'s Ambassador',
      description: 'Brother David shares how the gospel broke chains of alcohol and street despair into evangelistic fire.',
      media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      thumb_url: 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=800&auto=format&fit=crop&q=80',
      duration_seconds: 432,
      category: 'Testimonies',
      tags: ['testimony', 'grace', 'deliverance', 'transformation'],
      visibility: 'public',
      status: 'published',
      accent: '#10b981',
      view_count: 670,
      like_count: 98,
      save_count: 24,
      published_at: new Date(Date.now() - 3600000 * 48).toISOString(),
      author: {
        id: 'demo-user-3',
        display_name: 'David Kimani',
        avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
        role: 'member',
        badge: 'evangelist',
        badge_verified: true,
      },
      church: {
        id: 'church-glory',
        name: 'Glory Tabernacle Chapel',
        logo_url: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=150',
      },
    },
    {
      id: 'b1000000-0000-0000-0000-000000000005',
      kind: 'video',
      author_id: 'demo-user-2',
      church_id: 'church-grace',
      title: 'Kids Kingdom: The Story of Noah & God\'s Rainbow',
      description: 'Engaging animated lesson on obedience, the Ark, and remembering God\'s promises for Sunday school teachers and kids.',
      media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
      thumb_url: 'https://images.unsplash.com/photo-1485546246426-74dc88dec4d9?w=800&auto=format&fit=crop&q=80',
      duration_seconds: 310,
      category: 'Kids & Family',
      tags: ['kids', 'noah', 'ark', 'family'],
      visibility: 'public',
      status: 'published',
      accent: '#f97316',
      view_count: 520,
      like_count: 64,
      save_count: 19,
      published_at: new Date(Date.now() - 3600000 * 72).toISOString(),
      author: {
        id: 'demo-user-2',
        display_name: 'Sarah Ndung\'u',
        avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
        role: 'member',
        badge: 'teacher',
        badge_verified: true,
      },
      church: {
        id: 'church-grace',
        name: 'Grace Community Fellowship',
        logo_url: 'https://images.unsplash.com/photo-1519491050282-cf00c82424b4?w=150',
      },
    },
    {
      id: 'b1000000-0000-0000-0000-000000000006',
      kind: 'video',
      author_id: 'demo-user-3',
      church_id: 'church-glory',
      title: 'Living Bold & Unashamed: Gen-Z Faith in Campus',
      description: 'Navigating peer pressure, social media anxiety, and living wholeheartedly for Jesus on universities and colleges.',
      media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
      thumb_url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&auto=format&fit=crop&q=80',
      duration_seconds: 640,
      category: 'Youth & Gen-Z',
      tags: ['youth', 'campus', 'boldness', 'gen-z'],
      visibility: 'public',
      status: 'published',
      accent: '#ec4899',
      view_count: 1140,
      like_count: 175,
      save_count: 48,
      published_at: new Date(Date.now() - 3600000 * 20).toISOString(),
      author: {
        id: 'demo-user-3',
        display_name: 'David Kimani',
        avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
        role: 'member',
        badge: 'evangelist',
        badge_verified: true,
      },
      church: {
        id: 'church-glory',
        name: 'Glory Tabernacle Chapel',
        logo_url: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=150',
      },
    },
    {
      id: 'b1000000-0000-0000-0000-000000000007',
      kind: 'video',
      author_id: 'demo-user-1',
      church_id: 'church-nwc',
      title: 'Sunday Live Service Replay: The Power of Thanksgiving',
      description: 'Full Sunday live stream recording including praise, choir ministry, sermon on Psalm 100, and altar call.',
      media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      thumb_url: 'https://images.unsplash.com/photo-1519834785169-98be25ec3f84?w=800&auto=format&fit=crop&q=80',
      duration_seconds: 3120,
      category: 'Live Replays',
      tags: ['live', 'replay', 'sunday', 'thanksgiving'],
      visibility: 'public',
      status: 'published',
      accent: '#0ea5e9',
      view_count: 2190,
      like_count: 245,
      save_count: 73,
      published_at: new Date(Date.now() - 3600000 * 96).toISOString(),
      author: {
        id: 'demo-user-1',
        display_name: 'Pastor Julius',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        role: 'platform_admin',
        badge: 'pastor',
        badge_verified: true,
      },
      church: {
        id: 'church-nwc',
        name: 'Nairobi Worship Center',
        logo_url: 'https://images.unsplash.com/photo-1548625361-195fe57876a3?w=150',
      },
    },
    {
      id: 'b1000000-0000-0000-0000-000000000008',
      kind: 'video',
      author_id: 'demo-user-2',
      church_id: 'church-grace',
      title: 'Kingdom Stewardship & M-Pesa Finances in East Africa',
      description: 'Biblical wisdom on saving, debt clearance, investing in ministry, and financial freedom in Kenya.',
      media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      thumb_url: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&auto=format&fit=crop&q=80',
      duration_seconds: 520,
      category: 'Teaching',
      tags: ['finances', 'stewardship', 'mpesa', 'wisdom'],
      visibility: 'public',
      status: 'published',
      accent: '#10b981',
      view_count: 1530,
      like_count: 198,
      save_count: 67,
      published_at: new Date(Date.now() - 3600000 * 50).toISOString(),
      author: {
        id: 'demo-user-2',
        display_name: 'Sarah Ndung\'u',
        avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
        role: 'member',
        badge: 'teacher',
        badge_verified: true,
      },
      church: {
        id: 'church-grace',
        name: 'Grace Community Fellowship',
        logo_url: 'https://images.unsplash.com/photo-1519491050282-cf00c82424b4?w=150',
      },
    },
  ];

  const sampleSeries = [
    {
      id: 'series-1',
      kind: 'video',
      title: 'Walking in Supernatural Faith',
      description: 'A transformative 6-part video sermon series unlocking victory, resilience, and spiritual depth.',
      cover_url: 'https://images.unsplash.com/photo-1544427920-c49ccfb85579?w=800',
      accent: '#06b6d4',
      episodes: [{ count: 6 }],
      owner: { display_name: 'Pastor Julius' },
    },
    {
      id: 'series-2',
      kind: 'video',
      title: 'Kingdom Foundations & Discipleship',
      description: 'Rooting believers in Christ: prayer, scripture reading, fellowship, and holy living.',
      cover_url: 'https://images.unsplash.com/photo-1507842229451-7f01be8610ce?w=800',
      accent: '#f59e0b',
      episodes: [{ count: 4 }],
      owner: { display_name: 'Sarah Ndung\'u' },
    },
    {
      id: 'series-3',
      kind: 'video',
      title: 'Worship in Spirit & in Truth',
      description: 'Exploring the heart of true biblical worship, adoration, and communion with the Holy Spirit.',
      cover_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800',
      accent: '#8b5cf6',
      episodes: [{ count: 5 }],
      owner: { display_name: 'David Kimani' },
    },
  ];

  const sampleReels = [
    {
      id: 'reel-1',
      author_id: 'demo-user-1',
      media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      media_type: 'reel',
      text_content: 'Never forget: the God who answered Elijah with fire is the same yesterday, today and forever! 🔥 Amen! #faith #worship #revival #nairobi',
      sound_title: 'Worship in Spirit · Nairobi Choir',
      view_count: 2420,
      like_count: 312,
      comment_count: 24,
      duration_seconds: 45,
      profiles: {
        id: 'demo-user-1',
        display_name: 'Pastor Julius',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        badge: 'pastor',
        badge_verified: true,
      },
    },
    {
      id: 'reel-2',
      author_id: 'demo-user-2',
      media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      media_type: 'reel',
      text_content: 'Quick 60-second word for anyone feeling overwhelmed: Philippians 4:6-7 says do not be anxious about anything! Drop your worries at His feet today 🙏 #peace #scripture #bible',
      sound_title: 'Morning Manna Devotional',
      view_count: 1890,
      like_count: 245,
      comment_count: 18,
      duration_seconds: 60,
      profiles: {
        id: 'demo-user-2',
        display_name: 'Sarah Ndung\'u',
        avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
        badge: 'teacher',
        badge_verified: true,
      },
    },
    {
      id: 'reel-3',
      author_id: 'demo-user-3',
      media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      media_type: 'reel',
      text_content: 'Street evangelism in Nairobi CBD today! Look what the Lord did — 14 young people gave their lives to Jesus Christ! Praise God! 🙌 #evangelism #testimony #salvation',
      sound_title: 'Original Sound · David Kimani',
      view_count: 3150,
      like_count: 480,
      comment_count: 42,
      duration_seconds: 52,
      profiles: {
        id: 'demo-user-3',
        display_name: 'David Kimani',
        avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
        badge: 'evangelist',
        badge_verified: true,
      },
    },
    {
      id: 'reel-4',
      author_id: 'demo-user-1',
      media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
      media_type: 'reel',
      text_content: 'When the choir hits this harmony, heaven touches earth! "Holy, Holy, Holy is the Lord Almighty!" 🎶 #worship #choir #praise #jesus',
      sound_title: 'Holy Is The Lord · Live Sanctuary',
      view_count: 4210,
      like_count: 610,
      comment_count: 55,
      duration_seconds: 40,
      profiles: {
        id: 'demo-user-1',
        display_name: 'Pastor Julius',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        badge: 'pastor',
        badge_verified: true,
      },
    },
    {
      id: 'reel-5',
      author_id: 'demo-user-2',
      media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      media_type: 'reel',
      text_content: 'Start your morning declaring Psalm 91 over your family, your work, and your health! Safe under His wings. 🛡️ #psalms #protection #prayer',
      sound_title: 'Peaceful Morning Devotional',
      view_count: 1450,
      like_count: 180,
      comment_count: 14,
      duration_seconds: 35,
      profiles: {
        id: 'demo-user-2',
        display_name: 'Sarah Ndung\'u',
        avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
        badge: 'teacher',
        badge_verified: true,
      },
    },
  ];

  const sampleWatchProgress = [
    {
      user_id: 'demo-user-1',
      item_id: 'b1000000-0000-0000-0000-000000000001',
      position_seconds: 195,
      duration_seconds: 596,
      completed: false,
      updated_at: new Date().toISOString(),
      media: null,
    },
  ];

  const auth = {
    async getSession() {
      return { data: { session: currentSession }, error: null };
    },
    onAuthStateChange(cb) {
      listeners.add(cb);
      return {
        data: {
          subscription: {
            unsubscribe: () => listeners.delete(cb),
          },
        },
      };
    },
    async signInWithPassword({ email }) {
      const displayName = (email || 'Believer').split('@')[0];
      const user = {
        id: 'demo-user-1',
        email: email || 'believer@shammah.org',
        user_metadata: { display_name: displayName },
      };
      currentSession = { user, access_token: 'mock-token' };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('shammah_mock_session', JSON.stringify(currentSession));
        } catch {}
      }
      notify('SIGNED_IN', currentSession);
      return { data: { user, session: currentSession }, error: null };
    },
    async signUp({ email, options }) {
      const displayName = options?.data?.display_name || (email || 'Believer').split('@')[0];
      const user = {
        id: 'demo-user-1',
        email: email || 'believer@shammah.org',
        user_metadata: { display_name: displayName },
      };
      currentSession = { user, access_token: 'mock-token' };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('shammah_mock_session', JSON.stringify(currentSession));
        } catch {}
      }
      notify('SIGNED_IN', currentSession);
      return { data: { user, session: currentSession }, error: null };
    },
    async signInWithOtp() {
      return { data: {}, error: null };
    },
    async signInWithOAuth() {
      return { data: {}, error: null };
    },
    async resetPasswordForEmail() {
      return { data: {}, error: null };
    },
    async signOut() {
      currentSession = null;
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('shammah_mock_session');
        } catch {}
      }
      notify('SIGNED_OUT', null);
      return { error: null };
    },
    async updateUser(attributes) {
      if (currentSession?.user && attributes?.data) {
        currentSession.user.user_metadata = {
          ...currentSession.user.user_metadata,
          ...attributes.data,
        };
      }
      return { data: { user: currentSession?.user }, error: null };
    },
  };

  const sampleComments = [
    {
      id: 'comm-1',
      media_id: 'b1000000-0000-0000-0000-000000000001',
      author_id: 'demo-user-2',
      text_content: 'This sermon shifted my perspective completely! God is faithful in every storm. 🙏🔥',
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
      profiles: {
        display_name: 'Sarah Ndung\'u',
        avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
        badge: 'teacher',
        badge_verified: true,
      },
    },
    {
      id: 'comm-2',
      media_id: 'b1000000-0000-0000-0000-000000000001',
      author_id: 'demo-user-3',
      text_content: 'Amen Pastor Julius! Tuning in from Kisumu. May God bless Nairobi Worship Center.',
      created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      profiles: {
        display_name: 'David Kimani',
        avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
        badge: 'evangelist',
        badge_verified: true,
      },
    },
  ];

  const createQueryBuilder = (table) => {
    let isSingle = false;
    let isMaybeSingle = false;
    const filters = {};
    const notEqualFilters = {};
    const gtFilters = {};
    const gteFilters = {};
    const ltFilters = {};
    const lteFilters = {};
    const inFilters = {};
    let orderCol = null;
    let orderAsc = true;
    let rangeFrom = null;
    let rangeTo = null;
    let limitVal = null;

    const builder = {
      select() {
        return builder;
      },
      insert(row) {
        if (typeof window !== 'undefined') {
          try {
            if (table === 'post_reposts') {
              const raw = localStorage.getItem('shammah_supabase_post_reposts_db');
              const list = raw ? JSON.parse(raw) : [];
              const newRecord = {
                id: 'rep-' + Date.now(),
                created_at: new Date().toISOString(),
                ...(Array.isArray(row) ? row[0] : row),
              };
              list.push(newRecord);
              localStorage.setItem('shammah_supabase_post_reposts_db', JSON.stringify(list));
            } else if (table === 'church_follows') {
              const raw = localStorage.getItem('shammah_supabase_church_follows_db');
              const list = raw ? JSON.parse(raw) : [];
              const toInsert = Array.isArray(row) ? row : [row];
              toInsert.forEach((item) => {
                const exists = list.some((r) => r.user_id === item.user_id && r.church_id === item.church_id);
                if (!exists) {
                  list.push({ ...item, created_at: new Date().toISOString() });
                }
              });
              localStorage.setItem('shammah_supabase_church_follows_db', JSON.stringify(list));
            } else if (table === 'church_members') {
              const raw = localStorage.getItem('shammah_supabase_church_members_db');
              const list = raw ? JSON.parse(raw) : [];
              const toInsert = Array.isArray(row) ? row : [row];
              toInsert.forEach((item) => {
                const idx = list.findIndex((r) => r.user_id === item.user_id && r.church_id === item.church_id);
                if (idx >= 0) {
                  list[idx] = { ...list[idx], ...item, updated_at: new Date().toISOString() };
                } else {
                  list.push({
                    status: 'active',
                    ...item,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  });
                }
              });
              localStorage.setItem('shammah_supabase_church_members_db', JSON.stringify(list));
            } else if (table === 'user_shortcuts') {
              const raw = localStorage.getItem('shammah_supabase_user_shortcuts_db');
              const list = raw ? JSON.parse(raw) : [];
              const item = Array.isArray(row) ? row[0] : row;
              const idx = list.findIndex((r) => r.user_id === item.user_id);
              const record = {
                ...item,
                updated_at: item.updated_at || new Date().toISOString(),
              };
              if (idx >= 0) {
                list[idx] = { ...list[idx], ...record };
              } else {
                list.push(record);
              }
              localStorage.setItem('shammah_supabase_user_shortcuts_db', JSON.stringify(list));
            } else if (table === 'media_items') {
              const raw = localStorage.getItem('shammah_supabase_media_items_db');
              const list = raw ? JSON.parse(raw) : [];
              const item = Array.isArray(row) ? row[0] : row;
              const newRecord = {
                id: 'med-' + Date.now(),
                created_at: new Date().toISOString(),
                published_at: new Date().toISOString(),
                view_count: 0,
                like_count: 0,
                save_count: 0,
                author: {
                  id: item.author_id || 'demo-user-1',
                  display_name: 'Pastor Julius',
                  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
                  badge: 'pastor',
                  badge_verified: true,
                },
                ...item,
              };
              list.unshift(newRecord);
              localStorage.setItem('shammah_supabase_media_items_db', JSON.stringify(list));
            } else if (table === 'watch_progress') {
              const raw = localStorage.getItem('shammah_supabase_watch_progress_db');
              let list = raw ? JSON.parse(raw) : [];
              const item = Array.isArray(row) ? row[0] : row;
              const idx = list.findIndex((r) => r.user_id === item.user_id && r.item_id === item.item_id);
              const record = { ...item, updated_at: new Date().toISOString() };
              if (idx >= 0) {
                list[idx] = { ...list[idx], ...record };
              } else {
                list.unshift(record);
              }
              localStorage.setItem('shammah_supabase_watch_progress_db', JSON.stringify(list));
            } else if (table === 'media_engagement') {
              const raw = localStorage.getItem('shammah_supabase_media_engagement_db');
              let list = raw ? JSON.parse(raw) : [];
              const item = Array.isArray(row) ? row[0] : row;
              const idx = list.findIndex((r) => r.user_id === item.user_id && r.item_id === item.item_id);
              if (idx >= 0) {
                list[idx] = { ...list[idx], ...item };
              } else {
                list.push(item);
              }
              localStorage.setItem('shammah_supabase_media_engagement_db', JSON.stringify(list));
            } else if (table === 'comments') {
              const raw = localStorage.getItem('shammah_supabase_media_comments_db');
              const list = raw ? JSON.parse(raw) : [];
              const item = Array.isArray(row) ? row[0] : row;
              const newRecord = {
                id: 'comm-' + Date.now(),
                created_at: new Date().toISOString(),
                profiles: {
                  display_name: 'Pastor Julius',
                  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
                  badge: 'pastor',
                  badge_verified: true,
                },
                ...item,
              };
              list.push(newRecord);
              localStorage.setItem('shammah_supabase_media_comments_db', JSON.stringify(list));
            } else if (table === 'reactions') {
              const raw = localStorage.getItem('shammah_supabase_reactions_db');
              const list = raw ? JSON.parse(raw) : [];
              const item = Array.isArray(row) ? row[0] : row;
              const newRecord = {
                id: 'rx-' + Date.now(),
                created_at: new Date().toISOString(),
                ...item,
              };
              list.push(newRecord);
              localStorage.setItem('shammah_supabase_reactions_db', JSON.stringify(list));
            } else if (table === 'posts') {
              const raw = localStorage.getItem('shammah_supabase_posts_db');
              const list = raw ? JSON.parse(raw) : [];
              const item = Array.isArray(row) ? row[0] : row;
              const newRecord = {
                id: 'post-' + Date.now(),
                created_at: new Date().toISOString(),
                ...item,
              };
              list.unshift(newRecord);
              localStorage.setItem('shammah_supabase_posts_db', JSON.stringify(list));
            }
          } catch {}
        }
        return {
          select() {
            return {
              single() {
                return Promise.resolve({ data: { id: 'item-' + Date.now() }, error: null });
              },
              maybeSingle() {
                return Promise.resolve({ data: { id: 'item-' + Date.now() }, error: null });
              },
              then(res, rej) {
                return Promise.resolve({ data: [{ id: 'item-' + Date.now() }], error: null }).then(res, rej);
              },
            };
          },
          then(res, rej) {
            return Promise.resolve({ data: [{ id: 'item-' + Date.now() }], error: null }).then(res, rej);
          },
        };
      },
      update(fields) {
        return {
          eq(col, val) {
            filters[col] = val;
            if (typeof window !== 'undefined') {
              try {
                if (table === 'media_items') {
                  const raw = localStorage.getItem('shammah_supabase_media_items_db');
                  let list = raw ? JSON.parse(raw) : [];
                  list = list.map((m) => (m[col] === val ? { ...m, ...fields } : m));
                  localStorage.setItem('shammah_supabase_media_items_db', JSON.stringify(list));
                }
              } catch {}
            }
            return builder;
          },
          select() {
            return builder;
          },
          single() {
            isSingle = true;
            return builder;
          },
          maybeSingle() {
            isMaybeSingle = true;
            return builder;
          },
          then(res, rej) {
            return Promise.resolve({ data: fields, error: null }).then(res, rej);
          },
        };
      },
      upsert(rows) {
        return builder.insert(rows);
      },
      delete() {
        return {
          eq(col, val) {
            filters[col] = val;
            if (typeof window !== 'undefined') {
              try {
                if (table === 'post_reposts') {
                  const raw = localStorage.getItem('shammah_supabase_post_reposts_db');
                  let list = raw ? JSON.parse(raw) : [];
                  list = list.filter((r) => r[col] !== val);
                  localStorage.setItem('shammah_supabase_post_reposts_db', JSON.stringify(list));
                } else if (table === 'church_follows') {
                  const raw = localStorage.getItem('shammah_supabase_church_follows_db');
                  let list = raw ? JSON.parse(raw) : [];
                  list = list.filter((r) => r[col] !== val);
                  localStorage.setItem('shammah_supabase_church_follows_db', JSON.stringify(list));
                } else if (table === 'church_members') {
                  const raw = localStorage.getItem('shammah_supabase_church_members_db');
                  let list = raw ? JSON.parse(raw) : [];
                  list = list.filter((r) => r[col] !== val);
                  localStorage.setItem('shammah_supabase_church_members_db', JSON.stringify(list));
                } else if (table === 'user_shortcuts') {
                  const raw = localStorage.getItem('shammah_supabase_user_shortcuts_db');
                  let list = raw ? JSON.parse(raw) : [];
                  list = list.filter((r) => r[col] !== val);
                  localStorage.setItem('shammah_supabase_user_shortcuts_db', JSON.stringify(list));
                } else if (table === 'media_items') {
                  const raw = localStorage.getItem('shammah_supabase_media_items_db');
                  let list = raw ? JSON.parse(raw) : [];
                  list = list.filter((r) => r[col] !== val);
                  localStorage.setItem('shammah_supabase_media_items_db', JSON.stringify(list));
                } else if (table === 'reactions') {
                  const raw = localStorage.getItem('shammah_supabase_reactions_db');
                  let list = raw ? JSON.parse(raw) : [];
                  list = list.filter((r) => r[col] !== val);
                  localStorage.setItem('shammah_supabase_reactions_db', JSON.stringify(list));
                }
              } catch {}
            }
            return builder;
          },
          then(res, rej) {
            return Promise.resolve({ data: [], error: null }).then(res, rej);
          },
        };
      },
      eq(col, val) {
        filters[col] = val;
        return builder;
      },
      neq(col, val) {
        notEqualFilters[col] = val;
        return builder;
      },
      gt(col, val) {
        gtFilters[col] = val;
        return builder;
      },
      gte(col, val) {
        gteFilters[col] = val;
        return builder;
      },
      lt(col, val) {
        ltFilters[col] = val;
        return builder;
      },
      lte(col, val) {
        lteFilters[col] = val;
        return builder;
      },
      ilike() {
        return builder;
      },
      in(col, vals) {
        inFilters[col] = vals;
        return builder;
      },
      or() {
        return builder;
      },
      order(col, opts) {
        orderCol = col;
        orderAsc = opts?.ascending !== false;
        return builder;
      },
      range(from, to) {
        rangeFrom = from;
        rangeTo = to;
        return builder;
      },
      limit(n) {
        limitVal = n;
        return builder;
      },
      single() {
        isSingle = true;
        return builder;
      },
      maybeSingle() {
        isMaybeSingle = true;
        return builder;
      },
      then(resolve, reject) {
        let result = null;
        if (table === 'churches') {
          if (isSingle || isMaybeSingle) {
            result = sampleChurches[0];
          } else {
            result = sampleChurches;
          }
        } else if (table === 'profiles') {
          if (inFilters.id) {
            result = inFilters.id.map((id) => ({
              id,
              display_name: id === 'demo-user-1' ? 'Pastor Julius' : id === 'demo-user-2' ? 'Sarah Ndung\'u' : 'David Kimani',
              avatar_url: id === 'demo-user-1' ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' : id === 'demo-user-2' ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150' : 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
              badge: id === 'demo-user-1' ? 'pastor' : id === 'demo-user-2' ? 'teacher' : 'evangelist',
              badge_verified: true,
              role: 'member',
            }));
            return Promise.resolve({ data: result, error: null }).then(resolve, reject);
          }
          if (currentSession?.user) {
            result = {
              id: currentSession.user.id,
              display_name: currentSession.user.user_metadata?.display_name || 'Pastor Julius',
              role: 'platform_admin',
              church_id: 'church-nwc',
              badge: 'pastor',
              badge_verified: true,
              avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
              cover_url: 'https://images.unsplash.com/photo-1548625361-195fe57876a3?w=800',
              about: 'Serving the Lord with all my heart, mind, and soul.',
              location_label: 'Nairobi, Kenya',
              onboarding_completed_at: new Date().toISOString(),
              display_name_changed_at: null,
            };
          } else {
            result = null;
          }
        } else if (table === 'posts') {
          if (filters.media_type === 'reel') {
            let userReels = [];
            if (typeof window !== 'undefined') {
              try {
                const raw = localStorage.getItem('shammah_supabase_posts_db');
                userReels = (raw ? JSON.parse(raw) : []).filter((p) => p.media_type === 'reel');
              } catch {}
            }
            let list = [...userReels, ...sampleReels];
            if (rangeFrom !== null && rangeTo !== null) {
              list = list.slice(rangeFrom, rangeTo + 1);
            }
            result = isSingle || isMaybeSingle ? (list[0] || null) : list;
            return Promise.resolve({ data: result, count: list.length, error: null }).then(resolve, reject);
          }
          result = isSingle ? null : [];
        } else if (table === 'post_reposts') {
          let list = [];
          if (typeof window !== 'undefined') {
            try {
              const raw = localStorage.getItem('shammah_supabase_post_reposts_db');
              list = raw ? JSON.parse(raw) : [];
            } catch {}
          }
          if (filters.post_id) list = list.filter((r) => r.post_id === filters.post_id);
          if (filters.user_id) list = list.filter((r) => r.user_id === filters.user_id);
          result = isSingle || isMaybeSingle ? (list[0] || null) : list;
          return Promise.resolve({ data: result, count: list.length, error: null }).then(resolve, reject);
        } else if (table === 'church_follows') {
          let list = [];
          if (typeof window !== 'undefined') {
            try {
              const raw = localStorage.getItem('shammah_supabase_church_follows_db');
              list = raw ? JSON.parse(raw) : [];
            } catch {}
          }
          if (filters.church_id) list = list.filter((r) => r.church_id === filters.church_id);
          if (filters.user_id) list = list.filter((r) => r.user_id === filters.user_id);
          result = isSingle || isMaybeSingle ? (list[0] || null) : list;
          return Promise.resolve({ data: result, count: list.length, error: null }).then(resolve, reject);
        } else if (table === 'church_members') {
          let list = [];
          if (typeof window !== 'undefined') {
            try {
              const raw = localStorage.getItem('shammah_supabase_church_members_db');
              list = raw ? JSON.parse(raw) : [];
            } catch {}
          }
          if (filters.church_id) list = list.filter((r) => r.church_id === filters.church_id);
          if (filters.user_id) list = list.filter((r) => r.user_id === filters.user_id);
          if (filters.status) list = list.filter((r) => r.status === filters.status);
          result = isSingle || isMaybeSingle ? (list[0] || null) : list;
          return Promise.resolve({ data: result, count: list.length, error: null }).then(resolve, reject);
        } else if (table === 'user_shortcuts') {
          let list = [];
          if (typeof window !== 'undefined') {
            try {
              const raw = localStorage.getItem('shammah_supabase_user_shortcuts_db');
              list = raw ? JSON.parse(raw) : [];
            } catch {}
          }
          if (filters.user_id) list = list.filter((r) => r.user_id === filters.user_id);
          result = isSingle || isMaybeSingle ? (list[0] || null) : list;
          return Promise.resolve({ data: result, count: list.length, error: null }).then(resolve, reject);
        } else if (table === 'media_items') {
          let userItems = [];
          if (typeof window !== 'undefined') {
            try {
              const raw = localStorage.getItem('shammah_supabase_media_items_db');
              userItems = raw ? JSON.parse(raw) : [];
            } catch {}
          }
          let list = [...userItems, ...sampleMediaItems];
          if (filters.kind) list = list.filter((r) => r.kind === filters.kind);
          if (filters.category && filters.category !== 'All') list = list.filter((r) => r.category === filters.category);
          if (filters.id) list = list.filter((r) => r.id === filters.id);
          if (notEqualFilters.id) list = list.filter((r) => r.id !== notEqualFilters.id);
          if (filters.author_id) list = list.filter((r) => r.author_id === filters.author_id);
          if (filters.series_id) list = list.filter((r) => r.series_id === filters.series_id);
          if (filters.church_id) list = list.filter((r) => r.church_id === filters.church_id);

          const total = list.length;
          if (orderCol === 'view_count') {
            list.sort((a, b) => (orderAsc ? (a.view_count || 0) - (b.view_count || 0) : (b.view_count || 0) - (a.view_count || 0)));
          } else if (orderCol === 'like_count') {
            list.sort((a, b) => (orderAsc ? (a.like_count || 0) - (b.like_count || 0) : (b.like_count || 0) - (a.like_count || 0)));
          } else if (orderCol === 'duration_seconds') {
            list.sort((a, b) => (orderAsc ? (a.duration_seconds || 0) - (b.duration_seconds || 0) : (b.duration_seconds || 0) - (a.duration_seconds || 0)));
          }

          if (rangeFrom !== null && rangeTo !== null) {
            list = list.slice(rangeFrom, rangeTo + 1);
          } else if (limitVal !== null) {
            list = list.slice(0, limitVal);
          }

          result = isSingle || isMaybeSingle ? (list[0] || null) : list;
          return Promise.resolve({ data: result, count: total, error: null }).then(resolve, reject);
        } else if (table === 'media_series') {
          let list = [...sampleSeries];
          if (filters.kind) list = list.filter((s) => s.kind === filters.kind);
          if (filters.id) list = list.filter((s) => s.id === filters.id);
          if (limitVal !== null) list = list.slice(0, limitVal);
          result = isSingle || isMaybeSingle ? (list[0] || null) : list;
          return Promise.resolve({ data: result, count: list.length, error: null }).then(resolve, reject);
        } else if (table === 'watch_progress') {
          let userProgress = [];
          if (typeof window !== 'undefined') {
            try {
              const raw = localStorage.getItem('shammah_supabase_watch_progress_db');
              userProgress = raw ? JSON.parse(raw) : [];
            } catch {}
          }
          let list = [...userProgress, ...sampleWatchProgress];
          if (filters.user_id) list = list.filter((r) => r.user_id === filters.user_id);
          if (filters.item_id) list = list.filter((r) => r.item_id === filters.item_id);
          if (filters.completed !== undefined) list = list.filter((r) => r.completed === filters.completed);
          if (gtFilters.position_seconds !== undefined) {
            list = list.filter((r) => (r.position_seconds || 0) > gtFilters.position_seconds);
          }

          let allMedia = [...sampleMediaItems];
          if (typeof window !== 'undefined') {
            try {
              const raw = localStorage.getItem('shammah_supabase_media_items_db');
              if (raw) allMedia = [...JSON.parse(raw), ...allMedia];
            } catch {}
          }
          list = list.map((r) => ({
            ...r,
            media: r.media || allMedia.find((m) => m.id === r.item_id) || null,
          }));

          if (limitVal !== null) list = list.slice(0, limitVal);
          result = isSingle || isMaybeSingle ? (list[0] || null) : list;
          return Promise.resolve({ data: result, count: list.length, error: null }).then(resolve, reject);
        } else if (table === 'media_engagement') {
          let list = [];
          if (typeof window !== 'undefined') {
            try {
              const raw = localStorage.getItem('shammah_supabase_media_engagement_db');
              list = raw ? JSON.parse(raw) : [];
            } catch {}
          }
          if (filters.user_id) list = list.filter((r) => r.user_id === filters.user_id);
          if (filters.item_id) list = list.filter((r) => r.item_id === filters.item_id);
          result = isSingle || isMaybeSingle ? (list[0] || null) : list;
          return Promise.resolve({ data: result, error: null }).then(resolve, reject);
        } else if (table === 'comments') {
          let userComments = [];
          if (typeof window !== 'undefined') {
            try {
              const raw = localStorage.getItem('shammah_supabase_media_comments_db');
              userComments = raw ? JSON.parse(raw) : [];
            } catch {}
          }
          let list = [...userComments, ...sampleComments];
          if (filters.media_id) list = list.filter((c) => c.media_id === filters.media_id);
          if (filters.post_id) list = list.filter((c) => c.post_id === filters.post_id);
          result = isSingle || isMaybeSingle ? (list[0] || null) : list;
          return Promise.resolve({ data: result, count: list.length, error: null }).then(resolve, reject);
        } else if (table === 'reactions') {
          let list = [];
          if (typeof window !== 'undefined') {
            try {
              const raw = localStorage.getItem('shammah_supabase_reactions_db');
              list = raw ? JSON.parse(raw) : [];
            } catch {}
          }
          if (filters.target_id) list = list.filter((r) => r.target_id === filters.target_id);
          if (filters.user_id) list = list.filter((r) => r.user_id === filters.user_id);
          result = isSingle || isMaybeSingle ? (list[0] || null) : list;
          return Promise.resolve({ data: result, error: null }).then(resolve, reject);
        } else {
          result = isSingle || isMaybeSingle ? null : [];
        }
        return Promise.resolve({ data: result, error: null }).then(resolve, reject);
      },
    };
    return builder;
  };

  const storage = {
    from() {
      return {
        async upload(path) {
          return { data: { path }, error: null };
        },
        getPublicUrl() {
          return { data: { publicUrl: 'https://images.unsplash.com/photo-1548625361-195fe57876a3?w=600' } };
        },
        async remove() {
          return { data: {}, error: null };
        },
      };
    },
  };

  const rpc = async (fnName, args) => {
    if (fnName === 'category_counts') {
      return {
        data: [
          { category_id: 'announcements', total: 18 },
          { category_id: 'prayer', total: 42 },
          { category_id: 'sermons', total: 29 },
          { category_id: 'testimonies', total: 35 },
          { category_id: 'worship', total: 19 },
          { category_id: 'youth', total: 24 },
          { category_id: 'lessons', total: 15 },
          { category_id: 'missions', total: 11 },
        ],
        error: null,
      };
    }
    if (fnName === 'church_member_counts') {
      return {
        data: [
          { church_id: 'church-nwc', total: 420 },
          { church_id: 'church-grace', total: 285 },
          { church_id: 'church-glory', total: 310 },
        ],
        error: null,
      };
    }
    if (fnName === 'repost_counts') {
      const postIds = args?.p_post_ids || [];
      let list = [];
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('shammah_supabase_post_reposts_db');
          list = raw ? JSON.parse(raw) : [];
        } catch {}
      }
      const data = postIds.map((pid) => {
        const count = list.filter((r) => r.post_id === pid).length;
        return { post_id: pid, count };
      });
      return { data, error: null };
    }
    if (fnName === 'toggle_media_like') {
      let isLiked = true;
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('shammah_supabase_media_engagement_db');
          let list = raw ? JSON.parse(raw) : [];
          const idx = list.findIndex((r) => r.item_id === args?.p_item_id);
          if (idx >= 0) {
            list[idx].liked = !list[idx].liked;
            isLiked = list[idx].liked;
          } else {
            list.push({ item_id: args?.p_item_id, liked: true, saved: false });
            isLiked = true;
          }
          localStorage.setItem('shammah_supabase_media_engagement_db', JSON.stringify(list));
        } catch {}
      }
      return { data: { item_id: args?.p_item_id, liked: isLiked, like_count: isLiked ? 246 : 245 }, error: null };
    }
    if (fnName === 'toggle_media_save') {
      let isSaved = true;
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('shammah_supabase_media_engagement_db');
          let list = raw ? JSON.parse(raw) : [];
          const idx = list.findIndex((r) => r.item_id === args?.p_item_id);
          if (idx >= 0) {
            list[idx].saved = !list[idx].saved;
            isSaved = list[idx].saved;
          } else {
            list.push({ item_id: args?.p_item_id, liked: false, saved: true });
            isSaved = true;
          }
          localStorage.setItem('shammah_supabase_media_engagement_db', JSON.stringify(list));
        } catch {}
      }
      return { data: { item_id: args?.p_item_id, saved: isSaved, save_count: isSaved ? 74 : 73 }, error: null };
    }
    if (fnName === 'record_media_view') {
      return { data: { item_id: args?.p_item_id, view_counted: true, view_count: 2191 }, error: null };
    }
    if (fnName === 'search_media') {
      let allMedia = [...sampleMediaItems];
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('shammah_supabase_media_items_db');
          if (raw) allMedia = [...JSON.parse(raw), ...allMedia];
        } catch {}
      }
      const q = (args?.q || '').toLowerCase();
      const filtered = allMedia.filter((m) => {
        if (args?.p_kind && m.kind !== args.p_kind) return false;
        if (args?.p_category && m.category !== args.p_category) return false;
        if (!q) return true;
        return (
          m.title?.toLowerCase().includes(q) ||
          m.description?.toLowerCase().includes(q) ||
          (m.tags || []).some((t) => t.toLowerCase().includes(q))
        );
      });
      return { data: filtered, error: null };
    }
    if (fnName === 'trending_media') {
      let allMedia = [...sampleMediaItems];
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('shammah_supabase_media_items_db');
          if (raw) allMedia = [...JSON.parse(raw), ...allMedia];
        } catch {}
      }
      if (args?.p_kind) {
        allMedia = allMedia.filter((m) => m.kind === args.p_kind);
      }
      allMedia.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
      const limit = args?.p_limit || 12;
      return { data: allMedia.slice(0, limit), error: null };
    }
    if (fnName === 'for_you_reels' || fnName === 'following_reels') {
      let userReels = [];
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('shammah_supabase_posts_db');
          userReels = (raw ? JSON.parse(raw) : []).filter((p) => p.media_type === 'reel');
        } catch {}
      }
      const list = [...userReels, ...sampleReels];
      return { data: list, error: null };
    }
    if (fnName === 'toggle_reel_like') {
      return { data: { reel_id: args?.p_reel_id, liked: true, like_count: 313 }, error: null };
    }
    if (fnName === 'record_reel_view') {
      return { data: 1, error: null };
    }
    return { data: [], error: null };
  };

  return {
    auth,
    from: createQueryBuilder,
    storage,
    rpc,
  };
}

export const isSupabaseConfigured = isConfigured;

export const supabase = isConfigured
  ? createClient(rawUrl, rawAnonKey)
  : createMockSupabaseClient();

export default supabase;
