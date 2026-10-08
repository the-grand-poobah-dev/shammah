'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { timeAgo } from '../lib/postDisplay';
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
import { logActivity } from '../lib/activityLogManager';
import { getBlockedUsers } from '../lib/profileManager';
import { Pin, Sparkles, User, RefreshCw, EyeOff } from 'lucide-react';

export default function CommentThread({
  postId,
  session,
  onRequireSignIn,
  onCountChange,
  postAuthorId = null,
  postAuthorName = null,
}) {
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

  // Identity state: 'real' | 'anonymous' | 'pseudo'
  const [identityMode, setIdentityMode] = useState('real');
  const [pseudoIdentity, setPseudoIdentity] = useState(() => generatePseudoIdentity());
  const [showIdentityMenu, setShowIdentityMenu] = useState(false);

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
      setComments(data || []);
      setState('ready');
      onCountChange((data || []).length);

      const known = {};
      (data || []).forEach((c) => {
        if (c.author_id) known[c.author_id] = (c.profiles && c.profiles.display_name) || 'Someone';
      });
      const missing = new Set();
      (data || []).forEach((c) => (c.mentioned_user_ids || []).forEach((id) => {
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
    const withProfile = {
      ...data,
      is_anonymous: identityMode === 'anonymous',
      is_pseudo: identityMode === 'pseudo',
      pseudo_name: identityMode === 'pseudo' ? pseudoIdentity.name : null,
      profiles: {
        display_name:
          identityMode === 'anonymous'
            ? ANONYMOUS_IDENTITY.name
            : identityMode === 'pseudo'
              ? pseudoIdentity.name
              : null,
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
      title: 'Commented on Post',
      targetTitle: postAuthorName ? `Post by ${postAuthorName}` : 'Post',
      snippet: clean,
      authorName: postAuthorName || '',
      visibility: identityMode === 'anonymous' ? 'anonymous' : 'public',
      meta: { postId, parentId: replyTo?.id },
    });
    playSound('commented');
    setText('');
    setReplyTo(null);
    setMentionedIds([]);
    setSuggestions([]);
  }

  function CommentRow({ comment, isReply }) {
    const isAnonymous = comment.is_anonymous;
    const isPseudo = comment.is_pseudo;
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
    const isThisCommentAuthorThePostAuthor = !isAnonymous && postAuthorId && comment.author_id === postAuthorId;
    const isPinned = !isReply && comment.id === pinnedId;
    const authorReaction = authorReactions[comment.id];

    return (
      <div className={`comment-row${isReply ? ' comment-reply' : ''}${isPinned ? ' is-pinned' : ''}`}>
        {isPinned && (
          <div className="pinned-comment-indicator">
            <Pin size={11} className="text-amber-500 fill-amber-500" />
            <span>Pinned by author</span>
          </div>
        )}

        <div className="comment-main-flex">
          <Avatar
            name={authorName}
            src={isAnonymous || isPseudo ? null : cAuthor?.avatar_url}
            userId={isAnonymous || isPseudo ? null : comment.author_id}
            className="comment-avatar"
          />
          <div className="comment-body">
            <div className="comment-bubble">
              <div className="comment-author-line">
                <MemberName
                  name={authorName}
                  badge={isAnonymous ? null : cAuthor?.badge}
                  verified={isAnonymous || isPseudo ? false : cAuthor?.badge_verified}
                  userId={isAnonymous || isPseudo ? null : comment.author_id}
                  author={cAuthor}
                  nameClassName="comment-author"
                />
                {isThisCommentAuthorThePostAuthor && (
                  <span className="post-author-badge" title="Author of this post">
                    Author
                  </span>
                )}
                {isPseudo && (
                  <span className="pseudo-identity-badge" title="Pseudonym protected">
                    Pseudo
                  </span>
                )}
                {isAnonymous && (
                  <span className="anonymous-identity-badge" title="Anonymous comment">
                    Anonymous
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
              <span className="mut-light">{timeAgo(comment.created_at)}</span>

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

        {/* Identity bar: Real, Anonymous, Pseudo Name */}
        {session && (
          <div className="comment-identity-bar">
            <span className="comment-as-label">Comment as:</span>
            <div className="comment-identity-pills">
              <button
                type="button"
                className={`ident-pill${identityMode === 'real' ? ' active' : ''}`}
                onClick={() => setIdentityMode('real')}
              >
                <User size={12} />
                <span>You</span>
              </button>

              <button
                type="button"
                className={`ident-pill${identityMode === 'anonymous' ? ' active' : ''}`}
                onClick={() => setIdentityMode('anonymous')}
                title="Post anonymously without revealing your profile"
              >
                <EyeOff size={12} />
                <span>Anonymous</span>
              </button>

              <button
                type="button"
                className={`ident-pill${identityMode === 'pseudo' ? ' active' : ''}`}
                onClick={() => setIdentityMode('pseudo')}
                title="Post with auto-generated pseudo identity"
              >
                <Sparkles size={12} />
                <span>{pseudoIdentity.name}</span>
              </button>

              {identityMode === 'pseudo' && (
                <button
                  type="button"
                  className="ident-reroll-btn"
                  onClick={() => {
                    setPseudoIdentity(generatePseudoIdentity());
                    playSound('reaction');
                  }}
                  title="Generate a new pseudo name"
                >
                  <RefreshCw size={11} />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="comment-input-wrap">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={handleTextChange}
            placeholder={
              session
                ? identityMode === 'anonymous'
                  ? 'Comment anonymously…'
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
          <button type="submit" className="comment-send" disabled={busy || !text.trim()}>
            Send
          </button>
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
        {error && <p className="auth-message">{error}</p>}
      </form>
    </div>
  );
}
