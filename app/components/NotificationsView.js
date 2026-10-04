'use client';
import { useState, useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  Church,
  Sparkles,
  Smartphone,
  ShieldCheck,
  Volume2,
  VolumeX,
  Trash2,
  AtSign,
  Send,
  Copy,
  Check,
} from 'lucide-react';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  NOTIFICATION_CATEGORIES,
  getFirebasePushConfig,
  saveFirebasePushConfig,
} from '../lib/notificationsManager';
import {
  enableFcmPushNotifications,
  dispatchCommunityPushForPost,
} from '../lib/fcmClient';
import { isSoundEnabled, setSoundEnabled, playSound } from '../lib/soundEffects';

export default function NotificationsView({ currentUser, openAuth }) {
  const [notifications, setNotifications] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [pushConfig, setPushConfig] = useState({
    enabled: true,
    pushPermission: 'default',
    fcmToken: null,
    notifyNewPosts: true,
    notifyMentions: true,
  });
  const [soundOn, setSoundOn] = useState(true);
  const [requestingPush, setRequestingPush] = useState(false);
  const [pushStatusMsg, setPushStatusMsg] = useState('');
  const [copiedToken, setCopiedToken] = useState(false);

  function reload() {
    setNotifications(getNotifications());
    const cfg = getFirebasePushConfig();
    setPushConfig({
      notifyNewPosts: true,
      notifyMentions: true,
      ...cfg,
    });
    setSoundOn(isSoundEnabled());
  }

  useEffect(() => {
    reload();

    function onUpdate() {
      reload();
    }
    window.addEventListener('shammah:notifications-updated', onUpdate);
    window.addEventListener('shammah:firebase-config-updated', onUpdate);
    window.addEventListener('shammah:sound-toggled', onUpdate);
    return () => {
      window.removeEventListener('shammah:notifications-updated', onUpdate);
      window.removeEventListener('shammah:firebase-config-updated', onUpdate);
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
    const res = await enableFcmPushNotifications({
      churchId: currentUser?.church_id || 'nairobi-chapel',
      displayName: currentUser?.display_name || 'Fellowship Member',
      notifyNewPosts: pushConfig.notifyNewPosts ?? true,
      notifyMentions: pushConfig.notifyMentions ?? true,
    });
    setRequestingPush(false);
    reload();

    if (res.success) {
      setPushStatusMsg(
        'Firebase Cloud Messaging (FCM) push notifications enabled & synced for your church communities!'
      );
      playSound('alert');
    } else {
      setPushStatusMsg(
        'Browser push permission was not granted. In-app community alerts remain active.'
      );
    }
    setTimeout(() => setPushStatusMsg(''), 5000);
  }

  function handleTogglePreference(key) {
    const nextVal = !(pushConfig[key] ?? true);
    const updated = {
      ...pushConfig,
      [key]: nextVal,
    };
    setPushConfig(updated);
    saveFirebasePushConfig(updated);
    playSound('reaction');
  }

  async function handleTestChurchPostPush() {
    setPushStatusMsg('Sending Firebase Cloud Messaging push for a new church community post…');
    await dispatchCommunityPushForPost({
      text: 'Join us this evening at 6:30 PM for Midweek Prayer & Worship Revival in the main sanctuary!',
      categoryId: 'events',
      churchId: currentUser?.church_id || 'nairobi-chapel',
      churchName: 'Nairobi Worship Fellowship',
      authorName: currentUser?.display_name || 'Pastor David Mwangi',
      isPoll: false,
    });
    setTimeout(() => setPushStatusMsg(''), 3500);
  }

  async function handleTestMentionPush() {
    const targetHandle = (currentUser?.display_name || 'Disciple').replace(/\s+/g, '');
    setPushStatusMsg(`Sending Firebase Cloud Messaging push for @${targetHandle} mention…`);
    await dispatchCommunityPushForPost({
      text: `Lifting up @${targetHandle} in thanksgiving and prayer today! May the Lord strengthen your ministry.`,
      categoryId: 'prayer',
      churchId: currentUser?.church_id || 'nairobi-chapel',
      churchName: 'Nairobi Worship Fellowship',
      authorName: 'Sister Mary Grace',
      isPoll: false,
    });
    setTimeout(() => setPushStatusMsg(''), 3500);
  }

  function handleCopyToken() {
    if (!pushConfig.fcmToken || typeof navigator === 'undefined') return;
    navigator.clipboard?.writeText(pushConfig.fcmToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
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
            <h2>Fellowship Notifications &amp; FCM Push</h2>
          </div>
          <p className="notif-subtext">
            Real-time Firebase Cloud Messaging (FCM) push alerts for new posts and @mentions in your church communities.
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

      {/* Firebase Cloud Messaging (FCM) Push Alerts & Preferences Card */}
      <div className="notif-firebase-card">
        <div className="notif-fb-left">
          <div className="notif-fb-icon-box">
            <Smartphone size={20} className="notif-fb-icon" />
          </div>
          <div className="notif-fb-text">
            <div className="notif-fb-status-row">
              <span className="notif-fb-title">Firebase Cloud Messaging (FCM)</span>
              <span className={`notif-fb-tag ${pushConfig.pushPermission === 'granted' ? 'granted' : 'ready'}`}>
                {pushConfig.pushPermission === 'granted' ? 'FCM Push Active' : 'Setup Available'}
              </span>
            </div>
            <p className="notif-fb-desc">
              Receive background &amp; foreground push notifications whenever a new post is published in your church community or someone mentions you with <strong>@name</strong>.
            </p>

            {/* Granular FCM Trigger Toggles */}
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              <button
                type="button"
                onClick={() => handleTogglePreference('notifyNewPosts')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all ${
                  pushConfig.notifyNewPosts !== false
                    ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                    : 'bg-white/5 border-white/10 text-slate-400'
                }`}
              >
                <Church size={12} />
                <span>Church Community Posts: {pushConfig.notifyNewPosts !== false ? 'ON' : 'OFF'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleTogglePreference('notifyMentions')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all ${
                  pushConfig.notifyMentions !== false
                    ? 'bg-teal-500/20 border-teal-400/50 text-teal-200'
                    : 'bg-white/5 border-white/10 text-slate-400'
                }`}
              >
                <AtSign size={12} />
                <span>@Mentions in Posts: {pushConfig.notifyMentions !== false ? 'ON' : 'OFF'}</span>
              </button>

              {pushConfig.fcmToken && (
                <button
                  type="button"
                  onClick={handleCopyToken}
                  className="px-2.5 py-1 rounded-lg text-[11px] bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 flex items-center gap-1"
                  title="Copy FCM Device Registration Token"
                >
                  {copiedToken ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                  <span>FCM Token: {String(pushConfig.fcmToken).slice(0, 16)}…</span>
                </button>
              )}
            </div>

            {pushStatusMsg && <p className="notif-fb-feedback mt-2">{pushStatusMsg}</p>}
          </div>
        </div>

        <div className="notif-fb-actions flex-wrap">
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
              <span>{requestingPush ? 'Registering FCM…' : 'Enable FCM Push'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                className="notif-test-btn"
                onClick={handleTestChurchPostPush}
                title="Simulate a new post push notification in your church community"
              >
                <Send size={14} />
                <span>Test Church Post Push</span>
              </button>
              <button
                type="button"
                className="notif-test-btn"
                onClick={handleTestMentionPush}
                title="Simulate a new @mention push notification"
              >
                <Sparkles size={14} />
                <span>Test @Mention Push</span>
              </button>
            </div>
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
                ? "You're all caught up! New church community posts, prayer amens, and @mentions will appear here."
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
                  <span className="notif-card-time">
                    {item.timestamp
                      ? new Date(item.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Now'}
                  </span>
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
