'use client';
import { useEffect, useState, useRef } from 'react';
import { Plus, ChevronLeft, ChevronRight, Music, Video } from 'lucide-react';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import MemberBadge from './MemberBadge';
import { getActiveStatuses, fetchActiveStatuses, inferMediaType } from '../lib/statusManager';
import { formatPostDate, getPostDateTitle, useRelativeTimeTick, cleanDisplayName } from '../lib/postDisplay';
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

  function loadStatuses() {
    setStatuses(getActiveStatuses());
  }

  function checkScroll() {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
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
      const targetUserId = e.detail?.userId;
      const targetUserName = e.detail?.userName;

      const idx = all.findIndex(
        (s) =>
          (targetUserId && s.userId === targetUserId) ||
          (targetUserName && s.userName && s.userName.toLowerCase() === targetUserName.toLowerCase())
      );

      if (idx !== -1) {
        setActiveStoryIndex(idx);
        setViewerOpen(true);
      } else if (all.length > 0) {
        setActiveStoryIndex(0);
        setViewerOpen(true);
      } else {
        setCreatorOpen(true);
      }
    }

    window.addEventListener('shammah:status-updated', onStatusUpdated);
    window.addEventListener('shammah:open-status', onOpenStatus);
    return () => {
      window.removeEventListener('shammah:status-updated', onStatusUpdated);
      window.removeEventListener('shammah:open-status', onOpenStatus);
    };
  }, []);

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [statuses]);

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

  function handleOpenViewer(index) {
    if (dragRef.current.moved) {
      dragRef.current.moved = false;
      return;
    }
    setActiveStoryIndex(index);
    setViewerOpen(true);
  }

  const myStatusIndex = statuses.findIndex(
    (s) =>
      (currentUser?.id && s.userId === currentUser.id) ||
      (currentUser?.name && s.userName && s.userName.toLowerCase() === currentUser.name.toLowerCase())
  );
  const hasMyStatus = myStatusIndex !== -1;

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
                hasMyStatus
                  ? (e) => {
                      e.stopPropagation();
                      handleOpenViewer(myStatusIndex);
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

        {/* Community & user 24-hour status story cards */}
        {statuses.map((status, index) => {
          const cleanName = cleanDisplayName(status.userName, 'Member');
          const mediaType = inferMediaType(status.mediaUrl, status.mediaType);
          const hasMedia = Boolean(status.mediaUrl && mediaType);

          return (
            <div
              key={status.id}
              role="listitem"
              className={`status-card-item status-card-story status-bg-${status.bgStyle || 'emerald'} ${hasMedia ? `has-media-thumb has-${mediaType}-thumb` : ''}`}
              onClick={() => handleOpenViewer(index)}
              title={`${cleanName}: ${status.text || '24h story'}`}
            >
              {/* Media Preview Background & Scrim */}
              {mediaType === 'image' && status.mediaUrl && (
                <div className="status-card-media-wrap">
                  <img src={status.mediaUrl} alt="" className="status-card-bg-media" />
                  <div className="status-card-media-scrim" />
                </div>
              )}

              {mediaType === 'video' && status.mediaUrl && (
                <div className="status-card-media-wrap">
                  <video src={status.mediaUrl} className="status-card-bg-media" muted preload="metadata" />
                  <div className="status-card-media-scrim" />
                  <span className="status-card-media-badge" title="Video status">
                    <Video size={10} />
                  </span>
                </div>
              )}

              {mediaType === 'audio' && status.mediaUrl && (
                <div className="status-card-media-wrap">
                  <div className="status-card-media-scrim" />
                  <span className="status-card-media-badge audio" title="Audio testimony">
                    <Music size={10} />
                  </span>
                </div>
              )}

              <div className="status-card-header">
                <Avatar
                  name={cleanName}
                  src={status.userAvatar}
                  hasStatus={true}
                  className="status-user-avatar"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.dispatchEvent(
                      new CustomEvent('shammah:open-profile', {
                        detail: {
                          author: {
                            id: status.userId,
                            display_name: cleanName,
                            avatar_url: status.userAvatar,
                            badge: status.userBadge,
                            badge_verified: status.userVerified,
                            role: status.userRole,
                          },
                          authorId: status.userId,
                        },
                      })
                    );
                  }}
                />
              </div>

              <div className="status-card-snippet">
                {mediaType === 'audio' && (
                  <div className="status-card-audio-pill">
                    <Music size={11} />
                    <span>Audio</span>
                  </div>
                )}
                {status.text ? (
                  <p className="status-snippet-text">{status.text}</p>
                ) : null}
              </div>

              <div
                className="status-card-footer cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  window.dispatchEvent(
                    new CustomEvent('shammah:open-profile', {
                      detail: {
                        author: {
                          id: status.userId,
                          display_name: cleanName,
                          avatar_url: status.userAvatar,
                          badge: status.userBadge,
                          badge_verified: status.userVerified,
                          role: status.userRole,
                        },
                        authorId: status.userId,
                      },
                    })
                  );
                }}
              >
                <div className="status-author-name-row">
                  <span className="status-card-author-name">{cleanName}</span>
                  {status.userVerified && (
                    <VerifiedBadge badge={status.userBadge} role={status.userRole} size={13} />
                  )}
                </div>
                {status.userBadge && (
                  <MemberBadge badgeId={status.userBadge} size="sm" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Story Viewer Modal (Fullscreen immersion with continuous autoplay) */}
      {viewerOpen && (
        <StatusViewerModal
          statuses={statuses}
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
