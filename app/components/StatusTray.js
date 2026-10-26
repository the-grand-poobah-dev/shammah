'use client';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight, Music, Video, Eye, EyeOff, RotateCcw } from 'lucide-react';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import MemberBadge from './MemberBadge';
import PopupSheet from './PopupSheet';
import {
  getActiveStatuses,
  getHiddenActiveStatuses,
  fetchActiveStatuses,
  inferMediaType,
  groupStatusesByUser,
  buildViewerPlaylist,
  unhideStatus,
  unhideAllStatuses,
} from '../lib/statusManager';
import { cleanDisplayName, useRelativeTimeTick } from '../lib/postDisplay';
import StatusViewerModal from './StatusViewerModal';
import StatusCreatorModal from './StatusCreatorModal';

export default function StatusTray({ currentUser }) {
  const now = useRelativeTimeTick();
  const [statuses, setStatuses] = useState([]);
  const [hiddenStatuses, setHiddenStatuses] = useState([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [hiddenSheetOpen, setHiddenSheetOpen] = useState(false);
  const [hiddenViewerOpen, setHiddenViewerOpen] = useState(false);
  const [hiddenViewerIndex, setHiddenViewerIndex] = useState(0);
  const [toastMsg, setToastMsg] = useState('');
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRef = useRef(null);
  const dragRef = useRef({ active: false, startX: 0, startScroll: 0, moved: false });

  const currentViewerId = currentUser?.id || 'me';

  const loadStatuses = useCallback(() => {
    setStatuses(getActiveStatuses());
    setHiddenStatuses(getHiddenActiveStatuses());
  }, []);

  function checkScroll() {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  }

  // Group visible statuses by user and generate viewer playlist with start indices
  const groupedUsers = useMemo(() => {
    return groupStatusesByUser(statuses, currentViewerId);
  }, [statuses, currentViewerId]);

  const viewerPlaylist = useMemo(() => {
    return buildViewerPlaylist(groupedUsers, currentViewerId);
  }, [groupedUsers, currentViewerId]);

  // Check if current user has active status (for "Add Status" card)
  const myGroup = useMemo(() => {
    if (!currentUser) return null;
    return groupedUsers.find(
      (g) =>
        (currentUser.id && g.userId === currentUser.id) ||
        (currentUser.name && g.userName.toLowerCase() === currentUser.name.toLowerCase()) ||
        (currentUser.display_name && g.userName.toLowerCase() === currentUser.display_name.toLowerCase())
    );
  }, [groupedUsers, currentUser]);

  const hasMyStatus = Boolean(myGroup && myGroup.count > 0);

  // Hidden statuses metrics
  const hiddenCount = hiddenStatuses.length;
  const hasHiddenStatuses = hiddenCount > 0;
  const latestHidden = hasHiddenStatuses ? hiddenStatuses[0] : null;

  function handleOpenViewerForUser(userKey) {
    if (dragRef.current.moved) {
      dragRef.current.moved = false;
      return;
    }
    const startIndex = viewerPlaylist.groupStartIndices[userKey] ?? 0;
    setActiveStoryIndex(startIndex);
    setViewerOpen(true);
  }

  function handleUnhideStory(statusId, userId, userName) {
    unhideStatus(statusId, userId, userName);
    loadStatuses();
    setToastMsg('✓ Status reinstated to your stories tray');
    setTimeout(() => setToastMsg(''), 3000);
  }

  function handleUnhideAll() {
    unhideAllStatuses();
    loadStatuses();
    setToastMsg('✓ All hidden statuses reinstated to your tray');
    setTimeout(() => setToastMsg(''), 3000);
  }

  function handleViewHiddenStory(index) {
    setHiddenViewerIndex(index);
    setHiddenSheetOpen(false);
    setHiddenViewerOpen(true);
  }

  useEffect(() => {
    loadStatuses();
    fetchActiveStatuses().then((fresh) => {
      if (Array.isArray(fresh)) {
        loadStatuses();
      }
    });

    function onStatusUpdated() {
      loadStatuses();
    }

    function onOpenStatus(e) {
      const all = getActiveStatuses();
      const vId = currentUser?.id || 'me';
      const groups = groupStatusesByUser(all, vId);
      const playlist = buildViewerPlaylist(groups, vId);

      const targetUserId = e.detail?.userId;
      const targetUserName = e.detail?.userName;

      const target = groups.find(
        (g) =>
          (targetUserId && g.userId === targetUserId) ||
          (targetUserName && g.userName && g.userName.toLowerCase() === targetUserName.toLowerCase())
      );

      if (target) {
        const idx = playlist.groupStartIndices[target.key] ?? 0;
        setActiveStoryIndex(idx);
        setViewerOpen(true);
      } else if (playlist.viewerStatuses.length > 0) {
        setActiveStoryIndex(0);
        setViewerOpen(true);
      } else {
        setCreatorOpen(true);
      }
    }

    window.addEventListener('shammah:status-updated', onStatusUpdated);
    window.addEventListener('shammah:status-viewed', onStatusUpdated);
    window.addEventListener('shammah:muted-users-changed', onStatusUpdated);
    window.addEventListener('shammah:status-hidden-changed', onStatusUpdated);
    window.addEventListener('shammah:open-status', onOpenStatus);
    return () => {
      window.removeEventListener('shammah:status-updated', onStatusUpdated);
      window.removeEventListener('shammah:status-viewed', onStatusUpdated);
      window.removeEventListener('shammah:muted-users-changed', onStatusUpdated);
      window.removeEventListener('shammah:status-hidden-changed', onStatusUpdated);
      window.removeEventListener('shammah:open-status', onOpenStatus);
    };
  }, [loadStatuses, currentUser]);

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [groupedUsers, hiddenCount]);

  function scrollTray(direction) {
    if (!scrollRef.current) return;
    const distance = 240;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth',
    });
  }

  // Pointer drag-to-scroll handlers (no visible scrollbar)
  function onPointerDown(e) {
    if (!scrollRef.current) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startScroll: scrollRef.current.scrollLeft,
      moved: false,
    };
  }

  function onPointerMove(e) {
    const d = dragRef.current;
    if (!d.active || !scrollRef.current) return;
    const dx = e.clientX - d.startX;
    if (!d.moved && Math.abs(dx) > 4) {
      d.moved = true;
      scrollRef.current.setPointerCapture?.(e.pointerId);
    }
    if (d.moved) {
      scrollRef.current.scrollLeft = d.startScroll - dx;
      checkScroll();
    }
  }

  function onPointerUp() {
    dragRef.current.active = false;
  }

  return (
    <section className="status-tray-container" aria-label="24-Hour Stories">
      {/* Scroll to and fro navigation controls */}
      {canScrollLeft && (
        <button
          type="button"
          className="status-tray-scroll-btn left"
          onClick={() => scrollTray('left')}
          aria-label="Scroll stories back"
        >
          <ChevronLeft size={18} />
        </button>
      )}

      {canScrollRight && (
        <button
          type="button"
          className="status-tray-scroll-btn right"
          onClick={() => scrollTray('right')}
          aria-label="Scroll stories forward"
        >
          <ChevronRight size={18} />
        </button>
      )}

      <div
        ref={scrollRef}
        className="status-tray-scroll no-scrollbar"
        onScroll={checkScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="list"
      >
        {/* Card 1: Always available Add Status action (never blocks adding another) */}
        <div
          role="listitem"
          className="status-card-item status-card-create"
          onClick={() => {
            if (dragRef.current.moved) {
              dragRef.current.moved = false;
              return;
            }
            setCreatorOpen(true);
          }}
          title="Add 24-hour status"
        >
          <div className="status-create-thumb">
            <Avatar
              name={cleanDisplayName(currentUser?.name || currentUser?.display_name || 'You', 'You')}
              src={currentUser?.avatar_url}
              hasStatus={hasMyStatus}
              className="status-user-avatar"
              onClick={
                hasMyStatus && myGroup
                  ? (e) => {
                      e.stopPropagation();
                      handleOpenViewerForUser(myGroup.key);
                    }
                  : undefined
              }
              title={hasMyStatus ? 'View your status (or tap + to add another)' : 'Add 24-hour status'}
            />
            <button
              type="button"
              className="status-add-plus-btn"
              onClick={(e) => {
                e.stopPropagation();
                setCreatorOpen(true);
              }}
              title="Add another 24-hour status"
              aria-label="Add another 24-hour status"
            >
              <Plus size={15} strokeWidth={3} />
            </button>
          </div>
          <span className="status-card-label">Add Status</span>
        </div>

        {/* Stacked User Status Cards: 1 card per unique user, thumbnail is most recent status */}
        {groupedUsers.map((group) => {
          const latest = group.latestStatus;
          const cleanName = group.userName;
          const mediaType = inferMediaType(latest.mediaUrl, latest.mediaType);
          const hasMedia = Boolean(latest.mediaUrl && mediaType);

          return (
            <div
              key={group.key}
              role="listitem"
              className={`status-card-item status-card-story status-bg-${latest.bgStyle || 'emerald'} ${hasMedia ? `has-media-thumb has-${mediaType}-thumb` : ''}`}
              onClick={() => handleOpenViewerForUser(group.key)}
              title={`${cleanName}: ${latest.text || `${group.count} active ${group.count === 1 ? 'status' : 'statuses'}`}`}
            >
              {/* Media Preview Background & Scrim */}
              {mediaType === 'image' && latest.mediaUrl && (
                <div className="status-card-media-wrap">
                  <img src={latest.mediaUrl} alt="" className="status-card-bg-media" />
                  <div className="status-card-media-scrim" />
                </div>
              )}

              {mediaType === 'video' && latest.mediaUrl && (
                <div className="status-card-media-wrap">
                  <video src={latest.mediaUrl} className="status-card-bg-media" muted preload="metadata" />
                  <div className="status-card-media-scrim" />
                  <span className="status-card-media-badge" title="Video status">
                    <Video size={10} />
                  </span>
                </div>
              )}

              {mediaType === 'audio' && latest.mediaUrl && (
                <div className="status-card-media-wrap">
                  <div className="status-card-media-scrim" />
                  <span className="status-card-media-badge audio" title="Audio testimony">
                    <Music size={10} />
                  </span>
                </div>
              )}

              <div className="status-card-header">
                <div className="status-avatar-stack-wrap">
                  <Avatar
                    name={cleanName}
                    src={group.userAvatar}
                    hasStatus={true}
                    className="status-user-avatar"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.dispatchEvent(
                        new CustomEvent('shammah:open-profile', {
                          detail: {
                            author: {
                              id: group.userId,
                              display_name: cleanName,
                              avatar_url: group.userAvatar,
                              badge: group.userBadge,
                              badge_verified: group.userVerified,
                              role: group.userRole,
                            },
                            authorId: group.userId,
                          },
                        })
                      );
                    }}
                  />
                  <span
                    className="status-stack-count"
                    aria-label={`${group.count} active ${group.count === 1 ? 'story' : 'stories'}`}
                    title={`${group.count} active ${group.count === 1 ? 'story' : 'stories'}`}
                  >
                    {group.count}
                  </span>
                </div>
              </div>

              <div className="status-card-snippet">
                {mediaType === 'audio' && (
                  <div className="status-card-audio-pill">
                    <Music size={11} />
                    <span>Audio</span>
                  </div>
                )}
                {latest.text ? (
                  <p className="status-snippet-text">{latest.text}</p>
                ) : null}
              </div>

              <div className="status-card-footer">
                <div className="status-author-name-row">
                  <span className="status-card-author-name">{cleanName}</span>
                  {group.userVerified && (
                    <VerifiedBadge badge={group.userBadge} role={group.userRole} size={13} />
                  )}
                </div>
                {group.userBadge && (
                  <MemberBadge badgeId={group.userBadge} size="sm" />
                )}
              </div>
            </div>
          );
        })}

        {/* Furthest End: Hidden Stories Category (where user can reinstate hidden status. Sits beside Add Status if no other stories) */}
        <div
          role="listitem"
          className={`status-card-item ${hasHiddenStatuses ? `status-card-story status-card-hidden status-bg-${latestHidden?.bgStyle || 'emerald'}` : 'status-card-create status-card-hidden'}`}
          onClick={() => {
            if (dragRef.current.moved) {
              dragRef.current.moved = false;
              return;
            }
            setHiddenSheetOpen(true);
          }}
          title={
            hasHiddenStatuses
              ? `${hiddenCount} hidden ${hiddenCount === 1 ? 'story' : 'stories'} — tap to reinstate`
              : 'Hidden stories — tap to view or reinstate'
          }
        >
          {hasHiddenStatuses && latestHidden?.mediaUrl && inferMediaType(latestHidden.mediaUrl, latestHidden.mediaType) === 'image' && (
            <div className="status-card-media-wrap">
              <img src={latestHidden.mediaUrl} alt="" className="status-card-bg-media" />
              <div className="status-card-media-scrim" />
            </div>
          )}

          <div className="status-card-header">
            <div className="status-avatar-stack-wrap">
              <div className="status-hidden-icon-wrap">
                <EyeOff size={19} strokeWidth={2.3} />
              </div>
              {hasHiddenStatuses && (
                <span
                  className="status-stack-count status-hidden-count-badge"
                  aria-label={`${hiddenCount} hidden ${hiddenCount === 1 ? 'story' : 'stories'}`}
                  title={`${hiddenCount} hidden ${hiddenCount === 1 ? 'story' : 'stories'}`}
                >
                  {hiddenCount}
                </span>
              )}
            </div>
          </div>

          <div className="status-card-snippet">
            <p className="status-snippet-text" style={{ fontStyle: 'italic', opacity: 0.88 }}>
              {hasHiddenStatuses ? `${hiddenCount} hidden` : 'None hidden'}
            </p>
          </div>

          <div className="status-card-footer">
            <span className="status-card-author-name" style={{ color: 'var(--teal, #14b8a6)' }}>
              Hidden Stories
            </span>
          </div>
        </div>
      </div>

      {/* Story Viewer Modal (Fullscreen immersion with continuous autoplay & start rules) */}
      {viewerOpen && (
        <StatusViewerModal
          statuses={viewerPlaylist.viewerStatuses}
          initialIndex={activeStoryIndex}
          currentUser={currentUser}
          onClose={() => setViewerOpen(false)}
          onAddStatus={() => setCreatorOpen(true)}
        />
      )}

      {/* Hidden Stories Management PopupSheet */}
      <PopupSheet
        open={hiddenSheetOpen}
        onClose={() => setHiddenSheetOpen(false)}
        size="md"
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'rgba(20, 184, 166, 0.12)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--teal, #14b8a6)',
              }}
            >
              <EyeOff size={16} />
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
                Hidden Stories
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-muted)' }}>
                Stories you have hidden. Reinstate any story to restore it to your tray.
              </p>
            </div>
          </div>
        }
        footer={
          hiddenStatuses.length > 1 ? (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, width: '100%' }}>
              <button
                type="button"
                className="hidden-reinstate-btn"
                onClick={handleUnhideAll}
              >
                <RotateCcw size={14} />
                <span>Reinstate All Stories</span>
              </button>
            </div>
          ) : null
        }
      >
        {toastMsg && (
          <div
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              background: 'rgba(20, 184, 166, 0.15)',
              border: '1px solid rgba(20, 184, 166, 0.35)',
              color: 'var(--teal, #14b8a6)',
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 12,
              textAlign: 'center',
            }}
          >
            {toastMsg}
          </div>
        )}

        {hiddenStatuses.length === 0 ? (
          <div
            style={{
              padding: '36px 16px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px dashed var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--ink-muted)',
              }}
            >
              <EyeOff size={24} />
            </div>
            <div>
              <strong style={{ display: 'block', fontSize: 15, color: 'var(--ink)', marginBottom: 4 }}>
                No Hidden Stories
              </strong>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-muted)', maxWidth: 320, lineHeight: 1.45 }}>
                When you choose &ldquo;Hide status&rdquo; from any story options menu, it will appear here so you can easily reinstate it.
              </p>
            </div>
          </div>
        ) : (
          <div className="hidden-stories-list">
            {hiddenStatuses.map((s, idx) => {
              const authorName = cleanDisplayName(s.userName, 'Member');
              return (
                <div key={s.id} className="hidden-story-item-card">
                  <div className="hidden-story-meta">
                    <Avatar
                      name={authorName}
                      src={s.userAvatar}
                      className="avatar-sm"
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>
                          {authorName}
                        </span>
                        {s.userVerified && (
                          <VerifiedBadge badge={s.userBadge} role={s.userRole} size={13} />
                        )}
                      </div>
                      <p
                        style={{
                          margin: '2px 0 0',
                          fontSize: 12,
                          color: 'var(--ink-muted)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {s.text || (s.scriptureTag ? `Scripture: ${s.scriptureTag}` : 'Story media')}
                      </p>
                    </div>
                  </div>

                  <div className="hidden-story-actions">
                    <button
                      type="button"
                      className="hidden-view-btn"
                      onClick={() => handleViewHiddenStory(idx)}
                      title="View hidden story"
                    >
                      <Eye size={13} />
                      <span>View</span>
                    </button>
                    <button
                      type="button"
                      className="hidden-reinstate-btn"
                      onClick={() => handleUnhideStory(s.id, s.userId, s.userName)}
                      title="Reinstate to status tray"
                    >
                      <RotateCcw size={13} />
                      <span>Reinstate</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PopupSheet>

      {/* Hidden Stories Viewer Modal */}
      {hiddenViewerOpen && (
        <StatusViewerModal
          statuses={hiddenStatuses}
          initialIndex={hiddenViewerIndex}
          currentUser={currentUser}
          onClose={() => {
            setHiddenViewerOpen(false);
            loadStatuses();
          }}
          onAddStatus={() => setCreatorOpen(true)}
        />
      )}

      {/* Story Creator Modal */}
      {creatorOpen && (
        <StatusCreatorModal
          currentUser={currentUser}
          onClose={() => setCreatorOpen(false)}
          onCreated={() => {
            loadStatuses();
            setActiveStoryIndex(0);
            setViewerOpen(true);
          }}
        />
      )}
    </section>
  );
}
