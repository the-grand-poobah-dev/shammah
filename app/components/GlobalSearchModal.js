'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  X,
  FileText,
  Church,
  Users,
  Compass,
  ArrowRight,
  Clock,
  Sparkles,
  MapPin,
  Check,
  TrendingUp,
  History,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import { playSound } from '../lib/soundEffects';
import { timeAgo } from '../lib/postDisplay';

const RECENT_SEARCHES_KEY = 'shammah_recent_searches_v1';

// Animation variants for smooth stagger-in of search results
const resultsContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
};

const resultItemVariants = {
  hidden: { opacity: 0, y: 8, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
  },
};

// Seed / fallback directories for rich, reliable offline & online search results
const FALLBACK_CHURCHES = [
  {
    id: 'church-nwc',
    name: 'Nairobi Worship Center',
    denomination: 'Pentecostal & Praise',
    city: 'Nairobi, Kenya',
    membersCount: 420,
    avatar: 'https://images.unsplash.com/photo-1548625361-195fe57876a3?w=150',
    about: 'A Christ-centered fellowship dedicated to worshipping God, revival, and kingdom community outreach.',
    verified: true,
  },
  {
    id: 'church-grace',
    name: 'Grace Community Fellowship',
    denomination: 'Discipleship & Outreach',
    city: 'Kampala, Uganda',
    membersCount: 285,
    avatar: 'https://images.unsplash.com/photo-1519491050282-cf00c82424b4?w=150',
    about: 'Equipping believers in Bible truth, youth discipleship, and Christ-like servant leadership.',
    verified: true,
  },
  {
    id: 'church-glory',
    name: 'Glory Tabernacle Chapel',
    denomination: 'Prayer & Intercession',
    city: 'Dar es Salaam, Tanzania',
    membersCount: 310,
    avatar: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=150',
    about: 'Standing in the gap through fervent corporate prayer, healing, and holy spirit ministry.',
    verified: true,
  },
  {
    id: 'church-calvary',
    name: 'Calvary Living Waters Church',
    denomination: 'Youth & Missions',
    city: 'Mombasa, Kenya',
    membersCount: 512,
    avatar: 'https://images.unsplash.com/photo-1543807535-eceef0bc6599?w=150',
    about: 'Reaching coastal and campus communities with living hope and holistic kingdom transformation.',
    verified: true,
  },
  {
    id: 'church-zion',
    name: 'Mount Zion Cathedral',
    denomination: 'Revival & Worship',
    city: 'Kigali, Rwanda',
    membersCount: 375,
    avatar: 'https://images.unsplash.com/photo-1510172951991-856a654063f9?w=150',
    about: 'A beacon of grace preaching the gospel of peace and nurturing believers in spiritual maturity.',
    verified: true,
  },
];

const FALLBACK_MEMBERS = [
  {
    id: 'p-david',
    name: 'Pastor David Mwangi',
    handle: '@pastordavid',
    role: 'Lead Pastor',
    badge: 'pastor',
    church: 'Nairobi Worship Center',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    bio: 'Shepherding with grace. Preaching Christ crucified, resurrected & returning.',
  },
  {
    id: 'p-mary',
    name: 'Sister Mary Grace',
    handle: '@marygrace',
    role: 'Worship Leader',
    badge: 'worship',
    church: 'Grace Community Fellowship',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    bio: 'Psalmist & singer praising Jesus through hymns, acoustic worship and scripture.',
  },
  {
    id: 'p-john',
    name: 'Brother John Ochieng',
    handle: '@johnochieng',
    role: 'Youth Mentor',
    badge: 'partner',
    church: 'Calvary Living Waters',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    bio: 'Equipping the next generation of Christian leaders and kingdom innovators.',
  },
  {
    id: 'p-rebecca',
    name: 'Deaconess Rebecca',
    handle: '@rebeccaprayer',
    role: 'Intercessor',
    badge: 'deacon',
    church: 'Glory Tabernacle Chapel',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    bio: 'Dedicated to midnight intercession, fasting fellowship, and community ministry.',
  },
  {
    id: 'p-samuel',
    name: 'Evangelist Samuel',
    handle: '@evangelistsamuel',
    role: 'Campus Missionary',
    badge: 'partner',
    church: 'Mount Zion Cathedral',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    bio: 'Sharing Gospel hope across high schools, universities and regional crusades.',
  },
];

const TRENDING_TAGS = [
  '#SundaySermon',
  '#PrayerRequest',
  '#WorshipPraise',
  '#YouthFellowship',
  '#KingdomGiving',
  '#BibleStudy',
  '#Testimony',
  '#ScriptureReading',
];

