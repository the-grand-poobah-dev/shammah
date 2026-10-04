'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Grid,
  LayoutGrid,
  List,
  Columns,
  Pin,
  Lock,
  Unlock,
  MessageCircle,
  Share2,
  Settings,
  Sparkles,
  Music,
  Video,
  FileText,
  BarChart3,
  Disc,
  Play,
  Heart,
  Repeat,
  Shield,
  Check,
  GraduationCap,
  Award,
  DownloadCloud,
  Tv,
  Flame,
} from 'lucide-react';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import MemberBadge from './MemberBadge';
import PostCard from './PostCard';
import WatermarkShareModal from './WatermarkShareModal';
import ProjectionModeModal from './ProjectionModeModal';
import { COURSES_CATALOG } from './CoursesView';
import { supabase } from '../../lib/supabaseClient';
import {
  setAuthorOfflineDownloadPermission,
  getAuthorOfflineDownloadPermission,
} from '../lib/offlineSyncManager';
import {
  getProfileSettings,
  updateProfileSettings,
  isFollowing,
  toggleFollow,
  getUserPlaylists,
  fetchFollowStats,
} from '../lib/profileManager';
import { getUserRepostsCount } from '../lib/postInteractions';
import { categoryStyle } from '../lib/postDisplay';
import VerificationBadgeModal from './VerificationBadgeModal';
import ActivityLog from './ActivityLog';
import { ShieldCheck as ShieldCheckIcon } from 'lucide-react';

