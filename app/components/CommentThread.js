'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { timeAgo, getPostDateTitle, useRelativeTimeTick } from '../lib/postDisplay';
import Avatar from './Avatar';
import MemberName from './MemberName';
import { detectMentionQuery, insertMention, splitMentions } from '../lib/mentions';
import ReactionBar from './ReactionBar';
import { playSound } from '../lib/soundEffects';
import {
  getPinnedCommentId,
  togglePinComment,
  getAuthorCommentReactions,
  setAuthorCommentReaction,
} from '../lib/commentPinManager';
import { generatePseudoIdentity, ANONYMOUS_IDENTITY } from '../lib/anonymousManager';
import { saveCommentIdentity, getCommentIdentity, removeCommentIdentity } from '../lib/commentIdentityManager';
import { logActivity } from '../lib/activityLogManager';
import { getBlockedUsers } from '../lib/profileManager';
import { Pin, Sparkles, RefreshCw, EyeOff, Trash2 } from 'lucide-react';
import PopupSheet from './PopupSheet';

export default function CommentThread({
  postId,
  session,
  onRequireSignIn,
  onCountChange,
  postAuthorId = null,
  postAuthorName = null,
  profile: initialProfile = null,
}) {
  const now = useRelativeTimeTick();
  const [state, setState] = useState('loading'); // loading | ready | error
  const [comments, setComments] = useState([]); // flat, newest replies included
  const [blockedUserIds, setBlockedUserIds] = useState(() => getBlockedUsers());
  const [nameById, setNameById] = useState({}); // profile id -> display name (authors + mentions)
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null); // { id, name }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]); // profiles matching the current "@..."
  const [mentionedIds, setMentionedIds] = useState([]);
  const [pinnedId, setPinnedId] = useState(() => getPinnedCommentId(postId));
  const [authorReactions, setAuthorReactions] = useState(() => getAuthorCommentReactions(postId));
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Current session user profile for "You" identity card
  const [currentUserProfile, setCurrentUserProfile] = useState(initialProfile || null);

  useEffect(() => {
    let cancelled = false;
    if (!session?.user?.id) {
      setCurrentUserProfile(null);
      return;
    }
    if (initialProfile) {
      setCurrentUserProfile(initialProfile);
      return;
    }
    async function loadMyProfile() {
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, badge, badge_verified, role')
        .eq('id', session.user.id)
        .single();
      if (!cancelled && data) {
        setCurrentUserProfile(data);
      }
    }
    loadMyProfile();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, initialProfile]);

  const myDisplayName =
    currentUserProfile?.display_name ||
    session?.user?.user_metadata?.full_name ||
    session?.user?.email?.split('@')[0] ||
    'You';
  const myAvatarUrl = currentUserProfile?.avatar_url || null;
  const myBadge = currentUserProfile?.badge || null;

  // Identity state: 'real' | 'anonymous' | 'pseudo'
  const [identityMode, setIdentityMode] = useState('real');
  const [pseudoIdentity, setPseudoIdentity] = useState(() => generatePseudoIdentity());

  const inputRef = useRef(null);
  const isPostAuthor = Boolean(session?.user?.id && postAuthorId && session.user.id === postAuthorId);

  useEffect(() => {
    function onCommentsUpdated(e) {
      if (e.detail?.postId === postId) {
        setPinnedId(getPinnedCommentId(postId));
        setAuthorReactions(getAuthorCommentReactions(postId));
      }
    }
    function onBlocksUpdated() {
      setBlockedUserIds([...getBlockedUsers()]);
    }
    window.addEventListener('shammah:comments-updated', onCommentsUpdated);
    window.addEventListener('shammah:blocks-updated', onBlocksUpdated);
    return () => {
      window.removeEventListener('shammah:comments-updated', onCommentsUpdated);
      window.removeEventListener('shammah:blocks-updated', onBlocksUpdated);
    };
  }, [postId]);

  function handleTogglePin(commentId) {
    if (!isPostAuthor) return;
    const next = togglePinComment(postId, commentId);
    setPinnedId(next);
  }

  function handleAuthorReact(commentId, emoji) {
    if (!isPostAuthor) return;
    setAuthorCommentReaction(postId, commentId, emoji);
    setAuthorReactions(getAuthorCommentReactions(postId));
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data, error: loadErr } = await supabase
        .from('comments')
        .select('id, parent_id, author_id, text_content, mentioned_user_ids, created_at, profiles(display_name, avatar_url, badge, badge_verified)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      if (cancelled) return;
      if (loadErr) {
        setState('error');
        return;
      }

      // Merge local identity meta if comment was posted with pseudonym or anonymous flag
      const mapped = (data || []).map((c) => {
        const meta = getCommentIdentity(c.id);
        if (meta) {
          return {
            ...c,
            is_anonymous: Boolean(meta.is_anonymous),
            is_pseudo: Boolean(meta.is_pseudo),
            pseudo_name: meta.pseudo_name || null,
          };
        }
        return c;
      });

      setComments(mapped);
      setState('ready');
      onCountChange(mapped.length);

      const known = {};
      mapped.forEach((c) => {
        if (c.author_id) known[c.author_id] = (c.profiles && c.profiles.display_name) || 'Someone';
      });
      const missing = new Set();
      mapped.forEach((c) => (c.mentioned_user_ids || []).forEach((id) => {
        if (!known[id]) missing.add(id);
      }));
      if (missing.size > 0) {
        const { data: extra } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', Array.from(missing));
        (extra || []).forEach((p) => {
          known[p.id] = p.display_name || 'Someone';
        });
      }
      if (!cancelled) setNameById(known);
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const blockedSet = new Set(blockedUserIds || []);
  const visibleComments = comments.filter((c) => !c.author_id || !blockedSet.has(c.author_id));

  // Which top-level comment a reply ultimately belongs under (keeps the thread just one level deep)
  function rootOf(comment) {
    let current = comment;
    const byId = Object.fromEntries(visibleComments.map((c) => [c.id, c]));
    const seen = new Set();
    while (current && current.parent_id && byId[current.parent_id] && !seen.has(current.id)) {
      seen.add(current.id);
      current = byId[current.parent_id];
    }
    return current ? current.id : comment.id;
  }

  const topLevel = visibleComments.filter((c) => !c.parent_id || !visibleComments.some((x) => x.id === c.parent_id));
  const repliesByRoot = {};
  visibleComments.forEach((c) => {
    if (topLevel.includes(c)) return;
    const rootId = rootOf(c);
    (repliesByRoot[rootId] ||= []).push(c);
  });

  function startReply(comment) {
    if (!session) return onRequireSignIn();
    setReplyTo({ id: rootOf(comment), name: (comment.profiles && comment.profiles.display_name) || 'Someone' });
    const withTag = insertMention('@' + '', 1, (comment.profiles && comment.profiles.display_name) || 'Someone');
    setText(withTag.text);
    if (comment.author_id) setMentionedIds((ids) => Array.from(new Set([...ids, comment.author_id])));
    setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
  }

  async function handleTextChange(e) {
    const value = e.target.value;
    setText(value);
    const cursor = e.target.selectionStart ?? value.length;
    const q = detectMentionQuery(value, cursor);
    if (q === null) {
      setSuggestions([]);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name')
      .ilike('display_name', `${q}%`)
      .limit(5);
    setSuggestions((data || []).filter((p) => p.display_name));
  }

  function pickSuggestion(profile) {
    const cursor = inputRef.current ? inputRef.current.selectionStart : text.length;
    const result = insertMention(text, cursor, profile.display_name);
    setText(result.text);
    setSuggestions([]);
    setMentionedIds((ids) => Array.from(new Set([...ids, profile.id])));
    setNameById((n) => ({ ...n, [profile.id]: profile.display_name }));
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(result.cursorPos, result.cursorPos);
      }
    }, 0);
  }

  function handleDeleteComment(commentId) {
    setConfirmDeleteId(commentId);
  }

  async function executeDeleteComment(commentId) {
    setConfirmDeleteId(null);
    removeCommentIdentity(commentId);
    setComments((prev) => {
      const next = prev.filter((c) => c.id !== commentId && c.parent_id !== commentId);
      onCountChange(next.length);
      return next;
    });
    const { error: delErr } = await supabase.from('comments').delete().eq('id', commentId);
    if (delErr) {
      console.error('Failed to delete comment:', delErr);
      setError(delErr.message);
    } else {
      playSound('reaction');
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (!session) return onRequireSignIn();
    const clean = text.trim();
    if (!clean) return;
    setBusy(true);
    setError('');
    const { data, error: insertErr } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        author_id: session.user.id,
        parent_id: replyTo ? replyTo.id : null,
        text_content: clean,
        mentioned_user_ids: mentionedIds,
      })
      .select('id, parent_id, author_id, text_content, mentioned_user_ids, created_at')
      .single();
    setBusy(false);
    if (insertErr) {
      setError(insertErr.message);
      return;
    }

    const isAnon = identityMode === 'anonymous';
    const isPsd = identityMode === 'pseudo';
    const effectivePseudoName = pseudoIdentity.name?.trim() || 'Faith Pilgrim';

    if (isAnon || isPsd) {
      saveCommentIdentity(data.id, {
        is_anonymous: isAnon,
        is_pseudo: isPsd,
        pseudo_name: isPsd ? effectivePseudoName : null,
        author_id: session.user.id,
      });
    }

    const withProfile = {
      ...data,
      is_anonymous: isAnon,
      is_pseudo: isPsd,
      pseudo_name: isPsd ? effectivePseudoName : null,
      profiles: isAnon
        ? {
            display_name: ANONYMOUS_IDENTITY.name,
            avatar_url: null,
            badge: null,
            badge_verified: false,
          }
        : isPsd
        ? {
            display_name: effectivePseudoName,
            avatar_url: null,
            badge: 'pilgrim',
            badge_verified: false,
          }
        : currentUserProfile || {
            display_name: myDisplayName,
            avatar_url: myAvatarUrl,
            badge: myBadge,
            badge_verified: currentUserProfile?.badge_verified || false,
          },
    };
    setComments((prev) => {
      const next = [...prev, withProfile];
      onCountChange(next.length);
      return next;
    });
    logActivity({
      type: 'comment',
      icon: '💬',
      title: isAnon ? 'Commented with name hidden' : 'Commented on Post',
      targetTitle: postAuthorName ? `Post by ${postAuthorName}` : 'Post',
      snippet: clean,
      authorName: postAuthorName || '',
      visibility: isAnon ? 'anonymous' : 'public',
      meta: { postId, parentId: replyTo?.id },
    });
    playSound('commented');
    setText('');
    setReplyTo(null);
    setMentionedIds([]);
    setSuggestions([]);
  }

  function CommentRow({ comment, isReply }) {
    const isAnonymous = Boolean(comment.is_anonymous);
    const isPseudo = Boolean(comment.is_pseudo);
    const cAuthor = Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles;

    let authorName =
      (cAuthor && cAuthor.display_name) ||
      nameById[comment.author_id] ||
      (session && comment.author_id === session.user.id ? 'You' : 'Someone');

    if (isAnonymous) {
      authorName = ANONYMOUS_IDENTITY.name;
    } else if (isPseudo && comment.pseudo_name) {
      authorName = comment.pseudo_name;
    }

    const mentionNames = (comment.mentioned_user_ids || []).map((id) => nameById[id]).filter(Boolean);
    const isThisCommentAuthorThePostAuthor = !isAnonymous && !isPseudo && postAuthorId && comment.author_id === postAuthorId;
    const isPinned = !isReply && comment.id === pinnedId;
    const authorReaction = authorReactions[comment.id];
    const isMyComment = Boolean(session?.user?.id && comment.author_id === session.user.id);
    const canDelete = Boolean(isMyComment || isPostAuthor);

    return (
      <div className={`comment-row${isReply ? ' comment-reply' : ''}${isPinned ? ' is-pinned' : ''}`}>
        {isPinned && (
          <div className="pinned-comment-indicator">
            <Pin size={11} className="text-amber-500 fill-amber-500" />
            <span>Pinned by author</span>
          </div>
        )}

        <div className="comment-main-flex">
          {isAnonymous ? (
            <div
              className="comment-masked-avatar"
              title="Other members cannot see this author's name"
              aria-label="Anonymous commenter"
            >
              <EyeOff size={13} />
            </div>
          ) : isPseudo ? (
            <div
              className="comment-pseudo-avatar-badge"
              title={`Pseudo identity: ${authorName}`}
              aria-label="Pseudo commenter"
            >
              <span>{comment.pseudo_name ? comment.pseudo_name.slice(0, 2).toUpperCase() : 'FP'}</span>
            </div>
          ) : (
            <Avatar
              name={authorName}
              src={cAuthor?.avatar_url}
              userId={comment.author_id}
              className="comment-avatar"
            />
          )}

          <div className="comment-body">
            <div className="comment-bubble">
              <div className="comment-author-line">
                <MemberName
                  name={authorName}
                  badge={isAnonymous ? null : cAuthor?.badge}
                  verified={isAnonymous || isPseudo ? false : cAuthor?.badge_verified}
                  userId={isAnonymous || isPseudo ? null : comment.author_id}
                  author={isAnonymous || isPseudo ? null : cAuthor}
                  nameClassName="comment-author"
                  onClick={isAnonymous || isPseudo ? (e) => e.stopPropagation() : null}
                />
                {isThisCommentAuthorThePostAuthor && (
                  <span className="post-author-badge" title="Author of this post">
                    Author
                  </span>
                )}
                {isPseudo && (
                  <span className="pseudo-identity-badge" title="Pseudonym active">
                    Pseudo
                  </span>
                )}
                {isAnonymous && (
                  <span className="anonymous-identity-badge" title="Other members cannot see this believer's name">
                    Name Hidden
                  </span>
                )}
              </div>

              <p className="comment-text">
                {splitMentions(comment.text_content, mentionNames).map((piece, i) =>
                  typeof piece === 'string' ? (
                    <span key={i}>{piece}</span>
                  ) : (
                    <b key={i} className="mention">
                      @{piece.mention}
                    </b>
                  )
                )}
              </p>
            </div>

            <div className="comment-meta">
              <span
                className="mut-light"
                title={getPostDateTitle(comment.created_at)}
                suppressHydrationWarning
              >
                {timeAgo(comment.created_at, now)}
              </span>

              {/* Author reaction attribution badge */}
              {authorReaction && (
                <span className="comment-author-reaction-tag" title={`Reacted by post author`}>
                  <span>{authorReaction}</span>
                  <span className="author-react-label">by author</span>
                </span>
              )}

              <ReactionBar
                targetType="comment"
                targetId={comment.id}
                session={session}
                onRequireSignIn={onRequireSignIn}
                size="sm"
                onReact={(emoji) => {
                  if (isPostAuthor) {
                    handleAuthorReact(comment.id, emoji);
                  }
                }}
              />

              {!isReply && (
                <button type="button" className="comment-reply-btn" onClick={() => startReply(comment)}>
                  Reply
                </button>
              )}

              {/* Pin button for post author */}
              {!isReply && isPostAuthor && (
                <button
                  type="button"
                  className={`comment-pin-toggle-btn${isPinned ? ' active' : ''}`}
                  onClick={() => handleTogglePin(comment.id)}
                  title={isPinned ? 'Unpin comment' : 'Pin comment to top'}
                >
                  <Pin size={11} className={isPinned ? 'fill-amber-500 text-amber-500' : ''} />
                  <span>{isPinned ? 'Unpin' : 'Pin'}</span>
                </button>
              )}

              {/* Delete button: Author or Post Author can delete */}
              {canDelete && (
                <button
                  type="button"
                  className="comment-delete-btn"
                  onClick={() => handleDeleteComment(comment.id)}
                  title={isMyComment ? 'Delete your comment' : 'Delete comment as post author'}
                  aria-label="Delete comment"
                >
                  <Trash2 size={11} />
                  <span>Delete</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Sort top-level so pinned comment is at the very top
  const sortedTopLevel = [...topLevel].sort((a, b) => {
    if (a.id === pinnedId) return -1;
    if (b.id === pinnedId) return 1;
    return new Date(a.created_at) - new Date(b.created_at);
  });

  return (
    <div className="comment-thread">
      {state === 'loading' && <p className="mut-light comment-loading">Loading comments…</p>}
      {state === 'error' && <p className="auth-message">Could not load comments. Try again shortly.</p>}

      {state === 'ready' && topLevel.length === 0 && (
        <p className="mut-light comment-loading">No comments yet — be the first to say something.</p>
      )}

      {state === 'ready' &&
        sortedTopLevel.map((c) => (
          <div key={c.id}>
            <CommentRow comment={c} isReply={false} />
            {(repliesByRoot[c.id] || []).map((r) => (
              <CommentRow key={r.id} comment={r} isReply={true} />
            ))}
          </div>
        ))}

      <form className="comment-compose" onSubmit={submit}>
        {replyTo && (
          <div className="comment-replying-to">
            Replying to <b>{replyTo.name}</b>
            <button
              type="button"
              onClick={() => {
                setReplyTo(null);
                setText('');
                setMentionedIds([]);
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Identity Segmented Control: Real, Anonymous, Pseudo Name */}
        {session && (
          <div className="comment-identity-card">
            <div className="comment-identity-header">
              <span className="comment-as-label">Comment identity</span>
              <span className="comment-identity-hint">
                {identityMode === 'anonymous'
                  ? "Other members won't see your name (you can still delete your comment)"
                  : identityMode === 'pseudo'
                  ? 'Speaking under a randomized pilgrim identity'
                  : 'Posting with your public believer profile'}
              </span>
            </div>

            <div className="comment-segmented-control" role="radiogroup" aria-label="Comment identity chooser">
              {/* Option 1: You */}
              <button
                type="button"
                role="radio"
                aria-checked={identityMode === 'real'}
                className={`ident-segment${identityMode === 'real' ? ' active is-highlighted' : ''}`}
                style={{ '--segment-accent': 'var(--teal)' }}
                onClick={() => {
                  setIdentityMode('real');
                  playSound('reaction');
                }}
              >
                <div className="ident-segment-avatar-wrap">
                  <Avatar
                    name={myDisplayName}
                    src={myAvatarUrl}
                    userId={session.user.id}
                    className="ident-segment-avatar"
                  />
                </div>
                <div className="ident-segment-info">
                  <div className="ident-segment-name-row">
                    <span className="ident-segment-name">{myDisplayName}</span>
                    {myBadge && (
                      <span className="ident-segment-badge-pill" title={`Badge: ${myBadge}`}>
                        {myBadge}
                      </span>
                    )}
                  </div>
                  <span className="ident-segment-sub">Your public profile</span>
                </div>
              </button>

              {/* Option 2: Anonymous */}
              <button
                type="button"
                role="radio"
                aria-checked={identityMode === 'anonymous'}
                className={`ident-segment${identityMode === 'anonymous' ? ' active is-highlighted' : ''}`}
                style={{ '--segment-accent': 'var(--gold)' }}
                onClick={() => {
                  setIdentityMode('anonymous');
                  playSound('reaction');
                }}
                title="Other members won't see your name. You can still delete your comment."
              >
                <div className="ident-segment-avatar-wrap">
                  <span className="ident-mask-avatar" aria-hidden="true">
                    <EyeOff size={14} />
                  </span>
                </div>
                <div className="ident-segment-info">
                  <div className="ident-segment-name-row">
                    <span className="ident-segment-name">Anonymous</span>
                  </div>
                  <span className="ident-segment-sub">Other members won&apos;t see your name</span>
                </div>
              </button>

              {/* Option 3: Pseudo-name */}
              <div
                className={`ident-segment ident-segment-pseudo${identityMode === 'pseudo' ? ' active is-highlighted' : ''}`}
                style={{ '--segment-accent': '#8b5cf6' }}
                onClick={() => {
                  if (identityMode !== 'pseudo') {
                    setIdentityMode('pseudo');
                    playSound('reaction');
                  }
                }}
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={identityMode === 'pseudo'}
                  className="ident-segment-pseudo-header-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIdentityMode('pseudo');
                    playSound('reaction');
                  }}
                >
                  <div className="ident-segment-avatar-wrap">
                    <span
                      className="ident-pseudo-avatar"
                      style={{
                        backgroundColor: pseudoIdentity.palette?.bg || '#0d9488',
                        color: pseudoIdentity.palette?.text || '#ffffff',
                      }}
                    >
                      {pseudoIdentity.initials || 'FP'}
                    </span>
                  </div>
                  <div className="ident-segment-info">
                    <div className="ident-segment-name-row">
                      <span className="ident-segment-name">Pseudo-name</span>
                      <Sparkles size={11} className="text-amber-400" />
                    </div>
                    <span className="ident-segment-sub">Pilgrim identity</span>
                  </div>
                </button>

                <div className="ident-pseudo-inline-controls" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    className="ident-pseudo-input"
                    value={pseudoIdentity.name}
                    onChange={(e) => {
                      const val = e.target.value.slice(0, 32);
                      setPseudoIdentity((prev) => ({
                        ...prev,
                        name: val,
                        initials: val.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'P',
                      }));
                    }}
                    placeholder="Pseudonym…"
                    maxLength={32}
                    aria-label="Pseudonym name"
                    onFocus={() => {
                      if (identityMode !== 'pseudo') setIdentityMode('pseudo');
                    }}
                  />
                  <button
                    type="button"
                    className="ident-reroll-btn"
                    onClick={() => {
                      setPseudoIdentity(generatePseudoIdentity());
                      playSound('reaction');
                    }}
                    title="Generate a new pseudonym"
                    aria-label="Generate new pseudonym"
                  >
                    <RefreshCw size={12} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="comment-compose-wrap">
          <div className="comment-input-wrap">
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={handleTextChange}
              placeholder={
                session
                  ? identityMode === 'anonymous'
                    ? "Comment (other members won't see your name)…"
                    : identityMode === 'pseudo'
                    ? `Comment as ${pseudoIdentity.name}…`
                    : 'Write a comment… (@ to mention someone)'
                  : 'Sign in to comment'
              }
              maxLength={1000}
              disabled={!session}
              onFocus={() => {
                if (!session) onRequireSignIn();
              }}
            />
            {suggestions.length > 0 && (
              <div className="mention-suggestions" role="listbox">
                {suggestions.map((p) => (
                  <button key={p.id} type="button" onClick={() => pickSuggestion(p)}>
                    {p.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Live Preview directly next to the Send button */}
          {session && (
            <div className="comment-compose-footer">
              <div
                className="comment-live-preview-pill"
                title="Live preview of how your comment will appear to believers"
              >
                <span className="preview-label">Preview:</span>
                <div className="preview-author-avatar-wrap">
                  {identityMode === 'anonymous' ? (
                    <span className="preview-mask-avatar" aria-hidden="true">
                      <EyeOff size={11} />
                    </span>
                  ) : identityMode === 'pseudo' ? (
                    <span
                      className="preview-pseudo-avatar"
                      style={{
                        backgroundColor: pseudoIdentity.palette?.bg || '#0d9488',
                        color: pseudoIdentity.palette?.text || '#ffffff',
                      }}
                    >
                      {pseudoIdentity.initials || 'P'}
                    </span>
                  ) : (
                    <Avatar
                      name={myDisplayName}
                      src={myAvatarUrl}
                      size="xs"
                      className="preview-user-avatar"
                    />
                  )}
                </div>
                <div className="preview-content">
                  <span className="preview-name">
                    {identityMode === 'anonymous'
                      ? ANONYMOUS_IDENTITY.name
                      : identityMode === 'pseudo'
                      ? pseudoIdentity.name
                      : myDisplayName}
                  </span>
                  {identityMode === 'anonymous' ? (
                    <span className="preview-badge-anon">Name Hidden</span>
                  ) : identityMode === 'pseudo' ? (
                    <span className="preview-badge-pseudo">Pseudo</span>
                  ) : myBadge ? (
                    <span className="preview-badge-member">{myBadge}</span>
                  ) : null}
                  <span className="preview-snippet">
                    {text.trim()
                      ? `“${text.trim().length > 50 ? text.trim().slice(0, 47) + '…' : text.trim()}”`
                      : '“Your comment text…”'}
                  </span>
                </div>
              </div>

              <button type="submit" className="comment-send" disabled={busy || !text.trim()}>
                {busy ? 'Sending…' : 'Send'}
              </button>
            </div>
          )}

          {!session && (
            <div className="comment-compose-footer">
              <button
                type="button"
                className="comment-send"
                onClick={onRequireSignIn}
              >
                Sign in to comment
              </button>
            </div>
          )}
        </div>
        {error && <p className="auth-message">{error}</p>}
      </form>

      {confirmDeleteId && (
        <PopupSheet
          open={Boolean(confirmDeleteId)}
          onClose={() => setConfirmDeleteId(null)}
          title="Delete Comment"
          size="sm"
        >
          <div className="author-block-confirm-box" style={{ margin: 0 }}>
            <p style={{ margin: 0 }}>
              Are you sure you want to delete this comment? This action cannot be undone.
            </p>
            <div className="confirm-btn-row" style={{ marginTop: 8 }}>
              <button
                type="button"
                className="btn-confirm-danger"
                onClick={() => executeDeleteComment(confirmDeleteId)}
              >
                Delete
              </button>
              <button
                type="button"
                className="btn-confirm-cancel"
                onClick={() => setConfirmDeleteId(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </PopupSheet>
      )}
    </div>
  );
}