const FALLBACK_POSTS = [
  {
    id: 'post-fb-1',
    text_content: 'Sunday Sermon reflection: "Walking by faith and not by sight." When the path seems uncertain, trust the promises of God. He will never leave you nor forsake you! #SundaySermon #FaithJourney',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    category_id: 'sermons',
    profiles: {
      display_name: 'Pastor David Mwangi',
      avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
      role: 'Lead Pastor',
    },
  },
  {
    id: 'post-fb-2',
    text_content: 'Praise report! Our youth choir outreach at the regional hospital brought comfort, acoustic hymns, and shared prayers to over 40 families today. Glory to God! #YouthFellowship #Testimony #WorshipPraise',
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    category_id: 'testimonies',
    profiles: {
      display_name: 'Sister Mary Grace',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      role: 'Worship Leader',
    },
  },
  {
    id: 'post-fb-3',
    text_content: 'Kingdom Giving update: The clean water project for Turkana Community Fellowship is now at 85% completion. Thank you for your sacrificial giving and love! #KingdomGiving #Outreach',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    category_id: 'giving',
    profiles: {
      display_name: 'Brother John Ochieng',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      role: 'Youth Mentor',
    },
  },
  {
    id: 'post-fb-4',
    text_content: 'Tonight is our All-Night Intercession Vigil. We will be standing in the gap for families, healing, and spiritual revival across the nations. Join us online or in person! #PrayerRequest #Intercession',
    created_at: new Date(Date.now() - 3600000 * 36).toISOString(),
    category_id: 'prayer',
    profiles: {
      display_name: 'Deaconess Rebecca',
      avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      role: 'Intercessor',
    },
  },
  {
    id: 'post-fb-5',
    text_content: 'Scripture Meditation of the day: "The Lord bless you and keep you; the Lord make His face shine upon you, and be gracious to you; the Lord lift up His countenance upon you, and give you peace." - Numbers 6:24-26 #BibleStudy #ScriptureReading',
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    category_id: 'bible',
    profiles: {
      display_name: 'Evangelist Samuel',
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      role: 'Campus Missionary',
    },
  },
];

