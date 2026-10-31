'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Flame,
  Sparkles,
  Trophy,
  Play,
  Pause,
  Heart,
  MessageCircle,
  Plus,
  Check,
  Award,
  ChevronRight,
  Search,
  RefreshCw,
  Clock,
  Users,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  Share2,
  Music,
} from 'lucide-react';
import Avatar from './Avatar';
import MemberName from './MemberName';
import { playSound } from '../lib/soundEffects';
import {
  ContentLayout,
  AccentCard,
  SectionBlock,
  LayoutSwitcher,
  FilterChips,
  SortMenu,
  StatStrip,
  ProgressBar,
  SkeletonLayout,
  EmptyState,
  ErrorState,
} from './layoutkit';
import {
  INITIAL_CHALLENGES,
  INITIAL_SUBMISSIONS,
  listChallenges,
  voteChallengeSubmission,
  joinChallenge,
} from '../lib/data/challengesApi';
import ChallengeCheckinModal from './challenges/ChallengeCheckinModal';
import ChallengeSubmitModal from './challenges/ChallengeSubmitModal';
import ChallengeCreatorModal from './challenges/ChallengeCreatorModal';
import ChallengeDetailModal from './challenges/ChallengeDetailModal';

export { INITIAL_CHALLENGES, INITIAL_SUBMISSIONS };

const CATEGORY_CHIPS = [
  { id: 'All', label: 'All Challenges' },
  { id: 'Prayer', label: 'Prayer', icon: '🙏' },
  { id: 'Fasting', label: 'Fasting', icon: '🕊️' },
  { id: 'Scripture memory', label: 'Scripture Memory', icon: '📖' },
  { id: 'Service', label: 'Acts of Service', icon: '🤝' },
  { id: 'Worship', label: 'Worship & Music', icon: '🎶' },
  { id: 'Generosity', label: 'Generosity', icon: '🎁' },
];

const SORT_OPTIONS = [
  { id: 'trending', label: 'Trending & Active' },
  { id: 'most_participants', label: 'Most Participants' },
  { id: 'newest', label: 'Newest First' },
  { id: 'points_high', label: 'Highest Points' },
];

