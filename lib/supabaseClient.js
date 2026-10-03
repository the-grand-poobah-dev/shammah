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

  const createQueryBuilder = (table) => {
    let isSingle = false;
    let isMaybeSingle = false;
    const filters = {};

    const builder = {
      select() {
        return builder;
      },
      insert() {
        return {
          select() {
            return {
              single() {
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
          eq() {
            return builder;
          },
          select() {
            return builder;
          },
          single() {
            isSingle = true;
            return builder;
          },
          then(res, rej) {
            return Promise.resolve({ data: fields, error: null }).then(res, rej);
          },
        };
      },
      upsert(rows) {
        return {
          then(res, rej) {
            return Promise.resolve({ data: rows, error: null }).then(res, rej);
          },
        };
      },
      delete() {
        return builder;
      },
      eq(col, val) {
        filters[col] = val;
        return builder;
      },
      in() {
        return builder;
      },
      order() {
        return builder;
      },
      limit() {
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
          result = isSingle ? null : [];
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

  const rpc = async (fnName) => {
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
    return { data: [], error: null };
  };

  return {
    auth,
    from: createQueryBuilder,
    storage,
    rpc,
  };
}

export const supabase = isConfigured
  ? createClient(rawUrl, rawAnonKey)
  : createMockSupabaseClient();

