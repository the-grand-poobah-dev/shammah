'use client';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight, Music, Video } from 'lucide-react';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import MemberBadge from './MemberBadge';
import {
  getActiveStatuses,
  fetchActiveStatuses,
  inferMediaType,
  groupStatusesByUser,
  buildViewerPlaylist,
} from '../lib/statusManager';
import { cleanDisplayName, useRelativeTimeTick } from '../lib/postDisplay';
import StatusViewerModal from './StatusViewerModal';
import StatusCreatorModal from './StatusCreatorModal';

export default function StatusTray({ currentUser }) {
  const now = useRelativeTimeTick();
  const [statuses, setStatuses] = useState([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRef = useRef(null);
  const dragRef = useRef({ active: false, startX: 0, startScroll: 0, moved: false });

  const currentViewerId = currentUser?.id || 'me';

  const loadStatuses = useCallback(() => {
    setStatuses(getActiveStatuses());
  }, []);

  function checkScroll() {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  }

  // Group statuses by user and generate viewer playlist with start indices
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

  function handleOpenViewerForUser(userKey) {
    if (dragRef.current.moved) {
      dragRef.current.moved = false;
      return;
    }
    const startIndex = viewerPlaylist.groupStartIndices[userKey] ?? 0;
    setActiveStoryIndex(startIndex);
    setViewerOpen(true);
  }

  useEffect(() => {
    loadStatuses();
    fetchActiveStatuses().then((fresh) => {
      if (Array.isArray(fresh)) setStatuses(fresh);
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
    window.addEventListener('shammah:open-status', onOpenStatus);
    return () => {
      window.removeEventListener('shammah:status-updated', onStatusUpdated);
      window.removeEventListener('shammah:status-viewed', onStatusUpdated);
      window.removeEventListener('shammah:muted-users-changed', onStatusUpdated);
      window.removeEventListener('shammah:open-status', onOpenStatus);
    };
  }, [loadStatuses, currentUser]);

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [groupedUsers]);

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
