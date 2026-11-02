'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Flame,
  Calendar,
  CheckCircle2,
  Trophy,
  Users,
  Share2,
  Sparkles,
  BookOpen,
  ArrowRight,
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
import Avatar from '../Avatar';
import MemberName from '../MemberName';
import { playSound } from '../../lib/soundEffects';
import { getChallengeDetail, joinChallenge, leaveChallenge, voteChallengeSubmission, moderateChallengeSubmission, deleteChallengeSubmission } from '../../lib/data/challengesApi';

export default function ChallengeDetailModal({
  isOpen,
  onClose,
  challengeId,
  initialChallenge = null,
  currentUser = null,
  onOpenCheckin,
  onOpenSubmit,
}) {
  const [activeTab, setActiveTab] = useState('overview'); // overview, submissions, leaderboard
  const [challengeData, setChallengeData] = useState(initialChallenge);
  const [loading, setLoading] = useState(!initialChallenge);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaderboardScope, setLeaderboardScope] = useState('all');
  const [copiedLink, setCopiedLink] = useState(false);
  const [votingMap, setVotingMap] = useState({});
  const [playingSubmissionId, setPlayingSubmissionId] = useState(null);

  useEffect(() => {
    if (!isOpen || !challengeId) return;

    let isMounted = true;
    async function loadDetail() {
      try {
        setLoading(true);
        const data = await getChallengeDetail(challengeId, leaderboardScope);
        if (isMounted) {
          setChallengeData(data);
          setVotingMap(Object.fromEntries((data.user_votes || []).map((id) => [id, true])));
        }
      } catch (err) {
        console.error('Failed to load challenge details:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDetail();
    return () => {
      isMounted = false;
    };
  }, [isOpen, challengeId, leaderboardScope]);

  if (!isOpen) return null;

  const challenge = challengeData?.challenge || initialChallenge || {};
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

  async function handleLeave() {
    if (leaving || !challenge?.id) return;
    setLeaving(true);
    try {
      await leaveChallenge(challenge.id);
      setChallengeData((prev) => ({
        ...prev,
        participant: null,
        challenge: { ...challenge, participants_count: Math.max(0, Number(challenge.participants_count || 0) - 1) },
      }));
    } catch (err) {
      alert(err.message || 'Could not leave challenge.');
    } finally {
      setLeaving(false);
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

  const canModerate = Boolean(
    currentUser?.id && (
      currentUser.id === challenge.creator_id ||
      ['admin', 'platform_admin', 'moderator'].includes(currentUser.role)
    )
  );

  async function handleModerateSubmission(submissionId, decision) {
    try {
      await moderateChallengeSubmission(submissionId, decision);
      setChallengeData((prev) => ({
        ...prev,
        submissions: decision === 'approve'
          ? (prev.submissions || []).map((item) => item.id === submissionId ? { ...item, status: 'approved' } : item)
          : (prev.submissions || []).filter((item) => item.id !== submissionId),
      }));
    } catch (err) {
      alert(err.message || 'Could not review this submission.');
    }
  }

  async function handleDeleteSubmission(submissionId) {
    try {
      await deleteChallengeSubmission(submissionId);
      setChallengeData((prev) => ({ ...prev, submissions: (prev.submissions || []).filter((item) => item.id !== submissionId) }));
    } catch (err) {
      alert(err.message || 'Could not remove this submission.');
    }
  }

  function handleSubmissionPlay(event, submissionId) {
    document.querySelectorAll('[data-faith-challenge-video]').forEach((video) => {
      if (video !== event.currentTarget) video.pause();
    });
    setPlayingSubmissionId(submissionId);
  }

  function handleShare() {
    playSound('postPublished');
    const url = typeof window !== 'undefined' ? `${window.location.origin}/challenges?id=${challenge.id}` : '';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  }

  // Generate a real rolling 28-day check-in calendar using calendar dates.
  const daysInGrid = Array.from({ length: 28 }, (_, i) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - (27 - i));
    const dateKey = date.toISOString().slice(0, 10);
    const isChecked = recentCheckins.some((item) => String(item.day || '').slice(0, 10) === dateKey);
    return { dateKey, label: date.getDate(), date, isChecked };
  });

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="challenge-detail-title"
    >
      <div
        className="w-full max-w-3xl max-h-[94dvh] flex flex-col rounded-2xl overflow-hidden shadow-2xl border"
        style={{
          background: 'var(--surface, #1e293b)',
          borderColor: 'var(--border, rgba(255,255,255,0.12))',
          color: 'var(--ink, #f8fafc)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cover Hero Banner */}
        <div className="relative h-44 sm:h-56 w-full flex-shrink-0 overflow-hidden bg-slate-900">
          <img
            src={challenge.cover_url || 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=1000'}
            alt={challenge.title || 'Challenge Banner'}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

          {/* Close & Share Top Buttons */}
          <div className="absolute top-3.5 right-3.5 flex items-center gap-2">
            <button
              onClick={handleShare}
              aria-label="Share challenge"
              className="px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md bg-black/50 text-white border border-white/20 flex items-center gap-1.5 hover:bg-black/70 transition-all"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Link Copied!' : 'Share'}</span>
            </button>
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="w-8 h-8 rounded-full backdrop-blur-md bg-black/50 text-white border border-white/20 flex items-center justify-center hover:bg-black/70 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tag, Category & Title on Banner */}
          <div className="absolute bottom-3 left-4 right-4 sm:bottom-4 sm:left-6 sm:right-6">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span
                className="px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white shadow-sm uppercase tracking-wide"
                style={{ background: accent }}
              >
                {challenge.category || 'Faith Habit'}
              </span>
              <span className="text-xs font-mono text-amber-300 font-semibold drop-shadow-md">
                {challenge.tag || '#FaithChallenge'}
              </span>
              <span className="text-xs text-white/80 drop-shadow flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {challenge.duration_days ? `${challenge.duration_days} Days` : 'Ongoing'}
              </span>
            </div>
            <h1 id="challenge-detail-title" className="text-xl sm:text-2xl font-black text-white drop-shadow-md line-clamp-1">
              {challenge.title}
            </h1>
          </div>
        </div>

        {/* Tab Switcher & Action Bar */}
        <div
          className="flex items-center justify-between px-4 sm:px-6 py-2.5 border-b flex-shrink-0"
          style={{ borderColor: 'var(--border, rgba(255,255,255,0.1))' }}
        >
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'overview'
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Overview & Rules
            </button>
            <button
              onClick={() => setActiveTab('submissions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'submissions'
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Submissions</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                {submissions.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'leaderboard'
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Leaderboard</span>
            </button>
          </div>

          {/* Quick CTA */}
          <div className="flex items-center gap-2">
            {isJoined && (
              <button
                type="button"
                onClick={handleLeave}
                disabled={leaving}
                className="min-h-11 px-3 rounded-xl text-xs font-semibold border disabled:opacity-60"
                style={{ borderColor: 'var(--border)', color: 'var(--ink-muted)' }}
              >
                {leaving ? 'Leaving…' : 'Leave'}
              </button>
            )}
            {!isJoined ? (
              <button
                onClick={handleJoin}
                disabled={joining}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-1.5 transition-transform active:scale-95"
                style={{ background: `linear-gradient(135deg, ${accent}, #ec4899)` }}
              >
                {joining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flame className="w-3.5 h-3.5 fill-amber-200" />}
                Join Challenge
              </button>
            ) : hasCheckedInToday ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                <CheckCircle2 className="w-4 h-4" />
                <span>Checked-in Today!</span>
              </div>
            ) : (
              <button
                onClick={() => onOpenCheckin && onOpenCheckin({ ...challenge, has_checked_in_today: hasCheckedInToday, currentStreak: streak })}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-1.5 transition-transform active:scale-95"
                style={{ background: `linear-gradient(135deg, #10b981, #059669)` }}
              >
                <Flame className="w-3.5 h-3.5 fill-amber-200" />
                Check In Today (+{challenge.points || 100} pts)
              </button>
            )}
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
              <p className="text-xs text-slate-400">Loading challenge data...</p>
            </div>
          ) : activeTab === 'overview' ? (
            <>
              {/* Participant Progress Strip (if joined) */}
              {isJoined && (
                <div
                  className="p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4"
                  style={{
                    background: `${accent}10`,
                    borderColor: `${accent}30`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-inner"
                      style={{ background: `linear-gradient(135deg, ${accent}, #ef4444)` }}
                    >
                      <Flame className="w-7 h-7 fill-white drop-shadow" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-black">{streak} Day Streak!</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold">
                          Best: {participant.streak_best || streak}d
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        {hasCheckedInToday
                          ? '🔥 Amazing devotion! Come back tomorrow to keep the flame alive.'
                          : '⚡ Check in before midnight so your streak doesn’t reset!'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-base font-black text-amber-400">
                        {participant.points || 0} pts
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">Earned</div>
                    </div>
                    {!hasCheckedInToday && (
                      <button
                        onClick={() => onOpenCheckin && onOpenCheckin(challenge)}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-white shadow-md bg-emerald-600 hover:bg-emerald-500 transition-all"
                      >
                        Check-in Now
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Tagline & Description */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">About this Challenge</h3>
                <p className="text-sm sm:text-base leading-relaxed text-slate-200">
                  {challenge.description}
                </p>
              </div>

              {/* Daily Rules / Markdown block */}
              <div
                className="p-4 rounded-xl border space-y-2"
                style={{
                  background: 'var(--surface-hover, rgba(255,255,255,0.03))',
                  borderColor: 'var(--border, rgba(255,255,255,0.1))',
                }}
              >
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
                  <BookOpen className="w-4 h-4" />
                  <span>Rules & Daily Instructions</span>
                </div>
                <div className="text-xs leading-relaxed text-slate-300 whitespace-pre-line pl-6">
                  {challenge.rules_md || '1. Read the daily devotion and scripture.\n2. Pray for 10-15 minutes.\n3. Tap Check-in to log your day and reflect.'}
                </div>
              </div>

              {/* 28-day Heatmap Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span className="uppercase tracking-wider">Check-in Calendar (Past 28 Days)</span>
                  <span className="text-[11px] font-normal text-slate-400">
                    {recentCheckins.length} check-in{recentCheckins.length !== 1 ? 's' : ''} logged
                  </span>
                </div>
                <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5 p-3 rounded-xl bg-black/20 border border-white/5">
                  {daysInGrid.map((day) => (
                    <div
                      key={day.dateKey}
                      className={`h-7 rounded-md flex flex-col items-center justify-center text-[10px] font-mono transition-all ${
                        day.isChecked
                          ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 font-bold shadow-sm'
                          : 'bg-white/5 text-slate-500'
                      }`}
                      title={day.isChecked ? day.date.toLocaleDateString() + ': Checked in' : day.date.toLocaleDateString() + ': No check-in'}
                    >
                      {day.isChecked ? <Check className="w-3 h-3 stroke-[3]" /> : day.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Share and Action Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Users className="w-4 h-4" />
                  <span>
                    <strong className="text-white">{Number(challenge.participants_count || 0).toLocaleString()}</strong> believers participating
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenSubmit && onOpenSubmit(challenge)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold border border-white/20 hover:bg-white/5 transition-all flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Share Video / Testimony
                  </button>
                </div>
              </div>
            </>
          ) : activeTab === 'submissions' ? (
            /* Submissions Grid */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold">Community Video Submissions</h3>
                  <p className="text-xs text-slate-400">
                    Watch and cheer on believers taking on {challenge.tag || 'this challenge'}
                  </p>
                </div>
                <button
                  onClick={() => onOpenSubmit && onOpenSubmit(challenge)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-1.5"
                  style={{ background: `linear-gradient(135deg, ${accent}, #ec4899)` }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Submit Your Video
                </button>
              </div>

              {submissions.length === 0 ? (
                <div className="text-center py-12 p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                  <Play className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-sm font-semibold">No video submissions yet</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Be the first to record a 60-second video reciting scripture, playing acoustic praise, or sharing a testimony!
                  </p>
                  <button
                    onClick={() => onOpenSubmit && onOpenSubmit(challenge)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-400 transition-all inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Record First Entry
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {submissions.map((sub) => {
                    const isVoted = votingMap[sub.id];
                    const cheerCount = (sub.cheers || sub.like_count || 0) + (isVoted ? 1 : 0);

                    return (
                      <div
                        key={sub.id}
                        className="rounded-xl overflow-hidden border border-white/10 bg-slate-900 flex flex-col group transition-all hover:border-amber-400/40"
                      >
                        {/* Media Preview (9:16 aspect) */}
                        <div className="relative aspect-[9/14] bg-black overflow-hidden">
                          {sub.media_type === 'video' ? (
                            <video
                              data-faith-challenge-video
                              data-submission-id={sub.id}
                              src={sub.media_url || sub.videoUrl}
                              poster={sub.thumb_url || undefined}
                              controls
                              playsInline
                              preload="metadata"
                              onPlay={(event) => handleSubmissionPlay(event, sub.id)}
                              onPause={() => setPlayingSubmissionId((current) => current === sub.id ? null : current)}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <img
                              src={sub.thumb_url || sub.media_url || sub.videoUrl}
                              alt={sub.caption || sub.title || 'Challenge submission'}
                              loading="lazy"
                              className="w-full h-full object-contain"
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                          {/* Scripture Tag */}
                          {(sub.scripture || sub.hashtag) && (
                            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-mono bg-black/60 text-amber-300 border border-white/10 backdrop-blur-sm">
                              {sub.scripture || sub.hashtag}
                            </div>
                          )}

                          {/* Cheer Button on Overlay */}
                          <button
                            onClick={() => handleVote(sub.id)}
                            className="absolute bottom-2.5 right-2.5 flex flex-col items-center gap-0.5 p-1.5 rounded-xl bg-black/60 backdrop-blur-sm border border-white/10 hover:scale-110 active:scale-95 transition-all text-white"
                          >
                            <Heart
                              className={`w-4 h-4 ${
                                isVoted ? 'fill-red-500 text-red-500' : 'text-white'
                              }`}
                            />
                            <span className="text-[10px] font-bold">{cheerCount}</span>
                          </button>

                          {/* Author & Caption */}
                          <div className="absolute bottom-2.5 left-2.5 right-12 text-left">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Avatar
                                src={sub.author?.avatar || sub.user?.avatar_url}
                                name={sub.author?.name || sub.user?.display_name || 'Believer'}
                                size={18}
                              />
                              <span className="text-xs font-bold text-white drop-shadow truncate">
                                {sub.author?.name || sub.user?.display_name || 'Believer'}
                              </span>
                            </div>
                            <p className="text-[11px] text-white/90 line-clamp-2 drop-shadow">
                              {sub.caption || sub.title || sub.description}
                            </p>
                          </div>
                        </div>

                        {/* Audio metadata footer */}
                        {sub.audioTitle && (
                          <div className="px-2.5 py-1.5 bg-black/40 border-t border-white/5 flex items-center gap-1.5 text-[10px] text-slate-400 truncate">
                            <Music className="w-3 h-3 text-amber-300 flex-shrink-0" />
                            <span className="truncate">{sub.audioTitle}</span>
                          </div>
                        )}
                        {(canModerate || sub.user_id === currentUser?.id) && (
                          <div className="flex flex-wrap items-center gap-2 p-2 border-t border-white/10 bg-black/30">
                            {sub.status === 'pending_review' && canModerate && (
                              <>
                                <button type="button" onClick={() => handleModerateSubmission(sub.id, 'approve')} className="min-h-11 flex-1 rounded-lg bg-emerald-600 px-2 text-xs font-bold text-white">Approve</button>
                                <button type="button" onClick={() => handleModerateSubmission(sub.id, 'reject')} className="min-h-11 flex-1 rounded-lg bg-red-600/80 px-2 text-xs font-bold text-white">Reject</button>
                              </>
                            )}
                            <button type="button" onClick={() => handleDeleteSubmission(sub.id)} className="min-h-11 rounded-lg border border-white/15 px-3 text-xs font-semibold text-slate-300">Remove</button>
                            {sub.status === 'pending_review' && <span className="text-[10px] text-amber-300">Awaiting review</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Leaderboard Tab */
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Challenge Devotion Leaderboard</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Believers ranked by earned devotion points and streaks
                </p>
              </div>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Leaderboard scope">
                {[
                  { id: 'all', label: 'All time' },
                  { id: 'week', label: 'This week' },
                  { id: 'church', label: 'My church' },
                ].map((scope) => (
                  <button
                    key={scope.id}
                    type="button"
                    aria-pressed={leaderboardScope === scope.id}
                    onClick={() => setLeaderboardScope(scope.id)}
                    className="min-h-11 px-3 rounded-xl border text-xs font-semibold transition-colors"
                    style={{
                      borderColor: leaderboardScope === scope.id ? accent : 'var(--border)',
                      background: leaderboardScope === scope.id ? accent + '22' : 'var(--surface)',
                      color: 'var(--ink)',
                    }}
                  >
                    {scope.label}
                  </button>
                ))}
              </div>

              {leaderboard.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400">
                  No participants on the leaderboard yet. Be the first to check in!
                </div>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((item, index) => {
                    const isTop3 = index < 3;
                    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;

                    return (
                      <div
                        key={item.user_id || index}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                          isTop3
                            ? 'bg-gradient-to-r from-amber-500/10 to-transparent border-amber-500/30'
                            : 'bg-white/[0.02] border-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-6 text-center font-bold text-sm">
                            {medal ? <span className="text-base">{medal}</span> : `#${index + 1}`}
                          </div>
                          <Avatar
                            src={item.user?.avatar_url || item.avatar}
                            name={item.user?.display_name || item.name || 'Believer'}
                            size={34}
                          />
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span>{item.user?.display_name || item.name || 'Believer'}</span>
                              {item.user?.church_name && (
                                <span className="text-[10px] text-slate-400 font-normal">
                                  ({item.user.church_name})
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                              <span>{item.streak_current || 0} day streak</span>
                              <span className="mx-1">·</span>
                              <span>Best: {item.streak_best || 0}d</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xs font-black text-amber-300">
                            {item.points || 0} pts
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
