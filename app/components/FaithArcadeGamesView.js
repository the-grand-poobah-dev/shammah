'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Gamepad2,
  Trophy,
  Flame,
  Play,
  RotateCcw,
  Sparkles,
  Award,
  Clock,
  Users,
  Search,
  CheckCircle2,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
  Layers,
  Star,
  Target,
  BookOpen,
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
  StatStrip,
  ProgressBar,
  SkeletonLayout,
  EmptyState,
  ErrorState,
} from './layoutkit';
import {
  getArcadeHubData,
  TRIVIA_QUESTIONS,
  NOAH_ANIMALS,
} from '../lib/data/arcadeApi';
import ScriptureScrambleGame from './arcade/ScriptureScrambleGame';
import MemoryVerseMatchGame from './arcade/MemoryVerseMatchGame';
import BibleTriviaGame from './arcade/BibleTriviaGame';
import DavidSlingGame from './arcade/DavidSlingGame';
import NoahArkGame from './arcade/NoahArkGame';

export { TRIVIA_QUESTIONS, NOAH_ANIMALS };

const LEADERBOARD_TABS = [
  { id: 'weekly', label: 'This Week' },
  { id: 'daily', label: 'Today' },
  { id: 'all', label: 'All-Time' },
  { id: 'church', label: 'My Church' },
];

const GAME_FILTER_CHIPS = [
  { id: 'all', label: 'All Games', icon: '🎮' },
  { id: 'quiz', label: 'Bible Trivia', icon: '🏆' },
  { id: 'arcade', label: 'Action & Sling', icon: '🎯' },
  { id: 'puzzle', label: 'Word Puzzle', icon: '🧩' },
  { id: 'memory', label: 'Memory & Pairs', icon: '📖' },
];

