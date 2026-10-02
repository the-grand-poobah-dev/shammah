'use client';
import { useEffect, useState, useRef } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import MemberBadge from './MemberBadge';
import { getActiveStatuses } from '../lib/statusManager';
import StatusViewerModal from './StatusViewerModal';
import StatusCreatorModal from './StatusCreatorModal';

export default function StatusTray({ currentUser }) {
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
        {/* Card 1: Add Story / Your Status */}
        <div
          role="listitem"
          className="status-card-item status-card-create"
          onClick={() => {
            if (dragRef.current.moved) {
              dragRef.current.moved = false;
              return;
            }
            if (hasMyStatus) {
              handleOpenViewer(myStatusIndex);
            } else {
              setCreatorOpen(true);
            }
          }}
          title={hasMyStatus ? 'View your status' : 'Add 24-hour status'}
        >
          <div className="status-create-thumb">
            <Avatar
              name={currentUser?.name || currentUser?.display_name || 'You'}
              src={currentUser?.avatar_url}
              hasStatus={hasMyStatus}
              className="status-user-avatar"
            />
            <button
              type="button"
              className="status-add-plus-btn"
              onClick={(e) => {
                e.stopPropagation();
                setCreatorOpen(true);
              }}
              title="Add new status"
              aria-label="Add new status"
            >
              <Plus size={15} strokeWidth={3} />
            </button>
          </div>
          <span className="status-card-label">
            {hasMyStatus ? 'Your Status' : 'Add Status'}
          </span>
        </div>

        {/* Subsequent Cards: Active 24-hour community statuses */}
        {statuses.map((status, index) => {
          if (hasMyStatus && index === myStatusIndex) return null;

          const hoursAgo = Math.max(
            1,
            Math.round((Date.now() - new Date(status.createdAt).getTime()) / (1000 * 60 * 60))
          );

          return (
            <div
              key={status.id}
              role="listitem"
              className={`status-card-item status-card-story status-bg-${status.bgStyle || 'emerald'}`}
              onClick={() => handleOpenViewer(index)}
              title={`${status.userName}: ${status.text}`}
            >
              <div className="status-card-header">
                <Avatar
                  name={status.userName}
                  src={status.userAvatar}
                  hasStatus={true}
                  className="status-user-avatar"
                />
              </div>

              <div className="status-card-snippet">
                <p className="status-snippet-text">{status.text}</p>
              </div>

              <div className="status-card-footer">
                <div className="status-footer-name-row">
                  {/* Clean input name shown */}
                  <span className="status-card-author-name">{status.userName}</span>
                  {/* Title shown by member badge */}
                  {status.userBadge && (
                    <MemberBadge badgeId={status.userBadge} size="sm" />
                  )}
                  {status.userVerified && (
                    <VerifiedBadge badge={status.userBadge} role={status.userRole} size={13} />
                  )}
                </div>
                <span className="status-card-time">{hoursAgo}h ago</span>
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
