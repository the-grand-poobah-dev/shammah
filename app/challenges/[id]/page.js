'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Flame,
  Calendar,
  CheckCircle2,
  Trophy,
  Users,
  Share2,
  Sparkles,
  BookOpen,
  Plus,
  Play,
  Heart,
  MessageCircle,
  Clock,
  ShieldCheck,
  Check,
  Loader2,
  Award,
  Music,
} from 'lucide-react';
import { useSession } from '../../../lib/useSession';
import Avatar from '../../components/Avatar';
import { playSound } from '../../lib/soundEffects';
import { getChallengeDetail, joinChallenge, voteChallengeSubmission } from '../../lib/data/challengesApi';
import ChallengeCheckinModal from '../../components/challenges/ChallengeCheckinModal';
import ChallengeSubmitModal from '../../components/challenges/ChallengeSubmitModal';
import { ProgressBar } from '../../components/layoutkit';

export default function ChallengeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const { session, profile } = useSession();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [challengeData, setChallengeData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview, submissions, leaderboard
  const [copiedLink, setCopiedLink] = useState(false);
  const [votingMap, setVotingMap] = useState({});
  const [joining, setJoining] = useState(false);

  // Modals
  const [isCheckinOpen, setIsCheckinOpen] = useState(false);
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);

  useEffect(() => {
    if (!id) return;

    let isMounted = true;
    async function fetchDetail() {
      try {
        setLoading(true);
        setError('');
        const data = await getChallengeDetail(id);
        if (isMounted) {
          setChallengeData(data);
        }
      } catch (err) {
        console.error('Failed to load challenge details:', err);
        if (isMounted) setError(err.message || 'Challenge not found.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const challenge = challengeData?.challenge || {};
  const participant = challengeData?.participant || null;
  const submissions = challengeData?.submissions || [];
  const leaderboard = challengeData?.leaderboard || [];
  const recentCheckins = challengeData?.recent_checkins || [];

  const isJoined = !!participant;
  const streak = participant?.streak_current || 0;
  const hasCheckedInToday = participant?.has_checked_in_today || false;
  const accent = challenge?.accent || '#f59e0b';

  async function handleJoin() {
    if (joining) return;
    setJoining(true);
    playSound('reaction');

    try {
      const res = await joinChallenge(challenge.id);
      playSound('postPublished');
      setChallengeData((prev) => ({
        ...prev,
        participant: res.participant || {
          joined_at: new Date().toISOString(),
          streak_current: 0,
          streak_best: 0,
          points: 0,
          has_checked_in_today: false,
        },
        challenge: {
          ...challenge,
          participants_count: (challenge.participants_count || 0) + 1,
        },
      }));
    } catch (err) {
      alert(err.message || 'Could not join challenge.');
    } finally {
      setJoining(false);
    }
  }

  async function handleVote(subId) {
    playSound('reaction');
    setVotingMap((prev) => ({ ...prev, [subId]: !prev[subId] }));

    try {
      await voteChallengeSubmission(subId);
    } catch (err) {
      console.error('Vote failed:', err);
      setVotingMap((prev) => ({ ...prev, [subId]: !prev[subId] }));
    }
  }

  function handleShare() {
    playSound('postPublished');
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  }

  const daysInGrid = Array.from({ length: 28 }, (_, i) => {
    const dayNumber = i + 1;
    const isChecked = recentCheckins.some((c) => {
      const date = new Date(c.day);
      return date.getDate() === dayNumber;
    });
    return { dayNumber, isChecked };
  });

  return (
    <main className="shell">
      <div className="subpage-nav-header">
        <header className="topbar">
          <div className="brand" style={{ gap: 10 }}>
            <Link
              href="/challenges"
              className="action-btn"
              style={{ minHeight: 36, padding: '6px 10px', textDecoration: 'none' }}
              aria-label="Back to challenges"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="brand-text-wrap">
              <h1 className="brand-mark" style={{ fontSize: '18px' }}>
                {challenge.title || 'Faith Challenge'}
              </h1>
              <span className="brand-subtext">{challenge.tag || 'Daily Habit & Devotion'}</span>
            </div>
          </div>
        </header>
      </div>

      <div style={{ marginTop: '16px' }} className="max-w-4xl mx-auto px-3 sm:px-4 pb-20">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
            <p className="text-xs text-slate-400">Loading challenge...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
            <p className="text-sm font-bold text-red-400">{error}</p>
            <Link href="/challenges" className="inline-block px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-white">
              Back to all challenges
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Hero Cover Card */}
            <div className="relative h-60 sm:h-72 rounded-3xl overflow-hidden border border-white/10 bg-slate-900 shadow-xl">
              <img
                src={challenge.cover_url || 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=1200'}
                alt={challenge.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

              <div className="absolute top-4 right-4 flex items-center gap-2">
                <button
                  onClick={handleShare}
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md bg-black/60 text-white border border-white/20 flex items-center gap-1.5 hover:bg-black/80 transition-all"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Link Copied!' : 'Share'}</span>
                </button>
              </div>

              <div className="absolute bottom-5 left-5 right-5 sm:bottom-6 sm:left-7 sm:right-7">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span
                    className="px-3 py-0.5 rounded-full text-xs font-bold text-white uppercase tracking-wider"
                    style={{ background: accent }}
                  >
                    {challenge.category || 'Habit'}
                  </span>
                  <span className="text-xs font-mono text-amber-300 font-bold drop-shadow">
                    {challenge.tag}
                  </span>
                  <span className="text-xs text-white/80 drop-shadow flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {challenge.duration_days ? `${challenge.duration_days} Days Streak` : 'Daily'}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white drop-shadow-md">
                  {challenge.title}
                </h2>
              </div>
            </div>

            {/* Action Bar & Tabs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'overview' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Overview & Rules
                </button>
                <button
                  onClick={() => setActiveTab('submissions')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'submissions' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>Submissions</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20">
                    {submissions.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('leaderboard')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'leaderboard' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Leaderboard</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {!isJoined ? (
                  <button
                    onClick={handleJoin}
                    disabled={joining}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg flex items-center justify-center gap-2"
                    style={{ background: `linear-gradient(135deg, ${accent}, #ec4899)` }}
                  >
                    <Flame className="w-4 h-4 fill-amber-200" />
                    <span>Join Challenge</span>
                  </button>
                ) : hasCheckedInToday ? (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Checked-in Today!</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsCheckinOpen(true)}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg flex items-center justify-center gap-2"
                    style={{ background: `linear-gradient(135deg, #10b981, #059669)` }}
                  >
                    <Flame className="w-4 h-4 fill-amber-200" />
                    <span>Check In for Today</span>
                  </button>
                )}
              </div>
            </div>

            {/* Tab 1: Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {isJoined && (
                  <div
                    className="p-5 rounded-2xl border flex flex-wrap items-center justify-between gap-4"
                    style={{ background: `${accent}12`, borderColor: `${accent}35` }}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black shadow-inner"
                        style={{ background: `linear-gradient(135deg, ${accent}, #ef4444)` }}
                      >
                        <Flame className="w-7 h-7 fill-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-black">{streak} Day Devotion Streak</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold">
                            Best: {participant.streak_best || streak}d
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          {hasCheckedInToday
                            ? 'Checked in for today! Keep your focus on Christ.'
                            : 'Check in today to maintain your consecutive streak.'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-black text-amber-400">{participant.points || 0} pts</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">Devotion Points</div>
                    </div>
                  </div>
                )}

                <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.02] space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Challenge Purpose & Tagline
                  </h3>
                  <p className="text-sm sm:text-base leading-relaxed text-slate-200">
                    {challenge.description}
                  </p>
                </div>

                <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.02] space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    <span>Rules & Daily Practice</span>
                  </h3>
                  <div className="text-xs leading-relaxed text-slate-300 whitespace-pre-line pl-6">
                    {challenge.rules_md || '1. Read the daily devotion and scripture.\n2. Pray for 10-15 minutes.\n3. Tap Check-in to log your day and reflect.'}
                  </div>
                </div>

                {/* 28-day Heatmap */}
                <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.02] space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                    <span className="uppercase tracking-wider">Check-in Calendar (Past 28 Days)</span>
                    <span>{recentCheckins.length} check-ins logged</span>
                  </div>
                  <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5 p-3 rounded-xl bg-black/30 border border-white/5">
                    {daysInGrid.map((day) => (
                      <div
                        key={day.dayNumber}
                        className={`h-8 rounded-md flex flex-col items-center justify-center text-[10px] font-mono ${
                          day.isChecked
                            ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 font-bold'
                            : 'bg-white/5 text-slate-500'
                        }`}
                      >
                        {day.isChecked ? <Check className="w-3 h-3 stroke-[3]" /> : day.dayNumber}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Submissions */}
            {activeTab === 'submissions' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold">Community Video Submissions</h3>
                  <button
                    onClick={() => setIsSubmitOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-1.5"
                    style={{ background: `linear-gradient(135deg, ${accent}, #ec4899)` }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Submit Video
                  </button>
                </div>

                {submissions.length === 0 ? (
                  <div className="text-center py-16 p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                    <Play className="w-10 h-10 text-slate-600 mx-auto" />
                    <p className="text-sm font-semibold">No submissions yet</p>
                    <button
                      onClick={() => setIsSubmitOpen(true)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-500 inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Record First Video
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {submissions.map((sub) => {
                      const isVoted = votingMap[sub.id];
                      const cheerCount = (sub.cheers || sub.like_count || 0) + (isVoted ? 1 : 0);

                      return (
                        <div
                          key={sub.id}
                          className="rounded-2xl overflow-hidden border border-white/10 bg-slate-900 flex flex-col group hover:border-amber-400/40 transition-all"
                        >
                          <div className="relative aspect-[9/14] bg-black overflow-hidden">
                            <img
                              src={sub.thumb_url || sub.media_url || sub.videoUrl}
                              alt={sub.caption || sub.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                            <button
                              onClick={() => handleVote(sub.id)}
                              className="absolute bottom-3 right-3 flex flex-col items-center gap-0.5 p-1.5 rounded-xl bg-black/60 backdrop-blur-sm border border-white/10 text-white"
                            >
                              <Heart className={`w-4 h-4 ${isVoted ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                              <span className="text-[10px] font-bold">{cheerCount}</span>
                            </button>

                            <div className="absolute bottom-3 left-3 right-12 text-left">
                              <p className="text-xs font-bold text-white drop-shadow truncate">
                                {sub.author?.name || sub.user?.display_name || 'Believer'}
                              </p>
                              <p className="text-[11px] text-white/90 line-clamp-2 drop-shadow">
                                {sub.caption || sub.title || sub.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Leaderboard */}
            {activeTab === 'leaderboard' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Challenge Devotion Leaderboard</span>
                </h3>

                <div className="space-y-2">
                  {leaderboard.map((item, index) => {
                    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;
                    return (
                      <div
                        key={item.user_id || index}
                        className="flex items-center justify-between p-3.5 rounded-2xl border bg-white/[0.02] border-white/5"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-6 text-center font-bold text-sm">
                            {medal ? <span className="text-base">{medal}</span> : `#${index + 1}`}
                          </div>
                          <Avatar
                            src={item.user?.avatar_url || item.avatar}
                            name={item.user?.display_name || item.name || 'Believer'}
                            size={36}
                          />
                          <div>
                            <div className="text-xs font-bold text-white">
                              {item.user?.display_name || item.name || 'Believer'}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                              <span>{item.streak_current || 0} day streak</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xs font-black text-amber-300">{item.points || 0} pts</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <ChallengeCheckinModal
        isOpen={isCheckinOpen}
        onClose={() => setIsCheckinOpen(false)}
        challenge={challenge}
        currentUser={profile || session?.user}
        onCheckinSuccess={() => {
          // reload detail
          getChallengeDetail(id).then(setChallengeData);
        }}
      />

      <ChallengeSubmitModal
        isOpen={isSubmitOpen}
        onClose={() => setIsSubmitOpen(false)}
        challenge={challenge}
        currentUser={profile || session?.user}
        onSubmitted={() => {
          getChallengeDetail(id).then(setChallengeData);
        }}
      />
    </main>
  );
}
