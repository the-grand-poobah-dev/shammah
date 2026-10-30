/**
 * Layout Kit Visual Review & Playground Route
 * Route: /layout-kit
 * 
 * Dev-only test harness allowing comprehensive inspection of:
 *  - All 7 layouts (magazine-flat, magazine-x2, list-rich, rail, compact, tiles, spotlight)
 *  - AccentCard variants (wash, edge, neon, minimal)
 *  - LayoutSwitcher with real-time switching
 *  - Width simulator (320px, 420px, 680px, 900px, 1200px, 100%) for container-query reflow
 *  - Light and Dark theme toggle
 *  - Companions: MediaThumb, MetaChips, ProgressBar, FilterChips, SortMenu, StatStrip,
 *    SkeletonLayout, EmptyState, ErrorState, InfiniteSentinel
 */

'use client';

import React, { useState } from 'react';
import {
  Video,
  Headphones,
  BookOpen,
  Heart,
  Trophy,
  Flame,
  Calendar,
  Clock,
  Eye,
  Share2,
  Bookmark,
  Play,
  Sun,
  Moon,
  Smartphone,
  Tablet,
  Monitor,
  Maximize2,
  Layers,
  Sparkles,
} from 'lucide-react';

import {
  ContentLayout,
  AccentCard,
  SectionBlock,
  LayoutSwitcher,
  MediaThumb,
  MetaChips,
  ProgressBar,
  FilterChips,
  SortMenu,
  StatStrip,
  SkeletonLayout,
  EmptyState,
  ErrorState,
  InfiniteSentinel,
} from '../components/layoutkit';

// Sample mock data for testing layout kit
const SAMPLE_SERMONS = [
  {
    id: 'sermon-1',
    title: 'Walking in the Fullness of the Spirit',
    speaker: 'Pastor Mwangi',
    church: 'Nairobi Faith Chapel',
    category: 'Theology',
    duration: '48:15',
    views: '1.2k',
    date: '2 days ago',
    thumb: 'https://images.unsplash.com/photo-1544427920-c49ccfb85579?w=800&auto=format&fit=crop&q=80',
    desc: 'An inspiring message on trusting God during difficult seasons and unlocking peace in daily living.',
    accent: '#06b6d4',
  },
  {
    id: 'sermon-2',
    title: 'The Power of Prevailing Prayer',
    speaker: 'Rev. Grace Achieng',
    church: 'Grace Harvest Eldoret',
    category: 'Prayer',
    duration: '35:20',
    views: '840',
    date: '4 days ago',
    thumb: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800&auto=format&fit=crop&q=80',
    desc: 'Unpacking James 5:16 and discovering how persistent intercession transforms communities.',
    accent: '#8b5cf6',
  },
  {
    id: 'sermon-3',
    title: 'Kingdom Stewardship & Generosity',
    speaker: 'Pastor David Omondi',
    church: 'Kingdom Life Kisumu',
    category: 'Leadership',
    duration: '42:10',
    views: '2.1k',
    date: '1 week ago',
    thumb: 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=800&auto=format&fit=crop&q=80',
    desc: 'Biblical wisdom for managing resources, business stewardship, and giving cheerfully.',
    accent: '#f59e0b',
  },
  {
    id: 'sermon-4',
    title: 'Anchored: Faith for the Modern Generation',
    speaker: 'Evangelist Brian Kamau',
    church: 'Revival Centre Mombasa',
    category: 'Youth',
    duration: '29:50',
    views: '3.4k',
    date: '1 week ago',
    thumb: 'https://images.unsplash.com/photo-1519791883288-dc8bd696e667?w=800&auto=format&fit=crop&q=80',
    desc: 'Reaching Gen-Z believers with authentic fellowship and uncompromising gospel truth.',
    accent: '#ec4899',
  },
  {
    id: 'sermon-5',
    title: 'Worship as a Lifestyle: Behind the Veil',
    speaker: 'Minister Sarah Wanjiku',
    church: 'Citadel of Praise Nakuru',
    category: 'Worship',
    duration: '52:00',
    views: '4.8k',
    date: '2 weeks ago',
    thumb: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&auto=format&fit=crop&q=80',
    desc: 'Cultivating true intimacy with the Father beyond Sunday mornings.',
    accent: '#10b981',
  },
];

