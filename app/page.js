'use client';
import { Fragment, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { CATEGORY_STYLES, categoryStyle, initials } from './lib/postDisplay';
import PostCard from './components/PostCard';
import CreatePostBox from './components/CreatePostBox';
import CreatePostModal from './components/CreatePostModal';
import Link from 'next/link';
import Avatar from './components/Avatar';
import MemberName from './components/MemberName';
import OnboardingWizard from './components/OnboardingWizard';
import { uploadPostMedia } from './lib/mediaUpload';
import {
  sortPostsWithPinned,
  isUserAdmin,
  getSampleFeedPosts,
  saveUserCreatedPost,
  getUserCreatedPosts,
  updateUserCreatedPost,
} from './lib/pinnedPosts';
import { PenSquare, User, ShieldCheck, Settings, Compass, LogOut, Church, Pin, Sun, Moon, Volume2, VolumeX, DownloadCloud, X, Search, Home, MessageCircle, Bell, Building2 } from 'lucide-react';
import TopNav, { TOP_NAV_SECTIONS } from './components/TopNav';
import StatusTray from './components/StatusTray';
import InboxView from './components/InboxView';
import VideosView from './components/VideosView';
import AudioView from './components/AudioView';
import PollsView from './components/PollsView';
import CoursesView from './components/CoursesView';
import RssFeedsView from './components/RssFeedsView';
import BibleReaderView from './components/BibleReaderView';
import FaithChallengesView from './components/FaithChallengesView';
import FaithArcadeGamesView from './components/FaithArcadeGamesView';
import GoogleWorkspaceHubView from './components/GoogleWorkspaceHubView';
import PWAInstallButton from './components/PWAInstallButton';
import {
  cacheMainFeedPosts,
  getCachedMainFeedPosts,
  useOfflineIndicatorStatus,
  addPendingSyncItem,
} from './lib/swFeedCache';
import { dispatchCommunityPushForPost } from './lib/fcmClient';
import NotificationsView from './components/NotificationsView';
import ExploreView from './components/ExploreView';
import InstitutionsView from './components/InstitutionsView';
import {
  ChurchesToFollowCard,
  PeopleToFollowCard,
  TrendingReelsCard,
  ExploreTabsBanner,
  CommunityProjectsGivingCard,
} from './components/HomeHighlights';
import { getHomefeedPostsWithRss } from './lib/rssManager';
import { playSound, isSoundEnabled, setSoundEnabled } from './lib/soundEffects';
import { rankPostsWithAlgorithm } from './lib/feedAlgorithm';
import { getBlockedUsers, getFollows, fetchFollows, fetchBlockedUsers } from './lib/profileManager';
import AuthorOverviewModal from './components/AuthorOverviewModal';
import InstitutionProfileModal from './components/InstitutionProfileModal';
import ShammahChatbotModal from './components/ShammahChatbotModal';
import OfflineLibraryModal from './components/OfflineLibraryModal';
import ProjectionModeModal from './components/ProjectionModeModal';
import WatermarkShareModal from './components/WatermarkShareModal';
import ActivityLogModal from './components/ActivityLogModal';
import { logActivity } from './lib/activityLogManager';
import {
  SAMPLE_INSTITUTIONS,
  getAllInstitutions,
  getJoinedInstitutionIds,
  getFollowedInstitutionIds,
} from './lib/institutionManager';
import { getOfflineItems } from './lib/offlineSyncManager';
import {
  canUserViewPost,
  setPostVisibility,
  savePostIdentityMeta,
  getPostVisibility,
} from './lib/postInteractions';

const SECTIONS = TOP_NAV_SECTIONS;

const ICONS = {
  home: <Home size={20} className="icon" />,
  messages: <MessageCircle size={20} className="icon" />,
  alerts: <Bell size={20} className="icon" />,
  churches: <Building2 size={20} className="icon" />,
  menu: <Compass size={20} className="icon" />,
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
  const [composeCategory, setComposeCategory] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Auth panel state
  const [showAuth, setShowAuth] = useState(false);
  const [feedFromSwCache, setFeedFromSwCache] = useState(false);
  const [lastSwCachedAt, setLastSwCachedAt] = useState(null);
  const {
    isOnline,
    isDisconnected,
    hasPendingSyncs,
    pendingSyncCount,
    dotColor,
  } = useOfflineIndicatorStatus();

  const [authMode, setAuthMode] = useState('signin'); // signin | signup | forgot | oauth
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // App shell: bottom tab, content-type pill, theme, search, avatar menu
  const [tab, setTab] = useState('home'); // home | messages | alerts | churches | menu
  const [section, setSection] = useState('all'); // all | videos | podcasts | courses | polls | bible
  const [dark, setDark] = useState(true);
  const [privacyTick, setPrivacyTick] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
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

  // Profile and Institution brief dialog toast popups with neon glow borders
  const [activeProfileModal, setActiveProfileModal] = useState(null); // { author, authorId }
  const [activeInstitutionModal, setActiveInstitutionModal] = useState(null); // institution object
  const [showChatbot, setShowChatbot] = useState(false);
  const [showOfflineLibrary, setShowOfflineLibrary] = useState(false);
  const [projectionData, setProjectionData] = useState(null);
  const [watermarkShareData, setWatermarkShareData] = useState(null);
  const [showActivityLogModal, setShowActivityLogModal] = useState(false);

  const [offlineCount, setOfflineCount] = useState(0);

  useEffect(() => {
    setOfflineCount(getOfflineItems().length);
    function onOfflineUpdate() {
      setOfflineCount(getOfflineItems().length);
    }
    window.addEventListener('shammah:offline-updated', onOfflineUpdate);
    return () => window.removeEventListener('shammah:offline-updated', onOfflineUpdate);
  }, []);

  useEffect(() => {
    function onOpenActivityLog() {
      setShowActivityLogModal(true);
    }
    window.addEventListener('shammah:open-activity-log', onOpenActivityLog);
    return () => window.removeEventListener('shammah:open-activity-log', onOpenActivityLog);
  }, []);

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

  // Global modal event listeners for profile and institution popups with neon glow borders
  useEffect(() => {
    function handleOpenProfile(e) {
      if (e.detail) {
        setActiveProfileModal(e.detail);
      }
    }
    function handleOpenInstProfile(e) {
      if (e.detail) {
        const instId = e.detail.institutionId;
        const matched = getAllInstitutions().find((s) => s.id === instId);
        setActiveInstitutionModal(
          matched || {
            id: instId || 'inst-custom',
            name: e.detail.name || 'Christian Institution',
            categoryLabel: 'Institution',
            logo_url: e.detail.logo_url,
            verified: true,
            about: 'A faith-based Christian institution serving the kingdom of God and nurturing believers in truth and love.',
            membersCount: 350,
          }
        );
      }
    }
    function handlePrivacyStateSync() {
      setPrivacyTick((v) => v + 1);
    }
    window.addEventListener('shammah:open-profile', handleOpenProfile);
    window.addEventListener('shammah:open-institution-profile', handleOpenInstProfile);
    window.addEventListener('shammah:post-visibility-changed', handlePrivacyStateSync);
    window.addEventListener('shammah:batch-visibility-changed', handlePrivacyStateSync);
    window.addEventListener('shammah:follows-updated', handlePrivacyStateSync);
    window.addEventListener('shammah:institutions-updated', handlePrivacyStateSync);
    return () => {
      window.removeEventListener('shammah:open-profile', handleOpenProfile);
      window.removeEventListener('shammah:open-institution-profile', handleOpenInstProfile);
      window.removeEventListener('shammah:post-visibility-changed', handlePrivacyStateSync);
      window.removeEventListener('shammah:batch-visibility-changed', handlePrivacyStateSync);
      window.removeEventListener('shammah:follows-updated', handlePrivacyStateSync);
      window.removeEventListener('shammah:institutions-updated', handlePrivacyStateSync);
    };
  }, []);

  // Sync section and category state with global TopNav and URL params
  useEffect(() => {
    function syncUrlParams() {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const t = params.get('tab');
        if (t === 'institutions') {
          setTab('churches');
        } else if (t && ['home', 'messages', 'alerts', 'churches', 'menu'].includes(t)) {
          setTab(t);
        }
        const sec = params.get('section');
        if (sec && ['all', 'videos', 'podcasts', 'courses', 'polls', 'bible', 'challenges', 'games', 'rss', 'workspace'].includes(sec)) {
          setSection(sec);
        }
        const cat = params.get('category');
        if (cat) {
          setActiveCategory(cat === 'all' ? null : cat);
        } else if (params.has('category')) {
          setActiveCategory(null);
        }
        if (params.get('compose') === '1') {
          setShowCreateModal(true);
        }
        const instParam = params.get('inst');
        if (instParam) {
          const found = getAllInstitutions().find((s) => s.id === instParam);
          if (found) setActiveInstitutionModal(found);
        }
      }
    }

    syncUrlParams();

    function onSectionSet(e) {
      if (e.detail && ['all', 'videos', 'podcasts', 'courses', 'polls', 'bible', 'challenges', 'games', 'rss', 'workspace'].includes(e.detail)) {
        setTab('home');
        setSection(e.detail);
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    }
    window.addEventListener('shammah:set-section', onSectionSet);
    window.addEventListener('popstate', syncUrlParams);
    return () => {
      window.removeEventListener('shammah:set-section', onSectionSet);
      window.removeEventListener('popstate', syncUrlParams);
    };
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('shammah:section-changed', { detail: section }));
  }, [section]);

  // Remember the person's light/dark choice on this device (defaulting to Dark Mode) and sync sound profile
  useEffect(() => {
    const explicitMode = typeof window !== 'undefined' ? localStorage.getItem('shammah-theme-mode') : null;
    const isDark = explicitMode ? explicitMode === 'dark' : true;
    setDark(isDark);
    setSoundOn(isSoundEnabled());

    function handleSoundToggled(e) {
      if (typeof e.detail === 'boolean') {
        setSoundOn(e.detail);
      }
    }
    window.addEventListener('shammah:sound-toggled', handleSoundToggled);
    return () => window.removeEventListener('shammah:sound-toggled', handleSoundToggled);
  }, []);

  function handleToggleTheme() {
    setDark((prev) => {
      const next = !prev;
      playSound('themeToggle');
      return next;
    });
  }

  function handleToggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  }

  useEffect(() => {
    const themeVal = dark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', themeVal);
    document.documentElement.classList.toggle('dark', dark);
    if (typeof window !== 'undefined') {
      localStorage.setItem('shammah-theme', themeVal);
      localStorage.setItem('shammah-theme-mode', themeVal);
    }
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

  function handleFilterCategory(catId) {
    const target = !catId || catId === 'all' ? null : catId;
    setActiveCategory(target);
    setTab('home');
    setSection('all');
    loadPosts(target);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (target) {
        url.searchParams.set('category', target);
      } else {
        url.searchParams.delete('category');
      }
      url.searchParams.delete('section');
      window.history.pushState({}, '', url.toString());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Reload the feed when the category changes or when someone signs in/out
  // (posts are only readable by signed-in users, so the feed must refetch after login)
  useEffect(() => {
    loadPosts(activeCategory);
  }, [activeCategory, session?.user?.id]);

  // Global events: create post modal, auth, category selection, and algorithm feedback
  useEffect(() => {
    function handleOpenCreateModal() {
      setShowCreateModal(true);
    }
    function handleAuthEvent(e) {
      if (e.detail) {
        setAuthMode(e.detail);
        setShowAuth(true);
      }
    }
    function handleAlgUpdate() {
      loadPosts(activeCategory);
    }
    function handleSelectCat(e) {
      if (e.detail !== undefined) {
        handleFilterCategory(e.detail);
      }
    }

    function onOpenChatbot() {
      setShowChatbot(true);
    }
    function onOpenOffline() {
      setShowOfflineLibrary(true);
    }
    function onOpenProjection(e) {
      setProjectionData(e.detail || { type: 'course' });
    }
    function onOpenWatermark(e) {
      setWatermarkShareData(e.detail);
    }

    window.addEventListener('shammah:open-create-post', handleOpenCreateModal);
    window.addEventListener('shammah:open-auth', handleAuthEvent);
    window.addEventListener('shammah:feed-algorithm-updated', handleAlgUpdate);
    window.addEventListener('shammah:blocks-updated', handleAlgUpdate);
    window.addEventListener('shammah:follows-updated', handleAlgUpdate);
    window.addEventListener('shammah:select-category', handleSelectCat);
    window.addEventListener('shammah:open-chatbot', onOpenChatbot);
    window.addEventListener('shammah:open-offline-library', onOpenOffline);
    window.addEventListener('shammah:open-projection', onOpenProjection);
    window.addEventListener('shammah:open-watermark-share', onOpenWatermark);

    return () => {
      window.removeEventListener('shammah:open-create-post', handleOpenCreateModal);
      window.removeEventListener('shammah:open-auth', handleAuthEvent);
      window.removeEventListener('shammah:feed-algorithm-updated', handleAlgUpdate);
      window.removeEventListener('shammah:blocks-updated', handleAlgUpdate);
      window.removeEventListener('shammah:follows-updated', handleAlgUpdate);
      window.removeEventListener('shammah:select-category', handleSelectCat);
      window.removeEventListener('shammah:open-chatbot', onOpenChatbot);
      window.removeEventListener('shammah:open-offline-library', onOpenOffline);
      window.removeEventListener('shammah:open-projection', onOpenProjection);
      window.removeEventListener('shammah:open-watermark-share', onOpenWatermark);
    };
  }, [activeCategory]);

  async function loadProfile(userId) {
    if (userId) {
      fetchFollows(userId);
      fetchBlockedUsers(userId);
    }
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
    // 1. If browser is offline, serve recently loaded posts from Service Worker CacheStorage first
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const cached = await getCachedMainFeedPosts(category);
      if (cached && Array.isArray(cached.posts) && cached.posts.length > 0) {
        setPosts(sortPostsWithPinned(cached.posts));
        if (cached.pollOptionsByPost) setPollOptionsByPost(cached.pollOptionsByPost);
        if (cached.pollCountsByPost) setPollCountsByPost(cached.pollCountsByPost);
        setFeedFromSwCache(true);
        setLastSwCachedAt(cached.cachedAt);
        return;
      }
    }

    try {
      let query = supabase
        .from('posts')
        .select(
          'id, text_content, media_url, media_type, created_at, category_id, church_id, author_id, profiles(display_name, avatar_url, badge, badge_verified, role)'
        )
        .order('created_at', { ascending: false })
        .limit(50);
      if (category) query = query.eq('category_id', category);
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        const localUserPosts = getUserCreatedPosts().filter(
          (lp) => !category || lp.category_id === category || lp.is_pinned
        );
        const remoteIds = new Set(data.map((d) => d.id));
        const enrichedRemote = data.map((d) => ({
          ...d,
          visibility: getPostVisibility(d.id, d.visibility || 'public'),
        }));
        const merged = [...localUserPosts.filter((lp) => !remoteIds.has(lp.id)), ...enrichedRemote];
        const sorted = sortPostsWithPinned(merged);
        setPosts(sorted);
        setFeedFromSwCache(false);
        await loadPollData(data.map((p) => p.id));
        cacheMainFeedPosts(category, sorted, pollOptionsByPost, pollCountsByPost);
        setLastSwCachedAt(new Date().toISOString());
        return;
      }
    } catch {
      // Network error: try Service Worker offline feed cache before falling back to sample posts
      const cached = await getCachedMainFeedPosts(category);
      if (cached && Array.isArray(cached.posts) && cached.posts.length > 0) {
        setPosts(sortPostsWithPinned(cached.posts));
        if (cached.pollOptionsByPost) setPollOptionsByPost(cached.pollOptionsByPost);
        if (cached.pollCountsByPost) setPollCountsByPost(cached.pollCountsByPost);
        setFeedFromSwCache(true);
        setLastSwCachedAt(cached.cachedAt);
        return;
      }
    }

    // Default to rich community posts featuring a prominent pinned announcement and cache them in Service Worker
    const sample = getSampleFeedPosts(category);
    setPosts(sample);
    setFeedFromSwCache(typeof navigator !== 'undefined' && !navigator.onLine);
    cacheMainFeedPosts(category, sample, pollOptionsByPost, pollCountsByPost);
    setLastSwCachedAt(new Date().toISOString());
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
    logActivity({
      type: 'poll_vote',
      icon: '📊',
      title: 'Voted in Community Poll',
      snippet: 'Cast anonymous ballot on poll option',
      visibility: 'anonymous',
      meta: { postId, optionId },
    });
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

  async function handleCreatePost(e, visibility = 'public', identityMeta = null) {
    e.preventDefault();
    if (!composeCategory) {
      setPostError('Please select a category for your post from the dropdown before posting.');
      return;
    }
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
            return {
              label: opt.label.trim(),
              image_url,
              position,
              is_correct: identityMeta?.isQuiz ? identityMeta?.correctOptionIdx === position : Boolean(opt.is_correct),
            };
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
    const pollDurationToSave = identityMeta?.pollDuration || '24h';
    const pollExpiresAtToSave = identityMeta?.pollExpiresAt || null;
    const revealResultsAfterVotingToSave = identityMeta?.revealResultsAfterVoting ?? false;
    const validVisibility = ['public', 'followers', 'church', 'private'].includes(visibility)
      ? visibility
      : 'public';
    const isAnon = identityMeta?.identityMode === 'anonymous';
    const isPseudo = identityMeta?.identityMode === 'pseudo';
    const displayName = isAnon
      ? 'Anonymous Disciple'
      : isPseudo
        ? identityMeta?.pseudoName || 'Faith Pilgrim'
        : profile?.display_name || session?.user?.email || 'Member';

    const { data: inserted, error } = await supabase
      .from('posts')
      .insert({
        author_id: session.user.id,
        church_id: profile?.church_id ?? null,
        category_id: composeCategory,
        text_content: text || null,
        media_url,
        media_type,
      })
      .select('id')
      .single();

    const finalPostId = inserted?.id || 'post-' + Date.now();
    await setPostVisibility(finalPostId, validVisibility);
    savePostIdentityMeta(finalPostId, {
      postIdentity: identityMeta?.identityMode || 'real',
      pseudonym: isPseudo ? displayName : null,
      is_anonymous: isAnon,
      author_id: session.user.id,
    });

    const newPost = {
      id: finalPostId,
      text_content: text || null,
      media_url,
      media_type,
      created_at: new Date().toISOString(),
      category_id: composeCategory,
      church_id: profile?.church_id ?? null,
      church_name: profile?.church_name ?? null,
      author_id: session.user.id,
      visibility: validVisibility,
      is_pinned: isPinnedToSave,
      pinned_at: pinnedAtToSave,
      poll_duration: pollDurationToSave,
      poll_expires_at: pollExpiresAtToSave,
      reveal_results_after_voting: revealResultsAfterVotingToSave,
      is_anonymous: isAnon,
      is_pseudo: isPseudo,
      post_identity: identityMeta?.identityMode || 'real',
      pseudonym: isPseudo ? displayName : null,
      is_quiz: Boolean(identityMeta?.isQuiz),
      quiz_explanation: identityMeta?.quizExplanation || null,
      correct_option_idx: identityMeta?.correctOptionIdx ?? null,
      profiles: {
        id: session.user.id,
        display_name: displayName,
        avatar_url: isAnon || isPseudo ? null : profile?.avatar_url || null,
        badge: isAnon ? null : isPseudo ? 'pilgrim' : profile?.badge || 'member',
        badge_verified: isAnon || isPseudo ? false : profile?.badge_verified || false,
        role: isAnon || isPseudo ? 'member' : profile?.role || 'member',
        church_id: profile?.church_id ?? null,
        church_name: profile?.church_name ?? null,
      },
    };

    saveUserCreatedPost(newPost);

    if (error || !inserted?.id) {
      setPosts((prev) => {
        const nextList = sortPostsWithPinned([newPost, ...prev]);
        cacheMainFeedPosts(activeCategory, nextList, pollOptionsByPost, pollCountsByPost);
        setLastSwCachedAt(new Date().toISOString());
        return nextList;
      });
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        addPendingSyncItem({ type: 'post_sync', label: 'New community post' });
      }

      if (isPoll && optionsToInsert.length > 0) {
        const generatedOpts = optionsToInsert.map((o, idx) => ({
          id: `opt-${newPost.id}-${idx}`,
          label: o.label,
          image_url: o.image_url,
          is_correct: o.is_correct ?? false,
          position: idx,
        }));
        setPollOptionsByPost((prev) => ({
          ...prev,
          [newPost.id]: generatedOpts,
        }));
      }
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
    playSound('postPublished');

    // Sync updated feed posts to Service Worker offline cache & dispatch FCM community/mention push notifications
    const authorDisplay = displayName;

    if (validVisibility === 'public') {
      dispatchCommunityPushForPost({
        text: text || '',
        categoryId: composeCategory,
        churchId: profile?.church_id || 'nairobi-chapel',
        churchName: profile?.location_label || 'Shammah Church Community',
        authorName: authorDisplay,
        authorAvatar: isAnon || isPseudo ? null : profile?.avatar_url || null,
        isPoll,
      }).catch(() => {});
    }

    logActivity({
      type: 'post',
      icon: isPoll ? '📊' : '✍️',
      title: isPoll ? 'Created Community Poll' : 'Published Community Post',
      targetTitle: composeCategory ? `${categoryStyle(composeCategory)?.label || composeCategory} Category` : 'Community Post',
      snippet: text || (isPoll ? 'Interactive church poll question' : 'Shared media in community'),
      visibility: validVisibility,
      meta: { category: composeCategory, isPoll },
    });
    setComposeText('');
    setComposeCategory('');
    setIsPoll(false);
    setIsPinnedAnnouncement(false);
    setPollOptions([{ label: '', file: null, preview: null }, { label: '', file: null, preview: null }]);
    setMediaFile(null);
    setMediaPreview(null);
    setShowCreateModal(false);
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

  const [rssRefreshKey, setRssRefreshKey] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    function onRssUpdate() {
      setRssRefreshKey((k) => k + 1);
    }
    window.addEventListener('shammah:rss-broadcast-updated', onRssUpdate);
    window.addEventListener('shammah:rss-feeds-updated', onRssUpdate);
    return () => {
      window.removeEventListener('shammah:rss-broadcast-updated', onRssUpdate);
      window.removeEventListener('shammah:rss-feeds-updated', onRssUpdate);
    };
  }, []);

  const headerName = profile?.display_name || session?.user?.email || 'Member';
  const currentFollows = mounted ? getFollows() : [];
  const currentChurchIds = mounted
    ? Array.from(new Set([...getJoinedInstitutionIds(), ...getFollowedInstitutionIds()]))
    : [];
  const feedPostsWithRss = mounted ? getHomefeedPostsWithRss(posts, session?.user) : posts;
  const privacyFilteredPosts = mounted
    ? feedPostsWithRss.filter((p) =>
        canUserViewPost(p, session?.user, profile, currentFollows, currentChurchIds)
      )
    : feedPostsWithRss;
  const algorithmRankedPosts = mounted
    ? rankPostsWithAlgorithm(privacyFilteredPosts, {
        blockedUserIds: getBlockedUsers(),
        followedUserIds: currentFollows,
      })
    : privacyFilteredPosts;
  const visiblePosts = searchTerm.trim()
    ? algorithmRankedPosts.filter((p) =>
        (p.text_content || '').toLowerCase().includes(searchTerm.trim().toLowerCase())
      )
    : algorithmRankedPosts;

  return (
    <div className="shell">
      <div className="sticky-header">
        <header className="topbar">
          <div className="brand">
            <div className="brand-text-wrap">
              <h1 className="brand-mark">Shammah</h1>
              <span className="brand-subtext">The Lord is Here</span>
            </div>
          </div>

          <div className="topbar-right">
            <div className="topbar-toggle-group">
              {/* Sun icon for light mode / Moon icon for dark mode toggle at same location */}
              <button
                type="button"
                className={`topbar-toggle-btn theme-toggle-btn ${dark ? 'is-dark' : 'is-light'}`}
                role="switch"
                aria-checked={dark}
                aria-label={dark ? 'Light mode (tap to switch to light mode)' : 'Dark mode (tap to switch to dark mode)'}
                title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                onClick={handleToggleTheme}
              >
                {dark ? (
                  <Moon size={18} className="theme-toggle-icon moon-icon text-amber-300" />
                ) : (
                  <Sun size={18} className="theme-toggle-icon sun-icon text-amber-500" />
                )}
              </button>

              {/* Sound profile on/off toggle beside it */}
              <button
                type="button"
                className={`topbar-toggle-btn sound-toggle-btn ${soundOn ? 'sound-on' : 'sound-off'}`}
                role="switch"
                aria-checked={soundOn}
                aria-label={soundOn ? 'Sound alerts on (tap to mute)' : 'Sound alerts muted (tap to enable)'}
                title={soundOn ? 'Mute sound alerts' : 'Enable sound alerts'}
                onClick={handleToggleSound}
              >
                {soundOn ? (
                  <Volume2 size={18} className="sound-toggle-icon sound-icon-active text-amber-600 dark:text-amber-400" />
                ) : (
                  <VolumeX size={18} className="sound-toggle-icon sound-icon-muted text-gray-400" />
                )}
              </button>

                {/* Small status icon in top navigation bar to inform users when content is cached & available offline */}
                <button
                  type="button"
                  className={`topbar-toggle-btn offline-cache-toggle-btn${offlineCount > 0 ? ' is-cached' : ''}`}
                  title={
                    isDisconnected || hasPendingSyncs
                      ? hasPendingSyncs
                        ? `Offline — ${pendingSyncCount || 1} pending sync(s) queued (yellow indicator). Click to open library.`
                        : 'Offline — Complete network disconnection detected by Service Worker (red indicator). Click to open library.'
                      : offlineCount > 0
                        ? `✓ ${offlineCount} item${offlineCount > 1 ? 's' : ''} cached & available for offline viewing (30-day cache). Click to open library.`
                        : 'Offline Library: Save feeds & chapters for offline viewing'
                  }
                  aria-label="Offline Cached Content Status"
                  onClick={() => {
                    playSound('reaction');
                    setShowOfflineLibrary(true);
                  }}
                >
                  <DownloadCloud size={17} className={offlineCount > 0 ? 'text-emerald-400' : 'text-gray-400'} />
                  {(isDisconnected || hasPendingSyncs) ? (
                    <span
                      className={`inline-block w-2 h-2 rounded-full ml-1 animate-pulse ${
                        dotColor === 'yellow' ? 'bg-yellow-400' : 'bg-red-500'
                      }`}
                    />
                  ) : (
                    offlineCount > 0 && <span className="topbar-offline-dot" />
                  )}
                </button>

                {/* Topbar 'Offline' indicator badge when Service Worker detects network loss or pending syncs */}
                {(isDisconnected || hasPendingSyncs) && (
                  <span
                    role="status"
                    className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-900/90 text-white border border-white/15 shadow-sm"
                    title={
                      dotColor === 'yellow'
                        ? 'Yellow dot: Pending syncs waiting for network reconnection'
                        : 'Red dot: Complete network disconnection detected by Service Worker'
                    }
                  >
                    <span
                      aria-hidden="true"
                      className={`w-2 h-2 rounded-full shrink-0 animate-pulse ${
                        dotColor === 'yellow' ? 'bg-yellow-400' : 'bg-red-500'
                      }`}
                    />
                    <span>
                      {dotColor === 'yellow'
                        ? `Offline · Pending (${pendingSyncCount || 1})`
                        : 'Offline'}
                    </span>
                  </span>
                )}
              </div>

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

                      <button
                        type="button"
                        className="dropdown-item"
                        onClick={() => {
                          setShowActivityLogModal(true);
                          setMenuOpen(false);
                        }}
                      >
                        <ShieldCheck size={16} className="dropdown-item-icon text-teal-400" />
                        <span>Activity Log &amp; Transparency</span>
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
        </header>

        {tab === 'home' && (
          <div className="header-secondary">
            <TopNav
              isHome={true}
              activeSection={section}
              onSelectSection={(sec) => {
                setTab('home');
                setSection(sec);
                if (typeof window !== 'undefined') {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
            />

            {/* Search Input Bar Widget panning across screen directly below top navigation bar */}
            <div className="header-search-widget-wrap">
              <div
                className="header-search-bar-widget"
                role="search"
                tabIndex={0}
                onClick={() => {
                  playSound('reaction');
                  window.dispatchEvent(new CustomEvent('shammah:open-search', { detail: { query: '' } }));
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    playSound('reaction');
                    window.dispatchEvent(new CustomEvent('shammah:open-search', { detail: { query: '' } }));
                  }
                }}
                aria-label="Search scriptures, sermons, topics, and churches"
                title="Search scriptures, sermons, topics, and churches (Press / or ⌘K)"
              >
                <Search size={16} className="search-bar-widget-icon" />
                <span className="search-bar-widget-placeholder">
                  Search sermons, scriptures, topics, members...
                </span>
                <span className="search-bar-widget-badge">
                  <kbd className="search-kbd">⌘K</kbd>
                </span>
              </div>
            </div>
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
          <div className="auth-panel multicolored-glow-shadow" onClick={(e) => e.stopPropagation()}>
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
        {/* Videos Section */}
        {tab === 'home' && section === 'videos' && (
          <VideosView session={session} currentUser={profile} openAuth={openAuth} />
        )}

        {/* Audio Section (Songs, Podcasts, Voice Notes) */}
        {tab === 'home' && section === 'podcasts' && (
          <AudioView session={session} currentUser={profile} openAuth={openAuth} />
        )}

        {/* Polls Section */}
        {tab === 'home' && section === 'polls' && (
          <PollsView
            session={session}
            currentUser={profile}
            openAuth={openAuth}
            feedPosts={posts}
            pollOptionsByPost={pollOptionsByPost}
            pollCountsByPost={pollCountsByPost}
            myVoteByPost={myVoteByPost}
            onVote={handleVote}
            onFocusCompose={() => {
              setSection('all');
              setIsPoll(true);
            }}
          />
        )}

        {/* Courses & Discipleship Academy Section */}
        {tab === 'home' && section === 'courses' && (
          <CoursesView session={session} currentUser={profile} openAuth={openAuth} />
        )}

        {/* RSS Feeds Dedicated Section */}
        {tab === 'home' && section === 'rss' && (
          <RssFeedsView
            session={session}
            currentUser={profile}
            openAuth={openAuth}
          />
        )}

        {/* Holy Bible Reader Section */}
        {tab === 'home' && section === 'bible' && (
          <BibleReaderView session={session} currentUser={profile} openAuth={openAuth} />
        )}

        {/* Faith Challenges (TikTok-like creative video challenges) */}
        {tab === 'home' && section === 'challenges' && (
          <FaithChallengesView session={session} profile={profile} />
        )}

        {/* Faith Arcade Games (Kids, Teens & Youth offline HTML5 games) */}
        {tab === 'home' && section === 'games' && (
          <FaithArcadeGamesView />
        )}

        {/* Google Workspace (Calendar, Keep, Meet, Classroom, Tasks, Chat) & Firebase Cloud Hub */}
        {tab === 'home' && section === 'workspace' && (
          <GoogleWorkspaceHubView session={session} currentUser={profile} />
        )}

        {tab === 'churches' && (
          <InstitutionsView
            session={session}
            currentUser={profile}
            openAuth={openAuth}
          />
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

        {tab === 'alerts' && (
          <NotificationsView
            currentUser={profile}
            openAuth={openAuth}
          />
        )}

        {tab === 'menu' && (
          <ExploreView
            session={session}
            profile={profile}
            dark={dark}
            setDark={setDark}
            onSignOut={handleSignOut}
            openAuth={openAuth}
            onSelectCategory={(catId) => {
              setActiveCategory(catId);
              setTab('home');
              setSection('all');
            }}
          />
        )}

        {/* 24-Hour Status Story Tray (Facebook/Instagram style) */}
        {tab === 'home' && section === 'all' && (
          <>
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

            {/* Quick Bar: Google Workspace (Calendar, Keep, Meet, Classroom, Tasks, Chat), Firebase & Google Maps */}
            <div className="my-3 p-3 rounded-2xl bg-gradient-to-r from-emerald-950/50 via-slate-900/70 to-teal-950/50 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-2.5 shadow-sm">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-sm shrink-0">
                  ☁️
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <strong className="text-xs font-bold text-white">
                      Google Workspace, Firebase &amp; Maps Connected
                    </strong>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                      Live Sync
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 truncate">
                    Slides · Forms · Keep · Calendar · Meet · Classroom · Tasks · Chat · Firestore · Maps
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                <PWAInstallButton compact />
                <button
                  type="button"
                  onClick={() => {
                    cacheMainFeedPosts(activeCategory, posts, pollOptionsByPost, pollCountsByPost);
                    setLastSwCachedAt(new Date().toISOString());
                    playSound('reaction');
                  }}
                  title={
                    lastSwCachedAt
                      ? `Service Worker cached ${posts.length} posts (${new Date(lastSwCachedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
                      : 'Sync current feed posts to Service Worker offline cache'
                  }
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white/10 text-emerald-200 hover:bg-white/15 border border-emerald-400/30 transition-all flex items-center gap-1.5"
                >
                  {(isDisconnected || hasPendingSyncs || feedFromSwCache) && (
                    <span
                      aria-hidden="true"
                      className={`w-2 h-2 rounded-full shrink-0 animate-pulse ${
                        dotColor === 'yellow' ? 'bg-yellow-400' : 'bg-red-500'
                      }`}
                    />
                  )}
                  <span>
                    {!isOnline || feedFromSwCache
                      ? dotColor === 'yellow'
                        ? `Offline · Pending Sync (${pendingSyncCount || 1})`
                        : 'Offline'
                      : `✓ SW Cached (${posts.length})`}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSection('workspace');
                    playSound('reaction');
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all shadow-sm"
                >
                  Open Workspace Hub
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab('churches');
                    playSound('reaction');
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 text-white hover:bg-white/15 border border-white/15 transition-all"
                >
                  🗺️ Church Map
                </button>
              </div>
            </div>
          </>
        )}

        {tab === 'home' && section === 'all' && session && (
          <div className="verse-card">
            <span className="mut-light">Verse of the day</span>
            <p>God is our refuge and strength, a very present help in trouble.</p>
            <span className="mut-light">Psalm 46:1</span>
          </div>
        )}

        {/* Active Category Filter Banner */}
        {tab === 'home' && section === 'all' && activeCategory && (
          <div className="active-category-banner">
            <div className="active-category-info">
              <span
                className="active-category-dot"
                style={{ backgroundColor: CATEGORY_STYLES[activeCategory]?.accent || 'var(--teal)' }}
              />
              <span className="active-category-text">
                Topic: <strong>{CATEGORY_STYLES[activeCategory]?.label || activeCategory}</strong>
              </span>
            </div>
            <div className="active-category-actions">
              <Link href="/categories" className="active-category-switch-link">
                All Topics
              </Link>
              <button
                type="button"
                className="active-category-clear-btn"
                onClick={() => {
                  setActiveCategory(null);
                  loadPosts(null);
                  if (typeof window !== 'undefined') {
                    const url = new URL(window.location.href);
                    url.searchParams.delete('category');
                    window.history.replaceState({}, '', url.toString());
                  }
                }}
                aria-label="Clear category filter"
                title="Show all posts"
              >
                <X size={13} />
                <span>Show all</span>
              </button>
            </div>
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

        {/* Dynamic Homefeed Widgets: Churches to follow & Channels Explore */}
        {tab === 'home' && section === 'all' && !searchTerm && (
          <>
            <ChurchesToFollowCard />
            <ExploreTabsBanner onSelectSection={(secId) => setSection(secId)} />
          </>
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
              {i === 1 && !searchTerm && (
                <TrendingReelsCard onSelectSection={(secId) => setSection(secId)} />
              )}
              {i === 2 && !searchTerm && (
                <CommunityProjectsGivingCard currentUser={profile} />
              )}
              {i === 3 && !searchTerm && (
                <PeopleToFollowCard />
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
                onSelectCategory={handleFilterCategory}
                onOpenDirectMessage={() => {
                  setTab('messages');
                }}
              />
            </Fragment>
          ))}
      </main>

      {/* Create Post Dialog / Modal (Triggered by Bottom Nav Plus Icon or Compose Action) */}
      <CreatePostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
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

      {/* Brief Profile Dialog Box Toast Popup with Neon Glow Border */}
      {activeProfileModal && (
        <AuthorOverviewModal
          author={activeProfileModal.author}
          authorId={activeProfileModal.authorId}
          currentUser={profile}
          onClose={() => setActiveProfileModal(null)}
          onOpenDirectMessage={() => {
            setActiveProfileModal(null);
            setTab('messages');
          }}
        />
      )}

      {/* Institution Profile Dialog Box Toast Popup with Neon Glow Border */}
      {activeInstitutionModal && (
        <InstitutionProfileModal
          institution={activeInstitutionModal}
          session={session}
          currentUser={profile}
          onClose={() => setActiveInstitutionModal(null)}
        />
      )}

      {/* Shammah AI Pastoral Chatbot Circular Pop-Up Modal */}
      {showChatbot && (
        <ShammahChatbotModal
          onClose={() => setShowChatbot(false)}
          onShareContent={(data) => setWatermarkShareData(data)}
          onPopulateCompose={(text) => {
            setComposeText(text);
            setShowCreateModal(true);
          }}
        />
      )}

      {/* Offline Synced Library Modal (30-day storage) */}
      {showOfflineLibrary && (
        <OfflineLibraryModal
          onClose={() => setShowOfflineLibrary(false)}
        />
      )}

      {/* Sanctuary Screen Projection Mode Modal */}
      {projectionData && (
        <ProjectionModeModal
          type={projectionData.type || 'course'}
          data={projectionData.data || projectionData}
          onClose={() => setProjectionData(null)}
        />
      )}

      {/* Official Watermark Share Modal */}
      {watermarkShareData && (
        <WatermarkShareModal
          contentData={watermarkShareData}
          onClose={() => setWatermarkShareData(null)}
        />
      )}

      {/* Engagement Activity Log & Transparency Modal */}
      <ActivityLogModal
        isOpen={showActivityLogModal}
        onClose={() => setShowActivityLogModal(false)}
      />
    </div>
  );
}
