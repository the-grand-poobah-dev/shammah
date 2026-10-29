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
            }
          } catch {}
        }
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
          eq(col, val) {
            filters[col] = val;
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

export const isSupabaseConfigured = isConfigured;
export default supabase;
