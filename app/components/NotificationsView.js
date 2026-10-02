'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell,
  CheckCheck,
  Flame,
  MessageCircle,
  Church,
  Heart,
  Sparkles,
  Smartphone,
  ShieldCheck,
  Volume2,
  VolumeX,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import {
  getNotifications,
  saveNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  addNotification,
  NOTIFICATION_CATEGORIES,
  getFirebasePushConfig,
  saveFirebasePushConfig,
  requestFirebasePushPermission,
} from '../lib/notificationsManager';
import { isSoundEnabled, setSoundEnabled, playSound } from '../lib/soundEffects';

export default function NotificationsView({ currentUser, openAuth }) {
  const [notifications, setNotifications] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [pushConfig, setPushConfig] = useState({ enabled: true, pushPermission: 'default' });
  const [soundOn, setSoundOn] = useState(true);
  const [requestingPush, setRequestingPush] = useState(false);
  const [pushStatusMsg, setPushStatusMsg] = useState('');

  function reload() {
    setNotifications(getNotifications());
    setPushConfig(getFirebasePushConfig());
    setSoundOn(isSoundEnabled());
  }

  useEffect(() => {
    reload();

    function onUpdate() {
      reload();
    }
    window.addEventListener('shammah:notifications-updated', onUpdate);
    window.addEventListener('shammah:sound-toggled', onUpdate);
    return () => {
      window.removeEventListener('shammah:notifications-updated', onUpdate);
      window.removeEventListener('shammah:sound-toggled', onUpdate);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filtered = notifications.filter((n) => {
    if (activeCategory === 'all') return true;
    return n.category === activeCategory || n.type === activeCategory;
  });

  async function handleEnablePush() {
    setRequestingPush(true);
    setPushStatusMsg('');
    const res = await requestFirebasePushPermission();
    setRequestingPush(false);
    setPushConfig(getFirebasePushConfig());

    if (res.success) {
      setPushStatusMsg('Instant popup alerts and Firebase messaging notifications enabled!');
      playSound('alert');
    } else {
      setPushStatusMsg('Push permission was not granted. In-app popups remain active.');
    }
    setTimeout(() => setPushStatusMsg(''), 4000);
  }

  function handleTestAlert() {
    addNotification({
      type: 'church',
      category: 'church',
      title: '🕊️ Test Firebase Alert & Notification',
      body: 'Grace and peace! This is a live preview of your fellowship notifications.',
      icon: '🔔',
      actorName: 'Shammah Community',
    });
  }

  function handleToggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) playSound('alert');
  }

  return (
    <div className="notif-shell">
      {/* Header */}
      <div className="notif-header">
        <div className="notif-header-left">
          <div className="notif-header-title-row">
            <span className="notif-header-icon-wrap">
              <Bell size={20} className="notif-bell-icon" />
              {unreadCount > 0 && <span className="notif-header-badge">{unreadCount}</span>}
            </span>
            <h2>Fellowship Notifications</h2>
          </div>
          <p className="notif-subtext">
            Stay spiritually connected with reactions, comments, prayers, and church broadcasts.
          </p>
        </div>

        {notifications.length > 0 && (
          <button
            type="button"
            className="notif-mark-read-btn"
            onClick={markAllNotificationsAsRead}
            title="Mark all notifications as read"
          >
            <CheckCheck size={16} />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* Firebase Push Alerts & Sound Integration Banner */}
      <div className="notif-firebase-card">
        <div className="notif-fb-left">
          <div className="notif-fb-icon-box">
            <Smartphone size={20} className="notif-fb-icon" />
          </div>
          <div className="notif-fb-text">
            <div className="notif-fb-status-row">
              <span className="notif-fb-title">Firebase &amp; Browser Alerts</span>
              <span className={`notif-fb-tag ${pushConfig.pushPermission === 'granted' ? 'granted' : 'ready'}`}>
                {pushConfig.pushPermission === 'granted' ? 'Connected & Active' : 'Setup Available'}
              </span>
            </div>
            <p className="notif-fb-desc">
              Receive instant lock-screen or popup alerts when somebody replies to your prayers or sends you a direct message.
            </p>
            {pushStatusMsg && <p className="notif-fb-feedback">{pushStatusMsg}</p>}
          </div>
        </div>

        <div className="notif-fb-actions">
          <button
            type="button"
            className="notif-sound-btn"
            onClick={handleToggleSound}
            title={soundOn ? 'Mute sound profiles' : 'Enable sound profiles'}
          >
            {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>{soundOn ? 'Sounds On' : 'Muted'}</span>
          </button>

          {pushConfig.pushPermission !== 'granted' ? (
            <button
              type="button"
              className="notif-enable-push-btn"
              onClick={handleEnablePush}
              disabled={requestingPush}
            >
              <ShieldCheck size={16} />
              <span>{requestingPush ? 'Requesting…' : 'Enable Push Alerts'}</span>
            </button>
          ) : (
            <button
              type="button"
              className="notif-test-btn"
              onClick={handleTestAlert}
              title="Test notification alert"
            >
              <Sparkles size={15} />
              <span>Test Alert</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="notif-categories-bar no-scrollbar">
        {NOTIFICATION_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          const count =
            cat.id === 'all'
              ? unreadCount
              : notifications.filter((n) => (n.category === cat.id || n.type === cat.id) && !n.isRead).length;

          return (
            <button
              key={cat.id}
              type="button"
              className={`notif-cat-chip${isActive ? ' active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              <span>{cat.label}</span>
              {count > 0 && <span className="notif-chip-count">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Notification List */}
      <div className="notif-list">
        {filtered.length === 0 ? (
          <div className="notif-empty-state">
            <Bell size={40} className="notif-empty-icon" />
            <h3>No notifications here</h3>
            <p>
              {activeCategory === 'all'
                ? "You're all caught up! Interactions, prayer amens, and announcements will appear here."
                : `No notifications found under "${NOTIFICATION_CATEGORIES.find((c) => c.id === activeCategory)?.label}".`}
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className={`notif-card-item${!item.isRead ? ' unread' : ''}`}
              onClick={() => markNotificationAsRead(item.id)}
            >
              <div className="notif-card-avatar-wrap">
                <Avatar name={item.actorName} src={item.actorAvatar} className="avatar-sm" />
                <span className="notif-card-badge-icon" aria-hidden="true">
                  {item.icon || '🔔'}
                </span>
              </div>

              <div className="notif-card-content">
                <div className="notif-card-header">
                  <div className="notif-actor-row">
                    <strong className="notif-actor-name">{item.actorName}</strong>
                    {item.actorBadge && <VerifiedBadge badge={item.actorBadge} size={13} />}
                  </div>
                  <span className="notif-card-time">{item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}</span>
                </div>

                <h4 className="notif-card-title">{item.title}</h4>
                <p className="notif-card-body">{item.body}</p>
              </div>

              <div className="notif-card-actions" onClick={(e) => e.stopPropagation()}>
                {!item.isRead && <span className="notif-unread-dot" title="Unread notification" />}
                <button
                  type="button"
                  className="notif-delete-btn"
                  onClick={() => deleteNotification(item.id)}
                  title="Remove notification"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
