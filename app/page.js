'use client';
import { Fragment, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { CATEGORY_STYLES, categoryStyle, initials } from './lib/postDisplay';
import PostCard from './components/PostCard';

const SECTIONS = [
  { id: 'all', label: 'All' },
  { id: 'videos', label: 'Videos' },
  { id: 'podcasts', label: 'Podcasts' },
  { id: 'courses', label: 'Courses' },
  { id: 'polls', label: 'Polls' },
  { id: 'bible', label: 'Bible' },
];

const ICONS = {
  home: (
    <svg viewBox="0 0 24 24" className="icon"><path d="M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" /></svg>
  ),
  messages: (
    <svg viewBox="0 0 24 24" className="icon"><path d="M21 12a8 8 0 01-11.5 7.2L4 20l1-4.5A8 8 0 1121 12z" /></svg>
  ),
  alerts: (
    <svg viewBox="0 0 24 24" className="icon"><path d="M6 9a6 6 0 1112 0c0 6 2 7 2 7H4s2-1 2-7zm4 10a2 2 0 004 0" /></svg>
  ),
  churches: (
    <svg viewBox="0 0 24 24" className="icon"><path d="M12 2v5m-2-2.5h4M5 22V12l7-5 7 5v10zm5 0v-5h4v5" /></svg>
  ),
  menu: (
    <svg viewBox="0 0 24 24" className="icon"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
  ),
};

const TABS = [
  { id: 'home', label: 'Home', icon: ICONS.home },
  { id: 'messages', label: 'Messages', icon: ICONS.messages },
  { id: 'alerts', label: 'Alerts', icon: ICONS.alerts },
  { id: 'churches', label: 'Churches', icon: ICONS.churches },
  { id: 'menu', label: 'Menu', icon: ICONS.menu },
];

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);

  // Category filter + compose state
  const [activeCategory, setActiveCategory] = useState(null); // null = all
  const [composeText, setComposeText] = useState('');
  const [composeCategory, setComposeCategory] = useState('prayer');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');

  // Auth panel state
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('signin'); // signin | signup | forgot | oauth
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // App shell: bottom tab, content-type pill, theme, search, avatar menu
  const [tab, setTab] = useState('home'); // home | messages | alerts | churches | menu
  const [section, setSection] = useState('all'); // all | videos | podcasts | courses | polls | bible
  const [dark, setDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [churches, setChurches] = useState([]);
  // Category ticker: gently auto-scrolls to hint there's more to see,
  // and stops the moment the person interacts or a few seconds after login.
  const categoryBarRef = useRef(null);
  const [tickerOn, setTickerOn] = useState(true);

  // Polls
  const [isPoll, setIsPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState([{ label: '', file: null, preview: null }, { label: '', file: null, preview: null }]);
  const [pollUploading, setPollUploading] = useState(false);
  const [pollOptionsByPost, setPollOptionsByPost] = useState({}); // post_id -> [{id,label}]
  const [pollCountsByPost, setPollCountsByPost] = useState({}); // post_id -> {option_id: count}
  const [myVoteByPost, setMyVoteByPost] = useState({}); // post_id -> option_id

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

    return () => subscription.unsubscribe();
  }, []);

  // Remember the person's light/dark choice on this device
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('shammah-theme') : null;
    if (saved === 'dark') setDark(true);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    if (typeof window !== 'undefined') localStorage.setItem('shammah-theme', dark ? 'dark' : 'light');
  }, [dark]);

  // Ticker auto-scrolls the category bar a little at a time; stops on its
  // own a few seconds after sign-in, or immediately if the person touches
  // or taps it themselves.
  useEffect(() => {
    if (!tickerOn) return;
    const el = categoryBarRef.current;
    if (!el || el.scrollWidth <= el.clientWidth + 1) return;
    const id = setInterval(() => {
      if (!el) return;
      el.scrollLeft += 1.5;
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 1) {
        el.scrollLeft = 0;
      }
    }, 40);
    return () => clearInterval(id);
  }, [tickerOn]);

  useEffect(() => {
    if (!session) return;
    const t = setTimeout(() => setTickerOn(false), 5000);
    return () => clearTimeout(t);
  }, [session?.user?.id]);

  function stopTicker() {
    setTickerOn(false);
  }

  // Custom drag-to-scroll for the category bar — handles mouse and touch
  // identically via Pointer Events, so it never depends on (or fights)
  // the browser's own native touch-scroll behavior.
  const dragRef = useRef({ active: false, startX: 0, startScroll: 0, moved: false });

  function categoryPointerDown(e) {
    stopTicker();
    const el = categoryBarRef.current;
    if (!el) return;
    // Don't capture the pointer yet: capturing on press redirects the
    // follow-up click to the bar itself, so chips would never get tapped.
    dragRef.current = { active: true, startX: e.clientX, startScroll: el.scrollLeft, moved: false };
  }

  function categoryPointerMove(e) {
    const d = dragRef.current;
    if (!d.active) return;
    const el = categoryBarRef.current;
    if (!el) return;
    const dx = e.clientX - d.startX;
    if (!d.moved && Math.abs(dx) > 4) {
      d.moved = true;
      // Now it's a real drag, so it's safe to capture the pointer; this keeps
      // the drag smooth even if the finger/mouse leaves the bar.
      el.setPointerCapture?.(e.pointerId);
    }
    if (d.moved) el.scrollLeft = d.startScroll - dx;
  }

  function categoryPointerUp() {
    dragRef.current.active = false;
  }

  // A chip's click should only select the category if this gesture was a
  // tap, not the release of a drag.
  function categoryChipClick(fn) {
    return () => {
      if (dragRef.current.moved) {
        dragRef.current.moved = false;
        return;
      }
      stopTicker();
      fn();
    };
  }

  // Churches list is real data — load it once we know who's signed in
  useEffect(() => {
    if (tab === 'churches' && session) loadChurches();
  }, [tab, session?.user?.id]);

  // Reload the feed when the category changes or when someone signs in/out
  // (posts are only readable by signed-in users, so the feed must refetch after login)
  useEffect(() => {
    loadPosts(activeCategory);
  }, [activeCategory, session?.user?.id]);

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('display_name, role, church_id')
      .eq('id', userId)
      .single();
    if (!error) setProfile(data);
  }

  async function loadPosts(category) {
    let query = supabase
      .from('posts')
      .select('id, text_content, media_url, media_type, created_at, category_id, profiles(display_name)')
      .order('created_at', { ascending: false })
      .limit(50);
    if (category) query = query.eq('category_id', category);
    const { data, error } = await query;
    if (!error) {
      setPosts(data);
      loadPollData(data.map((p) => p.id));
    }
  }

  async function loadPollData(postIds) {
    if (postIds.length === 0) return;
    const { data: options } = await supabase
      .from('poll_options')
      .select('id, post_id, label, image_url, position')
      .in('post_id', postIds)
      .order('position');
    if (options && options.length) {
      const byPost = {};
      options.forEach((o) => {
        (byPost[o.post_id] ||= []).push(o);
      });
      setPollOptionsByPost(byPost);

      const pollPostIds = Object.keys(byPost);
      const { data: results } = await supabase.rpc('poll_results', { p_post_ids: pollPostIds });
      const counts = {};
      (results || []).forEach((r) => {
        (counts[r.post_id] ||= {})[r.option_id] = r.votes;
      });
      setPollCountsByPost(counts);

      if (session) {
        const { data: mine } = await supabase
          .from('poll_votes')
          .select('post_id, option_id')
          .eq('voter_id', session.user.id)
          .in('post_id', pollPostIds);
        const myVotes = {};
        (mine || []).forEach((v) => {
          myVotes[v.post_id] = v.option_id;
        });
        setMyVoteByPost(myVotes);
      }
    } else {
      setPollOptionsByPost({});
      setPollCountsByPost({});
      setMyVoteByPost({});
    }
  }

  async function handleVote(postId, optionId) {
    if (!session) return;
    const { error } = await supabase
      .from('poll_votes')
      .upsert(
        { post_id: postId, option_id: optionId, voter_id: session.user.id },
        { onConflict: 'post_id,voter_id' }
      );
    if (error) return;
    setMyVoteByPost((v) => ({ ...v, [postId]: optionId }));
    const { data: results } = await supabase.rpc('poll_results', { p_post_ids: [postId] });
    const counts = {};
    (results || []).forEach((r) => {
      counts[r.option_id] = r.votes;
    });
    setPollCountsByPost((c) => ({ ...c, [postId]: counts }));
  }

  function addPollOption() {
    if (pollOptions.length < 4) setPollOptions((o) => [...o, { label: '', file: null, preview: null }]);
  }

  function removePollOption(i) {
    if (pollOptions.length > 2) setPollOptions((o) => o.filter((_, idx) => idx !== i));
  }

  function updatePollOptionLabel(i, value) {
    setPollOptions((o) => o.map((opt, idx) => (idx === i ? { ...opt, label: value } : opt)));
  }

  function updatePollOptionImage(i, file) {
    setPollOptions((o) =>
      o.map((opt, idx) => (idx === i ? { ...opt, file, preview: file ? URL.createObjectURL(file) : null } : opt))
    );
  }

  async function loadChurches() {
    const { data, error } = await supabase.from('churches').select('id, name').order('name');
    if (!error) setChurches(data);
  }

  function focusCompose() {
    setMenuOpen(false);
    setTab('home');
    setSection('all');
    setTimeout(() => document.getElementById('compose-box')?.focus(), 50);
  }

  async function handleCreatePost(e) {
    e.preventDefault();
    const text = composeText.trim();
    if (!text || !session) return;
    const cleanOptions = pollOptions.filter((o) => o.label.trim() || o.file);
    if (isPoll && cleanOptions.length < 2) {
      setPostError('A poll needs at least 2 options.');
      return;
    }
    setPosting(true);
    setPostError('');

    let optionsToInsert = [];
    if (isPoll) {
      setPollUploading(true);
      try {
        optionsToInsert = await Promise.all(
          cleanOptions.map(async (opt, position) => {
            let image_url = null;
            if (opt.file) {
              const path = `${session.user.id}/${Date.now()}-${position}-${opt.file.name.replace(/\s+/g, '_')}`;
              const { error: upErr } = await supabase.storage.from('poll-images').upload(path, opt.file);
              if (upErr) throw upErr;
              image_url = supabase.storage.from('poll-images').getPublicUrl(path).data.publicUrl;
            }
            return { label: opt.label.trim(), image_url, position };
          })
        );
      } catch (upErr) {
        setPosting(false);
        setPollUploading(false);
        setPostError('One of the poll images failed to upload: ' + upErr.message);
        return;
      }
      setPollUploading(false);
    }
    const { data: inserted, error } = await supabase
      .from('posts')
      .insert({
        author_id: session.user.id,
        church_id: profile?.church_id ?? null,
        category_id: composeCategory,
        text_content: text,
      })
      .select('id')
      .single();
    if (error) {
      setPosting(false);
      setPostError(error.message);
      return;
    }
    if (isPoll) {
      const { error: optError } = await supabase
        .from('poll_options')
        .insert(optionsToInsert.map((o) => ({ ...o, post_id: inserted.id })));
      if (optError) {
        setPosting(false);
        setPostError('Post created, but the poll options failed to save: ' + optError.message);
        return;
      }
    }
    setPosting(false);
    setComposeText('');
    setIsPoll(false);
    setPollOptions([{ label: '', file: null, preview: null }, { label: '', file: null, preview: null }]);
    // Show the new post: if a different category is filtered, jump to the one just posted in
    if (activeCategory && activeCategory !== composeCategory) {
      setActiveCategory(composeCategory);
    } else {
      loadPosts(activeCategory);
    }
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
  const visiblePosts = searchTerm.trim()
    ? posts.filter((p) => (p.text_content || '').toLowerCase().includes(searchTerm.trim().toLowerCase()))
    : posts;

  return (
    <div className="shell">
      <div className="sticky-header">
        <header className="topbar">
          {session && !searchOpen && (
            <button className="icon-btn" aria-label="Search" onClick={() => setSearchOpen(true)}>
              <svg viewBox="0 0 24 24" className="icon"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
            </button>
          )}

          {searchOpen ? (
            <div className="search-row">
              <input
                autoFocus
                className="search-input"
                placeholder="Search posts…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button
                className="icon-btn"
                aria-label="Close search"
                onClick={() => {
                  setSearchOpen(false);
                  setSearchTerm('');
                }}
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="brand">
              <h1 className="brand-mark">Shammah</h1>
              <span className="brand-tag">church feed</span>
            </div>
          )}

          {!searchOpen && (
            <div className="topbar-right">
              <button
                className="theme-switch"
                role="switch"
                aria-checked={dark}
                aria-label="Toggle dark mode"
                onClick={() => setDark((d) => !d)}
              />

              {session ? (
                <div className="avatar-menu">
                  <button className="me-btn" onClick={() => setMenuOpen((o) => !o)}>
                    <span className="avatar avatar-sm">
                      {initials(headerName)}
                      <i className="status-dot" />
                    </span>
                    <span className="me-name">{headerName}</span>
                  </button>
                  {menuOpen && (
                    <div className="dropdown" onMouseLeave={() => setMenuOpen(false)}>
                      <button className="dropdown-item" onClick={focusCompose}>
                        Create a post
                      </button>
                      <button
                        className="dropdown-item"
                        onClick={() => {
                          setShowProfile(true);
                          setMenuOpen(false);
                        }}
                      >
                        View profile
                      </button>
                      <button className="dropdown-item danger" onClick={handleSignOut}>
                        Log out
                      </button>
                    </div>
                  )}
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
            </div>
          )}
        </header>

        {tab === 'home' && (
          <div className="header-secondary">
            <nav className="section-menu" aria-label="Browse by type">
              <div className="section-menu-inner">
                {SECTIONS.map((s) => (
                  <button
                    key={s.id}
                    className={`section-item${section === s.id ? ' active' : ''}`}
                    onClick={() => setSection(s.id)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </nav>

            {section === 'all' && (
              <nav
                className="category-bar"
                aria-label="Browse by category"
                ref={categoryBarRef}
                onPointerDown={categoryPointerDown}
                onPointerMove={categoryPointerMove}
                onPointerUp={categoryPointerUp}
                onPointerCancel={categoryPointerUp}
                onWheel={stopTicker}
              >
                <button
                  className={`filter-chip${activeCategory === null ? ' active' : ''}`}
                  onClick={categoryChipClick(() => setActiveCategory(null))}
                >
                  All
                </button>
                {Object.entries(CATEGORY_STYLES).map(([id, c]) => (
                  <button
                    key={id}
                    className={`filter-chip${activeCategory === id ? ' active' : ''}`}
                    style={{ '--accent': c.accent, '--accent-soft': c.soft, '--accent-text': c.text }}
                    onClick={categoryChipClick(() => setActiveCategory(id))}
                  >
                    {c.label}
                  </button>
                ))}
              </nav>
            )}
          </div>
        )}
      </div>

      {showProfile && session && (
        <div className="auth-overlay" onClick={() => setShowProfile(false)}>
          <div className="auth-panel" onClick={(e) => e.stopPropagation()}>
            <button className="auth-close" onClick={() => setShowProfile(false)} aria-label="Close">
              ×
            </button>
            <div className="profile-view">
              <span className="avatar avatar-lg">{initials(headerName)}</span>
              <h2 className="auth-panel-title">{headerName}</h2>
              <p className="mut">{session.user.email}</p>
              {profile?.role && <span className="category-chip">{profile.role}</span>}
            </div>
          </div>
        </div>
      )}

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
        {tab === 'home' && section !== 'all' && section !== 'polls' && (
          <div className="coming-soon">
            <h2>{SECTIONS.find((s) => s.id === section)?.label} is on the way</h2>
            <p>This part of Shammah is still being built. Real {section} content will show up here.</p>
          </div>
        )}

        {tab === 'home' && section === 'polls' && (
          <>
            {Object.keys(pollOptionsByPost).length === 0 && (
              <div className="empty-state">
                <h2>No polls yet</h2>
                <p>Switch to "All" and check "Make this a poll" when you post to start one.</p>
              </div>
            )}
            {posts
              .filter((p) => pollOptionsByPost[p.id])
              .map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  session={session}
                  openAuth={openAuth}
                  pollOptions={pollOptionsByPost[p.id]}
                  pollCounts={pollCountsByPost[p.id] || {}}
                  myVote={myVoteByPost[p.id]}
                  onVote={(optionId) => handleVote(p.id, optionId)}
                />
              ))}
          </>
        )}

        {tab === 'churches' && (
          <>
            <h2 className="section-title">Churches on Shammah</h2>
            {churches.length === 0 && <p className="mut">No churches yet.</p>}
            {churches.map((c) => (
              <div className="church-row" key={c.id}>
                <span className="avatar">{initials(c.name)}</span>
                <span className="church-name">{c.name}</span>
                {profile?.church_id === c.id && <span className="category-chip">Your church</span>}
              </div>
            ))}
          </>
        )}

        {(tab === 'messages' || tab === 'alerts' || tab === 'menu') && (
          <div className="coming-soon">
            <h2>{tab === 'messages' ? 'Messages' : tab === 'alerts' ? 'Notifications' : 'Menu'} is on the way</h2>
            <p>This part of Shammah is still being built.</p>
          </div>
        )}

        {tab === 'home' && section === 'all' && session && (
          <div className="verse-card">
            <span className="mut-light">Verse of the day</span>
            <p>God is our refuge and strength, a very present help in trouble.</p>
            <span className="mut-light">Psalm 46:1</span>
          </div>
        )}

        {tab === 'home' && section === 'all' && (
          <form className="compose" onSubmit={handleCreatePost}>
            <textarea
              id="compose-box"
              value={composeText}
              onChange={(e) => setComposeText(e.target.value)}
              placeholder={isPoll ? 'Ask your question…' : 'Share something with your church family…'}
              rows={3}
              maxLength={2000}
              required
            />

            <label className="poll-toggle">
              <input
                type="checkbox"
                checked={isPoll}
                onChange={(e) => setIsPoll(e.target.checked)}
              />
              Make this a poll
            </label>

            {isPoll && (
              <div className="poll-editor">
                {pollOptions.map((opt, i) => (
                  <div className="poll-editor-row" key={i}>
                    <label className="poll-image-pick">
                      {opt.preview ? (
                        <img src={opt.preview} alt="" />
                      ) : (
                        <span>+ Photo</span>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => updatePollOptionImage(i, e.target.files?.[0] || null)}
                        hidden
                      />
                    </label>
                    <input
                      type="text"
                      value={opt.label}
                      onChange={(e) => updatePollOptionLabel(i, e.target.value)}
                      placeholder={`Option ${i + 1} (caption, optional if you add a photo)`}
                      maxLength={80}
                    />
                    {pollOptions.length > 2 && (
                      <button type="button" onClick={() => removePollOption(i)} aria-label="Remove option">
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {pollOptions.length < 4 && (
                  <button type="button" className="poll-add-option" onClick={addPollOption}>
                    + Add option
                  </button>
                )}
                <p className="poll-hint">
                  Up to 4 options, each with an optional photo. Votes are anonymous — no one, including you as
                  the poster, sees who picked what.
                </p>
              </div>
            )}

            <div className="compose-row">
              <select
                value={composeCategory}
                onChange={(e) => setComposeCategory(e.target.value)}
                aria-label="Category"
              >
                {Object.entries(CATEGORY_STYLES).map(([id, c]) => (
                  <option key={id} value={id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="auth-primary compose-btn"
                disabled={
                  posting ||
                  pollUploading ||
                  !composeText.trim() ||
                  (isPoll && pollOptions.filter((o) => o.label.trim() || o.file).length < 2)
                }
              >
                {pollUploading ? 'Uploading…' : posting ? 'Posting…' : 'Post'}
              </button>
            </div>
            {postError && <p className="auth-message">{postError}</p>}
          </form>
        )}

        {tab === 'home' && section === 'all' && visiblePosts.length === 0 && (
          <div className="empty-state">
            <h2>Nothing here yet</h2>
            <p>
              {!session
                ? 'Sign in or create an account to join the church feed.'
                : searchTerm
                  ? `No posts match "${searchTerm}".`
                  : activeCategory
                    ? `No posts in ${categoryStyle(activeCategory).label} yet. Be the first to share one.`
                    : 'Be the first to share something with your church family.'}
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

        {tab === 'home' &&
          section === 'all' &&
          visiblePosts.map((p, i) => (
            <Fragment key={p.id}>
              {i === 3 && !searchTerm && (
                <div className="follow-card">
                  <span className="mut-light">People to follow</span>
                  <p className="mut">Following is coming soon — for now, browse posts by category above.</p>
                </div>
              )}
              <PostCard
                post={p}
                session={session}
                openAuth={openAuth}
                pollOptions={pollOptionsByPost[p.id]}
                pollCounts={pollCountsByPost[p.id] || {}}
                myVote={myVoteByPost[p.id]}
                onVote={(optionId) => handleVote(p.id, optionId)}
              />
            </Fragment>
          ))}
      </main>

      <nav className="bottom-nav" aria-label="Main">
        <div className="bottom-nav-pill">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab-btn${tab === t.id ? ' active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
