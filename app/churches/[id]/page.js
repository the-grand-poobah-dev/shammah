'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import Avatar from '../../components/Avatar';
import MemberName from '../../components/MemberName';
import PageHeader from '../../components/PageHeader';
import PostList from '../../components/PostList';
import { CHURCH_FIELDS, getInstitutionBranch } from '../../lib/churchConfig';
import { initials } from '../../lib/postDisplay';
import { useSession } from '../../lib/useSession';
import {
  getInstitutionSubscription,
  SUBSCRIPTION_PLANS,
  SAMPLE_INSTITUTIONS,
} from '../../lib/institutionManager';
import InstitutionSubscriptionModal from '../../components/InstitutionSubscriptionModal';
import { Sparkles, Calendar, BookOpen, Coins, UserPlus, Lock, Check, Phone } from 'lucide-react';
import VerifiedBadge from '../../components/VerifiedBadge';
import IcebreakerPollsCard from '../../components/IcebreakerPollsCard';

export default function ChurchPage() {
  const { id } = useParams();
  const router = useRouter();
  const { session, profile, reloadProfile, loading } = useSession();

  const [church, setChurch] = useState(undefined); // undefined = loading, null = not found
  const [memberCount, setMemberCount] = useState(null);
  const [members, setMembers] = useState(null);
  const [tab, setTab] = useState('posts');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [imgFail, setImgFail] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [subRefreshKey, setSubRefreshKey] = useState(0);

  // Giving simulation state
  const [givingAmount, setGivingAmount] = useState('500');
  const [givingPhone, setGivingPhone] = useState('0712 345 678');
  const [givingPurpose, setGivingPurpose] = useState('General Tithes & Offerings');
  const [givingSuccess, setGivingSuccess] = useState(false);

  // Invite member state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const sampleMatch = SAMPLE_INSTITUTIONS.find((s) => s.id === id);
  const currentSub = getInstitutionSubscription(id);
  const planInfo = SUBSCRIPTION_PLANS.find((p) => p.id === currentSub.planId) || SUBSCRIPTION_PLANS[0];

  const TABS = [
    { id: 'posts', label: 'Posts' },
    { id: 'icebreakers', label: 'Icebreaker Polls' },
    { id: 'events', label: 'Events' },
    { id: 'courses', label: 'Courses' },
    { id: 'fundraising', label: 'Giving & Projects' },
    { id: 'invites', label: 'Invites' },
    { id: 'about', label: 'About' },
    { id: 'members', label: 'Members' },
  ];

  useEffect(() => {
    setImgFail(new URLSearchParams(window.location.search).get('imgfail') === '1');
  }, []);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      const [{ data }, { data: counts }] = await Promise.all([
        supabase.from('churches').select(CHURCH_FIELDS).eq('id', id).maybeSingle(),
        supabase.rpc('church_member_counts'),
      ]);
      if (cancelled) return;
      setChurch(data || null);
      const mine = (counts || []).find((r) => r.church_id === id);
      setMemberCount(mine ? Number(mine.total) : 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, session?.user?.id]);

  // Load the member list the first time that tab is opened
  useEffect(() => {
    if (tab !== 'members' || members || !session) return;
    supabase
      .from('profiles')
      .select('id, display_name, avatar_url, badge, badge_verified')
      .eq('church_id', id)
      .order('display_name')
      .limit(50)
      .then(({ data }) => setMembers(data || []));
  }, [tab, id, session?.user?.id]);

  const isMember = !!profile && profile.church_id === id;
  const isOwner = !!church && !!session && (church.created_by === session.user.id || profile?.role === 'platform_admin');

  async function setMyChurch(nextChurchId) {
    setBusy(true);
    setError('');
    const { error: err } = await supabase.from('profiles').update({ church_id: nextChurchId }).eq('id', session.user.id);
    if (err) {
      setBusy(false);
      return setError(err.message);
    }
    await reloadProfile(session.user.id);
    setMemberCount((n) => Math.max(0, (n ?? 0) + (nextChurchId ? 1 : -1)));
    setMembers(null); // refresh the list next time it's opened
    setBusy(false);
  }

  function handleJoin() {
    if (profile?.church_id && profile.church_id !== id) {
      if (!window.confirm('You already belong to another church. Switch to this one? Your old posts stay where they are.')) return;
    }
    setMyChurch(id);
  }

  function handleLeave() {
    if (window.confirm(`Leave ${church.name}? You can rejoin any time.`)) setMyChurch(null);
  }

  // ---------- Loading / signed-out / not found ----------
  if (loading || (session && church === undefined)) {
    return (
      <div className="shell">
        <PageHeader title="Church" backHref="/churches" />
        <p className="mut cx-loading">Loading…</p>
      </div>
    );
  }
  if (!session) {
    return (
      <div className="shell">
        <PageHeader title="Church" backHref="/churches" />
        <div className="empty-state">
          <h2>Sign in to view this church</h2>
          <Link href="/" className="signin-btn">Go to sign in</Link>
        </div>
      </div>
    );
  }
  if (church === null) {
    return (
      <div className="shell">
        <PageHeader title="Church" backHref="/churches" />
        <div className="empty-state">
          <h2>We couldn’t find that church</h2>
          <p>It may have been removed.</p>
          <Link href="/churches" className="signin-btn">Browse churches</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="shell">
      <PageHeader title={church.name} backHref="/churches" />

      <section className="cx-hero">
        <div className="cx-hero-cover" style={church.cover_url ? { backgroundImage: `url(${church.cover_url})` } : undefined} />
        <div className="cx-hero-row">
          <span className="avatar cx-hero-logo">
            {church.logo_url ? <img src={church.logo_url} alt="" className="avatar-img" /> : initials(church.name)}
          </span>
          <div className="cx-hero-actions">
            {isOwner && (
              <>
                <button
                  type="button"
                  className="cx-btn cx-btn-highlight"
                  onClick={() => setShowSubModal(true)}
                  title="Manage Church Subscription & Plans"
                >
                  <Sparkles size={14} />
                  <span>Subscription: {planInfo.name}</span>
                </button>
                <Link href={`/churches/${id}/edit`} className="cx-btn cx-btn-ghost">Edit</Link>
              </>
            )}
            {isMember ? (
              <button type="button" className="cx-btn cx-btn-ghost" onClick={handleLeave} disabled={busy}>Joined ✓</button>
            ) : (
              <button type="button" className="cx-btn cx-btn-primary" onClick={handleJoin} disabled={busy || !profile}>
                {busy ? 'Joining…' : 'Join church'}
              </button>
            )}
          </div>
        </div>

        <div className="cx-hero-text">
          <div className="cx-title-row">
            <h2 className="cx-hero-name">{church.name}</h2>
            {currentSub.planId !== 'free' && (
              <VerifiedBadge badge="pastor" role="church_admin" size={18} />
            )}
            <span className="inst-plan-badge" style={{ background: planInfo.badgeColor }}>
              {planInfo.name}
            </span>
          </div>
          {(sampleMatch?.branch || getInstitutionBranch(id) || church.branch_location) && (
            <p className="cx-branch-chip">
              🏛️ Campus / Branch: <strong>{sampleMatch?.branch || getInstitutionBranch(id) || church.branch_location}</strong>
            </p>
          )}
          <p className="cx-hero-meta">
            {[church.denomination, church.location_label && `📍 ${church.location_label}`].filter(Boolean).join(' · ')}
          </p>
          <p className="cx-hero-count">
            <b>{memberCount ?? '…'}</b> member{memberCount !== 1 ? 's' : ''}
          </p>
        </div>
        {error && <p className="auth-message">{error}</p>}
        {imgFail && isOwner && (
          <p className="auth-message">Your church was saved, but a picture couldn’t upload. Tap Edit to try again.</p>
        )}
      </section>

      <nav className="cx-tabs" aria-label="Church sections">
        {TABS.map((t) => (
          <button key={t.id} className={`cx-tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      <main className="feed">
        {tab === 'posts' && (
          <PostList
            session={session}
            profile={profile}
            filter={{ column: 'church_id', value: id }}
            onRequireSignIn={() => router.push('/')}
            emptyTitle="No posts from this church yet"
            emptyText="When members of this church post on Shammah, their posts appear here automatically."
          />
        )}

        {/* Anonymous Icebreaker Polls Tab */}
        {tab === 'icebreakers' && (
          <div className="cx-icebreakers-section">
            <IcebreakerPollsCard
              churchId={id}
              churchName={church?.name || sampleMatch?.name}
              canCreate={isOwner}
              isStarterOrAbove={['starter', 'popular', 'advanced'].includes(currentSub.planId)}
              onOpenUpgrade={() => setShowSubModal(true)}
            />
          </div>
        )}

        {/* Events Tab */}
        {tab === 'events' && (
          <div className="cx-events-section">
            <div className="cx-section-head">
              <h3>Church &amp; Ministry Events</h3>
              {isOwner && currentSub.planId !== 'free' && (
                <button type="button" className="cx-btn cx-btn-primary small">+ Post Event</button>
              )}
            </div>

            {currentSub.planId === 'free' ? (
              <div className="cx-plan-locked-card">
                <Calendar size={28} className="text-teal-600 mb-2" />
                <h4>Event Calendar is a Starter Plan Feature</h4>
                <p>Upgrade to the Starter Plan (Kes 500 / mo) to schedule, publish, and notify members about church events and conferences.</p>
                {isOwner && (
                  <button type="button" className="cx-btn cx-btn-primary" onClick={() => setShowSubModal(true)}>
                    Upgrade to Starter
                  </button>
                )}
              </div>
            ) : (
              <div className="cx-events-list">
                {(sampleMatch?.upcomingEvents || [
                  { title: 'Weekly Worship Service', date: 'Every Sunday 9:00 AM & 11:30 AM', venue: 'Main Sanctuary' },
                  { title: 'Wednesday Prayer & Fasting', date: 'Wednesday 5:30 PM', venue: 'Chapel & Online' },
                  { title: 'Monthly Night of Encounter Kesha', date: 'Last Friday of the month', venue: 'Auditorium' },
                ]).map((ev, i) => (
                  <div key={i} className="cx-event-card">
                    <div className="cx-event-date-col">
                      <Calendar size={18} className="text-teal-600" />
                    </div>
                    <div className="cx-event-info">
                      <strong>{ev.title}</strong>
                      <span className="cx-event-when">{ev.date}</span>
                      <span className="cx-event-venue">📍 {ev.venue}</span>
                    </div>
                    <button type="button" className="cx-btn cx-btn-ghost small">Remind Me</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Courses & Discipleship Tab */}
        {tab === 'courses' && (
          <div className="cx-courses-section">
            <div className="cx-section-head">
              <h3>Discipleship Courses &amp; Academy</h3>
              {isOwner && ['popular', 'advanced'].includes(currentSub.planId) && (
                <button type="button" className="cx-btn cx-btn-primary small">+ Create Course</button>
              )}
            </div>

            {currentSub.coursesPaused && (
              <div className="cx-paused-notice">
                <Lock size={20} className="text-amber-500 flex-shrink-0" />
                <div>
                  <strong>Your Course Curriculum is Safely Preserved</strong>
                  <p>Existing course material and enrollments remain under your admin control. However, paid courses are paused for members until your plan is upgraded.</p>
                  {isOwner && (
                    <button type="button" className="cx-btn cx-btn-primary small mt-2" onClick={() => setShowSubModal(true)}>
                      Reactivate Courses on Popular Plan
                    </button>
                  )}
                </div>
              </div>
            )}

            {!['popular', 'advanced'].includes(currentSub.planId) && !currentSub.coursesPaused ? (
              <div className="cx-plan-locked-card">
                <BookOpen size={28} className="text-purple-600 mb-2" />
                <h4>Discipleship &amp; Paid Courses are on the Popular Plan</h4>
                <p>Create, organize, and charge for structured discipleship academies, bible certificates, and audio study tracks.</p>
                {isOwner && (
                  <button type="button" className="cx-btn cx-btn-primary" onClick={() => setShowSubModal(true)}>
                    Upgrade to Popular (Kes 3,000 / mo)
                  </button>
                )}
              </div>
            ) : (
              <div className="cx-courses-grid">
                {[
                  { title: 'Foundations of Biblical Discipleship', lessons: 8, price: 'Free for members', level: 'Beginner' },
                  { title: 'Kingdom Leadership in the Marketplace', lessons: 12, price: 'Kes 1,500', level: 'Intermediate' },
                  { title: 'Walking in the Spirit & Spiritual Gifts', lessons: 6, price: 'Kes 800', level: 'All Believers' },
                ].map((course, i) => (
                  <div key={i} className="cx-course-card">
                    <span className="cx-course-badge">{course.level}</span>
                    <h4>{course.title}</h4>
                    <span className="cx-course-lessons">{course.lessons} Audio &amp; Video Modules</span>
                    <div className="cx-course-footer">
                      <strong className="cx-course-price">{course.price}</strong>
                      <button type="button" className="cx-btn cx-btn-primary small" disabled={currentSub.coursesPaused}>
                        {currentSub.coursesPaused ? 'Paused' : 'Enroll'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Giving & Fundraising Tab */}
        {tab === 'fundraising' && (
          <div className="cx-giving-section">
            <div className="cx-section-head">
              <h3>Church Giving &amp; Project Fundraising</h3>
            </div>

            {currentSub.planId !== 'advanced' ? (
              <div className="cx-plan-locked-card">
                <Coins size={28} className="text-amber-500 mb-2" />
                <h4>In-App Fundraising is an Advanced Plan Feature</h4>
                <p>Enable direct M-Pesa tithes, building fund campaigns, donor statements, and financial transparency ledgers for your members.</p>
                {isOwner && (
                  <button type="button" className="cx-btn cx-btn-primary" onClick={() => setShowSubModal(true)}>
                    Upgrade to Advanced (Kes 7,000 / mo)
                  </button>
                )}
              </div>
            ) : (
              <div className="cx-giving-container">
                {/* Active Campaign */}
                <div className="cx-campaign-highlight-card">
                  <div className="camp-head">
                    <span className="camp-tag">Active Project Campaign</span>
                    <h4>{sampleMatch?.activeCampaign?.title || 'Sanctuary Expansion & Missions Drive'}</h4>
                  </div>
                  <p className="camp-desc">
                    {sampleMatch?.activeCampaign?.purpose || 'Support our ongoing missionary work and sanctuary development.'}
                  </p>
                  <div className="camp-progress">
                    <div className="camp-fill" style={{ width: '65%' }} />
                  </div>
                  <div className="camp-numbers">
                    <span>Raised: <b>Kes {(sampleMatch?.activeCampaign?.raisedKes || 980000).toLocaleString()}</b></span>
                    <span>Goal: <b>Kes {(sampleMatch?.activeCampaign?.goalKes || 1500000).toLocaleString()}</b></span>
                  </div>
                </div>

                {/* Giving Form */}
                <div className="cx-give-form-card">
                  <h4>Give via M-Pesa</h4>
                  {givingSuccess ? (
                    <div className="cx-give-success">
                      <Check size={28} className="text-emerald-500 mb-2" />
                      <p><b>Thank you for your generous giving!</b> An M-Pesa payment prompt has been sent to your phone.</p>
                      <button type="button" className="cx-btn cx-btn-ghost small" onClick={() => setGivingSuccess(false)}>
                        Give Again
                      </button>
                    </div>
                  ) : (
                    <div className="cx-form-grid">
                      <label>
                        <span>Giving Category:</span>
                        <select value={givingPurpose} onChange={(e) => setGivingPurpose(e.target.value)} className="cx-select">
                          <option>General Tithes &amp; Offerings</option>
                          <option>Sanctuary Building Fund</option>
                          <option>Missions &amp; Outreach</option>
                          <option>Benevolence &amp; Needy Care</option>
                        </select>
                      </label>

                      <label>
                        <span>Amount (Kes):</span>
                        <input
                          type="number"
                          value={givingAmount}
                          onChange={(e) => setGivingAmount(e.target.value)}
                          className="cx-input"
                        />
                      </label>

                      <label>
                        <span>M-Pesa Phone Number:</span>
                        <input
                          type="tel"
                          value={givingPhone}
                          onChange={(e) => setGivingPhone(e.target.value)}
                          className="cx-input"
                        />
                      </label>

                      <button
                        type="button"
                        className="cx-btn cx-btn-primary full"
                        onClick={() => {
                          setGivingSuccess(true);
                          playSound('achievement');
                        }}
                      >
                        <Phone size={15} />
                        <span>Send M-Pesa STK (Kes {Number(givingAmount || 0).toLocaleString()})</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Member Invites Tab */}
        {tab === 'invites' && (
          <div className="cx-invites-section">
            <div className="cx-section-head">
              <h3>Send Join Requests &amp; Member Invites</h3>
            </div>

            {!['popular', 'advanced'].includes(currentSub.planId) ? (
              <div className="cx-plan-locked-card">
                <UserPlus size={28} className="text-indigo-600 mb-2" />
                <h4>Direct Invites are on the Popular &amp; Advanced Plans</h4>
                <p>Send direct requests to community members, track RSVPs, and grow your institution family with member notifications.</p>
                {isOwner && (
                  <button type="button" className="cx-btn cx-btn-primary" onClick={() => setShowSubModal(true)}>
                    Upgrade to Popular
                  </button>
                )}
              </div>
            ) : (
              <div className="cx-invite-card">
                <p>Enter the email or phone of the believer you want to invite to {church.name}:</p>
                {inviteSuccess ? (
                  <div className="cx-give-success">
                    <Check size={24} className="text-emerald-500" />
                    <span>Invite sent successfully! They will receive a notification to join.</span>
                    <button type="button" className="cx-btn cx-btn-ghost small mt-2" onClick={() => setInviteSuccess(false)}>
                      Invite Another
                    </button>
                  </div>
                ) : (
                  <div className="cx-invite-input-row">
                    <input
                      type="text"
                      placeholder="believer@example.com or 07XX XXX XXX"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="cx-input"
                    />
                    <button
                      type="button"
                      className="cx-btn cx-btn-primary"
                      onClick={() => {
                        if (inviteEmail.trim()) {
                          setInviteSuccess(true);
                          setInviteEmail('');
                          playSound('reaction');
                        }
                      }}
                    >
                      Send Request
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'about' && (
          <div className="cx-about">
            {church.description ? <p className="cx-about-text">{church.description}</p> : <p className="mut">This church hasn’t added a description yet.</p>}
            <dl className="cx-facts">
              {church.denomination && (<><dt>Denomination</dt><dd>{church.denomination}</dd></>)}
              {church.location_label && (<><dt>Location</dt><dd>{church.location_label}</dd></>)}
              {church.website && (
                <>
                  <dt>Website</dt>
                  <dd><a href={church.website} target="_blank" rel="noopener noreferrer">{church.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a></dd>
                </>
              )}
              <dt>On Shammah since</dt>
              <dd>{new Date(church.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</dd>
            </dl>
          </div>
        )}

        {tab === 'members' && (
          <>
            {members === null && <p className="mut cx-loading">Loading members…</p>}
            {members && members.length === 0 && (
              <div className="empty-state"><h2>No members yet</h2><p>Join to be the first.</p></div>
            )}
            {members && members.map((m) => (
              <div key={m.id} className="cx-member-row">
                <Avatar name={m.display_name} src={m.avatar_url} />
                <MemberName name={m.display_name} badge={m.badge} verified={m.badge_verified} nameClassName="post-author" />
                {church.created_by === m.id && <span className="category-chip">Owner</span>}
              </div>
            ))}
          </>
        )}
      </main>

      {/* Subscription Modal for Admins */}
      {showSubModal && (
        <InstitutionSubscriptionModal
          institution={{
            id,
            name: church.name,
            plan: currentSub.planId,
          }}
          onClose={() => setShowSubModal(false)}
          onUpdated={() => {
            setSubRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