const SAMPLE_COURSES = [
  {
    id: 'course-1',
    title: 'Foundations of Christian Discipleship',
    modules: '8 Modules',
    level: 'Beginner',
    progress: 75,
    accent: '#0ea5e9',
    thumb: 'https://images.unsplash.com/photo-1507842229451-7f01be8610ce?w=800&auto=format&fit=crop&q=80',
    desc: 'Master the core pillars of the Christian walk: prayer, scripture, fellowship, and evangelism.',
  },
  {
    id: 'course-2',
    title: 'Biblical Leadership & Ministry Team Ethics',
    modules: '6 Modules',
    level: 'Intermediate',
    progress: 30,
    accent: '#8b5cf6',
    thumb: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&auto=format&fit=crop&q=80',
    desc: 'Practical guidance for deacons, cell leaders, and ministry team coordinators.',
  },
  {
    id: 'course-3',
    title: 'Biblical Financial Wisdom & Enterprise',
    modules: '5 Modules',
    level: 'All Levels',
    progress: 100,
    accent: '#10b981',
    thumb: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&auto=format&fit=crop&q=80',
    desc: 'Navigating personal finance, debt-free living, and Kingdom business in East Africa.',
  },
];

const SAMPLE_CATEGORIES = [
  { id: 'cat-theology', title: 'Theology', count: '142 Sermons', icon: BookOpen, accent: '#06b6d4' },
  { id: 'cat-prayer', title: 'Prayer & Fasting', count: '89 Audio', icon: Flame, accent: '#8b5cf6' },
  { id: 'cat-worship', title: 'Worship Sessions', count: '215 Videos', icon: Headphones, accent: '#ec4899' },
  { id: 'cat-youth', title: 'Youth & Campus', count: '67 Tracks', icon: Sparkles, accent: '#f59e0b' },
  { id: 'cat-missions', title: 'Missions & Outreach', count: '43 Stories', icon: Heart, accent: '#10b981' },
  { id: 'cat-bible', title: 'Scripture Studies', count: '198 Lessons', icon: Layers, accent: '#0ea5e9' },
];

const SAMPLE_LEADERBOARD = [
  { id: 'lead-1', name: 'Faith Wambui', score: '3,850 pts', rank: 1, streak: '28 days' },
  { id: 'lead-2', name: 'Joshua Kiprop', score: '3,420 pts', rank: 2, streak: '21 days' },
  { id: 'lead-3', name: 'Mary Otieno', score: '3,190 pts', rank: 3, streak: '19 days' },
  { id: 'lead-4', name: 'Samuel Mutua', score: '2,940 pts', rank: 4, streak: '14 days' },
];