export default function GlobalSearchModal({ isOpen, onClose, initialQuery = '' }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState('all'); // all | posts | churches | members
  const [isLoading, setIsLoading] = useState(false);
  const [livePosts, setLivePosts] = useState([]);
  const [liveChurches, setLiveChurches] = useState([]);
  const [liveMembers, setLiveMembers] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const inputRef = useRef(null);

  // Load recent searches from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setRecentSearches(parsed.slice(0, 5));
          }
        }
      } catch {}
    }
  }, [isOpen]);

  function saveRecentSearch(term) {
    const clean = (term || '').trim();
    if (!clean || clean.length < 2) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s.toLowerCase() !== clean.toLowerCase());
      const updated = [clean, ...filtered].slice(0, 5);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
  }

  function clearRecentSearches(e) {
    if (e) e.stopPropagation();
    playSound('offline_remove');
    setRecentSearches([]);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(RECENT_SEARCHES_KEY);
      } catch {}
    }
  }

  function handleSelectRecent(term) {
    playSound('reaction');
    setQuery(term);
    saveRecentSearch(term);
  }

  // Sync initial query when opened
  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, initialQuery]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch live search results from Supabase
  useEffect(() => {
    if (!isOpen) return;

    let isCancelled = false;
    async function performSearch() {
      const q = query.trim();
      if (!q) {
        setLivePosts([]);
        setLiveChurches([]);
        setLiveMembers([]);
        return;
      }

      setIsLoading(true);

      try {
        // Query Posts
        const { data: postsData } = await supabase
          .from('posts')
          .select('id, text_content, created_at, category_id, profiles(display_name, avatar_url, role)')
          .ilike('text_content', `%${q}%`)
          .limit(10);

        if (!isCancelled && postsData) {
          setLivePosts(postsData);
        }

        // Query Churches
        const { data: churchesData } = await supabase
          .from('churches')
          .select('id, name, denomination, location_label, logo_url, about')
          .or(`name.ilike.%${q}%,denomination.ilike.%${q}%,location_label.ilike.%${q}%`)
          .limit(8);

        if (!isCancelled && churchesData) {
          setLiveChurches(churchesData);
        }

        // Query Members
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, display_name, role, church_name, avatar_url')
          .or(`display_name.ilike.%${q}%,role.ilike.%${q}%,church_name.ilike.%${q}%`)
          .limit(8);

        if (!isCancelled && profilesData) {
          setLiveMembers(profilesData);
        }
      } catch (err) {
        console.warn('Live search error:', err);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    const timer = setTimeout(performSearch, 180);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [query, isOpen]);

  // Combined and filtered results
  const filteredChurches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FALLBACK_CHURCHES;
    const combined = [...liveChurches];
    FALLBACK_CHURCHES.forEach((fc) => {
      if (
        !combined.some((c) => c.name?.toLowerCase() === fc.name.toLowerCase()) &&
        (fc.name.toLowerCase().includes(q) ||
          fc.denomination.toLowerCase().includes(q) ||
          fc.city.toLowerCase().includes(q))
      ) {
        combined.push(fc);
      }
    });
    return combined;
  }, [query, liveChurches]);

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FALLBACK_MEMBERS;
    const combined = [...liveMembers];
    FALLBACK_MEMBERS.forEach((fm) => {
      if (
        !combined.some((m) => (m.display_name || m.name)?.toLowerCase() === fm.name.toLowerCase()) &&
        (fm.name.toLowerCase().includes(q) ||
          fm.role.toLowerCase().includes(q) ||
          fm.church.toLowerCase().includes(q))
      ) {
        combined.push({
          id: fm.id,
          display_name: fm.name,
          role: fm.role,
          church_name: fm.church,
          avatar_url: fm.avatar,
          bio: fm.bio,
        });
      }
    });
    return combined;
  }, [query, liveMembers]);

  const filteredPosts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FALLBACK_POSTS.slice(0, 3);
    const combined = [...livePosts];
    FALLBACK_POSTS.forEach((fp) => {
      if (
        !combined.some((p) => p.id === fp.id) &&
        (fp.text_content.toLowerCase().includes(q) ||
          fp.profiles?.display_name?.toLowerCase().includes(q) ||
          fp.category_id?.toLowerCase().includes(q))
      ) {
        combined.push(fp);
      }
    });
    return combined;
  }, [query, livePosts]);

  const totalResultsCount =
    (activeTab === 'all' || activeTab === 'posts' ? filteredPosts.length : 0) +
    (activeTab === 'all' || activeTab === 'churches' ? filteredChurches.length : 0) +
    (activeTab === 'all' || activeTab === 'members' ? filteredMembers.length : 0);

  function handleSelectPost(postId) {
    if (query.trim()) saveRecentSearch(query);
    playSound('reaction');
    onClose();
    if (typeof window !== 'undefined') {
      if (window.location.pathname === '/') {
        window.dispatchEvent(new CustomEvent('shammah:set-tab', { detail: 'home' }));
        window.dispatchEvent(new CustomEvent('shammah:set-section', { detail: 'all' }));
        setTimeout(() => {
          const el = document.getElementById(`post-${postId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 150);
      } else {
        router.push(`/?post=${postId}`);
      }
    }
  }

  function handleSelectChurch(church) {
    saveRecentSearch(church.name);
    playSound('reaction');
    onClose();
    window.dispatchEvent(
      new CustomEvent('shammah:open-institution-profile', {
        detail: {
          id: church.id,
          name: church.name,
          categoryLabel: church.denomination || 'Church Fellowship',
          location: church.location_label || church.city || 'East Africa',
          membersCount: church.membersCount || 350,
          logo_url: church.logo_url || church.avatar,
          about:
            church.about ||
            `${church.name} is a dedicated Christian institution fostering discipleship, worship, and love in the community.`,
          verified: true,
        },
      })
    );
  }

  function handleSelectMember(member) {
    saveRecentSearch(member.display_name || member.name);
    playSound('reaction');
    onClose();
    window.dispatchEvent(
      new CustomEvent('shammah:open-profile', {
        detail: {
          id: member.id,
          display_name: member.display_name || member.name,
          role: member.role || 'Member',
          church_name: member.church_name || member.church || 'Fellowship Church',
          avatar_url: member.avatar_url || member.avatar,
          badge: member.role?.toLowerCase()?.includes('pastor') ? 'pastor' : 'partner',
          bio: member.bio || 'Faithful believer walking in the grace and knowledge of our Lord Jesus Christ.',
        },
      })
    );
  }

  function handleTagClick(tag) {
    playSound('reaction');
    saveRecentSearch(tag);
    setQuery(tag);
    setActiveTab('posts');
  }

  if (!isOpen) return null;

  return (
    <div className="global-search-overlay" onClick={onClose}>
      <div className="global-search-modal neon-glow-modal" onClick={(e) => e.stopPropagation()}>
        {/* Search Input Bar */}
        <div className="global-search-bar">
          <Search size={19} className="global-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="global-search-input"
            placeholder="Search posts, sermons, churches, pastors &amp; members..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim()) {
                saveRecentSearch(query);
              }
            }}
            aria-label="Search posts, churches, and members"
          />
          {query && (
            <button
              type="button"
              className="global-search-clear"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              title="Clear search"
            >
              <X size={15} />
            </button>
          )}
          <button type="button" className="global-search-close-btn" onClick={onClose}>
            Done
          </button>
        </div>

        {/* Tab Filters */}
        <div className="global-search-tabs-row no-scrollbar">
          <button
            type="button"
            className={`global-search-tab${activeTab === 'all' ? ' active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <span>All Results</span>
          </button>
          <button
            type="button"
            className={`global-search-tab${activeTab === 'posts' ? ' active' : ''}`}
            onClick={() => setActiveTab('posts')}
          >
            <FileText size={14} />
            <span>Posts ({filteredPosts.length})</span>
          </button>
          <button
            type="button"
            className={`global-search-tab${activeTab === 'churches' ? ' active' : ''}`}
            onClick={() => setActiveTab('churches')}
          >
            <Church size={14} />
            <span>Churches ({filteredChurches.length})</span>
          </button>
          <button
            type="button"
            className={`global-search-tab${activeTab === 'members' ? ' active' : ''}`}
            onClick={() => setActiveTab('members')}
          >
            <Users size={14} />
            <span>Members ({filteredMembers.length})</span>
          </button>
        </div>

        {/* Search Body Results / Suggestions */}
        <div className="global-search-body no-scrollbar">
          {isLoading && (
            <div className="global-search-loading">
              <span className="global-search-spinner" />
              <span>Searching across Shammah…</span>
            </div>
          )}

          {/* If no query, show recent searches, trending faith tags & suggested discovery */}
          {!query.trim() && (
            <div className="global-search-suggestions">
              {/* Recent Searches Section */}
              {recentSearches.length > 0 && (
                <div className="search-recent-section">
                  <div className="search-section-label search-between-label">
                    <div className="search-label-left">
                      <Clock size={13} className="text-teal" />
                      <span>Recent Searches</span>
                    </div>
                    <button
                      type="button"
                      className="search-clear-recent-btn"
                      onClick={clearRecentSearches}
                      title="Clear recent search history"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="search-recent-chips-row no-scrollbar">
                    {recentSearches.map((term) => (
                      <button
                        key={term}
                        type="button"
                        className="search-recent-chip"
                        onClick={() => handleSelectRecent(term)}
                        title={`Search for "${term}"`}
                      >
                        <Clock size={12} className="chip-clock-icon text-teal" />
                        <span>{term}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="search-section-label">
                <TrendingUp size={13} className="text-amber-400" />
                <span>Popular Faith Topics &amp; Tags</span>
              </div>
              <div className="search-tags-shelf no-scrollbar">
                {TRENDING_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="search-tag-chip"
                    onClick={() => handleTagClick(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* Featured Churches */}
              <div className="search-section-label search-mt-16">
                <Church size={13} className="text-emerald-400" />
                <span>Featured Churches &amp; Ministries</span>
              </div>
              <div className="search-inst-list">
                {FALLBACK_CHURCHES.slice(0, 3).map((c) => (
                  <div
                    key={c.id}
                    className="search-result-item church-item"
                    onClick={() => handleSelectChurch(c)}
                    role="button"
                    tabIndex={0}
                  >
                    <Avatar url={c.avatar} name={c.name} size={36} />
                    <div className="search-result-meta">
                      <div className="search-title-row">
                        <strong>{c.name}</strong>
                        <VerifiedBadge verified={c.verified} />
                      </div>
                      <span className="search-sub-row">
                        <MapPin size={11} />
                        <span>{c.city}</span>
                        <span>·</span>
                        <span>{c.denomination}</span>
                      </span>
                    </div>
                    <ArrowRight size={15} className="search-action-arrow" />
                  </div>
                ))}
              </div>

              {/* Fellowship Members & Mentors */}
              <div className="search-section-label search-mt-16">
                <Users size={13} className="text-cyan-400" />
                <span>Community Pastors &amp; Members</span>
              </div>
              <div className="search-inst-list">
                {FALLBACK_MEMBERS.slice(0, 3).map((m) => (
                  <div
                    key={m.id}
                    className="search-result-item member-item"
                    onClick={() => handleSelectMember(m)}
                    role="button"
                    tabIndex={0}
                  >
                    <Avatar url={m.avatar} name={m.name} size={36} />
                    <div className="search-result-meta">
                      <div className="search-title-row">
                        <strong>{m.name}</strong>
                        <span className="search-role-badge">{m.role}</span>
                      </div>
                      <span className="search-sub-row">{m.church}</span>
                    </div>
                    <ArrowRight size={15} className="search-action-arrow" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results list when query is present with smooth stagger animation */}
          {query.trim() && (
            <div className="global-search-results-list">
              {totalResultsCount === 0 && !isLoading && (
                <div className="search-empty-state">
                  <p>No results found for &ldquo;{query}&rdquo;</p>
                  <small>Try searching with a hashtag like #SundaySermon or a fellowship name.</small>
                </div>
              )}

              {/* Churches Section */}
              {(activeTab === 'all' || activeTab === 'churches') && filteredChurches.length > 0 && (
                <motion.div
                  className="search-results-group"
                  variants={resultsContainerVariants}
                  initial="hidden"
                  animate="show"
                  key={`churches-${query}-${activeTab}`}
                >
                  <div className="search-section-label">
                    <Church size={13} className="text-emerald-400" />
                    <span>Churches &amp; Ministries ({filteredChurches.length})</span>
                  </div>
                  {filteredChurches.map((c) => (
                    <motion.div
                      key={c.id}
                      variants={resultItemVariants}
                      className="search-result-item church-item"
                      onClick={() => handleSelectChurch(c)}
                      role="button"
                      tabIndex={0}
                    >
                      <Avatar url={c.logo_url || c.avatar} name={c.name} size={38} />
                      <div className="search-result-meta">
                        <div className="search-title-row">
                          <strong>{c.name}</strong>
                          <VerifiedBadge verified={c.verified || true} />
                        </div>
                        <span className="search-sub-row">
                          <MapPin size={11} />
                          <span>{c.location_label || c.city || 'Fellowship'}</span>
                          {c.denomination && (
                            <>
                              <span>·</span>
                              <span>{c.denomination}</span>
                            </>
                          )}
                        </span>
                      </div>
                      <ArrowRight size={15} className="search-action-arrow" />
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {/* Members Section */}
              {(activeTab === 'all' || activeTab === 'members') && filteredMembers.length > 0 && (
                <motion.div
                  className="search-results-group"
                  variants={resultsContainerVariants}
                  initial="hidden"
                  animate="show"
                  key={`members-${query}-${activeTab}`}
                >
                  <div className="search-section-label">
                    <Users size={13} className="text-cyan-400" />
                    <span>Pastors &amp; Members ({filteredMembers.length})</span>
                  </div>
                  {filteredMembers.map((m) => (
                    <motion.div
                      key={m.id}
                      variants={resultItemVariants}
                      className="search-result-item member-item"
                      onClick={() => handleSelectMember(m)}
                      role="button"
                      tabIndex={0}
                    >
                      <Avatar url={m.avatar_url || m.avatar} name={m.display_name || m.name} size={38} />
                      <div className="search-result-meta">
                        <div className="search-title-row">
                          <strong>{m.display_name || m.name}</strong>
                          {m.role && <span className="search-role-badge">{m.role}</span>}
                        </div>
                        <span className="search-sub-row">{m.church_name || m.church || 'Fellowship Believer'}</span>
                      </div>
                      <ArrowRight size={15} className="search-action-arrow" />
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {/* Posts Section */}
              {(activeTab === 'all' || activeTab === 'posts') && filteredPosts.length > 0 && (
                <motion.div
                  className="search-results-group"
                  variants={resultsContainerVariants}
                  initial="hidden"
                  animate="show"
                  key={`posts-${query}-${activeTab}`}
                >
                  <div className="search-section-label">
                    <FileText size={13} className="text-rose-400" />
                    <span>Shared Posts &amp; Testimonies ({filteredPosts.length})</span>
                  </div>
                  {filteredPosts.map((p) => {
                    const authorName = p.profiles?.display_name || 'Fellowship Member';
                    return (
                      <motion.div
                        key={p.id}
                        variants={resultItemVariants}
                        className="search-result-item post-item"
                        onClick={() => handleSelectPost(p.id)}
                        role="button"
                        tabIndex={0}
                      >
                        <Avatar url={p.profiles?.avatar_url} name={authorName} size={36} />
                        <div className="search-result-meta">
                          <div className="search-title-row">
                            <strong>{authorName}</strong>
                            {p.created_at && (
                              <span className="search-time">
                                <Clock size={10} />
                                {timeAgo(p.created_at)}
                              </span>
                            )}
                          </div>
                          <p className="search-post-snippet">{p.text_content}</p>
                        </div>
                        <ArrowRight size={15} className="search-action-arrow" />
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
