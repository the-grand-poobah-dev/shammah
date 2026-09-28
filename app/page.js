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
  const [profile, setProfile] = useState(null);

  // Auth panel state
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('signin'); // signin | signup | forgot | oauth
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadProfile(data.session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) {
        loadProfile(s.user.id);
      } else {
        setProfile(null);
      }
    });

    loadPosts();

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('display_name, role, church_id')
      .eq('id', userId)
      .single();
    if (!error) setProfile(data);
  }

  async function loadPosts() {
    const { data, error } = await supabase
      .from('posts')
      .select('id, text_content, media_url, media_type, created_at, category_id, profiles(display_name)')
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error) setPosts(data);
  }

  function openAuth(mode) {
    setShowAuth(true);
    setAuthMode(mode);
    setMessage('');
  }

  // ---------- Auth helpers ----------

  async function handleEmailSignUp(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: name.trim() || undefined },
      },
    });
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage('Check your email for a confirmation link, then come back and sign in.');
    setAuthMode('signin');
  }

  async function handleEmailSignIn(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setShowAuth(false);
    setMessage('');
  }

  async function handleMagicLink(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        data: { display_name: name.trim() || undefined },
      },
    });
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage('Check your email for a magic link. You can close this panel.');
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/`,
    });
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage('Password reset email sent. Check your inbox.');
  }

  async function handleOAuth(provider) {
    setLoading(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) setMessage(error.message);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  const headerName = profile?.display_name || session?.user?.email || 'Member';

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
            <span>{headerName}</span>
            <button className="signout-btn" onClick={handleSignOut} title="Sign out">
              Sign out
            </button>
          </div>
        ) : (
          <div className="auth-header-actions">
            <button className="signin-btn" onClick={() => openAuth('signin')}>
              Sign in
            </button>
            <button className="signup-btn" onClick={() => openAuth('signup')}>
              Sign up
            </button>
          </div>
        )}
      </header>

      {/* ========== Auth Panel ========== */}
      {showAuth && (
        <div className="auth-overlay" onClick={() => setShowAuth(false)}>
          <div className="auth-panel" onClick={(e) => e.stopPropagation()}>
            <button className="auth-close" onClick={() => setShowAuth(false)} aria-label="Close">
              ×
            </button>

            <h2 className="auth-panel-title">
              {authMode === 'signup'
                ? 'Create your account'
                : authMode === 'forgot'
                  ? 'Reset password'
                  : authMode === 'oauth'
                    ? 'Continue with social'
                    : 'Welcome back'}
            </h2>

            <div className="auth-tabs">
              <button
                className={authMode === 'signin' || authMode === 'signup' || authMode === 'forgot' ? 'active' : ''}
                onClick={() => {
                  setAuthMode(authMode === 'signup' ? 'signup' : 'signin');
                  setMessage('');
                }}
              >
                Email
              </button>
              <button
                className={authMode === 'oauth' ? 'active' : ''}
                onClick={() => {
                  setAuthMode('oauth');
                  setMessage('');
                }}
              >
                Social
              </button>
            </div>

            {message && <p className="auth-message">{message}</p>}

            {/* ----- Email / Password ----- */}
            {(authMode === 'signin' || authMode === 'signup') && (
              <form onSubmit={authMode === 'signup' ? handleEmailSignUp : handleEmailSignIn}>
                {authMode === 'signup' && (
                  <label>
                    Your name
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Grace Wanjiku"
                      required
                    />
                  </label>
                )}
                <label>
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={6}
                    required
                  />
                </label>

                <button type="submit" className="auth-primary" disabled={loading}>
                  {loading ? 'Please wait…' : authMode === 'signup' ? 'Create account' : 'Sign in'}
                </button>

                <div className="auth-links">
                  {authMode === 'signin' ? (
                    <>
                      <button type="button" onClick={() => setAuthMode('signup')}>
                        Need an account? Sign up
                      </button>
                      <button type="button" onClick={() => setAuthMode('forgot')}>
                        Forgot password?
                      </button>
                      <button type="button" onClick={handleMagicLink}>
                        Send magic link instead
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => setAuthMode('signin')}>
                      Already have an account? Sign in
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* ----- Forgot password ----- */}
            {authMode === 'forgot' && (
              <form onSubmit={handleForgotPassword}>
                <p className="auth-hint">
                  Enter the email you used to sign up. We will send a reset link.
                </p>
                <label>
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </label>
                <button type="submit" className="auth-primary" disabled={loading}>
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
                <div className="auth-links">
                  <button type="button" onClick={() => setAuthMode('signin')}>
                    Back to sign in
                  </button>
                </div>
              </form>
            )}

            {/* ----- Social / OAuth ----- */}
            {authMode === 'oauth' && (
              <div className="auth-oauth">
                <p className="auth-hint">One click. We never see your password on these platforms.</p>
                <button
                  type="button"
                  className="auth-oauth-btn google"
                  onClick={() => handleOAuth('google')}
                  disabled={loading}
                >
                  Continue with Google
                </button>
                <button
                  type="button"
                  className="auth-oauth-btn facebook"
                  onClick={() => handleOAuth('facebook')}
                  disabled={loading}
                >
                  Continue with Facebook
                </button>
                {loading && <p className="auth-hint" style={{ marginTop: 12 }}>Redirecting…</p>}
              </div>
            )}
          </div>
        </div>
      )}

      <main className="feed">
        {posts.length === 0 && (
          <div className="empty-state">
            <h2>Nothing here yet</h2>
            <p>
              {session
                ? 'Run the seed data step in the README, or post one from the Supabase Table Editor to see it show up here.'
                : 'Sign in or create an account to join the church feed.'}
            </p>
            {!session && (
              <div className="empty-auth-actions">
                <button className="signin-btn" onClick={() => openAuth('signin')}>
                  Sign in
                </button>
                <button className="signup-btn" onClick={() => openAuth('signup')}>
                  Sign up
                </button>
              </div>
            )}
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
