'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';
import {
  Church,
  Users,
  Video,
  Play,
  Heart,
  UserPlus,
  UserCheck,
  ChevronRight,
  Sparkles,
  BookOpen,
  Headphones,
  BarChart3,
  GraduationCap,
} from 'lucide-react';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import { playSound } from '../lib/soundEffects';

const SAMPLE_CHURCHES = [
  {
    id: 'church-nwc',
    name: 'Nairobi Worship Center',
    city: 'Nairobi, Kenya',
    membersCount: 420,
    avatar: 'https://images.unsplash.com/photo-1548625361-195fe57876a3?w=150',
    tag: 'Pentecostal & Praise',
    theme: 'church-card-theme-emerald',
  },
  {
    id: 'church-grace',
    name: 'Grace Community Fellowship',
    city: 'Kampala, Uganda',
    membersCount: 285,
    avatar: 'https://images.unsplash.com/photo-1519491050282-cf00c82424b4?w=150',
    tag: 'Discipleship & Outreach',
    theme: 'church-card-theme-sapphire',
  },
  {
    id: 'church-glory',
    name: 'Glory Tabernacle Chapel',
    city: 'Dar es Salaam, TZ',
    membersCount: 310,
    avatar: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=150',
    tag: 'Prayer & Intercession',
    theme: 'church-card-theme-ruby',
  },
  {
    id: 'church-calvary',
    name: 'Calvary Living Waters',
    city: 'Mombasa, Kenya',
    membersCount: 512,
    avatar: 'https://images.unsplash.com/photo-1543807535-eceef0bc6599?w=150',
    tag: 'Youth & Missions',
    theme: 'church-card-theme-amber',
  },
  {
    id: 'church-zion',
    name: 'Mount Zion Cathedral',
    city: 'Kigali, Rwanda',
    membersCount: 375,
    avatar: 'https://images.unsplash.com/photo-1510172951991-856a654063f9?w=150',
    tag: 'Revival & Worship',
    theme: 'church-card-theme-violet',
  },
];

const SAMPLE_PEOPLE = [
  {
    id: 'p-david',
    name: 'Pastor David Mwangi',
    role: 'Lead Pastor',
    badge: 'pastor',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    bio: 'Shepherding with grace. Preaching Christ crucified & risen.',
    theme: 'person-card-theme-indigo',
  },
  {
    id: 'p-mary',
    name: 'Sister Mary Grace',
    role: 'Worship Leader',
    badge: 'worship',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    bio: 'Psalmist & singer praising Jesus through sacred song.',
    theme: 'person-card-theme-teal',
  },
  {
    id: 'p-john',
    name: 'Brother John Ochieng',
    role: 'Youth Mentor',
    badge: 'partner',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    bio: 'Passionate about equipping the next generation of believers.',
    theme: 'person-card-theme-rose',
  },
  {
    id: 'p-rebecca',
    name: 'Deaconess Rebecca',
    role: 'Intercessor',
    badge: 'deacon',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    bio: 'Standing in the gap through 24/7 fellowship prayer.',
    theme: 'person-card-theme-amber',
  },
  {
    id: 'p-samuel',
    name: 'Evangelist Samuel',
    role: 'Campus Missionary',
    badge: 'partner',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    bio: 'Sharing Gospel hope across East African campuses.',
    theme: 'person-card-theme-cyan',
  },
];

const SAMPLE_REELS = [
  {
    id: 'reel-1',
    title: 'Sunday Praise & Worship Highlights',
    creator: 'Sister Mary Grace',
    views: '1.4k',
    thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400',
    duration: '0:45',
  },
  {
    id: 'reel-2',
    title: '3-Minute Prayer for Peace & Healing',
    creator: 'Pastor David',
    views: '2.8k',
    thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400',
    duration: '1:12',
  },
  {
    id: 'reel-3',
    title: 'Youth Choir Glorious Harmony',
    creator: 'Brother John',
    views: '890',
    thumbnail: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=400',
    duration: '0:38',
  },
  {
    id: 'reel-4',
    title: 'Mission Field Testimony in Turkana',
    creator: 'Evangelist Samuel',
    views: '3.2k',
    thumbnail: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
    duration: '1:45',
  },
];