export default function FaithArcadeGamesView({ session = null, profile = null }) {
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

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [games, setGames] = useState([]);
  const [dailyChallenge, setDailyChallenge] = useState(null);
  const [userProgress, setUserProgress] = useState([]);
  const [userAchievements, setUserAchievements] = useState([]);
  const [achievementsCatalog, setAchievementsCatalog] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);

  // Filter & tab states
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [leaderboardScope, setLeaderboardScope] = useState('weekly');
  const [activeGameSlug, setActiveGameSlug] = useState('trivia');

  // Active game modal launcher
  const [runningGameSlug, setRunningGameSlug] = useState(null);

  // Fetch hub data
  const loadHub = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const data = await getArcadeHubData({
          game: activeGameSlug,
          scope: leaderboardScope,
        });

        setGames(data.games || []);
        setDailyChallenge(data.dailyChallenge || null);
        setUserProgress(data.userProgress || []);
        setUserAchievements(data.userAchievements || []);
        setAchievementsCatalog(data.achievementsCatalog || []);
        setLeaderboard(data.leaderboard || []);
      } catch (err) {
        console.error('Failed to load arcade hub:', err);
        setError(err.message || 'Unable to load arcade games. Please check your connection.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeGameSlug, leaderboardScope]
  );

  useEffect(() => {
    loadHub();
  }, [loadHub]);

  // Find user's progress for a specific game
  function getGameBestScore(slug) {
    const prog = userProgress.find((p) => p.game_slug === slug);
    return prog?.best_score || 0;
  }

  function getGameStreak(slug) {
    const prog = userProgress.find((p) => p.game_slug === slug);
    return prog?.streak || 0;
  }

  function handleLaunchGame(slug) {
    playSound('reaction');
    setRunningGameSlug(slug);
  }

  function handleCloseRunningGame() {
    setRunningGameSlug(null);
    loadHub(true);
  }

  // Filtered games
  const filteredGames = useMemo(() => {
    if (selectedFilter === 'all') return games;
    return games.filter((g) => g.kind === selectedFilter);
  }, [games, selectedFilter]);

  // Overall player stats
  const totalPlays = useMemo(() => {
    return userProgress.reduce((sum, p) => sum + (p.plays || 0), 0);
  }, [userProgress]);

  const maxStreak = useMemo(() => {
    return userProgress.reduce((max, p) => Math.max(max, p.streak || 0), 0);
  }, [userProgress]);

  const highestScoreOverall = useMemo(() => {
    return userProgress.reduce((max, p) => Math.max(max, p.best_score || 0), 0);
  }, [userProgress]);

  return (
    <div className="w-full min-h-screen pb-24 md:pb-16 text-inherit animate-fadeIn">
      <ContentLayout
        title="Faith Champions Arcade"
        badge="Christian Gaming Hub"
        subtitle="Learn scripture, build daily devotion streaks, and compete with believers on fair community leaderboards."
        icon={Gamepad2}
        accent="#f59e0b"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadHub(true)}
              aria-label="Refresh arcade"
              className="p-2.5 rounded-xl border hover:opacity-80 transition-opacity"
              style={{
                borderColor: 'var(--border, rgba(255,255,255,0.15))',
                background: 'var(--surface-hover, rgba(255,255,255,0.04))',
              }}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => handleLaunchGame(dailyChallenge?.game?.slug || 'trivia')}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg flex items-center gap-1.5 transition-transform active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
              }}
            >
              <Flame className="w-4 h-4 fill-amber-200 text-amber-200" />
              <span>Play Daily 2x</span>
            </button>
          </div>
        }
      >
        {/* Stat Strip */}
        <StatStrip
          stats={[
            {
              label: 'Games Available',
              value: games.length || 5,
              icon: Gamepad2,
              color: '#f59e0b',
            },
            {
              label: 'Personal Best',
              value: highestScoreOverall > 0 ? `${highestScoreOverall} pts` : 'No score yet',
              icon: Trophy,
              color: '#10b981',
            },
            {
              label: 'Active Streak',
              value: maxStreak > 0 ? `${maxStreak} Days 🔥` : 'Start Today',
              icon: Flame,
              color: '#ef4444',
            },
            {
              label: 'Total Plays',
              value: totalPlays || 0,
              icon: Sparkles,
              color: '#8b5cf6',
            },
          ]}
        />

        {/* BLOCK 1: DAILY CHALLENGE SPOTLIGHT */}
        {dailyChallenge?.game && (
          <SectionBlock
            title="Daily Challenge Spotlight"
            icon={Flame}
            badge="2x Points Bonus"
            accent="#ef4444"
          >
            <div
              className="relative rounded-3xl overflow-hidden border p-5 sm:p-7 shadow-xl group transition-all"
              style={{
                background: 'linear-gradient(135deg, var(--surface, #1e293b) 0%, rgba(239, 68, 68, 0.15) 100%)',
                borderColor: 'rgba(239, 68, 68, 0.35)',
              }}
            >
              {dailyChallenge.game.cover_url && (
                <div className="absolute inset-0 opacity-20 mix-blend-luminosity pointer-events-none overflow-hidden">
                  <img
                    src={dailyChallenge.game.cover_url}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
              )}

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-3 max-w-xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white uppercase tracking-wider shadow-sm flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 fill-white" />
                      <span>Today&apos;s Daily Challenge</span>
                    </span>
                    <span className="text-xs font-mono text-amber-300 font-semibold drop-shadow">
                      2.0x Multiplier
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Resets in {dailyChallenge.expiresInHours || 12}h
                    </span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-white drop-shadow-md">
                    {dailyChallenge.game.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-300 line-clamp-2 leading-relaxed">
                    {dailyChallenge.game.description}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                    <span className="text-amber-300 font-bold">
                      Your Best: {getGameBestScore(dailyChallenge.game.slug)} pts
                    </span>
                    <span>·</span>
                    <span className="text-emerald-400 font-bold">
                      Current Streak: {getGameStreak(dailyChallenge.game.slug)}d 🔥
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end gap-3 flex-shrink-0">
                  <button
                    onClick={() => handleLaunchGame(dailyChallenge.game.slug)}
                    className="px-6 py-3.5 rounded-2xl font-black text-sm text-white shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95 hover:brightness-110"
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                    }}
                  >
                    <Play className="w-5 h-5 fill-white text-white" />
                    <span>Play Today&apos;s Challenge</span>
                  </button>
                </div>
              </div>
            </div>
          </SectionBlock>
        )}

        {/* BLOCK 2: CONTINUE PLAYING RAIL */}
        {userProgress.length > 0 && (
          <SectionBlock
            title="Continue Playing"
            icon={Sparkles}
            badge="Your Active Games"
            accent="#0ea5e9"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {userProgress.map((prog) => {
                const gameInfo = games.find((g) => g.slug === prog.game_slug) || {
                  slug: prog.game_slug,
                  title: prog.game_slug,
                  icon: '🎮',
                  accent: '#0ea5e9',
                };

                return (
                  <div
                    key={prog.game_slug}
                    className="p-4 rounded-2xl border flex items-center justify-between gap-3 group transition-all hover:border-sky-400/50"
                    style={{
                      background: 'var(--surface, #1e293b)',
                      borderColor: 'var(--border, rgba(255,255,255,0.1))',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-inner flex-shrink-0"
                        style={{
                          background: `${gameInfo.accent}20`,
                          color: gameInfo.accent,
                        }}
                      >
                        <span>{gameInfo.icon}</span>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-amber-400 transition-colors">
                          {gameInfo.title}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span className="text-amber-300 font-bold font-mono">
                            Best: {prog.best_score || 0} pts
                          </span>
                          <span>·</span>
                          <span>Level {prog.level || 1}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleLaunchGame(gameInfo.slug)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md hover:scale-105 active:scale-95 transition-transform flex-shrink-0"
                      style={{ background: gameInfo.accent || '#0ea5e9' }}
                      aria-label={`Play ${gameInfo.title}`}
                    >
                      <Play className="w-4 h-4 fill-white" />
                    </button>
                  </div>
                );
              })}
            </div>
          </SectionBlock>
        )}

        {/* BLOCK 3: ALL ARCADE GAMES (Magazine-X2 Layout) */}
        <SectionBlock
          title="All Arcade Games"
          icon={Layers}
          badge={`${games.length} Playable`}
          accent="#8b5cf6"
        >
          {/* Filter Chips */}
          <div className="mb-4">
            <FilterChips
              chips={GAME_FILTER_CHIPS}
              activeId={selectedFilter}
              onChange={(id) => setSelectedFilter(id)}
              accent="#8b5cf6"
            />
          </div>

          {loading ? (
            <SkeletonLayout count={4} layout="tiles" />
          ) : error ? (
            <ErrorState message={error} onRetry={() => loadHub(true)} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGames.map((g) => {
                const best = getGameBestScore(g.slug);
                const streak = getGameStreak(g.slug);
                const accent = g.accent || '#f59e0b';

                return (
                  <AccentCard
                    key={g.slug}
                    accent={accent}
                    className="cursor-pointer group flex flex-col justify-between"
                    onClick={() => handleLaunchGame(g.slug)}
                  >
                    <div className="space-y-3">
                      {/* Cover Photo */}
                      <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900">
                        <img
                          src={g.cover_url || 'https://images.unsplash.com/photo-1507842229451-7f01be8610ce?w=600'}
                          alt={g.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                          <span
                            className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white uppercase tracking-wider shadow-sm"
                            style={{ background: accent }}
                          >
                            {g.kind || 'Arcade'}
                          </span>
                        </div>

                        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-xs text-white drop-shadow">
                          <div className="flex items-center gap-1.5 font-bold font-mono">
                            <span className="text-xl">{g.icon}</span>
                            <span className="text-amber-300">{g.tagline || g.title}</span>
                          </div>
                          {streak > 0 && (
                            <span className="flex items-center gap-1 text-[11px] font-bold text-red-400">
                              <Flame className="w-3.5 h-3.5 fill-red-400" />
                              {streak}d
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h4 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                          {g.title}
                        </h4>
                        <p className="text-xs text-slate-300 line-clamp-2 mt-1 leading-relaxed">
                          {g.description}
                        </p>
                      </div>
                    </div>

                    {/* Stats & Launch CTA */}
                    <div className="pt-3 mt-3 border-t border-white/10 flex items-center justify-between">
                      <div className="text-xs space-y-0.5">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">
                          Personal Best
                        </span>
                        <span className="font-bold text-amber-300 font-mono">
                          {best > 0 ? `${best} pts` : 'Not played yet'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLaunchGame(g.slug);
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-1.5 transition-transform active:scale-95 group-hover:scale-105"
                        style={{ background: `linear-gradient(135deg, ${accent}, #10b981)` }}
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Play</span>
                      </button>
                    </div>
                  </AccentCard>
                );
              })}
            </div>
          )}
        </SectionBlock>

        {/* BLOCK 4: COMMUNITY LEADERBOARDS */}
        <SectionBlock
          title="Hall of Faith Leaderboards"
          icon={Trophy}
          badge="High Scores"
          accent="#f59e0b"
        >
          <div
            className="rounded-3xl border p-4 sm:p-6 space-y-4"
            style={{
              background: 'var(--surface, #1e293b)',
              borderColor: 'var(--border, rgba(255,255,255,0.1))',
            }}
          >
            {/* Scope tabs & Game Selector */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
              {/* Game Selector */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                {games.map((g) => (
                  <button
                    key={g.slug}
                    type="button"
                    onClick={() => setActiveGameSlug(g.slug)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      activeGameSlug === g.slug
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'bg-white/5 text-slate-300 hover:text-white'
                    }`}
                  >
                    <span>{g.icon}</span> <span className="ml-1">{g.title.split(' ')[0]}</span>
                  </button>
                ))}
              </div>

              {/* Scope Tabs: Weekly / Daily / All-Time / Church */}
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
                {LEADERBOARD_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setLeaderboardScope(tab.id)}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      leaderboardScope === tab.id
                        ? 'bg-white/15 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Leaderboard Table / Rows */}
            {leaderboard.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-400">
                No scores recorded for this scope yet. Be the first to play and claim the crown!
              </p>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((item, index) => {
                  const rank = index + 1;
                  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;

                  return (
                    <div
                      key={item.user_id || index}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                        rank <= 3
                          ? 'bg-gradient-to-r from-amber-500/10 to-transparent border-amber-500/30'
                          : 'bg-white/[0.02] border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-6 text-center font-bold text-xs">
                          {medal ? <span className="text-base">{medal}</span> : `#${rank}`}
                        </div>
                        <Avatar
                          src={item.avatar_url}
                          name={item.display_name || 'Believer'}
                          size={32}
                        />
                        <div>
                          <p className="text-xs font-bold text-white">
                            {item.display_name || 'Believer'}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {item.church_name || 'Kenya Believers'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-xs sm:text-sm font-black text-amber-300">
                          {item.score} pts
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SectionBlock>

        {/* BLOCK 5: ACHIEVEMENTS TILES */}
        <SectionBlock
          title="Faith Arcade Achievements"
          icon={Award}
          badge={`${userAchievements.length}/${achievementsCatalog.length || 8} Unlocked`}
          accent="#10b981"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {achievementsCatalog.map((ach) => {
              const isUnlocked = userAchievements.includes(ach.code);

              return (
                <div
                  key={ach.code}
                  className={`p-4 rounded-2xl border flex flex-col items-center text-center gap-2 transition-all ${
                    isUnlocked
                      ? 'border-emerald-400/40 bg-gradient-to-b from-emerald-500/10 to-transparent shadow-md'
                      : 'border-white/10 bg-white/[0.02] opacity-60'
                  }`}
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner"
                    style={{
                      background: isUnlocked ? '#10b98125' : 'rgba(255,255,255,0.05)',
                    }}
                  >
                    <span>{ach.icon}</span>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">{ach.title}</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-snug line-clamp-2">
                      {ach.description}
                    </p>
                  </div>
                  <div className="mt-auto pt-1">
                    {isUnlocked ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/20 text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 stroke-[3]" />
                        Unlocked!
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-mono">
                        +{ach.points} pts
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </SectionBlock>
      </ContentLayout>

      {/* ACTIVE GAME MODALS */}
      {runningGameSlug === 'scramble' && (
        <ScriptureScrambleGame
          isOpen={true}
          onClose={handleCloseRunningGame}
          currentUser={currentUser}
          bestScore={getGameBestScore('scramble')}
        />
      )}

      {runningGameSlug === 'match' && (
        <MemoryVerseMatchGame
          isOpen={true}
          onClose={handleCloseRunningGame}
          currentUser={currentUser}
          bestScore={getGameBestScore('match')}
        />
      )}

      {runningGameSlug === 'trivia' && (
        <BibleTriviaGame
          isOpen={true}
          onClose={handleCloseRunningGame}
          currentUser={currentUser}
          bestScore={getGameBestScore('trivia')}
        />
      )}

      {runningGameSlug === 'david' && (
        <DavidSlingGame
          isOpen={true}
          onClose={handleCloseRunningGame}
          currentUser={currentUser}
          bestScore={getGameBestScore('david')}
        />
      )}

      {runningGameSlug === 'ark' && (
        <NoahArkGame
          isOpen={true}
          onClose={handleCloseRunningGame}
          currentUser={currentUser}
          bestScore={getGameBestScore('ark')}
        />
      )}
    </div>
  );
}