export default function FaithChallengesView({ session, profile }) {
  const currentUser = useMemo(() => {
    if (profile?.id) {
      return {
        id: profile.id,
        name: profile.display_name || profile.full_name || 'Believer',
        avatar: profile.avatar_url,
        badge: profile.badge,
        church: profile.church_name,
      };
    }
    if (session?.user?.id) {
      return {
        id: session.user.id,
        name: session.user.user_metadata?.full_name || 'Believer',
        avatar: session.user.user_metadata?.avatar_url,
      };
    }
    return null;
  }, [session, profile]);

  // Data states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [challenges, setChallenges] = useState([]);
  const [todayChallenge, setTodayChallenge] = useState(null);
  const [myActive, setMyActive] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [badges, setBadges] = useState([]);

  // Filtering & controls
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('trending');
  const [search, setSearch] = useState('');
  const [layout, setLayout] = useState('magazine-flat');

  // Media playback
  const [playingVideoId, setPlayingVideoId] = useState(null);

  // Voting optimistic state
  const [votedMap, setVotedMap] = useState({});

  // Modals
  const [checkinModalOpen, setCheckinModalOpen] = useState(false);
  const [selectedCheckinChallenge, setSelectedCheckinChallenge] = useState(null);

  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [selectedSubmitChallenge, setSelectedSubmitChallenge] = useState(null);

  const [creatorModalOpen, setCreatorModalOpen] = useState(false);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDetailChallengeId, setSelectedDetailChallengeId] = useState(null);

  // Load challenges data
  const fetchData = useCallback(
    async (isPullToRefresh = false) => {
      try {
        if (isPullToRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const data = await listChallenges({
          category: category !== 'All' ? category : undefined,
          sort,
          search: search.trim() || undefined,
          userId: currentUser?.id,
        });

        setChallenges(data.challenges || []);
        setTodayChallenge(data.today_challenge || (data.challenges && data.challenges[0]) || null);
        setMyActive(data.my_active || []);
        setSubmissions(data.submissions || []);
        setLeaderboard(data.leaderboard || []);
        setBadges(data.badges || []);
      } catch (err) {
        console.error('Failed to load challenges:', err);
        setError(err.message || 'Unable to load faith challenges. Please try again.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [category, sort, search, currentUser?.id]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Cheer / Like submission
  async function handleVoteSubmission(subId) {
    playSound('reaction');
    const isCurrentlyVoted = !!votedMap[subId];

    // Optimistic toggle
    setVotedMap((prev) => ({ ...prev, [subId]: !isCurrentlyVoted }));
    setSubmissions((prev) =>
      prev.map((s) => {
        if (s.id === subId) {
          const currentCheers = s.cheers || s.like_count || 0;
          return {
            ...s,
            cheers: isCurrentlyVoted ? Math.max(0, currentCheers - 1) : currentCheers + 1,
            like_count: isCurrentlyVoted ? Math.max(0, currentCheers - 1) : currentCheers + 1,
          };
        }
        return s;
      })
    );

    try {
      await voteChallengeSubmission(subId);
    } catch (err) {
      console.error('Failed to vote:', err);
      // Rollback
      setVotedMap((prev) => ({ ...prev, [subId]: isCurrentlyVoted }));
    }
  }

  // Handle Fast Join
  async function handleFastJoin(ch) {
    playSound('reaction');
    try {
      await joinChallenge(ch.id);
      playSound('postPublished');
      fetchData(true);
    } catch (err) {
      alert(err.message || 'Could not join challenge.');
    }
  }

  // Media toggle (ensures only 1 plays at a time)
  function togglePlayVideo(subId) {
    if (playingVideoId === subId) {
      setPlayingVideoId(null);
    } else {
      playSound('click');
      setPlayingVideoId(subId);
    }
  }

  // Modals open triggers
  function triggerCheckin(ch) {
    setSelectedCheckinChallenge(ch);
    setCheckinModalOpen(true);
  }

  function triggerSubmit(ch) {
    setSelectedSubmitChallenge(ch);
    setSubmitModalOpen(true);
  }

  function triggerDetail(chId) {
    setSelectedDetailChallengeId(chId);
    setDetailModalOpen(true);
  }

  // Stats calculation
  const totalParticipants = useMemo(() => {
    return challenges.reduce((acc, c) => acc + (c.participants_count || c.participantsCount || 0), 0);
  }, [challenges]);

  const activeStreaksCount = useMemo(() => {
    return myActive.reduce((max, a) => Math.max(max, a.streak_current || 0), 0);
  }, [myActive]);

  return (
    <div className="w-full min-h-screen pb-24 md:pb-16 text-inherit animate-fadeIn">
      <ContentLayout
        title="Faith Challenges"
        badge="Habits & Devotion"
        subtitle="Build daily prayer, scripture, and worship streaks with believers across Kenya and beyond."
        icon={Flame}
        accent="#f59e0b"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchData(true)}
              aria-label="Refresh challenges"
              className="p-2.5 rounded-xl border hover:opacity-80 transition-opacity"
              style={{
                borderColor: 'var(--border, rgba(255,255,255,0.15))',
                background: 'var(--surface-hover, rgba(255,255,255,0.04))',
              }}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => {
                playSound('pop');
                setCreatorModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg flex items-center gap-1.5 transition-transform active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #ec4899)',
              }}
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create Challenge</span>
            </button>
          </div>
        }
      >
        {/* Stat Strip */}
        <StatStrip
          stats={[
            {
              label: 'Active Challenges',
              value: challenges.length || 6,
              icon: Sparkles,
              color: '#f59e0b',
            },
            {
              label: 'Participants',
              value: totalParticipants > 0 ? totalParticipants.toLocaleString() : '5,000+',
              icon: Users,
              color: '#10b981',
            },
            {
              label: 'Your Best Streak',
              value: activeStreaksCount > 0 ? `${activeStreaksCount} Days 🔥` : 'Start Today',
              icon: Flame,
              color: '#ef4444',
            },
            {
              label: 'Kingdom Points',
              value: myActive.reduce((acc, a) => acc + (a.points || 0), 0) || '0 pts',
              icon: Trophy,
              color: '#8b5cf6',
            },
          ]}
        />

        {/* BLOCK 1: TODAY'S CHALLENGE SPOTLIGHT */}
        {todayChallenge && (
          <SectionBlock
            title="Today's Challenge Spotlight"
            icon={Flame}
            badge="Daily Habit"
            accent={todayChallenge.accent || '#f59e0b'}
          >
            <div
              className="relative rounded-2xl overflow-hidden border p-5 sm:p-7 shadow-xl group transition-all"
              style={{
                background: `linear-gradient(135deg, var(--surface, #1e293b) 0%, ${todayChallenge.accent || '#f59e0b'}18 100%)`,
                borderColor: `${todayChallenge.accent || '#f59e0b'}40`,
              }}
            >
              {/* Background Cover Overlay */}
              {todayChallenge.cover_url && (
                <div className="absolute inset-0 opacity-15 mix-blend-luminosity pointer-events-none overflow-hidden">
                  <img
                    src={todayChallenge.cover_url}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
              )}

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-3 max-w-xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="px-2.5 py-0.5 rounded-full text-xs font-bold text-white uppercase tracking-wider shadow-sm"
                      style={{ background: todayChallenge.accent || '#f59e0b' }}
                    >
                      {todayChallenge.category || 'Prayer'}
                    </span>
                    <span className="font-mono text-xs font-semibold text-amber-300 drop-shadow">
                      {todayChallenge.tag || '#TodayInDevotion'}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {todayChallenge.duration_days ? `${todayChallenge.duration_days} Days Streak` : 'Daily Habit'}
                    </span>
                  </div>

                  <h3
                    onClick={() => triggerDetail(todayChallenge.id)}
                    className="text-xl sm:text-2xl font-black cursor-pointer hover:underline flex items-center gap-2"
                  >
                    <span>{todayChallenge.title}</span>
                    <ChevronRight className="w-5 h-5 text-amber-400" />
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-300 line-clamp-2 leading-relaxed">
                    {todayChallenge.description || todayChallenge.tagline}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                    <span className="flex items-center gap-1 font-semibold text-white">
                      <Users className="w-3.5 h-3.5 text-amber-400" />
                      {todayChallenge.participants_count || 1420} taking part
                    </span>
                    <span>·</span>
                    <span className="text-amber-300 font-bold">
                      +{todayChallenge.points || 100} Devotion Points
                    </span>
                  </div>
                </div>

                {/* Right Action Stack */}
                <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end gap-3 flex-shrink-0">
                  <button
                    onClick={() => triggerCheckin(todayChallenge)}
                    className="px-6 py-3.5 rounded-xl font-black text-sm text-white shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95 hover:brightness-110"
                    style={{
                      background: `linear-gradient(135deg, ${todayChallenge.accent || '#f59e0b'}, #ef4444)`,
                    }}
                  >
                    <Flame className="w-5 h-5 fill-amber-200 text-amber-200 animate-pulse" />
                    <span>Check In for Today</span>
                  </button>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => triggerSubmit(todayChallenge)}
                      className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-bold border border-white/20 hover:bg-white/5 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Share Video / Verse
                    </button>
                    <button
                      onClick={() => triggerDetail(todayChallenge.id)}
                      className="px-3 py-2 rounded-xl text-xs font-bold border border-white/20 hover:bg-white/5 transition-all"
                    >
                      Details & Rules
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </SectionBlock>
        )}

        {/* BLOCK 2: MY ACTIVE CHALLENGES */}
        {myActive.length > 0 && (
          <SectionBlock
            title="My Active Streaks"
            icon={TrendingUp}
            badge={`${myActive.length} In Progress`}
            accent="#10b981"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {myActive.map((item) => {
                const ch = item.challenge || item;
                const streak = item.streak_current || 0;
                const maxDays = ch.duration_days || 21;
                const progressPct = Math.min(100, Math.round((streak / maxDays) * 100));

                return (
                  <div
                    key={item.id || item.challenge_id || ch.id}
                    className="p-4 rounded-xl border flex flex-col justify-between gap-3 group transition-all hover:border-emerald-500/50"
                    style={{
                      background: 'var(--surface, #1e293b)',
                      borderColor: 'var(--border, rgba(255,255,255,0.1))',
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                          {ch.category || 'Habit'}
                        </span>
                        <h4
                          onClick={() => triggerDetail(ch.id)}
                          className="text-sm font-bold cursor-pointer hover:underline line-clamp-1"
                        >
                          {ch.title}
                        </h4>
                      </div>
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-xs font-bold">
                        <Flame className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{streak}d</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Progress: {streak}/{maxDays} days</span>
                        <span className="font-semibold text-white">{progressPct}%</span>
                      </div>
                      <ProgressBar value={progressPct} max={100} accent={ch.accent || '#10b981'} />
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-white/5">
                      <span className="text-[10px] text-slate-400">
                        {item.has_checked_in_today ? '✅ Checked in today' : '⏳ Needs check-in today'}
                      </span>
                      {item.has_checked_in_today ? (
                        <button
                          onClick={() => triggerDetail(ch.id)}
                          className="text-xs text-slate-400 hover:text-white"
                        >
                          View rules
                        </button>
                      ) : (
                        <button
                          onClick={() => triggerCheckin(ch)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all"
                        >
                          Check In
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionBlock>
        )}

        {/* BLOCK 3: TRENDING SUBMISSIONS (Reels / TikTok style vertical cards) */}
        {submissions.length > 0 && (
          <SectionBlock
            title="Community Submissions"
            icon={Play}
            badge="Videos & Praise"
            accent="#ec4899"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {submissions.map((sub) => {
                const isVoted = votedMap[sub.id];
                const cheersCount = (sub.cheers || sub.like_count || 0) + (isVoted ? 1 : 0);
                const isPlaying = playingVideoId === sub.id;

                return (
                  <div
                    key={sub.id}
                    className="group relative aspect-[9/15] rounded-2xl overflow-hidden border border-white/10 bg-black flex flex-col justify-between shadow-lg transition-all hover:scale-[1.01] hover:border-pink-500/40"
                  >
                    {/* Media Image / Video */}
                    <div className="absolute inset-0">
                      <img
                        src={sub.thumb_url || sub.media_url || sub.videoUrl}
                        alt={sub.caption || sub.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                    </div>

                    {/* Top Badges */}
                    <div className="relative z-10 p-2.5 flex items-start justify-between">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-black/60 text-amber-300 border border-white/10 backdrop-blur-sm">
                        {sub.scripture || sub.hashtag || sub.challengeTag || '#Faith'}
                      </span>
                      <button
                        onClick={() => togglePlayVideo(sub.id)}
                        aria-label={isPlaying ? 'Pause video' : 'Play video'}
                        className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 flex items-center justify-center hover:bg-black/80 transition-all"
                      >
                        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                      </button>
                    </div>

                    {/* Bottom Info & Cheer Action */}
                    <div className="relative z-10 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Avatar
                          src={sub.author?.avatar || sub.user?.avatar_url}
                          name={sub.author?.name || sub.user?.display_name || 'Believer'}
                          size={24}
                        />
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-white drop-shadow truncate">
                            {sub.author?.name || sub.user?.display_name || 'Believer'}
                          </p>
                          {(sub.author?.branch || sub.user?.church_name) && (
                            <p className="text-[10px] text-slate-300 truncate drop-shadow">
                              {sub.author?.branch || sub.user?.church_name}
                            </p>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-white/95 drop-shadow line-clamp-2">
                        {sub.caption || sub.title || sub.description}
                      </p>

                      {sub.audioTitle && (
                        <div className="flex items-center gap-1.5 text-[10px] text-amber-300/90 font-mono truncate">
                          <Music className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{sub.audioTitle}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-white/15 text-white">
                        <button
                          onClick={() => handleVoteSubmission(sub.id)}
                          className="flex items-center gap-1.5 text-xs font-bold hover:scale-110 active:scale-95 transition-transform"
                        >
                          <Heart
                            className={`w-4 h-4 ${
                              isVoted ? 'fill-red-500 text-red-500' : 'text-white'
                            }`}
                          />
                          <span>{cheersCount}</span>
                        </button>
                        <div className="flex items-center gap-1 text-[11px] text-slate-300">
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>{sub.commentsCount || sub.comment_count || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionBlock>
        )}

        {/* BLOCK 4: BROWSE ALL CHALLENGES */}
        <SectionBlock
          title="Browse Faith Challenges"
          icon={Layers}
          badge={`${challenges.length} Available`}
          accent="#8b5cf6"
        >
          {/* Controls: Search, Filter Chips, Sort & Layout Switcher */}
          <div className="space-y-3 mb-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search challenges by keyword, tag or scripture..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border bg-black/20 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
                  style={{ borderColor: 'var(--border, rgba(255,255,255,0.12))' }}
                />
              </div>

              {/* Sort & Layout Switcher */}
              <div className="flex items-center gap-2 justify-end">
                <SortMenu
                  options={SORT_OPTIONS}
                  value={sort}
                  onChange={(val) => setSort(val)}
                />
                <LayoutSwitcher
                  layouts={['magazine-flat', 'compact', 'tiles']}
                  value={layout}
                  onChange={(val) => setLayout(val)}
                />
              </div>
            </div>

            {/* Category Chips */}
            <FilterChips
              chips={CATEGORY_CHIPS}
              activeId={category}
              onChange={(id) => setCategory(id)}
              accent="#8b5cf6"
            />
          </div>

          {/* List States */}
          {loading ? (
            <SkeletonLayout count={4} layout={layout} />
          ) : error ? (
            <ErrorState message={error} onRetry={() => fetchData(true)} />
          ) : challenges.length === 0 ? (
            <EmptyState
              title="No challenges found"
              description="Try selecting another category or clearing your search term."
              actionLabel="Reset Filters"
              onAction={() => {
                setCategory('All');
                setSearch('');
              }}
            />
          ) : (
            <div
              className={
                layout === 'compact'
                  ? 'space-y-2'
                  : layout === 'tiles'
                  ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5'
                  : 'grid grid-cols-1 sm:grid-cols-2 gap-4'
              }
            >
              {challenges.map((ch) => {
                const accent = ch.accent || '#8b5cf6';
                const participantCount = ch.participants_count || ch.participantsCount || 0;

                if (layout === 'compact') {
                  return (
                    <div
                      key={ch.id}
                      onClick={() => triggerDetail(ch.id)}
                      className="p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer hover:border-amber-400/40 transition-all group"
                      style={{
                        background: 'var(--surface, #1e293b)',
                        borderColor: 'var(--border, rgba(255,255,255,0.08))',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                          style={{ background: `${accent}22`, color: accent }}
                        >
                          <Flame className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold line-clamp-1 group-hover:text-amber-400 transition-colors">
                              {ch.title}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {ch.tag}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-1">
                            {ch.description || ch.tagline}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs text-slate-400 font-semibold">
                          {participantCount} joined
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerCheckin(ch);
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm"
                          style={{ background: accent }}
                        >
                          Check In
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <AccentCard
                    key={ch.id}
                    accent={accent}
                    className="cursor-pointer group flex flex-col justify-between"
                    onClick={() => triggerDetail(ch.id)}
                  >
                    <div className="space-y-3">
                      {/* Card Cover */}
                      <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900">
                        <img
                          src={ch.cover_url || 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=600'}
                          alt={ch.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                        <div className="absolute top-2 left-2 flex items-center gap-1.5">
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white uppercase tracking-wider"
                            style={{ background: accent }}
                          >
                            {ch.category || 'Habit'}
                          </span>
                          {ch.badge && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {ch.badge}
                            </span>
                          )}
                        </div>

                        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs text-white drop-shadow">
                          <span className="font-mono text-amber-300 font-semibold">{ch.tag}</span>
                          <span className="flex items-center gap-1 text-[11px]">
                            <Clock className="w-3 h-3" />
                            {ch.duration_days ? `${ch.duration_days} Days` : 'Habit'}
                          </span>
                        </div>
                      </div>

                      {/* Title & Tagline */}
                      <div>
                        <h4 className="text-base font-bold line-clamp-1 group-hover:text-amber-400 transition-colors">
                          {ch.title}
                        </h4>
                        <p className="text-xs text-slate-300 line-clamp-2 mt-1 leading-relaxed">
                          {ch.description || ch.tagline}
                        </p>
                      </div>
                    </div>

                    {/* Card Actions & Stats */}
                    <div className="pt-3 mt-3 border-t border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Users className="w-3.5 h-3.5 text-amber-400" />
                        <span>{participantCount} participants</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerCheckin(ch);
                          }}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white shadow-md transition-transform active:scale-95"
                          style={{ background: accent }}
                        >
                          Check In
                        </button>
                      </div>
                    </div>
                  </AccentCard>
                );
              })}
            </div>
          )}
        </SectionBlock>

        {/* BLOCK 5: COMMUNITY LEADERBOARD */}
        <SectionBlock
          title="Community Devotion Leaderboard"
          icon={Trophy}
          badge="Top Believers"
          accent="#f59e0b"
        >
          <div
            className="rounded-2xl border p-4 sm:p-5"
            style={{
              background: 'var(--surface, #1e293b)',
              borderColor: 'var(--border, rgba(255,255,255,0.1))',
            }}
          >
            {leaderboard.length === 0 ? (
              <p className="text-center py-6 text-xs text-slate-400">
                Join a challenge and check in daily to appear on the leaderboard!
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {leaderboard.map((item, index) => {
                  const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;

                  return (
                    <div
                      key={item.user_id || index}
                      className="flex items-center justify-between p-3 rounded-xl border bg-black/10 border-white/5 hover:border-amber-400/30 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-6 text-center font-bold text-xs">
                          {medal ? <span className="text-sm">{medal}</span> : `#${index + 1}`}
                        </div>
                        <Avatar
                          src={item.user?.avatar_url || item.avatar}
                          name={item.user?.display_name || item.name || 'Believer'}
                          size={32}
                        />
                        <div>
                          <p className="text-xs font-bold text-white">
                            {item.user?.display_name || item.name || 'Believer'}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <span className="flex items-center gap-0.5 text-amber-300">
                              <Flame className="w-3 h-3 fill-amber-300" />
                              {item.streak_current || 0}d streak
                            </span>
                            <span>·</span>
                            <span>{item.user?.church_name || 'Kenya Believers'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-amber-400">
                          {item.points || 0} pts
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SectionBlock>

        {/* BLOCK 6: COMPLETED & BADGES EARNED */}
        <SectionBlock
          title="Milestone Badges"
          icon={Award}
          badge="Streak Rewards"
          accent="#10b981"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                id: 'spark',
                days: 3,
                title: 'Spiritual Spark',
                description: 'Complete 3 consecutive days of devotion.',
                icon: '⚡',
                unlocked: activeStreaksCount >= 3,
                color: '#f59e0b',
              },
              {
                id: 'steadfast',
                days: 7,
                title: 'Steadfast Believer',
                description: 'Hold a 7-day uninterrupted streak.',
                icon: '🛡️',
                unlocked: activeStreaksCount >= 7,
                color: '#0ea5e9',
              },
              {
                id: 'overcomer',
                days: 21,
                title: 'Overcomer',
                description: '21 days of unbroken faith habit formation.',
                icon: '🦅',
                unlocked: activeStreaksCount >= 21,
                color: '#8b5cf6',
              },
              {
                id: 'champion',
                days: 40,
                title: 'Kingdom Champion',
                description: '40 days of prayer and fasting like Christ.',
                icon: '👑',
                unlocked: activeStreaksCount >= 40,
                color: '#ec4899',
              },
            ].map((badge) => (
              <div
                key={badge.id}
                className={`p-4 rounded-2xl border flex flex-col items-center text-center gap-2 transition-all ${
                  badge.unlocked
                    ? 'border-amber-400/40 bg-gradient-to-b from-amber-500/10 to-transparent shadow-md'
                    : 'border-white/10 bg-white/[0.02] opacity-60'
                }`}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner"
                  style={{
                    background: badge.unlocked ? `${badge.color}25` : 'rgba(255,255,255,0.05)',
                  }}
                >
                  <span>{badge.icon}</span>
                </div>
                <div>
                  <h5 className="text-xs font-bold text-white">{badge.title}</h5>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                    {badge.description}
                  </p>
                </div>
                <div className="mt-auto pt-1">
                  {badge.unlocked ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 flex items-center gap-1">
                      <Check className="w-3 h-3 stroke-[3]" />
                      Unlocked!
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-mono">
                      {activeStreaksCount}/{badge.days} days
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SectionBlock>
      </ContentLayout>

      {/* MODALS */}
      {/* 1. Daily Checkin Sheet Modal */}
      <ChallengeCheckinModal
        isOpen={checkinModalOpen}
        onClose={() => setCheckinModalOpen(false)}
        challenge={selectedCheckinChallenge}
        currentUser={currentUser}
        onCheckinSuccess={() => {
          fetchData(true);
        }}
      />

      {/* 2. Video / Verse Submission Modal */}
      <ChallengeSubmitModal
        isOpen={submitModalOpen}
        onClose={() => setSubmitModalOpen(false)}
        challenge={selectedSubmitChallenge}
        currentUser={currentUser}
        onSubmitted={() => {
          fetchData(true);
        }}
      />

      {/* 3. Creation Wizard Modal */}
      <ChallengeCreatorModal
        isOpen={creatorModalOpen}
        onClose={() => setCreatorModalOpen(false)}
        currentUser={currentUser}
        onCreated={() => {
          fetchData(true);
        }}
      />

      {/* 4. Full Challenge Detail & Calendar Modal */}
      <ChallengeDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        challengeId={selectedDetailChallengeId}
        currentUser={currentUser}
        onOpenCheckin={(ch) => {
          setDetailModalOpen(false);
          triggerCheckin(ch);
        }}
        onOpenSubmit={(ch) => {
          setDetailModalOpen(false);
          triggerSubmit(ch);
        }}
      />
    </div>
  );
}
