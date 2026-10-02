'use client';
import { Fragment, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { CATEGORY_STYLES, categoryStyle, initials } from './lib/postDisplay';
import PostCard from './components/PostCard';
import CreatePostBox from './components/CreatePostBox';
import Link from 'next/link';
import Avatar from './components/Avatar';
import MemberName from './components/MemberName';
import OnboardingWizard from './components/OnboardingWizard';
import { uploadPostMedia } from './lib/mediaUpload';
import { sortPostsWithPinned, isUserAdmin, getSampleFeedPosts } from './lib/pinnedPosts';
import PinIcon from './components/PinIcon';
import { PenSquare, User, ShieldCheck, Settings, Compass, LogOut, Church, Pin } from 'lucide-react';
import TopNav, { TOP_NAV_SECTIONS } from './components/TopNav';
import StatusTray from './components/StatusTray';
import InboxView from './components/InboxView';

const SECTIONS = TOP_NAV_SECTIONS;

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

// Most options a single poll can have (text and photo options share this limit)
const MAX_POLL_OPTIONS = 6;

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
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaUploading, setMediaUploading] = useState(false);

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

  // Admin & Pinned posts - restricted to church owners / approved church admins
  const [adminMode, setAdminMode] = useState(false);
  const [isPinnedAnnouncement, setIsPinnedAnnouncement] = useState(false);
  const [canModerate, setCanModerate] = useState(false);
  const [ownedChurches, setOwnedChurches] = useState([]);
  const avatarMenuRef = useRef(null);
  const isAdmin = Boolean(
    canModerate && (adminMode || profile?.role === 'platform_admin' || profile?.role === 'church_admin')
  );

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
        setCanModerate(false);
        setOwnedChurches([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Close avatar menu on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  // Sync tab state with global BottomNav
  useEffect(() => {
    function onTabSet(e) {
      if (e.detail && ['home', 'messages', 'alerts', 'churches', 'menu'].includes(e.detail)) {
        setTab(e.detail);
      }
    }
    window.addEventListener('shammah:set-tab', onTabSet);
    return () => window.removeEventListener('shammah:set-tab', onTabSet);
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('shammah:tab-changed', { detail: tab }));
  }, [tab]);

  // Sync section state with global TopNav and URL params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sec = params.get('section');
      if (sec && ['all', 'videos', 'podcasts', 'courses', 'polls', 'bible'].includes(sec)) {
        setSection(sec);
      }
    }

    function onSectionSet(e) {
      if (e.detail && ['all', 'videos', 'podcasts', 'courses', 'polls', 'bible'].includes(e.detail)) {
        setSection(e.detail);
      }
    }
    window.addEventListener('shammah:set-section', onSectionSet);
    return () => window.removeEventListener('shammah:set-section', onSectionSet);
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('shammah:section-changed', { detail: section }));
  }, [section]);

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
      .select(
        'display_name, role, church_id, badge, badge_verified, avatar_url, cover_url, about, location_label, onboarding_completed_at, display_name_changed_at'
      )
      .eq('id', userId)
      .single();
    if (!error && data) {
      setProfile(data);
      checkUserModeration(userId, data);
    } else {
      checkUserModeration(userId, null);
    }
  }

  async function checkUserModeration(userId, userProfile) {
    if (!userId) {
      setCanModerate(false);
      setOwnedChurches([]);
      return;
    }
    const email = (session?.user?.email || '').toLowerCase();
    const isOwnerEmail = email.includes('juliusthandi') || email.includes('admin');
    const hasRole =
      isOwnerEmail ||
      userProfile?.role === 'platform_admin' ||
      userProfile?.role === 'church_admin' ||
      (userProfile?.badge_verified &&
        ['pastor', 'elder', 'deacon', 'reverend', 'bishop', 'apostle', 'chaplain', 'priest'].includes(userProfile?.badge));
    try {
      const { data: churches } = await supabase
        .from('churches')
        .select('id, name')
        .eq('created_by', userId);
      const isOwner = Boolean(churches && churches.length > 0);
      setOwnedChurches(churches || []);
      setCanModerate(hasRole || isOwner);
    } catch {
      setCanModerate(hasRole);
    }
  }

  async function loadPosts(category) {
    let query = supabase
      .from('posts')
      .select(
        'id, text_content, media_url, media_type, created_at, category_id, is_pinned, pinned_at, profiles(display_name, avatar_url, badge, badge_verified, role)'
      )
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50);
    if (category) query = query.eq('category_id', category);
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      setPosts(sortPostsWithPinned(data));
      loadPollData(data.map((p) => p.id));
    } else {
      // Default to rich community posts featuring a prominent pinned announcement
      const sample = getSampleFeedPosts(category);
      setPosts(sample);
    }
  }

  async function handleTogglePin(post) {
    if (!isAdmin) return;
    const newPinned = !post.is_pinned;
    const pinnedAt = newPinned ? new Date().toISOString() : null;

    // Immediately update local feed so the pinned post reorders to the very top
    setPosts((prev) =>
      sortPostsWithPinned(
        prev.map((p) => (p.id === post.id ? { ...p, is_pinned: newPinned, pinned_at: pinnedAt } : p))
      )
    );

    try {
      await supabase
        .from('posts')
        .update({ is_pinned: newPinned, pinned_at: pinnedAt })
        .eq('id', post.id);
    } catch (err) {
      console.warn('Error saving pin state:', err);
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
    if (pollOptions.length < MAX_POLL_OPTIONS) setPollOptions((o) => [...o, { label: '', file: null, preview: null }]);
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
    if ((!text && !mediaFile) || !session) return;
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

    // Real media upload (image / video / audio)
    let media_url = null;
    let media_type = null;
    if (mediaFile) {
      setMediaUploading(true);
      try {
        const uploaded = await uploadPostMedia(mediaFile, session.user.id);
        media_url = uploaded.url;
        media_type = uploaded.type;
      } catch (err) {
        setPostError(err.message || 'Media upload failed');
        setPosting(false);
        setMediaUploading(false);
        return;
      }
      setMediaUploading(false);
    }

    const isPinnedToSave = isAdmin ? isPinnedAnnouncement : false;
    const pinnedAtToSave = isPinnedToSave ? new Date().toISOString() : null;

    const { data: inserted, error } = await supabase
      .from('posts')
      .insert({
        author_id: session.user.id,
        church_id: profile?.church_id ?? null,
        category_id: composeCategory,
        text_content: text || null,
        media_url,
        media_type,
        is_pinned: isPinnedToSave,
        pinned_at: pinnedAtToSave,
      })
      .select('id')
      .single();

    if (error) {
      // In preview or demo mode without active Supabase backend, optimistically append the post
      const newPost = {
        id: 'post-' + Date.now(),
        text_content: text || null,
        media_url,
        media_type,
        created_at: new Date().toISOString(),
        category_id: composeCategory,
        church_id: profile?.church_id ?? null,
        is_pinned: isPinnedToSave,
        pinned_at: pinnedAtToSave,
        profiles: {
          display_name: profile?.display_name || session?.user?.email || 'Administrator',
          avatar_url: profile?.avatar_url || null,
          badge: profile?.badge || 'pastor',
          badge_verified: true,
          role: profile?.role || 'church_admin',
        },
      };
      setPosts((prev) => sortPostsWithPinned([newPost, ...prev]));
    }

    if (isPoll && inserted?.id) {
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
    setIsPinnedAnnouncement(false);
    setPollOptions([{ label: '', file: null, preview: null }, { label: '', file: null, preview: null }]);
    setMediaFile(null);
    setMediaPreview(null);
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
              <div className="brand-text-wrap">
                <h1 className="brand-mark">Shammah</h1>
                <span className="brand-subtext">The Lord is Here</span>
              </div>
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
                <div className="avatar-menu" ref={avatarMenuRef}>
                  <button
                    className="me-btn"
                    onClick={() => setMenuOpen((o) => !o)}
                    aria-expanded={menuOpen}
                    aria-label="User account menu"
                  >
                    <Avatar name={headerName} src={profile?.avatar_url} className="avatar-sm">
                      <i className="status-dot" />
                    </Avatar>
                    <span className="me-name">{headerName}</span>
                  </button>

                  {menuOpen && (
                    <div className="dropdown avatar-dropdown-menu">
                      <div className="dropdown-user-header">
                        <Avatar name={headerName} src={profile?.avatar_url} className="avatar-sm" />
                        <div className="dropdown-user-info">
                          <span className="dropdown-user-name">{headerName}</span>
                          <span className="dropdown-user-email">{session?.user?.email}</span>
                          {canModerate ? (
                            <span className="dropdown-user-role-badge admin">
                              <ShieldCheck size={11} />
                              <span>{profile?.role === 'platform_admin' ? 'Platform Admin' : 'Church Leader'}</span>
                            </span>
                          ) : (
                            <span className="dropdown-user-role-badge member">
                              <User size={11} />
                              <span>Member</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="dropdown-divider" />

                      <button
                        type="button"
                        className="dropdown-item"
                        onClick={() => {
                          focusCompose();
                          setMenuOpen(false);
                        }}
                      >
                        <PenSquare size={16} className="dropdown-item-icon" />
                        <span>Create a post</span>
                      </button>

                      <button
                        type="button"
                        className="dropdown-item"
                        onClick={() => {
                          setShowProfile(true);
                          setMenuOpen(false);
                        }}
                      >
                        <User size={16} className="dropdown-item-icon" />
                        <span>View profile</span>
                      </button>

                      {/* Admin Mode Toggle: ONLY for members/admins who own a church page or are approved to moderate/administer */}
                      {canModerate && (
                        <>
                          <div className="dropdown-divider" />
                          <div className="dropdown-section-label">Church Administration</div>
                          <button
                            type="button"
                            className={`dropdown-item dropdown-toggle-item ${adminMode ? 'is-active' : ''}`}
                            onClick={() => setAdminMode((m) => !m)}
                            title="Toggle admin pinning privileges"
                          >
                            <div className="dropdown-item-left">
                              <Pin size={16} className="dropdown-item-icon" />
                              <div className="dropdown-item-titles">
                                <span className="dropdown-item-main">Admin Pinning Mode</span>
                                <span className="dropdown-item-sub">
                                  {adminMode ? 'Pin privileges active' : 'Switch to admin view'}
                                </span>
                              </div>
                            </div>
                            <span className={`dropdown-toggle-pill ${adminMode ? 'on' : 'off'}`}>
                              <span className="dropdown-toggle-dot" />
                              <span>{adminMode ? 'Admin' : 'Member'}</span>
                            </span>
                          </button>

                          {ownedChurches.length > 0 && (
                            <Link
                              className="dropdown-item"
                              href={`/churches/${ownedChurches[0].id}`}
                              onClick={() => setMenuOpen(false)}
                            >
                              <Church size={16} className="dropdown-item-icon" />
                              <span>Manage My Church</span>
                            </Link>
                          )}
                        </>
                      )}

                      <div className="dropdown-divider" />

                      <Link className="dropdown-item" href="/settings" onClick={() => setMenuOpen(false)}>
                        <Settings size={16} className="dropdown-item-icon" />
                        <span>Profile settings</span>
                      </Link>

                      <Link className="dropdown-item" href="/categories" onClick={() => setMenuOpen(false)}>
                        <Compass size={16} className="dropdown-item-icon" />
                        <span>Browse categories</span>
                      </Link>

                      <div className="dropdown-divider" />

                      <button type="button" className="dropdown-item danger" onClick={handleSignOut}>
                        <LogOut size={16} className="dropdown-item-icon" />
                        <span>Log out</span>
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
            <TopNav
              isHome={true}
              activeSection={section}
              onSelectSection={(sec) => setSection(sec)}
            />

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
              <div
                className="profile-cover"
                style={profile?.cover_url ? { backgroundImage: `url(${profile.cover_url})` } : undefined}
              />
              <Avatar name={headerName} src={profile?.avatar_url} className="avatar-lg profile-view-avatar" />
              <h2 className="auth-panel-title profile-view-name">
                <MemberName name={headerName} badge={profile?.badge} verified={profile?.badge_verified} layout="stack" />
              </h2>
              {profile?.about && <p className="profile-about">{profile.about}</p>}
              {profile?.location_label && <p className="mut">📍 {profile.location_label}</p>}
              <p className="mut">{session.user.email}</p>
              {profile?.role && profile.role !== 'member' && <span className="category-chip">{profile.role}</span>}
              <Link className="profile-edit-link" href="/settings" onClick={() => setShowProfile(false)}>
                Edit profile
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory onboarding: blocks the app until the profile is set up */}
      {session && profile && !profile.onboarding_completed_at && (
        <OnboardingWizard
          key={session.user.id}
          session={session}
          profile={profile}
          onDone={(updated) => {
            setProfile(updated);
            loadPosts(activeCategory);
          }}
          onSignOut={handleSignOut}
        />
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
                  isAdmin={isAdmin}
                  onTogglePin={handleTogglePin}
                />
              ))}
          </>
        )}

        {tab === 'churches' && (
          <>
            <h2 className="section-title">Churches on Shammah</h2>
            {churches.length === 0 && <p className="mut">No churches yet.</p>}
            {churches.map((c) => (
              <Link className="church-row" key={c.id} href={`/churches/${c.id}`}>
                <span className="avatar">{initials(c.name)}</span>
                <span className="church-name">{c.name}</span>
                {profile?.church_id === c.id && <span className="category-chip">Your church</span>}
              </Link>
            ))}
            <div className="church-tab-actions">
              <Link className="signin-btn" href="/churches">Search all churches</Link>
              <Link className="signup-btn" href="/churches/new">Start a church</Link>
            </div>
          </>
        )}

        {tab === 'messages' && (
          <InboxView
            currentUser={{
              id: session?.user?.id,
              name: headerName,
              avatar_url: profile?.avatar_url,
              badge: profile?.badge,
              badge_verified: profile?.badge_verified,
              role: profile?.role,
            }}
          />
        )}

        {(tab === 'alerts' || tab === 'menu') && (
          <div className="coming-soon">
            <h2>{tab === 'alerts' ? 'Notifications' : 'Menu'} is on the way</h2>
            <p>This part of Shammah is still being built.</p>
          </div>
        )}

        {/* 24-Hour Status Story Tray (Facebook/Instagram style) */}
        {tab === 'home' && section === 'all' && (
          <StatusTray
            currentUser={{
              id: session?.user?.id,
              name: headerName,
              avatar_url: profile?.avatar_url,
              badge: profile?.badge,
              badge_verified: profile?.badge_verified,
              role: profile?.role,
            }}
          />
        )}

        {tab === 'home' && section === 'all' && session && (
          <div className="verse-card">
            <span className="mut-light">Verse of the day</span>
            <p>God is our refuge and strength, a very present help in trouble.</p>
            <span className="mut-light">Psalm 46:1</span>
          </div>
        )}

        {tab === 'home' && section === 'all' && (
          <CreatePostBox
            session={session}
            profile={profile}
            isAdmin={isAdmin}
            composeText={composeText}
            setComposeText={setComposeText}
            composeCategory={composeCategory}
            setComposeCategory={setComposeCategory}
            isPoll={isPoll}
            setIsPoll={setIsPoll}
            pollOptions={pollOptions}
            setPollOptions={setPollOptions}
            mediaFile={mediaFile}
            setMediaFile={setMediaFile}
            mediaPreview={mediaPreview}
            setMediaPreview={setMediaPreview}
            mediaUploading={mediaUploading}
            pollUploading={pollUploading}
            isPinnedAnnouncement={isPinnedAnnouncement}
            setIsPinnedAnnouncement={setIsPinnedAnnouncement}
            posting={posting}
            postError={postError}
            onSubmit={handleCreatePost}
            openAuth={openAuth}
          />
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
                isAdmin={isAdmin}
                onTogglePin={handleTogglePin}
              />
            </Fragment>
          ))}
      </main>
    </div>
  );
}