// Helper hook for smooth mouse / pointer drag-to-scroll with zero visible scrollbars
function useDragScroll() {
  const ref = useRef(null);
  const dragInfo = useRef({ isDown: false, startX: 0, scrollLeft: 0, hasMoved: false });

  function onPointerDown(e) {
    if (!ref.current) return;
    dragInfo.current = {
      isDown: true,
      startX: e.pageX - ref.current.offsetLeft,
      scrollLeft: ref.current.scrollLeft,
      hasMoved: false,
    };
  }

  function onPointerMove(e) {
    if (!dragInfo.current.isDown || !ref.current) return;
    e.preventDefault();
    const x = e.pageX - ref.current.offsetLeft;
    const walk = (x - dragInfo.current.startX) * 1.4;
    ref.current.scrollLeft = dragInfo.current.scrollLeft - walk;
    if (Math.abs(walk) > 4) {
      dragInfo.current.hasMoved = true;
    }
  }

  function onPointerUp() {
    dragInfo.current.isDown = false;
  }

  return { ref, onPointerDown, onPointerMove, onPointerUp, dragInfo };
}

export function ChurchesToFollowCard({ onFollowToggle }) {
  const [followingMap, setFollowingMap] = useState({});
  const { ref, onPointerDown, onPointerMove, onPointerUp, dragInfo } = useDragScroll();

  function handleToggle(cId) {
    setFollowingMap((prev) => {
      const next = { ...prev, [cId]: !prev[cId] };
      playSound('reaction');
      return next;
    });
    onFollowToggle?.(cId);
  }

  return (
    <div className="home-highlight-card churches-card">
      <div className="home-highlight-header">
        <div className="hl-header-title">
          <Church size={17} className="hl-icon church-icon" />
          <span>Churches to Follow</span>
        </div>
        <Link href="/churches" className="hl-view-all">
          <span>Explore all</span>
          <ChevronRight size={14} />
        </Link>
      </div>

      <div
        ref={ref}
        className="churches-horizontal-scroll no-scrollbar"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {SAMPLE_CHURCHES.map((c) => {
          const isFollowing = !!followingMap[c.id];
          return (
            <div key={c.id} className={`church-color-card ${c.theme}`}>
              <div className="church-card-top">
                <Avatar name={c.name} src={c.avatar} className="avatar-md" />
                <div className="church-card-meta">
                  <span className="church-card-name" title={c.name}>{c.name}</span>
                  <span className="church-card-city">{c.city}</span>
                </div>
              </div>

              <span className="church-card-tag">{c.tag}</span>

              <div className="church-card-footer">
                <span className="church-card-members">{c.membersCount} members</span>
                <button
                  type="button"
                  className={`church-card-follow-btn${isFollowing ? ' following' : ''}`}
                  onClick={(e) => {
                    if (dragInfo.current.hasMoved) return;
                    e.stopPropagation();
                    handleToggle(c.id);
                  }}
                >
                  {isFollowing ? (
                    <>
                      <UserCheck size={12} />
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={12} />
                      <span>Follow</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PeopleToFollowCard({ onFollowToggle }) {
  const [followingMap, setFollowingMap] = useState({});
  const { ref, onPointerDown, onPointerMove, onPointerUp, dragInfo } = useDragScroll();

  function handleToggle(pId) {
    setFollowingMap((prev) => {
      const next = { ...prev, [pId]: !prev[pId] };
      playSound('reaction');
      return next;
    });
    onFollowToggle?.(pId);
  }

  return (
    <div className="home-highlight-card people-card">
      <div className="home-highlight-header">
        <div className="hl-header-title">
          <Users size={17} className="hl-icon people-icon" />
          <span>Fellowship People to Follow</span>
        </div>
        <Link href="/?tab=menu" className="hl-view-all">
          <span>Discover</span>
          <ChevronRight size={14} />
        </Link>
      </div>

      <div
        ref={ref}
        className="people-horizontal-scroll no-scrollbar"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {SAMPLE_PEOPLE.map((p) => {
          const isFollowing = !!followingMap[p.id];
          return (
            <div key={p.id} className={`person-color-card ${p.theme}`}>
              <div className="person-card-top">
                <Avatar name={p.name} src={p.avatar} className="avatar-md" />
                <div className="person-card-meta">
                  <div className="person-card-name-row">
                    <span className="person-card-name" title={p.name}>{p.name}</span>
                    {p.badge && <VerifiedBadge badge={p.badge} size={13} />}
                  </div>
                  <span className="person-card-role">{p.role}</span>
                </div>
              </div>

              <p className="person-card-bio">{p.bio}</p>

              <button
                type="button"
                className={`person-card-follow-btn${isFollowing ? ' following' : ''}`}
                onClick={(e) => {
                  if (dragInfo.current.hasMoved) return;
                  e.stopPropagation();
                  handleToggle(p.id);
                }}
              >
                {isFollowing ? (
                  <>
                    <UserCheck size={12} />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={12} />
                    <span>Follow</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TrendingReelsCard({ onSelectSection }) {
  const { ref, onPointerDown, onPointerMove, onPointerUp, dragInfo } = useDragScroll();

  return (
    <div className="home-highlight-card reels-shelf-card">
      <div className="home-highlight-header">
        <div className="hl-header-title">
          <Video size={17} className="hl-icon video-icon" />
          <span>Fellowship Reels &amp; Testimonies</span>
        </div>
        <button
          type="button"
          className="hl-view-all"
          onClick={() => onSelectSection?.('videos')}
        >
          <span>Watch all</span>
          <ChevronRight size={14} />
        </button>
      </div>

      <div
        ref={ref}
        className="reels-shelf-scroll no-scrollbar"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {SAMPLE_REELS.map((reel) => (
          <div
            key={reel.id}
            className="reel-color-card"
            onClick={() => {
              if (dragInfo.current.hasMoved) return;
              playSound('reaction');
              onSelectSection?.('videos');
            }}
          >
            <div
              className="reel-color-thumb"
              style={{ backgroundImage: `url(${reel.thumbnail})` }}
            >
              <div className="reel-color-overlay" />
              <div className="reel-play-center">
                <Play size={18} fill="#ffffff" />
              </div>
              <div className="reel-top-badges">
                <span className="reel-badge-pill">{reel.duration}</span>
                <span className="reel-badge-pill">{reel.views} views</span>
              </div>
              <div className="reel-bottom-info">
                <span className="reel-bottom-title">{reel.title}</span>
                <span className="reel-bottom-creator">{reel.creator}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ExploreTabsBanner({ onSelectSection }) {
  const SECTIONS = [
    { id: 'bible', label: 'Holy Bible', icon: BookOpen, color: '#10b981', desc: 'Read scripture & daily plan' },
    { id: 'podcasts', label: 'Audio & Songs', icon: Headphones, color: '#f59e0b', desc: 'Worship music & sermons' },
    { id: 'polls', label: 'Church Polls', icon: BarChart3, color: '#06b6d4', desc: 'Vote & share perspective' },
    { id: 'courses', label: 'Discipleship', icon: GraduationCap, color: '#8b5cf6', desc: 'Biblical growth academy' },
  ];

  return (
    <div className="explore-tabs-banner">
      <div className="banner-top-row">
        <Sparkles size={16} className="banner-sparkle-icon" />
        <span>Explore Shammah Fellowship Channels</span>
      </div>

      <div className="explore-tabs-grid">
        {SECTIONS.map((sec) => {
          const Icon = sec.icon;
          return (
            <button
              key={sec.id}
              type="button"
              className="explore-channel-card"
              style={{ '--sec-color': sec.color }}
              onClick={() => onSelectSection?.(sec.id)}
            >
              <span className="channel-icon-wrap">
                <Icon size={18} />
              </span>
              <div className="channel-meta">
                <strong>{sec.label}</strong>
                <small>{sec.desc}</small>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
