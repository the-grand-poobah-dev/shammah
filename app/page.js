'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

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
    <main style={{ maxWidth: 640, margin: '0 auto', padding: 16, fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
        <h1>Shammah</h1>
        {session ? <span>{session.user.email}</span> : <button onClick={signIn}>Sign in</button>}
      </header>

      {posts.length === 0 && <p>No posts yet — run the seed data step in the README, or post one from Supabase Table Editor to test.</p>}

      {posts.map((p) => (
        <article key={p.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 14, margin: '12px 0' }}>
          <div style={{ fontSize: 12, color: '#666' }}>
            {p.profiles?.display_name || 'Someone'} · {p.category_id}
          </div>
          <p>{p.text_content}</p>
          {p.media_url && p.media_type === 'image' && <img src={p.media_url} alt="" style={{ maxWidth: '100%', borderRadius: 6 }} />}
        </article>
      ))}
    </main>
  );
}