export default function UserProfileView({
  targetProfile,
  currentUser,
  session,
  userPosts = [],
  onOpenAuth,
}) {
  const [activeTab, setActiveTab] = useState('all'); // all | videos | audio | polls | text | playlists | courses
  const [layoutMode, setLayoutMode] = useState('magazine2'); // magazine1 | magazine2 | magazine3 | list
  const [isFollowingUser, setIsFollowingUser] = useState(() => (targetProfile?.id ? isFollowing(targetProfile.id) : false));
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [privacySettings, setPrivacySettings] = useState({ isLocked: false, inboxPermission: 'everyone' });
  const [allowOffline, setAllowOffline] = useState(true);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showWatermarkModal, setShowWatermarkModal] = useState(false);
  const [watermarkData, setWatermarkData] = useState(null);
  const [projectingCourse, setProjectingCourse] = useState(null);
  const [shareToast, setShareToast] = useState('');

  const isMe = currentUser?.id && targetProfile?.id === currentUser.id;
  const authorName = targetProfile?.name || targetProfile?.display_name || 'Fellowship Member';
  const role = targetProfile?.role || 'member';
  const badge = targetProfile?.badge;
  const verified = targetProfile?.badge_verified;

  useEffect(() => {
    let cancelled = false;
    if (targetProfile?.id) {
      setIsFollowingUser(isFollowing(targetProfile.id));
      const local = getProfileSettings(targetProfile.id);
      const perm = targetProfile.inbox_permission || local.inboxPermission || 'everyone';
      const locked = targetProfile.is_locked !== undefined ? Boolean(targetProfile.is_locked) : Boolean(local.isLocked);
      setPrivacySettings({ isLocked: locked, inboxPermission: perm });
      setAllowOffline(getAuthorOfflineDownloadPermission(targetProfile.id));

      fetchFollowStats(targetProfile.id).then((stats) => {
        if (!cancelled) {
          setFollowersCount(stats.followersCount);
          setFollowingCount(stats.followingCount);
        }
      });
    }

    function onFollowsUpdated() {
      if (targetProfile?.id) {
        setIsFollowingUser(isFollowing(targetProfile.id));
        fetchFollowStats(targetProfile.id).then((stats) => {
          if (!cancelled) {
            setFollowersCount(stats.followersCount);
            setFollowingCount(stats.followingCount);
          }
        });
      }
    }

    window.addEventListener('shammah:follows-updated', onFollowsUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener('shammah:follows-updated', onFollowsUpdated);
    };
  }, [targetProfile?.id, targetProfile?.inbox_permission, targetProfile?.is_locked]);

  // Compute completed & enrolled courses for this profile
  const completedCourses = COURSES_CATALOG.filter(
    (c) => c.id === 'course-foundations' || c.id === 'course-intercession'
  );

  async function handleFollowToggle() {
    if (!session) {
      if (onOpenAuth) onOpenAuth('signin');
      return;
    }
    const next = await toggleFollow(targetProfile?.id, session?.user?.id);
    setIsFollowingUser(next);
    setFollowersCount((prev) => (next ? prev + 1 : Math.max(0, prev - 1)));
  }

  async function handleLockToggle() {
    const nextLocked = !privacySettings.isLocked;
    await updateProfileSettings(targetProfile?.id, { isLocked: nextLocked });
    setPrivacySettings((prev) => ({ ...prev, isLocked: nextLocked }));
  }

  function handleOfflinePermissionToggle() {
    const next = !allowOffline;
    setAllowOffline(next);
    setAuthorOfflineDownloadPermission(targetProfile?.id, next);
  }

  function handleInboxPermissionChange(newPerm) {
    updateProfileSettings(targetProfile?.id, { inboxPermission: newPerm });
    setPrivacySettings((prev) => ({ ...prev, inboxPermission: newPerm }));
    if (session?.user?.id && targetProfile?.id === session.user.id) {
      supabase
        .from('profiles')
        .update({ inbox_permission: newPerm })
        .eq('id', session.user.id)
        .then(({ error }) => {
          if (error) console.error('Failed to sync inbox_permission to Supabase:', error);
        });
    }
  }

  function handleShareProfile() {
    setWatermarkData({
      title: `${authorName}'s Profile & Ministry`,
      textContent: targetProfile?.about || `${authorName} is a fellowship member at ${targetProfile?.church_name || 'Shammah Global Community'}.`,
      authorName,
      churchName: targetProfile?.church_name || 'Shammah Global Community',
      category: 'Profile Overview',
    });
    setShowWatermarkModal(true);
  }

  function handleShareCertificate(course) {
    setWatermarkData({
      title: `Official Certificate: ${course.certificateTitle}`,
      textContent: `This certifies that ${authorName} has successfully completed all coursework, biblical modules, and assessments for "${course.title}".\n\nIssued by: ${course.instructor} (${course.churchName})\nVerification Credential: SHAMMAH-CERT-${course.id.toUpperCase()}-2026`,
      authorName,
      churchName: course.churchName,
      category: 'Certificate Credential',
      courseInfo: {
        title: course.title,
        badgeName: course.badgeName,
      },
    });
    setShowWatermarkModal(true);
  }

  function handleProjectCertificate(course) {
    setProjectingCourse(course);
  }

  // Check if profile content is locked to viewer
  const isContentLocked = privacySettings.isLocked && !isMe && !isFollowingUser;

  // Filter posts by media tab
  const filteredPosts = userPosts.filter((post) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'videos') return post.media_type === 'video' || post.media_type === 'reel';
    if (activeTab === 'audio') return post.media_type === 'audio' || post.media_type === 'podcast';
    if (activeTab === 'polls') return Boolean(post.poll_options || post.poll_options_count);
    if (activeTab === 'text') return !post.media_url && !post.poll_options;
    return true;
  });

  // Sort: pinned posts always at top, followed by recent
  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_at || b.pinned_at || 0) - new Date(a.created_at || a.pinned_at || 0);
  });

  // Playlists
  const playlists = getUserPlaylists(targetProfile?.id);

  // Stats (backed by Supabase post_reposts)
  const [repostsCount, setRepostsCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!targetProfile?.id) return;
    getUserRepostsCount(targetProfile.id).then((count) => {
      if (!cancelled) setRepostsCount(count);
    });
    return () => {
      cancelled = true;
    };
  }, [targetProfile?.id]);

  return (
    <div className="profile-page-shell">
      {/* Magazine Hero Banner */}
      <div className="profile-magazine-hero">
        <div
          className="profile-magazine-cover"
          style={targetProfile?.cover_url ? { backgroundImage: `url(${targetProfile.cover_url})` } : undefined}
        >
          <div className="profile-cover-gradient" />
        </div>

        <div className="profile-hero-content">
          <div className="profile-hero-top-row">
            {/* Avatar with static neon / green status ring */}
            <div className="profile-avatar-wrap">
              <Avatar
                name={authorName}
                src={targetProfile?.avatar_url}
                userId={targetProfile?.id}
                className="profile-avatar-xl"
              />
            </div>

            {/* Profile Action Buttons */}
            <div className="profile-hero-actions">
              {isMe ? (
                <>
                  <Link href="/settings" className="profile-action-btn primary">
                    <Settings size={15} />
                    <span>Edit Profile</span>
                  </Link>

                  <button
                    type="button"
                    className={`profile-action-btn lock-btn${privacySettings.isLocked ? ' locked' : ''}`}
                    onClick={handleLockToggle}
                    title={privacySettings.isLocked ? 'Unlock Profile' : 'Lock Profile (Private)'}
                  >
                    {privacySettings.isLocked ? <Lock size={15} /> : <Unlock size={15} />}
                    <span>{privacySettings.isLocked ? 'Profile Locked' : 'Lock Profile'}</span>
                  </button>

                  <button
                    type="button"
                    className="profile-action-btn secondary"
                    onClick={() => setShowPrivacyModal(true)}
                    title="Inbox & Content Privacy"
                  >
                    <Shield size={15} />
                    <span>Privacy</span>
                  </button>

                  <button
                    type="button"
                    className="profile-action-btn highlight"
                    onClick={() => setShowVerificationModal(true)}
                    title="Request Ministry Verification Badge"
                  >
                    <Sparkles size={15} />
                    <span>Get Verified</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className={`profile-action-btn${isFollowingUser ? ' following' : ' primary'}`}
                    onClick={handleFollowToggle}
                  >
                    <span>{isFollowingUser ? 'Following' : 'Follow'}</span>
                  </button>

                  <Link
                    href={`/?tab=messages&recipient=${targetProfile?.id}`}
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('shammah:set-tab', { detail: 'messages' }));
                        window.dispatchEvent(
                          new CustomEvent('shammah:open-conversation', {
                            detail: {
                              recipientId: targetProfile?.id,
                              recipientName: authorName,
                              recipientAvatar: targetProfile?.avatar_url,
                              recipientBadge: targetProfile?.badge,
                              recipientVerified: targetProfile?.badge_verified,
                              recipientRole: targetProfile?.role,
                              recipientInboxPermission: privacySettings.inboxPermission,
                            },
                          })
                        );
                      }
                    }}
                    className={`profile-action-btn secondary${privacySettings.inboxPermission === 'no_one' ? ' disabled' : ''}`}
                    title={privacySettings.inboxPermission === 'no_one' ? 'Inbox closed by user' : 'Send direct message'}
                  >
                    <MessageCircle size={15} />
                    <span>Message</span>
                  </Link>
                </>
              )}

              <button
                type="button"
                className="profile-action-btn icon-only"
                onClick={handleShareProfile}
                title="Share profile"
                aria-label="Share profile"
              >
                <Share2 size={16} />
              </button>
            </div>
          </div>

          {/* User Details */}
          <div className="profile-meta-section">
            <div className="profile-title-row">
              <h1 className="profile-display-name">{authorName}</h1>
              {badge && <MemberBadge badgeId={badge} size="md" />}
              {verified && <VerifiedBadge badge={badge} role={role} size={18} />}
              {privacySettings.isLocked && (
                <span className="profile-locked-badge" title="Content locked to non-followers">
                  <Lock size={12} />
                  <span>Locked</span>
                </span>
              )}
            </div>

            {targetProfile?.church_name && (
              <span className="profile-church-tag">
                ⛪ {targetProfile.church_name}
              </span>
            )}

            {targetProfile?.about && (
              <p className="profile-bio-text">{targetProfile.about}</p>
            )}

            {/* Stat Counters Bar */}
            <div className="profile-stats-bar">
              <div className="profile-stat-item">
                <strong>{userPosts.length}</strong>
                <span>Posts</span>
              </div>
              <div className="profile-stat-item">
                <strong>{followersCount}</strong>
                <span>Followers</span>
              </div>
              <div className="profile-stat-item">
                <strong>{followingCount}</strong>
                <span>Following</span>
              </div>
              <div className="profile-stat-item">
                <strong>{repostsCount}</strong>
                <span>Echoes</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {shareToast && <div className="profile-share-toast">{shareToast}</div>}

      {/* Content Lock Notice if profile is locked to non-followers */}
      {isContentLocked ? (
        <div className="profile-locked-screen">
          <div className="profile-locked-box">
            <Lock size={36} className="profile-locked-icon" />
            <h2>This Profile is Locked</h2>
            <p>
              {authorName} has locked their profile to protect their fellowship content. Follow {authorName} to view their posts, videos, sermons, and public playlists.
            </p>
            <button
              type="button"
              className="profile-action-btn primary"
              onClick={handleFollowToggle}
            >
              Follow to Unlock
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Media Type Tabs & Layout Controls */}
          <div className="profile-nav-controls-bar">
            {/* Tabs separating media types */}
            <div className="profile-media-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'all'}
                className={`profile-media-tab${activeTab === 'all' ? ' active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                <span>All ({userPosts.length})</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'videos'}
                className={`profile-media-tab${activeTab === 'videos' ? ' active' : ''}`}
                onClick={() => setActiveTab('videos')}
              >
                <Video size={14} />
                <span>Videos</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'audio'}
                className={`profile-media-tab${activeTab === 'audio' ? ' active' : ''}`}
                onClick={() => setActiveTab('audio')}
              >
                <Music size={14} />
                <span>Audio</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'polls'}
                className={`profile-media-tab${activeTab === 'polls' ? ' active' : ''}`}
                onClick={() => setActiveTab('polls')}
              >
                <BarChart3 size={14} />
                <span>Polls</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'text'}
                className={`profile-media-tab${activeTab === 'text' ? ' active' : ''}`}
                onClick={() => setActiveTab('text')}
              >
                <FileText size={14} />
                <span>Text</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'playlists'}
                className={`profile-media-tab${activeTab === 'playlists' ? ' active' : ''}`}
                onClick={() => setActiveTab('playlists')}
              >
                <Disc size={14} />
                <span>Playlists ({playlists.length})</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'courses'}
                className={`profile-media-tab${activeTab === 'courses' ? ' active' : ''}`}
                onClick={() => setActiveTab('courses')}
              >
                <GraduationCap size={14} />
                <span>Courses &amp; Badges ({completedCourses.length})</span>
              </button>

              {isMe && (
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'activity'}
                  className={`profile-media-tab${activeTab === 'activity' ? ' active' : ''}`}
                  onClick={() => setActiveTab('activity')}
                >
                  <ShieldCheckIcon size={14} />
                  <span>Activity Log</span>
                </button>
              )}
            </div>

            {/* Layout Mode Switcher (Magazine 1x, 2x, 3x, and List Rich) */}
            {activeTab !== 'playlists' && activeTab !== 'activity' && (
              <div className="profile-layout-switcher" aria-label="Layout View Modes">
                <button
                  type="button"
                  className={`layout-switch-btn${layoutMode === 'magazine1' ? ' active' : ''}`}
                  onClick={() => setLayoutMode('magazine1')}
                  title="Card Magazine (1x)"
                  aria-label="Card Magazine 1x"
                >
                  <Columns size={16} />
                </button>

                <button
                  type="button"
                  className={`layout-switch-btn${layoutMode === 'magazine2' ? ' active' : ''}`}
                  onClick={() => setLayoutMode('magazine2')}
                  title="Magazine Grid (2x)"
                  aria-label="Magazine Grid 2x"
                >
                  <LayoutGrid size={16} />
                </button>

                <button
                  type="button"
                  className={`layout-switch-btn${layoutMode === 'magazine3' ? ' active' : ''}`}
                  onClick={() => setLayoutMode('magazine3')}
                  title="Instagram Visual Grid (3x)"
                  aria-label="Visual Grid 3x"
                >
                  <Grid size={16} />
                </button>

                <button
                  type="button"
                  className={`layout-switch-btn${layoutMode === 'list' ? ' active' : ''}`}
                  onClick={() => setLayoutMode('list')}
                  title="List Rich View"
                  aria-label="List Rich"
                >
                  <List size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Tab 1: Playlists (Public) */}
          {activeTab === 'playlists' && (
            <div className="profile-playlists-grid">
              {playlists.map((pl) => (
                <div key={pl.id} className="profile-playlist-card">
                  <div className="profile-playlist-cover" style={{ background: pl.coverBg }}>
                    <Music size={28} className="pl-music-icon" />
                    <button type="button" className="pl-play-fab" title="Play playlist" aria-label="Play">
                      <Play size={18} fill="#ffffff" />
                    </button>
                  </div>
                  <div className="profile-playlist-info">
                    <span className="profile-playlist-tag">{pl.category}</span>
                    <h3 className="profile-playlist-title">{pl.title}</h3>
                    <p className="profile-playlist-desc">{pl.description}</p>
                    <span className="profile-playlist-tracks">{pl.trackCount} tracks · Public</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab: Completed Courses & Discipleship Badges */}
          {activeTab === 'courses' && (
            <div className="profile-courses-section">
              <div className="profile-courses-header">
                <div>
                  <h3 className="profile-section-heading">Discipleship Credentials &amp; Earned Badges</h3>
                  <p className="profile-section-sub">
                    Completed kingdom curriculum, discipleship credentials, and ministry badges earned by {authorName}.
                  </p>
                </div>
              </div>

              <div className="profile-courses-grid">
                {completedCourses.map((course) => (
                  <div key={course.id} className="profile-course-card neon-glow-card">
                    <div className="profile-course-badge-icon">
                      <span>{course.badgeIcon || '🎓'}</span>
                    </div>

                    <div className="profile-course-info">
                      <span className="profile-cert-chip">
                        <Award size={12} className="text-amber-400" />
                        <span>VERIFIED CREDENTIAL</span>
                      </span>
                      <h4 className="profile-course-title">{course.title}</h4>
                      <p className="profile-cert-title">{course.certificateTitle}</p>
                      <span className="profile-course-inst">
                        Issued by: <strong>{course.instructor}</strong> ({course.churchName})
                      </span>
                    </div>

                    <div className="profile-course-actions">
                      <button
                        type="button"
                        className="profile-cert-btn share"
                        onClick={() => handleShareCertificate(course)}
                        title="Share certificate with official watermark"
                      >
                        <Share2 size={14} />
                        <span>Share Watermarked</span>
                      </button>

                      <button
                        type="button"
                        className="profile-cert-btn project"
                        onClick={() => handleProjectCertificate(course)}
                        title="Project certificate & course on sanctuary screen"
                      >
                        <Tv size={14} />
                        <span>Project</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Posts Display: Grid or List depending on layoutMode */}
          {activeTab !== 'playlists' && activeTab !== 'courses' && sortedPosts.length === 0 && (
            <div className="profile-empty-posts">
              <FileText size={32} className="profile-empty-icon" />
              <h3>No posts shared under this tab</h3>
              <p>When {authorName} shares new fellowship content, it will show up right here.</p>
            </div>
          )}

          {activeTab !== 'playlists' && activeTab !== 'courses' && sortedPosts.length > 0 && (
            <div className={`profile-posts-container layout-${layoutMode}`}>
              {sortedPosts.map((post) => {
                // If 3x Instagram visual grid mode:
                if (layoutMode === 'magazine3') {
                  const cat = categoryStyle(post.category_id);
                  return (
                    <div
                      key={post.id}
                      className="profile-grid-thumb-card"
                      title={post.text_content || 'View post'}
                      style={{ '--accent': cat.accent }}
                    >
                      {post.is_pinned && (
                        <div className="grid-pinned-indicator" title="Pinned Post">
                          <Pin size={12} />
                        </div>
                      )}
                      {post.media_url ? (
                        post.media_type === 'video' ? (
                          <div className="grid-thumb-video-wrap">
                            <video src={post.media_url} muted preload="metadata" />
                            <Video size={16} className="grid-media-type-badge" />
                          </div>
                        ) : (
                          <img src={post.media_url} alt="" className="grid-thumb-img" />
                        )
                      ) : (
                        <div className="grid-thumb-text-fallback">
                          <p>{post.text_content ? post.text_content.slice(0, 100) : ''}</p>
                        </div>
                      )}
                      <div className="grid-thumb-hover-overlay">
                        <span className="grid-hover-stat">
                          <Heart size={14} fill="#fff" /> {post.likes_count || 12}
                        </span>
                        <span className="grid-hover-stat">
                          <Repeat size={14} /> {post.reposts_count || 3}
                        </span>
                      </div>
                    </div>
                  );
                }

                // If 2x Magazine or 1x Magazine or List Rich:
                return (
                  <div key={post.id} className="profile-post-card-wrapper">
                    <PostCard
                      post={post}
                      session={session}
                      openAuth={onOpenAuth}
                      isAdmin={isMe}
                      onTogglePin={() => {}}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Activity Log Tab Content */}
          {activeTab === 'activity' && isMe && (
            <div className="profile-activity-tab-content">
              <ActivityLog />
            </div>
          )}
        </>
      )}

      {/* Privacy Settings Modal */}
      {showPrivacyModal && (
        <div className="visibility-modal-backdrop" onClick={() => setShowPrivacyModal(false)} role="dialog">
          <div className="visibility-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="visibility-modal-header">
              <div className="visibility-modal-title">
                <Shield size={18} className="vis-icon-shield" />
                <h3>Profile Privacy &amp; Inbox Controls</h3>
              </div>
              <button
                type="button"
                className="visibility-close-btn"
                onClick={() => setShowPrivacyModal(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="profile-privacy-section">
              <h4>Profile Content Lock</h4>
              <p className="visibility-desc">
                When your profile is locked, only people who follow you and church members can view your posts, media, and playlists.
              </p>
              <button
                type="button"
                className={`profile-privacy-toggle-btn${privacySettings.isLocked ? ' on' : ''}`}
                onClick={handleLockToggle}
              >
                {privacySettings.isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                <span>{privacySettings.isLocked ? 'Profile is Locked (Private)' : 'Profile is Public'}</span>
              </button>
            </div>

            <div className="profile-privacy-section" style={{ marginTop: 18 }}>
              <h4>Who Can Message You in Your Inbox:</h4>
              <p className="visibility-desc">
                Control who can send direct messages and replies to your 24h status stories:
              </p>
              <div className="visibility-options-list">
                {[
                  { id: 'everyone', label: 'Everyone', desc: 'Any community member can send direct messages' },
                  { id: 'followers_church', label: 'Followers & Church Members Only', desc: 'Only approved connections can message' },
                  { id: 'no_one', label: 'No One (Inbox Closed)', desc: 'Disable new incoming messages' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`visibility-option-item${privacySettings.inboxPermission === opt.id ? ' active' : ''}`}
                    onClick={() => handleInboxPermissionChange(opt.id)}
                  >
                    <div className="vis-option-text">
                      <span className="vis-option-label">{opt.label}</span>
                      <span className="vis-option-sub">{opt.desc}</span>
                    </div>
                    {privacySettings.inboxPermission === opt.id && <Check size={18} className="vis-check-icon" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="profile-privacy-section" style={{ marginTop: 18 }}>
              <h4>Offline Content &amp; Media Downloads Access</h4>
              <p className="visibility-desc">
                Allow church members and followers to download your media, audio sermons, and posts for offline viewing (stored up to 30 days):
              </p>
              <button
                type="button"
                className={`profile-privacy-toggle-btn${allowOffline ? ' on' : ''}`}
                onClick={handleOfflinePermissionToggle}
              >
                <DownloadCloud size={16} />
                <span>{allowOffline ? 'Offline Downloads Allowed (Up to 30 Days)' : 'Offline Downloads Restricted'}</span>
              </button>
            </div>

            <div className="profile-privacy-section" style={{ marginTop: 18 }}>
              <h4>Official Ministry Verification Badge</h4>
              <p className="visibility-desc">
                Request an official blue verification checkmark &amp; pastoral badge (Pastor, Worship Leader, Elder).
                Verification is 100% free of charge and reviewed manually by church leadership.
              </p>
              <button
                type="button"
                className="profile-privacy-toggle-btn on"
                onClick={() => {
                  setShowPrivacyModal(false);
                  setShowVerificationModal(true);
                }}
              >
                <Sparkles size={16} />
                <span>Request Verification Badge</span>
              </button>
            </div>

            <div className="visibility-modal-actions">
              <button
                type="button"
                className="vis-save-btn"
                onClick={() => setShowPrivacyModal(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verification Badge Modal */}
      {showVerificationModal && (
        <VerificationBadgeModal
          session={session}
          profile={targetProfile}
          onClose={() => setShowVerificationModal(false)}
        />
      )}

      {/* Watermarked Share Modal */}
      {showWatermarkModal && watermarkData && (
        <WatermarkShareModal
          contentData={watermarkData}
          onClose={() => {
            setShowWatermarkModal(false);
            setWatermarkData(null);
          }}
        />
      )}

      {/* Projection Mode Modal */}
      {projectingCourse && (
        <ProjectionModeModal
          type="course"
          data={projectingCourse}
          onClose={() => setProjectingCourse(null)}
        />
      )}

      {shareToast && <div className="video-toast-pill">{shareToast}</div>}
    </div>
  );
}
