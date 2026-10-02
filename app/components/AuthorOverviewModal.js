'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  X,
  UserCheck,
  UserPlus,
  MessageCircle,
  ShieldAlert,
  ShieldCheck,
  ExternalLink,
  Church,
  Heart,
  Lock,
} from 'lucide-react';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import { isFollowing, toggleFollow, isBlocked, toggleBlock, getProfileSettings } from '../lib/profileManager';
import { playSound } from '../lib/soundEffects';

export default function AuthorOverviewModal({ author, authorId, currentUser, onClose, onOpenDirectMessage }) {
  const router = useRouter();
  const [following, setFollowing] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [profileSettings, setProfileSettings] = useState({ isLocked: false, inboxPermission: 'everyone' });

  const [toastMsg, setToastMsg] = useState('');
  const [confirmingBlock, setConfirmingBlock] = useState(false);

  const isMe = currentUser?.id && currentUser.id === authorId;
  const isLoggedIn = Boolean(currentUser?.id);
  const name = author?.display_name || author?.name || 'Fellowship Member';
  const role = author?.role || 'Christian Fellowship Member';
  const badge = author?.badge;
  const verified = author?.badge_verified;

  useEffect(() => {
    if (authorId) {
      setFollowing(isFollowing(authorId));
      setBlocked(isBlocked(authorId));
      setProfileSettings(getProfileSettings(authorId));
    }
  }, [authorId]);

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  }

  function handleFollowToggle() {
    if (isMe) return;
    if (!isLoggedIn) {
      showToast('Please sign in or create an account to follow members.');
      return;
    }
    const next = toggleFollow(authorId);
    setFollowing(next);
    showToast(next ? `Now following ${name}` : `Unfollowed ${name}`);
  }

  function handleBlockToggle() {
    if (isMe) return;
    if (!isLoggedIn) {
      showToast('Please sign in to block or manage member connections.');
      return;
    }
    if (blocked) {
      const next = toggleBlock(authorId);
      setBlocked(next);
      setConfirmingBlock(false);
      showToast(`Unblocked ${name}`);
    } else {
      if (!confirmingBlock) {
        setConfirmingBlock(true);
        return;
      }
      const next = toggleBlock(authorId);
      setBlocked(next);
      setConfirmingBlock(false);
      showToast(`Blocked ${name}`);
      setTimeout(() => onClose(), 800);
    }
  }

  function handleMessageClick() {
    if (isMe) return;
    if (!isLoggedIn) {
      showToast('🔒 Please sign in to send or receive direct messages.');
      return;
    }
    if (profileSettings.isLocked && profileSettings.inboxPermission === 'none') {
      showToast(`${name} has restricted direct messaging in their privacy settings.`);
      return;
    }
    playSound('reaction');
    if (onOpenDirectMessage) {
      onOpenDirectMessage({
        id: authorId,
        name,
        avatar: author?.avatar_url,
        badge,
        verified,
      });
    } else {
      window.dispatchEvent(
        new CustomEvent('shammah:set-tab', { detail: 'messages' })
      );
      router.push(`/?tab=messages&recipient=${authorId}`);
    }
    onClose();
  }

  return (
    <div className="author-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="author-modal-card neon-glow-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="author-modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        {/* Profile Card Header */}
        <div className="author-modal-header">
          <div className="author-modal-avatar-wrap">
            <Avatar name={name} src={author?.avatar_url} className="avatar-xl" />
          </div>

          <div className="author-modal-titles">
            <div className="author-modal-name-row">
              <h3>{name}</h3>
              {badge && <VerifiedBadge badge={badge} size={16} />}
            </div>
            <span className="author-modal-role">{role}</span>
            {author?.church_name && (
              <span className="author-modal-church">
                <Church size={12} />
                <span>{author.church_name}</span>
              </span>
            )}
          </div>
        </div>

        {/* Faith Statement / Bio */}
        <p className="author-modal-bio">
          {author?.about ||
            'Fellow believer sharing testimony, praying for the body of Christ, and growing in grace on Shammah.'}
        </p>

        {/* Stats row */}
        <div className="author-modal-stats-row">
          <div className="author-stat-item">
            <strong>{author?.posts_count || 14}</strong>
            <span>Testimonies</span>
          </div>
          <div className="author-stat-item">
            <strong>{following ? '129' : '128'}</strong>
            <span>Followers</span>
          </div>
          <div className="author-stat-item">
            <strong>E2EE</strong>
            <span>Encrypted</span>
          </div>
        </div>

        {/* Action Buttons */}
        {!isMe ? (
          <div className="author-modal-actions-grid">
            <button
              type="button"
              className={`author-action-btn follow-btn${following ? ' is-following' : ''}`}
              onClick={handleFollowToggle}
            >
              {following ? (
                <>
                  <UserCheck size={16} />
                  <span>Following</span>
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  <span>Follow Member</span>
                </>
              )}
            </button>

            <button
              type="button"
              className="author-action-btn message-btn"
              onClick={handleMessageClick}
              disabled={blocked}
            >
              <MessageCircle size={16} />
              <span>Direct Message</span>
            </button>

            <Link
              href={authorId ? `/profile/${authorId}` : '/profile'}
              className="author-action-btn visit-btn"
              onClick={onClose}
            >
              <ExternalLink size={15} />
              <span>Visit Page</span>
            </Link>

            {confirmingBlock ? (
              <div className="author-block-confirm-box">
                <span>Block {name}? You won&apos;t see their posts or messages.</span>
                <div className="confirm-btn-row">
                  <button type="button" className="btn-confirm-danger" onClick={handleBlockToggle}>
                    Yes, Block
                  </button>
                  <button type="button" className="btn-confirm-cancel" onClick={() => setConfirmingBlock(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className={`author-action-btn block-btn${blocked ? ' is-blocked' : ''}`}
                onClick={handleBlockToggle}
              >
                <ShieldAlert size={15} />
                <span>{blocked ? 'Unblock User' : 'Block User'}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="author-modal-self-actions">
            <Link href="/profile" className="author-action-btn visit-btn full" onClick={onClose}>
              <ExternalLink size={15} />
              <span>View Your Profile &amp; Settings</span>
            </Link>
          </div>
        )}

        {toastMsg && (
          <div className="author-modal-toast" role="status">
            <span>{toastMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
}
