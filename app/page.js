'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const CATEGORY_STYLES = {
  lessons: { label: 'Lessons & Icebreakers', accent: '#b8842a', soft: '#f4e9d6', text: '#8a611c' },
  stories: { label: 'Stories & Experiences', accent: '#1e6b66', soft: '#dceeec', text: '#175450' },
  podcasts: { label: 'Podcasts & Videos', accent: '#a94b46', soft: '#f3dfdd', text: '#833a36' },
  events: { label: 'Events', accent: '#b8842a', soft: '#f4e9d6', text: '#8a611c' },
  involved: { label: 'Get Involved', accent: '#1e6b66', soft: '#dceeec', text: '#175450' },
  resources: { label: 'Resources', accent: '#a94b46', soft: '#f3dfdd', text: '#833a36' },
  parent: { label: 'Parent Corner', accent: '#b8842a', soft: '#f4e9d6', text: '#8a611c' },
  worship: { label: 'Worship & Creative Arts', accent: '#1e6b66', soft: '#dceeec', text: '#175450' },
  teen: { label: 'Teen Talks', accent: '#a94b46', soft: '#f3dfdd', text: '#833a36' },
  kids: { label: "Kids' Corner", accent: '#b8842a', soft: '#f4e9d6', text: '#8a611c' },
  volunteer: { label: 'Volunteer Spotlight', accent: '#1e6b66', soft: '#dceeec', text: '#175450' },
  hacks: { label: 'Ministry Hacks', accent: '#a94b46', soft: '#f3dfdd', text: '#833a36' },
  prayer: { label: 'Prayer Requests & Praise Reports', accent: '#b8842a', soft: '#f4e9d6', text: '#8a611c' },
  seasonal: { label: 'Seasonal Specials', accent: '#1e6b66', soft: '#dceeec', text: '#175450' },
  faq: { label: 'FAQ for Parents/Volunteers', accent: '#a94b46', soft: '#f3dfdd', text: '#833a36' },
  field: { label: 'From the Mission Field', accent: '#b8842a', soft: '#f4e9d6', text: '#8a611c' },
};

function categoryStyle(categoryId) {
  return (
    CATEGORY_STYLES[categoryId] || {
      label: categoryId,
      accent: '#b8842a',
      soft: '#f4e9d6',
      text: '#8a611c',
    }
  );
}

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const chars = parts.length > 1 ? [parts[0][0], parts[1][0]] : [parts[0][0]];
  return chars.join('').toUpperCase();
}

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    loadPosts();
  }, []);

  async function loadPosts() {
    const { data, error } = await supabase
      .from('posts')
      .select('id, text_content, media_url, media_type, created_at, category_id, profiles(display_name)')
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error) setPosts(data);
  }

  async function signIn() {
    const email = prompt('Email for magic link sign-in:');
    if (!email) return;
    await supabase.auth.signInWithOtp({ email });
    alert('Check your email for a sign-in link.');
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <h1 className="brand-mark">Shammah</h1>
          <span className="brand-tag">church feed</span>
        </div>
        {session ? (
          <div className="user-chip">
            <span className="user-dot" />
            {session.user.email}
          </div>
        ) : (
          <button className="signin-btn" onClick={signIn}>
            Sign in
          </button>
        )}
      </header>

      <main className="feed">
        {posts.length === 0 && (
          <div className="empty-state">
            <h2>Nothing here yet</h2>
            <p>
              Run the seed data step in the README, or post one from the Supabase Table Editor
              to see it show up here.
            </p>
          </div>
        )}

        {posts.map((p) => {
          const cat = categoryStyle(p.category_id);
          const authorName = p.profiles?.display_name || 'Someone';
          return (
            <article
              key={p.id}
              className="post-card"
              style={{ '--accent': cat.accent, '--accent-soft': cat.soft, '--accent-text': cat.text }}
            >
              <div className="post-header">
                <div className="avatar">{initials(authorName)}</div>
                <div className="post-header-text">
                  <span className="post-author">{authorName}</span>
                  <span className="category-chip">{cat.label}</span>
                </div>
              </div>
              <p className="post-text">{p.text_content}</p>
              {p.media_url && p.media_type === 'image' && (
                <img className="post-media" src={p.media_url} alt="" />
              )}
            </article>
          );
        })}
      </main>
    </div>
  );
}