export default function LayoutKitPage() {
  const [containerWidth, setContainerWidth] = useState('100%');
  const [theme, setTheme] = useState('dark');
  const [dynamicLayout, setDynamicLayout] = useState('magazine-flat');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('recent');
  const [showSkeletons, setShowSkeletons] = useState(false);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    document.body.className = `theme-${nextTheme}`;
  };

  return (
    <div className="layout-kit-page" style={{ padding: '24px 16px 80px', maxWidth: '1300px', margin: '0 auto' }}>
      {/* Dev Control Bar */}
      <div
        className="layout-kit-bar"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '14px 18px',
          marginBottom: '28px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}
      >
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 2px', color: 'var(--ink)' }}>
            Shammah Layout Kit Playground
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--ink-muted)', margin: 0 }}>
            Container-query driven layouts for section pages. Current container: <strong>{containerWidth}</strong>
          </p>
        </div>

        {/* Viewport Width Simulators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: 'var(--ink-muted)', marginRight: '4px' }}>Container:</span>
          {[
            { label: '320px', value: '320px', icon: Smartphone },
            { label: '420px', value: '420px', icon: Smartphone },
            { label: '680px', value: '680px', icon: Tablet },
            { label: '900px', value: '900px', icon: Monitor },
            { label: '1200px', value: '1200px', icon: Monitor },
            { label: '100%', value: '100%', icon: Maximize2 },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              className={`filter-chip ${containerWidth === preset.value ? 'is-active' : ''}`}
              style={{ minHeight: '36px', padding: '4px 10px', fontSize: '12px' }}
              onClick={() => setContainerWidth(preset.value)}
            >
              <preset.icon size={13} />
              <span>{preset.label}</span>
            </button>
          ))}
        </div>

        {/* Action Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="filter-chip"
            style={{ minHeight: '36px', padding: '4px 12px', fontSize: '12px' }}
            onClick={() => setShowSkeletons(!showSkeletons)}
          >
            <span>{showSkeletons ? 'Show Content' : 'Show Skeletons'}</span>
          </button>

          <button
            type="button"
            className="filter-chip is-active"
            style={{ minHeight: '36px', padding: '4px 12px', fontSize: '12px' }}
            onClick={toggleTheme}
            aria-label="Toggle dark/light theme"
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            <span style={{ textTransform: 'capitalize' }}>{theme}</span>
          </button>
        </div>
      </div>

      {/* Main Container Simulation Wrapper */}
      <div
        className="layout-kit-stage"
        style={{
          width: containerWidth,
          maxWidth: '100%',
          margin: '0 auto',
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '36px',
        }}
      >
        {/* StatStrip Companion */}
        <StatStrip
          items={[
            { label: 'Total Videos', value: '342', change: '+14%', icon: Video, accent: '#06b6d4' },
            { label: 'Podcast Hours', value: '1,280h', change: '+8%', icon: Headphones, accent: '#8b5cf6' },
            { label: 'Courses Enrolled', value: '48', change: '+22%', icon: BookOpen, accent: '#10b981' },
            { label: 'Faith Champions', value: '890', change: '+35%', icon: Trophy, accent: '#f59e0b' },
          ]}
        />

        {/* 1. Interactive Switchable Section Block */}
        <SectionBlock
          title="Interactive Switcher Demonstration"
          subtitle="Toggle the icon buttons on the right to dynamically change layout modes"
          icon={Video}
          count={SAMPLE_SERMONS.length}
          accent="#06b6d4"
          action={
            <LayoutSwitcher
              value={dynamicLayout}
              onChange={setDynamicLayout}
              storageKey="playground-demo"
            />
          }
        >
          {showSkeletons ? (
            <SkeletonLayout layout={dynamicLayout} count={4} />
          ) : (
            <ContentLayout
              layout={dynamicLayout}
              items={SAMPLE_SERMONS}
              renderItem={(item, idx, { isHero }) => (
                <AccentCard
                  key={item.id}
                  accent={item.accent}
                  variant={isHero ? 'edge' : 'wash'}
                  onClick={() => alert(`Clicked sermon: ${item.title}`)}
                >
                  {dynamicLayout === 'list-rich' ? (
                    <div className="list-rich-card">
                      <div className="list-rich-card__thumb-wrap">
                        <MediaThumb
                          src={item.thumb}
                          alt={item.title}
                          aspect="16/9"
                          duration={item.duration}
                          badge={item.category}
                          fallbackAccent={item.accent}
                        />
                      </div>
                      <div className="list-rich-card__body">
                        <div>
                          <MetaChips
                            items={[
                              { label: item.church, accent: item.accent },
                              { label: item.speaker },
                            ]}
                          />
                          <h3 className="list-rich-card__title" style={{ marginTop: '4px' }}>
                            {item.title}
                          </h3>
                          <p className="list-rich-card__desc">{item.desc}</p>
                        </div>
                        <div className="list-rich-card__footer">
                          <MetaChips
                            items={[
                              { icon: Eye, label: item.views },
                              { icon: Clock, label: item.date },
                            ]}
                          />
                          <div className="list-rich-card__actions">
                            <button
                              type="button"
                              className="section-block__see-all-btn"
                              style={{ minHeight: '36px', minWidth: '36px', padding: '6px' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                alert('Share clicked');
                              }}
                              aria-label="Share"
                            >
                              <Share2 size={16} />
                            </button>
                            <button
                              type="button"
                              className="section-block__see-all-btn"
                              style={{ minHeight: '36px', minWidth: '36px', padding: '6px' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                alert('Saved');
                              }}
                              aria-label="Save"
                            >
                              <Bookmark size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : dynamicLayout === 'compact' ? (
                    <div className="compact-card">
                      <div className="compact-card__icon" style={{ color: item.accent }}>
                        <Play size={16} />
                      </div>
                      <span className="compact-card__title">{item.title}</span>
                      <span className="compact-card__meta">{item.duration}</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <MediaThumb
                        src={item.thumb}
                        alt={item.title}
                        aspect={isHero ? '16/9' : '16/9'}
                        duration={item.duration}
                        badge={item.category}
                        fallbackAccent={item.accent}
                      />
                      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                        <MetaChips
                          items={[
                            { label: item.speaker, accent: item.accent },
                            { icon: Clock, label: item.duration },
                          ]}
                        />
                        <h3
                          style={{
                            fontSize: isHero ? '18px' : '15px',
                            fontWeight: 700,
                            margin: 0,
                            color: 'var(--ink)',
                            lineHeight: 1.35,
                          }}
                        >
                          {item.title}
                        </h3>
                        <p
                          style={{
                            fontSize: '13px',
                            color: 'var(--ink-muted)',
                            margin: 0,
                            lineHeight: 1.4,
                            display: '-webkit-box',
                            WebkitLineClamp: isHero ? 3 : 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  )}
                </AccentCard>
              )}
            />
          )}
        </SectionBlock>

        {/* 2. Spotlight Full-Bleed Layout */}
        <SectionBlock
          title="Spotlight Layout"
          subtitle="High-impact banner for featured live broadcasts, conferences, or main series"
          icon={Sparkles}
          accent="#ec4899"
        >
          <ContentLayout
            layout="spotlight"
            items={[SAMPLE_SERMONS[0]]}
            renderItem={(item) => (
              <AccentCard accent="#ec4899" variant="neon">
                <div className="spotlight-card">
                  <div className="spotlight-card__media">
                    <img src={item.thumb} alt={item.title} />
                    <div className="spotlight-card__scrim">
                      <MetaChips
                        items={[
                          { label: 'Featured Sermon', accent: '#ec4899' },
                          { icon: Calendar, label: 'Sunday Live' },
                        ]}
                      />
                      <h3 className="spotlight-card__title" style={{ marginTop: '8px' }}>
                        {item.title}
                      </h3>
                      <p className="spotlight-card__desc">{item.desc}</p>
                      <button
                        type="button"
                        className="spotlight-card__cta"
                        onClick={() => alert('Starting playback...')}
                      >
                        <Play size={16} fill="currentColor" />
                        <span>Watch Full Service ({item.duration})</span>
                      </button>
                    </div>
                  </div>
                </div>
              </AccentCard>
            )}
          />
        </SectionBlock>

        {/* 3. Horizontal Rail Layout */}
        <SectionBlock
          title="Horizontal Rail Layout"
          subtitle="Scroll-snap row with drag-to-scroll, edge fades, and hover arrow buttons"
          icon={Headphones}
          count="5 episodes"
          accent="#8b5cf6"
          onSeeAll={() => alert('See all episodes clicked')}
        >
          <ContentLayout
            layout="rail"
            items={SAMPLE_SERMONS}
            railCardWidth="230px"
            renderItem={(item) => (
              <AccentCard
                key={item.id}
                accent={item.accent}
                variant="wash"
                onClick={() => alert(`Play track: ${item.title}`)}
              >
                <MediaThumb
                  src={item.thumb}
                  alt={item.title}
                  aspect="1/1"
                  duration={item.duration}
                  badge={item.category}
                  fallbackAccent={item.accent}
                />
                <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <MetaChips items={[{ label: item.speaker }]} />
                  <h4
                    style={{
                      fontSize: '13.5px',
                      fontWeight: 600,
                      color: 'var(--ink)',
                      margin: 0,
                      lineHeight: 1.3,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.title}
                  </h4>
                  <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                    {item.church}
                  </span>
                </div>
              </AccentCard>
            )}
          />
        </SectionBlock>

        {/* 4. Discipleship Courses & ProgressBar Companions */}
        <SectionBlock
          title="Discipleship Courses (List-Rich & ProgressBar)"
          subtitle="Rich rows with progress bars, completion percentage, and action cluster"
          icon={BookOpen}
          accent="#10b981"
        >
          <ContentLayout
            layout="list-rich"
            items={SAMPLE_COURSES}
            renderItem={(course) => (
              <AccentCard key={course.id} accent={course.accent} variant="wash">
                <div className="list-rich-card">
                  <div className="list-rich-card__thumb-wrap">
                    <MediaThumb
                      src={course.thumb}
                      alt={course.title}
                      aspect="16/9"
                      badge={course.level}
                      fallbackAccent={course.accent}
                    />
                  </div>
                  <div className="list-rich-card__body">
                    <div>
                      <MetaChips
                        items={[
                          { label: course.modules, accent: course.accent },
                          { label: course.level },
                        ]}
                      />
                      <h3 className="list-rich-card__title" style={{ marginTop: '4px' }}>
                        {course.title}
                      </h3>
                      <p className="list-rich-card__desc">{course.desc}</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <ProgressBar
                        value={course.progress}
                        max={100}
                        color={course.accent}
                        label="Course Progress"
                        showPercent={true}
                      />
                    </div>
                  </div>
                </div>
              </AccentCard>
            )}
          />
        </SectionBlock>

        {/* 5. Coloured Accent Tiles Grid */}
        <SectionBlock
          title="Accent Tiles Layout"
          subtitle="Auto-fit grid for categories, ministries, and statistics"
          icon={Layers}
          count="6 categories"
          accent="#f97316"
        >
          <ContentLayout
            layout="tiles"
            items={SAMPLE_CATEGORIES}
            renderItem={(cat) => {
              const Icon = cat.icon;
              return (
                <AccentCard
                  key={cat.id}
                  accent={cat.accent}
                  variant="wash"
                  onClick={() => alert(`Category: ${cat.title}`)}
                >
                  <div className="tile-card">
                    <div className="tile-card__icon">
                      <Icon size={18} strokeWidth={2.2} />
                    </div>
                    <div>
                      <h4 className="tile-card__title">{cat.title}</h4>
                      <span className="tile-card__meta">{cat.count}</span>
                    </div>
                  </div>
                </AccentCard>
              );
            }}
          />
        </SectionBlock>

        {/* 6. Compact Layout (Leaderboards & Queues) */}
        <SectionBlock
          title="Compact Layout (Scripture Champions Leaderboard)"
          subtitle="Dense single-line rows for fast scanning and ranks"
          icon={Trophy}
          accent="#f59e0b"
        >
          <ContentLayout
            layout="compact"
            items={SAMPLE_LEADERBOARD}
            renderItem={(user) => (
              <AccentCard key={user.id} accent="#f59e0b" variant="minimal">
                <div className="compact-card">
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '999px',
                      background: user.rank === 1 ? '#f59e0b' : 'color-mix(in srgb, var(--ink) 10%, transparent)',
                      color: user.rank === 1 ? '#ffffff' : 'var(--ink)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '12px',
                    }}
                  >
                    {user.rank}
                  </div>
                  <span className="compact-card__title">{user.name}</span>
                  <span className="compact-card__meta" style={{ fontWeight: 600, color: 'var(--teal)' }}>
                    {user.score}
                  </span>
                  <MetaChips items={[{ icon: Flame, label: user.streak, accent: '#f97316' }]} />
                </div>
              </AccentCard>
            )}
          />
        </SectionBlock>

        {/* 7. Companions Showcase: FilterChips, SortMenu, EmptyState, ErrorState */}
        <SectionBlock
          title="Companion Controls & Feedback States"
          subtitle="Filter chips, sort popovers, empty states, and accessible error banners"
          icon={Layers}
          accent="#0d9488"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Filter and Sort Row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <FilterChips
                options={[
                  { id: 'all', label: 'All Sermons', count: 18 },
                  { id: 'recent', label: 'Recent', count: 6 },
                  { id: 'popular', label: 'Popular', count: 9 },
                  { id: 'saved', label: 'Bookmarked', count: 3 },
                ]}
                value={filter}
                onChange={setFilter}
              />
              <SortMenu
                options={[
                  { id: 'recent', label: 'Newest First' },
                  { id: 'views', label: 'Most Viewed' },
                  { id: 'duration', label: 'Shortest' },
                ]}
                value={sort}
                onChange={setSort}
              />
            </div>

            {/* ErrorState Demo */}
            <ErrorState
              title="Connection interrupted"
              message="Could not load latest church announcements. Tap retry to reconnect."
              onRetry={() => alert('Retrying connection...')}
            />

            {/* EmptyState Demo */}
            <EmptyState
              icon={Video}
              title="No live broadcasts at this moment"
              hint="Check back on Wednesday 6:30 PM for mid-week prayer or explore recorded sermon series."
              action={
                <button
                  type="button"
                  className="spotlight-card__cta"
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                  onClick={() => alert('Browsing sermon library...')}
                >
                  <span>Explore Sermon Library</span>
                </button>
              }
            />

            {/* Infinite Sentinel Demo */}
            <InfiniteSentinel
              onVisible={() => console.log('Sentinel triggered')}
              hasMore={true}
              isLoading={true}
            />
          </div>
        </SectionBlock>
      </div>
    </div>
  );
}
